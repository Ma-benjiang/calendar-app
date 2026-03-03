/**
 * 每日台历主 Hook
 * 整合日期计算、文案生成(LLM)、图片生成(Seedream)、存储管理等功能
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  DailyCalendarRecord,
  ThemeType,
  ThemeStrategyType,
} from '../types';
import { seedreamService } from '../services/seedreamService';
import { selectDailyQuote } from '../services/captionService';
import { captionAIService } from '../services/captionAIService';
import {
  getCalendarDateInfo,
  formatDateKey,
  getSeason,
  isToday,
} from '../utils/dateUtils';
import { useCalendarStorage } from './useCalendarStorage';

// 生成唯一 ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 根据策略选择主题
function selectThemeByStrategy(
  strategy: ThemeStrategyType,
  preferences: { favorites: ThemeType[]; excluded: ThemeType[]; seasonalMapping: Record<string, ThemeType[]> },
  date: Date
): ThemeType {
  const allThemes: ThemeType[] = ['vintage', 'minimal', 'nature', 'art', 'zen', 'cosmic', 'clay', 'sticker', 'illustration'];

  switch (strategy) {
    case 'manual':
      return preferences.favorites[0] || 'vintage';
    case 'seasonal': {
      const season = getSeason(date);
      const seasonThemes = preferences.seasonalMapping[season] || allThemes;
      const availableThemes = seasonThemes.filter(t => !preferences.excluded.includes(t));
      const pool = availableThemes.length > 0 ? availableThemes : allThemes;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    case 'daily-random': {
      const availableThemes = allThemes.filter(t => !preferences.excluded.includes(t));
      const pool = availableThemes.length > 0 ? availableThemes : allThemes;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    case 'ai-recommended':
      return 'vintage';
    default:
      return 'vintage';
  }
}

export interface UseDailyCalendarReturn {
  currentRecord: DailyCalendarRecord | null;
  currentDate: Date;
  isLoading: boolean;
  isGenerating: boolean;
  progress: number;
  error: Error | null;
  generateCalendar: (date?: Date, theme?: ThemeType) => Promise<void>;
  regenerateCalendar: () => Promise<void>;
  deleteCurrentRecord: () => Promise<void>;
  changeTheme: (theme: ThemeType) => Promise<void>;
  changeDate: (date: Date) => void;
  goToToday: () => void;
  goToPrevDay: () => void;
  goToNextDay: () => void;
  currentTheme: ThemeType;
  themeStrategy: ThemeStrategyType;
  setThemeStrategy: (strategy: ThemeStrategyType) => void;
  setManualTheme: (theme: ThemeType) => void;
  hasRecordForDate: (date: Date) => boolean;
  getRecordForDate: (date: Date) => DailyCalendarRecord | null;
  records: Map<string, DailyCalendarRecord>;
}

export function useDailyCalendar(): UseDailyCalendarReturn {
  const {
    records,
    preferences,
    saveRecord,
    getRecord,
    hasRecord,
    deleteRecord,
    updateThemeStrategy,
    switchTheme,
    isLoaded,
  } = useCalendarStorage();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentRecord, setCurrentRecord] = useState<DailyCalendarRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const currentTheme = preferences.themeStrategy.currentTheme;
  const themeStrategy = preferences.themeStrategy.type;

  const loadCalendarForDate = useCallback((date: Date) => {
    const dateKey = formatDateKey(date);
    const existingRecord = getRecord(dateKey);
    if (existingRecord) {
      setCurrentRecord(existingRecord);
      return true;
    }
    return false;
  }, [getRecord]);

  const generateCalendar = useCallback(async (
    date: Date = currentDate,
    theme?: ThemeType
  ) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      const dateKey = formatDateKey(date);
      const existingRecord = getRecord(dateKey);
      const shouldUseCache = existingRecord && (!theme || existingRecord.theme === theme);

      if (shouldUseCache) {
        setCurrentRecord(existingRecord);
        setIsLoading(false);
        setIsGenerating(false);
        setProgress(100);
        return;
      }

      const dateInfo = getCalendarDateInfo(date);
      const selectedTheme = theme || selectThemeByStrategy(
        preferences.themeStrategy.type,
        preferences.themeStrategy.preferences,
        date
      );

      // 1. 生成文案 (优先 LLM)
      setProgress(20);
      let quote = await captionAIService.generateQuote(date, selectedTheme, dateInfo);
      if (!quote) {
        quote = selectDailyQuote(date, selectedTheme, dateInfo);
      }

      // 2. 生成图片
      setProgress(40);
      const imageParams = {
        date,
        theme: selectedTheme,
        quote: quote.text,
        size: preferences.defaultImageSize,
        quality: preferences.defaultImageQuality,
      };

      const generatedImage = await seedreamService.generateImage(imageParams);

      const newRecord: DailyCalendarRecord = {
        id: generateId(),
        date: dateKey,
        dateInfo,
        theme: selectedTheme,
        quote,
        image: generatedImage,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await saveRecord(newRecord);
      setCurrentRecord(newRecord);
      setProgress(100);

      if (isToday(date)) {
        switchTheme(selectedTheme);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (error.name !== 'AbortError') {
        setError(error);
        console.error('Failed to generate calendar:', error);
      }
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  }, [currentDate, getRecord, preferences, saveRecord, switchTheme]);

  const deleteCurrentRecord = useCallback(async () => {
    const dateKey = formatDateKey(currentDate);
    deleteRecord(dateKey);
    setCurrentRecord(null);
  }, [currentDate, deleteRecord]);

  const regenerateCalendar = useCallback(async () => {
    setCurrentRecord(null);
    const dateKey = formatDateKey(currentDate);
    const dateInfo = getCalendarDateInfo(currentDate);
    const selectedTheme = selectThemeByStrategy(
      preferences.themeStrategy.type,
      preferences.themeStrategy.preferences,
      currentDate
    );
    
    setIsLoading(true);
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      setProgress(20);
      let quote = await captionAIService.generateQuote(currentDate, selectedTheme, dateInfo);
      if (!quote) {
        quote = selectDailyQuote(currentDate, selectedTheme, dateInfo);
      }

      setProgress(40);
      const imageParams = {
        date: currentDate,
        theme: selectedTheme,
        quote: quote.text,
        size: preferences.defaultImageSize,
        quality: preferences.defaultImageQuality,
      };

      const generatedImage = await seedreamService.generateImage(imageParams);

      const newRecord: DailyCalendarRecord = {
        id: generateId(),
        date: dateKey,
        dateInfo,
        theme: selectedTheme,
        quote,
        image: generatedImage,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await saveRecord(newRecord);
      setCurrentRecord(newRecord);
      setProgress(100);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (error.message !== '生成已取消') {
        setError(error);
        console.error('Failed to regenerate calendar:', error);
      }
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  }, [currentDate, preferences, saveRecord]);

  const changeTheme = useCallback(async (theme: ThemeType) => {
    switchTheme(theme);
    await generateCalendar(currentDate, theme);
  }, [currentDate, generateCalendar, switchTheme]);

  const changeDate = useCallback((date: Date) => {
    setCurrentDate(date);
    setError(null);
    const hasCache = loadCalendarForDate(date);
    if (isToday(date) && !hasCache && preferences.autoGenerate) {
      generateCalendar(date);
    }
  }, [loadCalendarForDate, generateCalendar, preferences.autoGenerate]);

  const goToToday = useCallback(() => {
    const today = new Date();
    changeDate(today);
  }, [changeDate]);

  const goToPrevDay = useCallback(() => {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    changeDate(prevDate);
  }, [currentDate, changeDate]);

  const goToNextDay = useCallback(() => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    changeDate(nextDate);
  }, [currentDate, changeDate]);

  const setThemeStrategy = useCallback((strategy: ThemeStrategyType) => {
    updateThemeStrategy(strategy);
  }, [updateThemeStrategy]);

  const setManualTheme = useCallback((theme: ThemeType) => {
    updateThemeStrategy('manual', theme);
  }, [updateThemeStrategy]);

  const hasRecordForDate = useCallback((date: Date): boolean => {
    return hasRecord(formatDateKey(date));
  }, [hasRecord]);

  const getRecordForDate = useCallback((date: Date): DailyCalendarRecord | null => {
    return getRecord(formatDateKey(date));
  }, [getRecord]);

  useEffect(() => {
    if (!isLoaded) return;
    const today = new Date();
    const hasCache = loadCalendarForDate(today);
    if (!hasCache && preferences.autoGenerate) {
      generateCalendar(today);
    }
  }, [isLoaded]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    currentRecord,
    currentDate,
    isLoading,
    isGenerating,
    progress,
    error,
    generateCalendar,
    regenerateCalendar,
    deleteCurrentRecord,
    changeTheme,
    changeDate,
    goToToday,
    goToPrevDay,
    goToNextDay,
    currentTheme,
    themeStrategy,
    setThemeStrategy,
    setManualTheme,
    hasRecordForDate,
    getRecordForDate,
    records,
  };
}

export default useDailyCalendar;
