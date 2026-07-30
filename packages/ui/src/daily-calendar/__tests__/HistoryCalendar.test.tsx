import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HistoryCalendar } from '../components/HistoryCalendar';
import { DailyCalendarRecord } from '../types';

function createRecord(date: string): DailyCalendarRecord {
  return {
    id: `record-${date}`,
    date,
    dateInfo: {
      gregorian: {
        year: 2026,
        month: 7,
        day: 30,
        monthName: '7月',
        dayName: '30日',
      },
      lunar: {
        year: 2026,
        month: 6,
        day: 17,
        monthName: '六月',
        dayName: '十七',
        zodiac: '马',
      },
      weekday: {
        index: 4,
        name: '星期四',
        shortName: '周四',
        englishName: 'Thursday',
      },
      special: {
        isHoliday: false,
        isSolarTerm: false,
        constellation: '狮子座',
      },
    },
    theme: 'vintage',
    quote: {
      id: 'quote',
      text: '今日有光',
      category: 'general',
      themes: ['vintage'],
    },
    image: {
      id: 'image',
      url: 'calendar-image://local/test.png',
      metadata: {
        generatedAt: new Date(2026, 6, 30),
        prompt: 'test',
        theme: 'vintage',
        size: '2K',
        quality: 'standard',
      },
    },
    createdAt: new Date(2026, 6, 30),
    updatedAt: new Date(2026, 6, 30),
  };
}

describe('HistoryCalendar', () => {
  it('only allows generated dates to be selected', () => {
    const onSelectDate = vi.fn();
    render(
      <HistoryCalendar
        isOpen
        records={{ '2026-07-30': createRecord('2026-07-30') }}
        currentMonth={new Date(2026, 6, 1)}
        selectedDate="2026-07-30"
        onMonthChange={vi.fn()}
        onSelectDate={onSelectDate}
        onClose={vi.fn()}
      />
    );

    const generatedDate = screen.getByRole('button', {
      name: '2026-07-30，有记录',
    }) as HTMLButtonElement;
    const emptyDate = screen.getByRole('button', {
      name: '2026-07-29，无记录',
    }) as HTMLButtonElement;

    expect(generatedDate.disabled).toBe(false);
    expect(generatedDate.className).toContain('ring-2');
    expect(emptyDate.disabled).toBe(true);
    fireEvent.click(generatedDate);
    expect(onSelectDate).toHaveBeenCalledWith('2026-07-30');
  });

  it('moves from a month-end date without skipping the next month', () => {
    const onMonthChange = vi.fn();
    render(
      <HistoryCalendar
        isOpen
        records={{}}
        currentMonth={new Date(2026, 0, 31)}
        onMonthChange={onMonthChange}
        onSelectDate={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '下个月' }));
    const nextMonth = onMonthChange.mock.calls[0][0] as Date;
    expect(nextMonth.getMonth()).toBe(1);
    expect(nextMonth.getDate()).toBe(28);
  });
});
