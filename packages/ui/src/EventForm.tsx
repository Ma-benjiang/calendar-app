import React, { useState } from 'react';
import { CalendarEvent } from '@calendar/core';

interface EventFormProps {
  event?: CalendarEvent;
  initialDate?: Date;
  onSave: (event: Omit<CalendarEvent, 'id'>) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

export const EventForm: React.FC<EventFormProps> = ({
  event,
  initialDate,
  onSave,
  onCancel,
  onDelete,
}) => {
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [startDate, setStartDate] = useState(
    event?.startDate 
      ? new Date(event.startDate).toISOString().slice(0, 16)
      : initialDate?.toISOString().slice(0, 16) || ''
  );
  const [endDate, setEndDate] = useState(
    event?.endDate
      ? new Date(event.endDate).toISOString().slice(0, 16)
      : ''
  );
  const [allDay, setAllDay] = useState(event?.allDay || false);
  const [color, setColor] = useState(event?.color || '#3b82f6');

  const colors = [
    { value: '#7c90a0', label: '灰蓝' },
    { value: '#b48a8a', label: '豆沙红' },
    { value: '#8a9a8a', label: '鼠尾草绿' },
    { value: '#c4a46d', label: '芥末黄' },
    { value: '#9a8ab4', label: '熏衣紫' },
    { value: '#9a9a97', label: '大地灰' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      description,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : new Date(startDate),
      allDay,
      color,
    });
  };

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      <h3>{event ? '编辑事件' : '新建事件'}</h3>
      
      <div className="form-group">
        <label>标题</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="输入事件标题"
          required
        />
      </div>

      <div className="form-group">
        <label>描述</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="输入事件描述（可选）"
          rows={3}
        />
      </div>

      <div className="form-group checkbox-row">
        <input
          type="checkbox"
          id="all-day-checkbox"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
        />
        <label htmlFor="all-day-checkbox" style={{ marginBottom: 0 }}>
          全天事件
        </label>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>开始时间</label>
          <input
            type={allDay ? 'date' : 'datetime-local'}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>结束时间</label>
          <input
            type={allDay ? 'date' : 'datetime-local'}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label>颜色标记</label>
        <div className="color-picker">
          {colors.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`color-btn ${color === c.value ? 'active' : ''}`}
              style={{ backgroundColor: c.value }}
              onClick={() => setColor(c.value)}
              title={c.label}
            />
          ))}
        </div>
      </div>

      <div className="form-actions">
        {event && onDelete && (
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              if (confirm('确定要删除这个事件吗？')) {
                onDelete(event.id);
              }
            }}
          >
            删除
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button type="button" className="btn-secondary" onClick={onCancel}>
          取消
        </button>
        <button type="submit" className="btn-primary">
          保存事件
        </button>
      </div>
    </form>
  );
};
