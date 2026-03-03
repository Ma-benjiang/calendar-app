/**
 * 每日台历功能模块
 * Daily Calendar Feature Module
 *
 * 导出所有组件、Hook 和工具函数
 */

// 类型定义
export * from './types';

// 组件
export { CalendarCard } from './components/CalendarCard';
export { CalendarHeader } from './components/CalendarHeader';
export { CalendarImage } from './components/CalendarImage';
export { CalendarCaption } from './components/CalendarCaption';
export { ThemeSelector } from './components/ThemeSelector';
export { HistoryCalendar } from './components/HistoryCalendar';

// 页面
export { DailyCalendarPage } from './pages/DailyCalendarPage';

// Hooks
export { useDailyCalendar } from './hooks/useDailyCalendar';
export { useCalendarStorage } from './hooks/useCalendarStorage';

// 服务
export { seedreamService, generateCalendarImage, cancelImageGeneration } from './services/seedreamService';
export {
  selectDailyQuote,
  getQuoteById,
  getAllQuotes,
  getQuotesByCategory,
  addCustomQuote,
  clearRecentQuotes,
  generatePromptQuote,
} from './services/captionService';

// 工具函数
export {
  isLeapYear,
  getDaysInMonth,
  formatDateKey,
  getGregorianDate,
  getWeekdayInfo,
  getLunarDate,
  getSolarTerm,
  getHoliday,
  getLunarHoliday,
  getConstellation,
  getCalendarDateInfo,
  formatDateDisplay,
  getDateRange,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getDaysInMonthRange,
  addDays,
  addMonths,
  isToday,
  isSameDay,
  getSeason,
} from './utils/dateUtils';
