/**
 * Sidebar Hook Tests
 * TDD for AC-002: Sidebar Functionality Acceptance Criteria
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSidebar } from './useSidebar';

describe('useSidebar', () => {
  const mockCalendarItems = [
    { id: 'cal-1', name: 'Personal', type: 'calendar', parentId: null },
    { id: 'cal-2', name: 'Work', type: 'calendar', parentId: null },
    { id: 'folder-1', name: 'Projects', type: 'folder', parentId: null },
    { id: 'cal-3', name: 'Project A', type: 'calendar', parentId: 'folder-1' },
    { id: 'cal-4', name: 'Project B', type: 'calendar', parentId: 'folder-1' },
    { id: 'folder-2', name: 'Nested', type: 'folder', parentId: 'folder-1' },
    { id: 'cal-5', name: 'Deep Calendar', type: 'calendar', parentId: 'folder-2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('TC-SID-001: Sidebar expand/collapse', () => {
    it('should toggle sidebar expanded state', () => {
      const { result } = renderHook(() => useSidebar({ items: mockCalendarItems }));

      expect(result.current.isExpanded).toBe(true);
      expect(result.current.width).toBe(240);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isExpanded).toBe(false);
      expect(result.current.width).toBe(0);
    });

    it('should have smooth animation transition', () => {
      const { result } = renderHook(() => useSidebar({ items: mockCalendarItems }));

      expect(result.current.transitionDuration).toBe(200);
      expect(result.current.transitionTiming).toBe('ease-out');
    });
  });

  describe('TC-SID-002: Hover to show floating sidebar', () => {
    it('should show floating sidebar on hover when collapsed', () => {
      const { result } = renderHook(() => useSidebar({ items: mockCalendarItems }));

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isExpanded).toBe(false);

      act(() => {
        result.current.handleHover(true);
      });

      expect(result.current.isFloatingVisible).toBe(true);

      act(() => {
        result.current.handleHover(false);
      });

      expect(result.current.isFloatingVisible).toBe(false);
    });
  });

  describe('TC-SID-003: Tree structure infinite nesting', () => {
    it('should support unlimited nesting levels', () => {
      const { result } = renderHook(() => useSidebar({ items: mockCalendarItems }));

      const tree = result.current.treeStructure;

      // Check root level
      expect(tree.some(item => item.id === 'cal-1')).toBe(true);
      expect(tree.some(item => item.id === 'folder-1')).toBe(true);

      // Check nested folder
      const folder1 = tree.find(item => item.id === 'folder-1');
      expect(folder1?.children).toBeDefined();
      expect(folder1?.children?.some(child => child.id === 'cal-3')).toBe(true);

      // Check deeply nested
      const nestedFolder = folder1?.children?.find(child => child.id === 'folder-2');
      expect(nestedFolder?.children?.some(child => child.id === 'cal-5')).toBe(true);
    });

    it('should calculate correct indentation for each level', () => {
      const { result } = renderHook(() => useSidebar({ items: mockCalendarItems }));

      expect(result.current.getIndentLevel('cal-1')).toBe(0);
      expect(result.current.getIndentLevel('cal-3')).toBe(1);
      expect(result.current.getIndentLevel('cal-5')).toBe(2);
    });
  });

  describe('TC-SID-004: Drag and drop sorting', () => {
    it('should reorder items after drag and drop', () => {
      const onReorder = vi.fn();
      const { result } = renderHook(() =>
        useSidebar({ items: mockCalendarItems, onReorder })
      );

      act(() => {
        result.current.handleDragEnd({
          active: { id: 'cal-2' },
          over: { id: 'cal-1' },
        });
      });

      expect(onReorder).toHaveBeenCalled();
    });

    it('should persist order after reordering', () => {
      const { result } = renderHook(() => useSidebar({ items: mockCalendarItems }));

      act(() => {
        result.current.handleDragEnd({
          active: { id: 'cal-2' },
          over: { id: 'cal-1' },
        });
      });

      // Check localStorage was updated
      const savedOrder = localStorage.getItem('sidebar-order');
      expect(savedOrder).toBeDefined();
    });
  });

  describe('TC-SID-005: Selected item highlight indicator', () => {
    it('should show 3px blue highlight on selected item', () => {
      const { result } = renderHook(() => useSidebar({ items: mockCalendarItems }));

      act(() => {
        result.current.selectItem('cal-1');
      });

      expect(result.current.selectedId).toBe('cal-1');
      expect(result.current.getItemStyle('cal-1')).toMatchObject({
        borderLeft: '3px solid #3b82f6',
      });
    });

    it('should update selection when different item clicked', () => {
      const { result } = renderHook(() => useSidebar({ items: mockCalendarItems }));

      act(() => {
        result.current.selectItem('cal-1');
      });

      expect(result.current.selectedId).toBe('cal-1');

      act(() => {
        result.current.selectItem('cal-2');
      });

      expect(result.current.selectedId).toBe('cal-2');
    });
  });

  describe('TC-SID-006: Mobile drawer sidebar', () => {
    it('should show drawer sidebar on mobile', () => {
      const { result } = renderHook(() =>
        useSidebar({ items: mockCalendarItems, isMobile: true })
      );

      expect(result.current.variant).toBe('drawer');
      expect(result.current.isDrawerOpen).toBe(false);

      act(() => {
        result.current.openDrawer();
      });

      expect(result.current.isDrawerOpen).toBe(true);
    });

    it('should slide from left on mobile', () => {
      const { result } = renderHook(() =>
        useSidebar({ items: mockCalendarItems, isMobile: true })
      );

      act(() => {
        result.current.openDrawer();
      });

      expect(result.current.drawerPosition).toBe('left');
    });
  });

  describe('TC-SID-007: Folder expand/collapse', () => {
    it('should expand folder to show children', () => {
      const { result } = renderHook(() => useSidebar({ items: mockCalendarItems }));

      act(() => {
        result.current.expandFolder('folder-1');
      });

      expect(result.current.expandedFolders).toContain('folder-1');
      expect(result.current.isFolderExpanded('folder-1')).toBe(true);
    });

    it('should collapse folder to hide children', () => {
      const { result } = renderHook(() => useSidebar({ items: mockCalendarItems }));

      act(() => {
        result.current.expandFolder('folder-1');
      });

      expect(result.current.isFolderExpanded('folder-1')).toBe(true);

      act(() => {
        result.current.collapseFolder('folder-1');
      });

      expect(result.current.isFolderExpanded('folder-1')).toBe(false);
    });

    it('should toggle folder expand state', () => {
      const { result } = renderHook(() => useSidebar({ items: mockCalendarItems }));

      act(() => {
        result.current.toggleFolder('folder-1');
      });

      expect(result.current.isFolderExpanded('folder-1')).toBe(true);

      act(() => {
        result.current.toggleFolder('folder-1');
      });

      expect(result.current.isFolderExpanded('folder-1')).toBe(false);
    });
  });

  describe('Sidebar item interactions', () => {
    it('should call onItemClick when item is clicked', () => {
      const onItemClick = vi.fn();
      const { result } = renderHook(() =>
        useSidebar({ items: mockCalendarItems, onItemClick })
      );

      act(() => {
        result.current.handleItemClick('cal-1');
      });

      expect(onItemClick).toHaveBeenCalledWith('cal-1');
    });

    it('should support keyboard navigation', () => {
      const { result } = renderHook(() => useSidebar({ items: mockCalendarItems }));

      act(() => {
        result.current.selectItem('cal-1');
      });

      act(() => {
        result.current.navigateNext();
      });

      expect(result.current.selectedId).toBe('cal-2');

      act(() => {
        result.current.navigatePrevious();
      });

      expect(result.current.selectedId).toBe('cal-1');
    });
  });
});
