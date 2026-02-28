/**
 * Conflict Resolver 单元测试
 * 测试冲突检测与重排模块
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConflictResolver,
  Conflict,
  ScheduledTask,
  TimeSlot,
  RescheduleResult,
  RescheduleStrategy,
  doTimeSlotsOverlap,
  calculateOverlapDuration,
  requiresUserConfirmation,
  createConflictResolver,
} from '../src/conflict-resolver';
import { Task, TaskPriority } from '../src/task';
import { CalendarEvent } from '../src/calendar';
import { UserPreference } from '../src/user-preference';

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  // ============== 工具函数 ==============

  function createTask(overrides: Partial<Task> = {}, priority: TaskPriority = 'medium'): Task {
    return {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Test Task',
      status: 'todo',
      priority,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedMinutes: 60,
      ...overrides,
    } as Task;
  }

  function createEvent(
    startHour: number,
    endHour: number,
    date: Date = new Date(),
    title: string = 'Meeting'
  ): CalendarEvent {
    const start = new Date(date);
    start.setHours(startHour, 0, 0, 0);
    const end = new Date(date);
    end.setHours(endHour, 0, 0, 0);

    return {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      startDate: start,
      endDate: end,
    };
  }

  function createScheduledTask(
    taskOverrides: Partial<Task> = {},
    startHour: number = 10,
    endHour: number = 11,
    date: Date = new Date()
  ): ScheduledTask {
    const task = createTask(taskOverrides);
    const start = new Date(date);
    start.setHours(startHour, 0, 0, 0);
    const end = new Date(date);
    end.setHours(endHour, 0, 0, 0);

    return {
      taskId: task.id,
      task,
      start,
      end,
    };
  }

  function createUserPreference(overrides: Partial<UserPreference> = {}): UserPreference {
    return {
      productiveHours: [
        { start: 9, end: 12, level: 'high' },
        { start: 14, end: 17, level: 'medium' },
        { start: 20, end: 22, level: 'low' },
      ],
      taskTypePreferences: {
        'deep-work': { preferredHours: [9, 10, 11], avoidedHours: [22, 23], confidence: 0.8 },
        'admin': { preferredHours: [14, 15, 16], avoidedHours: [], confidence: 0.6 },
        'creative': { preferredHours: [10, 11, 15, 16], avoidedHours: [], confidence: 0.7 },
        'meeting': { preferredHours: [9, 10, 14, 15, 16], avoidedHours: [], confidence: 0.5 },
        'routine': { preferredHours: [9, 10, 14, 15, 20, 21], avoidedHours: [], confidence: 0.4 },
      },
      sessionLength: { min: 25, max: 120 },
      breakDuration: 10,
      learningProgress: {
        coldStartComplete: true,
        totalTasksAnalyzed: 50,
        totalFeedbackReceived: 20,
        learningDays: 30,
        hourlyCompletionRate: new Array(24).fill(0),
        dailyTaskCount: new Array(7).fill(0),
        feedbackHistory: [],
      },
      version: 1,
      updatedAt: new Date(),
    };
  }

  function getTomorrow(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }

  // ============== 1. 冲突检测测试 ==============

  describe('detectConflicts', () => {
    it('应该检测时间重叠的硬冲突', () => {
      const tomorrow = getTomorrow();
      const scheduledTask = createScheduledTask(
        { title: '冲突任务' },
        10,
        11,
        tomorrow
      );

      const event = createEvent(10, 12, tomorrow, '会议');

      const conflicts = resolver.detectConflicts(scheduledTask, [event]);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('hard');
      expect(conflicts[0].task.id).toBe(scheduledTask.task.id);
      expect(conflicts[0].conflictingEvents).toHaveLength(1);
      expect(conflicts[0].conflictingEvents[0].id).toBe(event.id);
    });

    it('应该检测多个重叠事件', () => {
      const tomorrow = getTomorrow();
      const scheduledTask = createScheduledTask(
        { title: '长任务', estimatedMinutes: 120 },
        10,
        12,
        tomorrow
      );

      const events = [
        createEvent(10, 11, tomorrow, '会议1'),
        createEvent(11, 13, tomorrow, '会议2'),
      ];

      const conflicts = resolver.detectConflicts(scheduledTask, events);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictingEvents).toHaveLength(2);
    });

    it('应该检测缓冲时间不足的软冲突', () => {
      const tomorrow = getTomorrow();
      const scheduledTask = createScheduledTask(
        { title: '缓冲不足任务' },
        11,
        12,
        tomorrow
      );

      // 10:50 - 11:00 的事件，与任务开始只有10分钟间隔
      const event = createEvent(10, 11, tomorrow, '前置会议');

      const conflicts = resolver.detectConflicts(scheduledTask, [event], {
        checkBuffer: true,
        bufferMinutes: 15,
      });

      const bufferConflict = conflicts.find(c => c.type === 'soft');
      expect(bufferConflict).toBeDefined();
    });

    it('应该检测截止时间风险（硬冲突）', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = getTomorrow();
      const scheduledTask = createScheduledTask(
        {
          title: '逾期任务',
          dueDate: yesterday,
          estimatedMinutes: 60,
        },
        10,
        11,
        tomorrow
      );

      const conflicts = resolver.detectConflicts(scheduledTask, []);

      const deadlineConflict = conflicts.find(c =>
        c.type === 'hard' && c.impact === 'high'
      );
      expect(deadlineConflict).toBeDefined();
    });

    it('应该检测即将到期的高优先级任务（软冲突）', () => {
      const nearFuture = new Date();
      nearFuture.setHours(nearFuture.getHours() + 12);

      const tomorrow = getTomorrow();
      const scheduledTask = createScheduledTask(
        {
          title: '紧急任务',
          priority: 'high',
          dueDate: nearFuture,
        },
        10,
        11,
        tomorrow
      );

      const conflicts = resolver.detectConflicts(scheduledTask, []);

      const deadlineConflict = conflicts.find(c =>
        c.type === 'soft' && c.impact === 'high'
      );
      expect(deadlineConflict).toBeDefined();
    });

    it('没有冲突时应该返回空数组', () => {
      const tomorrow = getTomorrow();
      const scheduledTask = createScheduledTask(
        { title: '无冲突任务' },
        10,
        11,
        tomorrow
      );

      const event = createEvent(14, 15, tomorrow, '下午会议');

      const conflicts = resolver.detectConflicts(scheduledTask, [event]);

      expect(conflicts).toHaveLength(0);
    });

    it('应该正确设置冲突的 autoResolvable 属性', () => {
      const tomorrow = getTomorrow();

      // 低优先级任务的软冲突应该是自动可解决的
      const lowPriorityTask = createScheduledTask(
        { title: '低优先级', priority: 'low' },
        10,
        11,
        tomorrow
      );

      const event = createEvent(10, 11, tomorrow, '会议');

      // 创建一个缓冲冲突（软冲突）
      const bufferEvent = createEvent(11, 12, tomorrow, '后续会议');

      const conflicts = resolver.detectConflicts(lowPriorityTask, [bufferEvent], {
        checkBuffer: true,
        bufferMinutes: 30,
      });

      const softConflict = conflicts.find(c => c.type === 'soft');
      if (softConflict) {
        expect(softConflict.autoResolvable).toBe(true);
      }
    });
  });

  // ============== 2. 影响评估测试 ==============

  describe('assessImpact', () => {
    it('应该将高优先级任务冲突评估为高影响', () => {
      const tomorrow = getTomorrow();
      const task = createTask({ title: '高优先级任务', priority: 'high' });
      const event = createEvent(10, 11, tomorrow, '会议');

      const conflict: Conflict = {
        id: 'test-1',
        type: 'hard',
        task,
        conflictingEvents: [event],
        suggestedAlternatives: [],
        impact: 'high',
        autoResolvable: false,
      };

      const assessment = resolver.assessImpact(conflict);

      expect(assessment.severity).toBe('high');
      expect(assessment.reason).toContain('高优先级');
    });

    it('应该将截止时间临近的任务评估为高影响', () => {
      const nearFuture = new Date();
      nearFuture.setHours(nearFuture.getHours() + 12);

      const task = createTask({
        title: '紧急任务',
        priority: 'medium',
        dueDate: nearFuture,
      });

      const conflict: Conflict = {
        id: 'test-2',
        type: 'hard',
        task,
        conflictingEvents: [],
        suggestedAlternatives: [],
        impact: 'high',
        autoResolvable: false,
      };

      const assessment = resolver.assessImpact(conflict);

      expect(assessment.severity).toBe('high');
      expect(assessment.reason).toContain('截止时间临近');
    });

    it('应该将与重要事件冲突评估为高影响', () => {
      const tomorrow = getTomorrow();
      const task = createTask({ title: '普通任务', priority: 'medium' });
      const importantEvent = createEvent(10, 11, tomorrow, '重要面试');

      const conflict: Conflict = {
        id: 'test-3',
        type: 'hard',
        task,
        conflictingEvents: [importantEvent],
        suggestedAlternatives: [],
        impact: 'high',
        autoResolvable: false,
      };

      const assessment = resolver.assessImpact(conflict);

      expect(assessment.severity).toBe('high');
      expect(assessment.reason).toContain('重要会议');
    });

    it('应该将普通任务的软冲突评估为低影响', () => {
      const task = createTask({ title: '普通任务', priority: 'low' });

      const conflict: Conflict = {
        id: 'test-4',
        type: 'soft',
        task,
        conflictingEvents: [],
        suggestedAlternatives: [],
        impact: 'low',
        autoResolvable: true,
      };

      const assessment = resolver.assessImpact(conflict);

      expect(assessment.severity).toBe('low');
    });
  });

  // ============== 3. 生成替代时间方案测试 ==============

  describe('generateAlternatives', () => {
    it('应该为冲突任务生成替代时间方案', () => {
      const tomorrow = getTomorrow();
      const task = createTask({
        title: '测试任务',
        estimatedMinutes: 60,
      });

      const blockedSlot: TimeSlot = {
        start: new Date(tomorrow.setHours(10, 0, 0, 0)),
        end: new Date(tomorrow.setHours(11, 0, 0, 0)),
      };

      const preferences = createUserPreference();

      const alternatives = resolver.generateAlternatives(
        task,
        blockedSlot,
        preferences
      );

      expect(alternatives.length).toBeGreaterThan(0);
      expect(alternatives.length).toBeLessThanOrEqual(5);

      for (const alt of alternatives) {
        expect(alt.start).toBeInstanceOf(Date);
        expect(alt.end).toBeInstanceOf(Date);
        expect(alt.confidence).toBeDefined();
        expect(alt.confidence).toBeGreaterThanOrEqual(0);
        expect(alt.confidence).toBeLessThanOrEqual(1);
        expect(alt.reason).toBeDefined();
      }
    });

    it('替代方案应该避开被阻塞的时段', () => {
      const tomorrow = getTomorrow();
      const task = createTask({
        title: '测试任务',
        estimatedMinutes: 60,
      });

      const blockedSlot: TimeSlot = {
        start: new Date(tomorrow.setHours(10, 0, 0, 0)),
        end: new Date(tomorrow.setHours(11, 0, 0, 0)),
      };

      const preferences = createUserPreference();

      const alternatives = resolver.generateAlternatives(
        task,
        blockedSlot,
        preferences,
        { maxDaysForward: 7 }
      );

      // 所有替代方案都应该在被阻塞时段之后
      for (const alt of alternatives) {
        expect(alt.start.getTime()).toBeGreaterThanOrEqual(blockedSlot.end.getTime());
      }
    });

    it('应该按置信度排序替代方案', () => {
      const tomorrow = getTomorrow();
      const task = createTask({
        title: '专注工作',
        tags: ['coding'],
        estimatedMinutes: 60,
      });

      const blockedSlot: TimeSlot = {
        start: new Date(tomorrow.setHours(10, 0, 0, 0)),
        end: new Date(tomorrow.setHours(11, 0, 0, 0)),
      };

      const preferences = createUserPreference();

      const alternatives = resolver.generateAlternatives(
        task,
        blockedSlot,
        preferences
      );

      // 检查是否按置信度降序排列
      for (let i = 1; i < alternatives.length; i++) {
        expect(alternatives[i - 1].confidence).toBeGreaterThanOrEqual(
          alternatives[i].confidence || 0
        );
      }
    });

    it('应该考虑截止时间生成替代方案', () => {
      const tomorrow = getTomorrow();
      const dueDate = new Date(tomorrow);
      dueDate.setDate(dueDate.getDate() + 2);

      const task = createTask({
        title: '有截止时间的任务',
        estimatedMinutes: 60,
        dueDate,
      });

      const blockedSlot: TimeSlot = {
        start: new Date(tomorrow.setHours(10, 0, 0, 0)),
        end: new Date(tomorrow.setHours(11, 0, 0, 0)),
      };

      const preferences = createUserPreference();

      const alternatives = resolver.generateAlternatives(
        task,
        blockedSlot,
        preferences,
        { maxDaysForward: 7 }
      );

      expect(alternatives.length).toBeGreaterThan(0);

      // 所有替代方案都应该在截止时间之前
      for (const alt of alternatives) {
        expect(alt.end.getTime()).toBeLessThanOrEqual(dueDate.getTime());
      }
    });

    it('应该限制返回的替代方案数量', () => {
      const tomorrow = getTomorrow();
      const task = createTask({
        title: '测试任务',
        estimatedMinutes: 60,
      });

      const blockedSlot: TimeSlot = {
        start: new Date(tomorrow.setHours(10, 0, 0, 0)),
        end: new Date(tomorrow.setHours(11, 0, 0, 0)),
      };

      const preferences = createUserPreference();

      const alternatives = resolver.generateAlternatives(
        task,
        blockedSlot,
        preferences,
        { maxResults: 3, maxDaysForward: 7 }
      );

      expect(alternatives.length).toBeLessThanOrEqual(3);
    });

    it('应该过滤掉低置信度的替代方案', () => {
      const tomorrow = getTomorrow();
      const task = createTask({
        title: '测试任务',
        estimatedMinutes: 60,
      });

      const blockedSlot: TimeSlot = {
        start: new Date(tomorrow.setHours(10, 0, 0, 0)),
        end: new Date(tomorrow.setHours(11, 0, 0, 0)),
      };

      const preferences = createUserPreference();

      const alternatives = resolver.generateAlternatives(
        task,
        blockedSlot,
        preferences,
        { minConfidence: 0.7 }
      );

      for (const alt of alternatives) {
        expect(alt.confidence).toBeGreaterThanOrEqual(0.7);
      }
    });
  });

  // ============== 4. 自动重排测试 ==============

  describe('autoReschedule', () => {
    it('应该自动重排低影响冲突', () => {
      const tomorrow = getTomorrow();
      const task = createTask({
        title: '低优先级任务',
        priority: 'low',
        estimatedMinutes: 60,
        scheduledStart: new Date(tomorrow.setHours(10, 0, 0, 0)),
        scheduledEnd: new Date(tomorrow.setHours(11, 0, 0, 0)),
      });

      const conflict: Conflict = {
        id: 'test-low-impact',
        type: 'soft',
        task,
        conflictingEvents: [],
        suggestedAlternatives: [],
        impact: 'low',
        autoResolvable: true,
      };

      const preferences = createUserPreference();

      const result = resolver.autoReschedule([conflict], [task], preferences);

      expect(result.success).toBe(true);
      expect(result.rescheduledTasks.length).toBeGreaterThan(0);
      expect(result.requiresUserConfirmation.length).toBe(0);
    });

    it('应该将高影响冲突标记为需要用户确认', () => {
      const tomorrow = getTomorrow();
      const task = createTask({
        title: '高优先级任务',
        priority: 'high',
        estimatedMinutes: 60,
        scheduledStart: new Date(tomorrow.setHours(10, 0, 0, 0)),
        scheduledEnd: new Date(tomorrow.setHours(11, 0, 0, 0)),
      });

      const conflict: Conflict = {
        id: 'test-high-impact',
        type: 'hard',
        task,
        conflictingEvents: [],
        suggestedAlternatives: [],
        impact: 'high',
        autoResolvable: false,
      };

      const preferences = createUserPreference();

      const result = resolver.autoReschedule([conflict], [task], preferences);

      expect(result.requiresUserConfirmation.length).toBe(1);
      expect(result.requiresUserConfirmation[0].id).toBe(conflict.id);
    });

    it('应该处理多个冲突，分别处理高低影响', () => {
      const tomorrow = getTomorrow();

      const lowPriorityTask = createTask({
        title: '低优先级',
        priority: 'low',
        estimatedMinutes: 60,
        scheduledStart: new Date(new Date(tomorrow).setHours(10, 0, 0, 0)),
        scheduledEnd: new Date(new Date(tomorrow).setHours(11, 0, 0, 0)),
      });

      const highPriorityTask = createTask({
        title: '高优先级',
        priority: 'high',
        estimatedMinutes: 60,
        scheduledStart: new Date(new Date(tomorrow).setHours(14, 0, 0, 0)),
        scheduledEnd: new Date(new Date(tomorrow).setHours(15, 0, 0, 0)),
      });

      const conflicts: Conflict[] = [
        {
          id: 'conflict-low',
          type: 'soft',
          task: lowPriorityTask,
          conflictingEvents: [],
          suggestedAlternatives: [],
          impact: 'low',
          autoResolvable: true,
        },
        {
          id: 'conflict-high',
          type: 'hard',
          task: highPriorityTask,
          conflictingEvents: [],
          suggestedAlternatives: [],
          impact: 'high',
          autoResolvable: false,
        },
      ];

      const preferences = createUserPreference();

      const result = resolver.autoReschedule(conflicts, [lowPriorityTask, highPriorityTask], preferences);

      // 低影响冲突应该自动解决或需要确认（取决于是否有可用时段）
      // 高影响冲突应该需要用户确认
      expect(result.requiresUserConfirmation.some(c => c.id === 'conflict-high')).toBe(true);
    });

    it('应该返回成功状态当有任务被重排', () => {
      const tomorrow = getTomorrow();
      const task = createTask({
        title: '可重排任务',
        priority: 'low',
        estimatedMinutes: 60,
        scheduledStart: new Date(tomorrow.setHours(10, 0, 0, 0)),
        scheduledEnd: new Date(tomorrow.setHours(11, 0, 0, 0)),
      });

      const conflict: Conflict = {
        id: 'test-success',
        type: 'soft',
        task,
        conflictingEvents: [],
        suggestedAlternatives: [],
        impact: 'low',
        autoResolvable: true,
      };

      const preferences = createUserPreference();

      const result = resolver.autoReschedule([conflict], [task], preferences);

      if (result.rescheduledTasks.length > 0) {
        expect(result.success).toBe(true);
      }
    });
  });

  // ============== 5. 智能重排建议测试 ==============

  describe('suggestRescheduleStrategy', () => {
    it('应该为高影响冲突建议需要确认的策略', () => {
      const task = createTask({
        title: '高优先级任务',
        priority: 'high',
      });

      const conflict: Conflict = {
        id: 'test-strategy-high',
        type: 'hard',
        task,
        conflictingEvents: [],
        suggestedAlternatives: [],
        impact: 'high',
        autoResolvable: false,
      };

      const strategy = resolver.suggestRescheduleStrategy(conflict, [task]);

      expect(strategy.requiresConfirmation).toBe(true);
      expect(strategy.impact).toBe('high');
    });

    it('应该为即将到期的高优先级任务建议紧急移动', () => {
      const nearFuture = new Date();
      nearFuture.setHours(nearFuture.getHours() + 12);

      const task = createTask({
        title: '紧急任务',
        priority: 'high',
        dueDate: nearFuture,
      });

      const conflict: Conflict = {
        id: 'test-urgent',
        type: 'hard',
        task,
        conflictingEvents: [],
        suggestedAlternatives: [],
        impact: 'high',
        autoResolvable: false,
      };

      const strategy = resolver.suggestRescheduleStrategy(conflict, [task]);

      expect(strategy.type).toBe('move');
      expect(strategy.priority).toBe(10);
      expect(strategy.reason).toContain('即将到期');
    });

    it('应该为软冲突建议自动移动', () => {
      const task = createTask({
        title: '普通任务',
        priority: 'low',
      });

      const conflict: Conflict = {
        id: 'test-soft',
        type: 'soft',
        task,
        conflictingEvents: [],
        suggestedAlternatives: [],
        impact: 'low',
        autoResolvable: true,
      };

      const strategy = resolver.suggestRescheduleStrategy(conflict, [task]);

      expect(strategy.type).toBe('move');
      expect(strategy.requiresConfirmation).toBe(false);
    });

    it('应该为长任务建议拆分策略', () => {
      const task = createTask({
        title: '长任务',
        priority: 'low',
        estimatedMinutes: 120,
      });

      const conflict: Conflict = {
        id: 'test-split',
        type: 'hard',
        task,
        conflictingEvents: [],
        suggestedAlternatives: [],
        impact: 'low',
        autoResolvable: false,
      };

      const strategy = resolver.suggestRescheduleStrategy(conflict, [task]);

      expect(strategy.type).toBe('split');
      expect(strategy.reason).toContain('拆分');
    });

    it('应该为无法移动的任务建议延后', () => {
      const task = createTask({
        title: '短任务',
        priority: 'low',
        estimatedMinutes: 30,
      });

      const conflict: Conflict = {
        id: 'test-postpone',
        type: 'hard',
        task,
        conflictingEvents: [],
        suggestedAlternatives: [],
        impact: 'low',
        autoResolvable: false,
      };

      const strategy = resolver.suggestRescheduleStrategy(conflict, [task]);

      // 默认策略是延后
      expect(strategy.type).toBe('postpone');
    });
  });

  // ============== 辅助函数测试 ==============

  describe('utility functions', () => {
    it('doTimeSlotsOverlap 应该正确检测重叠', () => {
      const tomorrow = getTomorrow();

      const slot1: TimeSlot = {
        start: new Date(tomorrow.setHours(10, 0, 0, 0)),
        end: new Date(tomorrow.setHours(11, 0, 0, 0)),
      };

      const slot2: TimeSlot = {
        start: new Date(tomorrow.setHours(10, 30, 0, 0)),
        end: new Date(tomorrow.setHours(12, 0, 0, 0)),
      };

      expect(doTimeSlotsOverlap(slot1, slot2)).toBe(true);

      const slot3: TimeSlot = {
        start: new Date(tomorrow.setHours(12, 0, 0, 0)),
        end: new Date(tomorrow.setHours(13, 0, 0, 0)),
      };

      expect(doTimeSlotsOverlap(slot1, slot3)).toBe(false);
    });

    it('calculateOverlapDuration 应该正确计算重叠时长', () => {
      const tomorrow = getTomorrow();

      const slot1: TimeSlot = {
        start: new Date(tomorrow.setHours(10, 0, 0, 0)),
        end: new Date(tomorrow.setHours(12, 0, 0, 0)),
      };

      const slot2: TimeSlot = {
        start: new Date(tomorrow.setHours(11, 0, 0, 0)),
        end: new Date(tomorrow.setHours(13, 0, 0, 0)),
      };

      const overlap = calculateOverlapDuration(slot1, slot2);
      expect(overlap).toBe(60 * 60 * 1000); // 1小时
    });

    it('requiresUserConfirmation 应该正确判断', () => {
      const highImpactConflict: Conflict = {
        id: 'test-high',
        type: 'hard',
        task: createTask({}),
        conflictingEvents: [],
        suggestedAlternatives: [],
        impact: 'high',
        autoResolvable: false,
      };

      expect(requiresUserConfirmation(highImpactConflict)).toBe(true);

      const lowImpactConflict: Conflict = {
        id: 'test-low',
        type: 'soft',
        task: createTask({}),
        conflictingEvents: [],
        suggestedAlternatives: [],
        impact: 'low',
        autoResolvable: true,
      };

      expect(requiresUserConfirmation(lowImpactConflict)).toBe(false);
    });

    it('createConflictResolver 应该创建实例', () => {
      const newResolver = createConflictResolver();
      expect(newResolver).toBeInstanceOf(ConflictResolver);
    });
  });

  // ============== 边界条件测试 ==============

  describe('edge cases', () => {
    it('应该处理空冲突列表', () => {
      const preferences = createUserPreference();

      const result = resolver.autoReschedule([], [], preferences);

      expect(result.success).toBe(false);
      expect(result.rescheduledTasks).toHaveLength(0);
      expect(result.requiresUserConfirmation).toHaveLength(0);
    });

    it('应该处理没有预计时长的任务', () => {
      const tomorrow = getTomorrow();
      const task = createTask({
        title: '无时长的任务',
        estimatedMinutes: undefined,
      });

      const blockedSlot: TimeSlot = {
        start: new Date(tomorrow.setHours(10, 0, 0, 0)),
        end: new Date(tomorrow.setHours(11, 0, 0, 0)),
      };

      const preferences = createUserPreference();

      const alternatives = resolver.generateAlternatives(
        task,
        blockedSlot,
        preferences
      );

      // 应该使用默认时长（30分钟）
      expect(alternatives.length).toBeGreaterThanOrEqual(0);
    });

    it('应该处理跨天的情况', () => {
      const tomorrow = getTomorrow();
      const task = createTask({
        title: '跨天任务',
        estimatedMinutes: 60,
      });

      const blockedSlot: TimeSlot = {
        start: new Date(tomorrow.setHours(23, 0, 0, 0)),
        end: new Date(tomorrow.setHours(23, 30, 0, 0)),
      };

      const preferences = createUserPreference();

      const alternatives = resolver.generateAlternatives(
        task,
        blockedSlot,
        preferences,
        { maxDaysForward: 3 }
      );

      // 应该生成次日及以后的替代方案
      expect(alternatives.length).toBeGreaterThan(0);

      for (const alt of alternatives) {
        expect(alt.start.getTime()).toBeGreaterThan(blockedSlot.end.getTime());
      }
    });

    it('应该处理非常长的任务', () => {
      const tomorrow = getTomorrow();
      const task = createTask({
        title: '长任务',
        estimatedMinutes: 240, // 4小时
      });

      const blockedSlot: TimeSlot = {
        start: new Date(tomorrow.setHours(10, 0, 0, 0)),
        end: new Date(tomorrow.setHours(11, 0, 0, 0)),
      };

      const preferences = createUserPreference();

      const alternatives = resolver.generateAlternatives(
        task,
        blockedSlot,
        preferences
      );

      // 长任务可能无法在工作时段内安排
      // 但根据实现可能会返回一些选项
      for (const alt of alternatives) {
        const duration = (alt.end.getTime() - alt.start.getTime()) / (60 * 1000);
        expect(duration).toBe(240);
      }
    });
  });

  // ============== 集成测试 ==============

  describe('integration', () => {
    it('完整的冲突处理流程', () => {
      const tomorrow = getTomorrow();

      // 1. 创建一个已调度的任务
      const task = createTask({
        title: '我的任务',
        priority: 'medium',
        estimatedMinutes: 60,
      });

      const scheduledTask: ScheduledTask = {
        taskId: task.id,
        task,
        start: new Date(new Date(tomorrow).setHours(10, 0, 0, 0)),
        end: new Date(new Date(tomorrow).setHours(11, 0, 0, 0)),
      };

      // 2. 创建一个冲突的事件
      const conflictingEvent = createEvent(10, 12, tomorrow, '重要会议');

      // 3. 检测冲突
      const conflicts = resolver.detectConflicts(scheduledTask, [conflictingEvent]);
      expect(conflicts.length).toBeGreaterThan(0);

      const conflict = conflicts[0];

      // 4. 评估影响
      const impact = resolver.assessImpact(conflict);
      expect(impact.severity).toBeDefined();

      // 5. 生成替代方案
      const preferences = createUserPreference();
      const alternatives = resolver.generateAlternatives(
        task,
        { start: scheduledTask.start, end: scheduledTask.end },
        preferences
      );
      expect(alternatives.length).toBeGreaterThanOrEqual(0);

      // 6. 获取策略建议
      const strategy = resolver.suggestRescheduleStrategy(conflict, [task]);
      expect(strategy.type).toBeDefined();

      // 7. 自动重排
      const result = resolver.autoReschedule(conflicts, [task], preferences);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('rescheduledTasks');
      expect(result).toHaveProperty('conflicts');
      expect(result).toHaveProperty('requiresUserConfirmation');
    });
  });
});
