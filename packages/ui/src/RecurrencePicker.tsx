/**
 * RecurrencePicker - 循环规则选择器
 * 用于设置任务的重复规则
 */
import React, { useState, useCallback } from 'react';
import { TaskRecurrenceRule, RecurrenceFrequency } from '@calendar/core';
import './RecurrencePicker.css';

interface RecurrencePickerProps {
  value?: TaskRecurrenceRule;
  onChange: (rule: TaskRecurrenceRule | undefined) => void;
  onClose: () => void;
}

type EndCondition = 'never' | 'count' | 'date';

export const RecurrencePicker: React.FC<RecurrencePickerProps> = ({
  value,
  onChange,
  onClose,
}) => {
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    value?.frequency || 'daily'
  );
  const [interval, setInterval] = useState(value?.interval || 1);
  const [weekDays, setWeekDays] = useState<number[]>(value?.weekDays || [1, 2, 3, 4, 5]);
  const [endCondition, setEndCondition] = useState<EndCondition>(
    value?.endCondition || 'never'
  );
  const [endCount, setEndCount] = useState(value?.endCount || 10);
  const [endDate, setEndDate] = useState(
    value?.endDate ? formatDateForInput(value.endDate) : ''
  );

  const weekDayNames = ['日', '一', '二', '三', '四', '五', '六'];

  const toggleWeekDay = useCallback((day: number) => {
    setWeekDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }, []);

  const handleSave = useCallback(() => {
    const rule: TaskRecurrenceRule = {
      frequency,
      interval,
      endCondition,
    };

    if (frequency === 'weekly') {
      rule.weekDays = weekDays;
    }

    if (endCondition === 'count') {
      rule.endCount = endCount;
    } else if (endCondition === 'date' && endDate) {
      rule.endDate = new Date(endDate);
    }

    onChange(rule);
    onClose();
  }, [frequency, interval, weekDays, endCondition, endCount, endDate, onChange, onClose]);

  const handleClear = useCallback(() => {
    onChange(undefined);
    onClose();
  }, [onChange, onClose]);

  const getFrequencyLabel = (f: RecurrenceFrequency): string => {
    const labels: Record<RecurrenceFrequency, string> = {
      daily: '每天',
      weekly: '每周',
      monthly: '每月',
      yearly: '每年',
    };
    return labels[f];
  };

  return (
    <div className="recurrence-picker-overlay" onClick={onClose}>
      <div className="recurrence-picker" onClick={(e) => e.stopPropagation()}>
        <div className="picker-header">
          <h3>设置重复</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="picker-content">
          {/* 频率选择 */}
          <div className="picker-section">
            <label>重复频率</label>
            <div className="frequency-options">
              {(['daily', 'weekly', 'monthly', 'yearly'] as RecurrenceFrequency[]).map(
                (f) => (
                  <button
                    key={f}
                    className={`freq-btn ${frequency === f ? 'active' : ''}`}
                    onClick={() => setFrequency(f)}
                  >
                    {getFrequencyLabel(f)}
                  </button>
                )
              )}
            </div>
          </div>

          {/* 间隔设置 */}
          <div className="picker-section">
            <label>每 {interval} {frequency === 'daily' ? '天' : frequency === 'weekly' ? '周' : frequency === 'monthly' ? '月' : '年'}</label>
            <input
              type="range"
              min="1"
              max="30"
              value={interval}
              onChange={(e) => setInterval(parseInt(e.target.value))}
            />
            <span className="interval-value">{interval}</span>
          </div>

          {/* 每周时的星期选择 */}
          {frequency === 'weekly' && (
            <div className="picker-section">
              <label>重复于</label>
              <div className="weekday-selector">
                {weekDayNames.map((name, index) => (
                  <button
                    key={index}
                    className={`weekday-btn ${weekDays.includes(index) ? 'active' : ''}`}
                    onClick={() => toggleWeekDay(index)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 结束条件 */}
          <div className="picker-section">
            <label>结束条件</label>
            <div className="end-condition-options">
              <label className="radio-label">
                <input
                  type="radio"
                  name="endCondition"
                  checked={endCondition === 'never'}
                  onChange={() => setEndCondition('never')}
                />
                永不
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="endCondition"
                  checked={endCondition === 'count'}
                  onChange={() => setEndCondition('count')}
                />
                重复次数
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="endCondition"
                  checked={endCondition === 'date'}
                  onChange={() => setEndCondition('date')}
                />
                结束日期
              </label>
            </div>

            {endCondition === 'count' && (
              <div className="end-condition-input">
                <span>共</span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={endCount}
                  onChange={(e) => setEndCount(parseInt(e.target.value) || 1)}
                />
                <span>次</span>
              </div>
            )}

            {endCondition === 'date' && (
              <div className="end-condition-input">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="picker-actions">
          <button className="btn-secondary" onClick={handleClear}>
            清除重复
          </button>
          <button className="btn-primary" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

function formatDateForInput(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default RecurrencePicker;
