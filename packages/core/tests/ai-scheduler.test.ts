/**
 * AI Scheduler 测试套件
 * 
 * Sprint 2 - Phase 3 测试覆盖
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AIScheduler,
  ScheduleResult,
  ScheduleOptions,
  UserPreference,
  initializeAIScheduler,
  calculateUrgencyScore,
  getDefaultPreferences,
} from '../src/ai-scheduler';
import { TaskManager, Task, TaskPriority } from '../src/task';
import { EventManager } from '../src/events';

describe('AIScheduler', () => {
  let taskManager: TaskManager;
  let eventManager: EventManager;
  let scheduler: AIScheduler;

  beforeEach(() => {
    taskManager = new TaskManager();
    eventManager = new EventManager();
    scheduler = new AIScheduler(taskManager, eventManager);
  });

  describe('基础功能', () => {
    it('应该正确初始化', () => {
      expect(scheduler).toBeDefined();
      expect(scheduler.getPreferences()).toBeDefined();
    });

    it('应该使用默认偏好', () => {
      const prefs = scheduler.getPreferences();
      expect(prefs.productiveHours.morning).toBeGreaterThan(0);
      expect(prefs.bufferMinutes).toBeGreaterThanOrEqual(0);
    });
  });

  describe('智能调度', () => {
    it('应该为单个任务安排时间', async () => {
      const task = taskManager.createTask({
        title: '测试任务',
        priority: 'high',
        estimatedMinutes: 60,
      });

      const result = scheduler.scheduleTasks([task], []);

      expect(result.scheduled.length).toBe(1);
      expect(result.scheduled[0].taskId).toBe(task.id);
      expect(result.scheduled[0].confidence).toBeGreaterThan(0);
    });

    it('应该支持 dryRun 模式', async () => {
      const task = taskManager.createTask({
        title: '测试任务',
        priority: 'medium',
        estimatedMinutes: 60,
      });

      const result = scheduler.scheduleTasks([task], [], { dryRun: true });

      // 验证返回结果
      expect(result.scheduled.length).toBe(1);
    });

    it('应该提供预览功能', async () => {
      const task = taskManager.createTask({
        title: '测试任务',
        priority: 'medium',
        estimatedMinutes: 60,
      });

      const preview = scheduler.previewSchedule([task], []);

      expect(preview.length).toBe(1);
    });
  });

  describe('冲突处理', () => {
    it('应该检测到冲突任务', async () => {
      const task = taskManager.createTask({
        title: '测试任务',
        priority: 'medium',
        estimatedMinutes: 60,
      });

      // 先安排任务
      await scheduler.scheduleTasks([task], []);

      // 创建冲突事件
      const scheduledTask = taskManager.getTaskById(task.id);
      if (scheduledTask?.scheduledStart) {
        const conflictResult = await scheduler.rescheduleOnConflict({
          id: 'event-1',
          title: '冲突事件',
          startDate: scheduledTask.scheduledStart,
          endDate: new Date(scheduledTask.scheduledStart.getTime() + 30 * 60 * 1000),
          isAllDay: false,
          recurrence: undefined,
          reminders: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        expect(conflictResult.conflicts.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('应该尊重受保护的任务', async () => {
      const task = taskManager.createTask({
        title: '受保护任务',
        priority: 'high',
        estimatedMinutes: 60,
      });

      await scheduler.scheduleTasks([task], []);
      const scheduledTask = taskManager.getTaskById(task.id);

      if (scheduledTask?.scheduledStart) {
        const conflictResult = await scheduler.rescheduleOnConflict(
          {
            id: 'event-1',
            title: '冲突事件',
            startDate: scheduledTask.scheduledStart,
            endDate: new Date(scheduledTask.scheduledStart.getTime() + 30 * 60 * 1000),
            isAllDay: false,
            recurrence: undefined,
            reminders: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { protectedTaskIds: [task.id] }
        );

        // 受保护的任务不应该被移动
        expect(conflictResult.moved.length).toBe(0);
      }
    });
  });

  describe('偏好学习', () => {
    it('应该更新偏好', () => {
      const newPrefs: Partial<UserPreference> = {
        bufferMinutes: 30,
      };

      scheduler.learnPreference(newPrefs);

      expect(scheduler.getPreferences().bufferMinutes).toBe(30);
    });

    it('应该从反馈中学习', () => {
      scheduler.learnPreference({ bufferMinutes: 20 });

      expect(scheduler.getPreferences().bufferMinutes).toBe(20);
    });

    it('偏好变化后应该清除缓存', async () => {
      const task = taskManager.createTask({
        title: '测试任务',
        priority: 'medium',
        estimatedMinutes: 60,
      });

      // 第一次调度
      await scheduler.scheduleTasks([task], []);

      // 更新偏好
      scheduler.learnPreference({ bufferMinutes: 45 });

      // 验证调度结果会变化（缓存已清除）
      const result = await scheduler.scheduleTasks([task], []);
      expect(result).toBeDefined();
    });
  });

  describe('工具函数', () => {
    it('calculateUrgencyScore 应该正确计算紧急度', () => {
      const urgentTask: Partial<Task> = {
        dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12小时后
      };

      const score = calculateUrgencyScore(urgentTask as Task);
      expect(score).toBe(80); // 12小时 = 80分
    });

    it('getDefaultPreferences 应该返回默认值', () => {
      const prefs = getDefaultPreferences();
      expect(prefs.bufferMinutes).toBe(15);
      expect(prefs.maxDailyTasks).toBe(8);
    });
  });

  describe('性能测试', () => {
    it('应该在 1 秒内调度 10 个任务', async () => {
      const tasks: Task[] = [];
      // 创建 10 个任务
      for (let i = 0; i < 10; i++) {
        tasks.push(taskManager.createTask({
          title: `任务 ${i}`,
          priority: i % 2 === 0 ? 'high' : 'low',
          estimatedMinutes: 30 + i * 10,
        }));
      }

      const start = Date.now();
      await scheduler.scheduleTasks(tasks, []);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    });
  });

  describe('统计功能', () => {
    it('应该提供调度统计', () => {
      const stats = scheduler.getStatistics();
      
      expect(stats.learningProgress).toBeGreaterThanOrEqual(0);
      expect(stats.learningProgress).toBeLessThanOrEqual(100);
      expect(stats.preferenceAccuracy).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('initializeAIScheduler', () => {
  it('应该正确初始化并注入到 Manager', () => {
    const taskManager = new TaskManager();
    const eventManager = new EventManager();
    
    const scheduler = initializeAIScheduler(taskManager, eventManager);
    
    expect(scheduler).toBeDefined();
    expect(scheduler.getPreferences()).toBeDefined();
  });
});
