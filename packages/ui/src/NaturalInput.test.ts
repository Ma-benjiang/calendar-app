/**
 * Natural Language Input Parser Tests
 * TDD for natural language date/time parsing
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseNaturalInput } from './NaturalInput';

describe('NaturalInput Parser', () => {
  beforeEach(() => {
    // Set a fixed date for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-02T12:00:00')); // Monday
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Time expressions', () => {
    it('should parse "3pm" as 15:00', () => {
      const result = parseNaturalInput('3pm meeting');
      expect(result.hour).toBe(15);
      expect(result.minute).toBe(0);
    });

    it('should parse "下午3点" as 15:00', () => {
      const result = parseNaturalInput('下午3点开会');
      expect(result.hour).toBe(15);
      expect(result.minute).toBe(0);
    });

    it('should parse "15:30" as 15:30', () => {
      const result = parseNaturalInput('15:30 appointment');
      expect(result.hour).toBe(15);
      expect(result.minute).toBe(30);
    });

    it('should parse "晚上8点" as 20:00', () => {
      const result = parseNaturalInput('晚上8点吃饭');
      expect(result.hour).toBe(20);
      expect(result.minute).toBe(0);
    });

    it('should parse "上午10点半" as 10:30', () => {
      const result = parseNaturalInput('上午10点半会议');
      expect(result.hour).toBe(10);
      expect(result.minute).toBe(30);
    });
  });

  describe('Date expressions', () => {
    it('should parse "tomorrow" as next day', () => {
      const result = parseNaturalInput('tomorrow meeting');
      expect(result.date).toBe('2026-03-03');
    });

    it('should parse "明天" as next day', () => {
      const result = parseNaturalInput('明天开会');
      expect(result.date).toBe('2026-03-03');
    });

    it('should parse "today" as current day', () => {
      const result = parseNaturalInput('today meeting');
      expect(result.date).toBe('2026-03-02');
    });

    it('should parse "今天" as current day', () => {
      const result = parseNaturalInput('今天开会');
      expect(result.date).toBe('2026-03-02');
    });

    it('should parse "next Monday" correctly', () => {
      const result = parseNaturalInput('next Monday meeting');
      expect(result.date).toBe('2026-03-09'); // Next Monday from 2026-03-02
    });

    it('should parse "下周一" correctly', () => {
      const result = parseNaturalInput('下周一开会');
      expect(result.date).toBe('2026-03-09');
    });

    it('should parse specific date "March 15"', () => {
      const result = parseNaturalInput('March 15 meeting');
      expect(result.date).toBe('2026-03-15');
    });

    it('should parse specific date "3月15日"', () => {
      const result = parseNaturalInput('3月15日开会');
      expect(result.date).toBe('2026-03-15');
    });
  });

  describe('Relative time expressions', () => {
    it('should parse "in 2 hours" correctly', () => {
      const result = parseNaturalInput('meeting in 2 hours');
      expect(result.date).toBe('2026-03-02');
      expect(result.hour).toBe(14);
    });

    it('should parse "两小时后" correctly', () => {
      const result = parseNaturalInput('两小时后开会');
      expect(result.date).toBe('2026-03-02');
      expect(result.hour).toBe(14);
    });

    it('should parse "in 30 minutes" correctly', () => {
      const result = parseNaturalInput('meeting in 30 minutes');
      expect(result.date).toBe('2026-03-02');
      expect(result.hour).toBe(12);
      expect(result.minute).toBe(30);
    });

    it('should parse "半小时后" correctly', () => {
      const result = parseNaturalInput('半小时后开会');
      expect(result.date).toBe('2026-03-02');
      expect(result.hour).toBe(12);
      expect(result.minute).toBe(30);
    });
  });

  describe('Recurrence expressions', () => {
    it('should parse "every day"', () => {
      const result = parseNaturalInput('exercise every day');
      expect(result.recurrence).toBe('daily');
    });

    it('should parse "每天"', () => {
      const result = parseNaturalInput('每天锻炼');
      expect(result.recurrence).toBe('daily');
    });

    it('should parse "every week"', () => {
      const result = parseNaturalInput('meeting every week');
      expect(result.recurrence).toBe('weekly');
    });

    it('should parse "每周三"', () => {
      const result = parseNaturalInput('每周三开会');
      expect(result.recurrence).toBe('weekly');
      expect(result.dayOfWeek).toBe(3); // Wednesday
    });

    it('should parse "every month"', () => {
      const result = parseNaturalInput('review every month');
      expect(result.recurrence).toBe('monthly');
    });
  });

  describe('Location extraction', () => {
    it('should extract location with "at"', () => {
      const result = parseNaturalInput('meeting at Conference Room A');
      expect(result.location).toBe('Conference Room A');
    });

    it('should extract location with "在"', () => {
      const result = parseNaturalInput('在会议室A开会');
      expect(result.location).toBe('会议室A');
    });

    it('should extract location with "地点"', () => {
      const result = parseNaturalInput('开会 地点：办公室');
      expect(result.location).toBe('办公室');
    });
  });

  describe('Title extraction', () => {
    it('should extract title from simple input', () => {
      const result = parseNaturalInput('Team Meeting tomorrow at 3pm');
      expect(result.title).toBe('Team Meeting');
    });

    it('should extract Chinese title', () => {
      const result = parseNaturalInput('团队会议 明天下午3点');
      expect(result.title).toBe('团队会议');
    });

    it('should handle title with special characters', () => {
      const result = parseNaturalInput('Review Q1-2026 report tomorrow');
      expect(result.title).toBe('Review Q1-2026 report');
    });
  });

  describe('Duration extraction', () => {
    it('should parse "for 1 hour"', () => {
      const result = parseNaturalInput('meeting for 1 hour');
      expect(result.duration).toBe(60);
    });

    it('should parse "持续2小时"', () => {
      const result = parseNaturalInput('开会持续2小时');
      expect(result.duration).toBe(120);
    });

    it('should parse "30 minutes"', () => {
      const result = parseNaturalInput('call for 30 minutes');
      expect(result.duration).toBe(30);
    });
  });

  describe('Priority extraction', () => {
    it('should detect high priority', () => {
      const result = parseNaturalInput('urgent meeting tomorrow');
      expect(result.priority).toBe('high');
    });

    it('should detect high priority in Chinese', () => {
      const result = parseNaturalInput('紧急会议 明天');
      expect(result.priority).toBe('high');
    });

    it('should detect low priority', () => {
      const result = parseNaturalInput('optional review next week');
      expect(result.priority).toBe('low');
    });
  });

  describe('Complex expressions', () => {
    it('should parse complex input with multiple elements', () => {
      const result = parseNaturalInput('Team meeting tomorrow at 3pm in Conference Room A for 1 hour');

      expect(result.title).toBe('Team meeting');
      expect(result.date).toBe('2026-03-03');
      expect(result.hour).toBe(15);
      expect(result.location).toBe('Conference Room A');
      expect(result.duration).toBe(60);
    });

    it('should parse complex Chinese input', () => {
      const result = parseNaturalInput('明天下午3点在会议室A开团队会议，持续1小时');

      expect(result.title).toBe('开团队会议');
      expect(result.date).toBe('2026-03-03');
      expect(result.hour).toBe(15);
      expect(result.location).toBe('会议室A');
      expect(result.duration).toBe(60);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty input', () => {
      const result = parseNaturalInput('');
      expect(result.isValid).toBe(false);
    });

    it('should handle input with only time info', () => {
      const result = parseNaturalInput('3pm');
      expect(result.hour).toBe(15);
      expect(result.title).toBe('');
    });

    it('should handle ambiguous time expressions', () => {
      const result = parseNaturalInput('meeting at noon');
      expect(result.hour).toBe(12);
    });

    it('should handle "morning" as 9am', () => {
      const result = parseNaturalInput('meeting in the morning');
      expect(result.hour).toBe(9);
    });

    it('should handle "afternoon" as 2pm', () => {
      const result = parseNaturalInput('meeting in the afternoon');
      expect(result.hour).toBe(14);
    });

    it('should handle "evening" as 6pm', () => {
      const result = parseNaturalInput('meeting in the evening');
      expect(result.hour).toBe(18);
    });
  });

  describe('Validation', () => {
    it('should mark valid when required fields present', () => {
      const result = parseNaturalInput('meeting tomorrow at 3pm');
      expect(result.isValid).toBe(true);
    });

    it('should mark valid for title-only input with default date', () => {
      const result = parseNaturalInput('something something');
      expect(result.isValid).toBe(true);
      expect(result.title).toBe('something something');
      expect(result.date).toBe('2026-03-02'); // Default to today
    });

    it('should mark invalid for past dates', () => {
      const result = parseNaturalInput('meeting yesterday at 3pm');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('past');
    });
  });

  describe('Confidence scoring', () => {
    it('should return high confidence for clear expressions', () => {
      const result = parseNaturalInput('meeting tomorrow at 3:00 PM');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should return lower confidence for ambiguous expressions', () => {
      const result = parseNaturalInput('meeting sometime next week');
      expect(result.confidence).toBeLessThan(0.8);
    });
  });
});
