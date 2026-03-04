/**
 * SmartSchedule - 智能安排组件
 * 显示任务的时间建议，允许用户一键安排
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  Task,
  CalendarEvent,
  AIScheduler,
  TimeSlot,
  UserPreference,
  getDefaultPreferences,
} from '@calendar/core';
import './SmartSchedule.css';

// ============== 类型定义 ==============

interface SmartScheduleProps {
  /** 未安排的任务列表 */
  unscheduledTasks: Task[];
  /** 现有日历事件 */
  events: CalendarEvent[];
  /** 用户偏好（可选） */
  preferences?: Partial<UserPreference>;
  /** 安排任务回调 */
  onScheduleTask: (taskId: string, start: Date, end?: Date) => void;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 是否显示 */
  isOpen: boolean;
}

interface SuggestionItem {
  task: Task;
  slots: TimeSlot[];
  selectedSlotIndex: number;
}

// ============== 组件 ==============

export const SmartSchedule: React.FC<SmartScheduleProps> = ({
  unscheduledTasks,
  events,
  preferences = {},
  onScheduleTask,
  onClose,
  isOpen,
}) => {
  // AI Scheduler 实例
  const scheduler = useMemo(() => {
    const prefs = { ...getDefaultPreferences(), ...preferences };
    return new AIScheduler(prefs);
  }, [preferences]);

  // 本地状态
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [localPrefs, setLocalPrefs] = useState<Partial<UserPreference>>(preferences);

  // 分析任务
  const analyzeTasks = useCallback(() => {
    setIsAnalyzing(true);

    // 模拟分析延迟
    setTimeout(() => {
      const newSuggestions: SuggestionItem[] = [];

      for (const task of unscheduledTasks.slice(0, 5)) {
        const slots = scheduler.suggestTimeSlots(task, localPrefs, events, {
          maxDays: 7,
        });

        if (slots.length > 0) {
          newSuggestions.push({
            task,
            slots,
            selectedSlotIndex: 0,
          });
        }
      }

      setSuggestions(newSuggestions);
      setIsAnalyzing(false);
    }, 500);
  }, [unscheduledTasks, scheduler, localPrefs, events]);

  // 选择时间槽
  const selectSlot = useCallback((taskIndex: number, slotIndex: number) => {
    setSuggestions((prev) =>
      prev.map((item, idx) =>
        idx === taskIndex ? { ...item, selectedSlotIndex: slotIndex } : item
      )
    );
  }, []);

  // 应用安排
  const applySchedule = useCallback(() => {
    suggestions.forEach((item) => {
      const slot = item.slots[item.selectedSlotIndex];
      if (slot) {
        onScheduleTask(item.task.id, slot.start, slot.end);
      }
    });
    onClose();
  }, [suggestions, onScheduleTask, onClose]);

  // 格式化时间显示
  const formatTimeSlot = (slot: TimeSlot): string => {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isToday = start.getTime() >= today.getTime() &&
                    start.getTime() < today.getTime() + 24 * 60 * 60 * 1000;

    const dateStr = isToday
      ? '今天'
      : `${start.getMonth() + 1}/${start.getDate()}`;

    const timeStr = `${start.getHours().toString().padStart(2, '0')}:${start
      .getMinutes()
      .toString()
      .padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;

    return `${dateStr} ${timeStr}`;
  };

  // 获取置信度颜色
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return '#8a9a8a'; // 鼠尾草绿
    if (confidence >= 60) return '#c4a46d'; // 芥末黄
    return '#b48a8a'; // 豆沙红
  };

  if (!isOpen) return null;

  return (
    <div className="smart-schedule-overlay" onClick={onClose}>
      <div className="smart-schedule-modal" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="smart-schedule-header">
          <h2><span>✨</span> 智能安排建议</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* 内容 */}
        <div className="smart-schedule-content">
          {suggestions.length === 0 && !isAnalyzing && (
            <div className="empty-state">
              <div className="empty-icon">✨</div>
              <p>分析您的日程安排，为您推荐最佳的任务处理时段</p>
              <button className="analyze-btn" onClick={analyzeTasks}>
                开始智能分析
              </button>

              <button
                className="pref-toggle-btn"
                onClick={() => setShowPreferences(!showPreferences)}
              >
                {showPreferences ? '隐藏偏好设置' : '显示偏好设置'}
              </button>

              {showPreferences && (
                <div className="preferences-panel">
                  <h4>工作时段偏好</h4>
                  <div className="pref-row">
                    <label>工作开始时间</label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={(localPrefs.workingHours as { start?: number } | undefined)?.start ?? 9}
                      onChange={(e) =>
                        setLocalPrefs((prev: Partial<UserPreference>) => ({
                          ...prev,
                          workingHours: {
                            ...(prev.workingHours || {}),
                            start: parseInt(e.target.value),
                          } as { start: number; end: number },
                        }))
                      }
                    />
                  </div>
                  <div className="pref-row">
                    <label>工作结束时间</label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={(localPrefs.workingHours as { end?: number } | undefined)?.end ?? 18}
                      onChange={(e) =>
                        setLocalPrefs((prev: Partial<UserPreference>) => ({
                          ...prev,
                          workingHours: {
                            ...(prev.workingHours || {}),
                            end: parseInt(e.target.value),
                          } as { start: number; end: number },
                        }))
                      }
                    />
                  </div>
                  <div className="pref-row">
                    <label>缓冲时间（分钟）</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={localPrefs.bufferMinutes ?? 15}
                      onChange={(e) =>
                        setLocalPrefs((prev) => ({
                          ...prev,
                          bufferMinutes: parseInt(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {isAnalyzing && (
            <div className="analyzing-state">
              <div className="loading-spinner" />
              <p>正在分析您的日程...</p>
              <p className="sub-text">系统正在扫描空闲时段并匹配最佳时间</p>
            </div>
          )}

          {suggestions.length > 0 && (
            <>
              <div className="suggestions-list">
                {suggestions.map((item, taskIndex) => (
                  <div key={item.task.id} className="suggestion-item">
                    <div className="task-info">
                      <span className="task-title">{item.task.title}</span>
                      {item.task.estimatedMinutes && (
                        <span className="task-duration">
                          ⏱ {item.task.estimatedMinutes}分钟
                        </span>
                      )}
                      <span
                        className="priority-badge"
                        style={{
                          backgroundColor: getPriorityColor(item.task.priority),
                        }}
                      >
                        {item.task.priority === 'high'
                          ? '高'
                          : item.task.priority === 'medium'
                          ? '中'
                          : '低'}
                      </span>
                    </div>

                    <div className="time-slots">
                      {item.slots.map((slot, slotIndex) => (
                        <button
                          key={slotIndex}
                          className={`time-slot ${
                            item.selectedSlotIndex === slotIndex ? 'selected' : ''
                          }`}
                          onClick={() => selectSlot(taskIndex, slotIndex)}
                        >
                          <div className="slot-time">{formatTimeSlot(slot)}</div>
                          <div className="slot-reason">{slot.reason}</div>
                          <div
                            className="confidence-bar"
                            style={{
                              backgroundColor: getConfidenceColor(
                                slot.confidence || 0
                              ),
                              width: `${slot.confidence}%`,
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="suggestions-actions">
                <button className="btn-secondary" onClick={analyzeTasks}>
                  重新分析
                </button>
                <button className="btn-primary" onClick={applySchedule}>
                  应用安排 ({suggestions.length} 个任务)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    high: '#b48a8a',
    medium: '#c4a46d',
    low: '#7c90a0',
    none: '#9a9a97',
  };
  return colors[priority] || '#7c90a0';
}

export default SmartSchedule;
