import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDailyCalendar } from '../hooks/useDailyCalendar';
import { captionAIService } from '../services/captionAIService';
import { seedreamService } from '../services/seedreamService';
import { GeneratedImage } from '../types';

function createImage(url: string): GeneratedImage {
  return {
    id: url,
    url,
    metadata: {
      generatedAt: new Date(),
      prompt: '无文字背景图',
      theme: 'vintage',
      size: '2K',
      quality: 'standard',
    },
  };
}

describe('useDailyCalendar generation rules', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 6, 30, 12));
    vi.spyOn(captionAIService, 'generateCreativePlan').mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('rejects generation for historical and future dates', async () => {
    const generateImage = vi.spyOn(seedreamService, 'generateImage');
    const { result } = renderHook(() => useDailyCalendar());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.generateCalendar(new Date(2026, 6, 29));
    });
    expect(result.current.error?.message).toBe('只能生成今天的台历');

    await act(async () => {
      await result.current.generateCalendar(new Date(2026, 6, 31));
    });
    expect(result.current.error?.message).toBe('只能生成今天的台历');
    expect(generateImage).not.toHaveBeenCalled();
  });

  it('replaces todays record instead of creating history duplicates', async () => {
    vi.spyOn(seedreamService, 'generateImage')
      .mockResolvedValueOnce(createImage('data:image/png;base64,Zmlyc3Q='))
      .mockResolvedValueOnce(createImage('data:image/png;base64,c2Vjb25k'));
    const { result } = renderHook(() => useDailyCalendar());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.generateCalendar(new Date(2026, 6, 30));
    });
    const firstRecord = result.current.records['2026-07-30'];

    await act(async () => {
      await result.current.generateCalendar(new Date(2026, 6, 30));
    });
    const replacement = result.current.records['2026-07-30'];

    expect(Object.keys(result.current.records)).toEqual(['2026-07-30']);
    expect(replacement.id).toBe(firstRecord.id);
    expect(replacement.createdAt).toEqual(firstRecord.createdAt);
    expect(replacement.image.url).toBe('data:image/png;base64,c2Vjb25k');
  });

  it('rejects navigation to future dates', async () => {
    const { result } = renderHook(() => useDailyCalendar());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.changeDate(new Date(2026, 6, 31)));

    expect(result.current.currentDate.getDate()).toBe(30);
    expect(result.current.error?.message).toBe('不能查看或生成未来日期的台历');
  });

  it('keeps historical dates read-only', async () => {
    const generateImage = vi.spyOn(seedreamService, 'generateImage');
    const { result } = renderHook(() => useDailyCalendar());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.changeDate(new Date(2026, 6, 29)));
    await act(async () => {
      await result.current.regenerateCalendar();
    });

    expect(result.current.error?.message).toBe('历史台历仅支持查看，不能重新生成');
    expect(generateImage).not.toHaveBeenCalled();
  });

  it('saves a manual theme without generating and uses it on the next capture', async () => {
    const generateImage = vi.spyOn(seedreamService, 'generateImage')
      .mockResolvedValue(createImage('data:image/png;base64,bWFudWFs'));
    const { result } = renderHook(() => useDailyCalendar());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.themeStrategy).toBe('daily-random');
    act(() => result.current.setThemeStrategy('manual', 'cosmic'));

    await waitFor(() => {
      expect(result.current.themeStrategy).toBe('manual');
      expect(result.current.currentTheme).toBe('cosmic');
    });
    expect(generateImage).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.generateCalendar(new Date(2026, 6, 30));
    });

    expect(generateImage).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'cosmic' }),
      expect.any(Object)
    );
  });
});
