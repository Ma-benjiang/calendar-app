/**
 * 台历存储 Hook 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalendarStorage } from '../hooks/useCalendarStorage';
import { DailyCalendarRecord } from '../types';

describe('useCalendarStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('records', () => {
    it('should initialize with empty records', () => {
      const { result } = renderHook(() => useCalendarStorage());

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
  });

  describe('preferences', () => {
    it('should switch theme', async () => {
      const { result } = renderHook(() => useCalendarStorage());

      await act(async () => {
        result.current.switchTheme('nature');
      });

      expect(result.current.preferences.themeStrategy.currentTheme).toBe('nature');
    });

    it('should update theme strategy', async () => {
      const { result } = renderHook(() => useCalendarStorage());

      await act(async () => {
        result.current.updateThemeStrategy('daily-random', 'art');
      });

      expect(result.current.preferences.themeStrategy.type).toBe('daily-random');
      expect(result.current.preferences.themeStrategy.currentTheme).toBe('art');
    });
  });
});
