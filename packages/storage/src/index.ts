// 存储抽象层 - 支持 localStorage 和 SQLite
import { CalendarEvent } from '../core/src/calendar';

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
  private static STORAGE_KEY = 'calendar_events';
  
  constructor(private adapter: StorageAdapter) {}

  async saveEvents(events: CalendarEvent[]): Promise<void> {
    const data = JSON.stringify(events);
    await this.adapter.setItem(StorageManager.STORAGE_KEY, data);
  }

  async loadEvents(): Promise<CalendarEvent[]> {
    const data = await this.adapter.getItem(StorageManager.STORAGE_KEY);
    if (!data) return [];
    
    try {
      const events = JSON.parse(data);
      return events.map((e: any) => ({
        ...e,
        startDate: new Date(e.startDate),
        endDate: new Date(e.endDate),
      }));
    } catch {
      return [];
    }
  }

  async clearEvents(): Promise<void> {
    await this.adapter.removeItem(StorageManager.STORAGE_KEY);
  }
}
