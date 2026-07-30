import { getStorageAdapter } from '@calendar/storage';

const CACHE_VERSION = 1;
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RAW_SOURCE = 'https://raw.githubusercontent.com/NateScarlet/holiday-cn/master';
const CDN_SOURCE = 'https://fastly.jsdelivr.net/gh/NateScarlet/holiday-cn@master';

export interface ChinaHolidayDay {
  name: string;
  date: string;
  isOffDay: boolean;
}

export interface ChinaHolidayYear {
  year: number;
  papers: string[];
  days: ChinaHolidayDay[];
}

interface CachedHolidayYear {
  version: number;
  syncedAt: string;
  data: ChinaHolidayYear;
}

interface HolidayDesktopBridge {
  fetchYear(year: number): Promise<ChinaHolidayYear>;
}

const holidayYears = new Map<number, CachedHolidayYear>();
const inFlight = new Map<number, Promise<CachedHolidayYear>>();
const listeners = new Set<() => void>();

function getCacheKey(year: number): string {
  return `china-holidays:${year}`;
}

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

function setHolidayYear(cached: CachedHolidayYear): void {
  holidayYears.set(cached.data.year, cached);
  notifyListeners();
}

export function validateChinaHolidayYear(
  data: unknown,
  expectedYear: number
): ChinaHolidayYear {
  const candidate = data as Partial<ChinaHolidayYear> | null;
  if (
    !candidate ||
    candidate.year !== expectedYear ||
    !Array.isArray(candidate.papers) ||
    !Array.isArray(candidate.days) ||
    candidate.days.some((day) => (
      typeof day?.name !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(day?.date) ||
      typeof day?.isOffDay !== 'boolean'
    ))
  ) {
    throw new Error(`中国节假日数据格式无效：${expectedYear}`);
  }

  return candidate as ChinaHolidayYear;
}

function parseCachedHolidayYear(value: string, year: number): CachedHolidayYear {
  const cached = JSON.parse(value) as CachedHolidayYear;
  if (
    cached.version !== CACHE_VERSION ||
    Number.isNaN(Date.parse(cached.syncedAt))
  ) {
    throw new Error(`中国节假日缓存格式无效：${year}`);
  }

  return {
    ...cached,
    data: validateChinaHolidayYear(cached.data, year),
  };
}

function isFresh(cached: CachedHolidayYear): boolean {
  return Date.now() - Date.parse(cached.syncedAt) < CACHE_TTL_MS;
}

async function fetchHolidayYearInBrowser(year: number): Promise<ChinaHolidayYear> {
  let lastError: unknown;

  for (const baseURL of [RAW_SOURCE, CDN_SOURCE]) {
    try {
      const response = await fetch(`${baseURL}/${year}.json`);
      if (!response.ok) {
        throw new Error(`Holiday source returned ${response.status}`);
      }
      return validateChinaHolidayYear(await response.json(), year);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`无法同步 ${year} 年中国节假日`);
}

async function fetchHolidayYear(year: number): Promise<ChinaHolidayYear> {
  const bridge = typeof window !== 'undefined'
    ? (window as unknown as {
        calendarDesktop?: { holidays?: HolidayDesktopBridge };
      }).calendarDesktop?.holidays
    : undefined;

  const data = bridge
    ? await bridge.fetchYear(year)
    : await fetchHolidayYearInBrowser(year);

  return validateChinaHolidayYear(data, year);
}

export async function syncChinaHolidayYear(
  year: number,
  force = false
): Promise<CachedHolidayYear> {
  const existingRequest = inFlight.get(year);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    const adapter = getStorageAdapter();
    let cached = holidayYears.get(year);

    if (!cached) {
      const storedValue = await adapter.getItem(getCacheKey(year));
      if (storedValue) {
        try {
          cached = parseCachedHolidayYear(storedValue, year);
          setHolidayYear(cached);
        } catch {
          await adapter.removeItem(getCacheKey(year));
        }
      }
    }

    if (cached && !force && isFresh(cached)) {
      return cached;
    }

    try {
      const fresh: CachedHolidayYear = {
        version: CACHE_VERSION,
        syncedAt: new Date().toISOString(),
        data: await fetchHolidayYear(year),
      };
      await adapter.setItem(getCacheKey(year), JSON.stringify(fresh));
      setHolidayYear(fresh);
      return fresh;
    } catch (error) {
      if (cached) {
        return cached;
      }
      throw error;
    }
  })();

  inFlight.set(year, request);
  try {
    return await request;
  } finally {
    inFlight.delete(year);
  }
}

export async function syncChinaHolidayYears(
  years: number[],
  force = false
): Promise<CachedHolidayYear[]> {
  const uniqueYears = [...new Set(years)];
  const results = await Promise.allSettled(
    uniqueYears.map((year) => syncChinaHolidayYear(year, force))
  );
  const synced = results
    .filter((result): result is PromiseFulfilledResult<CachedHolidayYear> => (
      result.status === 'fulfilled'
    ))
    .map((result) => result.value);

  if (synced.length === 0) {
    const failed = results.find((result) => result.status === 'rejected');
    throw failed && failed.status === 'rejected'
      ? failed.reason
      : new Error('无法同步中国节假日');
  }

  return synced;
}

export function getChinaHoliday(date: Date | string): ChinaHolidayDay | undefined {
  const key = typeof date === 'string'
    ? date
    : [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-');
  const calendarYear = Number(key.slice(0, 4));

  // 次年公告可能修正当年 12 月安排，因此优先使用次年文件。
  for (const sourceYear of [calendarYear + 1, calendarYear]) {
    const holiday = holidayYears
      .get(sourceYear)
      ?.data.days.find((day) => day.date === key);
    if (holiday) return holiday;
  }

  return undefined;
}

export function getChinaHolidayLastSyncedAt(year: number): string | null {
  return holidayYears.get(year)?.syncedAt ?? null;
}

export function subscribeChinaHolidays(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearChinaHolidayMemoryCache(): void {
  holidayYears.clear();
  notifyListeners();
}
