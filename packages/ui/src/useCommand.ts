/**
 * Command Menu Hook
 * Manages command menu state, filtering, and keyboard navigation
 * AC-003: Command Menu Acceptance Criteria
 */
import { useState, useCallback, useMemo, useEffect } from 'react';

export interface Command {
  id: string;
  label: string;
  category: 'view' | 'insert' | 'action' | 'nav';
  shortcut?: string;
  icon?: string;
  action: () => void;
}

interface UseCommandOptions {
  commands: Command[];
  offline?: boolean;
}

interface GroupedCommands {
  view: Command[];
  insert: Command[];
  action: Command[];
  nav: Command[];
}

interface UseCommandReturn {
  // State
  isOpen: boolean;
  commands: Command[];
  filteredCommands: Command[];
  selectedIndex: number;
  filter: string;
  groupedCommands: GroupedCommands;

  // Actions
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
  setFilter: (filter: string) => void;
  setSelectedIndex: (index: number) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  executeSelected: () => void;
  executeCommand: (id: string) => void;
}

export function useCommand(options: UseCommandOptions): UseCommandReturn {
  const { commands } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilterState] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter commands based on input
  const filteredCommands = useMemo(() => {
    if (!filter.trim()) return commands;

    const lowerFilter = filter.toLowerCase();
    return commands.filter(cmd =>
      cmd.label.toLowerCase().includes(lowerFilter) ||
      cmd.id.toLowerCase().includes(lowerFilter) ||
      cmd.category.toLowerCase().includes(lowerFilter)
    );
  }, [commands, filter]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const grouped: GroupedCommands = {
      view: [],
      insert: [],
      action: [],
      nav: [],
    };

    filteredCommands.forEach(cmd => {
      grouped[cmd.category].push(cmd);
    });

    return grouped;
  }, [filteredCommands]);

  // Reset selected index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Ensure selected index is valid
  useEffect(() => {
    if (filteredCommands.length === 0) {
      setSelectedIndex(0);
    } else if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(filteredCommands.length - 1);
    }
  }, [filteredCommands.length, selectedIndex]);

  const openMenu = useCallback(() => {
    setIsOpen(true);
    setFilterState('');
    setSelectedIndex(0);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setFilterState('');
  }, []);

  const toggleMenu = useCallback(() => {
    setIsOpen(prev => !prev);
    if (isOpen) {
      setFilterState('');
    } else {
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const setFilter = useCallback((newFilter: string) => {
    setFilterState(newFilter);
  }, []);

  const selectNext = useCallback(() => {
    setSelectedIndex(prev => {
      if (filteredCommands.length === 0) return 0;
      return prev >= filteredCommands.length - 1 ? 0 : prev + 1;
    });
  }, [filteredCommands.length]);

  const selectPrevious = useCallback(() => {
    setSelectedIndex(prev => {
      if (filteredCommands.length === 0) return 0;
      return prev <= 0 ? filteredCommands.length - 1 : prev - 1;
    });
  }, [filteredCommands.length]);

  const executeSelected = useCallback(() => {
    if (filteredCommands.length === 0) return;
    const command = filteredCommands[selectedIndex];
    if (command) {
      command.action();
      closeMenu();
    }
  }, [filteredCommands, selectedIndex, closeMenu]);

  const executeCommand = useCallback((id: string) => {
    const command = commands.find(cmd => cmd.id === id);
    if (command) {
      command.action();
      closeMenu();
    }
  }, [commands, closeMenu]);

  return {
    // State
    isOpen,
    commands,
    filteredCommands,
    selectedIndex,
    filter,
    groupedCommands,

    // Actions
    openMenu,
    closeMenu,
    toggleMenu,
    setFilter,
    setSelectedIndex,
    selectNext,
    selectPrevious,
    executeSelected,
    executeCommand,
  };
}
