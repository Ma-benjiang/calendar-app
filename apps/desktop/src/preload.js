const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('calendarDesktop', {
  storage: {
    getItem: (key) => ipcRenderer.invoke('storage-get', key),
    setItem: (key, value) => ipcRenderer.invoke('storage-set', key, value),
    removeItem: (key) => ipcRenderer.invoke('storage-remove', key),
  },
  ai: {
    request: (payload) => ipcRenderer.invoke('ai-request', payload),
    generateCalendarPlan: (payload) =>
      ipcRenderer.invoke('ai-generate-calendar-plan', payload),
  },
  images: {
    persist: (payload) => ipcRenderer.invoke('calendar-image-persist', payload),
    remove: (imageURL) => ipcRenderer.invoke('calendar-image-remove', imageURL),
  },
  holidays: {
    fetchYear: (year) => ipcRenderer.invoke('holidays-fetch-year', year),
  },
});
