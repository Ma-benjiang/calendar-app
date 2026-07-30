// 存储抽象层 - 支持浏览器回退和桌面 SQLite
import { CalendarEvent, Task } from '@calendar/core';

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// 浏览器开发环境回退
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

interface DesktopStorageBridge {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Electron SQLite 适配器
export class ElectronSQLiteAdapter implements StorageAdapter {
  constructor(private bridge: DesktopStorageBridge) {}

  async getItem(key: string): Promise<string | null> {
    return this.bridge.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.bridge.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    await this.bridge.removeItem(key);
  }
}

/**
 * 获取当前环境的最佳存储适配器
 */
export function getStorageAdapter(): StorageAdapter {
  const desktopBridge = typeof window !== 'undefined'
    ? (window as unknown as {
        calendarDesktop?: { storage?: DesktopStorageBridge };
      }).calendarDesktop?.storage
    : undefined;

  if (desktopBridge) {
    return new ElectronSQLiteAdapter(desktopBridge);
  }

  return new LocalStorageAdapter();
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
      })) as Task[];
    } catch {
      return [];
    }
  }

  async clearTasks(): Promise<void> {
    await this.adapter.removeItem(StorageManager.TASKS_KEY);
  }
}
