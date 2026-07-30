/**
 * Sidebar Item Component
 * Individual item in the sidebar tree - Updated for Premium Skeuo Theme
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
  const paddingLeft = 24 + level * 16;

  return (
    <>
      <div
        className={`sidebar-item ${isSelected ? 'selected' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: `12px 16px 12px ${paddingLeft}px`,
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: isSelected ? '700' : '500',
          color: isSelected ? '#fffdf9' : 'rgba(255,253,249,0.5)',
          backgroundColor: isSelected ? 'rgba(255,253,249,0.08)' : 'transparent',
          borderLeft: isSelected ? '3px solid #d4a574' : '3px solid transparent',
          transition: 'all 0.2s',
          ...style,
        }}
        onClick={onClick}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'rgba(255,253,249,0.04)';
            e.currentTarget.style.color = 'rgba(255,253,249,0.8)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'rgba(255,253,249,0.5)';
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
              width: 14,
              height: 14,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
              color: 'inherit',
              opacity: 0.5,
              padding: 0,
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            ▶
          </button>
        )}

        {/* Spacer for items without children */}
        {!hasChildren && <div style={{ width: 14 }} />}

        {/* Icon */}
        <span
          className="sidebar-item-icon"
          style={{
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color || 'inherit',
            opacity: isSelected ? 1 : 0.7,
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
            letterSpacing: '0.01em',
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
