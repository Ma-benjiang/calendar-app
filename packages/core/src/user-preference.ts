/**
 * 用户偏好存储模块
 * 实现用户偏好管理、学习、导入导出和订阅机制
 */

// ============== 类型定义 ==============

/** 任务类型 */
export type TaskType = 'deep-work' | 'admin' | 'creative' | 'meeting' | 'routine';

/** 用户作息类型 */
export type Chronotype = 'early-bird' | 'night-owl' | 'neutral';

/** 用户偏好主接口 - 匹配 TECH-SPEC 和测试期望 */
export interface UserPreferences {
  // 基础偏好
  chronotype: Chronotype;
  bufferMinutes: number;
  maxDailyTasks: number;
  
  // 高效时段分数 (0-1)
  productiveHours: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };
  
  // 工作时段
  workingHours: {
    start: number;
    end: number;
  };
  
  // 任务类型偏好
  taskTypePreferences: Record<TaskType, TaskTypePreference>;
  
  // 元数据
  metadata: {
    version: number;
    lastUpdated: string;
    learningIterations: number;
    onboardingComplete: boolean;
  };
}

/** 任务类型偏好 */
export interface TaskTypePreference {
  taskType: TaskType;
  preferredHours: number[];
  avoidedHours: number[];
  confidence: number;
}

/** 引导问卷答案 */
export interface OnboardingAnswers {
  chronotype?: Chronotype;
  focusTime?: 'morning' | 'afternoon' | 'evening';
  bufferTime?: number;
  maxDailyTasks?: number;
}

/** 引导问题 */
export interface OnboardingQuestion {
  id: string;
  question: string;
  type: 'select' | 'number';
  options?: Array<{ value: string; label: string }>;
}

/** 偏好输入 */
export interface PreferenceInput {
  type: 'explicit' | 'feedback' | 'behavior';
  data: Record<string, any>;
}

/** 用户行为数据 */
export interface UserBehavior {
  completedTasks?: Array<{
    taskId: string;
    scheduledHour: number;
    scheduledDayOfWeek: number;
    estimatedMinutes: number;
    actualMinutes: number;
    completedAt: Date;
  }>;
  feedbackRecords?: Array<{
    taskId: string;
    action: 'accepted' | 'rejected' | 'modified';
    originalSlot: { start: Date; end: Date };
    timestamp: Date;
  }>;
}

/** 工作时段评分 */
export interface WorkingHourScore {
  hour: number;
  score: number;
}

/** 周报 */
export interface WeeklyReport {
  productiveHours: number[];
  insights: string[];
  recommendations: string[];
}

/** 验证结果 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** 订阅监听器 */
export type PreferenceListener = (prefs: UserPreferences) => void;

/** 取消订阅函数 */
export type UnsubscribeFn = () => void;

// ============== 常量定义 ==============

/** 引导问题配置 */
export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'chronotype',
    question: '你的作息类型是？',
    type: 'select',
    options: [
      { value: 'early-bird', label: '早起型 (Early Bird)' },
      { value: 'night-owl', label: '夜猫子 (Night Owl)' },
      { value: 'neutral', label: '中性 (Neutral)' },
    ],
  },
  {
    id: 'focusTime',
    question: '你最高效的时段是？',
    type: 'select',
    options: [
      { value: 'morning', label: '早晨 (6-12点)' },
      { value: 'afternoon', label: '下午 (12-18点)' },
      { value: 'evening', label: '晚上 (18-24点)' },
    ],
  },
  {
    id: 'bufferTime',
    question: '任务之间需要多少分钟缓冲？',
    type: 'number',
  },
  {
    id: 'maxDailyTasks',
    question: '每天最多安排多少任务？',
    type: 'number',
  },
];

// ============== UserPreferenceStore 类 ==============

export class UserPreferenceStore {
  private preferences: UserPreferences;
  private listeners: Set<PreferenceListener> = new Set();
  private storageKey: string;

  constructor(options?: { storageKey?: string }) {
    this.storageKey = options?.storageKey || 'user-preferences-v1';
    this.preferences = getDefaultUserPreferences();
    
    // 尝试从存储加载
    this.loadFromStorage();
  }

  // ---------- 基础方法 ----------

  /** 获取当前偏好 */
  getPreferences(): UserPreferences {
    return JSON.parse(JSON.stringify(this.preferences));
  }

  /** 更新偏好 */
  updatePreferences(updates: Partial<UserPreferences>): void {
    this.preferences = {
      ...this.preferences,
      ...updates,
      metadata: {
        ...this.preferences.metadata,
        lastUpdated: new Date().toISOString(),
      },
    };
    this.notifyListeners();
    this.saveToStorage();
  }

  /** 更新特定字段 */
  updateField<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): void {
    this.updatePreferences({ [key]: value } as Partial<UserPreferences>);
  }

  // ---------- 引导相关 ----------

  /** 检查引导是否完成 */
  isOnboardingComplete(): boolean {
    return this.preferences.metadata.onboardingComplete;
  }

  /** 完成引导 */
  completeOnboarding(): void {
    this.preferences.metadata.onboardingComplete = true;
    this.preferences.metadata.lastUpdated = new Date().toISOString();
    this.notifyListeners();
    this.saveToStorage();
  }

  /** 应用问卷答案 */
  applyOnboardingAnswers(answers: OnboardingAnswers): void {
    const updates: Partial<UserPreferences> = {};

    if (answers.chronotype) {
      updates.chronotype = answers.chronotype;
      // 根据作息类型设置高效时段
      updates.productiveHours = this.calculateProductiveHours(answers.chronotype);
    }

    if (answers.bufferTime !== undefined) {
      updates.bufferMinutes = answers.bufferTime;
    }

    if (answers.maxDailyTasks !== undefined) {
      updates.maxDailyTasks = answers.maxDailyTasks;
    }

    if (answers.focusTime) {
      // 根据专注时段调整工作时段
      updates.workingHours = this.calculateWorkingHours(answers.focusTime);
    }

    this.updatePreferences(updates);
    this.completeOnboarding();
  }

  /** 根据作息类型计算高效时段 */
  private calculateProductiveHours(chronotype: Chronotype): UserPreferences['productiveHours'] {
    switch (chronotype) {
      case 'early-bird':
        return {
          morning: 0.9,
          afternoon: 0.7,
          evening: 0.4,
          night: 0.1,
        };
      case 'night-owl':
        return {
          morning: 0.3,
          afternoon: 0.6,
          evening: 0.9,
          night: 0.8,
        };
      default:
        return {
          morning: 0.8,
          afternoon: 0.8,
          evening: 0.6,
          night: 0.2,
        };
    }
  }

  /** 根据专注时段计算工作时段 */
  private calculateWorkingHours(focusTime: string): { start: number; end: number } {
    switch (focusTime) {
      case 'morning':
        return { start: 7, end: 15 };
      case 'afternoon':
        return { start: 11, end: 19 };
      case 'evening':
        return { start: 14, end: 22 };
      default:
        return { start: 9, end: 17 };
    }
  }

  // ---------- 学习相关 ----------

  /** 从显式偏好学习 */
  learnPreference(input: PreferenceInput): void {
    if (input.type === 'explicit' && input.data) {
      this.updatePreferences(input.data);
    }
    
    // 增加学习迭代计数
    this.preferences.metadata.learningIterations++;
    this.preferences.metadata.lastUpdated = new Date().toISOString();
    this.notifyListeners();
    this.saveToStorage();
  }

  /** 从用户行为学习 */
  learnFromBehavior(behavior: UserBehavior): void {
    if (behavior.completedTasks && behavior.completedTasks.length > 0) {
      this.updateFromCompletedTasks(behavior.completedTasks);
    }

    if (behavior.feedbackRecords && behavior.feedbackRecords.length > 0) {
      this.updateFromFeedback(behavior.feedbackRecords);
    }

    // 增加学习迭代计数
    this.preferences.metadata.learningIterations++;
    this.preferences.metadata.lastUpdated = new Date().toISOString();
    this.notifyListeners();
    this.saveToStorage();
  }

  /** 从完成任务更新 */
  private updateFromCompletedTasks(tasks: UserBehavior['completedTasks']): void {
    if (!tasks) return;

    const hourlyStats = new Array(24).fill(0);
    
    for (const task of tasks) {
      if (task.scheduledHour >= 0 && task.scheduledHour < 24) {
        // 如果实际用时少于预估，说明效率高
        const efficiency = task.estimatedMinutes / Math.max(task.actualMinutes, 1);
        hourlyStats[task.scheduledHour] += efficiency;
      }
    }

    // 归一化并更新productiveHours
    const maxStat = Math.max(...hourlyStats, 1);
    const productiveHours = { ...this.preferences.productiveHours };

    // 计算各时段平均效率
    const periods = ['morning', 'afternoon', 'evening', 'night'] as const;
    const ranges = [
      [6, 7, 8, 9, 10, 11],    // morning
      [12, 13, 14, 15, 16, 17], // afternoon
      [18, 19, 20, 21],         // evening
      [22, 23, 0, 1, 2, 3, 4, 5], // night
    ];

    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      const hours = ranges[i];
      const avgScore = hours.reduce((sum, h) => sum + (hourlyStats[h] || 0), 0) / hours.length / maxStat;
      
      // 混合原有分数和新学习的分数
      productiveHours[period] = productiveHours[period] * 0.7 + avgScore * 0.3;
    }

    this.preferences.productiveHours = productiveHours;
  }

  /** 从反馈更新 */
  private updateFromFeedback(records: NonNullable<UserBehavior['feedbackRecords']>): void {
    for (const record of records) {
      const hour = record.originalSlot.start.getHours();
      
      if (record.action === 'accepted') {
        // 接受的时段提高效率分数
        this.updateProductivityScore(hour, 0.1);
      } else if (record.action === 'rejected') {
        // 拒绝的时段降低效率分数
        this.updateProductivityScore(hour, -0.1);
      }
    }
  }

  /** 更新特定小时的效率分数 */
  private updateProductivityScore(hour: number, delta: number): void {
    const period = this.getPeriodForHour(hour);
    const currentScore = this.preferences.productiveHours[period];
    this.preferences.productiveHours[period] = Math.max(0, Math.min(1, currentScore + delta));
  }

  /** 获取小时对应的时段 */
  private getPeriodForHour(hour: number): keyof UserPreferences['productiveHours'] {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  // ---------- 查询方法 ----------

  /** 获取特定小时的效率分数 */
  getProductivityScore(hour: number): number {
    const period = this.getPeriodForHour(hour);
    return this.preferences.productiveHours[period];
  }

  /** 获取任务类型偏好 */
  getTaskTypePreference(type: TaskType): TaskTypePreference | null {
    return this.preferences.taskTypePreferences[type] || null;
  }

  /** 获取最佳工作时段 */
  getBestWorkingHours(): WorkingHourScore[] {
    const scores: WorkingHourScore[] = [];
    
    for (let hour = 0; hour < 24; hour++) {
      const period = this.getPeriodForHour(hour);
      const baseScore = this.preferences.productiveHours[period];
      
      // 根据工作时段调整分数
      const inWorkingHours = hour >= this.preferences.workingHours.start && 
                            hour < this.preferences.workingHours.end;
      const finalScore = inWorkingHours ? baseScore : baseScore * 0.5;
      
      scores.push({ hour, score: Math.round(finalScore * 100) / 100 });
    }
    
    // 按分数排序
    return scores.sort((a, b) => b.score - a.score);
  }

  /** 获取学习进度 (0-100) */
  getLearningProgress(): number {
    const iterations = this.preferences.metadata.learningIterations;
    // 假设100次迭代为完全学习
    return Math.min(100, Math.round((iterations / 100) * 100));
  }

  // ---------- 周报生成 ----------

  /** 生成周报 */
  generateWeeklyReport(): WeeklyReport {
    const productiveHours = this.getBestWorkingHours()
      .filter(h => h.score > 0.7)
      .map(h => h.hour);

    const insights: string[] = [];
    const recommendations: string[] = [];

    // 生成洞察
    if (this.preferences.chronotype === 'early-bird') {
      insights.push('你是早起型用户，早晨效率最高');
      recommendations.push('建议将重要任务安排在上午');
    } else if (this.preferences.chronotype === 'night-owl') {
      insights.push('你是夜猫子型用户，晚上效率更高');
      recommendations.push('建议将深度工作安排在晚上');
    }

    // 基于缓冲时间建议
    if (this.preferences.bufferMinutes < 10) {
      recommendations.push('建议增加任务间隔，给自己更多缓冲时间');
    }

    return {
      productiveHours,
      insights,
      recommendations,
    };
  }

  // ---------- 订阅机制 ----------

  /** 订阅偏好变更 */
  subscribe(listener: PreferenceListener): UnsubscribeFn {
    this.listeners.add(listener);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** 通知所有监听器 */
  private notifyListeners(): void {
    const prefs = this.getPreferences();
    for (const listener of this.listeners) {
      try {
        listener(prefs);
      } catch (error) {
        console.error('Preference listener error:', error);
      }
    }
  }

  // ---------- 导入导出 ----------

  /** 导出为 JSON */
  exportToJSON(): string {
    return JSON.stringify(this.preferences, null, 2);
  }

  /** 从 JSON 导入 */
  importFromJSON(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      
      // 验证基本结构
      if (!parsed.metadata || !parsed.productiveHours) {
        return false;
      }

      this.preferences = parsed;
      this.preferences.metadata.lastUpdated = new Date().toISOString();
      this.notifyListeners();
      this.saveToStorage();
      return true;
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return false;
    }
  }

  // ---------- 存储管理 ----------

  /** 保存到存储 */
  private saveToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(this.preferences));
      }
    } catch (error) {
      // 存储失败静默处理
    }
  }

  /** 从存储加载 */
  private loadFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.preferences = { ...this.preferences, ...parsed };
        }
      }
    } catch (error) {
      // 加载失败使用默认值
    }
  }

  // ---------- 重置 ----------

  /** 重置为默认值 */
  resetToDefaults(): void {
    this.preferences = getDefaultUserPreferences();
    this.notifyListeners();
    this.saveToStorage();
  }
}

// ============== 便捷函数 ==============

/** 创建 UserPreferenceStore 实例 */
export function createUserPreferenceStore(options?: { storageKey?: string }): UserPreferenceStore {
  return new UserPreferenceStore(options);
}

/** 获取默认用户偏好 */
export function getDefaultUserPreferences(): UserPreferences {
  return {
    chronotype: 'neutral',
    bufferMinutes: 15,
    maxDailyTasks: 8,
    productiveHours: {
      morning: 0.8,
      afternoon: 0.8,
      evening: 0.6,
      night: 0.2,
    },
    workingHours: {
      start: 9,
      end: 17,
    },
    taskTypePreferences: {
      'deep-work': {
        taskType: 'deep-work',
        preferredHours: [9, 10, 11, 14, 15, 16],
        avoidedHours: [0, 1, 2, 3, 4, 5, 6, 7, 8, 22, 23],
        confidence: 0.5,
      },
      'admin': {
        taskType: 'admin',
        preferredHours: [10, 11, 14, 15, 16],
        avoidedHours: [0, 1, 2, 3, 4, 5, 6, 7, 8],
        confidence: 0.5,
      },
      'creative': {
        taskType: 'creative',
        preferredHours: [9, 10, 11, 15, 16, 17, 20, 21],
        avoidedHours: [0, 1, 2, 3, 4, 5, 6, 7, 8],
        confidence: 0.5,
      },
      'meeting': {
        taskType: 'meeting',
        preferredHours: [9, 10, 11, 14, 15, 16, 17],
        avoidedHours: [0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 13, 18, 19, 20, 21, 22, 23],
        confidence: 0.5,
      },
      'routine': {
        taskType: 'routine',
        preferredHours: [9, 10, 11, 14, 15, 16, 20, 21],
        avoidedHours: [0, 1, 2, 3, 4, 5, 6, 7, 8],
        confidence: 0.5,
      },
    },
    metadata: {
      version: 1,
      lastUpdated: new Date().toISOString(),
      learningIterations: 0,
      onboardingComplete: false,
    },
  };
}

/** 获取引导问题 */
export function getOnboardingQuestions(): OnboardingQuestion[] {
  return ONBOARDING_QUESTIONS;
}

/** 验证偏好 */
export function validatePreferences(prefs: any): ValidationResult {
  const errors: string[] = [];

  // 验证 bufferMinutes
  if (prefs.bufferMinutes !== undefined) {
    if (typeof prefs.bufferMinutes !== 'number' || prefs.bufferMinutes < 0 || prefs.bufferMinutes > 120) {
      errors.push('bufferMinutes must be a number between 0 and 120');
    }
  }

  // 验证 maxDailyTasks
  if (prefs.maxDailyTasks !== undefined) {
    if (typeof prefs.maxDailyTasks !== 'number' || prefs.maxDailyTasks < 1 || prefs.maxDailyTasks > 50) {
      errors.push('maxDailyTasks must be a number between 1 and 50');
    }
  }

  // 验证 workingHours
  if (prefs.workingHours) {
    if (typeof prefs.workingHours.start !== 'number' || prefs.workingHours.start < 0 || prefs.workingHours.start > 23) {
      errors.push('workingHours.start must be between 0 and 23');
    }
    if (typeof prefs.workingHours.end !== 'number' || prefs.workingHours.end < 1 || prefs.workingHours.end > 24) {
      errors.push('workingHours.end must be between 1 and 24');
    }
    if (prefs.workingHours.start >= prefs.workingHours.end) {
      errors.push('workingHours.start must be less than workingHours.end');
    }
  }

  // 验证 chronotype
  if (prefs.chronotype !== undefined) {
    const validChronotypes: Chronotype[] = ['early-bird', 'night-owl', 'neutral'];
    if (!validChronotypes.includes(prefs.chronotype)) {
      errors.push('chronotype must be one of: early-bird, night-owl, neutral');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============== 向后兼容导出 ==============

// 保留旧的 PreferenceLearner 作为别名（可选）
export { UserPreferenceStore as PreferenceLearner };
