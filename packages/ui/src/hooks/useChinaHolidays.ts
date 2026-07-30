import { useEffect, useState } from 'react';
import {
  getChinaHolidayLastSyncedAt,
  subscribeChinaHolidays,
  syncChinaHolidayYear,
  syncChinaHolidayYears,
} from '../services/chinaHolidayService';

export function useChinaHolidays(years: number[]) {
  const primaryYear = years[0];
  const yearsKey = [...new Set(years)].sort((a, b) => a - b).join(',');
  const [revision, setRevision] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => subscribeChinaHolidays(() => {
    setRevision((value) => value + 1);
  }), []);

  useEffect(() => {
    let active = true;
    const targetYears = yearsKey.split(',').filter(Boolean).map(Number);
    const adjacentYears = targetYears.filter((year) => year !== primaryYear);

    setIsSyncing(true);
    syncChinaHolidayYear(primaryYear)
      .then(async () => {
        if (adjacentYears.length > 0) {
          await syncChinaHolidayYears(adjacentYears).catch(() => undefined);
        }
        if (active) setError(null);
      })
      .catch((syncError: unknown) => {
        if (active) {
          setError(syncError instanceof Error ? syncError : new Error('节假日同步失败'));
        }
      })
      .finally(() => {
        if (active) setIsSyncing(false);
      });

    return () => {
      active = false;
    };
  }, [primaryYear, yearsKey]);

  return {
    revision,
    isSyncing,
    error,
    lastSyncedAt: Number.isInteger(primaryYear)
      ? getChinaHolidayLastSyncedAt(primaryYear)
      : null,
  };
}
