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

  /**
   * 检查任务是否与事件时间冲突
   * @param task - 任务
   * @param excludeEventId - 排除检查的事件ID（用于更新时）
   * @returns 冲突的事件列表
   */
  findConflictingEvents(
    task: Task,
    excludeEventId?: string
  ): CalendarEvent[] {
    if (!task.scheduledStart || !task.scheduledEnd) {
      return [];
    }

    const taskStart = task.scheduledStart.getTime();
    const taskEnd = task.scheduledEnd.getTime();

    return this.getAllEvents().filter(event => {
      if (excludeEventId && event.id === excludeEventId) {
        return false;
      }

      const eventStart = event.startDate.getTime();
      const eventEnd = event.endDate.getTime();

      // 检查时间重叠
      return taskStart < eventEnd && taskEnd > eventStart;
    });
  }

  /**
   * 为任务查找可用的空闲时间段
   * @param durationMinutes - 需要的时长（分钟）
   * @param startFrom - 开始查找的时间
   * @param maxResults - 最大返回结果数
   * @returns 可用的时间段列表
   */
  findAvailableTimeSlots(
    durationMinutes: number,
    startFrom: Date = new Date(),
    maxResults: number = 5
  ): Array<{ start: Date; end: Date }> {
    const slots: Array<{ start: Date; end: Date }> = [];
    const durationMs = durationMinutes * 60000;
    
    // 搜索范围：从 startFrom 开始，检查未来7天
    const searchEnd = new Date(startFrom.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // 工作时间：9:00 - 18:00
    const workStartHour = 9;
    const workEndHour = 18;
    
    let currentCheck = new Date(startFrom);
    currentCheck.setMinutes(0, 0, 0);
    
    // 如果当前时间已经过了工作时间，从明天开始
    if (currentCheck.getHours() >= workEndHour) {
      currentCheck.setDate(currentCheck.getDate() + 1);
      currentCheck.setHours(workStartHour, 0, 0, 0);
    } else if (currentCheck.getHours() < workStartHour) {
      currentCheck.setHours(workStartHour, 0, 0, 0);
    }

    while (currentCheck < searchEnd && slots.length < maxResults) {
      const dayStart = new Date(currentCheck);
      dayStart.setHours(workStartHour, 0, 0, 0);
      
      const dayEnd = new Date(currentCheck);
      dayEnd.setHours(workEndHour, 0, 0, 0);

      // 获取当天所有事件
      const dayEvents = this.getAllEvents()
        .filter(e => {
          const eventDate = new Date(e.startDate);
          return eventDate.toDateString() === currentCheck.toDateString();
        })
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

      // 查找空闲时段
      let lastEndTime = dayStart.getTime();

      for (const event of dayEvents) {
        const eventStart = event.startDate.getTime();
        
        // 检查当前空闲时段是否足够
        if (eventStart - lastEndTime >= durationMs) {
          slots.push({
            start: new Date(lastEndTime),
            end: new Date(lastEndTime + durationMs),
          });
          
          if (slots.length >= maxResults) break;
        }
        
        lastEndTime = Math.max(lastEndTime, event.endDate.getTime());
      }

      // 检查工作日结束前的空闲时间
      if (slots.length < maxResults && dayEnd.getTime() - lastEndTime >= durationMs) {
        slots.push({
          start: new Date(lastEndTime),
          end: new Date(lastEndTime + durationMs),
        });
      }

      // 移动到下一天
      currentCheck.setDate(currentCheck.getDate() + 1);
      currentCheck.setHours(workStartHour, 0, 0, 0);
    }

    return slots;
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
