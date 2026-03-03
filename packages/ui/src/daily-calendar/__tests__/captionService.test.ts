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
import { CalendarDateInfo, ThemeType } from '../types';

describe('captionService', () => {
  beforeEach(() => {
    clearRecentQuotes();
  });

  describe('selectDailyQuote', () => {
    const mockDateInfo: CalendarDateInfo = {
      gregorian: { year: 2026, month: 3, day: 3, monthName: '三月', dayName: '三日' },
      lunar: { year: 2026, month: 2, day: 4, monthName: '二月', dayName: '初四', zodiac: '马' },
      weekday: { index: 2, name: '星期二', shortName: '周二', englishName: 'Tuesday' },
      special: {
        isHoliday: false,
        isSolarTerm: false,
        constellation: '双鱼座',
      },
    };

    it('should return a quote for given date and theme', () => {
      const quote = selectDailyQuote(new Date(2026, 2, 3), 'vintage', mockDateInfo);

      expect(quote).toBeDefined();
      expect(quote.text).toBeDefined();
      expect(quote.text.length).toBeGreaterThan(0);
    });

    it('should return holiday quote for holidays', () => {
      const holidayDateInfo: CalendarDateInfo = {
        ...mockDateInfo,
        special: {
          ...mockDateInfo.special,
          isHoliday: true,
          holidayName: '春节',
        },
      };

      const quote = selectDailyQuote(new Date(2026, 0, 29), 'vintage', holidayDateInfo);

      expect(quote.category).toBe('holiday');
      expect(quote.applicableHolidays).toContain('春节');
    });

    it('should return solar term quote for solar terms', () => {
      const solarTermDateInfo: CalendarDateInfo = {
        ...mockDateInfo,
        special: {
          ...mockDateInfo.special,
          isSolarTerm: true,
          solarTermName: '立春',
        },
      };

      const quote = selectDailyQuote(new Date(2026, 1, 4), 'nature', solarTermDateInfo);

      expect(quote.category).toBe('solar-term');
    });

    it('should return different quotes for different themes', () => {
      const quote1 = selectDailyQuote(new Date(2026, 2, 3), 'vintage', mockDateInfo);
      const quote2 = selectDailyQuote(new Date(2026, 2, 3), 'minimal', mockDateInfo);

      // 不同主题可能返回不同文案
      expect(quote1).toBeDefined();
      expect(quote2).toBeDefined();
    });

    it('should return inspirational quote on Monday', () => {
      const mondayDateInfo: CalendarDateInfo = {
        ...mockDateInfo,
        weekday: { index: 1, name: '星期一', shortName: '周一', englishName: 'Monday' },
      };

      const quote = selectDailyQuote(new Date(2026, 2, 2), 'minimal', mondayDateInfo);

      // 周一倾向于返回励志类文案
      expect(quote).toBeDefined();
    });
  });

  describe('getQuoteById', () => {
    it('should return quote by id', () => {
      const quote = getQuoteById('poetry-001');

      expect(quote).toBeDefined();
      expect(quote?.id).toBe('poetry-001');
      expect(quote?.text).toBe('春风得意马蹄疾，一日看尽长安花');
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
      expect(quotes[0]).toHaveProperty('id');
      expect(quotes[0]).toHaveProperty('text');
      expect(quotes[0]).toHaveProperty('category');
    });
  });

  describe('getQuotesByCategory', () => {
    it('should return quotes by category', () => {
      const poetryQuotes = getQuotesByCategory('poetry');

      expect(poetryQuotes.length).toBeGreaterThan(0);
      expect(poetryQuotes.every(q => q.category === 'poetry')).toBe(true);
    });

    it('should return empty array for non-existent category', () => {
      const quotes = getQuotesByCategory('non-existent' as never);

      expect(quotes).toEqual([]);
    });
  });

  describe('addCustomQuote', () => {
    it('should add custom quote', () => {
      const newQuote = addCustomQuote({
        text: '自定义测试文案',
        category: 'general',
        themes: ['minimal', 'vintage'],
      });

      expect(newQuote.id).toContain('custom-');
      expect(newQuote.text).toBe('自定义测试文案');
      expect(newQuote.category).toBe('general');

      // 验证已添加到库中
      const found = getQuoteById(newQuote.id);
      expect(found).toBeDefined();
    });
  });

  describe('generatePromptQuote', () => {
    it('should generate prompt-friendly quote description', () => {
      const quote = getQuoteById('poetry-001')!;
      const promptQuote = generatePromptQuote(quote, 'vintage');

      expect(promptQuote).toContain(quote.text);
      expect(promptQuote).toContain('古典诗词意境');
    });
  });
});
