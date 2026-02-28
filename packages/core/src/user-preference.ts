/**
 * 用户偏好学习模块
 * 实现用户高效时段学习和任务偏好推荐
 */
import { Task, TaskPriority } from './task';

// ============== 类型定义 ==============

/** 任务类型 */
export type TaskType = 'deep-work' | 'admin' | 'creative' | 'meeting' | 'routine';

/** 时间段等级 */
export type ProductivityLevel = 'high' | 'medium' | 'low';

/** 高效时段定义 */
export interface ProductiveHour {
  start: number;  // 小时 (0-23)
  end: number;    // 小时 (0-23)
  level: ProductivityLevel;
}

/** 时间偏好 */
export interface TimePreference {
  preferredHours: number[];  // 偏好小时列表 [0-23]
  avoidedHours: number[];    // 避免小时列表 [0-23]
  confidence: number;        // 置信度 (0-1)
}

/** 学习数据 */
export interface LearningData {
  // 冷启动阶段
  coldStartComplete: boolean;
  surveyCompletedAt?: Date;
  
  // 学习进度
  totalTasksAnalyzed: number;
  totalFeedbackReceived: number;
  learningDays: number;
  firstTaskDate?: Date;
  lastLearningDate?: Date;
  
  // 统计信息
  hourlyCompletionRate: number[];  // 24小时完成率
  dailyTaskCount: number[];        // 每天任务数统计
  feedbackHistory: FeedbackRecord[];
}

/** 反馈记录 */
export interface FeedbackRecord {
  timestamp: Date;
  taskType: TaskType;
  scheduledHour: number;
  actualHour: number;
  feedback: 'good' | 'bad';
  reason?: string;
}

/** 推荐时段 */
export interface TimeSlot {
  start: Date;
  end: Date;
  confidence: number;
  reason: string;
}

/** 用户偏好主接口 */
export interface UserPreference {
  // 高效时段 (24小时制)
  productiveHours: ProductiveHour[];
  
  // 各任务类型的时间偏好
  taskTypePreferences: Record<TaskType, TimePreference>;
  
  // 工作时段偏好
  sessionLength: {
    min: number;  // 最短专注时长 (分钟)
    max: number;  // 最长专注时长 (分钟)
  };
  
  // 休息时长偏好
  breakDuration: number;  // 分钟
  
  // 学习进度数据
  learningProgress: LearningData;
  
  // 元数据
  version: number;
  updatedAt: Date;
}

/** 问卷答案 */
export interface SurveyAnswers {
  // 1. 作息类型
  chronotype: 'early-bird' | 'night-owl' | 'neutral';
  
  // 2. 典型起床时间
  typicalWakeTime: number;  // 小时 (0-23)
  
  // 3. 专注时长
  focusDuration: 'short' | 'medium' | 'long';  // <45min, 45-90min, >90min
  
  // 4. 休息频率
  breakFrequency: 'often' | 'normal' | 'rare';  // 每30min, 每60min, 每90min+
  
  // 5. 深度工作偏好
  deepWorkPreference: 'morning' | 'afternoon' | 'evening';
}

/** 冷启动配置 */
interface ColdStartConfig {
  // 默认高效时段 (基于问卷类型)
  defaultProductiveHours: Record<string, ProductiveHour[]>;
  
  // 默认专注时长
  defaultSessionLength: Record<string, { min: number; max: number }>;
  
  // 默认休息时长
  defaultBreakDuration: Record<string, number>;
}

// ============== 冷启动配置 ==============

const COLD_START_CONFIG: ColdStartConfig = {
  defaultProductiveHours: {
    'early-bird': [
      { start: 6, end: 9, level: 'high' },
      { start: 9, end: 12, level: 'medium' },
      { start: 14, end: 17, level: 'medium' },
      { start: 20, end: 22, level: 'low' },
    ],
    'night-owl': [
      { start: 10, end: 12, level: 'medium' },
      { start: 14, end: 17, level: 'medium' },
      { start: 20, end: 23, level: 'high' },
      { start: 23, end: 2, level: 'high' },
    ],
    'neutral': [
      { start: 9, end: 12, level: 'high' },
      { start: 14, end: 17, level: 'medium' },
      { start: 19, end: 21, level: 'medium' },
    ],
  },
  defaultSessionLength: {
    'short': { min: 25, max: 45 },
    'medium': { min: 45, max: 90 },
    'long': { min: 60, max: 120 },
  },
  defaultBreakDuration: {
    'often': 5,
    'normal': 10,
    'rare': 15,
  },
};

// ============== 偏好学习器 ==============

export class PreferenceLearner {
  private preference: UserPreference;
  private storageKey: string;
  private onPreferenceChange?: (pref: UserPreference) => void;

  constructor(options?: { 
    storageKey?: string;
    onPreferenceChange?: (pref: UserPreference) => void;
  }) {
    this.storageKey = options?.storageKey || 'user-preference-v1';
    this.onPreferenceChange = options?.onPreferenceChange;
    
    // 初始化空偏好结构
    this.preference = this.createEmptyPreference();
  }

  // ---------- 1. 冷启动问卷初始化 ----------

  /**
   * 从问卷答案初始化偏好 (冷启动)
   * 5问题快速初始化:
   * 1. 早起型/夜猫子/中立
   * 2. 典型起床时间
   * 3. 专注时长
   * 4. 休息频率
   * 5. 深度工作偏好时段
   */
  initializeFromSurvey(answers: SurveyAnswers): UserPreference {
    const now = new Date();
    
    // 基于作息类型设置高效时段
    const productiveHours = COLD_START_CONFIG.defaultProductiveHours[answers.chronotype] || 
      COLD_START_CONFIG.defaultProductiveHours['neutral'];

    // 基于专注时长偏好设置
    const sessionLength = COLD_START_CONFIG.defaultSessionLength[answers.focusDuration] ||
      COLD_START_CONFIG.defaultSessionLength['medium'];

    // 基于休息频率设置
    const breakDuration = COLD_START_CONFIG.defaultBreakDuration[answers.breakFrequency] ||
      COLD_START_CONFIG.defaultBreakDuration['normal'];

    // 构建任务类型偏好
    const taskTypePreferences = this.initializeTaskTypePreferences(answers);

    this.preference = {
      productiveHours,
      taskTypePreferences,
      sessionLength,
      breakDuration,
      learningProgress: {
        coldStartComplete: true,
        surveyCompletedAt: now,
        totalTasksAnalyzed: 0,
        totalFeedbackReceived: 0,
        learningDays: 0,
        hourlyCompletionRate: new Array(24).fill(0),
        dailyTaskCount: new Array(7).fill(0),
        feedbackHistory: [],
      },
      version: 1,
      updatedAt: now,
    };

    this.notifyChange();
    return this.preference;
  }

  /**
   * 初始化任务类型偏好
   */
  private initializeTaskTypePreferences(answers: SurveyAnswers): Record<TaskType, TimePreference> {
    const taskTypes: TaskType[] = ['deep-work', 'admin', 'creative', 'meeting', 'routine'];
    const preferences: Partial<Record<TaskType, TimePreference>> = {};

    for (const type of taskTypes) {
      const preferredHours = this.getDefaultPreferredHoursForType(type, answers);
      
      preferences[type] = {
        preferredHours,
        avoidedHours: this.calculateAvoidedHours(preferredHours),
        confidence: 0.3,  // 冷启动初始置信度较低
      };
    }

    return preferences as Record<TaskType, TimePreference>;
  }

  /**
   * 获取任务类型的默认偏好时段
   */
  private getDefaultPreferredHoursForType(type: TaskType, answers: SurveyAnswers): number[] {
    const hours: number[] = [];
    
    switch (type) {
      case 'deep-work':
        // 深度工作偏好用户指定的高效时段
        if (answers.deepWorkPreference === 'morning') {
          hours.push(8, 9, 10, 11);
        } else if (answers.deepWorkPreference === 'afternoon') {
          hours.push(14, 15, 16, 17);
        } else {
          hours.push(20, 21, 22);
        }
        break;
        
      case 'admin':
        // 行政事务适合中等效率时段
        hours.push(10, 11, 14, 15, 16);
        break;
        
      case 'creative':
        // 创意工作偏好用户指定的时段
        if (answers.deepWorkPreference === 'morning') {
          hours.push(9, 10, 11);
        } else if (answers.deepWorkPreference === 'afternoon') {
          hours.push(15, 16, 17);
        } else {
          hours.push(20, 21, 22, 23);
        }
        break;
        
      case 'meeting':
        // 会议适合标准工作时间
        hours.push(9, 10, 11, 14, 15, 16, 17);
        break;
        
      case 'routine':
        // 常规任务适合碎片时间
        hours.push(9, 10, 11, 14, 15, 16, 20, 21);
        break;
    }
    
    return hours;
  }

  /**
   * 计算应避免的小时
   */
  private calculateAvoidedHours(preferredHours: number[]): number[] {
    const avoided: number[] = [];
    for (let i = 0; i < 24; i++) {
      if (!preferredHours.includes(i)) {
        // 避免深夜和凌晨
        if (i < 6 || i > 23) {
          avoided.push(i);
        }
      }
    }
    return avoided;
  }

  // ---------- 2. 从任务历史学习 ----------

  /**
   * 从已完成任务历史学习偏好
   * 分析任务完成时间、时长等模式
   */
  learnFromHistory(completedTasks: Task[]): UserPreference {
    if (completedTasks.length === 0) {
      return this.preference;
    }

    const now = new Date();
    const learningData = this.preference.learningProgress;
    
    // 更新首次任务日期
    if (!learningData.firstTaskDate) {
      learningData.firstTaskDate = completedTasks[0].createdAt;
    }
    
    // 分析每小时完成率
    this.analyzeHourlyCompletionRate(completedTasks);
    
    // 分析各类型任务的时间偏好
    this.analyzeTaskTypePatterns(completedTasks);
    
    // 分析专注时长模式
    this.analyzeSessionLengthPatterns(completedTasks);
    
    // 更新学习进度
    learningData.totalTasksAnalyzed += completedTasks.length;
    learningData.lastLearningDate = now;
    
    // 计算学习天数
    if (learningData.firstTaskDate) {
      const daysDiff = Math.floor(
        (now.getTime() - learningData.firstTaskDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      learningData.learningDays = daysDiff;
    }
    
    // 更新高效时段 (基于学习数据)
    this.updateProductiveHoursFromLearning();
    
    // 更新任务类型偏好置信度
    this.updateTaskTypeConfidences();

    this.preference.updatedAt = now;
    this.notifyChange();
    
    return this.preference;
  }

  /**
   * 分析每小时完成率
   */
  private analyzeHourlyCompletionRate(tasks: Task[]): void {
    const hourlyCounts = new Array(24).fill(0);
    
    for (const task of tasks) {
      if (task.completedAt) {
        const hour = task.completedAt.getHours();
        hourlyCounts[hour]++;
      }
    }
    
    // 归一化并平滑处理
    const maxCount = Math.max(...hourlyCounts, 1);
    this.preference.learningProgress.hourlyCompletionRate = hourlyCounts.map(
      count => count / maxCount
    );
  }

  /**
   * 分析各类型任务的时间模式
   */
  private analyzeTaskTypePatterns(tasks: Task[]): void {
    const typeHourlyData: Partial<Record<TaskType, number[]>> = {};
    const taskTypes: TaskType[] = ['deep-work', 'admin', 'creative', 'meeting', 'routine'];
    
    // 初始化数据结构
    for (const type of taskTypes) {
      typeHourlyData[type] = new Array(24).fill(0);
    }
    
    // 统计各类型任务的完成时间
    for (const task of tasks) {
      if (task.completedAt) {
        const type = this.inferTaskType(task);
        const hour = task.completedAt.getHours();
        const hourlyData = typeHourlyData[type];
        if (hourlyData) {
          hourlyData[hour]++;
        }
      }
    }
    
    // 更新各类型的时间偏好
    for (const type of taskTypes) {
      const hourlyData = typeHourlyData[type] || new Array(24).fill(0);
      const maxCount = Math.max(...hourlyData, 1);
      
      // 找出高效时段 (完成率 > 0.5)
      const preferredHours: number[] = [];
      const avoidedHours: number[] = [];
      
      for (let i = 0; i < 24; i++) {
        const rate = hourlyData[i] / maxCount;
        if (rate > 0.5) {
          preferredHours.push(i);
        } else if (rate === 0 && (i < 6 || i > 23)) {
          avoidedHours.push(i);
        }
      }
      
      // 合并学习结果与现有偏好
      const existingPref = this.preference.taskTypePreferences[type];
      this.preference.taskTypePreferences[type] = {
        preferredHours: preferredHours.length > 0 
          ? [...new Set([...existingPref.preferredHours, ...preferredHours])].sort((a, b) => a - b)
          : existingPref.preferredHours,
        avoidedHours: [...new Set([...existingPref.avoidedHours, ...avoidedHours])].sort((a, b) => a - b),
        confidence: Math.min(existingPref.confidence + 0.1, 0.9),  // 每次学习增加置信度
      };
    }
  }

  /**
   * 推断任务类型 (基于任务属性)
   */
  private inferTaskType(task: Task): TaskType {
    const title = task.title.toLowerCase();
    const tags = task.tags.map(t => t.toLowerCase());
    const description = task.description?.toLowerCase() || '';
    
    // 基于关键词推断类型
    if (tags.includes('meeting') || tags.includes('会议') || 
        title.includes('meeting') || title.includes('会议')) {
      return 'meeting';
    }
    
    if (tags.includes('deep') || tags.includes('focus') || tags.includes('专注') ||
        title.includes('review') || title.includes('design') || 
        title.includes('规划') || title.includes('设计')) {
      return 'deep-work';
    }
    
    if (tags.includes('creative') || tags.includes('创意') ||
        title.includes('brainstorm') || title.includes('write') ||
        title.includes('brainstorm') || title.includes('创作')) {
      return 'creative';
    }
    
    if (tags.includes('admin') || tags.includes('行政') ||
        title.includes('report') || title.includes('email') ||
        title.includes('报告') || title.includes('邮件')) {
      return 'admin';
    }
    
    // 默认常规任务
    return 'routine';
  }

  /**
   * 分析专注时长模式
   */
  private analyzeSessionLengthPatterns(tasks: Task[]): void {
    const durations: number[] = [];
    
    for (const task of tasks) {
      if (task.scheduledStart && task.scheduledEnd) {
        const duration = (task.scheduledEnd.getTime() - task.scheduledStart.getTime()) / (1000 * 60);
        if (duration > 0 && duration < 480) {  // 过滤异常值 (>8小时)
          durations.push(duration);
        }
      } else if (task.estimatedMinutes) {
        durations.push(task.estimatedMinutes);
      }
    }
    
    if (durations.length === 0) return;
    
    // 计算统计值
    durations.sort((a, b) => a - b);
    const median = durations[Math.floor(durations.length / 2)];
    const p25 = durations[Math.floor(durations.length * 0.25)];
    const p75 = durations[Math.floor(durations.length * 0.75)];
    
    // 更新专注时长偏好
    this.preference.sessionLength = {
      min: Math.max(15, Math.round(p25 / 5) * 5),  // 取25分位，对齐到5分钟
      max: Math.min(240, Math.round(p75 / 5) * 5), // 取75分位，最大4小时
    };
  }

  /**
   * 基于学习数据更新高效时段
   */
  private updateProductiveHoursFromLearning(): void {
    const hourlyRates = this.preference.learningProgress.hourlyCompletionRate;
    
    // 找出高效时段 (完成率 > 0.6)
    const productiveHours: ProductiveHour[] = [];
    let currentStart = -1;
    let currentLevel: ProductivityLevel = 'medium';
    
    for (let i = 0; i < 24; i++) {
      const rate = hourlyRates[i];
      let level: ProductivityLevel | null = null;
      
      if (rate > 0.7) level = 'high';
      else if (rate > 0.4) level = 'medium';
      else if (rate > 0.1) level = 'low';
      
      if (level !== null) {
        if (currentStart === -1) {
          currentStart = i;
          currentLevel = level;
        } else if (currentLevel !== level) {
          // 保存上一个时段
          productiveHours.push({
            start: currentStart,
            end: i,
            level: currentLevel,
          });
          currentStart = i;
          currentLevel = level;
        }
      } else if (currentStart !== -1) {
        // 时段结束
        productiveHours.push({
          start: currentStart,
          end: i,
          level: currentLevel,
        });
        currentStart = -1;
      }
    }
    
    // 处理最后一个时段
    if (currentStart !== -1) {
      productiveHours.push({
        start: currentStart,
        end: 24,
        level: currentLevel,
      });
    }
    
    if (productiveHours.length > 0) {
      this.preference.productiveHours = productiveHours;
    }
  }

  /**
   * 更新任务类型置信度
   */
  private updateTaskTypeConfidences(): void {
    const learningData = this.preference.learningProgress;
    
    // 基于数据量调整置信度
    const dataPoints = learningData.totalTasksAnalyzed + learningData.totalFeedbackReceived;
    
    for (const type of Object.keys(this.preference.taskTypePreferences) as TaskType[]) {
      const pref = this.preference.taskTypePreferences[type];
      
      // 置信度随数据量增加而提高
      let targetConfidence = 0.3;
      if (dataPoints > 100) targetConfidence = 0.9;
      else if (dataPoints > 50) targetConfidence = 0.8;
      else if (dataPoints > 20) targetConfidence = 0.7;
      else if (dataPoints > 10) targetConfidence = 0.5;
      
      pref.confidence = Math.min(pref.confidence + 0.05, targetConfidence);
    }
  }

  // ---------- 3. 实时调整 (用户反馈) ----------

  /**
   * 根据用户反馈实时更新偏好
   * @param taskType 任务类型
   * @param actualTime 实际执行时间
   * @param feedback 用户反馈 'good' | 'bad'
   */
  updatePreference(
    taskType: TaskType, 
    actualTime: Date, 
    feedback: 'good' | 'bad',
    reason?: string
  ): void {
    const hour = actualTime.getHours();
    const learningData = this.preference.learningProgress;
    
    // 记录反馈历史
    const record: FeedbackRecord = {
      timestamp: new Date(),
      taskType,
      scheduledHour: hour,
      actualHour: hour,
      feedback,
      reason,
    };
    learningData.feedbackHistory.push(record);
    learningData.totalFeedbackReceived++;
    
    // 获取该类型偏好
    const typePref = this.preference.taskTypePreferences[taskType];
    
    if (feedback === 'good') {
      // 正面反馈：强化该时段
      if (!typePref.preferredHours.includes(hour)) {
        typePref.preferredHours.push(hour);
        typePref.preferredHours.sort((a, b) => a - b);
      }
      
      // 从避免时段中移除
      typePref.avoidedHours = typePref.avoidedHours.filter(h => h !== hour);
      
      // 提高置信度
      typePref.confidence = Math.min(typePref.confidence + 0.05, 1.0);
      
    } else {
      // 负面反馈：避免该时段
      if (!typePref.avoidedHours.includes(hour)) {
        typePref.avoidedHours.push(hour);
        typePref.avoidedHours.sort((a, b) => a - b);
      }
      
      // 从偏好时段中移除
      typePref.preferredHours = typePref.preferredHours.filter(h => h !== hour);
      
      // 降低该时段权重但不降低太多置信度（可能是特定情况）
      typePref.confidence = Math.max(typePref.confidence - 0.02, 0.1);
    }
    
    // 更新全局高效时段
    this.updateGlobalProductiveHours(taskType, hour, feedback);
    
    this.preference.updatedAt = new Date();
    this.notifyChange();
  }

  /**
   * 更新全局高效时段
   */
  private updateGlobalProductiveHours(
    taskType: TaskType, 
    hour: number, 
    feedback: 'good' | 'bad'
  ): void {
    // 只考虑深度工作和创意工作（更能反映个人高效时段）
    if (taskType !== 'deep-work' && taskType !== 'creative') return;
    
    // 找到包含该小时的时段
    const hourSlot = this.preference.productiveHours.find(
      slot => hour >= slot.start && hour < slot.end
    );
    
    if (feedback === 'bad' && hourSlot && hourSlot.level === 'high') {
      // 负面反馈可能意味着需要调整该时段等级
      // 如果该时段收到多次负面反馈，降低等级
      const recentBadFeedback = this.preference.learningProgress.feedbackHistory
        .filter(r => 
          r.feedback === 'bad' && 
          r.taskType === taskType &&
          r.actualHour >= hourSlot.start &&
          r.actualHour < hourSlot.end
        )
        .length;
      
      if (recentBadFeedback >= 3) {
        hourSlot.level = 'medium';
      }
    }
  }

  // ---------- 4. 获取推荐时段 ----------

  /**
   * 获取任务类型的推荐时段
   * @param taskType 任务类型
   * @param date 目标日期
   * @param durationMinutes 任务预计时长 (可选)
   * @returns 推荐时段列表
   */
  getRecommendedSlots(
    taskType: TaskType, 
    date: Date, 
    durationMinutes?: number
  ): TimeSlot[] {
    const typePref = this.preference.taskTypePreferences[taskType];
    const slots: TimeSlot[] = [];
    const duration = durationMinutes || this.preference.sessionLength.max;
    
    // 基于偏好时段生成推荐
    for (const hour of typePref.preferredHours) {
      const start = new Date(date);
      start.setHours(hour, 0, 0, 0);
      
      const end = new Date(start);
      end.setMinutes(start.getMinutes() + duration);
      
      // 计算置信度
      const confidence = this.calculateSlotConfidence(taskType, hour, typePref.confidence);
      
      // 生成推荐理由
      const reason = this.generateSlotReason(taskType, hour, confidence);
      
      slots.push({
        start,
        end,
        confidence,
        reason,
      });
    }
    
    // 按置信度排序
    slots.sort((a, b) => b.confidence - a.confidence);
    
    // 限制返回数量 (最多5个)
    return slots.slice(0, 5);
  }

  /**
   * 计算时段置信度
   */
  private calculateSlotConfidence(
    taskType: TaskType, 
    hour: number, 
    baseConfidence: number
  ): number {
    let confidence = baseConfidence;
    
    // 检查是否在全局高效时段
    const globalSlot = this.preference.productiveHours.find(
      slot => hour >= slot.start && hour < slot.end
    );
    
    if (globalSlot) {
      switch (globalSlot.level) {
        case 'high': confidence += 0.2; break;
        case 'medium': confidence += 0.1; break;
        case 'low': confidence -= 0.1; break;
      }
    }
    
    // 检查历史完成率
    const completionRate = this.preference.learningProgress.hourlyCompletionRate[hour];
    confidence += completionRate * 0.1;
    
    // 检查历史反馈
    const hourFeedback = this.preference.learningProgress.feedbackHistory.filter(
      r => r.taskType === taskType && r.scheduledHour === hour
    );
    
    if (hourFeedback.length > 0) {
      const goodCount = hourFeedback.filter(r => r.feedback === 'good').length;
      const feedbackRatio = goodCount / hourFeedback.length;
      confidence += feedbackRatio * 0.1 - 0.05;
    }
    
    // 归一化到 0-1
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * 生成推荐理由
   */
  private generateSlotReason(taskType: TaskType, hour: number, confidence: number): string {
    const reasons: string[] = [];
    
    // 基于置信度
    if (confidence > 0.8) {
      reasons.push('这是你处理此类任务的高效时段');
    } else if (confidence > 0.6) {
      reasons.push('根据你的历史数据，这个时段比较适合');
    } else {
      reasons.push('基于你的偏好设置推荐');
    }
    
    // 基于任务类型
    const timeOfDay = hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上';
    const typeLabels: Record<TaskType, string> = {
      'deep-work': '深度工作',
      'admin': '行政事务',
      'creative': '创意工作',
      'meeting': '会议',
      'routine': '常规任务',
    };
    
    if (confidence > 0.7) {
      reasons.push(`你在${timeOfDay}完成${typeLabels[taskType]}的效率较高`);
    }
    
    return reasons.join('；');
  }

  // ---------- 5. 保存/加载偏好 ----------

  /**
   * 保存偏好到存储
   */
  async savePreference(): Promise<void> {
    const data = JSON.stringify(this.preference, (key, value) => {
      // 处理 Date 对象
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
      }
      return value;
    });
    
    // 使用 localStorage 或提供的存储接口
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, data);
    } else {
      // 服务器环境或测试环境
      this.memoryStorage = data;
    }
  }

  private memoryStorage?: string;

  /**
   * 从存储加载偏好
   */
  async loadPreference(): Promise<UserPreference> {
    let data: string | null = null;
    
    if (typeof localStorage !== 'undefined') {
      data = localStorage.getItem(this.storageKey);
    } else {
      data = this.memoryStorage || null;
    }
    
    if (data) {
      const parsed = JSON.parse(data, (key, value) => {
        // 还原 Date 对象
        if (value && value.__type === 'Date') {
          return new Date(value.value);
        }
        return value;
      });
      
      this.preference = parsed;
      return this.preference;
    }
    
    // 返回空偏好
    return this.preference;
  }

  // ---------- 辅助方法 ----------

  /**
   * 创建空偏好结构
   */
  private createEmptyPreference(): UserPreference {
    const now = new Date();
    const taskTypes: TaskType[] = ['deep-work', 'admin', 'creative', 'meeting', 'routine'];
    
    return {
      productiveHours: [],
      taskTypePreferences: taskTypes.reduce((acc, type) => {
        acc[type] = {
          preferredHours: [],
          avoidedHours: [],
          confidence: 0,
        };
        return acc;
      }, {} as Record<TaskType, TimePreference>),
      sessionLength: { min: 25, max: 60 },
      breakDuration: 10,
      learningProgress: {
        coldStartComplete: false,
        totalTasksAnalyzed: 0,
        totalFeedbackReceived: 0,
        learningDays: 0,
        hourlyCompletionRate: new Array(24).fill(0),
        dailyTaskCount: new Array(7).fill(0),
        feedbackHistory: [],
      },
      version: 1,
      updatedAt: now,
    };
  }

  /**
   * 获取当前偏好
   */
  getPreference(): UserPreference {
    return { ...this.preference };
  }

  /**
   * 通知偏好变更
   */
  private notifyChange(): void {
    this.onPreferenceChange?.(this.getPreference());
  }

  // ---------- 冷启动策略辅助方法 ----------

  /**
   * 检查是否处于冷启动阶段
   */
  isInColdStart(): boolean {
    return !this.preference.learningProgress.coldStartComplete;
  }

  /**
   * 获取学习阶段
   * @returns 'cold-start' | 'fine-tuning' | 'full-learning'
   */
  getLearningPhase(): 'cold-start' | 'fine-tuning' | 'full-learning' {
    const progress = this.preference.learningProgress;
    
    if (!progress.coldStartComplete) {
      return 'cold-start';
    }
    
    if (progress.learningDays < 7) {
      return 'fine-tuning';
    }
    
    return 'full-learning';
  }

  /**
   * 获取学习统计
   */
  getLearningStats(): {
    phase: string;
    daysOfData: number;
    tasksAnalyzed: number;
    feedbackCount: number;
    averageConfidence: number;
  } {
    const progress = this.preference.learningProgress;
    const confidences = Object.values(this.preference.taskTypePreferences)
      .map(p => p.confidence);
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    
    return {
      phase: this.getLearningPhase(),
      daysOfData: progress.learningDays,
      tasksAnalyzed: progress.totalTasksAnalyzed,
      feedbackCount: progress.totalFeedbackReceived,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
    };
  }

  /**
   * 重置学习数据 (用户可主动重置)
   */
  resetLearning(): void {
    this.preference = this.createEmptyPreference();
    this.notifyChange();
  }
}

// ============== 快捷函数 ==============

/**
 * 创建默认问卷答案 (用于测试)
 */
export function createDefaultSurveyAnswers(overrides?: Partial<SurveyAnswers>): SurveyAnswers {
  return {
    chronotype: 'neutral',
    typicalWakeTime: 8,
    focusDuration: 'medium',
    breakFrequency: 'normal',
    deepWorkPreference: 'morning',
    ...overrides,
  };
}

/**
 * 任务类型标签映射
 */
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  'deep-work': '深度工作',
  'admin': '行政事务',
  'creative': '创意工作',
  'meeting': '会议',
  'routine': '常规任务',
};

/**
 * 任务类型图标 (emoji)
 */
export const TASK_TYPE_ICONS: Record<TaskType, string> = {
  'deep-work': '🎯',
  'admin': '📋',
  'creative': '💡',
  'meeting': '👥',
  'routine': '🔄',
};
