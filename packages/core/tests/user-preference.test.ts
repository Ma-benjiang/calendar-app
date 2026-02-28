/**
 * User Preference 测试套件
 * 
 * Sprint 2 - Phase 3 测试覆盖
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  UserPreferenceStore,
  createUserPreferenceStore,
  getDefaultUserPreferences,
  getOnboardingQuestions,
  validatePreferences,
  ONBOARDING_QUESTIONS,
  OnboardingAnswers,
} from '../src/user-preference';

describe('UserPreferenceStore', () => {
  let store: UserPreferenceStore;

  beforeEach(() => {
    store = new UserPreferenceStore();
  });

  describe('基础功能', () => {
    it('应该正确初始化', () => {
      expect(store).toBeDefined();
      const prefs = store.getPreferences();
      expect(prefs).toBeDefined();
      expect(prefs.bufferMinutes).toBe(15);
    });

    it('应该获取完整偏好数据', () => {
      const prefs = store.getPreferences();
      
      expect(prefs.productiveHours).toBeDefined();
      expect(prefs.workingHours).toBeDefined();
      expect(prefs.taskTypePreferences).toBeDefined();
      expect(prefs.metadata).toBeDefined();
    });
  });

  describe('更新偏好', () => {
    it('应该更新偏好数据', () => {
      store.updatePreferences({ bufferMinutes: 30 });
      
      expect(store.getPreferences().bufferMinutes).toBe(30);
    });

    it('应该更新特定字段', () => {
      store.updateField('bufferMinutes', 45);
      
      expect(store.getPreferences().bufferMinutes).toBe(45);
    });

    it('应该更新时间戳', () => {
      const beforeUpdate = store.getPreferences().metadata.lastUpdated;
      
      store.updatePreferences({ maxDailyTasks: 10 });
      
      const afterUpdate = store.getPreferences().metadata.lastUpdated;
      expect(new Date(afterUpdate).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeUpdate).getTime()
      );
    });
  });

  describe('冷启动/引导', () => {
    it('新用户应该未完成引导', () => {
      expect(store.isOnboardingComplete()).toBe(false);
    });

    it('应该完成引导', () => {
      store.completeOnboarding();
      
      expect(store.isOnboardingComplete()).toBe(true);
    });

    it('应该从问卷答案生成偏好', () => {
      const answers: OnboardingAnswers = {
        chronotype: 'early-bird',
        focusTime: 'morning',
        bufferTime: 20,
        maxDailyTasks: 10,
      };

      store.applyOnboardingAnswers(answers);

      const prefs = store.getPreferences();
      expect(prefs.chronotype).toBe('early-bird');
      expect(prefs.bufferMinutes).toBe(20);
      expect(prefs.maxDailyTasks).toBe(10);
      expect(store.isOnboardingComplete()).toBe(true);
    });

    it('early-bird 应该有更高的早晨效率分数', () => {
      store.applyOnboardingAnswers({ chronotype: 'early-bird' });
      
      const prefs = store.getPreferences();
      expect(prefs.productiveHours.morning).toBeGreaterThan(
        prefs.productiveHours.evening
      );
    });
  });

  describe('偏好学习', () => {
    it('应该从显式偏好学习', () => {
      store.learnPreference({
        type: 'explicit',
        data: { bufferMinutes: 25 },
      });

      expect(store.getPreferences().bufferMinutes).toBe(25);
    });

    it('应该从任务完成行为学习', () => {
      const behavior = {
        completedTasks: [
          {
            taskId: 'task-1',
            scheduledHour: 9,
            scheduledDayOfWeek: 1,
            estimatedMinutes: 60,
            actualMinutes: 45,
            completedAt: new Date(),
          },
        ],
      };

      store.learnFromBehavior(behavior);

      // 学习后应该更新完成模式
      const progress = store.getLearningProgress();
      expect(progress).toBeGreaterThan(0);
    });

    it('应该从反馈学习', () => {
      const behavior = {
        feedbackRecords: [
          {
            taskId: 'task-1',
            action: 'accepted' as const,
            originalSlot: { start: new Date('2024-01-01T09:00:00'), end: new Date('2024-01-01T10:00:00') },
            timestamp: new Date(),
          },
        ],
      };

      const beforeScore = store.getProductivityScore(9);
      store.learnFromBehavior(behavior);
      const afterScore = store.getProductivityScore(9);

      // 接受推荐应该提高该时段分数
      expect(afterScore).toBeGreaterThanOrEqual(beforeScore);
    });

    it('应该增加学习迭代计数', () => {
      const before = store.getPreferences().metadata.learningIterations;
      
      store.learnPreference({
        type: 'explicit',
        data: {},
      });

      const after = store.getPreferences().metadata.learningIterations;
      expect(after).toBe(before + 1);
    });
  });

  describe('查询方法', () => {
    it('应该获取时段效率分数', () => {
      const morningScore = store.getProductivityScore(9);  // 上午
      const nightScore = store.getProductivityScore(23);    // 深夜

      expect(morningScore).toBeGreaterThan(0);
      expect(nightScore).toBeGreaterThan(0);
    });

    it('应该获取任务类型偏好', () => {
      const pref = store.getTaskTypePreference('deep-work');

      expect(pref).toBeDefined();
      expect(pref?.taskType).toBe('deep-work');
    });

    it('应该获取最佳工作时段', () => {
      const bestHours = store.getBestWorkingHours();

      expect(bestHours.length).toBeGreaterThan(0);
      expect(bestHours[0].score).toBeGreaterThan(0);
    });

    it('应该计算学习进度', () => {
      const progress = store.getLearningProgress();

      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });
  });

  describe('周报生成', () => {
    it('应该生成效率周报', () => {
      // 先学习一些数据
      store.learnFromBehavior({
        completedTasks: [
          {
            taskId: 'task-1',
            scheduledHour: 9,
            scheduledDayOfWeek: 1,
            estimatedMinutes: 60,
            actualMinutes: 50,
            completedAt: new Date(),
          },
        ],
      });

      const report = store.generateWeeklyReport();

      expect(report).toHaveProperty('productiveHours');
      expect(report).toHaveProperty('insights');
      expect(report).toHaveProperty('recommendations');
    });
  });

  describe('订阅功能', () => {
    it('应该通知订阅者偏好变更', () => {
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);

      store.updatePreferences({ bufferMinutes: 20 });

      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
    });

    it('取消订阅后不应再接收通知', () => {
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);

      unsubscribe();
      store.updatePreferences({ bufferMinutes: 20 });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('导出/导入', () => {
    it('应该导出为 JSON', () => {
      const json = store.exportToJSON();

      expect(json).toContain('productiveHours');
      expect(JSON.parse(json)).toBeDefined();
    });

    it('应该从 JSON 导入', () => {
      const original = store.getPreferences();
      const json = store.exportToJSON();

      store.updatePreferences({ bufferMinutes: 999 });
      
      const success = store.importFromJSON(json);
      
      expect(success).toBe(true);
      expect(store.getPreferences().bufferMinutes).toBe(original.bufferMinutes);
    });

    it('导入无效 JSON 应该返回 false', () => {
      const success = store.importFromJSON('invalid json');
      
      expect(success).toBe(false);
    });
  });

  describe('重置功能', () => {
    it('应该重置为默认值', () => {
      store.updatePreferences({ bufferMinutes: 99 });
      store.completeOnboarding();

      store.resetToDefaults();

      expect(store.getPreferences().bufferMinutes).toBe(15);
      expect(store.isOnboardingComplete()).toBe(false);
    });
  });
});

describe('便捷函数', () => {
  it('createUserPreferenceStore 应该创建实例', () => {
    const store = createUserPreferenceStore();
    expect(store).toBeInstanceOf(UserPreferenceStore);
  });

  it('getDefaultUserPreferences 应该返回默认值', () => {
    const prefs = getDefaultUserPreferences();
    expect(prefs.bufferMinutes).toBe(15);
    expect(prefs.maxDailyTasks).toBe(8);
  });

  it('getOnboardingQuestions 应该返回问卷', () => {
    const questions = getOnboardingQuestions();
    expect(questions.length).toBeGreaterThan(0);
    expect(questions[0]).toHaveProperty('question');
  });
});

describe('validatePreferences', () => {
  it('应该验证有效偏好', () => {
    const result = validatePreferences({
      bufferMinutes: 15,
      maxDailyTasks: 8,
      chronotype: 'neutral',
      workingHours: { start: 9, end: 17 },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('应该检测无效缓冲时间', () => {
    const result = validatePreferences({
      bufferMinutes: 150, // 超过 120
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('bufferMinutes must be a number between 0 and 120');
  });

  it('应该检测无效工作时段', () => {
    const result = validatePreferences({
      workingHours: { start: 17, end: 9 }, // 开始大于结束
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('workingHours.start must be less than workingHours.end');
  });
});
