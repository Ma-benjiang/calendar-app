import React, { useState, useCallback } from 'react';
import { CalendarEvent, Task, getStatusLabel } from '@calendar/core';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { EventForm } from './EventForm';
import { Sidebar } from './Sidebar';
import { TaskList } from './TaskList';
import { SmartSchedule } from './SmartSchedule';
import { useTaskCalendar } from './useTaskCalendar';
import { DailyCalendarPage } from './daily-calendar';
import './CalendarApp.css';

type ViewType = 'month' | 'week' | 'day' | 'tasks' | 'daily-calendar';

// 侧边栏示例数据 - 纯净导航列表
const sidebarItems = [
  { id: 'view-month', name: '月视图', type: 'calendar' as const, parentId: null, icon: '📅', color: '#3b82f6' },
  { id: 'view-week', name: '周视图', type: 'calendar' as const, parentId: null, icon: '📊', color: '#ef4444' },
  { id: 'view-day', name: '日视图', type: 'calendar' as const, parentId: null, icon: '📆', color: '#10b981' },
  { id: 'view-tasks', name: '任务管理', type: 'calendar' as const, parentId: null, icon: '✓', color: '#f59e0b' },
  { id: 'view-daily-calendar', name: '每日台历', type: 'calendar' as const, parentId: null, icon: '🖼️', color: '#ec4899' },
];

export const CalendarAppWithSidebar: React.FC = () => {
  const {
    events,
    tasks,
    allTasks,
    calendarItems,
    currentDate,
    view,
    setView,
    unscheduledTasks,
    addEvent,
    updateEvent,
    deleteEvent,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    scheduleTask,
    handleTaskDrop,
    goToToday,
    goToPrev,
    goToNext,
  } = useTaskCalendar();

  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [showSmartSchedule, setShowSmartSchedule] = useState(false);

  // Sidebar state
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [selectedSidebarId, setSelectedSidebarId] = useState<string | null>('view-month');
  const [isFloatingVisible, setIsFloatingVisible] = useState(false);

  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setEditingEvent(undefined);
    setShowEventForm(true);
  }, []);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setEditingEvent(event);
    setShowEventForm(true);
  }, []);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  }, []);

  const handleSaveEvent = useCallback((eventData: Omit<CalendarEvent, 'id'>) => {
    if (editingEvent) {
      updateEvent(editingEvent.id, eventData);
    } else {
      addEvent(eventData);
    }
    setShowEventForm(false);
    setEditingEvent(undefined);
  }, [editingEvent, addEvent, updateEvent]);

  const handleDeleteEvent = useCallback((id: string) => {
    deleteEvent(id);
    setShowEventForm(false);
    setEditingEvent(undefined);
  }, [deleteEvent]);

  const handleTaskDropOnCalendar = useCallback((taskId: string, date: Date, hour?: number) => {
    const task = handleTaskDrop(taskId, date, hour);
    if (task) {
      console.log('Task scheduled:', task);
    }
  }, [handleTaskDrop]);

  const formatTitle = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    if (view === 'day') {
      return `${year}年${month}月${currentDate.getDate()}日`;
    }
    return `${year}年${month}月`;
  };

  // 直接将 sidebarItems 转换为 TreeNode 结构 (因为现在是平铺的)
  const treeStructure = sidebarItems.map(item => ({
    ...item,
    level: 0,
    children: []
  }));

  return (
    <div className="notion-theme" style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Sidebar
        isExpanded={isSidebarExpanded}
        width={240}
        treeStructure={treeStructure}
        selectedId={selectedSidebarId}
        expandedFolders={[]} 
        isFloatingVisible={isFloatingVisible}
        isDrawerOpen={false}
        variant="sidebar"
        transitionDuration={300}
        transitionTiming="ease-in-out"
        onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)}
        onItemClick={(id) => {
          setSelectedSidebarId(id);
          if (id === 'view-month') setView('month');
          else if (id === 'view-week') setView('week');
          else if (id === 'view-day') setView('day');
          else if (id === 'view-tasks') setView('tasks');
          else if (id === 'view-daily-calendar') setView('daily-calendar');
        }}
        onFolderToggle={() => {}}
        onHover={(isHovering) => setIsFloatingVisible(isHovering && !isSidebarExpanded)}
        onCloseDrawer={() => {}}
        getItemStyle={() => ({})}
      />

      <div className="calendar-app" style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        <div className="calendar-container-skeuo" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <header className="calendar-header">
            <h1>Pie Calendar</h1>
            <div className="header-center">
              <button className="nav-btn" onClick={goToPrev}>◀</button>
              <span className="current-date">{formatTitle()}</span>
              <button className="nav-btn" onClick={goToNext}>▶</button>
              <button className="today-btn" onClick={goToToday}>今天</button>
            </div>
            <div className="view-switcher">
              {(['month', 'week', 'day', 'tasks'] as ViewType[]).map((v) => (
                <button
                  key={v}
                  className={`view-btn ${view === v ? 'active' : ''}`}
                  onClick={() => setView(v)}
                >
                  {v === 'month' ? '月' : v === 'week' ? '周' : v === 'day' ? '日' : '任务'}
                </button>
              ))}
            </div>
          </header>

          <main className="calendar-main" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div style={{ flex: 1, minWidth: 0, overflow: 'auto', position: 'relative' }}>
              {view === 'month' && (
                <MonthView
                  year={currentDate.getFullYear()}
                  month={currentDate.getMonth()}
                  events={events}
                  tasks={allTasks}
                  calendarItems={calendarItems}
                  onDateClick={handleDateClick}
                  onEventClick={handleEventClick}
                  onTaskClick={handleTaskClick}
                  onTaskDrop={handleTaskDropOnCalendar}
                />
              )}
              {view === 'week' && (
                <WeekView
                  date={currentDate}
                  events={events}
                  tasks={allTasks}
                  calendarItems={calendarItems}
                  onDateClick={handleDateClick}
                  onEventClick={handleEventClick}
                  onTaskClick={handleTaskClick}
                  onTaskDrop={handleTaskDropOnCalendar}
                />
              )}
              {view === 'day' && (
                <DayView
                  date={currentDate}
                  events={events}
                  tasks={allTasks}
                  calendarItems={calendarItems}
                  onTimeClick={handleDateClick}
                  onEventClick={handleEventClick}
                  onTaskClick={handleTaskClick}
                  onTaskDrop={handleTaskDropOnCalendar}
                />
              )}
              {view === 'tasks' && (
                <TaskList
                  tasks={tasks}
                  onCreateTask={createTask}
                  onUpdateTask={updateTask}
                  onDeleteTask={deleteTask}
                  onToggleComplete={toggleTaskCompletion}
                  onTaskClick={handleTaskClick}
                />
              )}
              
              {/* 核心改动：使用 display:none 隐藏而非卸载，允许后台生成图片 */}
              <div style={{ display: view === 'daily-calendar' ? 'block' : 'none', height: '100%' }}>
                <DailyCalendarPage isVisible={view === 'daily-calendar'} />
              </div>
            </div>

            {view !== 'tasks' && view !== 'daily-calendar' && (
              <div style={{ 
                width: '320px', 
                flexShrink: 0, 
                borderLeft: '1px solid #f0ede4', 
                padding: '32px 24px',
                backgroundColor: 'transparent',
                overflow: 'auto',
                position: 'relative'
              }}>
                <TaskList
                  tasks={unscheduledTasks}
                  onCreateTask={createTask}
                  onUpdateTask={updateTask}
                  onDeleteTask={deleteTask}
                  onToggleComplete={toggleTaskCompletion}
                  onTaskClick={handleTaskClick}
                  onTaskDragStart={(task) => {
                    console.log('Dragging task:', task);
                  }}
                  showAddInput={true}
                  viewMode="list"
                />
              </div>
            )}
          </main>
        </div>

        {showEventForm && (
          <div className="modal-overlay" onClick={() => setShowEventForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <EventForm
                event={editingEvent}
                initialDate={selectedDate}
                onSave={handleSaveEvent}
                onCancel={() => {
                  setShowEventForm(false);
                  setEditingEvent(undefined);
                }}
                onDelete={editingEvent ? handleDeleteEvent : undefined}
              />
            </div>
          </div>
        )}

        {showTaskDetail && selectedTask && (
          <div className="modal-overlay" onClick={() => setShowTaskDetail(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="task-detail" style={{ padding: '32px' }}>
                <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 700 }}>任务详情</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <p><strong>标题:</strong> {selectedTask.title}</p>
                  <p><strong>状态:</strong> {getStatusLabel(selectedTask.status)}</p>
                  <p><strong>优先级:</strong> {selectedTask.priority}</p>
                  {selectedTask.dueDate && (
                    <p><strong>截止日期:</strong> {new Date(selectedTask.dueDate).toLocaleDateString()}</p>
                  )}
                  {selectedTask.scheduledStart && (
                    <p><strong>已安排:</strong> {new Date(selectedTask.scheduledStart).toLocaleString()}</p>
                  )}
                </div>
                <div className="form-actions" style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--color-border)' }}>
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      toggleTaskCompletion(selectedTask.id);
                      setShowTaskDetail(false);
                    }}
                  >
                    {selectedTask.status === 'completed' ? '标记为未完成' : '标记为完成'}
                  </button>
                  <button className="btn-secondary" onClick={() => setShowTaskDetail(false)}>关闭</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <SmartSchedule
          isOpen={showSmartSchedule}
          unscheduledTasks={unscheduledTasks}
          events={events}
          onScheduleTask={scheduleTask}
          onClose={() => setShowSmartSchedule(false)}
        />
      </div>
    </div>
  );
};
