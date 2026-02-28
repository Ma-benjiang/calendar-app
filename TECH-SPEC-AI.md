# AI Scheduler 技术规格文档

**版本**: v1.0  
**日期**: 2026-02-28  
**状态**: 设计中  
**作者**: Tech Lead

---

## 1. 概述

### 1.1 设计目标
AI Scheduler 是一个智能任务调度系统，能够：
- 自动为未安排的任务找到最佳时间段
- 在事件冲突时自动重新调度任务
- 学习用户偏好，提供个性化调度建议
- 优化时间利用效率，减少任务拖延

### 1.2 核心能力
| 能力 | 描述 | 优先级 |
|------|------|--------|
| 智能排程 | 根据约束条件自动安排任务 | P0 |
| 冲突处理 | 检测并解决任务与事件的冲突 | P0 |
| 偏好学习 | 学习用户工作习惯和偏好 | P1 |
| 多目标优化 | 平衡效率、工作负载、用户满意度 | P1 |

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          AI Scheduler 架构                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐ │
│  │   API Layer     │    │  Core Engine    │    │   Learning Module   │ │
│  │  - schedule()   │◄──►│  - Scheduler    │◄──►│  - PreferenceStore  │ │
│  │  - reschedule() │    │  - Optimizer    │    │  - PatternAnalyzer  │ │
│  │  - learn()      │    │  - ConflictMgr  │    │  - FeedbackLoop     │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────────┘ │
│           │                      │                      │              │
│           ▼                      ▼                      ▼              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Algorithm Layer                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │   │
│  │  │ Constraint  │  │   Greedy    │  │    CSP      │  │ Genetic │ │   │
│  │  │  Solver     │  │  Scheduler  │  │   Solver    │  │   Algo  │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│           │                                                            │
│           ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Data Integration Layer                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │   │
│  │  │ TaskManager│  │EventManager│  │ UserPrefs  │  │  Cache    │  │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └───────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 核心类设计

#### 2.2.1 AIScheduler 主类

```typescript
/**
 * AI 智能调度器主类
 * 负责任务的智能排程、冲突处理和偏好学习
 */
export class AIScheduler {
  private taskManager: TaskManager;
  private eventManager: EventManager;
  private preferenceStore: PreferenceStore;
  private algorithm: SchedulingAlgorithm;
  private conflictResolver: ConflictResolver;
  private cache: ScheduleCache;

  constructor(config: AISchedulerConfig) {
    this.taskManager = config.taskManager;
    this.eventManager = config.eventManager;
    this.preferenceStore = new PreferenceStore();
    this.algorithm = new HybridScheduler();
    this.conflictResolver = new ConflictResolver();
    this.cache = new ScheduleCache();
  }

  /**
   * 智能调度任务
   * 为未安排的任务找到最佳时间段
   */
  async scheduleTasks(options?: ScheduleOptions): Promise<ScheduleResult> {
    // 1. 收集输入数据
    const tasks = this.taskManager.getUnscheduledTasks();
    const events = this.eventManager.getAllEvents();
    const preferences = this.preferenceStore.getPreferences();
    const constraints = this.buildConstraints(preferences);

    // 2. 检查缓存
    const cacheKey = this.generateCacheKey(tasks, events, constraints);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 3. 执行调度算法
    const result = await this.algorithm.schedule({
      tasks,
      events,
      constraints,
      preferences,
      options
    });

    // 4. 缓存结果
    this.cache.set(cacheKey, result);

    return result;
  }

  /**
   * 冲突时重新调度
   * 当新事件与已安排任务冲突时，自动重新安排
   */
  async rescheduleOnConflict(
    event: CalendarEvent, 
    options?: RescheduleOptions
  ): Promise<RescheduleResult> {
    // 1. 找出冲突的任务
    const conflictingTasks = this.findConflictingTasks(event);
    
    if (conflictingTasks.length === 0) {
      return { moved: [], failed: [] };
    }

    // 2. 使用冲突解决器重新调度
    const result = await this.conflictResolver.resolve({
      event,
      conflictingTasks,
      events: this.eventManager.getAllEvents(),
      preferences: this.preferenceStore.getPreferences()
    });

    // 3. 应用调度结果
    for (const move of result.moves) {
      this.taskManager.scheduleTask(
        move.taskId, 
        move.newStart, 
        move.newEnd
      );
    }

    return result;
  }

  /**
   * 学习用户偏好
   * 从用户行为中提取偏好模式
   */
  learnPreference(input: PreferenceInput): void {
    // 1. 解析偏好输入
    const preference = this.parsePreference(input);
    
    // 2. 存储到偏好仓库
    this.preferenceStore.addPreference(preference);
    
    // 3. 更新算法参数
    this.algorithm.updateWeights(preference);
    
    // 4. 清除缓存（偏好变化影响调度结果）
    this.cache.clear();
  }

  /**
   * 获取调度建议预览（不实际应用）
   */
  previewSchedule(tasks?: Task[]): Promise<SchedulePreview> {
    return this.scheduleTasks({ 
      tasks, 
      dryRun: true 
    });
  }

  /**
   * 应用调度结果
   */
  applySchedule(result: ScheduleResult): void {
    for (const scheduled of result.scheduled) {
      this.taskManager.scheduleTask(
        scheduled.taskId,
        scheduled.start,
        scheduled.end
      );
    }
  }

  // ... 私有辅助方法
}
```

#### 2.2.2 调度算法接口

```typescript
/**
 * 调度算法接口
 * 支持多种算法实现，可根据场景切换
 */
interface SchedulingAlgorithm {
  /**
   * 执行调度
   */
  schedule(input: ScheduleInput): Promise<ScheduleResult>;
  
  /**
   * 更新算法权重（根据用户偏好）
   */
  updateWeights(preference: UserPreference): void;
}

/**
 * 调度输入
 */
interface ScheduleInput {
  tasks: Task[];                    // 待调度的任务
  events: CalendarEvent[];          // 已有事件
  constraints: SchedulingConstraints; // 约束条件
  preferences: UserPreferences;     // 用户偏好
  options?: ScheduleOptions;        // 调度选项
}

/**
 * 调度结果
 */
interface ScheduleResult {
  scheduled: ScheduledTask[];       // 成功调度的任务
  unscheduled: UnscheduledTask[];   // 无法调度的任务
  score: number;                    // 调度评分 (0-100)
  metadata: ScheduleMetadata;       // 元数据
}

/**
 * 已调度任务
 */
interface ScheduledTask {
  taskId: string;
  start: Date;
  end: Date;
  confidence: number;               // 调度置信度
  reason: string;                   // 选择该时间的原因
}

/**
 * 未调度任务
 */
interface UnscheduledTask {
  taskId: string;
  reason: string;                   // 无法调度的原因
  suggestions?: string[];           // 改进建议
}
```

---

## 3. 调度算法设计

### 3.1 算法选择策略

根据任务规模和时间窗口，选择不同算法：

| 场景 | 算法 | 时间复杂度 | 适用条件 |
|------|------|-----------|---------|
| 少量任务 (<10) | 贪心 + 局部搜索 | O(n²) | 快速响应 |
| 中等规模 (10-50) | 约束满足 (CSP) | O(n³) | 精确解优先 |
| 大规模 (>50) | 遗传算法 | O(n²·gen) | 全局优化 |
| 实时冲突处理 | 启发式重排 | O(n) | 低延迟要求 |

### 3.2 混合调度策略 (Hybrid Scheduler)

```typescript
/**
 * 混合调度器
 * 根据问题规模自动选择最优算法
 */
class HybridScheduler implements SchedulingAlgorithm {
  private greedyScheduler = new GreedyScheduler();
  private cspSolver = new CSPSolver();
  private geneticSolver = new GeneticScheduler();

  async schedule(input: ScheduleInput): Promise<ScheduleResult> {
    const taskCount = input.tasks.length;
    const timeWindow = this.calculateTimeWindow(input);

    // 根据规模选择算法
    if (taskCount <= 10 && timeWindow <= 7) {
      // 小规模：贪心 + 局部优化
      return this.greedyScheduler.schedule(input);
    } else if (taskCount <= 50) {
      // 中等规模：CSP 求解
      return this.cspSolver.schedule(input);
    } else {
      // 大规模：遗传算法
      return this.geneticSolver.schedule(input);
    }
  }
}
```

### 3.3 贪心调度算法

```typescript
/**
 * 贪心调度器
 * 适用于快速调度和少量任务
 */
class GreedyScheduler implements SchedulingAlgorithm {
  private weights = {
    priority: 0.4,        // 优先级权重
    deadline: 0.3,        // 截止日期权重
    preference: 0.2,      // 用户偏好权重
    efficiency: 0.1,      // 时间效率权重
  };

  async schedule(input: ScheduleInput): Promise<ScheduleResult> {
    const { tasks, events, constraints, preferences } = input;
    const scheduled: ScheduledTask[] = [];
    const unscheduled: UnscheduledTask[] = [];

    // 1. 获取空闲时段
    const freeSlots = this.findFreeSlots(events, constraints);

    // 2. 按优先级排序任务
    const sortedTasks = this.sortTasksByPriority(tasks);

    // 3. 贪心分配
    for (const task of sortedTasks) {
      const slot = this.findBestSlot(task, freeSlots, preferences);
      
      if (slot) {
        scheduled.push({
          taskId: task.id,
          start: slot.start,
          end: slot.end,
          confidence: slot.confidence,
          reason: slot.reason,
        });
        
        // 从空闲时段中移除已使用的
        this.removeSlot(freeSlots, slot);
      } else {
        unscheduled.push({
          taskId: task.id,
          reason: 'No suitable time slot found',
          suggestions: this.generateSuggestions(task, constraints),
        });
      }
    }

    // 4. 计算调度评分
    const score = this.calculateScheduleScore(scheduled, tasks, preferences);

    return {
      scheduled,
      unscheduled,
      score,
      metadata: {
        algorithm: 'greedy',
        duration: Date.now() - startTime,
        tasksProcessed: tasks.length,
      },
    };
  }

  /**
   * 计算任务优先级分数
   */
  private calculateTaskScore(
    task: Task, 
    preferences: UserPreferences
  ): number {
    const priorityScore = PRIORITY_SCORES[task.priority] * this.weights.priority;
    
    const deadlineScore = task.dueDate 
      ? this.calculateUrgencyScore(task.dueDate) * this.weights.deadline 
      : 0;
    
    const preferenceScore = this.calculatePreferenceScore(task, preferences) 
      * this.weights.preference;

    return priorityScore + deadlineScore + preferenceScore;
  }
}
```

### 3.4 约束满足问题 (CSP) 求解器

```typescript
/**
 * CSP 求解器
 * 将调度问题建模为约束满足问题
 */
class CSPSolver implements SchedulingAlgorithm {
  /**
   * CSP 建模：
   * - 变量：每个任务 → 时间槽变量
   * - 值域：所有可用的空闲时段
   * - 约束：
   *   1. 硬约束：时间不重叠、截止前完成、工作时间
   *   2. 软约束：偏好时段、避免碎片化
   */
  async schedule(input: ScheduleInput): Promise<ScheduleResult> {
    const { tasks, events, constraints } = input;

    // 1. 构建 CSP 模型
    const csp = this.buildCSP(tasks, events, constraints);

    // 2. 使用回溯搜索求解
    const solution = this.backtrackingSearch(csp, {});

    // 3. 优化：局部搜索改进
    const optimized = this.localSearch(solution, input.preferences);

    return this.convertToResult(optimized, tasks);
  }

  private buildCSP(
    tasks: Task[], 
    events: CalendarEvent[], 
    constraints: SchedulingConstraints
  ): CSP {
    const variables: Map<string, Variable> = new Map();
    const freeSlots = this.calculateFreeSlots(events, constraints);

    // 为每个任务创建变量
    for (const task of tasks) {
      const domain = this.filterValidSlots(task, freeSlots, constraints);
      variables.set(task.id, {
        name: task.id,
        domain,
        value: null,
      });
    }

    // 定义约束
    const constraints: Constraint[] = [
      // 硬约束：时间不重叠
      new NoOverlapConstraint(variables),
      // 硬约束：截止前完成
      new DeadlineConstraint(variables),
      // 软约束：用户偏好
      new PreferenceConstraint(variables),
    ];

    return { variables, constraints };
  }
}
```

### 3.5 约束定义

```typescript
/**
 * 调度约束定义
 */
interface SchedulingConstraints {
  // 时间约束
  timeWindow: {
    start: Date;          // 调度起始时间
    end: Date;            // 调度结束时间
  };
  
  // 工作时段
  workingHours: {
    start: number;        // 工作开始小时 (0-23)
    end: number;          // 工作结束小时 (0-23)
    workDays: number[];   // 工作日 [1-7], 1=周一
  };
  
  // 休息时段
  breakTimes: Array<{
    start: number;        // 开始小时
    end: number;          // 结束小时
    days?: number[];      // 适用日期
  }>;
  
  // 任务约束
  taskConstraints: {
    minSlotDuration: number;     // 最小时间块（分钟）
    maxSlotDuration: number;     // 最大时间块（分钟）
    bufferMinutes: number;       // 任务间隔（分钟）
    respectFocusTime: boolean;   // 尊重专注时间
  };
  
  // 硬性约束（必须满足）
  hardConstraints: HardConstraint[];
  
  // 软性约束（尽量满足）
  softConstraints: SoftConstraint[];
}

/**
 * 硬约束：优先级高且截止日近的任务优先
 */
class PriorityDeadlineConstraint implements HardConstraint {
  check(assignment: Assignment, task: Task): boolean {
    if (task.priority === 'high' && task.dueDate) {
      const daysUntilDue = getDaysUntil(task.dueDate);
      if (daysUntilDue <= 2) {
        // 高优先级且2天内到期，必须安排在前面
        return this.isEarlyEnough(assignment, task);
      }
    }
    return true;
  }
}

/**
 * 软约束：用户偏好时段
 */
class PreferenceConstraint implements SoftConstraint {
  private weight = 0.3;

  evaluate(assignment: Assignment, preferences: UserPreferences): number {
    const task = assignment.task;
    const slot = assignment.slot;
    
    let score = 0;
    
    // 深度工作时段偏好
    if (preferences.focusTime) {
      const inFocusTime = this.isInFocusTime(slot, preferences.focusTime);
      score += inFocusTime ? 10 : 0;
    }
    
    // 任务类型-时段匹配
    if (preferences.taskTypeSlots && task.tags) {
      const match = this.matchTaskTypeToSlot(task, slot, preferences);
      score += match * 5;
    }
    
    return score * this.weight;
  }
}
```

---

## 4. 用户偏好数据模型

### 4.1 偏好存储结构

```typescript
/**
 * 用户偏好完整模型
 */
interface UserPreferences {
  // 基础偏好
  basic: BasicPreferences;
  
  // 时间偏好
  temporal: TemporalPreferences;
  
  // 任务偏好
  task: TaskPreferences;
  
  // 行为模式（从历史数据学习）
  behavioral: BehavioralPatterns;
  
  // 元数据
  metadata: {
    version: number;
    lastUpdated: Date;
    learningIterations: number;
  };
}

/**
 * 基础偏好
 */
interface BasicPreferences {
  timezone: string;                 // 时区
  language: string;                 // 语言
  firstDayOfWeek: number;           // 每周第一天 (0=周日, 1=周一)
  workingDays: number[];            // 工作日 [1-7]
}

/**
 * 时间相关偏好
 */
interface TemporalPreferences {
  // 工作时段
  workingHours: {
    start: number;                  // 开始小时 (0-23)
    end: number;                    // 结束小时 (0-23)
  };
  
  // 深度工作时段（专注时间）
  focusTime: {
    enabled: boolean;
    slots: Array<{
      start: number;                // 开始小时:分钟
      end: number;                  // 结束小时:分钟
      days: number[];               // 适用日期
    }>;
  };
  
  // 休息偏好
  breaks: {
    lunchTime: { start: number; end: number; };
    shortBreakInterval: number;     // 短休息间隔（分钟）
    shortBreakDuration: number;     // 短休息时长（分钟）
  };
  
  // 清晨/夜晚工作偏好
  chronotype: 'early-bird' | 'night-owl' | 'neutral';
}

/**
 * 任务相关偏好
 */
interface TaskPreferences {
  // 默认任务时长
  defaultDuration: number;          // 分钟
  
  // 任务类型-时段偏好
  taskTypeSlots: Map<string, PreferredSlot[]>;
  // 示例: 'deep-work' → [{start: 9, end: 12}]
  //       'meetings' → [{start: 14, end: 17}]
  
  // 优先级处理偏好
  priorityWeights: {
    high: number;
    medium: number;
    low: number;
    none: number;
  };
  
  // 项目偏好
  projectFocus: Array<{
    project: string;
    preferredDays: number[];
    preferredTimeOfDay: 'morning' | 'afternoon' | 'evening';
  }>;
  
  // 缓冲时间
  bufferMinutes: number;            // 任务间隔
}

/**
 * 行为模式（学习得到）
 */
interface BehavioralPatterns {
  // 实际完成任务的时间分布
  completionPatterns: {
    byHour: number[];               // 24小时完成分布
    byDayOfWeek: number[];          // 星期完成分布
    avgCompletionTime: number;      // 平均完成耗时比（预计/实际）
  };
  
  // 任务拖延模式
  procrastinationPatterns: {
    highPriorityDelay: number;      // 高优先级平均拖延时间
    lowPriorityDelay: number;       // 低优先级平均拖延时间
    commonExcuses: string[];        // 常见拖延原因
  };
  
  // 高效时段
  productivityPeaks: Array<{
    hour: number;
    productivity: number;           // 0-1 效率指数
  }>;
  
  // 任务类型偏好
  taskTypeAffinity: Map<string, number>; // 任务类型 → 亲和度
}
```

### 4.2 偏好学习系统

```typescript
/**
 * 偏好存储与管理系统
 */
class PreferenceStore {
  private preferences: UserPreferences;
  private feedbackHistory: FeedbackRecord[] = [];

  /**
   * 从用户行为学习偏好
   */
  learnFromBehavior(behavior: UserBehavior): void {
    // 1. 分析任务完成时间
    if (behavior.completedTasks) {
      this.updateCompletionPatterns(behavior.completedTasks);
    }
    
    // 2. 分析任务重新调度行为
    if (behavior.rescheduledTasks) {
      this.updateReschedulingPatterns(behavior.rescheduledTasks);
    }
    
    // 3. 分析手动调整
    if (behavior.manualAdjustments) {
      this.updateFromManualAdjustments(behavior.manualAdjustments);
    }
    
    // 4. 更新元数据
    this.preferences.metadata.lastUpdated = new Date();
    this.preferences.metadata.learningIterations++;
  }

  /**
   * 记录用户反馈
   */
  recordFeedback(feedback: ScheduleFeedback): void {
    this.feedbackHistory.push({
      timestamp: new Date(),
      taskId: feedback.taskId,
      originalSlot: feedback.originalSlot,
      userAction: feedback.action,  // 'accepted' | 'rejected' | 'modified'
      newSlot: feedback.newSlot,
      reason: feedback.reason,
    });

    // 根据反馈调整偏好
    if (feedback.action === 'rejected') {
      this.penalizeSlot(feedback.originalSlot, feedback.reason);
    } else if (feedback.action === 'accepted') {
      this.reinforceSlot(feedback.originalSlot);
    }
  }

  private updateCompletionPatterns(completedTasks: CompletedTask[]): void {
    const patterns = this.preferences.behavioral.completionPatterns;
    
    for (const task of completedTasks) {
      const hour = task.completedAt.getHours();
      const dayOfWeek = task.completedAt.getDay();
      
      patterns.byHour[hour]++;
      patterns.byDayOfWeek[dayOfWeek]++;
    }
    
    // 更新高效时段
    this.updateProductivityPeaks(patterns.byHour);
  }

  private updateProductivityPeaks(hourDistribution: number[]): void {
    // 找出最高效的3个时段
    const peaks = hourDistribution
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    this.preferences.behavioral.productivityPeaks = peaks.map(p => ({
      hour: p.hour,
      productivity: p.count / Math.max(...hourDistribution),
    }));
  }
}
```

---

## 5. 与现有系统集成

### 5.1 集成架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │  TaskView  │  │CalendarView│  │  SmartScheduleModal  │  │
│  └─────┬──────┘  └─────┬──────┘  └──────────┬───────────┘  │
│        │               │                    │              │
│        ▼               ▼                    ▼              │
├─────────────────────────────────────────────────────────────┤
│                     Manager Layer                            │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Unified Schedule Manager                  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │  │
│  │  │TaskManager  │  │EventManager │  │AIScheduler    │  │  │
│  │  │  (existing) │  │  (existing) │  │   (new)       │  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └───────┬───────┘  │  │
│  │         │                │                 │          │  │
│  └─────────┼────────────────┼─────────────────┼──────────┘  │
│            │                │                 │             │
├────────────┼────────────────┼─────────────────┼─────────────┤
│            ▼                ▼                 ▼             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Core Logic Layer                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │  │
│  │  │  Task    │  │ Calendar │  │   AI     │             │  │
│  │  │  Core    │  │   Core   │  │ Scheduler│             │  │
│  │  └──────────┘  └──────────┘  └──────────┘             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 集成点详细设计

#### 5.2.1 与 TaskManager 集成

```typescript
/**
 * 扩展现有 TaskManager 以支持 AI 调度
 */
class TaskManager {
  // ... 现有代码 ...
  
  private aiScheduler?: AIScheduler;
  
  /**
   * 注入 AI Scheduler
   */
  setAIScheduler(scheduler: AIScheduler): void {
    this.aiScheduler = scheduler;
  }
  
  /**
   * 智能调度所有未安排任务
   */
  async smartScheduleAll(): Promise<ScheduleResult> {
    if (!this.aiScheduler) {
      throw new Error('AI Scheduler not initialized');
    }
    
    const result = await this.aiScheduler.scheduleTasks();
    this.aiScheduler.applySchedule(result);
    
    return result;
  }
  
  /**
   * 智能调度单个任务
   */
  async smartScheduleTask(taskId: string): Promise<ScheduledTask | null> {
    if (!this.aiScheduler) return null;
    
    const task = this.getTaskById(taskId);
    if (!task || task.scheduledStart) return null;
    
    const result = await this.aiScheduler.scheduleTasks({ 
      tasks: [task] 
    });
    
    if (result.scheduled.length > 0) {
      this.aiScheduler.applySchedule(result);
      return result.scheduled[0];
    }
    
    return null;
  }
  
  /**
   * 获取智能调度建议预览
   */
  async getSchedulePreview(): Promise<SchedulePreview> {
    if (!this.aiScheduler) {
      return { suggestions: [] };
    }
    
    return this.aiScheduler.previewSchedule();
  }
}
```

#### 5.2.2 与 EventManager 集成

```typescript
/**
 * 扩展现有 EventManager 以支持冲突检测
 */
class EventManager {
  // ... 现有代码 ...
  
  private aiScheduler?: AIScheduler;
  
  /**
   * 注入 AI Scheduler
   */
  setAIScheduler(scheduler: AIScheduler): void {
    this.aiScheduler = scheduler;
  }
  
  /**
   * 创建事件时的智能冲突处理
   */
  async createEventWithSmartHandling(
    eventData: Omit<CalendarEvent, 'id'>
  ): Promise<CalendarEvent> {
    const event = this.createEvent(eventData);
    
    // 检查是否需要重新调度任务
    if (this.aiScheduler) {
      const result = await this.aiScheduler.rescheduleOnConflict(event);
      
      if (result.moved.length > 0) {
        // 通知用户有任务被重新调度
        this.notifyRescheduledTasks(result.moved);
      }
    }
    
    return event;
  }
  
  /**
   * 订阅事件变更以触发重新调度
   */
  subscribeToEventsForAIScheduler(): void {
    this.subscribe(async (events) => {
      // 可以在这里添加全局优化逻辑
    });
  }
}
```

### 5.3 初始化流程

```typescript
/**
 * 系统初始化时设置 AI Scheduler
 */
export function initializeAIScheduler(
  taskManager: TaskManager,
  eventManager: EventManager
): AIScheduler {
  // 1. 创建 AI Scheduler 实例
  const scheduler = new AIScheduler({
    taskManager,
    eventManager,
  });
  
  // 2. 加载用户偏好
  const storedPreferences = loadPreferencesFromStorage();
  if (storedPreferences) {
    scheduler.preferenceStore.loadPreferences(storedPreferences);
  }
  
  // 3. 注入到 Manager
  taskManager.setAIScheduler(scheduler);
  eventManager.setAIScheduler(scheduler);
  
  // 4. 设置事件监听
  eventManager.subscribeToEventsForAIScheduler();
  
  // 5. 启动后台学习（可选）
  scheduler.startBackgroundLearning();
  
  return scheduler;
}
```

---

## 6. API 完整规范

### 6.1 核心 API

```typescript
/**
 * AI Scheduler 接口定义
 */
export interface IAIScheduler {
  /**
   * 智能调度任务
   * @param options - 调度选项
   * @returns 调度结果
   */
  scheduleTasks(options?: ScheduleOptions): Promise<ScheduleResult>;
  
  /**
   * 冲突时重新调度
   * @param event - 冲突事件
   * @param options - 重新调度选项
   * @returns 重新调度结果
   */
  rescheduleOnConflict(
    event: CalendarEvent, 
    options?: RescheduleOptions
  ): Promise<RescheduleResult>;
  
  /**
   * 学习用户偏好
   * @param input - 偏好输入
   */
  learnPreference(input: PreferenceInput): void;
  
  /**
   * 获取调度预览
   * @param tasks - 要预览的任务（默认为所有未安排任务）
   * @returns 调度预览
   */
  previewSchedule(tasks?: Task[]): Promise<SchedulePreview>;
  
  /**
   * 应用调度结果
   * @param result - 调度结果
   */
  applySchedule(result: ScheduleResult): void;
  
  /**
   * 获取当前用户偏好
   */
  getPreferences(): UserPreferences;
  
  /**
   * 更新用户偏好
   * @param preferences - 新的偏好设置
   */
  updatePreferences(preferences: Partial<UserPreferences>): void;
  
  /**
   * 获取调度统计
   */
  getStatistics(): ScheduleStatistics;
}

/**
 * 调度选项
 */
interface ScheduleOptions {
  /** 指定要调度的任务（默认所有未安排任务） */
  tasks?: Task[];
  
  /** 调度时间窗口 */
  timeWindow?: {
    start: Date;
    end: Date;
  };
  
  /** 是否仅预览，不实际应用 */
  dryRun?: boolean;
  
  /** 调度策略 */
  strategy?: 'fast' | 'balanced' | 'optimal';
  
  /** 强制重新计算（忽略缓存） */
  force?: boolean;
}

/**
 * 重新调度选项
 */
interface RescheduleOptions {
  /** 要保护的任务（不移动） */
  protectedTaskIds?: string[];
  
  /** 最大移动任务数 */
  maxMoves?: number;
  
  /** 是否允许跨天移动 */
  allowCrossDay?: boolean;
}

/**
 * 重新调度结果
 */
interface RescheduleResult {
  /** 成功移动的任务 */
  moved: Array<{
    taskId: string;
    oldStart: Date;
    oldEnd: Date;
    newStart: Date;
    newEnd: Date;
  }>;
  
  /** 无法移动的任务 */
  failed: Array<{
    taskId: string;
    reason: string;
  }>;
  
  /** 受影响的事件 */
  affectedEvents: string[];
}

/**
 * 调度预览
 */
interface SchedulePreview {
  suggestions: Array<{
    taskId: string;
    taskTitle: string;
    suggestedStart: Date;
    suggestedEnd: Date;
    confidence: number;
    reason: string;
    alternatives?: Array<{
      start: Date;
      end: Date;
      confidence: number;
    }>;
  }>;
  
  /** 预计时间利用率 */
  estimatedUtilization: number;
  
  /** 冲突预警 */
  conflicts: Array<{
    taskId: string;
    conflictWith: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

/**
 * 偏好输入
 */
type PreferenceInput = 
  | { type: 'explicit'; preference: UserPreference }
  | { type: 'feedback'; feedback: ScheduleFeedback }
  | { type: 'behavior'; behavior: UserBehavior };

/**
 * 调度反馈
 */
interface ScheduleFeedback {
  taskId: string;
  originalSlot: { start: Date; end: Date };
  action: 'accepted' | 'rejected' | 'modified';
  newSlot?: { start: Date; end: Date };
  reason?: string;
}

/**
 * 用户行为数据
 */
interface UserBehavior {
  completedTasks?: Array<{
    taskId: string;
    scheduledStart: Date;
    completedAt: Date;
    estimatedMinutes: number;
  }>;
  
  rescheduledTasks?: Array<{
    taskId: string;
    originalStart: Date;
    newStart: Date;
    reason?: string;
  }>;
  
  manualAdjustments?: Array<{
    taskId: string;
    adjustmentType: 'moved' | 'duration-changed' | 'cancelled';
    details: Record<string, any>;
  }>;
}

/**
 * 调度统计
 */
interface ScheduleStatistics {
  totalTasksScheduled: number;
  totalReschedules: number;
  averageScheduleTime: number;
  userAcceptanceRate: number;
  conflictsResolved: number;
  preferenceAccuracy: number;
}
```

### 6.2 事件系统

```typescript
/**
 * AI Scheduler 事件
 */
interface AISchedulerEvents {
  // 调度完成
  'schedule:completed': {
    result: ScheduleResult;
    timestamp: Date;
  };
  
  // 重新调度完成
  'reschedule:completed': {
    result: RescheduleResult;
    triggerEvent: CalendarEvent;
    timestamp: Date;
  };
  
  // 冲突检测
  'conflict:detected': {
    taskId: string;
    eventId: string;
    conflictType: 'overlap' | 'deadline' | 'preference';
  };
  
  // 偏好更新
  'preference:updated': {
    preference: UserPreference;
    source: 'explicit' | 'learned' | 'feedback';
  };
  
  // 建议生成
  'suggestion:generated': {
    suggestions: SchedulePreview['suggestions'];
    forDate: Date;
  };
}
```

---

## 7. 数据流设计

### 7.1 智能调度数据流

```
用户点击"智能调度"
       │
       ▼
┌──────────────┐
│   UI Layer   │ ──► 显示加载状态
└──────┬───────┘
       │
       ▼
┌──────────────┐
│TaskManager   │ ──► 获取未安排任务
│.getUnscheduled│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│EventManager  │ ──► 获取所有事件
│.getAllEvents │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│PreferenceStore│ ──► 获取用户偏好
│.getPreferences│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│AIScheduler   │ ──► 构建约束条件
│.buildConstraints│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│Algorithm     │ ──► 执行调度算法
│.schedule()   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ScheduleResult│ ──► 返回调度结果
└──────┬───────┘
       │
       ├─────────────────────────────┐
       ▼                             ▼
┌──────────────┐            ┌──────────────┐
│ UI 显示建议   │            │ TaskManager  │
│ 等待用户确认  │            │ .scheduleTask│
└──────────────┘            └──────────────┘
       │                             │
       ▼                             ▼
用户接受/修改              应用调度结果
```

### 7.2 冲突处理数据流

```
新事件创建/修改
       │
       ▼
┌──────────────┐
│EventManager  │
│.createEvent  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│AIScheduler   │ ──► 检测冲突任务
│.findConflicts│
└──────┬───────┘
       │
       ▼
有冲突? ──► 否 ──► 完成
       │
       是
       ▼
┌──────────────┐
│ConflictResolver│ ──► 寻找替代时段
│.findAlternatives│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 评估替代方案  │ ──► 选择最优解
│ 按优先级排序  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 通知用户/    │
│ 自动应用     │
└──────────────┘
       │
       ▼
┌──────────────┐
│TaskManager   │ ──► 更新任务时间
│.scheduleTask │
└──────────────┘
```

---

## 8. 性能优化

### 8.1 缓存策略

```typescript
/**
 * 调度结果缓存
 */
class ScheduleCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize = 10;
  private ttl = 5 * 60 * 1000; // 5分钟

  get(key: string): ScheduleResult | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) return undefined;
    
    // 检查过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.result;
  }

  set(key: string, result: ScheduleResult): void {
    // LRU 淘汰
    if (this.cache.size >= this.maxSize) {
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      this.cache.delete(oldest[0]);
    }
    
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  /**
   * 生成缓存键
   */
  generateKey(
    tasks: Task[], 
    events: CalendarEvent[], 
    constraints: SchedulingConstraints
  ): string {
    const tasksHash = this.hashTasks(tasks);
    const eventsHash = this.hashEvents(events);
    const constraintsHash = this.hashConstraints(constraints);
    
    return `${tasksHash}-${eventsHash}-${constraintsHash}`;
  }
}
```

### 8.2 增量计算

```typescript
/**
 * 增量调度器
 * 只对变更的任务重新计算
 */
class IncrementalScheduler {
  private lastSchedule: Map<string, ScheduledTask> = new Map();

  /**
   * 增量调度
   */
  async scheduleIncremental(
    allTasks: Task[],
    changedTaskIds: string[],
    input: ScheduleInput
  ): Promise<ScheduleResult> {
    // 1. 保留未变更任务的调度
    const unchangedTasks = allTasks.filter(
      t => !changedTaskIds.includes(t.id)
    );
    
    const unchangedSchedule = unchangedTasks
      .map(t => this.lastSchedule.get(t.id))
      .filter(Boolean) as ScheduledTask[];

    // 2. 标记已用时段
    const occupiedSlots = unchangedSchedule.map(s => ({
      start: s.start,
      end: s.end,
    }));

    // 3. 只调度变更的任务
    const changedTasks = allTasks.filter(
      t => changedTaskIds.includes(t.id)
    );
    
    const newSchedule = await this.scheduleChangedTasks(
      changedTasks,
      occupiedSlots,
      input
    );

    // 4. 合并结果
    return {
      scheduled: [...unchangedSchedule, ...newSchedule],
      // ...
    };
  }
}
```

---

## 9. 测试策略

### 9.1 单元测试

```typescript
describe('AIScheduler', () => {
  let scheduler: AIScheduler;
  let taskManager: TaskManager;
  let eventManager: EventManager;

  beforeEach(() => {
    taskManager = new TaskManager();
    eventManager = new EventManager();
    scheduler = new AIScheduler({ taskManager, eventManager });
  });

  describe('scheduleTasks', () => {
    it('should schedule high priority tasks first', async () => {
      // 测试优先级排序
    });

    it('should respect deadline constraints', async () => {
      // 测试截止日期约束
    });

    it('should avoid time conflicts with events', async () => {
      // 测试冲突避免
    });

    it('should handle empty task list', async () => {
      // 测试边界条件
    });
  });

  describe('rescheduleOnConflict', () => {
    it('should reschedule conflicting tasks', async () => {
      // 测试冲突重调度
    });

    it('should respect protected tasks', async () => {
      // 测试保护任务
    });
  });
});
```

### 9.2 性能测试

```typescript
describe('Performance', () => {
  it('should schedule 50 tasks within 2 seconds', async () => {
    const tasks = generateTasks(50);
    const start = Date.now();
    
    await scheduler.scheduleTasks({ tasks });
    
    expect(Date.now() - start).toBeLessThan(2000);
  });

  it('should handle conflict resolution within 500ms', async () => {
    // 测试冲突处理性能
  });
});
```

---

## 10. 实施计划

### Phase 1: 基础调度 (Week 1)
- [ ] 实现 AIScheduler 核心类
- [ ] 实现 GreedyScheduler 算法
- [ ] 基础约束系统
- [ ] 与 TaskManager 集成

### Phase 2: 冲突处理 (Week 2)
- [ ] 冲突检测算法
- [ ] ConflictResolver 实现
- [ ] rescheduleOnConflict 功能
- [ ] 与 EventManager 集成

### Phase 3: 偏好系统 (Week 3)
- [ ] UserPreferences 数据模型
- [ ] PreferenceStore 实现
- [ ] 基础偏好学习
- [ ] learnPreference API

### Phase 4: 高级算法 (Week 4)
- [ ] CSP Solver 实现
- [ ] HybridScheduler 策略选择
- [ ] 性能优化（缓存、增量计算）
- [ ] 完整测试覆盖

---

## 11. 附录

### 11.1 算法复杂度分析

| 算法 | 时间复杂度 | 空间复杂度 | 适用场景 |
|------|-----------|-----------|---------|
| Greedy | O(n²) | O(n) | 快速响应、少量任务 |
| CSP (回溯) | O(dⁿ) | O(n) | 精确解、中等规模 |
| CSP (启发式) | O(n³) | O(n²) | 实用解、中等规模 |
| Genetic | O(g·n²) | O(n) | 全局优化、大规模 |

### 11.2 参考资源

- [Constraint Satisfaction Problems](https://en.wikipedia.org/wiki/Constraint_satisfaction_problem)
- [Job Shop Scheduling](https://en.wikipedia.org/wiki/Job-shop_scheduling)
- [Genetic Algorithms for Scheduling](https://www.sciencedirect.com/topics/computer-science/genetic-algorithm)

---

*文档结束*
