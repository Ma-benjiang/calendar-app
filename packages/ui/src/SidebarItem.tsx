/**
 * Sidebar Item Component
 * Individual item in the sidebar tree
 * AC-002: Sidebar Tree Structure
 */
import React from 'react';

export interface SidebarItemProps {
  id: string;
  name: string;
  type: 'calendar' | 'folder' | 'view' | 'tag';
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  icon?: React.ReactNode;
  color?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  onToggle?: () => void;
  children?: React.ReactNode;
}

const typeIcons: Record<string, string> = {
  calendar: '📅',
  folder: '📁',
  view: '📄',
  tag: '🏷️',
};

export const SidebarItem: React.FC<SidebarItemProps> = ({
  name,
  type,
  level,
  isSelected,
  isExpanded,
  hasChildren,
  icon,
  color,
  style,
  onClick,
  onToggle,
  children,
}) => {
  const paddingLeft = 16 + level * 20;

  return (
    <>
      <div
        className={`sidebar-item ${isSelected ? 'selected' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: `6px 16px 6px ${paddingLeft}px`,
          cursor: 'pointer',
          fontSize: 14,
          color: isSelected ? '#37352f' : '#6b6b6b',
          backgroundColor: isSelected ? '#f1f1ef' : 'transparent',
          borderRadius: 4,
          margin: '2px 8px',
          transition: 'background-color 0.15s',
          ...style,
        }}
        onClick={onClick}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = '#f1f1ef';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? isExpanded : undefined}
      >
        {/* Expand/collapse toggle */}
        {hasChildren && (
          <button
            className="sidebar-item-toggle"
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
            style={{
              width: 16,
              height: 16,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: '#9a9a9a',
              padding: 0,
            }}
            aria-label={isExpanded ? '收起' : '展开'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}

        {/* Spacer for items without children */}
        {!hasChildren && <div style={{ width: 16 }} />}

        {/* Icon */}
        <span
          className="sidebar-item-icon"
          style={{
            fontSize: 14,
            color: color || undefined,
          }}
        >
          {icon || typeIcons[type] || '•'}
        </span>

        {/* Name */}
        <span
          className="sidebar-item-name"
          style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </span>
      </div>

      {/* Children */}
      {children}
    </>
  );
};
