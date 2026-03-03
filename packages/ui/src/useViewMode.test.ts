/**
 * View Mode Hook Tests
 * TDD for AC-004: Modular Layout - Four View Modes
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewMode } from './useViewMode';

describe('useViewMode', () => {
  const mockEvents = [
    { id: 'evt-1', title: 'Meeting', startTime: '2026-03-02T10:00:00', type: 'event' },
    { id: 'evt-2', title: 'Lunch', startTime: '2026-03-02T12:00:00', type: 'event' },
    { id: 'task-1', title: 'Submit report', dueDate: '2026-03-02', type: 'task', status: 'pending' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('TC-VIE-001: List View Display', () => {
    it('should display items in vertical list layout', () => {
      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      act(() => {
        result.current.setViewMode('list');
      });

      expect(result.current.viewMode).toBe('list');
      expect(result.current.layout).toBe('vertical');
      expect(result.current.sortedItems.length).toBeGreaterThan(0);
    });

    it('should sort list items by time', () => {
      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      act(() => {
        result.current.setViewMode('list');
        result.current.setSortBy('time');
      });

      const sorted = result.current.sortedItems;
      // Check that events with startTime come before tasks without startTime
      expect(sorted[0].startTime).toBeDefined();
      expect(sorted[0].startTime <= (sorted[1]?.startTime || '')).toBe(true);
    });
  });

  describe('TC-VIE-002: Board View Display', () => {
    it('should display items in board columns', () => {
      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      act(() => {
        result.current.setViewMode('board');
      });

      expect(result.current.viewMode).toBe('board');
      expect(result.current.columns).toBeDefined();
    });

    it('should group board items by status when grouped by status', () => {
      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      act(() => {
        result.current.setViewMode('board');
        result.current.setGroupBy('status');
      });

      expect(result.current.columns.some(col => col.id === 'pending')).toBe(true);
    });

    it('should group board items by date when grouped by date', () => {
      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      act(() => {
        result.current.setViewMode('board');
        result.current.setGroupBy('date');
      });

      expect(result.current.columns.length).toBeGreaterThan(0);
    });
  });

  describe('TC-VIE-003: Timeline View Display', () => {
    it('should display items in horizontal timeline', () => {
      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      act(() => {
        result.current.setViewMode('timeline');
      });

      expect(result.current.viewMode).toBe('timeline');
      expect(result.current.layout).toBe('horizontal');
    });

    it('should position items by time on timeline', () => {
      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      act(() => {
        result.current.setViewMode('timeline');
      });

      const positionedItems = result.current.positionedItems;
      expect(positionedItems[0].left).toBeDefined();
      expect(positionedItems[0].width).toBeDefined();
    });

    it('should support zoom in/out on timeline', () => {
      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      act(() => {
        result.current.setViewMode('timeline');
        result.current.zoomIn();
      });

      expect(result.current.zoomLevel).toBeGreaterThan(1);

      act(() => {
        result.current.zoomOut();
      });

      expect(result.current.zoomLevel).toBe(1);
    });
  });

  describe('TC-VIE-004: Calendar View Display', () => {
    it('should display items in calendar grid', () => {
      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      act(() => {
        result.current.setViewMode('calendar');
      });

      expect(result.current.viewMode).toBe('calendar');
      expect(result.current.gridCells).toBeDefined();
    });

    it('should support month view in calendar', () => {
      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      act(() => {
        result.current.setViewMode('calendar');
        result.current.setCalendarView('month');
      });

      expect(result.current.calendarView).toBe('month');
      expect(result.current.gridCells.length).toBe(42); // 6 weeks
    });

    it('should support week view in calendar', () => {
      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      act(() => {
        result.current.setViewMode('calendar');
        result.current.setCalendarView('week');
      });

      expect(result.current.calendarView).toBe('week');
      expect(result.current.gridCells.length).toBe(7);
    });
  });

  describe('TC-VIE-005: View Switch Animation', () => {
    it('should have smooth transition when switching views', () => {
      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      expect(result.current.transitionDuration).toBe(300);
      expect(result.current.transitionTiming).toBe('ease-in-out');
    });

    it('should trigger animation callback on view change', () => {
      const onViewChange = vi.fn();
      const { result } = renderHook(() =>
        useViewMode({ items: mockEvents, onViewChange })
      );

      act(() => {
        result.current.setViewMode('board');
      });

      expect(onViewChange).toHaveBeenCalledWith('board');
    });
  });

  describe('TC-VIE-007: Block Expand Details', () => {
    it('should expand block to show full details', () => {
      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      act(() => {
        result.current.expandItem('evt-1');
      });

      expect(result.current.expandedItems).toContain('evt-1');
      expect(result.current.isExpanded('evt-1')).toBe(true);
    });

    it('should collapse expanded block', () => {
      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      act(() => {
        result.current.expandItem('evt-1');
      });

      expect(result.current.isExpanded('evt-1')).toBe(true);

      act(() => {
        result.current.collapseItem('evt-1');
      });

      expect(result.current.isExpanded('evt-1')).toBe(false);
    });

    it('should toggle block expand state', () => {
      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      act(() => {
        result.current.toggleItem('evt-1');
      });

      expect(result.current.isExpanded('evt-1')).toBe(true);

      act(() => {
        result.current.toggleItem('evt-1');
      });

      expect(result.current.isExpanded('evt-1')).toBe(false);
    });
  });

  describe('Filtering and Sorting', () => {
    it('should filter items by type', () => {
      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      act(() => {
        result.current.setFilter({ type: 'event' });
      });

      expect(result.current.filteredItems.every(item => item.type === 'event')).toBe(true);
    });

    it('should filter items by date range', () => {
      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      act(() => {
        result.current.setFilter({
          dateRange: { start: '2026-03-01', end: '2026-03-03' },
        });
      });

      expect(result.current.filteredItems.length).toBeGreaterThan(0);
    });

    it('should sort items by priority', () => {
      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      act(() => {
        result.current.setSortBy('priority');
      });

      expect(result.current.sortBy).toBe('priority');
    });

    it('should combine filter and sort', () => {
      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      act(() => {
        result.current.setFilter({ type: 'event' });
        result.current.setSortBy('time');
      });

      expect(result.current.filteredItems.every(item => item.type === 'event')).toBe(true);
      expect(result.current.sortBy).toBe('time');
    });
  });

  describe('View State Persistence', () => {
    it('should persist view mode to localStorage', () => {
      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      act(() => {
        result.current.setViewMode('board');
      });

      const saved = localStorage.getItem('view-mode');
      expect(saved).toBe('board');
    });

    it('should restore view mode from localStorage', () => {
      localStorage.setItem('view-mode', 'timeline');

      const { result } = renderHook(() => useViewMode({ items: mockEvents }));

      expect(result.current.viewMode).toBe('timeline');
    });
  });

  describe('Event Block Display', () => {
    it('should display event with title, time, location, participants', () => {
      const eventWithDetails = {
        id: 'evt-detailed',
        title: 'Team Meeting',
        startTime: '2026-03-02T10:00:00',
        endTime: '2026-03-02T11:00:00',
        location: 'Conference Room A',
        participants: ['user1', 'user2'],
        type: 'event',
      };

      const { result } = renderHook(() =>
        useViewMode({ items: [eventWithDetails] })
      );

      const displayData = result.current.getItemDisplayData('evt-detailed');
      expect(displayData).toMatchObject({
        title: 'Team Meeting',
        time: '10:00 - 11:00',
        location: 'Conference Room A',
        participants: ['user1', 'user2'],
      });
    });
  });

  describe('Task Block Display', () => {
    it('should display task with checkbox, title, due date, priority', () => {
      const taskWithDetails = {
        id: 'task-detailed',
        title: 'Submit Report',
        dueDate: '2026-03-05',
        priority: 'high',
        status: 'pending',
        type: 'task',
      };

      const { result } = renderHook(() =>
        useViewMode({ items: [taskWithDetails] })
      );

      const displayData = result.current.getItemDisplayData('task-detailed');
      expect(displayData).toMatchObject({
        title: 'Submit Report',
        dueDate: '2026-03-05',
        priority: 'high',
        status: 'pending',
        hasCheckbox: true,
      });
    });
  });
});
