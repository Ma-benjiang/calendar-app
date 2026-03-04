import React, { useState, useCallback } from 'react';
import { CalendarEvent, Task } from '@calendar/core';
import { TaskCalendarItem } from './useTaskCalendar';

interface DayViewProps {
  date: Date;
  events: CalendarEvent[];
  tasks?: Task[];
  calendarItems?: TaskCalendarItem[];
  onTimeClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onTaskClick?: (task: Task) => void;
  onTaskDrop?: (taskId: string, date: Date, hour: number) => void;
}

export const DayView: React.FC<DayViewProps> = ({
  date,
  events,
  tasks = [],
  calendarItems = [],
  onTimeClick,
  onEventClick,
  onTaskClick,
  onTaskDrop,
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);

  const getEventsForHour = (hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      return eventStart.getHours() === hour;
    });
  };

  const getTasksForHour = (hour: number) => {
    return tasks.filter(task => {
      if (!task.scheduledStart) return false;
      const taskStart = new Date(task.scheduledStart);
      return taskStart.getHours() === hour;
    });
  };

  const getCalendarItemsForHour = (hour: number) => {
    return calendarItems.filter(item => {
      const itemStart = new Date(item.startDate);
      return itemStart.getHours() === hour;
    });
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverHour(hour);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverHour(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, hour: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverHour(null);

    try {
      const taskData = e.dataTransfer.getData('application/json');
      if (taskData) {
        const task = JSON.parse(taskData) as Task;
        if (task.id && onTaskDrop) {
          onTaskDrop(task.id, date, hour);
        }
      }
    } catch (error) {
      console.error('Failed to parse dropped task:', error);
    }
  }, [date, onTaskDrop]);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: '12px', color: '#9a9a97', fontWeight: '800', letterSpacing: '0.2em' }}>{year}年{month}月</div>
        <div style={{ fontSize: '48px', color: '#37352f', fontWeight: '900', fontFamily: 'Georgia, serif', margin: '10px 0' }}>{day}</div>
        <div style={{ fontSize: '14px', color: '#eb5757', fontWeight: '700' }}>{weekday}</div>
      </div>
    );
  };

  return (
    <div className="day-view">
      <div className="day-header" style={{ padding: '40px 0', borderBottom: '1px solid #f0ede4' }}>
        {formatDate(date)}
      </div>
      <div className="day-timeline">
        {hours.map(hour => {
          const hourEvents = getEventsForHour(hour);
          const hourTasks = getTasksForHour(hour);
          const hourItems = calendarItems.length > 0 ? getCalendarItemsForHour(hour) : [];
          const isDragOver = dragOverHour === hour;

          return (
            <div key={hour} className="day-hour-row">
              <div className="day-hour-label">{`${hour.toString().padStart(2, '0')}:00`}</div>
              <div
                className={`day-hour-content ${isDragOver ? 'drag-over' : ''}`}
                onClick={() => {
                  const clickedDate = new Date(date);
                  clickedDate.setHours(hour);
                  onTimeClick?.(clickedDate);
                }}
                onDragOver={(e) => handleDragOver(e, hour)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, hour)}
              >
                {/* Show calendar items */}
                {hourItems.map(item => (
                  <div
                    key={item.id}
                    className={`day-event ${item.type}`}
                    style={{
                      backgroundColor: item.color || '#3b82f6',
                      opacity: item.type === 'task' && (item.data as Task).status === 'completed' ? 0.5 : 1,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.type === 'event') {
                        onEventClick?.(item.data as CalendarEvent);
                      } else {
                        onTaskClick?.(item.data as Task);
                      }
                    }}
                  >
                    <div className="event-time">
                      {item.type === 'task' && '⏱ '}
                      {new Date(item.startDate).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="event-title">{item.title}</div>
                  </div>
                ))}

                {/* Fallback: show events and tasks separately */}
                {hourItems.length === 0 && (
                  <>
                    {hourEvents.map(event => (
                      <div
                        key={event.id}
                        className="day-event"
                        style={{ backgroundColor: event.color || '#3b82f6' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                      >
                        <div className="event-time">
                          {new Date(event.startDate).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="event-title">{event.title}</div>
                        {event.description && (
                          <div className="event-desc">{event.description}</div>
                        )}
                      </div>
                    ))}
                    {hourTasks.map(task => (
                      <div
                        key={task.id}
                        className="day-event task"
                        style={{
                          backgroundColor: task.color || getPriorityColor(task.priority),
                          opacity: task.status === 'completed' ? 0.5 : 1,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskClick?.(task);
                        }}
                      >
                        <div className="event-time">⏱ {task.scheduledStart ? new Date(task.scheduledStart).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                        <div className="event-title" style={{ textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
                          {task.title}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Drop indicator */}
                {isDragOver && (
                  <div className="drop-indicator">
                    <span>+ 放置任务</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#3b82f6',
    none: '#9ca3af',
  };
  return colors[priority] || '#3b82f6';
}
