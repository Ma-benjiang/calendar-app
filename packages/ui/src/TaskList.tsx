import React, { useState, useCallback, useMemo } from 'react';
import {
  Task,
  TaskStatus,
  TaskPriority,
  CreateTaskInput,
  getPriorityColor,
} from '@calendar/core';
import { ChevronRight, Plus, Trash2, Edit2, Sparkles } from 'lucide-react';
import './TaskList.css';

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
  onSmartSchedule?: () => void;
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
  autoFocus?: boolean;
  onCancel?: () => void;
}

// ============== QuickAdd 组件 ==============

const QuickAdd: React.FC<QuickAddProps> = ({ onAdd, placeholder = '新建任务...', autoFocus = false, onCancel }) => {
  const [title, setTitle] = useState('');
  const [isExpanded, setIsExpanded] = useState(autoFocus);
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
    if (!autoFocus) setIsExpanded(false);
  }, [title, priority, onAdd, autoFocus]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      if (onCancel) onCancel();
      else setIsExpanded(false);
      setTitle('');
    }
  }, [handleSubmit, onCancel]);

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
          autoFocus={autoFocus}
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
                  style={{ backgroundColor: getPriorityColor(p) }}
                  onClick={() => setPriority(p)}
                />
              ))}
            </div>
            <div className="quick-add-hints">
              <span>Enter 保存 · Esc 取消</span>
            </div>
          </div>
        )}
      </div>
    </form>
  );
};

// ============== TaskItem 组件 ==============

const TaskItem: React.FC<TaskItemProps> = (props) => {
  const {
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
  } = props;

  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingSubTask, setIsAddingSubTask] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const isCompleted = task.status === 'completed';
  const isCancelled = task.status === 'cancelled';

  const subTasks = useMemo(() => getSubTasks?.(task.id) || [], [task.id, getSubTasks]);
  const progress = useMemo(() => getTaskProgress?.(task.id), [task.id, getTaskProgress]);
  const hasSubTasks = subTasks.length > 0;

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleComplete?.(task.id);
  }, [task.id, onToggleComplete]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (isSubTask) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(task));
    onDragStart?.(task);
  }, [task, onDragStart, isSubTask]);

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
    return `${due.getMonth() + 1}月${due.getDate()}日`;
  };

  return (
    <div className="task-group-item">
      <div className={`task-item-wrapper ${isSubTask ? 'is-subtask' : ''}`}>
        <div
          className={`task-item ${isCompleted ? 'completed' : ''} ${isCancelled ? 'cancelled' : ''} ${isDragging ? 'dragging' : ''}`}
          draggable={!isEditing && !isSubTask}
          onDragStart={handleDragStart}
          onClick={() => !isEditing && onClick?.(task)}
        >
          {(hasSubTasks || onCreateSubTask) && (
            <button 
              className={`task-expand-btn ${isExpanded ? 'expanded' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              <ChevronRight size={12} />
            </button>
          )}

          <div
            className="task-priority-indicator"
            style={{ backgroundColor: getPriorityColor(task.priority) }}
          />

          <button
            className={`task-checkbox ${isCompleted ? 'checked' : ''}`}
            onClick={handleToggle}
          >
            {isCompleted && '✓'}
          </button>

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
                <div className="task-title-row">
                  <span
                    className="task-title"
                    onDoubleClick={() => !isCompleted && setIsEditing(true)}
                  >
                    {task.title}
                  </span>
                  {hasSubTasks && progress && (
                    <div className="task-parent-progress" title={`${progress.completed}/${progress.total}`}>
                      <div className="progress-fill" style={{ width: `${progress.percentage}%` }} />
                    </div>
                  )}
                </div>
                <div className="task-meta">
                  {task.tags.map((tag) => (
                    <span key={tag} className="task-tag">{tag}</span>
                  ))}
                  {task.project && (
                    <span className="task-project">{task.project}</span>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="task-right">
            {task.dueDate && (
              <span className={`task-due-date ${new Date(task.dueDate) < new Date() && !isCompleted ? 'overdue' : ''}`}>
                {formatDueDate(new Date(task.dueDate))}
              </span>
            )}
            {!isEditing && (
              <div className="task-actions">
                <button
                  className="task-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                >
                  <Edit2 size={12} />
                </button>
                <button
                  className="task-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('确定删除此任务？')) {
                      onDeleteTask?.(task.id);
                    }
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="task-subtasks-container">
          {subTasks.map((subTask) => (
            <TaskItem
              key={subTask.id}
              {...props}
              task={subTask}
              isSubTask={true}
            />
          ))}
          
          {onCreateSubTask && (
            isAddingSubTask ? (
              <div className="subtask-quick-add-wrapper" style={{ marginLeft: '36px' }}>
                <QuickAdd 
                  autoFocus={true}
                  placeholder="添加子任务..."
                  onAdd={(input) => {
                    onCreateSubTask(task.id, input);
                    setIsAddingSubTask(false);
                  }}
                  onCancel={() => setIsAddingSubTask(false)}
                />
              </div>
            ) : (
              <button 
                className="subtask-add-btn"
                onClick={() => setIsAddingSubTask(true)}
              >
                <Plus size={12} />
                <span>添加子任务</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};

// ============== TaskList 组件 ==============

export const TaskList: React.FC<TaskListProps> = (props) => {
  const {
    tasks,
    onCreateTask,
    onSmartSchedule,
    showAddInput = true,
    className = '',
  } = props;

  const [activeFilter, setActiveFilter] = useState<TaskStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => !t.parentId);
    if (activeFilter !== 'all') {
      result = result.filter((t) => t.status === activeFilter);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }
    const priorityWeights: Record<TaskPriority, number> = { high: 3, medium: 2, low: 1, none: 0 };
    result.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      return priorityWeights[b.priority] - priorityWeights[a.priority];
    });
    return result;
  }, [tasks, activeFilter, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: tasks.filter(t => !t.parentId).length,
      todo: tasks.filter((t) => !t.parentId && t.status === 'todo').length,
      completed: tasks.filter((t) => !t.parentId && t.status === 'completed').length,
    };
  }, [tasks]);

  return (
    <div className={`task-list-container ${className}`}>
      <div className="task-list-header">
        <div className="task-list-title">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <h3>任务清单</h3>
            <span className="task-count">{filteredTasks.length} / {stats.total}</span>
          </div>
          
          {onSmartSchedule && (
            <button 
              onClick={onSmartSchedule}
              className="smart-schedule-icon-btn"
              title="智能整理任务"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#9a9a97',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s'
              }}
            >
              <Sparkles size={18} />
            </button>
          )}
        </div>

        <div className="task-list-filters">
          <div className="task-search">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索任务..."
              className="task-search-input"
            />
          </div>

          <div className="filter-tabs">
            {(['all', 'todo', 'completed'] as const).map((f) => (
              <button
                key={f}
                className={`filter-tab ${activeFilter === f ? 'active' : ''}`}
                onClick={() => setActiveFilter(f)}
              >
                {f === 'all' ? '全部' : f === 'todo' ? '待办' : '已完成'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showAddInput && onCreateTask && (
        <QuickAdd onAdd={onCreateTask} />
      )}

      <div className="task-list-content">
        <div className="task-items">
          {filteredTasks.map((task) => (
            <TaskItem
              key={task.id}
              {...props}
              task={task}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskList;
export { QuickAdd, TaskItem };
export type { TaskListProps, TaskItemProps, QuickAddProps };
