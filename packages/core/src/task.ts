/**
 * 任务与待办清单模块 - 核心逻辑
 * 遵循 PRD v1.0 规范
 */
import { generateUUID } from './utils';
import { CalendarEvent } from './calendar';
import { RecurrenceFrequency } from './recurrence';

// ============== 类型定义 ==============

/** 任务状态 */
export type TaskStatus = 'todo' | 'in-progress' | 'completed' | 'cancelled';

/** 任务优先级 */
export type TaskPriority = 'high' | 'medium' | 'low' | 'none';

/** 任务循环规则 */
export interface TaskRecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number;        // 间隔，默认1
  weekDays?: number[];      // 周几 [0-6]，0=周日
  endCondition?: 'never' | 'count' | 'date';
  endCount?: number;        // 重复次数
  endDate?: Date;           // 结束日期
}

/** 任务实体 */
export interface Task {
  id: string;
  title: string;
  description?: string;
  
  // 时间相关
  dueDate?: Date;           // 截止日期
  scheduledStart?: Date;    // 安排的开始时间（关联日历）
  scheduledEnd?: Date;      // 安排的结束时间
  estimatedMinutes?: number; // 预计耗时（分钟）
  
  // 状态
  status: TaskStatus;
  completedAt?: Date;
  
  // 优先级
  priority: TaskPriority;
  
  // 分类
  project?: string;         // 所属项目
  tags: string[];
  color?: string;
  
  // 循环
  recurrence?: TaskRecurrenceRule;
  parentTaskId?: string;    // 父任务ID（子任务）
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
}

/** 创建任务的输入类型（不含系统自动生成字段） */
export type CreateTaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'tags' | 'priority'> & {
  status?: TaskStatus;
  tags?: string[];
  priority?: TaskPriority;
};

/** 更新任务的输入类型 */
export type UpdateTaskInput = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>;

/** 任务筛选条件 */
export interface TaskFilter {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  project?: string;
  tags?: string[];
  dueBefore?: Date;
  dueAfter?: Date;
  scheduled?: boolean;      // true=已安排, false=未安排
  searchQuery?: string;
}

/** 任务排序选项 */
export type TaskSortOption = 
  | 'dueDate-asc' 
  | 'dueDate-desc' 
  | 'priority-asc' 
  | 'priority-desc' 
  | 'createdAt-asc' 
  | 'createdAt-desc';

// ============== 优先级权重映射 ==============

const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

// ============== TaskManager 类 ==============

export class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private listeners: Set<(tasks: Task[]) => void> = new Set();

  // ---------- CRUD 操作 ----------

  /**
   * 创建任务
   */
  createTask(input: CreateTaskInput): Task {
    const now = new Date();
    const task: Task = {
      ...input,
      id: generateUUID(),
      status: input.status || 'todo',
      tags: input.tags || [],
      priority: input.priority || 'medium',
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(task.id, task);
    this.notifyListeners();
    return task;
  }

  /**
   * 更新任务
   */
  updateTask(id: string, updates: UpdateTaskInput): Task | null {
    const task = this.tasks.get(id);
    if (!task) return null;

    const updated: Task = {
      ...task,
      ...updates,
      id: task.id,              // 保护 id 不被修改
      createdAt: task.createdAt, // 保护创建时间
      updatedAt: new Date(),
    };

    this.tasks.set(id, updated);
    this.notifyListeners();
    return updated;
  }

  /**
   * 删除任务
   */
  deleteTask(id: string): boolean {
    const deleted = this.tasks.delete(id);
    if (deleted) this.notifyListeners();
    return deleted;
  }

  /**
   * 根据 ID 获取任务
   */
  getTaskById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  // ---------- 批量操作 ----------

  /**
   * 批量创建任务
   */
  createTasks(inputs: CreateTaskInput[]): Task[] {
    return inputs.map(input => this.createTask(input));
  }

  /**
   * 批量删除任务
   */
  deleteTasks(ids: string[]): number {
    let count = 0;
    ids.forEach(id => {
      if (this.tasks.delete(id)) count++;
    });
    if (count > 0) this.notifyListeners();
    return count;
  }

  /**
   * 批量更新任务状态
   */
  batchUpdateStatus(ids: string[], status: TaskStatus): Task[] {
    const updated: Task[] = [];
    ids.forEach(id => {
      const task = this.updateTask(id, { status });
      if (task) updated.push(task);
    });
    return updated;
  }

  // ---------- 筛选与排序 ----------

  /**
   * 筛选任务
   */
  filterTasks(filter: TaskFilter): Task[] {
    return this.getAllTasks().filter(task => this.matchesFilter(task, filter));
  }

  /**
   * 排序任务
   */
  sortTasks(tasks: Task[], sortBy: TaskSortOption): Task[] {
    const sorted = [...tasks];
    
    switch (sortBy) {
      case 'dueDate-asc':
        return sorted.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.getTime() - b.dueDate.getTime();
        });
      
      case 'dueDate-desc':
        return sorted.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return -1;
          if (!b.dueDate) return 1;
          return b.dueDate.getTime() - a.dueDate.getTime();
        });
      
      case 'priority-asc':
        return sorted.sort((a, b) => PRIORITY_WEIGHTS[a.priority] - PRIORITY_WEIGHTS[b.priority]);
      
      case 'priority-desc':
        return sorted.sort((a, b) => PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority]);
      
      case 'createdAt-asc':
        return sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      
      case 'createdAt-desc':
        return sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      default:
        return sorted;
    }
  }

  /**
   * 筛选并排序任务
   */
  queryTasks(filter: TaskFilter, sortBy: TaskSortOption = 'dueDate-asc'): Task[] {
    return this.sortTasks(this.filterTasks(filter), sortBy);
  }

  /**
   * 获取指定日期的任务（按 dueDate 或 scheduledStart）
   */
  getTasksForDate(date: Date): Task[] {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    return this.getAllTasks().filter(task => {
      // 检查截止日期
      if (task.dueDate) {
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        if (due.getTime() === checkDate.getTime()) return true;
      }
      
      // 检查安排的开始时间
      if (task.scheduledStart) {
        const scheduled = new Date(task.scheduledStart);
        scheduled.setHours(0, 0, 0, 0);
        if (scheduled.getTime() === checkDate.getTime()) return true;
      }
      
      return false;
    });
  }

  /**
   * 获取今日待办任务
   */
  getTodayTasks(): Task[] {
    return this.getTasksForDate(new Date());
  }

  /**
   * 获取未安排的任务（未设置 scheduledStart）
   */
  getUnscheduledTasks(): Task[] {
    return this.getAllTasks().filter(
      task => !task.scheduledStart && task.status !== 'completed' && task.status !== 'cancelled'
    );
  }

  /**
   * 获取已完成的任务
   */
  getCompletedTasks(): Task[] {
    return this.getAllTasks().filter(task => task.status === 'completed');
  }

  // ---------- 状态操作 ----------

  /**
   * 标记任务为进行中
   */
  startTask(id: string): Task | null {
    return this.updateTask(id, { status: 'in-progress' });
  }

  /**
   * 标记任务完成
   */
  completeTask(id: string): Task | null {
    return this.updateTask(id, { 
      status: 'completed',
      completedAt: new Date(),
    });
  }

  /**
   * 取消任务
   */
  cancelTask(id: string): Task | null {
    return this.updateTask(id, { status: 'cancelled' });
  }

  /**
   * 重新打开已完成的任务
   */
  reopenTask(id: string): Task | null {
    return this.updateTask(id, { 
      status: 'todo',
      completedAt: undefined,
    });
  }

  /**
   * 切换任务完成状态
   */
  toggleTaskCompletion(id: string): Task | null {
    const task = this.getTaskById(id);
    if (!task) return null;
    
    if (task.status === 'completed') {
      return this.reopenTask(id);
    } else {
      return this.completeTask(id);
    }
  }

  // ---------- 日历关联 ----------

  /**
   * 为任务安排时间（关联到日历）
   */
  scheduleTask(id: string, start: Date, end?: Date): Task | null {
    const task = this.getTaskById(id);
    if (!task) return null;

    // 如果未提供结束时间，使用预计耗时或默认30分钟
    const scheduledEnd = end || new Date(
      start.getTime() + (task.estimatedMinutes || 30) * 60000
    );

    return this.updateTask(id, {
      scheduledStart: start,
      scheduledEnd,
    });
  }

  /**
   * 取消任务的时间安排
   */
  unscheduleTask(id: string): Task | null {
    return this.updateTask(id, {
      scheduledStart: undefined,
      scheduledEnd: undefined,
    });
  }

  // ---------- 子任务 ----------

  /**
   * 获取子任务
   */
  getSubTasks(parentId: string): Task[] {
    return this.getAllTasks().filter(task => task.parentTaskId === parentId);
  }

  /**
   * 创建子任务
   */
  createSubTask(parentId: string, input: Omit<CreateTaskInput, 'parentTaskId'>): Task | null {
    const parent = this.getTaskById(parentId);
    if (!parent) return null;

    return this.createTask({
      ...input,
      parentTaskId: parentId,
    });
  }

  // ---------- 标签与项目 ----------

  /**
   * 获取所有标签
   */
  getAllTags(): string[] {
    const tags = new Set<string>();
    this.getAllTasks().forEach(task => {
      task.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }

  /**
   * 获取所有项目
   */
  getAllProjects(): string[] {
    const projects = new Set<string>();
    this.getAllTasks().forEach(task => {
      if (task.project) projects.add(task.project);
    });
    return Array.from(projects).sort();
  }

  // ---------- 订阅变更 ----------

  /**
   * 订阅任务变更
   */
  subscribe(listener: (tasks: Task[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const tasks = this.getAllTasks();
    this.listeners.forEach(listener => listener(tasks));
  }

  // ---------- 存储加载 ----------

  /**
   * 从存储加载任务
   */
  loadFromStorage(data: Task[]): void {
    this.tasks.clear();
    data.forEach(task => {
      // 还原日期对象
      const restored: Task = {
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        scheduledStart: task.scheduledStart ? new Date(task.scheduledStart) : undefined,
        scheduledEnd: task.scheduledEnd ? new Date(task.scheduledEnd) : undefined,
        completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        recurrence: task.recurrence ? {
          ...task.recurrence,
          endDate: task.recurrence.endDate ? new Date(task.recurrence.endDate) : undefined,
        } : undefined,
      };
      this.tasks.set(restored.id, restored);
    });
    this.notifyListeners();
  }

  /**
   * 导出为存储格式
   */
  exportToStorage(): Task[] {
    return this.getAllTasks();
  }

  // ---------- 私有辅助方法 ----------

  private matchesFilter(task: Task, filter: TaskFilter): boolean {
    // 状态筛选
    if (filter.status !== undefined) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      if (!statuses.includes(task.status)) return false;
    }

    // 优先级筛选
    if (filter.priority !== undefined) {
      const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
      if (!priorities.includes(task.priority)) return false;
    }

    // 项目筛选
    if (filter.project !== undefined && task.project !== filter.project) {
      return false;
    }

    // 标签筛选（必须包含所有指定标签）
    if (filter.tags !== undefined && filter.tags.length > 0) {
      if (!filter.tags.every(tag => task.tags.includes(tag))) return false;
    }

    // 截止日期前
    if (filter.dueBefore !== undefined && task.dueDate) {
      if (task.dueDate.getTime() >= filter.dueBefore.getTime()) return false;
    }

    // 截止日期后
    if (filter.dueAfter !== undefined && task.dueDate) {
      if (task.dueDate.getTime() <= filter.dueAfter.getTime()) return false;
    }

    // 是否已安排
    if (filter.scheduled !== undefined) {
      const isScheduled = !!task.scheduledStart;
      if (isScheduled !== filter.scheduled) return false;
    }

    // 搜索查询
    if (filter.searchQuery !== undefined && filter.searchQuery.trim() !== '') {
      const query = filter.searchQuery.toLowerCase();
      const titleMatch = task.title.toLowerCase().includes(query);
      const descMatch = task.description?.toLowerCase().includes(query) || false;
      const tagMatch = task.tags.some(tag => tag.toLowerCase().includes(query));
      if (!titleMatch && !descMatch && !tagMatch) return false;
    }

    return true;
  }
}

// ============== 快捷函数 ==============

/**
 * 获取优先级显示文本
 */
export function getPriorityLabel(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    high: '高优先级',
    medium: '中优先级',
    low: '低优先级',
    none: '无优先级',
  };
  return labels[priority];
}

/**
 * 获取优先级颜色
 */
export function getPriorityColor(priority: TaskPriority): string {
  const colors: Record<TaskPriority, string> = {
    high: '#ef4444',    // red-500
    medium: '#f59e0b',  // amber-500
    low: '#3b82f6',     // blue-500
    none: '#9ca3af',    // gray-400
  };
  return colors[priority];
}

/**
 * 获取状态显示文本
 */
export function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    'todo': '待办',
    'in-progress': '进行中',
    'completed': '已完成',
    'cancelled': '已取消',
  };
  return labels[status];
}
