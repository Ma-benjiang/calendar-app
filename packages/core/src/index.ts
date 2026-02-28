/**
 * Core Package - 日历应用核心模块
 * 
 * 导出所有核心功能模块
 */

// 基础模块
export * from './calendar';
export * from './events';
export * from './task';
export * from './utils';
export * from './notifications';
export * from './recurrence';
export * from './timezone';
export * from './export';

// AI 智能调度模块 (Sprint 2)
// 注意：ai-scheduler 和 conflict-resolver 有同名类型，单独导出避免冲突
export {
  AIScheduler,
  ScheduleOptions,
  ScheduleResult,
  UserPreference,
  TaskType,
  TimeSlot as SchedulerTimeSlot,
  ScheduledTask as SchedulerScheduledTask,
  Conflict as SchedulerConflict,
  RescheduleResult as SchedulerRescheduleResult,
  initializeAIScheduler,
  calculateUrgencyScore,
  getDefaultPreferences,
} from './ai-scheduler';

export * from './user-preference';

// conflict-resolver 使用本地类型定义
export * from './conflict-resolver';
