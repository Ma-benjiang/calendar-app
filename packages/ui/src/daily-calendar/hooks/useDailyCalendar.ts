/**
 * 每日台历主 Hook
 * 整合日期计算、图片生成、存储管理等功能
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  DailyCalendarRecord,
  ThemeType,
  // ImageSize - for future use
  // ImageQuality - for future use
  // GeneratedImage - for future use
  // CalendarDateInfo - for future use
  ThemeStrategyType,
} from '../types';
import { seedreamService } from '../services/seedreamService';
import { selectDailyQuote } from '../services/captionService';
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
  const allThemes: ThemeType[] = ['vintage', 'minimal', 'nature', 'art', 'zen', 'cosmic'];

  switch (strategy) {
    case 'manual':
      // 使用当前设置的主题
      return preferences.favorites[0] || 'vintage';

    case 'seasonal': {
      // 根据季节选择
      const season = getSeason(date);
      const seasonThemes = preferences.seasonalMapping[season] || allThemes;
      const availableThemes = seasonThemes.filter(t => !preferences.excluded.includes(t));
      const pool = availableThemes.length > 0 ? availableThemes : allThemes;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    case 'daily-random': {
      // 每日随机
      const availableThemes = allThemes.filter(t => !preferences.excluded.includes(t));
      const pool = availableThemes.length > 0 ? availableThemes : allThemes;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    case 'ai-recommended':
      // TODO: 实现 AI 推荐逻辑
      return 'vintage';

    default:
      return 'vintage';
  }
}

export interface UseDailyCalendarReturn {
  // 当前状态
  currentRecord: DailyCalendarRecord | null;
  currentDate: Date;
  isLoading: boolean;
  isGenerating: boolean;
  progress: number;
  error: Error | null;

  // 操作方法
  generateCalendar: (date?: Date, theme?: ThemeType) => Promise<void>;
  regenerateCalendar: () => Promise<void>;
  changeTheme: (theme: ThemeType) => Promise<void>;
  changeDate: (date: Date) => void;
  goToToday: () => void;
  goToPrevDay: () => void;
  goToNextDay: () => void;

  // 配置
  currentTheme: ThemeType;
  themeStrategy: ThemeStrategyType;
  setThemeStrategy: (strategy: ThemeStrategyType) => void;
  setManualTheme: (theme: ThemeType) => void;

  // 存储相关
  hasRecordForDate: (date: Date) => boolean;
  getRecordForDate: (date: Date) => DailyCalendarRecord | null;
  records: Map<string, DailyCalendarRecord>;
}

/**
 * 每日台历主 Hook
 */
export function useDailyCalendar(): UseDailyCalendarReturn {
  // 存储管理
  const {
    records,
    preferences,
    saveRecord,
    getRecord,
    hasRecord,
    updateThemeStrategy,
    switchTheme,
    isLoaded,
  } = useCalendarStorage();

  // 当前状态
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentRecord, setCurrentRecord] = useState<DailyCalendarRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  // 用于取消生成
  const abortControllerRef = useRef<AbortController | null>(null);

  // 当前主题
  const currentTheme = preferences.themeStrategy.currentTheme;
  const themeStrategy = preferences.themeStrategy.type;

  // 加载指定日期的台历
  const loadCalendarForDate = useCallback((date: Date) => {
    const dateKey = formatDateKey(date);
    const existingRecord = getRecord(dateKey);

    if (existingRecord) {
      setCurrentRecord(existingRecord);
      return true;
    }

    return false;
  }, [getRecord]);

  // 生成台历
  const generateCalendar = useCallback(async (
    date: Date = currentDate,
    theme?: ThemeType
  ) => {
    // 取消之前的生成
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      // 1. 检查是否已有缓存
      const dateKey = formatDateKey(date);
      const existingRecord = getRecord(dateKey);

      // 如果指定了主题且与缓存不同，或者强制重新生成，则跳过缓存
      const shouldUseCache = existingRecord &&
        (!theme || existingRecord.theme === theme);

      if (shouldUseCache) {
        setCurrentRecord(existingRecord);
        setIsLoading(false);
        setIsGenerating(false);
        setProgress(100);
        return;
      }

      // 2. 获取日期信息
      setProgress(10);
      const dateInfo = getCalendarDateInfo(date);

      // 3. 选择主题
      setProgress(20);
      const selectedTheme = theme || selectThemeByStrategy(
        preferences.themeStrategy.type,
        preferences.themeStrategy.preferences,
        date
      );

      // 4. 选择文案
      setProgress(30);
      const quote = selectDailyQuote(date, selectedTheme, dateInfo);

      // 5. 生成图片
      setProgress(40);
      const imageParams = {
        date,
        theme: selectedTheme,
        quote: quote.text,
        size: preferences.defaultImageSize,
        quality: preferences.defaultImageQuality,
      };

      setProgress(50);
      const generatedImage = await seedreamService.generateImage(imageParams);

      // 6. 创建记录
      setProgress(90);
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

      // 7. 保存并更新状态
      await saveRecord(newRecord);
      setCurrentRecord(newRecord);
      setProgress(100);

      // 8. 如果是今天的日期，更新当前主题
      if (isToday(date)) {
        switchTheme(selectedTheme);
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('Failed to generate calendar:', error);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  }, [
    currentDate,
    getRecord,
    preferences,
    saveRecord,
    switchTheme,
  ]);

  // 重新生成当前日期的台历
  const regenerateCalendar = useCallback(async () => {
    // 强制重新生成，不使用缓存
    const dateKey = formatDateKey(currentDate);
    const dateInfo = getCalendarDateInfo(currentDate);
    const selectedTheme = selectThemeByStrategy(
      preferences.themeStrategy.type,
      preferences.themeStrategy.preferences,
      currentDate
    );
    const quote = selectDailyQuote(currentDate, selectedTheme, dateInfo);

    setIsLoading(true);
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      setProgress(30);
      const imageParams = {
        date: currentDate,
        theme: selectedTheme,
        quote: quote.text,
        size: preferences.defaultImageSize,
        quality: preferences.defaultImageQuality,
      };

      setProgress(50);
      const generatedImage = await seedreamService.generateImage(imageParams);

      setProgress(90);
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
      // 如果是用户主动取消（快速点击重新生成），不显示错误
      if (error.message === '生成已取消') {
        console.log('Generation cancelled by user');
        // 重置状态但不显示错误
        setIsLoading(false);
        setIsGenerating(false);
        setProgress(0);
        return;
      }
      setError(error);
      console.error('Failed to regenerate calendar:', error);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  }, [currentDate, preferences, saveRecord]);

  // 切换主题
  const changeTheme = useCallback(async (theme: ThemeType) => {
    await generateCalendar(currentDate, theme);
    switchTheme(theme);
  }, [currentDate, generateCalendar, switchTheme]);

  // 切换日期
  const changeDate = useCallback((date: Date) => {
    setCurrentDate(date);
    setError(null);

    // 尝试加载缓存
    const hasCache = loadCalendarForDate(date);

    // 如果是今天且没有缓存，自动生成
    if (isToday(date) && !hasCache && preferences.autoGenerate) {
      generateCalendar(date);
    }
  }, [loadCalendarForDate, generateCalendar, preferences.autoGenerate]);

  // 回到今天
  const goToToday = useCallback(() => {
    const today = new Date();
    changeDate(today);
  }, [changeDate]);

  // 前一天
  const goToPrevDay = useCallback(() => {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    changeDate(prevDate);
  }, [currentDate, changeDate]);

  // 后一天
  const goToNextDay = useCallback(() => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    changeDate(nextDate);
  }, [currentDate, changeDate]);

  // 设置主题策略
  const setThemeStrategy = useCallback((strategy: ThemeStrategyType) => {
    updateThemeStrategy(strategy);
  }, [updateThemeStrategy]);

  // 设置手动主题
  const setManualTheme = useCallback((theme: ThemeType) => {
    updateThemeStrategy('manual', theme);
  }, [updateThemeStrategy]);

  // 检查指定日期是否有记录
  const hasRecordForDate = useCallback((date: Date): boolean => {
    return hasRecord(formatDateKey(date));
  }, [hasRecord]);

  // 获取指定日期的记录
  const getRecordForDate = useCallback((date: Date): DailyCalendarRecord | null => {
    return getRecord(formatDateKey(date));
  }, [getRecord]);

  // 初始化：加载今天的台历
  useEffect(() => {
    if (!isLoaded) return;

    const today = new Date();
    const hasCache = loadCalendarForDate(today);

    // 如果没有缓存且设置了自动生成，则生成
    if (!hasCache && preferences.autoGenerate) {
      generateCalendar(today);
    }
  }, [isLoaded]); // 只在加载完成后执行一次

  // 清理
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // 状态
    currentRecord,
    currentDate,
    isLoading,
    isGenerating,
    progress,
    error,

    // 操作方法
    generateCalendar,
    regenerateCalendar,
    changeTheme,
    changeDate,
    goToToday,
    goToPrevDay,
    goToNextDay,

    // 配置
    currentTheme,
    themeStrategy,
    setThemeStrategy,
    setManualTheme,

    // 存储相关
    hasRecordForDate,
    getRecordForDate,
    records,
  };
}

export default useDailyCalendar;
