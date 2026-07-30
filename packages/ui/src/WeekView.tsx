import React, { useState, useCallback } from 'react';
import { CalendarCore, CalendarEvent, Task } from '@calendar/core';
import { TaskCalendarItem } from './useTaskCalendar';
import { getChinaHoliday } from './services/chinaHolidayService';

interface WeekViewProps {
  date: Date;
  events: CalendarEvent[];
  tasks?: Task[];
  calendarItems?: TaskCalendarItem[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onTaskClick?: (task: Task) => void;
  onTaskDrop?: (taskId: string, date: Date, hour: number) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  date,
  events,
  tasks = [],
  calendarItems = [],
  onDateClick,
  onEventClick,
  onTaskClick,
  onTaskDrop,
}) => {
  const weekDays = CalendarCore.generateWeekView(date);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  const getEventsForHour = (dayDate: Date, hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      return (
        CalendarCore.isEventOnDate(event, dayDate) &&
        eventStart.getHours() <= hour &&
        new Date(event.endDate).getHours() > hour
      );
    });
  };

  const getTasksForHour = (dayDate: Date, hour: number) => {
    return tasks.filter(task => {
      if (!task.scheduledStart) return false;
      const taskStart = new Date(task.scheduledStart);
      return (
        CalendarCore.isEventOnDate({ startDate: task.scheduledStart, endDate: task.scheduledEnd || task.scheduledStart } as CalendarEvent, dayDate) &&
        taskStart.getHours() <= hour &&
        (task.scheduledEnd ? new Date(task.scheduledEnd).getHours() > hour : taskStart.getHours() === hour)
      );
    });
  };

  const getCalendarItemsForHour = (dayDate: Date, hour: number) => {
    return calendarItems.filter(item => {
      const itemStart = new Date(item.startDate);
      return (
        itemStart.getDate() === dayDate.getDate() &&
        itemStart.getMonth() === dayDate.getMonth() &&
        itemStart.getFullYear() === dayDate.getFullYear() &&
        itemStart.getHours() <= hour &&
        new Date(item.endDate).getHours() > hour
      );
    });
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent, cellKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCell(cellKey);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverCell(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dayDate: Date, hour: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCell(null);

    try {
      const taskData = e.dataTransfer.getData('application/json');
      if (taskData) {
        const task = JSON.parse(taskData) as Task;
        if (task.id && onTaskDrop) {
          onTaskDrop(task.id, dayDate, hour);
        }
      }
    } catch (error) {
      console.error('Failed to parse dropped task:', error);
    }
  }, [onTaskDrop]);

  const getCellKey = (dayIndex: number, hour: number) => `${dayIndex}-${hour}`;

  return (
    <div className="week-view">
      <div className="week-header">
        <div className="hour-label-header" style={{ width: '60px', borderRight: '1px solid #f0ede4' }}></div>
        {weekDays.map((day, index) => {
          const holiday = getChinaHoliday(day);
          return (
          <div key={index} className="week-day-header">
            <div className="day-name" style={{ fontSize: '10px', color: '#9a9a97', fontWeight: '800' }}>
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][day.getDay()]}
            </div>
            <div className="day-number" style={{ 
              fontSize: '20px', 
              fontWeight: '800', 
              color: '#37352f', 
              fontFamily: 'Georgia, serif',
              marginTop: '4px',
              position: 'relative',
              display: 'inline-block'
            }}>
              {day.getDate()}
              {(() => {
                const today = new Date();
                return day.getDate() === today.getDate() && 
                       day.getMonth() === today.getMonth() && 
                       day.getFullYear() === today.getFullYear();
              })() && (
                <div style={{ 
                  position: 'absolute', 
                  bottom: '-4px', 
                  left: '0', 
                  right: '0', 
                  height: '2px', 
                  backgroundColor: '#eb5757' 
                }} />
              )}
            </div>
            {holiday && (
              <div
                className={`week-holiday ${holiday.isOffDay ? 'off' : 'workday'}`}
              >
                {holiday.name} · {holiday.isOffDay ? '休' : '班'}
              </div>
            )}
          </div>
          );
        })}
      </div>
      <div className="week-grid">
        {hours.map(hour => (
          <div key={hour} className="hour-row">
            <div className="hour-label">{`${hour.toString().padStart(2, '0')}:00`}</div>
            {weekDays.map((day, dayIndex) => {
              const hourEvents = getEventsForHour(day, hour);
              const hourTasks = getTasksForHour(day, hour);
              const hourItems = calendarItems.length > 0 ? getCalendarItemsForHour(day, hour) : [];
              const cellKey = getCellKey(dayIndex, hour);
              const isDragOver = dragOverCell === cellKey;

              return (
                <div
                  key={dayIndex}
                  className={`hour-cell ${isDragOver ? 'drag-over' : ''}`}
                  onClick={() => {
                    const clickedDate = new Date(day);
                    clickedDate.setHours(hour);
                    onDateClick?.(clickedDate);
                  }}
                  onDragOver={(e) => handleDragOver(e, cellKey)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, day, hour)}
                >
                  {/* Show calendar items */}
                  {hourItems.map(item => (
                    <div
                      key={item.id}
                      className={`week-event ${item.type}`}
                      style={{
                        backgroundColor: item.color || '#3b82f6',
                        opacity: item.type === 'task' && (item.data as Task).status === 'completed' ? 0.5 : 1,
                        textDecoration: item.type === 'task' && (item.data as Task).status === 'completed' ? 'line-through' : 'none',
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
                      {item.type === 'task' && '⏱ '}
                      {item.title}
                    </div>
                  ))}

                  {/* Fallback: show events and tasks separately */}
                  {hourItems.length === 0 && (
                    <>
                      {hourEvents.map(event => (
                        <div
                          key={event.id}
                          className="week-event"
                          style={{ backgroundColor: event.color || '#3b82f6' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick?.(event);
                          }}
                        >
                          {event.title}
                        </div>
                      ))}
                      {hourTasks.map(task => (
                        <div
                          key={task.id}
                          className="week-event task"
                          style={{
                            backgroundColor: task.color || getPriorityColor(task.priority),
                            opacity: task.status === 'completed' ? 0.5 : 1,
                            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskClick?.(task);
                          }}
                        >
                          ⏱ {task.title}
                        </div>
                      ))}
                    </>
                  )}

                  {/* Drop indicator */}
                  {isDragOver && (
                    <div className="drop-indicator">
                      <span>+</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
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
