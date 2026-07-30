/**
 * 台历存储 Hook 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCalendarStorage } from '../hooks/useCalendarStorage';
import { DailyCalendarRecord } from '../types';

describe('useCalendarStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    delete (window as unknown as { calendarDesktop?: unknown }).calendarDesktop;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('records', () => {
    it('should initialize with empty records', async () => {
      const { result } = renderHook(() => useCalendarStorage());

      await waitFor(() => expect(result.current.isLoaded).toBe(true));
      expect(Object.keys(result.current.records).length).toBe(0);
    });

    it('should save record', async () => {
      const { result } = renderHook(() => useCalendarStorage());

      const mockRecord: DailyCalendarRecord = {
        id: '2024-03-15',
        date: '2024-03-15',
        dateInfo: {
          gregorian: { year: 2024, month: 3, day: 15, monthName: '三月', dayName: '十五日' },
          lunar: { year: 2024, month: 2, day: 6, monthName: '二月', dayName: '初六', zodiac: '龙' },
          weekday: { index: 4, name: '星期五', shortName: '周五', englishName: 'Friday' },
          special: { isHoliday: false, isSolarTerm: false, constellation: '双鱼座' },
        },
        theme: 'vintage',
        quote: {
          id: 'test-001',
          text: '测试文案',
          category: 'general',
          themes: ['vintage'],
        },
        image: {
          id: 'img-001',
          url: 'https://example.com/image.jpg',
          metadata: {
            generatedAt: new Date(),
            prompt: 'test prompt',
            theme: 'vintage',
            size: '2K',
            quality: 'standard',
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await act(async () => {
        await result.current.saveRecord(mockRecord);
      });

      expect(result.current.getRecord('2024-03-15')).toEqual(mockRecord);
    });

    it('should wait for desktop persistence before resolving record changes', async () => {
      let finishWrite: (() => void) | undefined;
      const setItem = vi.fn(() => new Promise<void>((resolve) => {
        finishWrite = resolve;
      }));
      (window as unknown as {
        calendarDesktop: {
          storage: {
            getItem: () => Promise<null>;
            setItem: typeof setItem;
            removeItem: () => Promise<void>;
          };
        };
      }).calendarDesktop = {
        storage: {
          getItem: vi.fn().mockResolvedValue(null),
          setItem,
          removeItem: vi.fn().mockResolvedValue(undefined),
        },
      };
      const { result } = renderHook(() => useCalendarStorage());
      await waitFor(() => expect(result.current.isLoaded).toBe(true));

      let settled = false;
      let deletion: Promise<void>;
      act(() => {
        deletion = result.current.deleteRecord('2026-07-30');
        deletion.then(() => {
          settled = true;
        });
      });

      await waitFor(() => expect(setItem).toHaveBeenCalled());
      expect(settled).toBe(false);
      await act(async () => {
        finishWrite?.();
        await deletion;
      });
      expect(settled).toBe(true);
    });
  });

  describe('preferences', () => {
    it('should save a manual theme', async () => {
      const { result } = renderHook(() => useCalendarStorage());

      act(() => {
        result.current.updateThemeStrategy('manual', 'nature');
      });

      await waitFor(() => {
        expect(result.current.preferences.themeStrategy).toEqual({
          type: 'manual',
          currentTheme: 'nature',
        });
      });
    });

    it('should update theme strategy', async () => {
      const { result } = renderHook(() => useCalendarStorage());

      await act(async () => {
        result.current.updateThemeStrategy('daily-random', 'art');
      });

      expect(result.current.preferences.themeStrategy.type).toBe('daily-random');
      expect(result.current.preferences.themeStrategy.currentTheme).toBe('art');
    });

    it('should persist image model configuration', async () => {
      const { result } = renderHook(() => useCalendarStorage());

      await waitFor(() => expect(result.current.isLoaded).toBe(true));
      act(() => {
        result.current.updateImageModel({
          provider: 'openai',
          apiEndpoint: 'https://images.example.com/api/v3/images/generations',
          apiKey: 'local-key',
          model: 'custom-model',
        });
      });

      await waitFor(() => {
        expect(result.current.preferences.imageModel.model).toBe('custom-model');
      });
      const stored = JSON.parse(localStorage.getItem('daily-calendar-preferences') || '{}');
      expect(stored.data.imageModel.apiEndpoint).toBe('https://images.example.com/api/v3/images/generations');
    });

    it('should persist LLM model configuration', async () => {
      const { result } = renderHook(() => useCalendarStorage());

      await waitFor(() => expect(result.current.isLoaded).toBe(true));
      act(() => {
        result.current.updateLLMModel({
          provider: 'deepseek',
          apiEndpoint: 'https://api.deepseek.com/chat/completions',
          apiKey: 'local-deepseek-key',
          model: 'deepseek-v4-flash',
        });
      });

      await waitFor(() => {
        expect(result.current.preferences.llmModel.model).toBe('deepseek-v4-flash');
      });
      const stored = JSON.parse(localStorage.getItem('daily-calendar-preferences') || '{}');
      expect(stored.data.llmModel.apiKey).toBe('local-deepseek-key');
    });

    it('should not copy environment secrets into persisted preferences', async () => {
      vi.stubEnv('VITE_SEEDREAM_API_KEY', 'environment-secret');
      vi.stubEnv('VITE_DEEPSEEK_API_KEY', 'deepseek-environment-secret');
      const { result } = renderHook(() => useCalendarStorage());

      await waitFor(() => expect(result.current.isLoaded).toBe(true));
      act(() => result.current.updateThemeStrategy('manual', 'art'));

      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem('daily-calendar-preferences') || '{}');
        expect(stored.data.imageModel.apiKey).toBe('');
        expect(stored.data.llmModel.apiKey).toBe('');
      });
    });
  });
});
