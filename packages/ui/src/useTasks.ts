/**
 * Tasks Hook
 * Manages task state with persistence
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Task,
  TaskManager,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter,
  TaskSortOption,
} from '@calendar/core';
import { StorageManager, LocalStorageAdapter } from '@calendar/storage';

interface UseTasksOptions {
  initialFilter?: TaskFilter;
  initialSortBy?: TaskSortOption;
}

export function useTasks(options: UseTasksOptions = {}) {
  const { initialFilter = {}, initialSortBy = 'dueDate-asc' } = options;

  // Initialize managers
  const taskManager = useMemo(() => new TaskManager(), []);
  const storageManager = useMemo(() => new StorageManager(new LocalStorageAdapter()), []);

  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>(initialFilter);
  const [sortBy, setSortBy] = useState<TaskSortOption>(initialSortBy);
  const [isLoading, setIsLoading] = useState(true);

  // Load tasks from storage on mount
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const savedTasks = await storageManager.loadTasks();
        if (savedTasks.length > 0) {
          taskManager.loadFromStorage(savedTasks);
          setTasks(savedTasks);
        }
      } catch (error) {
        console.error('Failed to load tasks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();

    // Subscribe to task changes
    const unsubscribe = taskManager.subscribe(async (updatedTasks) => {
      setTasks(updatedTasks);
      try {
        await storageManager.saveTasks(updatedTasks);
      } catch (error) {
        console.error('Failed to save tasks:', error);
      }
    });

    return () => unsubscribe();
  }, [taskManager, storageManager]);

  // Filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    return taskManager.queryTasks(filter, sortBy);
  }, [tasks, filter, sortBy, taskManager]);

  // Actions
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

  // ---------- 子任务操作 ----------

  const createSubTask = useCallback(
    (parentId: string, input: CreateTaskInput) => {
      return taskManager.createSubTask(parentId, input);
    },
    [taskManager]
  );

  const getSubTasks = useCallback(
    (parentId: string) => {
      return taskManager.getSubTasks(parentId);
    },
    [taskManager]
  );

  const getTaskProgress = useCallback(
    (taskId: string): { completed: number; total: number; percentage: number } => {
      const subTasks = taskManager.getSubTasks(taskId);
      if (subTasks.length === 0) {
        const task = taskManager.getTaskById(taskId);
        return {
          completed: task?.status === 'completed' ? 1 : 0,
          total: 1,
          percentage: task?.status === 'completed' ? 100 : 0,
        };
      }
      const completed = subTasks.filter((t) => t.status === 'completed').length;
      return {
        completed,
        total: subTasks.length,
        percentage: Math.round((completed / subTasks.length) * 100),
      };
    },
    [taskManager]
  );

  // Get tasks for calendar display
  const getTasksForDate = useCallback(
    (date: Date) => {
      return taskManager.getTasksForDate(date);
    },
    [taskManager]
  );

  // Get unscheduled tasks
  const unscheduledTasks = useMemo(() => {
    return taskManager.getUnscheduledTasks();
  }, [tasks, taskManager]);

  // Get today's tasks
  const todayTasks = useMemo(() => {
    return taskManager.getTodayTasks();
  }, [tasks, taskManager]);

  // Get completed tasks
  const completedTasks = useMemo(() => {
    return taskManager.getCompletedTasks();
  }, [tasks, taskManager]);

  // Stats
  const stats = useMemo(() => {
    const allTasks = taskManager.getAllTasks();
    const completed = allTasks.filter((t) => t.status === 'completed').length;
    const total = allTasks.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCompleted = allTasks.filter(
      (t) =>
        t.status === 'completed' &&
        t.completedAt &&
        new Date(t.completedAt).getTime() >= today.getTime()
    ).length;

    return {
      total,
      completed,
      pending: total - completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      todayCompleted,
    };
  }, [tasks, taskManager]);

  return {
    // Data
    tasks: filteredTasks,
    allTasks: tasks,
    isLoading,

    // Filtered views
    unscheduledTasks,
    todayTasks,
    completedTasks,

    // Filter & Sort
    filter,
    setFilter,
    sortBy,
    setSortBy,

    // Actions
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    scheduleTask,
    unscheduleTask,
    getTasksForDate,

    // Sub-task Actions
    createSubTask,
    getSubTasks,
    getTaskProgress,

    // Stats
    stats,

    // Raw manager for advanced usage
    taskManager,
  };
}
