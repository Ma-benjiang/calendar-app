const { ipcMain } = require('electron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 初始化数据库
const dbPath = path.join(app.getPath('userData'), 'calendar.db');
const db = new sqlite3.Database(dbPath);

// 创建表
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS storage (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);
});

// IPC 处理
ipcMain.handle('storage-get', async (event, key) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT value FROM storage WHERE key = ?', [key], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.value : null);
    });
  });
});

ipcMain.handle('storage-set', async (event, key, value) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR REPLACE INTO storage (key, value) VALUES (?, ?)',
      [key, value],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
});

ipcMain.handle('storage-remove', async (event, key) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM storage WHERE key = ?', [key], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});
