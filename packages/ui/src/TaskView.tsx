/**
 * TaskView - 任务管理视图组件
 * 整合 TaskList 和 useTasks hook 提供完整的任务管理功能
 */
import React, { useState, useCallback } from 'react';
import {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
} from '@calendar/core';
import { useTasks } from './useTasks';
import { TaskList } from './TaskList';
import { TaskStatsBoard } from './TaskStatsBoard';
import './TaskView.css';

// ============== 类型定义 ==============

interface TaskViewProps {
  /** 视图标题 */
  title?: string;
  /** 初始筛选条件 */
  initialFilter?: import('@calendar/core').TaskFilter;
  /** 初始排序 */
  initialSortBy?: import('@calendar/core').TaskSortOption;
  /** 是否显示标题栏 */
  showHeader?: boolean;
  /** 是否显示统计信息 */
  showStats?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 任务点击回调 */
  onTaskClick?: (task: Task) => void;
  /** 任务拖拽开始回调 */
  onTaskDragStart?: (task: Task) => void;
  /** 任务安排回调（拖拽到日历） */
  onTaskSchedule?: (task: Task, date: Date) => void;
}

interface TaskStatsProps {
  total: number;
  completed: number;
  pending: number;
  completionRate: number;
  todayCompleted: number;
}

// ============== TaskStats 组件 ==============

const TaskStats: React.FC<TaskStatsProps> = ({
  total,
  completed,
  pending,
  completionRate,
  todayCompleted,
}) => {
  return (
    <div className="task-stats">
      <div className="stat-card">
        <span className="stat-value">{total}</span>
        <span className="stat-label">总任务</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{pending}</span>
        <span className="stat-label">待完成</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{completed}</span>
        <span className="stat-label">已完成</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{completionRate}%</span>
        <span className="stat-label">完成率</span>
      </div>
      {todayCompleted > 0 && (
        <div className="stat-card highlight">
          <span className="stat-value">{todayCompleted}</span>
          <span className="stat-label">今日完成</span>
        </div>
      )}
    </div>
  );
};

// ============== TaskView 主组件 ==============

export const TaskView: React.FC<TaskViewProps> = ({
  title = '任务管理',
  initialFilter = {},
  initialSortBy = 'dueDate-asc',
  showHeader = true,
  showStats = true,
  className = '',
  onTaskClick,
  onTaskDragStart,
  onTaskSchedule,
}) => {
  // 使用 useTasks hook 管理任务状态
  const {
    tasks,
    allTasks,
    isLoading,
    unscheduledTasks,
    completedTasks,
    filter,
    setFilter,
    sortBy,
    setSortBy,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    scheduleTask,
    unscheduleTask,
    stats,
  } = useTasks({
    initialFilter,
    initialSortBy,
  });

  // 本地状态
  const [viewMode, setViewMode] = useState<'list' | 'grouped' | 'stats'>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // 处理创建任务
  const handleCreateTask = useCallback(
    (input: CreateTaskInput) => {
      const task = createTask(input);
      if (task && onTaskSchedule && input.dueDate) {
        // 如果设置了截止日期，可以选择自动安排
        // onTaskSchedule(task, input.dueDate);
      }
    },
    [createTask, onTaskSchedule]
  );

  // 处理更新任务
  const handleUpdateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      updateTask(id, updates as UpdateTaskInput);
    },
    [updateTask]
  );

  // 处理删除任务
  const handleDeleteTask = useCallback(
    (id: string) => {
      deleteTask(id);
      if (selectedTask?.id === id) {
        setSelectedTask(null);
      }
    },
    [deleteTask, selectedTask]
  );

  // 处理任务点击
  const handleTaskClick = useCallback(
    (task: Task) => {
      setSelectedTask(task);
      onTaskClick?.(task);
    },
    [onTaskClick]
  );

  // 处理任务拖拽
  const handleTaskDragStart = useCallback(
    (task: Task) => {
      onTaskDragStart?.(task);
    },
    [onTaskDragStart]
  );

  // 快速筛选：未安排任务
  const showUnscheduledTasks = useCallback(() => {
    setFilter({ ...filter, scheduled: false });
  }, [filter, setFilter]);

  // 快速筛选：已完成任务
  const showCompletedTasks = useCallback(() => {
    setFilter({ ...filter, status: 'completed' });
  }, [filter, setFilter]);

  // 清除筛选
  const clearFilter = useCallback(() => {
    setFilter({});
  }, [setFilter]);

  // 处理排序变更
  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSortBy(e.target.value as typeof sortBy);
    },
    [setSortBy]
  );

  if (isLoading) {
    return (
      <div className={`task-view ${className}`}>
        <div className="task-view-loading">
          <div className="loading-spinner" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`task-view ${className}`}>
      {/* 标题栏 */}
      {showHeader && (
        <div className="task-view-header">
          <h2 className="task-view-title">{title}</h2>
          <div className="task-view-actions">
            {/* 视图切换 */}
            <div className="view-mode-toggle">
              <button
                className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="列表视图"
              >
                ☰ 列表
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'grouped' ? 'active' : ''}`}
                onClick={() => setViewMode('grouped')}
                title="分组视图"
              >
                ▦ 分组
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'stats' ? 'active' : ''}`}
                onClick={() => setViewMode('stats')}
                title="统计看板"
              >
                📊 统计
              </button>
            </div>

            {/* 排序选择 */}
            <select
              className="sort-select"
              value={sortBy}
              onChange={handleSortChange}
            >
              <option value="dueDate-asc">截止日 ↑</option>
              <option value="dueDate-desc">截止日 ↓</option>
              <option value="priority-desc">优先级 ↓</option>
              <option value="priority-asc">优先级 ↑</option>
              <option value="createdAt-desc">创建时间 ↓</option>
              <option value="createdAt-asc">创建时间 ↑</option>
            </select>
          </div>
        </div>
      )}

      {/* 统计信息 */}
      {showStats && <TaskStats {...stats} />}

      {/* 快速筛选标签 */}
      <div className="task-quick-filters">
        <button
          className={`quick-filter-btn ${Object.keys(filter).length === 0 ? 'active' : ''}`}
          onClick={clearFilter}
        >
          全部
        </button>
        <button
          className={`quick-filter-btn ${filter.scheduled === false ? 'active' : ''}`}
          onClick={showUnscheduledTasks}
        >
          未安排 ({unscheduledTasks.length})
        </button>
        <button
          className={`quick-filter-btn ${filter.status === 'completed' ? 'active' : ''}`}
          onClick={showCompletedTasks}
        >
          已完成 ({completedTasks.length})
        </button>
      </div>

      {/* 任务列表或统计看板 */}
      <div className="task-view-content">
        {viewMode === 'stats' ? (
          <TaskStatsBoard tasks={allTasks} days={7} />
        ) : (
          <TaskList
            tasks={tasks}
            onCreateTask={handleCreateTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onToggleComplete={toggleTaskCompletion}
            onTaskClick={handleTaskClick}
            onTaskDragStart={handleTaskDragStart}
            filter={filter}
            sortBy={sortBy}
            viewMode={viewMode}
            showAddInput={true}
          />
        )}
      </div>

      {/* 选中任务详情面板（可选） */}
      {selectedTask && (
        <div className="task-detail-panel">
          <div className="task-detail-header">
            <h3>任务详情</h3>
            <button
              className="close-btn"
              onClick={() => setSelectedTask(null)}
            >
              ×
            </button>
          </div>
          <div className="task-detail-content">
            <p className="detail-title">{selectedTask.title}</p>
            {selectedTask.description && (
              <p className="detail-description">{selectedTask.description}</p>
            )}
            <div className="detail-meta">
              <span>状态: {selectedTask.status}</span>
              <span>优先级: {selectedTask.priority}</span>
              {selectedTask.dueDate && (
                <span>截止日期: {new Date(selectedTask.dueDate).toLocaleDateString()}</span>
              )}
              {selectedTask.scheduledStart && (
                <span>已安排: {new Date(selectedTask.scheduledStart).toLocaleString()}</span>
              )}
            </div>
          </div>
          <div className="task-detail-actions">
            {selectedTask.scheduledStart ? (
              <button
                className="action-btn secondary"
                onClick={() => unscheduleTask(selectedTask.id)}
              >
                取消安排
              </button>
            ) : (
              <button
                className="action-btn primary"
                onClick={() => {
                  // 默认安排到今天
                  const now = new Date();
                  scheduleTask(selectedTask.id, now);
                }}
              >
                安排到今天
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============== 便捷导出 ==============

export default TaskView;
