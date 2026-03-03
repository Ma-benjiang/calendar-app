import { useEffect, useState, useCallback, useMemo } from 'react';
import { CalendarEvent } from '@calendar/core';
import { EventManager } from '@calendar/core/events';
import { StorageManager, LocalStorageAdapter } from '@calendar/storage';

export const useCalendar = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  const eventManager = useMemo(() => new EventManager(), []);
  const storageManager = useMemo(() => new StorageManager(new LocalStorageAdapter()), []);

  // 加载事件
  useEffect(() => {
    const loadEvents = async () => {
      const saved = await storageManager.loadEvents();
      eventManager.loadFromStorage(saved);
      setEvents(saved);
    };
    loadEvents();

    // 订阅变更
    const unsubscribe = eventManager.subscribe((updatedEvents) => {
      setEvents(updatedEvents);
      storageManager.saveEvents(updatedEvents);
    });

    return unsubscribe;
  }, [eventManager, storageManager]);

  const addEvent = useCallback((eventData: Omit<CalendarEvent, 'id'>) => {
    return eventManager.createEvent(eventData);
  }, [eventManager]);

  const updateEvent = useCallback((id: string, updates: Partial<CalendarEvent>) => {
    return eventManager.updateEvent(id, updates);
  }, [eventManager]);

  const deleteEvent = useCallback((id: string) => {
    return eventManager.deleteEvent(id);
  }, [eventManager]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToPrev = useCallback(() => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (view === 'month') {
        newDate.setMonth(prev.getMonth() - 1);
      } else if (view === 'week') {
        newDate.setDate(prev.getDate() - 7);
      } else {
        newDate.setDate(prev.getDate() - 1);
      }
      return newDate;
    });
  }, [view]);

  const goToNext = useCallback(() => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (view === 'month') {
        newDate.setMonth(prev.getMonth() + 1);
      } else if (view === 'week') {
        newDate.setDate(prev.getDate() + 7);
      } else {
        newDate.setDate(prev.getDate() + 1);
      }
      return newDate;
    });
  }, [view]);

  return {
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
  };
};
