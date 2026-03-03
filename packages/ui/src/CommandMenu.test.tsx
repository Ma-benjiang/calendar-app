/**
 * Command Menu Component Tests
 * TDD for AC-003: Command Menu UI
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandMenu } from './CommandMenu';

interface DialogProps { children: React.ReactNode; [key: string]: unknown }
interface InputProps { [key: string]: unknown }
interface ListProps { children: React.ReactNode }
interface GroupProps { children: React.ReactNode; heading?: string }
interface ItemProps { children: React.ReactNode; onSelect?: () => void; [key: string]: unknown }
interface EmptyProps { children: React.ReactNode }

// Mock cmdk
vi.mock('cmdk', () => ({
  Command: {
    Dialog: ({ children, ...props }: DialogProps) => (
      <div role="dialog" {...props}>{children}</div>
    ),
    Input: (props: InputProps) => <input {...props} />,
    List: ({ children }: ListProps) => <div>{children}</div>,
    Group: ({ children, heading }: GroupProps) => (
      <div role="group" aria-label={heading}>{children}</div>
    ),
    Item: ({ children, onSelect, ...props }: ItemProps) => (
      <div role="option" onClick={onSelect} {...props}>{children}</div>
    ),
    Empty: ({ children }: EmptyProps) => <div>{children}</div>,
  },
}));

describe('CommandMenu', () => {
  const mockCommands = [
    { id: 'today', label: 'Go to Today', category: 'view', shortcut: 'T', action: vi.fn() },
    { id: 'week', label: 'Week View', category: 'view', shortcut: 'W', action: vi.fn() },
    { id: 'month', label: 'Month View', category: 'view', shortcut: 'M', action: vi.fn() },
    { id: 'event', label: 'Create Event', category: 'insert', shortcut: 'E', action: vi.fn() },
    { id: 'task', label: 'Create Task', category: 'insert', shortcut: 'K', action: vi.fn() },
    { id: 'search', label: 'Search', category: 'action', shortcut: 'S', action: vi.fn() },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    commands: mockCommands,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TC-CMD-001: Command menu trigger', () => {
    it('should render when isOpen is true', () => {
      render(<CommandMenu {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<CommandMenu {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('TC-CMD-002: Support 15+ commands', () => {
    it('should display all available commands', () => {
      render(<CommandMenu {...defaultProps} />);

      mockCommands.forEach(cmd => {
        expect(screen.getByText(cmd.label)).toBeInTheDocument();
      });
    });

    it('should display at least 15 commands when provided', () => {
      const manyCommands = Array.from({ length: 20 }, (_, i) => ({
        id: `cmd-${i}`,
        label: `Command ${i}`,
        category: i < 5 ? 'view' : i < 10 ? 'insert' : 'action',
        action: vi.fn(),
      }));

      render(<CommandMenu {...defaultProps} commands={manyCommands} />);

      manyCommands.forEach(cmd => {
        expect(screen.getByText(cmd.label)).toBeInTheDocument();
      });
    });
  });

  describe('TC-CMD-003: Command search filter', () => {
    it('should filter commands when typing', async () => {
      const user = userEvent.setup();
      render(<CommandMenu {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.type(input, 'week');

      await waitFor(() => {
        expect(screen.getByText('Week View')).toBeInTheDocument();
      });
    });

    it('should show empty state when no commands match', async () => {
      const user = userEvent.setup();
      render(<CommandMenu {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.type(input, 'xyz123');

      await waitFor(() => {
        expect(screen.getByText(/no results/i)).toBeInTheDocument();
      });
    });
  });

  describe('TC-CMD-004: Keyboard navigation', () => {
    it('should support arrow key navigation', async () => {
      const user = userEvent.setup();
      render(<CommandMenu {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.click(input);

      // Press arrow down
      await user.keyboard('{ArrowDown}');

      // First item should be focused
      const items = screen.getAllByRole('option');
      expect(items[0]).toHaveAttribute('data-selected', 'true');
    });

    it('should support Enter to select', async () => {
      const user = userEvent.setup();
      render(<CommandMenu {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.click(input);
      await user.keyboard('{Enter}');

      expect(mockCommands[0].action).toHaveBeenCalled();
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

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('TC-CMD-009: Command categorization', () => {
    it('should group commands by category', () => {
      render(<CommandMenu {...defaultProps} />);

      const viewGroup = screen.getByRole('group', { name: /view/i });
      const insertGroup = screen.getByRole('group', { name: /insert/i });
      const actionGroup = screen.getByRole('group', { name: /action/i });

      expect(viewGroup).toBeInTheDocument();
      expect(insertGroup).toBeInTheDocument();
      expect(actionGroup).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<CommandMenu {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-label', 'Command menu');
    });

    it('should have search input with correct attributes', () => {
      render(<CommandMenu {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      expect(input).toHaveAttribute('aria-label', 'Search commands');
    });

    it('should support keyboard-only operation', async () => {
      const user = userEvent.setup();
      render(<CommandMenu {...defaultProps} />);

      // Tab to focus input
      await user.tab();

      // Type to filter
      await user.keyboard('week');

      // Press Enter to select
      await user.keyboard('{Enter}');

      expect(mockCommands.find(c => c.id === 'week')?.action).toHaveBeenCalled();
    });
  });

  describe('Visual feedback', () => {
    it('should show keyboard shortcuts', () => {
      render(<CommandMenu {...defaultProps} />);

      mockCommands.forEach(cmd => {
        if (cmd.shortcut) {
          expect(screen.getByText(cmd.shortcut)).toBeInTheDocument();
        }
      });
    });

    it('should highlight selected item', async () => {
      const user = userEvent.setup();
      render(<CommandMenu {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.click(input);
      await user.keyboard('{ArrowDown}');

      const items = screen.getAllByRole('option');
      expect(items[0]).toHaveClass('selected');
    });
  });

  describe('Performance', () => {
    it('should render within 100ms', async () => {
      const startTime = performance.now();

      render(<CommandMenu {...defaultProps} />);

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should filter within 50ms', async () => {
      const user = userEvent.setup();
      render(<CommandMenu {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.click(input);

      const startTime = performance.now();
      await user.type(input, 'week');
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
    });
  });
});
