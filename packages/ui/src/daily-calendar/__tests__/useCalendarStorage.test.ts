/**
 * 台历存储 Hook 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCalendarStorage } from '../hooks/useCalendarStorage';
import { DailyCalendarRecord, ThemeType } from '../types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useCalendarStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('records', () => {
    it('should initialize with empty records', () => {
      const { result } = renderHook(() => useCalendarStorage());

      expect(result.current.records.size).toBe(0);
    });

    it('should load records from localStorage on mount', async () => {
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
            size: '1K',
            quality: 'standard',
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        records: { '2024-03-15': mockRecord },
      }));

      const { result } = renderHook(() => useCalendarStorage());

      await waitFor(() => {
        expect(result.current.records.size).toBe(1);
      });

      expect(result.current.getRecord('2024-03-15')).toBeDefined();
    });

    it('should save record to localStorage', async () => {
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
            size: '1K',
            quality: 'standard',
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await act(async () => {
        await result.current.saveRecord(mockRecord);
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(result.current.getRecord('2024-03-15')).toEqual(mockRecord);
    });
  });

  describe('preferences', () => {
    it('should load preferences from localStorage', () => {
      const mockPrefs = {
        themeStrategy: {
          type: 'daily-random' as const,
          currentTheme: 'nature' as ThemeType,
          preferences: {
            favorites: ['nature', 'art'],
            excluded: [],
            seasonalMapping: {
              spring: ['nature', 'art'],
              summer: ['nature'],
              autumn: ['vintage'],
              winter: ['minimal'],
            },
          },
        },
        defaultImageSize: '2K' as const,
        defaultImageQuality: 'hd' as const,
        language: 'zh' as const,
        autoGenerate: true,
      };

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'daily-calendar-prefs') {
          return JSON.stringify(mockPrefs);
        }
        return null;
      });

      const { result } = renderHook(() => useCalendarStorage());

      expect(result.current.preferences).toEqual(mockPrefs);
    });

    it('should save preferences to localStorage', async () => {
      const { result } = renderHook(() => useCalendarStorage());

      const newPrefs = {
        themeStrategy: {
          type: 'manual' as const,
          currentTheme: 'zen' as ThemeType,
          preferences: {
            favorites: ['zen'],
            excluded: [],
            seasonalMapping: {
              spring: ['nature'],
              summer: ['nature'],
              autumn: ['vintage'],
              winter: ['minimal'],
            },
          },
        },
        defaultImageSize: '1K' as const,
        defaultImageQuality: 'standard' as const,
        language: 'zh' as const,
        autoGenerate: false,
      };

      await act(async () => {
        await result.current.savePreferences(newPrefs);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'daily-calendar-prefs',
        JSON.stringify(newPrefs)
      );
    });
  });

  describe('clearHistory', () => {
    it('should clear all records', async () => {
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
            size: '1K',
            quality: 'standard',
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await act(async () => {
        await result.current.saveRecord(mockRecord);
      });

      expect(result.current.records.size).toBe(1);

      await act(async () => {
        await result.current.clearHistory();
      });

      expect(result.current.records.size).toBe(0);
    });
  });
});
