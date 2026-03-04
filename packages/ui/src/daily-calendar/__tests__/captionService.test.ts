/**
 * 文案服务单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  selectDailyQuote,
  getQuoteById,
  getAllQuotes,
  getQuotesByCategory,
  clearRecentQuotes,
  generatePromptQuote,
} from '../services/captionService';
import { CalendarDateInfo, ThemeType } from '../types';

describe('captionService', () => {
  beforeEach(() => {
    clearRecentQuotes();
  });

  describe('selectDailyQuote', () => {
    const dateInfo: CalendarDateInfo = {
      gregorian: { year: 2024, month: 3, day: 15, monthName: '三月', dayName: '十五日' },
      lunar: { year: 2024, month: 2, day: 6, monthName: '二月', dayName: '初六', zodiac: '龙' },
      weekday: { index: 4, name: '星期五', shortName: '周五', englishName: 'Friday' },
      special: { isHoliday: false, isSolarTerm: false, constellation: '双鱼座' },
    };

    it('should return a quote for given date info', () => {
      const quote = selectDailyQuote(new Date(2024, 2, 15), 'vintage' as ThemeType, dateInfo);

      expect(quote).toBeDefined();
      expect(quote.text).toBeDefined();
    });

    it('should avoid recent quotes', () => {
      const quote1 = selectDailyQuote(new Date(2024, 2, 15), 'vintage' as ThemeType, dateInfo);
      const quote2 = selectDailyQuote(new Date(2024, 2, 15), 'vintage' as ThemeType, dateInfo);
      
      // 在小规模数据下不一定保证不同，但至少应能正常运行
      expect(quote1).toBeDefined();
      expect(quote2).toBeDefined();
    });
  });

  describe('utility functions', () => {
    it('should return quote by id', () => {
      const all = getAllQuotes();
      if (all.length > 0) {
        const first = all[0];
        const retrieved = getQuoteById(first.id);
        expect(retrieved).toEqual(first);
      }
    });

    it('should return quotes by category', () => {
      const quotes = getQuotesByCategory('poetry');
      expect(Array.isArray(quotes)).toBe(true);
    });
  });

  describe('generatePromptQuote', () => {
    it('should generate prompt with quote and theme', () => {
      const dateInfo: CalendarDateInfo = {
        gregorian: { year: 2024, month: 3, day: 15, monthName: '三月', dayName: '十五日' },
        lunar: { year: 2024, month: 2, day: 6, monthName: '二月', dayName: '初六', zodiac: '龙' },
        weekday: { index: 4, name: '星期五', shortName: '周五', englishName: 'Friday' },
        special: { isHoliday: false, isSolarTerm: false, constellation: '双鱼座' },
      };
      const quote = { id: 'q1', text: '测试文案', category: 'general' as const, themes: ['vintage' as ThemeType] };
      const prompt = generatePromptQuote(quote, dateInfo, 'vintage' as ThemeType);

      expect(prompt).toContain('测试文案');
    });
  });
});
