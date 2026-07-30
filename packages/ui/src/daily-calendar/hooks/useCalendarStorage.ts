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
  ImageModelConfig,
  LLMModelConfig,
} from '../types';
import { formatDateKey } from '../utils/dateUtils';
import { getDefaultImageModelConfig } from '../services/imageModelConfig';
import { getDefaultLLMModelConfig } from '../services/llmModelConfig';
import { getStorageAdapter } from '@calendar/storage';

// Storage keys
const STORAGE_KEY_RECORDS = 'daily-calendar-records';
const STORAGE_KEY_PREFERENCES = 'daily-calendar-preferences';
const STORAGE_VERSION = '1.0';

const DEFAULT_PREFERENCES: UserPreferences = {
  themeStrategy: {
    type: 'daily-random',
    currentTheme: 'vintage',
  },
  defaultImageSize: '2K',
  defaultImageQuality: 'standard',
  language: 'zh',
  autoGenerate: false, // 默认关闭，让用户手动按快门
  llmModel: getDefaultLLMModelConfig(),
  imageModel: getDefaultImageModelConfig(),
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

function deserializeRecord(data: unknown): DailyCalendarRecord {
  const parsed = (typeof data === 'string' ? JSON.parse(data) : data) as Record<string, unknown>;
  return {
    ...parsed,
    createdAt: new Date(parsed.createdAt as string),
    updatedAt: new Date(parsed.updatedAt as string),
    image: {
      ...(parsed.image as Record<string, unknown>),
      metadata: {
        ...((parsed.image as Record<string, unknown>).metadata as Record<string, unknown>),
        generatedAt: new Date(((parsed.image as Record<string, unknown>).metadata as Record<string, unknown>).generatedAt as string),
      },
    },
  } as unknown as DailyCalendarRecord;
}

export function useCalendarStorage() {
  const adapter = useMemo(() => getStorageAdapter(), []);
  const [records, setRecords] = useState<Record<string, DailyCalendarRecord>>({});
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);
  const recordsRef = useRef<Record<string, DailyCalendarRecord>>({});
  const recordsWriteQueueRef = useRef<Promise<void>>(Promise.resolve());

  // 1. 从适配器加载初始数据
  useEffect(() => {
    async function loadData() {
      try {
        console.log('[Storage] Initializing storage...');
        const recordsData = await adapter.getItem(STORAGE_KEY_RECORDS);
        if (recordsData) {
          const parsed = JSON.parse(recordsData) as Record<string, unknown>;
          const recordsObj: Record<string, DailyCalendarRecord> = {};

          Object.entries(parsed).forEach(([date, data]) => {
            try {
              recordsObj[date] = deserializeRecord(data);
            } catch (e) {
              console.warn(`Failed to parse record for ${date}:`, e);
            }
          });
          recordsRef.current = recordsObj;
          setRecords(recordsObj);
          console.log(`[Storage] Loaded ${Object.keys(recordsObj).length} records from storage`);
        }

        const prefsData = await adapter.getItem(STORAGE_KEY_PREFERENCES);
        if (prefsData) {
          const parsed = JSON.parse(prefsData) as { version: string; data: Partial<UserPreferences> };
          if (parsed.version === STORAGE_VERSION) {
            setPreferences({ ...DEFAULT_PREFERENCES, ...parsed.data });
          }
        }
      } catch (error) {
        console.error('Failed to load data from storage:', error);
      } finally {
        setIsLoaded(true);
      }
    }
    loadData();
  }, [adapter]);

  // 2. 自动持久化函数
  const persistToPhysicalStorage = useCallback((currentRecords: Record<string, DailyCalendarRecord>) => {
    const writeOperation = recordsWriteQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const serializedObj: Record<string, unknown> = {};
        Object.entries(currentRecords).forEach(([date, record]) => {
          serializedObj[date] = JSON.parse(serializeRecord(record));
        });
        await adapter.setItem(STORAGE_KEY_RECORDS, JSON.stringify(serializedObj));
        console.log(`[Storage] Successfully persisted ${Object.keys(currentRecords).length} records`);
      });
    recordsWriteQueueRef.current = writeOperation;
    return writeOperation;
  }, [adapter]);

  // 公开操作方法
  const saveRecord = useCallback(async (record: DailyCalendarRecord) => {
    console.log(`[Storage] Saving new record for ${record.date}`);
    const previous = recordsRef.current;
    const next = { ...previous, [record.date]: record };
    recordsRef.current = next;
    setRecords(next);
    try {
      await persistToPhysicalStorage(next);
    } catch (error) {
      recordsRef.current = previous;
      setRecords(previous);
      throw error;
    }
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
    const previous = recordsRef.current;
    const next = { ...previous };
    delete next[dateKey];
    recordsRef.current = next;
    setRecords(next);
    try {
      await persistToPhysicalStorage(next);
    } catch (error) {
      recordsRef.current = previous;
      setRecords(previous);
      throw error;
    }
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

  const updateImageModel = useCallback((imageModel: ImageModelConfig) => {
    const newPrefs: UserPreferences = {
      ...preferences,
      imageModel,
    };
    savePreferencesToStorage(newPrefs);
  }, [preferences, savePreferencesToStorage]);

  const updateLLMModel = useCallback((llmModel: LLMModelConfig) => {
    const newPrefs: UserPreferences = {
      ...preferences,
      llmModel,
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
    updateLLMModel,
    updateImageModel,
    isLoaded,
  };
}

export default useCalendarStorage;
