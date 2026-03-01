import React, { useState, useCallback } from 'react';
import { CalendarEvent } from '@calendar/core';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { EventForm } from './EventForm';
import { useCalendar } from './useCalendar';
import './CalendarApp.css';

type ViewType = 'month' | 'week' | 'day';

export const CalendarApp: React.FC = () => {
  const {
    events,
    currentDate,
    view,
    setView,
    addEvent,
    updateEvent,
    deleteEvent,
    goToToday,
    goToPrev,
    goToNext,
  } = useCalendar();

  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setEditingEvent(undefined);
    setShowEventForm(true);
  }, []);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setEditingEvent(event);
    setShowEventForm(true);
  }, []);

  const handleSaveEvent = useCallback((eventData: Omit<CalendarEvent, 'id'>) => {
    if (editingEvent) {
      updateEvent(editingEvent.id, eventData);
    } else {
      addEvent(eventData);
    }
    setShowEventForm(false);
    setEditingEvent(undefined);
  }, [editingEvent, addEvent, updateEvent]);

  const handleDeleteEvent = useCallback((id: string) => {
    deleteEvent(id);
    setShowEventForm(false);
    setEditingEvent(undefined);
  }, [deleteEvent]);

  const formatTitle = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    if (view === 'day') {
      return `${year}年${month}月${currentDate.getDate()}日`;
    }
    return `${year}年${month}月`;
  };

  return (
    <div className="calendar-app">
      <header className="calendar-header">
        <h1>📅 日历</h1>
        <div className="header-center">
          <button className="nav-btn" onClick={goToPrev}>◀</button>
          <span className="current-date">{formatTitle()}</span>
          <button className="nav-btn" onClick={goToNext}>▶</button>
          <button className="today-btn" onClick={goToToday}>今天</button>
        </div>
        <div className="view-switcher">
          {(['month', 'week', 'day'] as ViewType[]).map((v) => (
            <button
              key={v}
              className={`view-btn ${view === v ? 'active' : ''}`}
              onClick={() => setView(v)}
            >
              {v === 'month' ? '月' : v === 'week' ? '周' : '日'}
            </button>
          ))}
        </div>
      </header>

      <main className="calendar-main">
        {view === 'month' && (
          <MonthView
            year={currentDate.getFullYear()}
            month={currentDate.getMonth()}
            events={events}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
          />
        )}
        {view === 'week' && (
          <WeekView
            date={currentDate}
            events={events}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
          />
        )}
        {view === 'day' && (
          <DayView
            date={currentDate}
            events={events}
            onTimeClick={handleDateClick}
            onEventClick={handleEventClick}
          />
        )}
      </main>

      {showEventForm && (
        <div className="modal-overlay" onClick={() => setShowEventForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <EventForm
              event={editingEvent}
              initialDate={selectedDate}
              onSave={handleSaveEvent}
              onCancel={() => {
                setShowEventForm(false);
                setEditingEvent(undefined);
              }}
              onDelete={editingEvent ? handleDeleteEvent : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
};
