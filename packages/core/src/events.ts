// 事件管理 - CRUD 操作
import { CalendarEvent } from './calendar';
import { Task, CreateTaskInput } from './task';
import { generateUUID } from './utils';

export class EventManager {
  private events: Map<string, CalendarEvent> = new Map();
  private listeners: Set<(events: CalendarEvent[]) => void> = new Set();

  // 创建事件
  createEvent(eventData: Omit<CalendarEvent, 'id'>): CalendarEvent {
    const id = generateUUID();
    const event: CalendarEvent = { ...eventData, id };
    this.events.set(id, event);
    this.notifyListeners();
    return event;
  }

  // 更新事件
  updateEvent(id: string, updates: Partial<CalendarEvent>): CalendarEvent | null {
    const event = this.events.get(id);
    if (!event) return null;
    
    const updated = { ...event, ...updates };
    this.events.set(id, updated);
    this.notifyListeners();
    return updated;
  }

  // 删除事件
  deleteEvent(id: string): boolean {
    const deleted = this.events.delete(id);
    if (deleted) this.notifyListeners();
    return deleted;
  }

  // 获取所有事件
  getAllEvents(): CalendarEvent[] {
    return Array.from(this.events.values());
  }

  // 获取某日事件
  getEventsForDate(date: Date): CalendarEvent[] {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return this.getAllEvents().filter(event => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      
      return checkDate >= start && checkDate <= end;
    });
  }

  // 订阅变更
  subscribe(listener: (events: CalendarEvent[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const events = this.getAllEvents();
    this.listeners.forEach(listener => listener(events));
  }

  // 从存储加载
  loadFromStorage(data: CalendarEvent[]): void {
    this.events.clear();
    data.forEach(event => {
      this.events.set(event.id, event);
    });
    this.notifyListeners();
  }

  // ========== 任务与事件转换 ==========

  /**
   * 将任务转换为日历事件
   * @param task - 要转换的任务
   * @param options - 可选配置
   * @returns 创建的日历事件
   */
  convertTaskToEvent(
    task: Task,
    options?: {
      startDate?: Date;     // 自定义开始时间，默认使用 task.scheduledStart
      endDate?: Date;       // 自定义结束时间，默认使用 task.scheduledEnd
      preserveAsTask?: boolean; // 是否保留原任务（默认为 true）
    }
  ): CalendarEvent {
    // 确定开始时间
    const startDate = options?.startDate 
      || task.scheduledStart 
      || new Date();
    
    // 确定结束时间
    const endDate = options?.endDate 
      || task.scheduledEnd 
      || new Date(startDate.getTime() + (task.estimatedMinutes || 30) * 60000);

    // 创建事件
    const event = this.createEvent({
      title: task.title,
      description: this.buildEventDescription(task),
      startDate,
      endDate,
      allDay: false,
      color: task.color || this.getPriorityColor(task.priority),
      reminder: 15, // 默认提前15分钟提醒
    });

    return event;
  }

  /**
   * 将日历事件转换为任务
   * @param event - 要转换的事件
   * @param options - 可选配置
   * @returns 创建任务的输入数据（可用于 TaskManager.createTask）
   */
  convertEventToTaskInput(
    event: CalendarEvent,
    options?: {
      priority?: Task['priority'];
      project?: string;
      tags?: string[];
      preserveAsEvent?: boolean; // 是否保留原事件（默认为 true）
    }
  ): CreateTaskInput {
    // 计算预计耗时（分钟）
    const estimatedMinutes = Math.round(
      (event.endDate.getTime() - event.startDate.getTime()) / 60000
    );

    // 提取描述中的标签（如果有 #tag 格式）
    const extractedTags = this.extractTagsFromText(event.description || '');
    const tags = [...new Set([...(options?.tags || []), ...extractedTags])];

    return {
      title: event.title,
      description: event.description,
      dueDate: event.endDate, // 使用事件结束时间作为截止日期
      scheduledStart: event.startDate,
      scheduledEnd: event.endDate,
      estimatedMinutes: estimatedMinutes > 0 ? estimatedMinutes : 30,
      priority: options?.priority || 'medium',
      project: options?.project,
      tags,
      color: event.color,
    };
  }

  // ========== 私有辅助方法 ==========

  private buildEventDescription(task: Task): string {
    const parts: string[] = [];
    
    if (task.description) {
      parts.push(task.description);
    }
    
    // 添加任务元信息
    const metaParts: string[] = [];
    
    if (task.priority && task.priority !== 'none') {
      metaParts.push(`优先级: ${task.priority}`);
    }
    
    if (task.project) {
      metaParts.push(`项目: ${task.project}`);
    }
    
    if (task.tags.length > 0) {
      metaParts.push(`标签: ${task.tags.join(', ')}`);
    }
    
    if (task.estimatedMinutes) {
      metaParts.push(`预计耗时: ${task.estimatedMinutes}分钟`);
    }

    if (metaParts.length > 0) {
      parts.push('\n---\n' + metaParts.join(' | '));
    }

    return parts.join('\n');
  }

  private getPriorityColor(priority?: Task['priority']): string {
    const colors: Record<string, string> = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#3b82f6',
      none: '#9ca3af',
    };
    return colors[priority || 'none'];
  }

  private extractTagsFromText(text: string): string[] {
    const tagRegex = /#(\w+)/g;
    const tags: string[] = [];
    let match;
    
    while ((match = tagRegex.exec(text)) !== null) {
      tags.push(match[1]);
    }
    
    return tags;
  }
}
