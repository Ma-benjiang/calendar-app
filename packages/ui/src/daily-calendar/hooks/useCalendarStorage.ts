/**
 * 台历存储 Hook
 * 支持 localStorage 和桌面端 SQLite 数据库
 * 使用纯对象 Record 代替 Map 以提高 React 兼容性
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  DailyCalendarRecord,
  UserPreferences,
  ThemeType,
  ThemeStrategyType,
} from '../types';
import { formatDateKey } from '../utils/dateUtils';
import { getStorageAdapter, StorageAdapter } from '@calendar/storage';

// Storage keys
const STORAGE_KEY_RECORDS = 'daily-calendar-records';
const STORAGE_KEY_PREFERENCES = 'daily-calendar-preferences';
const STORAGE_VERSION = '1.0';

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
  autoGenerate: false, // 默认关闭，让用户手动按快门
};

function serializeRecord(record: DailyCalendarRecord): string {
  return JSON.stringify({
    ...record,
    createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt,
    updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : record.updatedAt,
    image: {
      ...record.image,
      metadata: {
        ...record.image.metadata,
        generatedAt: record.image.metadata.generatedAt instanceof Date ? record.image.metadata.generatedAt.toISOString() : record.image.metadata.generatedAt,
      },
    },
  });
}

function deserializeRecord(data: any): DailyCalendarRecord {
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
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

export function useCalendarStorage() {
  const adapter = useMemo(() => getStorageAdapter(), []);
  const [records, setRecords] = useState<Record<string, DailyCalendarRecord>>({});
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // 1. 从适配器加载初始数据
  useEffect(() => {
    async function loadData() {
      try {
        console.log('[Storage] Initializing storage...');
        const recordsData = await adapter.getItem(STORAGE_KEY_RECORDS);
        if (recordsData) {
          const parsed = JSON.parse(recordsData);
          const recordsObj: Record<string, DailyCalendarRecord> = {};

          Object.entries(parsed).forEach(([date, data]) => {
            try {
              recordsObj[date] = deserializeRecord(data);
            } catch (e) {
              console.warn(`Failed to parse record for ${date}:`, e);
            }
          });
          setRecords(recordsObj);
          console.log(`[Storage] Loaded ${Object.keys(recordsObj).length} records from storage`);
        }

        const prefsData = await adapter.getItem(STORAGE_KEY_PREFERENCES);
        if (prefsData) {
          const parsed = JSON.parse(prefsData);
          if (parsed.version === STORAGE_VERSION) {
            setPreferences({ ...DEFAULT_PREFERENCES, ...parsed.data });
          }
        }
      } catch (error) {
        console.error('Failed to load data from storage:', error);
      } finally {
        setIsLoaded(true);
        setIsInitializing(false);
      }
    }
    loadData();
  }, [adapter]);

  // 2. 自动持久化函数
  const persistToPhysicalStorage = useCallback(async (currentRecords: Record<string, DailyCalendarRecord>) => {
    try {
      const serializedObj: Record<string, any> = {};
      Object.entries(currentRecords).forEach(([date, record]) => {
        serializedObj[date] = JSON.parse(serializeRecord(record));
      });
      await adapter.setItem(STORAGE_KEY_RECORDS, JSON.stringify(serializedObj));
      console.log(`[Storage] Successfully persisted ${Object.keys(currentRecords).length} records`);
    } catch (error) {
      console.error('Failed to persist records:', error);
    }
  }, [adapter]);

  // 公开操作方法
  const saveRecord = useCallback(async (record: DailyCalendarRecord) => {
    console.log(`[Storage] Saving new record for ${record.date}`);
    setRecords(prev => {
      const next = { ...prev, [record.date]: record };
      // 立即触发异步持久化
      persistToPhysicalStorage(next);
      return next;
    });
  }, [persistToPhysicalStorage]);

  const getRecord = useCallback((date: string | Date): DailyCalendarRecord | null => {
    const dateKey = typeof date === 'string' ? date : formatDateKey(date);
    return records[dateKey] || null;
  }, [records]);

  const hasRecord = useCallback((date: string | Date): boolean => {
    const dateKey = typeof date === 'string' ? date : formatDateKey(date);
    return !!records[dateKey];
  }, [records]);

  const deleteRecord = useCallback(async (date: string | Date) => {
    const dateKey = typeof date === 'string' ? date : formatDateKey(date);
    setRecords(prev => {
      const next = { ...prev };
      delete next[dateKey];
      persistToPhysicalStorage(next);
      return next;
    });
  }, [persistToPhysicalStorage]);

  const savePreferencesToStorage = useCallback(async (newPrefs: UserPreferences) => {
    try {
      await adapter.setItem(STORAGE_KEY_PREFERENCES, JSON.stringify({
        version: STORAGE_VERSION,
        data: newPrefs,
      }));
      setPreferences(newPrefs);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }, [adapter]);

  const updateThemeStrategy = useCallback((type: ThemeStrategyType, currentTheme?: ThemeType) => {
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

  const switchTheme = useCallback((theme: ThemeType) => {
    const newPrefs: UserPreferences = {
      ...preferences,
      themeStrategy: { ...preferences.themeStrategy, currentTheme: theme },
    };
    savePreferencesToStorage(newPrefs);
  }, [preferences, savePreferencesToStorage]);

  return {
    records,
    saveRecord,
    getRecord,
    hasRecord,
    deleteRecord,
    preferences,
    updateThemeStrategy,
    switchTheme,
    isLoaded,
  };
}

export default useCalendarStorage;
