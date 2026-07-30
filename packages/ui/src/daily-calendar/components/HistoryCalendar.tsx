/**
 * HistoryCalendar - Notion 风格历史台历组件
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Image as ImageIcon } from 'lucide-react';
import { HistoryCalendarProps } from '../types';
import {
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getDaysInMonth,
  formatDateKey,
  addMonths,
} from '../utils/dateUtils';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const HistoryCalendar: React.FC<HistoryCalendarProps> = ({
  records,
  currentMonth,
  onMonthChange,
  onSelectDate,
  selectedDate,
  onClose,
  isOpen,
}) => {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInMonth = getDaysInMonth(year, month);
    const firstWeekday = firstDay.getDay();
    
    const days = [];

    // 上个月填充
    const prevMonth = new Date(year, month - 2, 1);
    const prevMonthLastDay = getLastDayOfMonth(prevMonth.getFullYear(), prevMonth.getMonth() + 1);
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevMonthLastDay.getDate() - i);
      const key = formatDateKey(date);
      days.push({ date, dateKey: key, isCurrentMonth: false, record: records[key] || null });
    }

    // 本月
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month - 1, i);
      const key = formatDateKey(date);
      days.push({ date, dateKey: key, isCurrentMonth: true, record: records[key] || null });
    }

    // 下个月填充
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month, i);
      const key = formatDateKey(date);
      days.push({ date, dateKey: key, isCurrentMonth: false, record: records[key] || null });
    }

    return days;
  }, [currentMonth, records]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[1000]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-x-4 top-[8%] max-w-2xl mx-auto bg-[var(--color-bg-primary)] rounded-xl shadow-[var(--shadow-lg)] border border-[var(--color-border)] z-[1001] overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 20 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-6">
                <h2 className="text-sm font-bold text-[var(--color-text-primary)] tracking-tight">时光相册</h2>
                <div className="flex items-center gap-1 bg-[var(--color-bg-secondary)] rounded-full p-0.5 border border-[var(--color-border)]">
                  <button
                    type="button"
                    aria-label="上个月"
                    onClick={() => onMonthChange(addMonths(currentMonth, -1))}
                    className="p-1 hover:bg-[var(--color-bg-primary)] rounded-full transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                  </button>
                  <span className="text-[11px] font-bold text-[var(--color-text-primary)] min-w-[80px] text-center uppercase tracking-widest">
                    {currentMonth.getFullYear()} . {currentMonth.getMonth() + 1}
                  </span>
                  <button
                    type="button"
                    aria-label="下个月"
                    onClick={() => onMonthChange(addMonths(currentMonth, 1))}
                    className="p-1 hover:bg-[var(--color-bg-primary)] rounded-full transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                  </button>
                </div>
              </div>
              <button
                type="button"
                aria-label="关闭时光相册"
                onClick={onClose}
                className="p-1.5 hover:bg-[var(--color-bg-hover)] rounded-md transition-colors text-[var(--color-text-tertiary)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Grid */}
            <div className="p-6">
              <div className="grid grid-cols-7 gap-2 mb-4">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="text-center text-[9px] font-black text-[var(--color-text-tertiary)] tracking-widest">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day) => {
                  const hasRecord = !!day.record;
                  const isToday = day.dateKey === formatDateKey(new Date());

                  return (
                    <motion.button
                      key={day.dateKey}
                      type="button"
                      aria-label={`${day.dateKey}${hasRecord ? '，有记录' : '，无记录'}`}
                      disabled={!hasRecord}
                      className={`
                        relative aspect-[3/4] rounded-md overflow-hidden border transition-all
                        ${day.isCurrentMonth ? 'bg-[var(--color-bg-primary)]' : 'bg-[var(--color-bg-secondary)] opacity-40'}
                        ${day.dateKey === selectedDate ? 'border-[var(--color-text-primary)] ring-2 ring-[var(--color-text-primary)] ring-offset-2' : 'border-[var(--color-border)]'}
                        ${hasRecord ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}
                      `}
                      onClick={() => hasRecord && onSelectDate(day.dateKey)}
                      onMouseEnter={() => setHoveredDate(day.dateKey)}
                      onMouseLeave={() => setHoveredDate(null)}
                      whileHover={hasRecord ? { y: -2 } : {}}
                    >
                      {hasRecord ? (
                        <>
                          <img
                            src={day.record!.image.url}
                            alt={`${day.dateKey} 台历`}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                          <div className={`absolute top-1.5 left-1.5 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${isToday ? 'bg-[var(--color-accent-blue)] text-white' : 'bg-white/90 text-black shadow-sm'}`}>
                            {day.date.getDate()}
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                          <span className={`text-[11px] font-medium ${isToday ? 'text-[var(--color-accent-blue)] font-bold' : 'text-[var(--color-text-tertiary)]'}`}>
                            {day.date.getDate()}
                          </span>
                          {day.isCurrentMonth && !hasRecord && <div className="w-1 h-1 rounded-full bg-[var(--color-border)]" />}
                        </div>
                      )}
                      
                      {hasRecord && hoveredDate === day.dateKey && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <ImageIcon size={14} className="text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-[var(--color-accent-blue)]" />
                已珍藏 {Object.keys(records).length} 张回忆
              </div>
              <button
                type="button"
                onClick={() => onMonthChange(new Date())}
                className="text-[10px] font-black text-[var(--color-text-primary)] hover:underline uppercase tracking-widest"
              >
                回到今天
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HistoryCalendar;
