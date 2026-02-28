import { describe, it, expect } from 'vitest';
import { CalendarCore } from '../src/calendar';

describe('CalendarCore', () => {
  describe('getDaysInMonth', () => {
    it('should return correct days for regular month', () => {
      expect(CalendarCore.getDaysInMonth(2024, 0)).toBe(31); // January
      expect(CalendarCore.getDaysInMonth(2024, 1)).toBe(29); // February (leap year)
      expect(CalendarCore.getDaysInMonth(2024, 3)).toBe(30); // April
    });

    it('should return correct days for non-leap year February', () => {
      expect(CalendarCore.getDaysInMonth(2023, 1)).toBe(28);
    });
  });

  describe('generateMonthView', () => {
    it('should generate 42 days for month view', () => {
      const days = CalendarCore.generateMonthView(2024, 0);
      expect(days.length).toBe(42);
    });

    it('should include days from previous and next month', () => {
      const days = CalendarCore.generateMonthView(2024, 0);
      const januaryDays = days.filter(d => d.getMonth() === 0);
      expect(januaryDays.length).toBe(31);
    });
  });

  describe('generateWeekView', () => {
    it('should generate 7 days for week view', () => {
      const days = CalendarCore.generateWeekView(new Date(2024, 0, 15));
      expect(days.length).toBe(7);
    });

    it('should start from Sunday', () => {
      const days = CalendarCore.generateWeekView(new Date(2024, 0, 15));
      expect(days[0].getDay()).toBe(0); // Sunday
    });
  });

  describe('isEventOnDate', () => {
    it('should return true for event on same day', () => {
      const event = {
        id: '1',
        title: 'Test',
        startDate: new Date(2024, 0, 15, 10, 0),
        endDate: new Date(2024, 0, 15, 11, 0)
      };
      expect(CalendarCore.isEventOnDate(event, new Date(2024, 0, 15))).toBe(true);
    });

    it('should return true for multi-day event', () => {
      const event = {
        id: '1',
        title: 'Test',
        startDate: new Date(2024, 0, 14),
        endDate: new Date(2024, 0, 16)
      };
      expect(CalendarCore.isEventOnDate(event, new Date(2024, 0, 15))).toBe(true);
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date(2024, 0, 15, 10, 30);
      expect(CalendarCore.formatDate(date, 'YYYY-MM-DD')).toBe('2024-01-15');
      expect(CalendarCore.formatDate(date, 'HH:mm')).toBe('10:30');
    });
  });
});
