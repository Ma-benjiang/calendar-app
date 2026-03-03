/**
 * Quick Add Hook Tests
 * TDD for AC-005: Quick Add Acceptance Criteria
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuickAdd } from './useQuickAdd';

describe('useQuickAdd', () => {
  const mockOnCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('TC-QCK-001: Keyboard shortcut response time', () => {
    it('should open within 100ms when Cmd/Ctrl+K pressed', () => {
      const startTime = performance.now();
      const { result } = renderHook(() => useQuickAdd({ onCreate: mockOnCreate }));

      act(() => {
        result.current.open();
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.current.isOpen).toBe(true);
    });

    it('should respond to keyboard shortcut', () => {
      const { result } = renderHook(() => useQuickAdd({ onCreate: mockOnCreate }));

      act(() => {
        result.current.handleKeyboardShortcut({ key: 'k', metaKey: true });
      });

      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('TC-QCK-002: Natural language - tomorrow afternoon 3pm', () => {
    it('should parse "tomorrow afternoon 3pm meeting" correctly', () => {
      const { result } = renderHook(() => useQuickAdd({ onCreate: mockOnCreate }));

      act(() => {
        result.current.setInput('明天下午3点开会');
      });

      const parsed = result.current.parsedData;
      expect(parsed.title).toBe('开会');
      expect(parsed.startTime).toMatch(/15:00/);
      expect(parsed.isValid).toBe(true);
    });
  });

  describe('TC-QCK-003: Natural language - next Monday', () => {
    it('should parse "submit report next Monday" correctly', () => {
      const { result } = renderHook(() => useQuickAdd({ onCreate: mockOnCreate }));

      act(() => {
        result.current.setInput('下周一提交报告');
      });

      const parsed = result.current.parsedData;
      expect(parsed.title).toBe('提交报告');
      expect(parsed.dayOfWeek).toBe(1); // Monday
      expect(parsed.isValid).toBe(true);
    });
  });

  describe('TC-QCK-004: Natural language - two hours later', () => {
    it('should parse "eat two hours later" correctly', () => {
      const now = new Date('2026-03-02T12:00:00');
      vi.setSystemTime(now);

      const { result } = renderHook(() => useQuickAdd({ onCreate: mockOnCreate }));

      act(() => {
        result.current.setInput('两小时后吃饭');
      });

      const parsed = result.current.parsedData;
      expect(parsed.title).toBe('吃饭');
      expect(parsed.startTime).toMatch(/14:00/);
      expect(parsed.isValid).toBe(true);
    });
  });

  describe('TC-QCK-005: Natural language - every Wednesday', () => {
    it('should parse "team meeting every Wednesday" correctly', () => {
      const { result } = renderHook(() => useQuickAdd({ onCreate: mockOnCreate }));

      act(() => {
        result.current.setInput('每周三团队会议');
      });

      const parsed = result.current.parsedData;
      expect(parsed.title).toBe('团队会议');
      expect(parsed.recurrence).toBe('weekly');
      expect(parsed.dayOfWeek).toBe(3); // Wednesday
      expect(parsed.isValid).toBe(true);
    });
  });

  describe('TC-QCK-006: Natural language - location extraction', () => {
    it('should extract location from "meeting at Conference Room A at 2pm"', () => {
      const { result } = renderHook(() => useQuickAdd({ onCreate: mockOnCreate }));

      act(() => {
        result.current.setInput('下午2点在会议室A开会');
      });

      const parsed = result.current.parsedData;
      expect(parsed.title).toBe('开会');
      expect(parsed.location).toBe('会议室A');
      expect(parsed.startTime).toMatch(/14:00/);
    });
  });

  describe('TC-QCK-007: Event appears within 500ms after creation', () => {
    it('should call onCreate and close within 500ms', async () => {
      const { result } = renderHook(() => useQuickAdd({ onCreate: mockOnCreate }));

      act(() => {
        result.current.setInput('测试事件');
      });

      const startTime = performance.now();

      await act(async () => {
        await result.current.submit();
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(500);
      expect(mockOnCreate).toHaveBeenCalled();
      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('TC-QCK-008: Click outside to close', () => {
    it('should close when clicking outside the modal', () => {
      const { result } = renderHook(() => useQuickAdd({ onCreate: mockOnCreate }));

      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.handleClickOutside();
      });

      expect(result.current.isOpen).toBe(false);
      expect(mockOnCreate).not.toHaveBeenCalled();
    });
  });

  describe('TC-QCK-009: Press Esc to close', () => {
    it('should close when pressing Escape', () => {
      const { result } = renderHook(() => useQuickAdd({ onCreate: mockOnCreate }));

      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.handleKeyDown({ key: 'Escape' });
      });

      expect(result.current.isOpen).toBe(false);
      expect(mockOnCreate).not.toHaveBeenCalled();
    });
  });

  describe('TC-QCK-010: Sidebar plus button trigger', () => {
    it('should open when triggered from sidebar button', () => {
      const { result } = renderHook(() => useQuickAdd({ onCreate: mockOnCreate }));

      act(() => {
        result.current.open({ source: 'sidebar' });
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.source).toBe('sidebar');
    });
  });

  describe('Natural language parsing variations', () => {
    const testCases = [
      { input: '明天上午10点', expected: { hasTime: true, hour: 10 } },
      { input: '下周三下午3点', expected: { hasTime: true, hour: 15 } },
      { input: '3月15日开会', expected: { hasDate: true, month: 3, day: 15 } },
      { input: '今天下午', expected: { isToday: true, isAfternoon: true } },
      { input: '晚上8点', expected: { hasTime: true, hour: 20 } },
    ];

    testCases.forEach(({ input, expected }) => {
      it(`should parse "${input}" correctly`, () => {
        const { result } = renderHook(() => useQuickAdd({ onCreate: mockOnCreate }));

        act(() => {
          result.current.setInput(input);
        });

        const parsed = result.current.parsedData;
        expect(parsed.isValid).toBe(true);

        if (expected.hasTime) {
          expect(parsed.hour).toBe(expected.hour);
        }
        if (expected.hasDate) {
          expect(parsed.month).toBe(expected.month);
          expect(parsed.day).toBe(expected.day);
        }
      });
    });
  });

  describe('Input validation', () => {
    it('should show error for empty input', () => {
      const { result } = renderHook(() => useQuickAdd({ onCreate: mockOnCreate }));

      act(() => {
        result.current.setInput('');
      });

      expect(result.current.parsedData.isValid).toBe(false);
      expect(result.current.error).toBeDefined();
    });

    it('should accept title-only input with default date', () => {
      const { result } = renderHook(() => useQuickAdd({ onCreate: mockOnCreate }));

      act(() => {
        result.current.setInput('某个时间做某事');
      });

      expect(result.current.parsedData.isValid).toBe(true);
      expect(result.current.parsedData.title).toBe('某个时间做某事');
    });
  });

  describe('Smart suggestions', () => {
    it('should suggest event type based on keywords', () => {
      const { result } = renderHook(() => useQuickAdd({ onCreate: mockOnCreate }));

      act(() => {
        result.current.setInput('开会');
      });

      expect(result.current.suggestions.type).toBe('event');
    });

    it('should suggest task type for todo-like keywords', () => {
      const { result } = renderHook(() => useQuickAdd({ onCreate: mockOnCreate }));

      act(() => {
        result.current.setInput('完成报告');
      });

      expect(result.current.suggestions.type).toBe('task');
    });

    it('should suggest duration based on event type', () => {
      const { result } = renderHook(() => useQuickAdd({ onCreate: mockOnCreate }));

      act(() => {
        result.current.setInput('会议');
      });

      expect(result.current.suggestions.duration).toBe(60); // Default meeting duration
    });
  });

  describe('Form mode fallback', () => {
    it('should switch to form mode for manual entry', () => {
      const { result } = renderHook(() => useQuickAdd({ onCreate: mockOnCreate }));

      act(() => {
        result.current.switchToFormMode();
      });

      expect(result.current.mode).toBe('form');
    });

    it('should allow manual date/time selection in form mode', () => {
      const { result } = renderHook(() => useQuickAdd({ onCreate: mockOnCreate }));

      act(() => {
        result.current.switchToFormMode();
        result.current.setFormValue('title', 'Manual Event');
        result.current.setFormValue('date', '2026-03-15');
        result.current.setFormValue('time', '14:00');
      });

      expect(result.current.formValues.title).toBe('Manual Event');
      expect(result.current.formValues.date).toBe('2026-03-15');
      expect(result.current.formValues.time).toBe('14:00');
    });
  });
});
