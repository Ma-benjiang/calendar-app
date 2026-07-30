/**
 * 每日台历主 Hook
 * 整合日期计算、文案生成(LLM)、图片生成(Seedream/Img2Img)、存储管理等功能
 */

import { useState, useCallback, useEffect } from 'react';
import {
  DailyCalendarRecord,
  ImageModelConfig,
  LLMModelConfig,
  ThemeType,
  ThemeStrategyType,
} from '../types';
import { seedreamService } from '../services/seedreamService';
import { selectDailyQuote } from '../services/captionService';
import { captionAIService } from '../services/captionAIService';
import { buildFallbackImagePrompt } from '../services/captionAIService';
import {
  persistCalendarImage,
  removeCalendarImage,
} from '../services/localImageService';
import {
  getCalendarDateInfo,
  formatDateKey,
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
  manualTheme: ThemeType
): ThemeType {
  const allThemes: ThemeType[] = ['vintage', 'minimal', 'nature', 'art', 'zen', 'cosmic', 'clay', 'sticker', 'illustration', 'cyberpunk', 'ukiyoe', 'ghibli'];

  if (strategy === 'manual') {
    return manualTheme;
  }

  return allThemes[Math.floor(Math.random() * allThemes.length)];
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
  changeDate: (date: Date) => void;
  goToToday: () => void;
  goToPrevDay: () => void;
  goToNextDay: () => void;
  currentTheme: ThemeType;
  themeStrategy: ThemeStrategyType;
  setThemeStrategy: (strategy: ThemeStrategyType, theme?: ThemeType) => void;
  hasRecordForDate: (date: Date) => boolean;
  getRecordForDate: (date: Date) => DailyCalendarRecord | null;
  records: Record<string, DailyCalendarRecord>;
  imageModelConfig: ImageModelConfig;
  updateImageModelConfig: (config: ImageModelConfig) => void;
  llmModelConfig: LLMModelConfig;
  updateLLMModelConfig: (config: LLMModelConfig) => void;
}

export function useDailyCalendar(): UseDailyCalendarReturn {
  const {
    records,
    preferences,
    saveRecord,
    getRecord,
    deleteRecord,
    updateThemeStrategy,
    updateLLMModel,
    updateImageModel,
    isLoaded,
  } = useCalendarStorage();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentRecord, setCurrentRecord] = useState<DailyCalendarRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]); // 仅在存储加载完成时运行一次

  // 2. 生成逻辑
  const generateCalendar = useCallback(async (
    date: Date = currentDate,
    theme?: ThemeType,
    refImage?: string
  ) => {
    if (isGenerating) return;
    if (!isToday(date)) {
      setError(new Error('只能生成今天的台历'));
      return;
    }
    
    console.log(`[Calendar] Starting generation for ${formatDateKey(date)}`);
    setIsLoading(true);
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      const dateKey = formatDateKey(date);
      const existingRecord = getRecord(dateKey);
      const dateInfo = getCalendarDateInfo(date);
      const selectedTheme = theme || selectThemeByStrategy(
        preferences.themeStrategy.type,
        preferences.themeStrategy.currentTheme
      );

      // 一次 LLM 调用同时生成文案和视觉 Prompt，失败时回退本地方案。
      setProgress(20);
      const creativePlan = await captionAIService.generateCreativePlan(
        date,
        selectedTheme,
        dateInfo,
        preferences.llmModel
      );
      const quote = creativePlan?.quote
        ?? selectDailyQuote(date, selectedTheme, dateInfo);
      const visualPrompt = creativePlan?.imagePrompt
        ?? buildFallbackImagePrompt(date, selectedTheme, quote, dateInfo);

      // 生成无文字背景图，日期和文案由客户端排版。
      setProgress(40);
      const generatedImage = await seedreamService.generateImage(
        {
          date,
          theme: selectedTheme,
          quote: quote.text,
          size: preferences.defaultImageSize,
          quality: preferences.defaultImageQuality,
          refImage,
          visualPrompt,
        },
        preferences.imageModel
      );
      const previousImageURL = existingRecord?.image.url;
      const persistedImageURL = await persistCalendarImage(
        generatedImage.url,
        dateKey
      );
      const persistedImage = {
        ...generatedImage,
        url: persistedImageURL,
      };

      const newRecord: DailyCalendarRecord = {
        id: existingRecord?.id ?? generateId(),
        date: dateKey,
        dateInfo,
        theme: selectedTheme,
        quote,
        image: persistedImage,
        createdAt: existingRecord?.createdAt ?? new Date(),
        updatedAt: new Date(),
      };

      console.log(`[Calendar] Saving and displaying new record for ${dateKey}`);
      try {
        await saveRecord(newRecord);
      } catch (storageError) {
        await removeCalendarImage(persistedImageURL);
        throw storageError;
      }
      if (previousImageURL && previousImageURL !== persistedImageURL) {
        removeCalendarImage(previousImageURL).catch((cleanupError) => {
          console.warn('[Calendar] Failed to remove replaced image:', cleanupError);
        });
      }
      setCurrentRecord(newRecord);
      setProgress(100);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('[Calendar] Generation failed:', error);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  }, [currentDate, preferences, saveRecord, isGenerating, getRecord]);

  const deleteCurrentRecord = useCallback(async () => {
    if (!isToday(currentDate)) {
      setError(new Error('历史台历仅支持查看，不能删除'));
      return;
    }
    const dateKey = formatDateKey(currentDate);
    const imageURL = currentRecord?.image.url;
    await deleteRecord(dateKey);
    removeCalendarImage(imageURL).catch((cleanupError) => {
      console.warn('[Calendar] Failed to remove discarded image:', cleanupError);
    });
    setCurrentRecord(null);
  }, [currentDate, currentRecord, deleteRecord]);

  const regenerateCalendar = useCallback(async (refImage?: string) => {
    if (!isToday(currentDate)) {
      setError(new Error('历史台历仅支持查看，不能重新生成'));
      return;
    }
    await generateCalendar(currentDate, undefined, refImage);
  }, [currentDate, generateCalendar]);

  const changeDate = useCallback((date: Date) => {
    const requestedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (requestedDate.getTime() > today.getTime()) {
      setError(new Error('不能查看或生成未来日期的台历'));
      return;
    }

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

  const setThemeStrategy = useCallback((strategy: ThemeStrategyType, theme?: ThemeType) => {
    updateThemeStrategy(strategy, theme);
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
    changeDate,
    goToToday,
    goToPrevDay,
    goToNextDay,
    currentTheme,
    themeStrategy,
    setThemeStrategy,
    hasRecordForDate,
    getRecordForDate,
    records,
    llmModelConfig: preferences.llmModel,
    updateLLMModelConfig: updateLLMModel,
    imageModelConfig: preferences.imageModel,
    updateImageModelConfig: updateImageModel,
  };
}

export default useDailyCalendar;
