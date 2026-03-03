/**
 * View Toggle Component
 * Switch between list/board/timeline/calendar views
 * AC-004: View Mode Switching
 */
import React from 'react';
import { ViewMode } from './useViewMode';

interface ViewToggleProps {
  currentView: ViewMode;
  onChange: (view: ViewMode) => void;
}

interface ViewOption {
  id: ViewMode;
  label: string;
  icon: string;
}

const viewOptions: ViewOption[] = [
  { id: 'list', label: '列表', icon: '☰' },
  { id: 'board', label: '看板', icon: '▦' },
  { id: 'timeline', label: '时间轴', icon: '→' },
  { id: 'calendar', label: '日历', icon: '▤' },
];

export const ViewToggle: React.FC<ViewToggleProps> = ({
  currentView,
  onChange,
}) => {
  return (
    <div
      className="view-toggle"
      style={{
        display: 'inline-flex',
        backgroundColor: '#f7f6f3',
        borderRadius: 6,
        padding: 2,
        gap: 2,
      }}
      role="tablist"
      aria-label="视图切换"
    >
      {viewOptions.map((option) => {
        const isActive = currentView === option.id;

        return (
          <button
            key={option.id}
            className={`view-toggle-btn ${isActive ? 'active' : ''}`}
            onClick={() => onChange(option.id)}
            role="tab"
            aria-selected={isActive}
            aria-label={option.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: isActive ? '#fff' : 'transparent',
              color: isActive ? '#37352f' : '#6b6b6b',
              fontSize: 13,
              fontWeight: isActive ? 500 : 400,
              cursor: 'pointer',
              boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = '#ebebea';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span style={{ fontSize: 14 }}>{option.icon}</span>
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
