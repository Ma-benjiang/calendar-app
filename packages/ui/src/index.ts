// UI 包入口 - Notion 风格日历组件库

// Import styles
import './notion-theme.css';

// Export hooks
export { useSidebar, type SidebarItem, type TreeNode } from './useSidebar';
export { useCommand, type Command } from './useCommand';
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
export {
  useQuickAdd,
  type QuickAddMode,
  type QuickAddSource,
  type QuickAddFormValues,
  type QuickAddSuggestions,
} from './useQuickAdd';

// Export utilities
export { parseNaturalInput, type ParsedResult } from './NaturalInput';

// Export components
export { CommandMenu } from './CommandMenu';
export { Sidebar } from './Sidebar';
export { SidebarItem } from './SidebarItem';
export { ContentBlock } from './ContentBlock';
export { ViewToggle } from './ViewToggle';
export { NotionButton } from './NotionButton';

// Export legacy components (for backward compatibility)
export { CalendarApp } from './CalendarApp';
export { MonthView } from './MonthView';
export { WeekView } from './WeekView';
export { DayView } from './DayView';
export { EventForm } from './EventForm';
export { TaskList } from './TaskList';
export { useCalendar } from './useCalendar';
export { useNotifications } from './useNotifications';
export { ExportImport } from './ExportImport';
