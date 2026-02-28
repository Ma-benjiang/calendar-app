import React, { useState, useCallback } from 'react';
import { CalendarCore, CalendarEvent } from '@calendar/core';

interface MonthViewProps {
  year: number;
  month: number;
  events: CalendarEvent[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  year,
  month,
  events,
  onDateClick,
  onEventClick,
}) => {
  const days = CalendarCore.generateMonthView(year, month);
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const getEventsForDay = useCallback((date: Date) => {
    return events.filter(event => CalendarCore.isEventOnDate(event, date));
  }, [events]);

  return (
    <div className="month-view">
      <div className="week-header">
        {weekDays.map(day => (
          <div key={day} className="week-day-header">{day}</div>
        ))}
      </div>
      <div className="days-grid">
        {days.map((date, index) => {
          const dayEvents = getEventsForDay(date);
          const isCurrentMonth = date.getMonth() === month;
          
          return (
            <div
              key={index}
              className={`day-cell ${!isCurrentMonth ? 'other-month' : ''}`}
              onClick={() => onDateClick?.(date)}
            >
              <span className="day-number">{date.getDate()}</span>
              <div className="day-events">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className="event-dot"
                    style={{ backgroundColor: event.color || '#3b82f6' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                    title={event.title}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <span className="more-events">+{dayEvents.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
