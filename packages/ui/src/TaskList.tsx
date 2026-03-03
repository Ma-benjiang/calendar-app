import React, { useState, useCallback, useMemo } from 'react';
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskFilter,
  TaskSortOption,
  CreateTaskInput,
  getPriorityColor,
  getPriorityLabel,
  getStatusLabel,
} from '@calendar/core';

// ============== 类型定义 ==============

interface TaskListProps {
  tasks: Task[];
  onCreateTask?: (input: CreateTaskInput) => void;
  onUpdateTask?: (id: string, updates: Partial<Task>) => void;
  onDeleteTask?: (id: string) => void;
  onToggleComplete?: (id: string) => void;
  onScheduleTask?: (id: string, start: Date, end?: Date) => void;
  onTaskClick?: (task: Task) => void;
  onTaskDragStart?: (task: Task) => void;
  // 子任务相关
  onCreateSubTask?: (parentId: string, input: CreateTaskInput) => void;
  getSubTasks?: (parentId: string) => Task[];
  getTaskProgress?: (taskId: string) => { completed: number; total: number; percentage: number };
  filter?: TaskFilter;
  sortBy?: TaskSortOption;
  viewMode?: 'list' | 'grouped';
  showAddInput?: boolean;
  className?: string;
}

interface TaskItemProps {
  task: Task;
  onToggleComplete?: (id: string) => void;
  onUpdateTask?: (id: string, updates: Partial<Task>) => void;
  onDeleteTask?: (id: string) => void;
  onClick?: (task: Task) => void;
  onDragStart?: (task: Task) => void;
  isDragging?: boolean;
  isSubTask?: boolean;
  // 子任务相关
  onCreateSubTask?: (parentId: string, input: CreateTaskInput) => void;
  getSubTasks?: (parentId: string) => Task[];
  getTaskProgress?: (taskId: string) => { completed: number; total: number; percentage: number };
}

interface QuickAddProps {
  onAdd: (input: CreateTaskInput) => void;
  placeholder?: string;
}

// ============== 常量 ==============

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
  none: '#9ca3af',
};

const STATUS_ICONS: Record<TaskStatus, string> = {
  'todo': '○',
  'in-progress': '◐',
  'completed': '✓',
  'cancelled': '✕',
};

// ============== QuickAdd 组件 ==============

const QuickAdd: React.FC<QuickAddProps> = ({ onAdd, placeholder = '添加新任务...' }) => {
  const [title, setTitle] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [priority, setPriority] = useState<TaskPriority>('none');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({
      title: title.trim(),
      priority,
    });

    setTitle('');
    setPriority('none');
    setIsExpanded(false);
  }, [title, priority, onAdd]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      setIsExpanded(false);
      setTitle('');
    }
  }, [handleSubmit]);

  return (
    <form className="task-quick-add" onSubmit={handleSubmit}>
      <div className={`quick-add-input-wrapper ${isExpanded ? 'expanded' : ''}`}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="quick-add-input"
        />
        
        {isExpanded && (
          <div className="quick-add-options">
            <div className="priority-selector">
              {(['high', 'medium', 'low', 'none'] as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`priority-btn ${priority === p ? 'active' : ''}`}
                  style={{ backgroundColor: PRIORITY_COLORS[p] }}
                  onClick={() => setPriority(p)}
                  title={getPriorityLabel(p)}
                />
              ))}
            </div>
            <div className="quick-add-hints">
              <span>Enter 创建 · Esc 取消</span>
            </div>
          </div>
        )}
      </div>
    </form>
  );
};

// ============== SubTaskItem 子任务项组件 ==============

interface SubTaskItemProps {
  task: Task;
  onToggleComplete?: (id: string) => void;
  onUpdateTask?: (id: string, updates: Partial<Task>) => void;
  onDeleteTask?: (id: string) => void;
}

const SubTaskItem: React.FC<SubTaskItemProps> = ({
  task,
  onToggleComplete,
  onUpdateTask,
  onDeleteTask,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const isCompleted = task.status === 'completed';

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleComplete?.(task.id);
  }, [task.id, onToggleComplete]);

  const handleSaveEdit = useCallback(() => {
    if (editTitle.trim() && editTitle !== task.title) {
      onUpdateTask?.(task.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  }, [editTitle, task.id, task.title, onUpdateTask]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditTitle(task.title);
      setIsEditing(false);
    }
  }, [handleSaveEdit, task.title]);

  return (
    <div className={`subtask-item ${isCompleted ? 'completed' : ''}`}>
      <button
        className={`subtask-checkbox ${isCompleted ? 'checked' : ''}`}
        onClick={handleToggle}
      >
        {isCompleted ? '✓' : '○'}
      </button>

      {isEditing ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={handleKeyDown}
          autoFocus
          className="subtask-edit-input"
        />
      ) : (
        <span
          className="subtask-title"
          onDoubleClick={() => !isCompleted && setIsEditing(true)}
        >
          {task.title}
        </span>
      )}

      {!isEditing && (
        <div className="subtask-actions">
          <button
            className="subtask-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            title="编辑"
          >
            ✏️
          </button>
          <button
            className="subtask-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('确定删除此子任务？')) {
                onDeleteTask?.(task.id);
              }
            }}
            title="删除"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
};

// ============== SubTaskList 子任务列表组件 ==============

interface SubTaskListProps {
  parentId: string;
  subTasks: Task[];
  onCreateSubTask?: (parentId: string, input: CreateTaskInput) => void;
  onToggleComplete?: (id: string) => void;
  onUpdateTask?: (id: string, updates: Partial<Task>) => void;
  onDeleteTask?: (id: string) => void;
}

const SubTaskList: React.FC<SubTaskListProps> = ({
  parentId,
  subTasks,
  onCreateSubTask,
  onToggleComplete,
  onUpdateTask,
  onDeleteTask,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onCreateSubTask?.(parentId, {
      title: newTitle.trim(),
      priority: 'none',
    });

    setNewTitle('');
    setIsAdding(false);
  }, [newTitle, parentId, onCreateSubTask]);

  const completedCount = subTasks.filter(t => t.status === 'completed').length;
  const progress = subTasks.length > 0 ? Math.round((completedCount / subTasks.length) * 100) : 0;

  return (
    <div className="subtask-list">
      {/* 进度条 */}
      {subTasks.length > 0 && (
        <div className="subtask-progress">
          <div className="subtask-progress-bar">
            <div
              className="subtask-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="subtask-progress-text">
            {completedCount}/{subTasks.length} ({progress}%)
          </span>
        </div>
      )}

      {/* 子任务列表 */}
      <div className="subtask-items">
        {subTasks.map((subTask) => (
          <SubTaskItem
            key={subTask.id}
            task={subTask}
            onToggleComplete={onToggleComplete}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>

      {/* 添加子任务 */}
      {isAdding ? (
        <form className="subtask-add-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="输入子任务标题..."
            autoFocus
            className="subtask-add-input"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsAdding(false);
                setNewTitle('');
              }
            }}
          />
          <div className="subtask-add-hints">
            <span>Enter 添加 · Esc 取消</span>
          </div>
        </form>
      ) : (
        <button
          className="subtask-add-btn"
          onClick={() => setIsAdding(true)}
        >
          + 添加子任务
        </button>
      )}
    </div>
  );
};

// ============== TaskItem 组件 ==============

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleComplete,
  onUpdateTask,
  onDeleteTask,
  onClick,
  onDragStart,
  isDragging,
  isSubTask,
  onCreateSubTask,
  getSubTasks,
  getTaskProgress,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [isExpanded, setIsExpanded] = useState(false);

  const isCompleted = task.status === 'completed';
  const isCancelled = task.status === 'cancelled';

  // 获取子任务
  const subTasks = useMemo(() => {
    return getSubTasks?.(task.id) || [];
  }, [task.id, getSubTasks]);

  const hasSubTasks = subTasks.length > 0;

  // 获取进度
  const progress = useMemo(() => {
    return getTaskProgress?.(task.id) || { completed: 0, total: 0, percentage: 0 };
  }, [task.id, getTaskProgress]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleComplete?.(task.id);
  }, [task.id, onToggleComplete]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(task));
    onDragStart?.(task);
  }, [task, onDragStart]);

  const handleSaveEdit = useCallback(() => {
    if (editTitle.trim() && editTitle !== task.title) {
      onUpdateTask?.(task.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  }, [editTitle, task.id, task.title, onUpdateTask]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditTitle(task.title);
      setIsEditing(false);
    }
  }, [handleSaveEdit, task.title]);

  const formatDueDate = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(date);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '明天';
    if (diffDays === -1) return '昨天';
    if (diffDays > 0 && diffDays <= 7) return `${diffDays}天后`;

    return `${due.getMonth() + 1}/${due.getDate()}`;
  };

  const getScheduledTimeText = (): string | null => {
    if (!task.scheduledStart) return null;
    const start = new Date(task.scheduledStart);
    return `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className={`task-item-wrapper ${isSubTask ? 'is-subtask' : ''}`}>
      <div
        className={`task-item ${isCompleted ? 'completed' : ''} ${isCancelled ? 'cancelled' : ''} ${isDragging ? 'dragging' : ''}`}
        draggable={!isEditing && !isSubTask}
        onDragStart={handleDragStart}
        onClick={() => !isEditing && onClick?.(task)}
      >
        {/* 展开/折叠按钮（有子任务时显示） */}
        {hasSubTasks && (
          <button
            className={`task-expand-btn ${isExpanded ? 'expanded' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            title={isExpanded ? '折叠子任务' : '展开子任务'}
          >
            ▶
          </button>
        )}

        {/* 优先级指示条 */}
        <div
          className="task-priority-indicator"
          style={{ backgroundColor: getPriorityColor(task.priority) }}
        />

        {/* 完成状态复选框 */}
        <button
          className={`task-checkbox ${isCompleted ? 'checked' : ''}`}
          onClick={handleToggle}
          title={isCompleted ? '标记为未完成' : '标记为完成'}
        >
          {isCompleted ? '✓' : '○'}
        </button>

        {/* 任务内容 */}
        <div className="task-content">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleKeyDown}
              autoFocus
              className="task-edit-input"
            />
          ) : (
            <>
              <span
                className="task-title"
                onDoubleClick={() => !isCompleted && setIsEditing(true)}
              >
                {task.title}
              </span>

              {/* 标签和元信息 */}
              <div className="task-meta">
                {task.tags.length > 0 && (
                  <span className="task-tags">
                    {task.tags.map((tag) => (
                      <span key={tag} className="task-tag">#{tag}</span>
                    ))}
                  </span>
                )}

                {task.project && (
                  <span className="task-project">
                    📁 {task.project}
                  </span>
                )}

                {/* 子任务数量指示 */}
                {hasSubTasks && (
                  <span className="task-subtask-count" title="子任务">
                    📋 {progress.completed}/{progress.total}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* 右侧信息 */}
        <div className="task-right">
          {task.scheduledStart && (
            <span className="task-scheduled" title="已安排时间">
              🕐 {getScheduledTimeText()}
            </span>
          )}

          {task.dueDate && (
            <span
              className={`task-due-date ${
                new Date(task.dueDate) < new Date() && !isCompleted ? 'overdue' : ''
              }`}
            >
              📅 {formatDueDate(new Date(task.dueDate))}
            </span>
          )}

          {task.estimatedMinutes && (
            <span className="task-estimated" title="预计耗时">
              ⏱️ {task.estimatedMinutes}分钟
            </span>
          )}

          {/* 操作按钮 */}
          {!isEditing && (
            <div className="task-actions">
              <button
                className="task-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                title="添加/查看子任务"
              >
                📋
              </button>
              <button
                className="task-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                title="编辑"
              >
                ✏️
              </button>
              <button
                className="task-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('确定删除此任务？')) {
                    onDeleteTask?.(task.id);
                  }
                }}
                title="删除"
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 子任务列表 */}
      {(isExpanded || (hasSubTasks && isExpanded)) && (
        <SubTaskList
          parentId={task.id}
          subTasks={subTasks}
          onCreateSubTask={onCreateSubTask}
          onToggleComplete={onToggleComplete}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
        />
      )}
    </div>
  );
};

// ============== TaskList 组件 ==============

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onToggleComplete,
  onScheduleTask: _onScheduleTask,
  onTaskClick,
  onTaskDragStart,
  onCreateSubTask,
  getSubTasks,
  getTaskProgress,
  filter = {},
  sortBy = 'dueDate-asc',
  viewMode = 'list',
  showAddInput = true,
  className = '',
}) => {
  const [activeFilter, setActiveFilter] = useState<TaskStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤和排序任务
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // 应用状态筛选
    if (activeFilter !== 'all') {
      result = result.filter((t) => t.status === activeFilter);
    }

    // 应用搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // 应用自定义筛选
    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      result = result.filter((t) => statuses.includes(t.status));
    }

    if (filter.priority) {
      const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
      result = result.filter((t) => priorities.includes(t.priority));
    }

    if (filter.tags) {
      result = result.filter((t) => filter.tags!.every((tag) => t.tags.includes(tag)));
    }

    if (filter.project) {
      result = result.filter((t) => t.project === filter.project);
    }

    if (filter.scheduled !== undefined) {
      result = result.filter((t) => !!t.scheduledStart === filter.scheduled);
    }

    // 排序
    const priorityWeights: Record<TaskPriority, number> = {
      high: 3,
      medium: 2,
      low: 1,
      none: 0,
    };

    result.sort((a, b) => {
      // 已完成任务放最后
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;

      switch (sortBy) {
        case 'dueDate-asc':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();

        case 'dueDate-desc':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return -1;
          if (!b.dueDate) return 1;
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();

        case 'priority-asc':
          return priorityWeights[a.priority] - priorityWeights[b.priority];

        case 'priority-desc':
          return priorityWeights[b.priority] - priorityWeights[a.priority];

        case 'createdAt-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

        case 'createdAt-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

        default:
          return 0;
      }
    });

    return result;
  }, [tasks, activeFilter, searchQuery, filter, sortBy]);

  // 按状态分组（用于分组视图）
  const groupedTasks = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = {
      todo: [],
      'in-progress': [],
      completed: [],
      cancelled: [],
    };

    filteredTasks.forEach((task) => {
      groups[task.status].push(task);
    });

    return groups;
  }, [filteredTasks]);

  // 统计
  const stats = useMemo(() => {
    return {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      inProgress: tasks.filter((t) => t.status === 'in-progress').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
    };
  }, [tasks]);

  const handleQuickAdd = useCallback(
    (input: CreateTaskInput) => {
      onCreateTask?.(input);
    },
    [onCreateTask]
  );

  const renderEmptyState = () => (
    <div className="task-empty-state">
      <div className="empty-icon">🎉</div>
      <p className="empty-title">{searchQuery ? '没有找到匹配的任务' : '今天没有任务'}</p>
      <p className="empty-subtitle">
        {searchQuery
          ? '尝试调整搜索词或筛选条件'
          : '享受自由时光，或者添加一个新任务'}
      </p>
      {searchQuery && (
        <button className="empty-action" onClick={() => setSearchQuery('')}>
          清除搜索
        </button>
      )}
    </div>
  );

  return (
    <div className={`task-list-container ${className}`}>
      {/* 头部工具栏 */}
      <div className="task-list-header">
        <div className="task-list-title">
          <h3>任务清单</h3>
          <span className="task-count">
            {filteredTasks.length} / {stats.total}
          </span>
        </div>

        <div className="task-list-filters">
          {/* 搜索框 */}
          <div className="task-search">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索任务..."
              className="task-search-input"
            />
            {searchQuery && (
              <button
                className="search-clear"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          {/* 状态筛选标签 */}
          <div className="filter-tabs">
            {[
              { key: 'all', label: '全部', count: stats.total },
              { key: 'todo', label: '待办', count: stats.todo },
              { key: 'in-progress', label: '进行中', count: stats.inProgress },
              { key: 'completed', label: '已完成', count: stats.completed },
            ].map((tab) => (
              <button
                key={tab.key}
                className={`filter-tab ${activeFilter === tab.key ? 'active' : ''}`}
                onClick={() => setActiveFilter(tab.key as TaskStatus | 'all')}
              >
                {tab.label}
                <span className="tab-count">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 快速添加 */}
      {showAddInput && onCreateTask && (
        <QuickAdd onAdd={handleQuickAdd} />
      )}

      {/* 任务列表 */}
      <div className="task-list-content">
        {filteredTasks.length === 0 ? (
          renderEmptyState()
        ) : viewMode === 'grouped' ? (
          // 分组视图
          <>
            {(['todo', 'in-progress', 'completed', 'cancelled'] as TaskStatus[]).map(
              (status) =>
                groupedTasks[status].length > 0 && (
                  <div key={status} className="task-group">
                    <div className="task-group-header">
                      <span className="group-status-icon">{STATUS_ICONS[status]}</span>
                      <span className="group-label">{getStatusLabel(status)}</span>
                      <span className="group-count">
                        {groupedTasks[status].length}
                      </span>
                    </div>
                    <div className="task-group-items">
                      {groupedTasks[status].map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onToggleComplete={onToggleComplete}
                          onUpdateTask={onUpdateTask}
                          onDeleteTask={onDeleteTask}
                          onClick={onTaskClick}
                          onDragStart={onTaskDragStart}
                          onCreateSubTask={onCreateSubTask}
                          getSubTasks={getSubTasks}
                          getTaskProgress={getTaskProgress}
                        />
                      ))}
                    </div>
                  </div>
                )
            )}
          </>
        ) : (
          // 列表视图
          <div className="task-items">
            {filteredTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                onClick={onTaskClick}
                onDragStart={onTaskDragStart}
                onCreateSubTask={onCreateSubTask}
                getSubTasks={getSubTasks}
                getTaskProgress={getTaskProgress}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============== 导出 ==============

export default TaskList;
export { QuickAdd, TaskItem, SubTaskItem, SubTaskList };
export type { TaskListProps, TaskItemProps, QuickAddProps, SubTaskItemProps, SubTaskListProps };
