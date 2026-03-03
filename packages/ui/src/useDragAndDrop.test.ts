/**
 * Drag and Drop Hook Tests
 * TDD for AC-004: Modular Layout Acceptance Criteria
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDragAndDrop } from './useDragAndDrop';

describe('useDragAndDrop', () => {
  const mockItems = [
    { id: 'event-1', title: 'Meeting', startTime: '2026-03-02T10:00:00', duration: 60 },
    { id: 'event-2', title: 'Lunch', startTime: '2026-03-02T12:00:00', duration: 30 },
    { id: 'event-3', title: 'Review', startTime: '2026-03-02T14:00:00', duration: 45 },
    { id: 'task-1', title: 'Submit report', dueDate: '2026-03-02', priority: 'high' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TC-VIE-006: Block drag visual feedback', () => {
    it('should show semi-transparent state when dragging', () => {
      const { result } = renderHook(() => useDragAndDrop({ items: mockItems }));

      act(() => {
        result.current.startDrag('event-1');
      });

      expect(result.current.dragState.isDragging).toBe(true);
      expect(result.current.dragState.draggedId).toBe('event-1');
      expect(result.current.getItemStyle('event-1')).toMatchObject({
        opacity: 0.5,
        boxShadow: expect.stringContaining('rgba'),
      });
    });

    it('should show drop preview indicator', () => {
      const { result } = renderHook(() => useDragAndDrop({ items: mockItems }));

      act(() => {
        result.current.startDrag('event-1');
        result.current.setDropTarget('event-2');
      });

      expect(result.current.dropTarget).toBe('event-2');
      expect(result.current.showDropIndicator).toBe(true);
    });

    it('should clear drag state on drop', () => {
      const onDrop = vi.fn();
      const { result } = renderHook(() =>
        useDragAndDrop({ items: mockItems, onDrop })
      );

      act(() => {
        result.current.startDrag('event-1');
        result.current.setDropTarget('event-2');
      });

      act(() => {
        result.current.endDrag();
      });

      expect(result.current.dragState.isDragging).toBe(false);
      expect(onDrop).toHaveBeenCalled();
    });
  });

  describe('Drag to change event time', () => {
    it('should update event time when dropped on different time slot', () => {
      const onTimeChange = vi.fn();
      const { result } = renderHook(() =>
        useDragAndDrop({ items: mockItems, onTimeChange })
      );

      act(() => {
        result.current.handleEventDrop({
          eventId: 'event-1',
          newStartTime: '2026-03-02T15:00:00',
          newDate: '2026-03-02',
        });
      });

      expect(onTimeChange).toHaveBeenCalledWith({
        eventId: 'event-1',
        newStartTime: '2026-03-02T15:00:00',
        newDate: '2026-03-02',
      });
    });

    it('should support cross-date drag', () => {
      const onTimeChange = vi.fn();
      const { result } = renderHook(() =>
        useDragAndDrop({ items: mockItems, onTimeChange })
      );

      act(() => {
        result.current.handleEventDrop({
          eventId: 'event-1',
          newStartTime: '2026-03-03T10:00:00',
          newDate: '2026-03-03',
        });
      });

      expect(onTimeChange).toHaveBeenCalledWith(expect.objectContaining({
        newDate: '2026-03-03',
      }));
    });
  });

  describe('Drag to change event duration', () => {
    it('should update duration when resizing', () => {
      const onDurationChange = vi.fn();
      const { result } = renderHook(() =>
        useDragAndDrop({ items: mockItems, onDurationChange })
      );

      act(() => {
        result.current.handleResize({
          eventId: 'event-1',
          newDuration: 90,
        });
      });

      expect(onDurationChange).toHaveBeenCalledWith({
        eventId: 'event-1',
        newDuration: 90,
      });
    });

    it('should show resize handle on hover', () => {
      const { result } = renderHook(() => useDragAndDrop({ items: mockItems }));

      act(() => {
        result.current.setHoveredItem('event-1');
      });

      expect(result.current.hoveredItem).toBe('event-1');
      expect(result.current.showResizeHandle('event-1')).toBe(true);
    });
  });

  describe('Drag sorting', () => {
    it('should reorder items after drag sort', () => {
      const onReorder = vi.fn();
      const { result } = renderHook(() =>
        useDragAndDrop({ items: mockItems, onReorder })
      );

      act(() => {
        result.current.handleSortEnd({
          active: { id: 'event-1' },
          over: { id: 'event-3' },
        });
      });

      expect(onReorder).toHaveBeenCalled();
    });

    it('should calculate new order correctly', () => {
      const { result } = renderHook(() => useDragAndDrop({ items: mockItems }));

      const newOrder = result.current.calculateNewOrder({
        activeId: 'event-1',
        overId: 'event-3',
      });

      expect(newOrder).toEqual(['event-2', 'event-3', 'event-1', 'task-1']);
    });
  });

  describe('Invalid drop handling', () => {
    it('should show forbidden feedback for invalid drop target', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({ items: mockItems, validateDrop: () => false })
      );

      act(() => {
        result.current.startDrag('event-1');
        result.current.setDropTarget('invalid-target');
      });

      expect(result.current.isValidDrop).toBe(false);
      expect(result.current.getDropIndicatorStyle()).toMatchObject({
        borderColor: 'red',
      });
    });

    it('should restore original position on invalid drop', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({ items: mockItems, validateDrop: () => false })
      );

      act(() => {
        result.current.startDrag('event-1');
        result.current.setDropTarget('invalid-target');
        result.current.endDrag();
      });

      expect(result.current.items[0].id).toBe('event-1');
    });
  });

  describe('Touch gesture support', () => {
    it('should support long press to start drag on mobile', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({ items: mockItems, isMobile: true })
      );

      act(() => {
        result.current.handleLongPress('event-1');
      });

      expect(result.current.dragState.isDragging).toBe(true);
    });

    it('should handle touch move events', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({ items: mockItems, isMobile: true })
      );

      act(() => {
        result.current.handleTouchStart({ id: 'event-1', x: 100, y: 100 });
      });

      act(() => {
        result.current.handleTouchMove({ x: 150, y: 150 });
      });

      expect(result.current.dragState.currentPosition).toEqual({ x: 150, y: 150 });
    });
  });

  describe('Accessibility', () => {
    it('should support keyboard drag operations', () => {
      const { result } = renderHook(() => useDragAndDrop({ items: mockItems }));

      act(() => {
        result.current.handleKeyboardDrag({
          eventId: 'event-1',
          direction: 'down',
        });
      });

      expect(result.current.dragState.isDragging).toBe(true);
    });

    it('should announce drag operations to screen readers', () => {
      const { result } = renderHook(() => useDragAndDrop({ items: mockItems }));

      act(() => {
        result.current.startDrag('event-1');
      });

      expect(result.current.ariaLiveText).toContain('Dragging');
    });
  });
});
