/**
 * 文案服务单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  selectDailyQuote,
  getQuoteById,
  getAllQuotes,
  getQuotesByCategory,
  addCustomQuote,
  clearRecentQuotes,
  generatePromptQuote,
} from '../services/captionService';
import { CalendarDateInfo } from '../types';

describe('captionService', () => {
  beforeEach(() => {
    clearRecentQuotes();
  });

  describe('selectDailyQuote', () => {
    it('should return a quote for given date info', () => {
      const dateInfo: CalendarDateInfo = {
        gregorian: { year: 2024, month: 3, day: 15, monthName: '三月', dayName: '十五日' },
        lunar: { year: 2024, month: 2, day: 6, monthName: '二月', dayName: '初六', zodiac: '龙' },
        weekday: { index: 4, name: '星期五', shortName: '周五', englishName: 'Friday' },
        special: { isHoliday: false, isSolarTerm: false, constellation: '双鱼座' },
      };

      const quote = selectDailyQuote(dateInfo, 'vintage');

      expect(quote).toBeDefined();
      expect(quote.text).toBeDefined();
      expect(quote.text.length).toBeGreaterThan(0);
    });

    it('should return solar term quote when applicable', () => {
      const dateInfo: CalendarDateInfo = {
        gregorian: { year: 2024, month: 2, day: 4, monthName: '二月', dayName: '四日' },
        lunar: { year: 2024, month: 1, day: 25, monthName: '正月', dayName: '廿五', zodiac: '龙' },
        weekday: { index: 0, name: '星期日', shortName: '周日', englishName: 'Sunday' },
        special: { isHoliday: false, isSolarTerm: true, solarTermName: '立春', constellation: '水瓶座' },
      };

      const quote = selectDailyQuote(dateInfo, 'nature');

      expect(quote).toBeDefined();
      // Should prefer solar term related quotes
      expect(quote.category).toBe('solar-term');
    });

    it('should return holiday quote when applicable', () => {
      const dateInfo: CalendarDateInfo = {
        gregorian: { year: 2024, month: 2, day: 10, monthName: '二月', dayName: '十日' },
        lunar: { year: 2024, month: 1, day: 1, monthName: '正月', dayName: '初一', zodiac: '龙' },
        weekday: { index: 6, name: '星期六', shortName: '周六', englishName: 'Saturday' },
        special: { isHoliday: true, holidayName: '春节', isSolarTerm: false, constellation: '水瓶座' },
      };

      const quote = selectDailyQuote(dateInfo, 'art');

      expect(quote).toBeDefined();
      expect(quote.category).toBe('holiday');
    });

    it('should avoid recent quotes', () => {
      const dateInfo: CalendarDateInfo = {
        gregorian: { year: 2024, month: 3, day: 15, monthName: '三月', dayName: '十五日' },
        lunar: { year: 2024, month: 2, day: 6, monthName: '二月', dayName: '初六', zodiac: '龙' },
        weekday: { index: 4, name: '星期五', shortName: '周五', englishName: 'Friday' },
        special: { isHoliday: false, isSolarTerm: false, constellation: '双鱼座' },
      };

      const quote1 = selectDailyQuote(dateInfo, 'minimal');
      const quote2 = selectDailyQuote(dateInfo, 'minimal');

      // Should return different quotes to avoid repetition
      expect(quote1.id).not.toBe(quote2.id);
    });
  });

  describe('getQuoteById', () => {
    it('should return quote by id', () => {
      const quote = getQuoteById('poetry-001');
      expect(quote).toBeDefined();
      expect(quote?.id).toBe('poetry-001');
    });

    it('should return undefined for non-existent id', () => {
      const quote = getQuoteById('non-existent');
      expect(quote).toBeUndefined();
    });
  });

  describe('getAllQuotes', () => {
    it('should return all quotes', () => {
      const quotes = getAllQuotes();
      expect(quotes.length).toBeGreaterThan(0);
    });
  });

  describe('getQuotesByCategory', () => {
    it('should return quotes by category', () => {
      const poetryQuotes = getQuotesByCategory('poetry');
      expect(poetryQuotes.length).toBeGreaterThan(0);
      expect(poetryQuotes.every(q => q.category === 'poetry')).toBe(true);
    });
  });

  describe('addCustomQuote', () => {
    it('should add custom quote', () => {
      const customQuote = {
        id: 'custom-001',
        text: '自定义文案',
        category: 'general' as const,
        themes: ['minimal' as const],
      };

      addCustomQuote(customQuote);

      const retrieved = getQuoteById('custom-001');
      expect(retrieved).toBeDefined();
      expect(retrieved?.text).toBe('自定义文案');
    });
  });

  describe('generatePromptQuote', () => {
    it('should generate prompt with quote and date info', () => {
      const dateInfo: CalendarDateInfo = {
        gregorian: { year: 2024, month: 3, day: 15, monthName: '三月', dayName: '十五日' },
        lunar: { year: 2024, month: 2, day: 6, monthName: '二月', dayName: '初六', zodiac: '龙' },
        weekday: { index: 4, name: '星期五', shortName: '周五', englishName: 'Friday' },
        special: { isHoliday: false, isSolarTerm: false, constellation: '双鱼座' },
      };

      const quote = selectDailyQuote(dateInfo, 'vintage');
      const prompt = generatePromptQuote(quote, dateInfo, 'vintage');

      expect(prompt).toContain(quote.text);
      expect(prompt).toContain('vintage');
    });
  });
});
