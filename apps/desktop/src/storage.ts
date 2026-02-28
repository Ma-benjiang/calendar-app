// Electron SQLite 存储适配器
import { StorageAdapter } from '@calendar/storage';

const { ipcRenderer } = require('electron');

export class ElectronSQLiteAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return ipcRenderer.invoke('storage-get', key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await ipcRenderer.invoke('storage-set', key, value);
  }

  async removeItem(key: string): Promise<void> {
    await ipcRenderer.invoke('storage-remove', key);
  }
}
