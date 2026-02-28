/**
 * 冲突检测与重排模块
 * 
 * 负责任务：
 * - 检测任务与事件的冲突
 * - 评估冲突影响程度（高/低）
 * - 生成替代时间方案
 * - 自动重排低影响冲突
 * - 智能重排建议
 * 
 * 遵循 PRD-AI.md 和 TECH-SPEC-AI.md 规范
 * Sprint 2 - Phase 3
 */

import { Task, TaskPriority } from './task';
import { CalendarEvent } from './calendar';
import { UserPreferences } from './user-preference';
import { generateUUID } from './utils';
import type { TimeSlot } from './ai-scheduler';
export type { TimeSlot };

// ============== 类型定义 ==============

/** 冲突类型 */
export type ConflictType = 'hard' | 'soft';

/** 冲突影响程度 */
export type ImpactLevel = 'high' | 'low';

/** 已调度任务 - 本地定义避免循环依赖 */
export interface ScheduledTask {
  taskId: string;
  task: Task;
  start: Date;
  end: Date;
  confidence: number;
  reason: string;
}

/** 冲突信息 - 本地定义 */
export interface Conflict {
  id: string;
  type: 'hard' | 'soft';
  task: Task;
  conflictingEvents: CalendarEvent[];
  suggestedAlternatives: TimeSlot[];
  impact: 'high' | 'low';
  autoResolvable: boolean;
}

/** 重新调度结果 - 本地定义 */
export interface RescheduleResult {
  success: boolean;
  rescheduledTasks: ScheduledTask[];
  conflicts: Conflict[];
  requiresUserConfirmation: Conflict[];
}

/** 替代时间选项 */
export interface AlternativeOptions {
  maxResults?: number;        // 最大返回结果数
  maxDaysForward?: number;    // 最多向后查找天数
  minConfidence?: number;     // 最低置信度
  respectUserPreferences?: boolean; // 是否尊重用户偏好
}

/** 重排策略 */
export interface RescheduleStrategy {
  type: 'move' | 'split' | 'postpone' | 'delegate' | 'cancel';
  priority: number;           // 策略优先级 1-10
  description: string;
  reason: string;
  targetTaskId: string;
  proposedSlot?: TimeSlot;
  impact: 'high' | 'low';
  requiresConfirmation: boolean;
}

/** 冲突检测选项 */
export interface ConflictDetectionOptions {
  checkBuffer?: boolean;      // 检查缓冲时间
  bufferMinutes?: number;     // 缓冲时间要求（分钟）
  respectFixedEvents?: boolean; // 是否尊重固定事件
}

/** 优先级权重映射 */
const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  high: 100,
  medium: 50,
  low: 25,
  none: 10,
};

/** 影响评估阈值 */
const IMPACT_THRESHOLDS = {
  // 高影响阈值
  highPriority: 'high',
  deadlineHours: 24,          // 24小时内截止视为高影响
  importantEventTypes: ['会议', '约会', '面试', '演讲'],
};

// ============== ConflictResolver 类 ==============

export class ConflictResolver {
  private conflicts: Map<string, Conflict> = new Map();
  private resolutionHistory: Array<{ timestamp: Date; conflictId: string; action: string }> = [];

  // ============== 1. 检测冲突 ==============

  /**
   * 检测单个已调度任务与现有事件的冲突
   * 
   * @param scheduledTask - 已调度的任务
   * @param existingEvents - 现有日历事件
   * @param options - 检测选项
   * @returns 冲突列表
   */
  detectConflicts(
    scheduledTask: ScheduledTask,
    existingEvents: CalendarEvent[],
    options: ConflictDetectionOptions = {}
  ): Conflict[] {
    const {
      checkBuffer = true,
      bufferMinutes = 15,
      respectFixedEvents = true,
    } = options;

    const conflicts: Conflict[] = [];
    const task = scheduledTask.task;

    // 检查时间重叠（硬冲突）
    const overlappingEvents = this.findOverlappingEvents(
      scheduledTask.start,
      scheduledTask.end,
      existingEvents
    );

    if (overlappingEvents.length > 0) {
      const hardConflict = this.createConflict(
        'hard',
        task,
        overlappingEvents,
        [],
        this.assessImpactLevel(task, overlappingEvents)
      );
      conflicts.push(hardConflict);
    }

    // 检查缓冲时间不足（软冲突）
    if (checkBuffer) {
      const bufferConflicts = this.detectBufferConflicts(
        scheduledTask,
        existingEvents,
        bufferMinutes
      );
      conflicts.push(...bufferConflicts);
    }

    // 检查截止时间风险
    const deadlineConflict = this.detectDeadlineRisk(scheduledTask);
    if (deadlineConflict) {
      conflicts.push(deadlineConflict);
    }

    // 存储冲突
    for (const conflict of conflicts) {
      this.conflicts.set(conflict.id, conflict);
    }

    return conflicts;
  }

  /**
   * 查找重叠的事件
   */
  private findOverlappingEvents(
    start: Date,
    end: Date,
    events: CalendarEvent[]
  ): CalendarEvent[] {
    const startTime = start.getTime();
    const endTime = end.getTime();

    return events.filter(event => {
      const eventStart = event.startDate.getTime();
      const eventEnd = event.endDate.getTime();
      // 检查时间重叠
      return startTime < eventEnd && endTime > eventStart;
    });
  }

  /**
   * 检测缓冲时间冲突
   */
  private detectBufferConflicts(
    scheduledTask: ScheduledTask,
    events: CalendarEvent[],
    requiredBuffer: number
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const taskStart = scheduledTask.start.getTime();
    const taskEnd = scheduledTask.end.getTime();
    const bufferMs = requiredBuffer * 60 * 1000;

    for (const event of events) {
      const eventStart = event.startDate.getTime();
      const eventEnd = event.endDate.getTime();

      // 检查任务结束到事件开始的缓冲
      if (taskEnd <= eventStart && taskEnd + bufferMs > eventStart) {
        const actualBuffer = Math.round((eventStart - taskEnd) / 60000);
        
        conflicts.push(
          this.createConflict(
            'soft',
            scheduledTask.task,
            [event],
            [],
            'low',
            `缓冲时间不足（实际 ${actualBuffer} 分钟，需要 ${requiredBuffer} 分钟）`
          )
        );
      }

      // 检查事件结束到任务开始的缓冲
      if (eventEnd <= taskStart && eventEnd + bufferMs > taskStart) {
        const actualBuffer = Math.round((taskStart - eventEnd) / 60000);
        
        conflicts.push(
          this.createConflict(
            'soft',
            scheduledTask.task,
            [event],
            [],
            'low',
            `前置事件后缓冲不足（实际 ${actualBuffer} 分钟，需要 ${requiredBuffer} 分钟）`
          )
        );
      }
    }

    return conflicts;
  }

  /**
   * 检测截止时间风险
   */
  private detectDeadlineRisk(scheduledTask: ScheduledTask): Conflict | null {
    const task = scheduledTask.task;
    
    if (!task.dueDate) return null;

    const deadlineTime = task.dueDate.getTime();
    const taskEndTime = scheduledTask.end.getTime();

    // 任务安排在截止时间之后（硬冲突）
    if (taskEndTime > deadlineTime) {
      const hoursOver = Math.round((taskEndTime - deadlineTime) / (60 * 60 * 1000));
      
      return this.createConflict(
        'hard',
        task,
        [],
        [],
        'high',
        `任务安排在截止时间之后（超出 ${hoursOver} 小时）`
      );
    }

    // 任务即将到期 - 检查任务结束时间是否在截止时间之前但在24小时内
    const hoursUntilDeadline = (deadlineTime - Date.now()) / (60 * 60 * 1000);
    const hoursFromTaskEndToDeadline = (deadlineTime - taskEndTime) / (60 * 60 * 1000);
    
    // 如果任务结束时间离截止时间不到24小时，且是高优先级任务
    if (hoursFromTaskEndToDeadline < 24 && hoursFromTaskEndToDeadline >= 0 && task.priority === 'high') {
      return this.createConflict(
        'soft',
        task,
        [],
        [],
        'high',
        `高优先级任务将在 ${Math.round(hoursUntilDeadline)} 小时内到期`
      );
    }

    return null;
  }

  /**
   * 创建冲突对象
   */
  private createConflict(
    type: ConflictType,
    task: Task,
    conflictingEvents: CalendarEvent[],
    suggestedAlternatives: TimeSlot[],
    impact: ImpactLevel,
    description?: string
  ): Conflict {
    return {
      id: generateUUID(),
      type,
      task,
      conflictingEvents,
      suggestedAlternatives,
      impact,
      autoResolvable: impact === 'low' && type === 'soft',
    };
  }

  // ============== 2. 评估影响程度 ==============

  /**
   * 评估冲突的影响程度
   * 
   * @param conflict - 冲突信息
   * @returns 严重程度和原因
   */
  assessImpact(conflict: Conflict): { severity: ImpactLevel; reason: string } {
    const task = conflict.task;
    const events = conflict.conflictingEvents;

    // 高优先级任务 = 高影响
    if (task.priority === 'high') {
      return {
        severity: 'high',
        reason: '高优先级任务受到影响',
      };
    }

    // 截止时间临近 = 高影响
    if (task.dueDate) {
      const hoursUntilDue = (task.dueDate.getTime() - Date.now()) / (60 * 60 * 1000);
      if (hoursUntilDue < IMPACT_THRESHOLDS.deadlineHours) {
        return {
          severity: 'high',
          reason: `任务截止时间临近（${Math.round(hoursUntilDue)} 小时内）`,
        };
      }
    }

    // 与重要事件冲突 = 高影响
    const hasImportantEvent = events.some(event =>
      IMPACT_THRESHOLDS.importantEventTypes.some(type =>
        event.title.includes(type)
      )
    );
    if (hasImportantEvent) {
      return {
        severity: 'high',
        reason: '与重要会议或约会冲突',
      };
    }

    // 硬冲突 = 高影响
    if (conflict.type === 'hard') {
      return {
        severity: 'high',
        reason: '时间完全重叠，无法同时执行',
      };
    }

    // 其他情况 = 低影响
    return {
      severity: 'low',
      reason: '普通任务，时间有灵活性',
    };
  }

  /**
   * 评估影响等级（内部使用）
   */
  private assessImpactLevel(
    task: Task,
    conflictingEvents: CalendarEvent[]
  ): ImpactLevel {
    // 高优先级任务
    if (task.priority === 'high') return 'high';

    // 截止时间临近
    if (task.dueDate) {
      const hoursUntilDue = (task.dueDate.getTime() - Date.now()) / (60 * 60 * 1000);
      if (hoursUntilDue < IMPACT_THRESHOLDS.deadlineHours) return 'high';
    }

    // 与重要事件冲突
    const hasImportantEvent = conflictingEvents.some(event =>
      IMPACT_THRESHOLDS.importantEventTypes.some(type =>
        event.title.includes(type)
      )
    );
    if (hasImportantEvent) return 'high';

    return 'low';
  }

  // ============== 3. 生成替代时间方案 ==============

  /**
   * 为任务生成替代时间方案
   * 
   * @param task - 任务
   * @param blockedSlot - 被阻塞的时间段
   * @param preferences - 用户偏好
   * @param options - 选项
   * @returns 替代时间槽列表
   */
  generateAlternatives(
    task: Task,
    blockedSlot: TimeSlot,
    preferences: UserPreferences,
    options?: AlternativeOptions
  ): TimeSlot[] {
    const opts = {
      maxResults: 5,
      maxDaysForward: 7,
      minConfidence: 0.5,
      respectUserPreferences: true,
      ...options,
    };

    const alternatives: TimeSlot[] = [];
    const duration = task.estimatedMinutes || 30;
    const durationMs = duration * 60 * 1000;
    
    // 计算搜索起始时间（从被阻塞时段之后开始）
    const searchStart = new Date(blockedSlot.end);
    searchStart.setHours(0, 0, 0, 0);
    searchStart.setDate(searchStart.getDate() + 1); // 从次日开始

    // 截止时间限制
    const deadlineTime = task.dueDate?.getTime();

    // 搜索未来几天的可用时段
    for (let dayOffset = 0; dayOffset < opts.maxDaysForward; dayOffset++) {
      if (alternatives.length >= opts.maxResults) break;

      const checkDate = new Date(searchStart);
      checkDate.setDate(checkDate.getDate() + dayOffset);

      // 获取当天的候选时段
      const candidateSlots = this.generateCandidateSlotsForDay(
        checkDate,
        durationMs,
        preferences,
        opts.respectUserPreferences
      );

      for (const slot of candidateSlots) {
        if (alternatives.length >= opts.maxResults) break;

        // 检查是否在截止时间之前
        if (deadlineTime && slot.end.getTime() > deadlineTime) {
          continue; // 跳过超过截止时间的时段
        }

        // 计算置信度
        const confidence = this.calculateAlternativeConfidence(
          slot,
          task,
          preferences
        );

        if (confidence >= opts.minConfidence) {
          alternatives.push({
            start: slot.start,
            end: slot.end,
            confidence,
            reason: this.generateAlternativeReason(slot, task, preferences),
          });
        }
      }
    }

    // 按置信度排序
    return alternatives.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  }

  /**
   * 生成某天的候选时段
   */
  private generateCandidateSlotsForDay(
    date: Date,
    durationMs: number,
    preferences: UserPreferences,
    respectPreference: boolean
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    
    // 使用用户偏好中的工作时段
    const workStartHour = preferences.workingHours.start;
    const workEndHour = preferences.workingHours.end;
    
    const workStart = new Date(date);
    workStart.setHours(workStartHour, 0, 0, 0);
    
    const workEnd = new Date(date);
    workEnd.setHours(workEndHour, 0, 0, 0);

    if (respectPreference) {
      // 基于高效时段分数生成候选时段
      const productiveHours = preferences.productiveHours;
      
      // 找出最高效的时段
      const hourScores: { hour: number; score: number }[] = [];
      for (let h = workStartHour; h < workEndHour; h++) {
        let score = 0;
        if (h >= 6 && h < 12) score = productiveHours.morning;
        else if (h >= 12 && h < 18) score = productiveHours.afternoon;
        else if (h >= 18 && h < 22) score = productiveHours.evening;
        else score = productiveHours.night;
        
        if (score > 0.5) { // 只考虑效率较高的时段
          hourScores.push({ hour: h, score });
        }
      }
      
      // 按分数排序
      hourScores.sort((a, b) => b.score - a.score);
      
      // 为高效时段生成时间槽
      for (const { hour } of hourScores.slice(0, 3)) { // 取前3个高效时段
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        
        const slotEnd = new Date(slotStart.getTime() + durationMs);
        
        // 确保在工作时段内
        if (slotEnd <= workEnd && slotStart >= workStart) {
          slots.push({ start: slotStart, end: slotEnd });
        }
      }
    }

    // 如果没有生成偏好时段，使用默认工作时段
    if (slots.length === 0) {
      // 上午时段
      const morningStart = new Date(date);
      morningStart.setHours(workStartHour, 0, 0, 0);
      const morningEnd = new Date(morningStart.getTime() + durationMs);
      if (morningEnd.getHours() <= workEndHour) {
        slots.push({ start: morningStart, end: morningEnd });
      }

      // 下午时段
      const afternoonStart = new Date(date);
      afternoonStart.setHours(14, 0, 0, 0);
      const afternoonEnd = new Date(afternoonStart.getTime() + durationMs);
      if (afternoonEnd.getHours() <= workEndHour) {
        slots.push({ start: afternoonStart, end: afternoonEnd });
      }
    }

    return slots;
  }

  /**
   * 计算替代方案的置信度
   */
  private calculateAlternativeConfidence(
    slot: TimeSlot,
    task: Task,
    preferences: UserPreferences
  ): number {
    let confidence = 0.5; // 基础置信度
    const hour = slot.start.getHours();

    // 1. 检查时段偏好分数 (0-1)
    let timePreference = 0;
    if (hour >= 6 && hour < 12) {
      timePreference = preferences.productiveHours.morning;
    } else if (hour >= 12 && hour < 18) {
      timePreference = preferences.productiveHours.afternoon;
    } else if (hour >= 18 && hour < 22) {
      timePreference = preferences.productiveHours.evening;
    } else {
      timePreference = preferences.productiveHours.night;
    }
    confidence += timePreference * 0.3;

    // 2. 检查任务类型匹配
    const taskType = this.inferTaskType(task);
    const typePref = preferences.taskTypePreferences[taskType];
    if (typePref && typePref.preferredHours.includes(hour)) {
      confidence += 0.2 * typePref.confidence;
    }

    // 3. 考虑截止时间
    if (task.dueDate) {
      const daysUntilDue = (task.dueDate.getTime() - slot.end.getTime()) / (24 * 60 * 60 * 1000);
      if (daysUntilDue > 3) {
        confidence += 0.1; // 充足时间
      } else if (daysUntilDue > 0) {
        confidence += 0.05; // 稍微紧张
      } else {
        confidence -= 0.3; // 已逾期
      }
    }

    // 4. 工作时间奖励
    if (hour >= preferences.workingHours.start && hour < preferences.workingHours.end) {
      confidence += 0.05;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * 生成替代方案的理由
   */
  private generateAlternativeReason(
    slot: TimeSlot,
    task: Task,
    preferences: UserPreferences
  ): string {
    const hour = slot.start.getHours();
    const taskType = this.inferTaskType(task);
    const reasons: string[] = [];

    // 时段描述
    const timeOfDay = hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上';
    reasons.push(`${timeOfDay}时段`);

    // 高效时段检查
    let timePreference = 0;
    if (hour >= 6 && hour < 12) {
      timePreference = preferences.productiveHours.morning;
    } else if (hour >= 12 && hour < 18) {
      timePreference = preferences.productiveHours.afternoon;
    } else if (hour >= 18 && hour < 22) {
      timePreference = preferences.productiveHours.evening;
    } else {
      timePreference = preferences.productiveHours.night;
    }
    
    if (timePreference > 0.7) {
      reasons.push('高效工作时段');
    }

    // 任务类型匹配
    const typePref = preferences.taskTypePreferences[taskType];
    if (typePref?.preferredHours.includes(hour)) {
      reasons.push('符合任务类型偏好');
    }

    return reasons.join('，');
  }

  // ============== 4. 自动重排（低影响冲突） ==============

  /**
   * 自动重排低影响冲突
   * 
   * @param conflicts - 冲突列表
   * @param tasks - 所有任务列表
   * @param preferences - 用户偏好
   * @returns 重排结果
   */
  autoReschedule(
    conflicts: Conflict[],
    tasks: Task[],
    preferences: UserPreferences
  ): RescheduleResult {
    const rescheduledTasks: ScheduledTask[] = [];
    const resolvedConflicts: Conflict[] = [];
    const requiresUserConfirmation: Conflict[] = [];

    // 按影响程度分类冲突
    const lowImpactConflicts = conflicts.filter(c => c.impact === 'low');
    const highImpactConflicts = conflicts.filter(c => c.impact === 'high');

    // 高影响冲突需要用户确认
    requiresUserConfirmation.push(...highImpactConflicts);

    // 处理低影响冲突
    for (const conflict of lowImpactConflicts) {
      // 只处理可自动解决的软冲突
      if (!conflict.autoResolvable || conflict.type !== 'soft') {
        requiresUserConfirmation.push(conflict);
        continue;
      }

      const task = conflict.task;
      
      // 查找替代时间
      const currentSlot: TimeSlot = {
        start: task.scheduledStart || new Date(),
        end: task.scheduledEnd || new Date(),
      };

      const alternatives = this.generateAlternatives(
        task,
        currentSlot,
        preferences,
        { maxResults: 3, maxDaysForward: 3 }
      );

      if (alternatives.length > 0) {
        // 使用最佳替代方案
        const bestAlternative = alternatives[0];
        
        const rescheduledTask: ScheduledTask = {
          taskId: task.id,
          task,
          start: bestAlternative.start,
          end: bestAlternative.end,
          confidence: bestAlternative.confidence || 50,
          reason: bestAlternative.reason || '重新安排',
        };

        rescheduledTasks.push(rescheduledTask);
        resolvedConflicts.push(conflict);

        // 记录历史
        this.resolutionHistory.push({
          timestamp: new Date(),
          conflictId: conflict.id,
          action: `自动重排到 ${bestAlternative.start.toLocaleString()}`,
        });
      } else {
        // 无法自动解决，需要用户确认
        requiresUserConfirmation.push(conflict);
      }
    }

    return {
      success: rescheduledTasks.length > 0,
      rescheduledTasks,
      conflicts: resolvedConflicts,
      requiresUserConfirmation,
    };
  }

  // ============== 5. 智能重排建议 ==============

  /**
   * 为冲突生成智能重排建议
   * 
   * @param conflict - 冲突信息
   * @param allTasks - 所有任务列表（用于考虑任务间关系）
   * @returns 重排策略
   */
  suggestRescheduleStrategy(
    conflict: Conflict,
    allTasks: Task[]
  ): RescheduleStrategy {
    const task = conflict.task;
    const impactSeverity = conflict.impact; // 使用冲突中已计算的影响程度
    
    // 基于影响程度确定策略
    if (impactSeverity === 'high') {
      // 高影响：需要用户确认
      if (task.priority === 'high' && task.dueDate) {
        const hoursUntilDue = (task.dueDate.getTime() - Date.now()) / (60 * 60 * 1000);
        
        if (hoursUntilDue < 24) {
          // 紧急高优先级任务
          return {
            type: 'move',
            priority: 10,
            description: '立即寻找今天内的可用时段',
            reason: '高优先级任务即将到期，需要立即处理',
            targetTaskId: task.id,
            impact: 'high',
            requiresConfirmation: true,
          };
        }
      }

      // 与重要事件冲突
      return {
        type: 'postpone',
        priority: 8,
        description: '将任务推迟到次日',
        reason: '与重要会议冲突，建议调整任务时间',
        targetTaskId: task.id,
        impact: 'high',
        requiresConfirmation: true,
      };
    }

    // 低影响：自动处理 - 优先检查是否可拆分
    if (task.estimatedMinutes && task.estimatedMinutes > 60) {
      return {
        type: 'split',
        priority: 5,
        description: '将任务拆分为多个小任务',
        reason: '任务较长，拆分后可以更灵活地安排',
        targetTaskId: task.id,
        impact: 'low',
        requiresConfirmation: false,
      };
    }

    // 软冲突：可以尝试移动
    if (conflict.type === 'soft') {
      return {
        type: 'move',
        priority: 6,
        description: '自动移动到其他可用时段',
        reason: '时间有冲突，可以自动调整到其他时段',
        targetTaskId: task.id,
        impact: 'low',
        requiresConfirmation: false,
      };
    }

    // 默认策略：延后
    return {
      type: 'postpone',
      priority: 4,
      description: '将任务推迟到明天',
      reason: '当前时段不可用，明天可能有空闲时间',
      targetTaskId: task.id,
      impact: 'low',
      requiresConfirmation: false,
    };
  }

  // ============== 辅助方法 ==============

  /**
   * 推断任务类型
   */
  private inferTaskType(task: Task): 'deep-work' | 'admin' | 'creative' | 'meeting' | 'routine' {
    const title = task.title.toLowerCase();
    const tags = task.tags.map(t => t.toLowerCase());
    const desc = (task.description || '').toLowerCase();

    // 深度工作
    const deepWorkKeywords = ['专注', 'deep', 'coding', '开发', '写作', 'writing', '设计', 'design', 'review'];
    if (deepWorkKeywords.some(k => title.includes(k) || desc.includes(k) || tags.includes(k))) {
      return 'deep-work';
    }

    // 行政事务
    const adminKeywords = ['邮件', 'email', '报销', '审批', '整理', 'admin'];
    if (adminKeywords.some(k => title.includes(k) || desc.includes(k) || tags.includes(k))) {
      return 'admin';
    }

    // 创意工作
    const creativeKeywords = ['创意', 'brainstorm', '头脑风暴', 'creative', '策划'];
    if (creativeKeywords.some(k => title.includes(k) || desc.includes(k) || tags.includes(k))) {
      return 'creative';
    }

    // 会议
    const meetingKeywords = ['会议', 'meeting', '讨论', 'sync', '汇报'];
    if (meetingKeywords.some(k => title.includes(k) || desc.includes(k) || tags.includes(k))) {
      return 'meeting';
    }

    // 默认
    return 'routine';
  }

  /**
   * 获取冲突历史
   */
  getResolutionHistory(): Array<{ timestamp: Date; conflictId: string; action: string }> {
    return [...this.resolutionHistory];
  }

  /**
   * 清除所有冲突记录
   */
  clearConflicts(): void {
    this.conflicts.clear();
  }

  /**
   * 获取所有存储的冲突
   */
  getAllConflicts(): Conflict[] {
    return Array.from(this.conflicts.values());
  }
}

// ============== 便捷函数 ==============

/**
   * 检查两个时间槽是否重叠
   */
export function doTimeSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  return slot1.start < slot2.end && slot1.end > slot2.start;
}

/**
 * 计算重叠时长（毫秒）
 */
export function calculateOverlapDuration(slot1: TimeSlot, slot2: TimeSlot): number {
  const start = Math.max(slot1.start.getTime(), slot2.start.getTime());
  const end = Math.min(slot1.end.getTime(), slot2.end.getTime());
  return Math.max(0, end - start);
}

/**
 * 检查任务是否需要用户确认
 */
export function requiresUserConfirmation(conflict: Conflict): boolean {
  return conflict.impact === 'high' || !conflict.autoResolvable;
}

/**
 * 创建 ConflictResolver 实例
 */
export function createConflictResolver(): ConflictResolver {
  return new ConflictResolver();
}
