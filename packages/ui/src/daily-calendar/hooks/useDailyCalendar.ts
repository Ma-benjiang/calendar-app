/**
 * 每日台历主 Hook
 * 整合日期计算、文案生成(LLM)、图片生成(Seedream/Img2Img)、存储管理等功能
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
  const allThemes: ThemeType[] = ['vintage', 'minimal', 'nature', 'art', 'zen', 'cosmic', 'clay', 'sticker', 'illustration', 'cyberpunk', 'ukiyoe', 'ghibli'];

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
  generateCalendar: (date?: Date, theme?: ThemeType, refImage?: string) => Promise<void>;
  regenerateCalendar: (refImage?: string) => Promise<void>;
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
  records: Record<string, DailyCalendarRecord>;
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

  // 核心：加载特定日期的记录
  const loadCalendarForDate = useCallback((date: Date) => {
    const dateKey = formatDateKey(date);
    const existingRecord = getRecord(dateKey);
    console.log(`[Calendar] Checking record for ${dateKey}:`, !!existingRecord);
    if (existingRecord) {
      setCurrentRecord(existingRecord);
      return true;
    }
    setCurrentRecord(null);
    return false;
  }, [getRecord]);

  // 1. 初始加载逻辑
  useEffect(() => {
    if (isLoaded) {
      loadCalendarForDate(currentDate);
    }
  }, [isLoaded]); // 仅在存储加载完成时运行一次

  // 2. 生成逻辑
  const generateCalendar = useCallback(async (
    date: Date = currentDate,
    theme?: ThemeType,
    refImage?: string
  ) => {
    if (isGenerating) return;
    
    console.log(`[Calendar] Starting generation for ${formatDateKey(date)}`);
    setIsLoading(true);
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      const dateKey = formatDateKey(date);
      const dateInfo = getCalendarDateInfo(date);
      const selectedTheme = theme || selectThemeByStrategy(
        preferences.themeStrategy.type,
        preferences.themeStrategy.preferences,
        date
      );

      // A. 生成文案 (优先 LLM)
      setProgress(20);
      let quote = await captionAIService.generateQuote(date, selectedTheme, dateInfo);
      if (!quote) {
        console.log('[Calendar] Falling back to static quote library');
        quote = selectDailyQuote(date, selectedTheme, dateInfo);
      }

      // B. 生成图片
      setProgress(40);
      const generatedImage = await seedreamService.generateImage({
        date,
        theme: selectedTheme,
        quote: quote.text,
        size: preferences.defaultImageSize,
        quality: preferences.defaultImageQuality,
        refImage, 
      });

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

      console.log(`[Calendar] Saving and displaying new record for ${dateKey}`);
      await saveRecord(newRecord);
      setCurrentRecord(newRecord);
      setProgress(100);

      if (isToday(date)) {
        switchTheme(selectedTheme);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('[Calendar] Generation failed:', error);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  }, [currentDate, preferences, saveRecord, switchTheme, isGenerating]);

  const deleteCurrentRecord = useCallback(async () => {
    const dateKey = formatDateKey(currentDate);
    await deleteRecord(dateKey);
    setCurrentRecord(null);
  }, [currentDate, deleteRecord]);

  const regenerateCalendar = useCallback(async (refImage?: string) => {
    setCurrentRecord(null);
    await generateCalendar(currentDate, undefined, refImage);
  }, [currentDate, generateCalendar]);

  const changeTheme = useCallback(async (theme: ThemeType) => {
    switchTheme(theme);
    setCurrentRecord(null);
    await generateCalendar(currentDate, theme);
  }, [currentDate, generateCalendar, switchTheme]);

  const changeDate = useCallback((date: Date) => {
    console.log(`[Calendar] Changing date to ${formatDateKey(date)}`);
    setCurrentDate(date);
    setError(null);
    
    // 手动加载，不使用 useEffect 监听，避免冲突
    const dateKey = formatDateKey(date);
    const existingRecord = getRecord(dateKey);
    setCurrentRecord(existingRecord || null);
  }, [getRecord]);

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
    return !!records[formatDateKey(date)];
  }, [records]);

  const getRecordForDate = useCallback((date: Date): DailyCalendarRecord | null => {
    return records[formatDateKey(date)] || null;
  }, [records]);

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
