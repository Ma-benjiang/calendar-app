const { ipcMain, app } = require('electron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { generateCalendarCreativePlan } = require('./languageModel');
const {
  persistCalendarImage,
  removeCalendarImage,
} = require('./imageStorage');

const VOLCES_API_ORIGIN = 'https://ark.cn-beijing.volces.com';
const HOLIDAY_SOURCE_URLS = [
  (year) => `https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/${year}.json`,
  (year) => `https://fastly.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${year}.json`,
];
const CALENDAR_IMAGE_DIRECTORY = path.join(
  app.getPath('userData'),
  'daily-calendar-images'
);

function resolveAIEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || !endpoint.trim()) {
    throw new Error('AI API endpoint is required');
  }

  const normalized = endpoint.startsWith('/volces-api/')
    ? `${VOLCES_API_ORIGIN}${endpoint.slice('/volces-api'.length)}`
    : endpoint;
  const url = new URL(normalized);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('AI API endpoint must use HTTP or HTTPS');
  }

  return url.toString();
}

function createMultipartBody(fields, multipart) {
  const match = typeof multipart?.imageDataUrl === 'string'
    ? multipart.imageDataUrl.match(/^data:([^;,]+);base64,(.+)$/)
    : null;
  if (!match) {
    throw new Error('Invalid reference image data');
  }

  const formData = new FormData();
  Object.entries(fields ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
  formData.append(
    multipart.imageField || 'image',
    new Blob([Buffer.from(match[2], 'base64')], { type: match[1] }),
    multipart.filename || 'reference.jpg'
  );
  return formData;
}

function validateHolidayYear(data, expectedYear) {
  if (
    !data ||
    data.year !== expectedYear ||
    !Array.isArray(data.papers) ||
    !Array.isArray(data.days) ||
    data.days.some((day) => (
      typeof day?.name !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(day?.date) ||
      typeof day?.isOffDay !== 'boolean'
    ))
  ) {
    throw new Error(`Invalid holiday data for ${expectedYear}`);
  }

  return data;
}

async function fetchHolidayYear(year) {
  let lastError;

  for (const getURL of HOLIDAY_SOURCE_URLS) {
    try {
      const response = await fetch(getURL(year), {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Holiday source returned ${response.status}`);
      }
      return validateHolidayYear(await response.json(), year);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(`Unable to fetch holiday data for ${year}`);
}

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

ipcMain.handle('calendar-image-persist', async (_event, payload) => {
  return persistCalendarImage(
    payload?.source,
    payload?.label,
    CALENDAR_IMAGE_DIRECTORY
  );
});

ipcMain.handle('calendar-image-remove', async (_event, imageURL) => {
  return removeCalendarImage(imageURL, CALENDAR_IMAGE_DIRECTORY);
});

ipcMain.handle('ai-request', async (_event, payload) => {
  const { endpoint, apiKey, body, multipart } = payload ?? {};

  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('AI API key is required');
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
  };
  const requestBody = multipart
    ? createMultipartBody(body, multipart)
    : JSON.stringify(body ?? {});
  if (!multipart) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(resolveAIEndpoint(endpoint), {
    method: 'POST',
    headers,
    body: requestBody,
  });
  const responseText = await response.text();
  let data = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText };
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
});

ipcMain.handle('ai-generate-calendar-plan', async (_event, payload) => {
  try {
    return {
      ok: true,
      data: await generateCalendarCreativePlan(payload),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle('holidays-fetch-year', async (_event, year) => {
  if (!Number.isInteger(year) || year < 2004 || year > 2100) {
    throw new Error('Holiday year must be an integer between 2004 and 2100');
  }

  return fetchHolidayYear(year);
});
