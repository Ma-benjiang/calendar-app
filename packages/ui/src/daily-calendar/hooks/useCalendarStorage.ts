/**
 * 台历存储 Hook
 * 管理 localStorage 中的历史台历记录和用户偏好设置
 */

import { useState, useEffect, useCallback } from 'react';
import {
  DailyCalendarRecord,
  UserPreferences,
  ThemeType,
  // ImageSize - for future use
  // ImageQuality - for future use
  ThemeStrategyType,
} from '../types';
import { formatDateKey } from '../utils/dateUtils';

// Storage keys
const STORAGE_KEY_RECORDS = 'daily-calendar-records';
const STORAGE_KEY_PREFERENCES = 'daily-calendar-preferences';
const STORAGE_VERSION = '1.0';

// 默认用户偏好
const DEFAULT_PREFERENCES: UserPreferences = {
  themeStrategy: {
    type: 'daily-random',
    currentTheme: 'vintage',
    preferences: {
      favorites: [],
      excluded: [],
      seasonalMapping: {
        spring: ['nature', 'zen', 'art'],
        summer: ['nature', 'minimal', 'cosmic'],
        autumn: ['vintage', 'art', 'nature'],
        winter: ['zen', 'vintage', 'cosmic'],
      },
    },
  },
  defaultImageSize: '2K',
  defaultImageQuality: 'standard',
  language: 'zh',
  autoGenerate: true,
};

// 序列化记录（处理 Date 对象）
function serializeRecord(record: DailyCalendarRecord): string {
  return JSON.stringify({
    ...record,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    image: {
      ...record.image,
      metadata: {
        ...record.image.metadata,
        generatedAt: record.image.metadata.generatedAt.toISOString(),
      },
    },
  });
}

// 反序列化记录
function deserializeRecord(data: string): DailyCalendarRecord {
  const parsed = JSON.parse(data);
  return {
    ...parsed,
    createdAt: new Date(parsed.createdAt),
    updatedAt: new Date(parsed.updatedAt),
    image: {
      ...parsed.image,
      metadata: {
        ...parsed.image.metadata,
        generatedAt: new Date(parsed.image.metadata.generatedAt),
      },
    },
  };
}

/**
 * 台历存储 Hook
 */
export function useCalendarStorage() {
  const [records, setRecords] = useState<Map<string, DailyCalendarRecord>>(new Map());
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // 从 localStorage 加载数据
  useEffect(() => {
    try {
      // 加载记录
      const recordsData = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (recordsData) {
        const parsed = JSON.parse(recordsData);
        const recordsMap = new Map<string, DailyCalendarRecord>();

        Object.entries(parsed).forEach(([date, data]) => {
          try {
            recordsMap.set(date, deserializeRecord(JSON.stringify(data)));
          } catch (e) {
            console.warn(`Failed to parse record for ${date}:`, e);
          }
        });

        setRecords(recordsMap);
      }

      // 加载偏好设置
      const prefsData = localStorage.getItem(STORAGE_KEY_PREFERENCES);
      if (prefsData) {
        const parsed = JSON.parse(prefsData);
        if (parsed.version === STORAGE_VERSION) {
          setPreferences({
            ...DEFAULT_PREFERENCES,
            ...parsed.data,
          });
        } else {
          // 版本不兼容，使用默认设置
          console.warn('Storage version mismatch, using default preferences');
        }
      }
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // 保存记录到 localStorage
  const saveToStorage = useCallback((newRecords: Map<string, DailyCalendarRecord>) => {
    try {
      const recordsObj: Record<string, unknown> = {};
      newRecords.forEach((record, date) => {
        recordsObj[date] = JSON.parse(serializeRecord(record));
      });
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(recordsObj));
    } catch (error) {
      console.error('Failed to save records:', error);
      // 如果存储空间不足，尝试清理旧记录
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        cleanupOldRecords(newRecords);
      }
    }
  }, []);

  // 清理旧记录（保留最近 90 天）
  const cleanupOldRecords = useCallback((currentRecords: Map<string, DailyCalendarRecord>) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const newRecords = new Map<string, DailyCalendarRecord>();
    currentRecords.forEach((record, date) => {
      if (record.createdAt >= cutoffDate) {
        newRecords.set(date, record);
      }
    });

    setRecords(newRecords);
    saveToStorage(newRecords);
  }, [saveToStorage]);

  // 保存偏好设置
  const savePreferencesToStorage = useCallback((newPrefs: UserPreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY_PREFERENCES, JSON.stringify({
        version: STORAGE_VERSION,
        data: newPrefs,
      }));
      setPreferences(newPrefs);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }, []);

  /**
   * 保存台历记录
   */
  const saveRecord = useCallback((record: DailyCalendarRecord) => {
    const newRecords = new Map(records);
    newRecords.set(record.date, record);
    setRecords(newRecords);
    saveToStorage(newRecords);
  }, [records, saveToStorage]);

  /**
   * 获取指定日期的记录
   */
  const getRecord = useCallback((date: string | Date): DailyCalendarRecord | null => {
    const dateKey = typeof date === 'string' ? date : formatDateKey(date);
    return records.get(dateKey) || null;
  }, [records]);

  /**
   * 检查指定日期是否有记录
   */
  const hasRecord = useCallback((date: string | Date): boolean => {
    const dateKey = typeof date === 'string' ? date : formatDateKey(date);
    return records.has(dateKey);
  }, [records]);

  /**
   * 获取日期范围内的记录
   */
  const getRecordsInRange = useCallback((startDate: Date, endDate: Date): DailyCalendarRecord[] => {
    const result: DailyCalendarRecord[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateKey = formatDateKey(current);
      const record = records.get(dateKey);
      if (record) {
        result.push(record);
      }
      current.setDate(current.getDate() + 1);
    }

    return result;
  }, [records]);

  /**
   * 获取指定月份的所有记录
   */
  const getRecordsByMonth = useCallback((year: number, month: number): DailyCalendarRecord[] => {
    const result: DailyCalendarRecord[] = [];
    const prefix = `${year}-${String(month).padStart(2, '0')}`;

    records.forEach((record, dateKey) => {
      if (dateKey.startsWith(prefix)) {
        result.push(record);
      }
    });

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [records]);

  /**
   * 删除指定日期的记录
   */
  const deleteRecord = useCallback((date: string | Date) => {
    const dateKey = typeof date === 'string' ? date : formatDateKey(date);
    const newRecords = new Map(records);
    newRecords.delete(dateKey);
    setRecords(newRecords);
    saveToStorage(newRecords);
  }, [records, saveToStorage]);

  /**
   * 清空所有历史记录
   */
  const clearHistory = useCallback(() => {
    setRecords(new Map());
    localStorage.removeItem(STORAGE_KEY_RECORDS);
  }, []);

  /**
   * 更新偏好设置
   */
  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    const newPrefs = { ...preferences, ...updates };
    savePreferencesToStorage(newPrefs);
  }, [preferences, savePreferencesToStorage]);

  /**
   * 更新主题策略
   */
  const updateThemeStrategy = useCallback((
    type: ThemeStrategyType,
    currentTheme?: ThemeType
  ) => {
    const newPrefs: UserPreferences = {
      ...preferences,
      themeStrategy: {
        ...preferences.themeStrategy,
        type,
        currentTheme: currentTheme || preferences.themeStrategy.currentTheme,
      },
    };
    savePreferencesToStorage(newPrefs);
  }, [preferences, savePreferencesToStorage]);

  /**
   * 切换当前主题
   */
  const switchTheme = useCallback((theme: ThemeType) => {
    const newPrefs: UserPreferences = {
      ...preferences,
      themeStrategy: {
        ...preferences.themeStrategy,
        currentTheme: theme,
      },
    };
    savePreferencesToStorage(newPrefs);
  }, [preferences, savePreferencesToStorage]);

  /**
   * 获取存储统计信息
   */
  const getStorageStats = useCallback(() => {
    const totalRecords = records.size;
    let oldestDate: Date | null = null;
    let newestDate: Date | null = null;

    records.forEach((record) => {
      if (!oldestDate || record.createdAt < oldestDate) {
        oldestDate = record.createdAt;
      }
      if (!newestDate || record.createdAt > newestDate) {
        newestDate = record.createdAt;
      }
    });

    // 估算存储大小（粗略计算）
    let estimatedSize = 0;
    try {
      const recordsData = localStorage.getItem(STORAGE_KEY_RECORDS);
      const prefsData = localStorage.getItem(STORAGE_KEY_PREFERENCES);
      estimatedSize = (recordsData?.length || 0) + (prefsData?.length || 0);
    } catch {
      // ignore
    }

    return {
      totalRecords,
      oldestDate,
      newestDate,
      estimatedSizeKB: Math.round(estimatedSize / 1024 * 100) / 100,
    };
  }, [records]);

  return {
    // 记录相关
    records,
    saveRecord,
    getRecord,
    hasRecord,
    getRecordsInRange,
    getRecordsByMonth,
    deleteRecord,
    clearHistory,

    // 偏好设置相关
    preferences,
    updatePreferences,
    updateThemeStrategy,
    switchTheme,

    // 状态
    isLoaded,
    getStorageStats,
  };
}

export default useCalendarStorage;
