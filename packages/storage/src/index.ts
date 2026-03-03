// 存储抽象层 - 支持 localStorage 和 SQLite
import { CalendarEvent, Task } from '@calendar/core';

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Web 存储适配器
export class LocalStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}

// 存储管理器
export class StorageManager {
  private static EVENTS_KEY = 'calendar_events';
  private static TASKS_KEY = 'calendar_tasks';

  constructor(private adapter: StorageAdapter) {}

  // ---------- 事件存储 ----------

  async saveEvents(events: CalendarEvent[]): Promise<void> {
    const data = JSON.stringify(events);
    await this.adapter.setItem(StorageManager.EVENTS_KEY, data);
  }

  async loadEvents(): Promise<CalendarEvent[]> {
    const data = await this.adapter.getItem(StorageManager.EVENTS_KEY);
    if (!data) return [];

    try {
      const events = JSON.parse(data) as Array<{startDate: string; endDate: string; [key: string]: unknown}>;
      return events.map((e) => ({
        ...e,
        startDate: new Date(e.startDate),
        endDate: new Date(e.endDate),
      })) as CalendarEvent[];
    } catch {
      return [];
    }
  }

  async clearEvents(): Promise<void> {
    await this.adapter.removeItem(StorageManager.EVENTS_KEY);
  }

  // ---------- 任务存储 ----------

  async saveTasks(tasks: Task[]): Promise<void> {
    const data = JSON.stringify(tasks);
    await this.adapter.setItem(StorageManager.TASKS_KEY, data);
  }

  async loadTasks(): Promise<Task[]> {
    const data = await this.adapter.getItem(StorageManager.TASKS_KEY);
    if (!data) return [];

    try {
      const tasks = JSON.parse(data) as Array<{
        dueDate?: string;
        scheduledStart?: string;
        scheduledEnd?: string;
        completedAt?: string;
        createdAt: string;
        updatedAt: string;
        recurrence?: { endDate?: string };
        [key: string]: unknown;
      }>;

      return tasks.map((t) => ({
        ...t,
        dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
        scheduledStart: t.scheduledStart ? new Date(t.scheduledStart) : undefined,
        scheduledEnd: t.scheduledEnd ? new Date(t.scheduledEnd) : undefined,
        completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
        recurrence: t.recurrence ? {
          ...t.recurrence,
          endDate: t.recurrence.endDate ? new Date(t.recurrence.endDate) : undefined,
        } : undefined,
      })) as Task[];
    } catch {
      return [];
    }
  }

  async clearTasks(): Promise<void> {
    await this.adapter.removeItem(StorageManager.TASKS_KEY);
  }
}
