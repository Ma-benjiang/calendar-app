/**
 * View Mode Hook
 * Manages view modes (list, board, timeline, calendar) and item display
 * AC-004: Modular Layout - Four View Modes
 */
import { useState, useCallback, useMemo, useEffect } from 'react';

export type ViewMode = 'list' | 'board' | 'timeline' | 'calendar';
export type CalendarView = 'month' | 'week' | 'day';
export type GroupBy = 'status' | 'date' | 'type' | 'priority' | 'none';
export type SortBy = 'time' | 'priority' | 'title' | 'created';

export interface ViewItem {
  id: string;
  title: string;
  type: 'event' | 'task' | 'note';
  startTime?: string;
  endTime?: string;
  dueDate?: string;
  status?: 'pending' | 'in-progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  location?: string;
  participants?: string[];
  description?: string;
  createdAt?: string;
}

export interface FilterOptions {
  type?: 'event' | 'task' | 'note';
  status?: string;
  priority?: string;
  dateRange?: { start: string; end: string };
  search?: string;
}

export interface BoardColumn {
  id: string;
  title: string;
  items: ViewItem[];
}

export interface PositionedItem extends ViewItem {
  left: number;
  width: number;
  top: number;
}

interface UseViewModeOptions {
  items: ViewItem[];
  onViewChange?: (view: ViewMode) => void;
}

interface UseViewModeReturn {
  // View state
  viewMode: ViewMode;
  calendarView: CalendarView;
  layout: 'vertical' | 'horizontal' | 'grid';
  groupBy: GroupBy;
  sortBy: SortBy;
  filter: FilterOptions;
  expandedItems: string[];
  zoomLevel: number;
  transitionDuration: number;
  transitionTiming: string;

  // Derived data
  filteredItems: ViewItem[];
  sortedItems: ViewItem[];
  columns: BoardColumn[];
  positionedItems: PositionedItem[];
  gridCells: { date: Date; items: ViewItem[] }[];

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setCalendarView: (view: CalendarView) => void;
  setGroupBy: (groupBy: GroupBy) => void;
  setSortBy: (sortBy: SortBy) => void;
  setFilter: (filter: FilterOptions) => void;
  expandItem: (id: string) => void;
  collapseItem: (id: string) => void;
  toggleItem: (id: string) => void;
  isExpanded: (id: string) => boolean;
  zoomIn: () => void;
  zoomOut: () => void;

  // Helpers
  getItemDisplayData: (id: string) => {
    title: string;
    time?: string;
    location?: string;
    participants?: string[];
    dueDate?: string;
    priority?: string;
    status?: string;
    hasCheckbox?: boolean;
  } | null;
}

const STORAGE_KEY_VIEW_MODE = 'view-mode';
const STORAGE_KEY_CALENDAR_VIEW = 'calendar-view';
const STORAGE_KEY_GROUP_BY = 'group-by';
const STORAGE_KEY_SORT_BY = 'sort-by';

const TRANSITION_DURATION = 300;
const TRANSITION_TIMING = 'ease-in-out';

export function useViewMode(options: UseViewModeOptions): UseViewModeReturn {
  const { items, onViewChange } = options;

  // State
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'list';
    return (localStorage.getItem(STORAGE_KEY_VIEW_MODE) as ViewMode) || 'list';
  });
  const [calendarView, setCalendarViewState] = useState<CalendarView>(() => {
    if (typeof window === 'undefined') return 'month';
    return (localStorage.getItem(STORAGE_KEY_CALENDAR_VIEW) as CalendarView) || 'month';
  });
  const [groupBy, setGroupByState] = useState<GroupBy>(() => {
    if (typeof window === 'undefined') return 'none';
    return (localStorage.getItem(STORAGE_KEY_GROUP_BY) as GroupBy) || 'none';
  });
  const [sortBy, setSortByState] = useState<SortBy>(() => {
    if (typeof window === 'undefined') return 'time';
    return (localStorage.getItem(STORAGE_KEY_SORT_BY) as SortBy) || 'time';
  });
  const [filter, setFilterState] = useState<FilterOptions>({});
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Persist state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_VIEW_MODE, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_CALENDAR_VIEW, calendarView);
  }, [calendarView]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_GROUP_BY, groupBy);
  }, [groupBy]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_SORT_BY, sortBy);
  }, [sortBy]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filter.type && item.type !== filter.type) return false;
      if (filter.status && item.status !== filter.status) return false;
      if (filter.priority && item.priority !== filter.priority) return false;
      if (filter.dateRange) {
        const itemDate = item.startTime || item.dueDate;
        if (itemDate) {
          const date = itemDate.split('T')[0];
          if (date < filter.dateRange.start || date > filter.dateRange.end) {
            return false;
          }
        }
      }
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const matches =
          item.title.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.location?.toLowerCase().includes(searchLower);
        if (!matches) return false;
      }
      return true;
    });
  }, [items, filter]);

  // Sort items
  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'time': {
          const timeA = a.startTime || a.dueDate || '';
          const timeB = b.startTime || b.dueDate || '';
          return timeA.localeCompare(timeB);
        }
        case 'priority': {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const priorityA = priorityOrder[a.priority || 'low'];
          const priorityB = priorityOrder[b.priority || 'low'];
          return priorityA - priorityB;
        }
        case 'title': {
          return a.title.localeCompare(b.title);
        }
        case 'created': {
          const createdA = a.createdAt || '';
          const createdB = b.createdAt || '';
          return createdB.localeCompare(createdA);
        }
        default:
          return 0;
      }
    });
    return sorted;
  }, [filteredItems, sortBy]);

  // Board columns
  const columns = useMemo((): BoardColumn[] => {
    if (viewMode !== 'board') return [];

    if (groupBy === 'none') {
      return [{ id: 'all', title: 'All Items', items: sortedItems }];
    }

    const groups = new Map<string, ViewItem[]>();

    sortedItems.forEach(item => {
      let key: string;
      switch (groupBy) {
        case 'status':
          key = item.status || 'no-status';
          break;
        case 'date': {
          const date = item.startTime?.split('T')[0] || item.dueDate || 'no-date';
          key = date;
          break;
        }
        case 'type':
          key = item.type;
          break;
        case 'priority':
          key = item.priority || 'no-priority';
          break;
        default:
          key = 'all';
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });

    return Array.from(groups.entries()).map(([id, items]) => ({
      id,
      title: id === 'no-status' ? 'No Status' :
             id === 'no-date' ? 'No Date' :
             id === 'no-priority' ? 'No Priority' :
             id,
      items,
    }));
  }, [sortedItems, groupBy, viewMode]);

  // Timeline positioned items
  const positionedItems = useMemo((): PositionedItem[] => {
    if (viewMode !== 'timeline') return [];

    // Simple positioning logic - can be enhanced
    return sortedItems.map((item, index) => ({
      ...item,
      left: index * 200 * zoomLevel,
      width: 180 * zoomLevel,
      top: 0,
    }));
  }, [sortedItems, viewMode, zoomLevel]);

  // Calendar grid cells
  const gridCells = useMemo(() => {
    if (viewMode !== 'calendar') return [];

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (calendarView === 'month') {
      // Generate 6 weeks of days
      const firstDay = new Date(year, month, 1);
      const startOfGrid = new Date(firstDay);
      startOfGrid.setDate(startOfGrid.getDate() - firstDay.getDay());

      const cells: { date: Date; items: ViewItem[] }[] = [];
      for (let i = 0; i < 42; i++) {
        const date = new Date(startOfGrid);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const dayItems = sortedItems.filter(item => {
          const itemDate = item.startTime?.split('T')[0] || item.dueDate;
          return itemDate === dateStr;
        });

        cells.push({ date, items: dayItems });
      }
      return cells;
    } else if (calendarView === 'week') {
      // Generate 7 days
      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

      const cells: { date: Date; items: ViewItem[] }[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const dayItems = sortedItems.filter(item => {
          const itemDate = item.startTime?.split('T')[0] || item.dueDate;
          return itemDate === dateStr;
        });

        cells.push({ date, items: dayItems });
      }
      return cells;
    }

    return [];
  }, [sortedItems, viewMode, calendarView]);

  // Layout type
  const layout = useMemo(() => {
    switch (viewMode) {
      case 'list':
        return 'vertical';
      case 'board':
        return 'horizontal';
      case 'timeline':
        return 'horizontal';
      case 'calendar':
        return 'grid';
      default:
        return 'vertical';
    }
  }, [viewMode]);

  // Actions
  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    onViewChange?.(mode);
  }, [onViewChange]);

  const setCalendarView = useCallback((view: CalendarView) => {
    setCalendarViewState(view);
  }, []);

  const setGroupBy = useCallback((newGroupBy: GroupBy) => {
    setGroupByState(newGroupBy);
  }, []);

  const setSortBy = useCallback((newSortBy: SortBy) => {
    setSortByState(newSortBy);
  }, []);

  const setFilter = useCallback((newFilter: FilterOptions) => {
    setFilterState(newFilter);
  }, []);

  const expandItem = useCallback((id: string) => {
    setExpandedItems(prev =>
      prev.includes(id) ? prev : [...prev, id]
    );
  }, []);

  const collapseItem = useCallback((id: string) => {
    setExpandedItems(prev => prev.filter(itemId => itemId !== id));
  }, []);

  const toggleItem = useCallback((id: string) => {
    setExpandedItems(prev =>
      prev.includes(id)
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  }, []);

  const isExpanded = useCallback((id: string) => {
    return expandedItems.includes(id);
  }, [expandedItems]);

  const zoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const getItemDisplayData = useCallback((id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return null;

    const formatTime = (start?: string, end?: string) => {
      if (!start) return undefined;
      const startTime = start.split('T')[1]?.slice(0, 5) || '';
      const endTime = end?.split('T')[1]?.slice(0, 5) || '';
      return endTime ? `${startTime} - ${endTime}` : startTime;
    };

    return {
      title: item.title,
      time: formatTime(item.startTime, item.endTime),
      location: item.location,
      participants: item.participants,
      dueDate: item.dueDate,
      priority: item.priority,
      status: item.status,
      hasCheckbox: item.type === 'task',
    };
  }, [items]);

  return {
    // View state
    viewMode,
    calendarView,
    layout,
    groupBy,
    sortBy,
    filter,
    expandedItems,
    zoomLevel,
    transitionDuration: TRANSITION_DURATION,
    transitionTiming: TRANSITION_TIMING,

    // Derived data
    filteredItems,
    sortedItems,
    columns,
    positionedItems,
    gridCells,

    // Actions
    setViewMode,
    setCalendarView,
    setGroupBy,
    setSortBy,
    setFilter,
    expandItem,
    collapseItem,
    toggleItem,
    isExpanded,
    zoomIn,
    zoomOut,

    // Helpers
    getItemDisplayData,
  };
}
