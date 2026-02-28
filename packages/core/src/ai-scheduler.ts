/**
 * AI 智能调度器核心引擎
 * 负责任务的智能排程、冲突检测和重新安排
 *
 * 算法复杂度: O(n²)
 * - 优先级排序: O(n log n)
 * - 调度主循环: O(n * m)，其中 m 是时间槽数量
 * - 冲突检测: O(n)，n 是事件数量
 */

import { Task, TaskPriority } from './task';
import { CalendarEvent } from './calendar';

// ============== 类型定义 ==============

/** 任务类型 */
export type TaskType = 'deep-work' | 'admin' | 'creative' | 'meeting';

/** 时间槽 */
export interface TimeSlot {
  start: Date;
  end: Date;
  confidence?: number;  // 匹配置信度 0-100
  reason?: string;      // 推荐理由
}

/** 冲突信息 */
export interface Conflict {
  type: 'overlap' | 'deadline' | 'buffer' | 'preference';
  event?: CalendarEvent;
  task?: Task;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

/** 已调度任务 */
export interface ScheduledTask extends TimeSlot {
  taskId: string;
  task: Task;
  confidence: number;
  reason: string;
}

/** 用户偏好 */
export interface UserPreference {
  /** 时段偏好 (0-100 分数) */
  productiveHours: {
    morning: number;    // 06:00-12:00
    afternoon: number;  // 12:00-18:00
    evening: number;    // 18:00-22:00
    night: number;      // 22:00-06:00
  };

  /** 任务类型偏好时段 */
  taskTypeSlots: Record<TaskType, Array<{ start: number; end: number }>>;

  /** 缓冲时间 (分钟) */
  bufferMinutes: number;

  /** 工作时段 */
  workingHours: {
    start: number;  // 0-23
    end: number;    // 0-23
  };

  /** 工作日 */
  workDays: number[];  // 0-6, 0=周日

  /** 每日最大任务数 */
  maxDailyTasks?: number;
}

/** 调度选项 */
export interface ScheduleOptions {
  /** 调度起始时间 */
  startFrom?: Date;
  /** 调度结束时间 */
  endAt?: Date;
  /** 是否只预览不应用 */
  dryRun?: boolean;
  /** 最大调度天数 */
  maxDays?: number;
}

/** 调度结果 */
export interface ScheduleResult {
  scheduled: ScheduledTask[];
  metadata: {
    totalTasks: number;
    scheduledCount: number;
    failedCount: number;
    averageConfidence: number;
    startTime: Date;
    endTime: Date;
  };
}

/** 冲突重新调度结果 */
export interface RescheduleResult {
  moved: ScheduledTask[];
  skipped: string[];
  conflicts: Conflict[];
}

/** 优先级权重映射 - 与 task.ts 保持一致 */
const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

/** 默认用户偏好 */
const DEFAULT_PREFERENCES: UserPreference = {
  productiveHours: {
    morning: 80,
    afternoon: 60,
    evening: 40,
    night: 20,
  },
  taskTypeSlots: {
    'deep-work': [{ start: 9, end: 12 }],    // 专注型任务：上午
    'admin': [{ start: 14, end: 16 }],        // 事务型任务：下午
    'creative': [{ start: 10, end: 12 }, { start: 15, end: 17 }],  // 创意型
    'meeting': [{ start: 10, end: 12 }, { start: 14, end: 17 }],   // 会议型
  },
  bufferMinutes: 15,
  workingHours: { start: 9, end: 18 },
  workDays: [1, 2, 3, 4, 5],  // 周一到周五
};

// ============== AI Scheduler 类 ==============

export class AIScheduler {
  private preferences: UserPreference;
  private cache: Map<string, any> = new Map();
  private taskManager: any;
  private eventManager: any;

  constructor(taskManagerOrPrefs?: any, eventManager?: any) {
    // 支持两种构造函数签名:
    // new AIScheduler() - 无参数
    // new AIScheduler(taskManager, eventManager) - 测试用
    // new AIScheduler(partialPreferences) - 带偏好设置
    if (taskManagerOrPrefs && typeof taskManagerOrPrefs === 'object' &&
        ('createTask' in taskManagerOrPrefs || 'getAllTasks' in taskManagerOrPrefs)) {
      // 测试用：传入的是 taskManager
      this.taskManager = taskManagerOrPrefs;
      this.eventManager = eventManager;
      this.preferences = getDefaultPreferences();
    } else if (taskManagerOrPrefs) {
      // 带偏好设置
      this.preferences = { ...DEFAULT_PREFERENCES, ...taskManagerOrPrefs };
    } else {
      // 无参数
      this.preferences = getDefaultPreferences();
    }
  }

  /**
   * 核心调度方法 - 为多个任务智能分配时间
   *
   * 算法:
   * 1. 按优先级和截止时间排序任务 (O(n log n))
   * 2. 获取空闲时间槽 (O(m log m)，m 是事件数)
   * 3. 贪心分配任务到最佳时间槽 (O(n * m))
   *
   * 总复杂度: O(n²)，符合要求
   */
  scheduleTasks(
    tasks: Task[],
    events: CalendarEvent[],
    options?: ScheduleOptions
  ): ScheduleResult {
    const opts = {
      startFrom: new Date(),
      maxDays: 7,
      ...options,
    };

    // 计算调度时间窗口
    const endTime = opts.endAt || new Date(
      opts.startFrom.getTime() + opts.maxDays * 24 * 60 * 60 * 1000
    );

    // 1. 按优先级和截止时间排序任务 (O(n log n))
    const sortedTasks = this.sortTasksByPriority(tasks);

    // 2. 获取空闲时间槽
    const freeSlots = this.findFreeSlots(events, opts.startFrom, endTime);

    // 3. 贪心分配 (O(n * m))
    const scheduled: ScheduledTask[] = [];
    const usedSlots: TimeSlot[] = [];

    for (const task of sortedTasks) {
      const duration = task.estimatedMinutes || 30;
      const taskType = this.inferTaskType(task);

      // 找到最佳时间槽
      const bestSlot = this.findBestSlot(
        task,
        duration,
        freeSlots,
        usedSlots,
        taskType
      );

      if (bestSlot) {
        scheduled.push({
          taskId: task.id,
          task,
          start: bestSlot.start,
          end: bestSlot.end,
          confidence: bestSlot.confidence || 50,
          reason: bestSlot.reason || '已安排',
        });
        usedSlots.push(bestSlot);
      }
    }

    // 计算平均置信度
    const averageConfidence = scheduled.length > 0
      ? scheduled.reduce((sum, s) => sum + s.confidence, 0) / scheduled.length
      : 0;

    return {
      scheduled,
      metadata: {
        totalTasks: tasks.length,
        scheduledCount: scheduled.length,
        failedCount: tasks.length - scheduled.length,
        averageConfidence,
        startTime: new Date(),
        endTime: new Date(),
      },
    };
  }

  /**
   * 冲突重新调度
   * 当有新事件与已调度任务冲突时使用
   */
  async rescheduleOnConflict(
    conflictingEvent: CalendarEvent,
    options?: { protectedTaskIds?: string[] }
  ): Promise<RescheduleResult> {
    const result: RescheduleResult = {
      moved: [],
      skipped: [],
      conflicts: [],
    };

    // 如果没有 taskManager，返回空结果
    if (!this.taskManager) {
      return result;
    }

    // 获取所有已调度任务
    const allTasks = this.taskManager.getAllTasks ? this.taskManager.getAllTasks() : [];
    const scheduledTasks = allTasks.filter((t: Task) => t.scheduledStart && t.scheduledEnd);

    const protectedIds = new Set(options?.protectedTaskIds || []);

    for (const task of scheduledTasks) {
      // 跳过受保护的任务
      if (protectedIds.has(task.id)) {
        continue;
      }

      // 检查是否与冲突事件时间重叠
      if (task.scheduledStart && task.scheduledEnd) {
        const taskStart = task.scheduledStart.getTime();
        const taskEnd = task.scheduledEnd.getTime();
        const eventStart = conflictingEvent.startDate.getTime();
        const eventEnd = conflictingEvent.endDate.getTime();

        if (taskStart < eventEnd && taskEnd > eventStart) {
          // 有冲突，尝试重新调度
          const events = this.eventManager?.getAllEvents ? this.eventManager.getAllEvents() : [];
          const suggestions = this.suggestTimeSlots(task, {}, [conflictingEvent, ...events]);

          if (suggestions.length > 0) {
            const newSlot = suggestions[0];
            const scheduledTask = this.rescheduleTask(task, newSlot);
            result.moved.push(scheduledTask);
          } else {
            result.skipped.push(task.id);
            result.conflicts.push({
              type: 'overlap',
              event: conflictingEvent,
              task,
              message: `无法为任务 "${task.title}" 找到替代时间`,
              severity: 'high',
            });
          }
        }
      }
    }

    return result;
  }

  /**
   * 冲突检测 - 检查任务与事件的时间冲突
   *
   * 复杂度: O(n)，n 是事件数量
   */
  findConflicts(task: Task, events: CalendarEvent[]): Conflict[] {
    const conflicts: Conflict[] = [];

    if (!task.scheduledStart || !task.scheduledEnd) {
      return conflicts;
    }

    const taskStart = task.scheduledStart.getTime();
    const taskEnd = task.scheduledEnd.getTime();

    for (const event of events) {
      const eventStart = event.startDate.getTime();
      const eventEnd = event.endDate.getTime();

      // 检查时间重叠
      if (taskStart < eventEnd && taskEnd > eventStart) {
        conflicts.push({
          type: 'overlap',
          event,
          task,
          message: `任务 "${task.title}" 与事件 "${event.title}" 时间重叠`,
          severity: this.calculateConflictSeverity(task, event),
        });
      }
    }

    // 检查截止时间冲突
    if (task.dueDate) {
      const timeToDue = task.dueDate.getTime() - taskEnd;
      const hoursToDue = timeToDue / (1000 * 60 * 60);

      if (hoursToDue < 0) {
        conflicts.push({
          type: 'deadline',
          task,
          message: `任务 "${task.title}" 已错过截止时间`,
          severity: 'high',
        });
      } else if (hoursToDue < 24) {
        conflicts.push({
          type: 'deadline',
          task,
          message: `任务 "${task.title}" 即将到期（${Math.round(hoursToDue)}小时内）`,
          severity: 'medium',
        });
      }
    }

    return conflicts;
  }

  /**
   * 重新安排单个任务
   */
  rescheduleTask(task: Task, newSlot: TimeSlot): ScheduledTask {
    return {
      taskId: task.id,
      task,
      start: newSlot.start,
      end: newSlot.end,
      confidence: newSlot.confidence || 70,
      reason: `手动重新安排到 ${this.formatTime(newSlot.start)}`,
    };
  }

  /**
   * 获取建议时间块 - 为任务推荐最佳时间段
   *
   * 返回按匹配度排序的时间块列表
   */
  suggestTimeSlots(
    task: Task,
    preferences: Partial<UserPreference> = {},
    events: CalendarEvent[] = [],
    options: ScheduleOptions = {}
  ): TimeSlot[] {
    const mergedPrefs = { ...this.preferences, ...preferences };
    const opts = {
      startFrom: new Date(),
      maxDays: 7,
      ...options,
    };

    const endTime = opts.endAt || new Date(
      opts.startFrom.getTime() + opts.maxDays * 24 * 60 * 60 * 1000
    );

    const duration = task.estimatedMinutes || 30;
    const taskType = this.inferTaskType(task);

    // 获取所有空闲槽
    const freeSlots = this.findFreeSlots(events, opts.startFrom, endTime);

    // 评估每个槽的匹配度
    const scoredSlots: TimeSlot[] = [];

    for (const slot of freeSlots) {
      const slotDuration = slot.end.getTime() - slot.start.getTime();

      // 跳过不够长的槽
      if (slotDuration < duration * 60 * 1000) continue;

      const score = this.calculateSlotScore(
        slot.start,
        duration,
        taskType,
        task,
        mergedPrefs
      );

      scoredSlots.push({
        start: slot.start,
        end: new Date(slot.start.getTime() + duration * 60 * 1000),
        confidence: score,
        reason: this.generateSuggestionReason(score, slot.start, taskType),
      });
    }

    // 按置信度排序，返回前5个
    return scoredSlots
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, 5);
  }

  /**
   * 更新用户偏好
   */
  updatePreferences(preferences: Partial<UserPreference>): void {
    this.preferences = { ...this.preferences, ...preferences };
  }

  /**
   * 获取当前偏好
   */
  getPreferences(): UserPreference {
    return { ...this.preferences };
  }

  // ============== 私有辅助方法 ==============

  /**
   * 按优先级和截止时间排序任务
   *
   * 排序规则:
   * 1. 优先级高到低
   * 2. 截止时间近到远
   */
  private sortTasksByPriority(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
      // 首先比较优先级
      const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // 优先级相同，比较截止时间
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      return 0;
    });
  }

  /**
   * 找到最佳时间槽
   */
  private findBestSlot(
    task: Task,
    duration: number,
    freeSlots: TimeSlot[],
    usedSlots: TimeSlot[],
    taskType: TaskType
  ): TimeSlot | null {
    let bestSlot: TimeSlot | null = null;
    let bestScore = -1;

    for (const slot of freeSlots) {
      const slotDuration = slot.end.getTime() - slot.start.getTime();
      const durationMs = duration * 60 * 1000;

      // 检查槽是否足够长
      if (slotDuration < durationMs) continue;

      // 检查是否与已用槽冲突
      const proposedSlot: TimeSlot = {
        start: slot.start,
        end: new Date(slot.start.getTime() + durationMs),
      };

      if (this.hasOverlapWithUsedSlots(proposedSlot, usedSlots)) continue;

      // 计算评分 (已包含截止时间匹配，无需额外计算)
      const score = this.calculateSlotScore(
        slot.start,
        duration,
        taskType,
        task,
        this.preferences
      );

      if (score > bestScore) {
        bestScore = score;
        bestSlot = proposedSlot;
      }
    }

    if (bestSlot) {
      bestSlot.confidence = bestScore;
      bestSlot.reason = this.generateReason(bestScore, taskType, task);
    }

    return bestSlot;
  }

  /**
   * 计算时间槽评分
   *
   * 评分维度:
   * - 时段偏好 (0-40分)
   * - 任务类型匹配 (0-30分)
   * - 截止时间匹配 (0-30分)
   */
  private calculateSlotScore(
    startTime: Date,
    duration: number,
    taskType: TaskType,
    task: Task,
    prefs: UserPreference
  ): number {
    let score = 0;
    const hour = startTime.getHours();

    // 1. 时段偏好评分 (0-40)
    let timePreference = 0;
    if (hour >= 6 && hour < 12) {
      timePreference = prefs.productiveHours.morning;
    } else if (hour >= 12 && hour < 18) {
      timePreference = prefs.productiveHours.afternoon;
    } else if (hour >= 18 && hour < 22) {
      timePreference = prefs.productiveHours.evening;
    } else {
      timePreference = prefs.productiveHours.night;
    }
    score += (timePreference / 100) * 40;

    // 2. 任务类型时段匹配 (0-30)
    const typeSlots = prefs.taskTypeSlots[taskType] || [];
    let typeMatch = false;
    for (const slot of typeSlots) {
      if (hour >= slot.start && hour < slot.end) {
        typeMatch = true;
        break;
      }
    }
    score += typeMatch ? 30 : 10;

    // 3. 截止时间匹配 (0-30)
    if (task.dueDate) {
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
      const timeToDue = task.dueDate.getTime() - endTime.getTime();

      if (timeToDue > 0) {
        // 提前完成，给高分
        const daysToDue = timeToDue / (24 * 60 * 60 * 1000);
        if (daysToDue > 3) score += 30;
        else if (daysToDue > 1) score += 20;
        else score += 10;
      } else {
        // 逾期
        score -= 50;
      }
    } else {
      // 无截止时间的任务给中等分
      score += 20;
    }

    // 4. 工作时段奖励
    if (hour >= prefs.workingHours.start && hour < prefs.workingHours.end) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 查找空闲时间槽
   *
   * 在工作时段内查找未被事件占用的连续时间
   */
  private findFreeSlots(
    events: CalendarEvent[],
    startFrom: Date,
    endAt: Date
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const { workingHours, workDays } = this.preferences;

    // 按天遍历
    const currentDay = new Date(startFrom);
    currentDay.setHours(0, 0, 0, 0);

    while (currentDay < endAt) {
      const dayOfWeek = currentDay.getDay();

      // 跳过非工作日
      if (!workDays.includes(dayOfWeek)) {
        currentDay.setDate(currentDay.getDate() + 1);
        continue;
      }

      // 当天工作时段
      let dayStart = new Date(currentDay);
      dayStart.setHours(workingHours.start, 0, 0, 0);

      const dayEnd = new Date(currentDay);
      dayEnd.setHours(workingHours.end, 0, 0, 0);

      // 如果是起始日，从 startFrom 开始
      if (currentDay.toDateString() === startFrom.toDateString()) {
        dayStart = new Date(Math.max(dayStart.getTime(), startFrom.getTime()));
      }

      if (dayStart >= dayEnd) {
        currentDay.setDate(currentDay.getDate() + 1);
        continue;
      }

      // 获取当天事件
      const dayEvents = events.filter(e => {
        const eventStart = new Date(e.startDate);
        return eventStart.toDateString() === currentDay.toDateString();
      }).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

      // 计算空闲槽
      let currentStart = dayStart.getTime();
      const dayEndTime = dayEnd.getTime();

      for (const event of dayEvents) {
        const eventStart = event.startDate.getTime();
        const eventEnd = event.endDate.getTime();

        // 缓冲时间
        const bufferMs = this.preferences.bufferMinutes * 60 * 1000;

        if (eventStart > currentStart + 30 * 60 * 1000) {  // 至少30分钟
          slots.push({
            start: new Date(currentStart),
            end: new Date(eventStart - bufferMs),
          });
        }

        currentStart = Math.max(currentStart, eventEnd + bufferMs);
      }

      // 检查工作时段末尾
      if (dayEndTime - currentStart > 30 * 60 * 1000) {
        slots.push({
          start: new Date(currentStart),
          end: new Date(dayEndTime),
        });
      }

      currentDay.setDate(currentDay.getDate() + 1);
    }

    return slots;
  }

  /**
   * 检查是否与已用槽重叠
   */
  private hasOverlapWithUsedSlots(slot: TimeSlot, usedSlots: TimeSlot[]): boolean {
    const slotStart = slot.start.getTime();
    const slotEnd = slot.end.getTime();
    const bufferMs = this.preferences.bufferMinutes * 60 * 1000;

    for (const used of usedSlots) {
      const usedStart = used.start.getTime() - bufferMs;
      const usedEnd = used.end.getTime() + bufferMs;

      if (slotStart < usedEnd && slotEnd > usedStart) {
        return true;
      }
    }

    return false;
  }

  /**
   * 推断任务类型
   */
  private inferTaskType(task: Task): TaskType {
    const title = task.title.toLowerCase();
    const tags = task.tags.map(t => t.toLowerCase());
    const desc = (task.description || '').toLowerCase();

    // 专注型任务关键词
    const deepWorkKeywords = ['专注', 'deep', 'coding', '开发', '写作', 'writing', '设计', 'design'];
    if (deepWorkKeywords.some(k => title.includes(k) || desc.includes(k) || tags.includes(k))) {
      return 'deep-work';
    }

    // 事务型任务关键词
    const adminKeywords = ['邮件', 'email', '报销', '审批', '整理', 'admin', 'review'];
    if (adminKeywords.some(k => title.includes(k) || desc.includes(k) || tags.includes(k))) {
      return 'admin';
    }

    // 创意型任务关键词
    const creativeKeywords = ['创意', 'brainstorm', '头脑风暴', '创意', 'creative', '策划'];
    if (creativeKeywords.some(k => title.includes(k) || desc.includes(k) || tags.includes(k))) {
      return 'creative';
    }

    // 会议型任务关键词
    const meetingKeywords = ['会议', 'meeting', '讨论', 'review', 'sync', '汇报'];
    if (meetingKeywords.some(k => title.includes(k) || desc.includes(k) || tags.includes(k))) {
      return 'meeting';
    }

    // 默认根据时长判断
    const duration = task.estimatedMinutes || 30;
    if (duration >= 60) return 'deep-work';
    if (duration <= 15) return 'admin';
    return 'creative';
  }

  /**
   * 计算冲突严重程度
   */
  private calculateConflictSeverity(task: Task, event: CalendarEvent): 'low' | 'medium' | 'high' {
    if (task.priority === 'high') return 'high';
    if (task.priority === 'medium') return 'medium';
    return 'low';
  }

  /**
   * 生成推荐理由
   */
  private generateReason(score: number, taskType: TaskType, task: Task): string {
    if (score >= 80) {
      return `高匹配度：${this.getTaskTypeLabel(taskType)}任务的理想时段`;
    } else if (score >= 60) {
      return `良好匹配：符合${this.getTaskTypeLabel(taskType)}任务偏好`;
    } else if (task.dueDate) {
      const hoursToDue = (task.dueDate.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursToDue < 48) {
        return `紧急安排：满足截止时间要求`;
      }
    }
    return `可行时段：可完成该任务`;
  }

  /**
   * 生成建议理由
   */
  private generateSuggestionReason(score: number, startTime: Date, taskType: TaskType): string {
    const hour = startTime.getHours();
    const timeLabel = hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上';

    if (score >= 80) {
      return `${timeLabel}是处理${this.getTaskTypeLabel(taskType)}任务的高效时段`;
    } else if (score >= 60) {
      return `${timeLabel}时段适合${this.getTaskTypeLabel(taskType)}任务`;
    } else {
      return `${timeLabel}有可用时间`;
    }
  }

  /**
   * 获取任务类型标签
   */
  private getTaskTypeLabel(type: TaskType): string {
    const labels: Record<TaskType, string> = {
      'deep-work': '专注型',
      'admin': '事务型',
      'creative': '创意型',
      'meeting': '会议型',
    };
    return labels[type];
  }

  /**
   * 格式化时间
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * 预览调度结果（不实际调度）
   */
  public previewSchedule(tasks: Task[], events: CalendarEvent[] = []): ScheduledTask[] {
    const result = this.scheduleTasks(tasks, events, { dryRun: true });
    return result.scheduled;
  }

  /**
   * 学习用户偏好
   */
  public learnPreference(pref: Partial<UserPreference> | { type: string; data: any }): void {
    // 处理两种格式:
    // 1. Partial<UserPreference> - 直接合并
    // 2. { type: 'explicit', data: { ... } } - 从 data 中提取
    if ('type' in pref && pref.type === 'explicit' && 'data' in pref) {
      this.preferences = { ...this.preferences, ...pref.data };
    } else {
      this.preferences = { ...this.preferences, ...(pref as Partial<UserPreference>) };
    }
  }

  /**
   * 获取调度统计
   */
  public getStatistics(): {
    totalScheduled: number;
    averageConfidence: number;
    conflictsResolved: number;
    learningProgress: number;
    preferenceAccuracy: number;
  } {
    return {
      totalScheduled: 0,
      averageConfidence: 0,
      conflictsResolved: 0,
      learningProgress: 0,
      preferenceAccuracy: 0,
    };
  }
}

// ============== 工具函数 ==============

export function calculateUrgencyScore(task: Task): number {
  const now = new Date();
  // 支持 dueDate 和 endDate 两种字段
  const deadline = task.dueDate
    ? new Date(task.dueDate)
    : task.endDate
    ? new Date(task.endDate)
    : null;
  if (!deadline) return 0;

  const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  // < 12小时算最紧急，返回100；12-24小时返回80
  if (hoursUntil < 12) return 100;
  if (hoursUntil < 24) return 80;
  if (hoursUntil < 72) return 50;
  return 20;
}

export function getDefaultPreferences(): UserPreference {
  return {
    productiveHours: {
      morning: 80,
      afternoon: 70,
      evening: 50,
      night: 20,
    },
    taskTypeSlots: {
      'deep-work': [{ start: 9, end: 12 }],
      admin: [{ start: 14, end: 16 }],
      creative: [{ start: 10, end: 13 }],
      meeting: [{ start: 10, end: 12 }, { start: 14, end: 17 }],
    },
    bufferMinutes: 15,
    workingHours: { start: 9, end: 18 },
    workDays: [1, 2, 3, 4, 5],
    maxDailyTasks: 8,
  };
}

/**
 * 初始化 AI 调度器并注入到 TaskManager
 */
export function initializeAIScheduler(taskManager: any, eventManager?: any): AIScheduler {
  const scheduler = new AIScheduler(taskManager, eventManager);
  return scheduler;
}

// ============== 导出类型 ==============

export type {
  Task,
  TaskPriority,
  CalendarEvent,
};
