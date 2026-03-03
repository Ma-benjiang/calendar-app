/**
 * Command Menu Component
 * Notion-style command palette for quick actions
 * AC-003: Command Menu UI
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { Command } from './useCommand';

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
  filter: string;
  onFilterChange: (filter: string) => void;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onExecute: () => void;
  groupedCommands: {
    view: Command[];
    insert: Command[];
    action: Command[];
    nav: Command[];
  };
}

const categoryLabels: Record<string, string> = {
  view: '视图',
  insert: '插入',
  action: '操作',
  nav: '导航',
};

const categoryIcons: Record<string, string> = {
  view: '👁',
  insert: '➕',
  action: '⚡',
  nav: '→',
};

export const CommandMenu: React.FC<CommandMenuProps> = ({
  isOpen,
  onClose,
  commands,
  filter,
  onFilterChange,
  selectedIndex,
  onSelectIndex,
  onExecute,
  groupedCommands,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        onSelectIndex(Math.min(selectedIndex + 1, commands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        onSelectIndex(Math.max(selectedIndex - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        onExecute();
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [selectedIndex, commands.length, onSelectIndex, onExecute, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const hasResults = commands.length > 0;

  return (
    <div
      className="command-menu-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-label="Command menu"
      aria-modal="true"
    >
      <div className="command-menu-container">
        <div className="command-menu-input-wrapper">
          <span className="command-menu-search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="command-menu-input"
            placeholder="输入命令或搜索..."
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search commands"
          />
          {filter && (
            <button
              className="command-menu-clear"
              onClick={() => onFilterChange('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div ref={listRef} className="command-menu-list" role="listbox">
          {hasResults ? (
            Object.entries(groupedCommands).map(([category, categoryCommands]) => {
              if (categoryCommands.length === 0) return null;

              return (
                <div key={category} className="command-menu-group" role="group" aria-label={categoryLabels[category]}>
                  <div className="command-menu-group-header">
                    <span className="command-menu-group-icon">{categoryIcons[category]}</span>
                    <span className="command-menu-group-label">{categoryLabels[category]}</span>
                  </div>
                  {categoryCommands.map((command) => {
                    const globalIndex = commands.findIndex(c => c.id === command.id);
                    const isSelected = globalIndex === selectedIndex;

                    return (
                      <button
                        key={command.id}
                        className={`command-menu-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          onSelectIndex(globalIndex);
                          onExecute();
                        }}
                        onMouseEnter={() => onSelectIndex(globalIndex)}
                        data-index={globalIndex}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span className="command-menu-item-icon">{command.icon || '•'}</span>
                        <span className="command-menu-item-label">{command.label}</span>
                        {command.shortcut && (
                          <kbd className="command-menu-item-shortcut">{command.shortcut}</kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          ) : (
            <div className="command-menu-empty">
              <span className="command-menu-empty-icon">🔍</span>
              <p>未找到命令</p>
              <span className="command-menu-empty-hint">尝试使用不同的关键词</span>
            </div>
          )}
        </div>

        <div className="command-menu-footer">
          <div className="command-menu-hint">
            <kbd>↑↓</kbd>
            <span>导航</span>
          </div>
          <div className="command-menu-hint">
            <kbd>↵</kbd>
            <span>选择</span>
          </div>
          <div className="command-menu-hint">
            <kbd>esc</kbd>
            <span>关闭</span>
          </div>
        </div>
      </div>
    </div>
  );
};
