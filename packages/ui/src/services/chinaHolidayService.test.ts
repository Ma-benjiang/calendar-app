import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChinaHolidayYear,
  clearChinaHolidayMemoryCache,
  getChinaHoliday,
  syncChinaHolidayYear,
  validateChinaHolidayYear,
} from './chinaHolidayService';
import { getCalendarDateInfo } from '../daily-calendar/utils/dateUtils';

const HOLIDAYS_2026: ChinaHolidayYear = {
  year: 2026,
  papers: ['https://www.gov.cn/example'],
  days: [
    { name: '春节', date: '2026-02-17', isOffDay: true },
    { name: '春节', date: '2026-02-28', isOffDay: false },
  ],
};

describe('chinaHolidayService', () => {
  beforeEach(() => {
    clearChinaHolidayMemoryCache();
    localStorage.clear();
  });

  afterEach(() => {
    delete (window as unknown as { calendarDesktop?: unknown }).calendarDesktop;
    vi.restoreAllMocks();
  });

  it('validates the upstream year and day schema', () => {
    expect(validateChinaHolidayYear(HOLIDAYS_2026, 2026)).toEqual(HOLIDAYS_2026);
    expect(() => validateChinaHolidayYear({
      year: 2026,
      papers: [],
      days: [{ name: '春节', date: 'invalid', isOffDay: true }],
    }, 2026)).toThrow('数据格式无效');
  });

  it('syncs through the desktop bridge and caches holiday data', async () => {
    const fetchYear = vi.fn().mockResolvedValue(HOLIDAYS_2026);
    (window as unknown as {
      calendarDesktop: { holidays: { fetchYear: typeof fetchYear } };
    }).calendarDesktop = { holidays: { fetchYear } };

    await syncChinaHolidayYear(2026, true);

    expect(fetchYear).toHaveBeenCalledWith(2026);
    expect(getChinaHoliday('2026-02-17')).toMatchObject({
      name: '春节',
      isOffDay: true,
    });
    expect(getCalendarDateInfo(new Date(2026, 1, 28)).special).toMatchObject({
      holidayName: '春节',
      isHoliday: false,
      isWorkdayAdjustment: true,
      holidayStatus: 'workday',
    });
    expect(localStorage.getItem('china-holidays:2026')).toContain('"year":2026');
  });

  it('keeps the last successful cache when refresh fails', async () => {
    const fetchYear = vi.fn()
      .mockResolvedValueOnce(HOLIDAYS_2026)
      .mockRejectedValueOnce(new Error('offline'));
    (window as unknown as {
      calendarDesktop: { holidays: { fetchYear: typeof fetchYear } };
    }).calendarDesktop = { holidays: { fetchYear } };

    await syncChinaHolidayYear(2026, true);
    clearChinaHolidayMemoryCache();
    await expect(syncChinaHolidayYear(2026, true)).resolves.toMatchObject({
      data: { year: 2026 },
    });

    expect(getChinaHoliday('2026-02-28')).toMatchObject({
      name: '春节',
      isOffDay: false,
    });
  });

  it('does not request again while the yearly cache is fresh', async () => {
    const fetchYear = vi.fn().mockResolvedValue(HOLIDAYS_2026);
    (window as unknown as {
      calendarDesktop: { holidays: { fetchYear: typeof fetchYear } };
    }).calendarDesktop = { holidays: { fetchYear } };

    await syncChinaHolidayYear(2026, true);
    clearChinaHolidayMemoryCache();
    await syncChinaHolidayYear(2026);

    expect(fetchYear).toHaveBeenCalledTimes(1);
  });
});
