// UI 包入口 - Notion 风格日历组件库

// Import styles
import './notion-theme.css';

// Export hooks
export { useSidebar, type TreeNode } from './useSidebar';
export { useTasks } from './useTasks';
export {
  useTaskCalendar,
  type TaskCalendarItem,
} from './useTaskCalendar';
export {
  useViewMode,
  type ViewMode,
  type CalendarView,
  type GroupBy,
  type SortBy,
  type ViewItem,
  type FilterOptions,
  type BoardColumn,
  type PositionedItem,
} from './useViewMode';
export { useDragAndDrop, type DragItem, type DragState, type DropResult } from './useDragAndDrop';

// Export components
export { Sidebar } from './Sidebar';
export { SidebarItem, type SidebarItemProps } from './SidebarItem';
export { ContentBlock } from './ContentBlock';
export { ViewToggle } from './ViewToggle';
export { NotionButton } from './NotionButton';

// Export legacy components (for backward compatibility)
export { CalendarApp } from './CalendarApp';
export { CalendarAppWithSidebar } from './CalendarAppWithSidebar';
export { MonthView } from './MonthView';
export { WeekView } from './WeekView';
export { DayView } from './DayView';
export { EventForm } from './EventForm';
export { TaskList } from './TaskList';
export { TaskView } from './TaskView';
export { TaskStatsBoard } from './TaskStatsBoard';
export { SmartSchedule } from './SmartSchedule';
export { RecurrencePicker } from './RecurrencePicker';
export { useCalendar } from './useCalendar';
export { useNotifications } from './useNotifications';
export { ExportImport } from './ExportImport';

// Daily Calendar Feature
export * from './daily-calendar';
