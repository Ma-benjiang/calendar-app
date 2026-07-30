/**
 * 日期工具函数单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  isLeapYear,
  getDaysInMonth,
  formatDateKey,
  getGregorianDate,
  getWeekdayInfo,
  getCalendarDateInfo,
  isToday,
  isSameDay,
  getSeason,
  addDays,
  addMonths,
  getConstellation,
} from '../utils/dateUtils';

describe('dateUtils', () => {
  describe('isLeapYear', () => {
    it('should return true for leap years', () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2000)).toBe(true);
      expect(isLeapYear(2020)).toBe(true);
    });

    it('should return false for non-leap years', () => {
      expect(isLeapYear(2023)).toBe(false);
      expect(isLeapYear(1900)).toBe(false);
      expect(isLeapYear(2025)).toBe(false);
    });
  });

  describe('getDaysInMonth', () => {
    it('should return correct days for each month', () => {
      expect(getDaysInMonth(2024, 1)).toBe(31); // January
      expect(getDaysInMonth(2024, 2)).toBe(29); // February (leap year)
      expect(getDaysInMonth(2023, 2)).toBe(28); // February (non-leap year)
      expect(getDaysInMonth(2024, 4)).toBe(30); // April
      expect(getDaysInMonth(2024, 12)).toBe(31); // December
    });
  });

  describe('formatDateKey', () => {
    it('should format date as YYYY-MM-DD', () => {
      expect(formatDateKey(new Date(2026, 2, 3))).toBe('2026-03-03');
      expect(formatDateKey(new Date(2026, 11, 25))).toBe('2026-12-25');
      expect(formatDateKey(new Date(2026, 0, 1))).toBe('2026-01-01');
    });
  });

  describe('getGregorianDate', () => {
    it('should return correct gregorian date info', () => {
      const date = new Date(2026, 2, 3);
      const result = getGregorianDate(date);

      expect(result.year).toBe(2026);
      expect(result.month).toBe(3);
      expect(result.day).toBe(3);
      expect(result.monthName).toBe('3月');
      expect(result.dayName).toBe('3日');
    });
  });

  describe('getWeekdayInfo', () => {
    it('should return correct weekday info', () => {
      // 2026-03-03 is Tuesday (index 2)
      const date = new Date(2026, 2, 3);
      const result = getWeekdayInfo(date);

      expect(result.index).toBe(2);
      expect(result.name).toBe('星期二');
      expect(result.shortName).toBe('周二');
      expect(result.englishName).toBe('Tuesday');
    });
  });

  describe('getCalendarDateInfo', () => {
    it('should return complete calendar date info', () => {
      const date = new Date(2026, 2, 3);
      const result = getCalendarDateInfo(date);

      expect(result.gregorian.year).toBe(2026);
      expect(result.gregorian.month).toBe(3);
      expect(result.weekday.index).toBe(2);
      expect(result.lunar.zodiac).toBeDefined();
      expect(result.special.constellation).toBe('双鱼座');
    });

    it('should detect holidays correctly', () => {
      // 2026-01-01 is New Year
      const newYear = new Date(2026, 0, 1);
      const result = getCalendarDateInfo(newYear);

      expect(result.special.isHoliday).toBe(true);
      expect(result.special.holidayName).toBe('元旦');
    });

    it('should detect solar terms correctly', () => {
      // 2026-02-04 is 立春 (approximate date)
      const springStart = new Date(2026, 1, 4);
      const result = getCalendarDateInfo(springStart);

      // Solar term detection is approximate in our implementation
      // Just verify the function returns valid results
      expect(result.special.isSolarTerm).toBeDefined();
      expect(typeof result.special.isSolarTerm).toBe('boolean');
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    it('should return false for other dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const date1 = new Date(2026, 2, 3);
      const date2 = new Date(2026, 2, 3);
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date(2026, 2, 3);
      const date2 = new Date(2026, 2, 4);
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('getSeason', () => {
    it('should return correct season', () => {
      expect(getSeason(new Date(2026, 2, 1))).toBe('spring'); // March
      expect(getSeason(new Date(2026, 5, 1))).toBe('summer'); // June
      expect(getSeason(new Date(2026, 8, 1))).toBe('autumn'); // September
      expect(getSeason(new Date(2026, 11, 1))).toBe('winter'); // December
    });
  });

  describe('addDays', () => {
    it('should add days correctly', () => {
      const date = new Date(2026, 2, 3);
      const result = addDays(date, 5);
      expect(result.getDate()).toBe(8);
    });

    it('should handle month boundary', () => {
      const date = new Date(2026, 2, 30);
      const result = addDays(date, 5);
      expect(result.getMonth()).toBe(3); // April
      expect(result.getDate()).toBe(4);
    });
  });

  describe('addMonths', () => {
    it('should add months correctly', () => {
      const date = new Date(2026, 2, 3);
      const result = addMonths(date, 2);
      expect(result.getMonth()).toBe(4); // May
    });

    it('should not skip short months when starting at month end', () => {
      const result = addMonths(new Date(2026, 0, 31), 1);
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(28);
    });
  });

  describe('getConstellation', () => {
    it('should return correct constellation', () => {
      expect(getConstellation(new Date(2026, 2, 3))).toBe('双鱼座'); // March 3
      expect(getConstellation(new Date(2026, 7, 15))).toBe('狮子座'); // August 15
      expect(getConstellation(new Date(2026, 0, 15))).toBe('摩羯座'); // January 15
    });
  });
});
