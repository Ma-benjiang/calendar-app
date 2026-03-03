/**
 * Content Block Component
 * Notion-style modular content block for events/tasks/notes
 * AC-004: Modular Layout
 */
import React from 'react';
import { ViewItem } from './useViewMode';

interface ContentBlockProps {
  item: ViewItem;
  isExpanded: boolean;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
  onClick?: () => void;
  onExpand?: () => void;
  onCollapse?: () => void;
  onToggle?: () => void;
}

const typeIcons: Record<string, string> = {
  event: '📅',
  task: '☐',
  note: '📝',
};

const priorityColors: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
};

const statusIcons: Record<string, string> = {
  pending: '○',
  'in-progress': '◐',
  completed: '✓',
};

export const ContentBlock: React.FC<ContentBlockProps> = ({
  item,
  isExpanded,
  isDragging,
  dragHandleProps,
  onClick,
  onToggle,
}) => {
  const formatTime = (start?: string, end?: string) => {
    if (!start) return null;
    const startTime = start.split('T')[1]?.slice(0, 5) || '';
    const endTime = end?.split('T')[1]?.slice(0, 5) || '';
    return endTime ? `${startTime} - ${endTime}` : startTime;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  };

  const timeDisplay = formatTime(item.startTime, item.endTime);
  const dateDisplay = item.dueDate
    ? formatDate(item.dueDate)
    : item.startTime
    ? formatDate(item.startTime.split('T')[0])
    : null;

  return (
    <div
      className={`content-block ${isExpanded ? 'expanded' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        padding: '12px 16px',
        borderRadius: 8,
        border: '1px solid #e3e2e0',
        backgroundColor: '#fff',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: isDragging
          ? '0 4px 12px rgba(0,0,0,0.15)'
          : '0 1px 2px rgba(0,0,0,0.04)',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'scale(1.02)' : undefined,
        transition: 'box-shadow 0.2s, transform 0.2s, opacity 0.2s',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
        }
      }}
      {...dragHandleProps}
    >
      {/* Header */}
      <div
        className="content-block-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Type icon or checkbox */}
        <span
          className="content-block-icon"
          style={{
            fontSize: 16,
            color: item.type === 'task' && item.status === 'completed'
              ? '#9a9a9a'
              : '#37352f',
          }}
        >
          {item.type === 'task'
            ? statusIcons[item.status || 'pending']
            : typeIcons[item.type]}
        </span>

        {/* Title */}
        <span
          className="content-block-title"
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: 500,
            color:
              item.type === 'task' && item.status === 'completed'
                ? '#9a9a9a'
                : '#37352f',
            textDecoration:
              item.type === 'task' && item.status === 'completed'
                ? 'line-through'
                : 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.title}
        </span>

        {/* Priority indicator */}
        {item.priority && (
          <span
            className="content-block-priority"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: priorityColors[item.priority],
            }}
          />
        )}

        {/* Expand toggle */}
        {(item.description || item.location || item.participants?.length) && (
          <button
            className="content-block-expand"
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 12,
              color: '#9a9a9a',
              padding: 4,
            }}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
      </div>

      {/* Meta info */}
      <div
        className="content-block-meta"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 8,
          fontSize: 12,
          color: '#9a9a9a',
        }}
      >
        {timeDisplay && (
          <span className="content-block-time">🕐 {timeDisplay}</span>
        )}
        {dateDisplay && !timeDisplay && (
          <span className="content-block-date">📅 {dateDisplay}</span>
        )}
        {item.location && (
          <span className="content-block-location">📍 {item.location}</span>
        )}
        {item.participants && item.participants.length > 0 && (
          <span className="content-block-participants">👥 {item.participants.length}</span>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div
          className="content-block-details"
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid #e3e2e0',
            fontSize: 13,
            color: '#6b6b6b',
          }}
        >
          {item.description && (
            <p className="content-block-description">{item.description}</p>
          )}

          {item.location && (
            <div className="content-block-detail-row">
              <span style={{ color: '#9a9a9a' }}>地点: </span>
              {item.location}
            </div>
          )}

          {item.participants && item.participants.length > 0 && (
            <div className="content-block-detail-row">
              <span style={{ color: '#9a9a9a' }}>参与者: </span>
              {item.participants.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
