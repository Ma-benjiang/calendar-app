/**
 * TaskCalendar Hook
 * 整合任务和日历功能，支持任务→日历拖放
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Task,
  CalendarEvent,
  TaskManager,
  EventManager,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter,
  TaskSortOption,
} from '@calendar/core';
import { StorageManager, LocalStorageAdapter } from '@calendar/storage';

export interface TaskCalendarItem {
  id: string;
  type: 'event' | 'task';
  title: string;
  startDate: Date;
  endDate: Date;
  color?: string;
  data: CalendarEvent | Task;
}

export interface UseTaskCalendarOptions {
  initialTaskFilter?: TaskFilter;
  initialTaskSortBy?: TaskSortOption;
}

export type TaskCalendarView = 'month' | 'week' | 'day' | 'tasks' | 'daily-calendar';

export function useTaskCalendar(options: UseTaskCalendarOptions = {}) {
  const { initialTaskFilter = {}, initialTaskSortBy = 'dueDate-asc' } = options;

  // Managers
  const taskManager = useMemo(() => new TaskManager(), []);
  const eventManager = useMemo(() => new EventManager(), []);
  const storageManager = useMemo(() => new StorageManager(new LocalStorageAdapter()), []);

  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<TaskCalendarView>('month');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>(initialTaskFilter);
  const [taskSortBy, setTaskSortBy] = useState<TaskSortOption>(initialTaskSortBy);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from storage
  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedTasks, savedEvents] = await Promise.all([
          storageManager.loadTasks(),
          storageManager.loadEvents(),
        ]);

        if (savedTasks.length > 0) {
          taskManager.loadFromStorage(savedTasks);
          setTasks(savedTasks);
        }

        if (savedEvents.length > 0) {
          eventManager.loadFromStorage(savedEvents);
          setEvents(savedEvents);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Subscribe to changes
    const unsubscribeTasks = taskManager.subscribe(async (updatedTasks) => {
      setTasks(updatedTasks);
      await storageManager.saveTasks(updatedTasks);
    });

    const unsubscribeEvents = eventManager.subscribe(async (updatedEvents) => {
      setEvents(updatedEvents);
      await storageManager.saveEvents(updatedEvents);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeEvents();
    };
  }, [taskManager, eventManager, storageManager]);

  // Navigation
  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToPrev = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (view === 'month') {
        newDate.setMonth(prev.getMonth() - 1);
      } else if (view === 'week') {
        newDate.setDate(prev.getDate() - 7);
      } else if (view === 'day') {
        newDate.setDate(prev.getDate() - 1);
      }
      return newDate;
    });
  }, [view]);

  const goToNext = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (view === 'month') {
        newDate.setMonth(prev.getMonth() + 1);
      } else if (view === 'week') {
        newDate.setDate(prev.getDate() + 7);
      } else if (view === 'day') {
        newDate.setDate(prev.getDate() + 1);
      }
      return newDate;
    });
  }, [view]);

  // Event actions
  const addEvent = useCallback(
    (eventData: Omit<CalendarEvent, 'id'>) => {
      return eventManager.createEvent(eventData);
    },
    [eventManager]
  );

  const updateEvent = useCallback(
    (id: string, updates: Partial<CalendarEvent>) => {
      return eventManager.updateEvent(id, updates);
    },
    [eventManager]
  );

  const deleteEvent = useCallback(
    (id: string) => {
      return eventManager.deleteEvent(id);
    },
    [eventManager]
  );

  // Task actions
  const createTask = useCallback(
    (input: CreateTaskInput) => {
      return taskManager.createTask(input);
    },
    [taskManager]
  );

  const updateTask = useCallback(
    (id: string, updates: UpdateTaskInput) => {
      return taskManager.updateTask(id, updates);
    },
    [taskManager]
  );

  const deleteTask = useCallback(
    (id: string) => {
      return taskManager.deleteTask(id);
    },
    [taskManager]
  );

  const toggleTaskCompletion = useCallback(
    (id: string) => {
      return taskManager.toggleTaskCompletion(id);
    },
    [taskManager]
  );

  const scheduleTask = useCallback(
    (id: string, start: Date, end?: Date) => {
      return taskManager.scheduleTask(id, start, end);
    },
    [taskManager]
  );

  const unscheduleTask = useCallback(
    (id: string) => {
      return taskManager.unscheduleTask(id);
    },
    [taskManager]
  );

  // Task queries
  const filteredTasks = useMemo(() => {
    return taskManager.queryTasks(taskFilter, taskSortBy);
  }, [taskFilter, taskSortBy, taskManager]);

  const unscheduledTasks = useMemo(() => {
    return taskManager.getUnscheduledTasks();
  }, [taskManager]);

  const todayTasks = useMemo(() => {
    return taskManager.getTodayTasks();
  }, [taskManager]);

  // Stats
  const taskStats = useMemo(() => {
    const allTasks = taskManager.getAllTasks();
    const completed = allTasks.filter((t) => t.status === 'completed').length;
    const total = allTasks.length;

    return {
      total,
      completed,
      pending: total - completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [taskManager]);

  // Combine events and scheduled tasks for calendar display
  const calendarItems = useMemo((): TaskCalendarItem[] => {
    const items: TaskCalendarItem[] = [];

    // Add events
    events.forEach((event) => {
      items.push({
        id: `event-${event.id}`,
        type: 'event',
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        color: event.color,
        data: event,
      });
    });

    // Add scheduled tasks
    tasks.forEach((task) => {
      if (task.scheduledStart && task.scheduledEnd) {
        items.push({
          id: `task-${task.id}`,
          type: 'task',
          title: task.title,
          startDate: task.scheduledStart,
          endDate: task.scheduledEnd,
          color: task.color || getPriorityColor(task.priority),
          data: task,
        });
      }
    });

    // Sort by start date
    items.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    return items;
  }, [events, tasks]);

  // Get items for a specific date
  const getItemsForDate = useCallback(
    (date: Date) => {
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);

      return calendarItems.filter((item) => {
        const itemStart = new Date(item.startDate);
        itemStart.setHours(0, 0, 0, 0);
        return itemStart.getTime() === checkDate.getTime();
      });
    },
    [calendarItems]
  );

  // Handle task drop on calendar
  const handleTaskDrop = useCallback(
    (taskId: string, date: Date, hour: number = 9) => {
      const task = taskManager.getTaskById(taskId);
      if (!task) return null;

      // Create start time at specified hour
      const start = new Date(date);
      start.setHours(hour, 0, 0, 0);

      // Use estimated minutes or default 30 minutes
      const duration = task.estimatedMinutes || 30;
      const end = new Date(start.getTime() + duration * 60000);

      return scheduleTask(taskId, start, end);
    },
    [taskManager, scheduleTask]
  );

  return {
    // Data
    events,
    tasks: filteredTasks,
    allTasks: tasks,
    calendarItems,
    isLoading,

    // Calendar state
    currentDate,
    view,
    setView,

    // Task state
    taskFilter,
    setTaskFilter,
    taskSortBy,
    setTaskSortBy,
    unscheduledTasks,
    todayTasks,

    // Navigation
    goToToday,
    goToPrev,
    goToNext,

    // Event actions
    addEvent,
    updateEvent,
    deleteEvent,

    // Task actions
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    scheduleTask,
    unscheduleTask,

    // Queries
    getItemsForDate,
    handleTaskDrop,

    // Stats
    taskStats,
  };
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#3b82f6',
    none: '#9ca3af',
  };
  return colors[priority] || '#3b82f6';
}
