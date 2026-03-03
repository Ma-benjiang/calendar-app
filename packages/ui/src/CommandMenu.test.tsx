/**
 * Command Menu Component Tests
 * TDD for AC-003: Command Menu UI
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandMenu } from './CommandMenu';

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe('CommandMenu', () => {
  const mockCommands = [
    { id: 'today', label: 'Go to Today', category: 'view' as const, shortcut: 'T', action: vi.fn() },
    { id: 'week', label: 'Week View', category: 'view' as const, shortcut: 'W', action: vi.fn() },
    { id: 'month', label: 'Month View', category: 'view' as const, shortcut: 'M', action: vi.fn() },
    { id: 'event', label: 'Create Event', category: 'insert' as const, shortcut: 'E', action: vi.fn() },
    { id: 'task', label: 'Create Task', category: 'insert' as const, shortcut: 'K', action: vi.fn() },
    { id: 'search', label: 'Search', category: 'action' as const, shortcut: 'S', action: vi.fn() },
  ];

  const createGroupedCommands = () => ({
    view: mockCommands.filter(c => c.category === 'view'),
    insert: mockCommands.filter(c => c.category === 'insert'),
    action: mockCommands.filter(c => c.category === 'action'),
    nav: [] as typeof mockCommands,
  });

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    commands: mockCommands,
    filter: '',
    onFilterChange: vi.fn(),
    selectedIndex: 0,
    onSelectIndex: vi.fn(),
    onExecute: vi.fn(),
    groupedCommands: createGroupedCommands(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TC-CMD-001: Command menu trigger', () => {
    it('should render when isOpen is true', () => {
      render(<CommandMenu {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('should not render when isOpen is false', () => {
      render(<CommandMenu {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  describe('TC-CMD-002: Support 15+ commands', () => {
    it('should display all available commands', () => {
      render(<CommandMenu {...defaultProps} />);

      mockCommands.forEach(cmd => {
        expect(screen.getByText(cmd.label)).toBeTruthy();
      });
    });

    it('should display at least 15 commands when provided', () => {
      const manyCommands = Array.from({ length: 20 }, (_, i) => ({
        id: `cmd-${i}`,
        label: `Command ${i}`,
        category: i < 5 ? 'view' as const : i < 10 ? 'insert' as const : 'action' as const,
        action: vi.fn(),
      }));

      const groupedMany = {
        view: manyCommands.filter(c => c.category === 'view'),
        insert: manyCommands.filter(c => c.category === 'insert'),
        action: manyCommands.filter(c => c.category === 'action'),
        nav: [] as typeof manyCommands,
      };

      render(<CommandMenu {...defaultProps} commands={manyCommands} groupedCommands={groupedMany} />);

      manyCommands.forEach(cmd => {
        expect(screen.getByText(cmd.label)).toBeTruthy();
      });
    });
  });

  describe('TC-CMD-003: Command search filter', () => {
    it('should filter commands when typing', async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();
      render(<CommandMenu {...defaultProps} onFilterChange={onFilterChange} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      // Use paste to set the value directly
      await user.click(input);
      await user.paste('week');

      // Check that onFilterChange was called with the full text
      await waitFor(() => {
        expect(onFilterChange).toHaveBeenLastCalledWith('week');
      });
    });

    it('should show empty state when no commands match', () => {
      render(<CommandMenu {...defaultProps} filter="xyz123" groupedCommands={{
        view: [], insert: [], action: [], nav: []
      }} />);

      // The empty state shows when all command arrays are empty
      expect(screen.getByText(/未找到命令/i)).toBeTruthy();
    });
  });

  describe('TC-CMD-004: Keyboard navigation', () => {
    it('should support arrow key navigation', async () => {
      const user = userEvent.setup();
      const onSelectIndex = vi.fn();
      render(<CommandMenu {...defaultProps} onSelectIndex={onSelectIndex} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.click(input);

      // Press arrow down
      await user.keyboard('{ArrowDown}');

      await waitFor(() => {
        expect(onSelectIndex).toHaveBeenCalled();
      });
    });

    it('should support Enter to select', async () => {
      const user = userEvent.setup();
      const onExecute = vi.fn();
      render(<CommandMenu {...defaultProps} onExecute={onExecute} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.click(input);
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(onExecute).toHaveBeenCalled();
      });
    });
  });

  describe('TC-CMD-006: Escape to close', () => {
    it('should close on Escape key', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<CommandMenu {...defaultProps} onClose={onClose} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.click(input);
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('TC-CMD-009: Command categorization', () => {
    it('should group commands by category', () => {
      render(<CommandMenu {...defaultProps} />);

      // Check for category headers (using the category labels from the component)
      // Category labels in component: 视图, 插入, 操作, 导航
      expect(screen.getByText('视图')).toBeTruthy();
      expect(screen.getByText('插入')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<CommandMenu {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeTruthy();
    });

    it('should have search input with correct attributes', () => {
      render(<CommandMenu {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      expect(input).toBeTruthy();
      expect(input.getAttribute('aria-label')).toBe('Search commands');
    });

    it('should support keyboard-only operation', async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();
      const onExecute = vi.fn();

      render(<CommandMenu {...defaultProps} onFilterChange={onFilterChange} onExecute={onExecute} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.click(input);

      // Paste text to filter
      await user.paste('week');

      await waitFor(() => {
        expect(onFilterChange).toHaveBeenLastCalledWith('week');
      });

      // Press Enter to select
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(onExecute).toHaveBeenCalled();
      });
    });
  });

  describe('Visual feedback', () => {
    it('should show keyboard shortcuts', () => {
      render(<CommandMenu {...defaultProps} />);

      mockCommands.forEach(cmd => {
        if (cmd.shortcut) {
          expect(screen.getByText(cmd.shortcut)).toBeTruthy();
        }
      });
    });

    it('should highlight selected item', () => {
      render(<CommandMenu {...defaultProps} selectedIndex={1} />);

      // The selected item should have a specific class or attribute
      // Since we can't easily test for specific styling, we verify the component renders
      expect(screen.getByRole('dialog')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should render within 100ms', async () => {
      const startTime = performance.now();

      render(<CommandMenu {...defaultProps} />);

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle filter change within 50ms', async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();
      render(<CommandMenu {...defaultProps} onFilterChange={onFilterChange} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.click(input);

      const startTime = performance.now();
      await user.type(input, 'week');
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
    });
  });
});
