/**
 * Quick Add Hook
 * Manages quick event creation with natural language parsing
 * AC-005: Quick Add Acceptance Criteria
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { parseNaturalInput, ParsedResult } from './NaturalInput';

export type QuickAddMode = 'natural' | 'form';
export type QuickAddSource = 'sidebar' | 'keyboard' | 'command';

export interface QuickAddFormValues {
  title: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  description: string;
  type: 'event' | 'task';
}

export interface QuickAddSuggestions {
  type: 'event' | 'task' | null;
  duration: number | null;
}

interface UseQuickAddOptions {
  onCreate: (data: {
    title: string;
    startTime: string;
    endTime?: string;
    location?: string;
    description?: string;
    type: 'event' | 'task';
  }) => void | Promise<void>;
}

interface UseQuickAddReturn {
  // State
  isOpen: boolean;
  mode: QuickAddMode;
  input: string;
  source: QuickAddSource | null;
  parsedData: ParsedResult;
  formValues: QuickAddFormValues;
  suggestions: QuickAddSuggestions;
  error: string | null;

  // Actions
  open: (options?: { source?: QuickAddSource }) => void;
  close: () => void;
  setInput: (input: string) => void;
  setFormValue: (field: keyof QuickAddFormValues, value: string | number) => void;
  switchToFormMode: () => void;
  switchToNaturalMode: () => void;
  submit: () => Promise<void>;
  handleKeyboardShortcut: (event: { key: string; metaKey?: boolean; ctrlKey?: boolean }) => void;
  handleClickOutside: () => void;
  handleKeyDown: (event: { key: string }) => void;
}

const DEFAULT_FORM_VALUES: QuickAddFormValues = {
  title: '',
  date: '',
  time: '',
  duration: 60,
  location: '',
  description: '',
  type: 'event',
};

export function useQuickAdd(options: UseQuickAddOptions): UseQuickAddReturn {
  const { onCreate } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<QuickAddMode>('natural');
  const [input, setInputState] = useState('');
  const [source, setSource] = useState<QuickAddSource | null>(null);
  const [formValues, setFormValues] = useState<QuickAddFormValues>(DEFAULT_FORM_VALUES);
  const [error, setError] = useState<string | null>(null);

  // Parse natural input
  const parsedData = useMemo(() => {
    if (!input.trim()) {
      return {
        isValid: false,
        title: '',
        confidence: 0,
      } as ParsedResult;
    }
    return parseNaturalInput(input);
  }, [input]);

  // Generate suggestions
  const suggestions = useMemo((): QuickAddSuggestions => {
    const lowerInput = input.toLowerCase();

    // Detect type based on keywords
    let type: 'event' | 'task' | null = null;
    const eventKeywords = ['会议', '开会', 'meeting', 'call', 'call', '讨论', 'review'];
    const taskKeywords = ['完成', '提交', 'submit', 'finish', 'do', 'make', '准备'];

    if (eventKeywords.some(kw => lowerInput.includes(kw))) {
      type = 'event';
    } else if (taskKeywords.some(kw => lowerInput.includes(kw))) {
      type = 'task';
    }

    // Suggest duration based on type
    let duration: number | null = null;
    if (type === 'event') {
      duration = 60; // Default meeting duration
    } else if (type === 'task') {
      duration = null; // Tasks don't have duration
    }

    return { type, duration };
  }, [input]);

  // Update error state based on parsed data
  useEffect(() => {
    if (input.trim() && !parsedData.isValid) {
      setError('无法解析输入，请尝试其他表达方式');
    } else {
      setError(null);
    }
  }, [input, parsedData]);

  const open = useCallback((options?: { source?: QuickAddSource }) => {
    setIsOpen(true);
    setMode('natural');
    setInputState('');
    setFormValues(DEFAULT_FORM_VALUES);
    setError(null);
    setSource(options?.source || null);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setInputState('');
    setError(null);
    setSource(null);
  }, []);

  const setInput = useCallback((newInput: string) => {
    setInputState(newInput);
  }, []);

  const setFormValue = useCallback((field: keyof QuickAddFormValues, value: string | number) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const switchToFormMode = useCallback(() => {
    setMode('form');
    // Pre-fill form with parsed data if available
    if (parsedData.isValid) {
      setFormValues(prev => ({
        ...prev,
        title: parsedData.title || prev.title,
        date: parsedData.date || prev.date,
        time: parsedData.startTime?.split('T')[1]?.slice(0, 5) || prev.time,
        duration: parsedData.duration || prev.duration,
        location: parsedData.location || prev.location,
      }));
    }
  }, [parsedData]);

  const switchToNaturalMode = useCallback(() => {
    setMode('natural');
  }, []);

  const submit = useCallback(async () => {
    if (mode === 'natural') {
      if (!parsedData.isValid) {
        setError('请输入有效的事件信息');
        return;
      }

      const startTime = parsedData.startTime ||
        (parsedData.date ? `${parsedData.date}T09:00:00` : new Date().toISOString());

      const endTime = parsedData.endTime ||
        (parsedData.duration
          ? new Date(new Date(startTime).getTime() + parsedData.duration * 60000).toISOString()
          : undefined);

      await onCreate({
        title: parsedData.title || '未命名事件',
        startTime,
        endTime,
        location: parsedData.location,
        description: parsedData.description,
        type: suggestions.type || 'event',
      });
    } else {
      // Form mode
      if (!formValues.title.trim()) {
        setError('请输入标题');
        return;
      }

      const date = formValues.date || new Date().toISOString().split('T')[0];
      const time = formValues.time || '09:00';
      const startTime = `${date}T${time}:00`;

      const endTime = formValues.duration
        ? new Date(new Date(startTime).getTime() + formValues.duration * 60000).toISOString()
        : undefined;

      await onCreate({
        title: formValues.title,
        startTime,
        endTime,
        location: formValues.location || undefined,
        description: formValues.description || undefined,
        type: formValues.type,
      });
    }

    close();
  }, [mode, parsedData, formValues, suggestions.type, onCreate, close]);

  const handleKeyboardShortcut = useCallback((event: { key: string; metaKey?: boolean; ctrlKey?: boolean }) => {
    if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
      open({ source: 'keyboard' });
    }
  }, [open]);

  const handleClickOutside = useCallback(() => {
    close();
  }, [close]);

  const handleKeyDown = useCallback((event: { key: string }) => {
    if (event.key === 'Escape') {
      close();
    }
  }, [close]);

  return {
    // State
    isOpen,
    mode,
    input,
    source,
    parsedData,
    formValues,
    suggestions,
    error,

    // Actions
    open,
    close,
    setInput,
    setFormValue,
    switchToFormMode,
    switchToNaturalMode,
    submit,
    handleKeyboardShortcut,
    handleClickOutside,
    handleKeyDown,
  };
}
