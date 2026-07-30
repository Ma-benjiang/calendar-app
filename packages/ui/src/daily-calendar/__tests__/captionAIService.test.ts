import { afterEach, describe, expect, it, vi } from 'vitest';
import { captionAIService } from '../services/captionAIService';
import { CalendarDateInfo, LLMModelConfig } from '../types';

const dateInfo: CalendarDateInfo = {
  gregorian: {
    year: 2026,
    month: 10,
    day: 1,
    monthName: '十月',
    dayName: '一日',
  },
  lunar: {
    year: 2026,
    month: 8,
    day: 21,
    monthName: '八月',
    dayName: '廿一',
    zodiac: '马',
  },
  weekday: {
    index: 4,
    name: '星期四',
    shortName: '周四',
    englishName: 'Thursday',
  },
  special: {
    isHoliday: true,
    holidayName: '国庆节',
    holidayStatus: 'off',
    isSolarTerm: false,
    constellation: '天秤座',
  },
};

const config: LLMModelConfig = {
  provider: 'deepseek',
  apiEndpoint: 'https://api.deepseek.com/chat/completions',
  apiKey: 'deepseek-key',
  model: 'deepseek-v4-flash',
};

describe('captionAIService', () => {
  afterEach(() => {
    delete (window as unknown as { calendarDesktop?: unknown }).calendarDesktop;
    vi.restoreAllMocks();
  });

  it('should use the desktop AI SDK bridge for structured creative plans', async () => {
    const generateCalendarPlan = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        quote: '山河明朗，步履从容',
        imagePrompt: '清晨山河层叠展开，暖金色自然光掠过云海，克制庄重的东方摄影构图，无文字',
      },
    });
    (window as unknown as {
      calendarDesktop: {
        ai: { generateCalendarPlan: typeof generateCalendarPlan };
      };
    }).calendarDesktop = { ai: { generateCalendarPlan } };

    const result = await captionAIService.generateCreativePlan(
      new Date(2026, 9, 1),
      'nature',
      dateInfo,
      config
    );

    expect(generateCalendarPlan).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
      prompt: expect.stringContaining('国庆节'),
    }));
    expect(result?.quote.text).toBe('山河明朗，步履从容');
    expect(result?.imagePrompt).toContain('无文字');
  });

  it('should fall back locally when the configured model request fails', async () => {
    const generateCalendarPlan = vi.fn().mockResolvedValue({
      ok: false,
      error: 'quota exceeded',
    });
    (window as unknown as {
      calendarDesktop: {
        ai: { generateCalendarPlan: typeof generateCalendarPlan };
      };
    }).calendarDesktop = { ai: { generateCalendarPlan } };

    const result = await captionAIService.generateCreativePlan(
      new Date(2026, 9, 1),
      'nature',
      dateInfo,
      config
    );

    expect(result).toBeNull();
  });
});
