import React from 'react';
import { CalendarCore, CalendarEvent } from '@calendar/core';

interface WeekViewProps {
  date: Date;
  events: CalendarEvent[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  date,
  events,
  onDateClick,
  onEventClick,
}) => {
  const weekDays = CalendarCore.generateWeekView(date);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForHour = (dayDate: Date, hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      return (
        CalendarCore.isEventOnDate(event, dayDate) &&
        eventStart.getHours() <= hour &&
        new Date(event.endDate).getHours() > hour
      );
    });
  };

  return (
    <div className="week-view">
      <div className="week-header">
        {weekDays.map((day, index) => (
          <div key={index} className="week-day-header">
            <div className="day-name">{['日', '一', '二', '三', '四', '五', '六'][day.getDay()]}</div>
            <div className="day-number">{day.getDate()}</div>
          </div>
        ))}
      </div>
      <div className="week-grid">
        {hours.map(hour => (
          <div key={hour} className="hour-row">
            <div className="hour-label">{`${hour.toString().padStart(2, '0')}:00`}</div>
            {weekDays.map((day, dayIndex) => {
              const hourEvents = getEventsForHour(day, hour);
              return (
                <div
                  key={dayIndex}
                  className="hour-cell"
                  onClick={() => {
                    const clickedDate = new Date(day);
                    clickedDate.setHours(hour);
                    onDateClick?.(clickedDate);
                  }}
                >
                  {hourEvents.map(event => (
                    <div
                      key={event.id}
                      className="week-event"
                      style={{ backgroundColor: event.color || '#3b82f6' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
