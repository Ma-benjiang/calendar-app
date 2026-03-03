import React, { useState, useCallback } from 'react';
import { CalendarCore, CalendarEvent, Task } from '@calendar/core';
import { TaskCalendarItem } from './useTaskCalendar';

interface MonthViewProps {
  year: number;
  month: number;
  events: CalendarEvent[];
  tasks?: Task[];
  calendarItems?: TaskCalendarItem[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onTaskClick?: (task: Task) => void;
  onTaskDrop?: (taskId: string, date: Date) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  year,
  month,
  events,
  tasks = [],
  calendarItems = [],
  onDateClick,
  onEventClick,
  onTaskClick,
  onTaskDrop,
}) => {
  const days = CalendarCore.generateMonthView(year, month);
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const getEventsForDay = useCallback((date: Date) => {
    return events.filter(event => CalendarCore.isEventOnDate(event, date));
  }, [events]);

  const getTasksForDay = useCallback((date: Date) => {
    return tasks.filter(task => {
      if (!task.scheduledStart) return false;
      const taskDate = new Date(task.scheduledStart);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  }, [tasks]);

  const getCalendarItemsForDay = useCallback((date: Date) => {
    return calendarItems.filter(item => {
      const itemDate = new Date(item.startDate);
      return (
        itemDate.getDate() === date.getDate() &&
        itemDate.getMonth() === date.getMonth() &&
        itemDate.getFullYear() === date.getFullYear()
      );
    });
  }, [calendarItems]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateStr);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverDate(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, date: Date) => {
    e.preventDefault();
    setDragOverDate(null);

    try {
      const taskData = e.dataTransfer.getData('application/json');
      if (taskData) {
        const task = JSON.parse(taskData) as Task;
        if (task.id && onTaskDrop) {
          onTaskDrop(task.id, date);
        }
      }
    } catch (error) {
      console.error('Failed to parse dropped task:', error);
    }
  }, [onTaskDrop]);

  const formatDateKey = (date: Date) => {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  };

  return (
    <div className="month-view">
      <div className="week-header">
        {weekDays.map(day => (
          <div key={day} className="week-day-header">{day}</div>
        ))}
      </div>
      <div className="days-grid">
        {days.map((date, index) => {
          const dayEvents = getEventsForDay(date);
          const dayTasks = getTasksForDay(date);
          const dayItems = calendarItems.length > 0 ? getCalendarItemsForDay(date) : [];
          const isCurrentMonth = date.getMonth() === month;
          const dateKey = formatDateKey(date);
          const isDragOver = dragOverDate === dateKey;

          return (
            <div
              key={index}
              className={`day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isDragOver ? 'drag-over' : ''}`}
              onClick={() => onDateClick?.(date)}
              onDragOver={(e) => handleDragOver(e, dateKey)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, date)}
            >
              <span className="day-number">{date.getDate()}</span>
              <div className="day-events">
                {/* Show calendar items (events + tasks) */}
                {dayItems.slice(0, 3).map(item => (
                  <div
                    key={item.id}
                    className={`event-dot ${item.type}`}
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
                    title={item.title}
                  >
                    {item.type === 'task' && '⏱ '}
                    {item.title.length > 10 ? item.title.slice(0, 10) + '...' : item.title}
                  </div>
                ))}

                {/* Fallback: show events and tasks separately if no calendarItems */}
                {dayItems.length === 0 && (
                  <>
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        className="event-dot"
                        style={{ backgroundColor: event.color || '#3b82f6' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                        title={event.title}
                      >
                        {event.title.length > 10 ? event.title.slice(0, 10) + '...' : event.title}
                      </div>
                    ))}
                    {dayTasks.slice(0, 2).map(task => (
                      <div
                        key={task.id}
                        className="event-dot task"
                        style={{
                          backgroundColor: task.color || getPriorityColor(task.priority),
                          opacity: task.status === 'completed' ? 0.5 : 1,
                          textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskClick?.(task);
                        }}
                        title={task.title}
                      >
                        ⏱ {task.title.length > 8 ? task.title.slice(0, 8) + '...' : task.title}
                      </div>
                    ))}
                  </>
                )}

                {/* Show more indicator */}
                {(() => {
                  const totalItems = dayItems.length > 0 ? dayItems.length : dayEvents.length + dayTasks.length;
                  return totalItems > 3 ? (
                    <span className="more-events">+{totalItems - 3}</span>
                  ) : null;
                })()}
              </div>

              {/* Drag overlay */}
              {isDragOver && (
                <div className="drop-indicator">
                  <span>+ 放置任务</span>
                </div>
              )}
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
