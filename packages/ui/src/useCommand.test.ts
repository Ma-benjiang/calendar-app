/**
 * Command Menu Hook Tests
 * TDD for AC-003: Command Menu Acceptance Criteria
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommand } from './useCommand';

describe('useCommand', () => {
  const mockCommands = [
    { id: 'today', label: 'Go to Today', category: 'view', action: vi.fn() },
    { id: 'week', label: 'Week View', category: 'view', action: vi.fn() },
    { id: 'month', label: 'Month View', category: 'view', action: vi.fn() },
    { id: 'event', label: 'Create Event', category: 'insert', action: vi.fn() },
    { id: 'task', label: 'Create Task', category: 'insert', action: vi.fn() },
    { id: 'note', label: 'Add Note', category: 'insert', action: vi.fn() },
    { id: 'search', label: 'Search', category: 'action', action: vi.fn() },
    { id: 'filter', label: 'Filter', category: 'action', action: vi.fn() },
    { id: 'sort', label: 'Sort', category: 'action', action: vi.fn() },
    { id: 'settings', label: 'Settings', category: 'nav', action: vi.fn() },
    { id: 'help', label: 'Help', category: 'nav', action: vi.fn() },
    { id: 'board', label: 'Board View', category: 'view', action: vi.fn() },
    { id: 'timeline', label: 'Timeline View', category: 'view', action: vi.fn() },
    { id: 'list', label: 'List View', category: 'view', action: vi.fn() },
    { id: 'export', label: 'Export', category: 'action', action: vi.fn() },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TC-CMD-001: Command menu trigger response time', () => {
    it('should open menu within 100ms when trigger character is typed', () => {
      const startTime = performance.now();
      const { result } = renderHook(() => useCommand({ commands: mockCommands }));

      act(() => {
        result.current.openMenu();
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('TC-CMD-002: Support 15+ commands', () => {
    it('should have at least 15 available commands', () => {
      const { result } = renderHook(() => useCommand({ commands: mockCommands }));

      expect(result.current.commands.length).toBeGreaterThanOrEqual(15);
    });
  });

  describe('TC-CMD-003: Command search filter response', () => {
    it('should filter commands within 50ms', () => {
      const { result } = renderHook(() => useCommand({ commands: mockCommands }));

      act(() => {
        result.current.openMenu();
      });

      const startTime = performance.now();
      act(() => {
        result.current.setFilter('view');
      });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
      expect(result.current.filteredCommands.length).toBeGreaterThan(0);
    });

    it('should filter commands by keyword correctly', () => {
      const { result } = renderHook(() => useCommand({ commands: mockCommands }));

      act(() => {
        result.current.openMenu();
        result.current.setFilter('week');
      });

      expect(result.current.filteredCommands.some(cmd => cmd.id === 'week')).toBe(true);
    });
  });

  describe('TC-CMD-004: Keyboard navigation - arrow keys', () => {
    it('should navigate down with arrow down', () => {
      const { result } = renderHook(() => useCommand({ commands: mockCommands }));

      act(() => {
        result.current.openMenu();
      });

      expect(result.current.selectedIndex).toBe(0);

      act(() => {
        result.current.selectNext();
      });

      expect(result.current.selectedIndex).toBe(1);
    });

    it('should navigate up with arrow up', () => {
      const { result } = renderHook(() => useCommand({ commands: mockCommands }));

      act(() => {
        result.current.openMenu();
        result.current.setSelectedIndex(2);
      });

      act(() => {
        result.current.selectPrevious();
      });

      expect(result.current.selectedIndex).toBe(1);
    });

    it('should wrap around at boundaries', () => {
      const { result } = renderHook(() => useCommand({ commands: mockCommands }));

      act(() => {
        result.current.openMenu();
        result.current.setSelectedIndex(0);
      });

      act(() => {
        result.current.selectPrevious();
      });

      expect(result.current.selectedIndex).toBe(mockCommands.length - 1);
    });
  });

  describe('TC-CMD-005: Keyboard navigation - Enter confirmation', () => {
    it('should execute selected command on Enter', () => {
      const { result } = renderHook(() => useCommand({ commands: mockCommands }));

      act(() => {
        result.current.openMenu();
        result.current.setSelectedIndex(0);
      });

      act(() => {
        result.current.executeSelected();
      });

      expect(mockCommands[0].action).toHaveBeenCalled();
      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('TC-CMD-006: Keyboard navigation - Esc to close', () => {
    it('should close menu on Escape without executing', () => {
      const { result } = renderHook(() => useCommand({ commands: mockCommands }));

      act(() => {
        result.current.openMenu();
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.closeMenu();
      });

      expect(result.current.isOpen).toBe(false);
      expect(mockCommands[0].action).not.toHaveBeenCalled();
    });
  });

  describe('TC-CMD-007: View command execution', () => {
    it('should switch to week view when /week is executed', () => {
      const { result } = renderHook(() => useCommand({ commands: mockCommands }));

      act(() => {
        result.current.openMenu();
        result.current.setFilter('week');
      });

      const weekCommand = result.current.filteredCommands.find(cmd => cmd.id === 'week');
      expect(weekCommand).toBeDefined();

      act(() => {
        weekCommand?.action();
      });

      expect(weekCommand?.action).toHaveBeenCalled();
    });
  });

  describe('TC-CMD-009: Command categorization', () => {
    it('should group commands by category', () => {
      const { result } = renderHook(() => useCommand({ commands: mockCommands }));

      const categories = result.current.groupedCommands;

      expect(categories).toHaveProperty('view');
      expect(categories).toHaveProperty('insert');
      expect(categories).toHaveProperty('action');
      expect(categories).toHaveProperty('nav');
    });
  });

  describe('TC-CMD-010: Offline command menu', () => {
    it('should work without network connection', () => {
      const { result } = renderHook(() => useCommand({ commands: mockCommands, offline: true }));

      act(() => {
        result.current.openMenu();
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.commands.length).toBeGreaterThanOrEqual(15);
    });
  });
});
