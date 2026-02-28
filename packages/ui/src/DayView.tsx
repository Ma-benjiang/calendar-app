import React from 'react';
import { CalendarEvent } from '@calendar/core';

interface DayViewProps {
  date: Date;
  events: CalendarEvent[];
  onTimeClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

export const DayView: React.FC<DayViewProps> = ({
  date,
  events,
  onTimeClick,
  onEventClick,
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForHour = (hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      return eventStart.getHours() === hour;
    });
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <div className="day-view">
      <div className="day-header">
        <h2>{formatDate(date)}</h2>
      </div>
      <div className="day-timeline">
        {hours.map(hour => {
          const hourEvents = getEventsForHour(hour);
          return (
            <div key={hour} className="day-hour-row">
              <div className="day-hour-label">{`${hour.toString().padStart(2, '0')}:00`}</div>
              <div
                className="day-hour-content"
                onClick={() => {
                  const clickedDate = new Date(date);
                  clickedDate.setHours(hour);
                  onTimeClick?.(clickedDate);
                }}
              >
                {hourEvents.map(event => (
                  <div
                    key={event.id}
                    className="day-event"
                    style={{ backgroundColor: event.color || '#3b82f6' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                  >
                    <div className="event-time">
                      {new Date(event.startDate).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="event-title">{event.title}</div>
                    {event.description && (
                      <div className="event-desc">{event.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
