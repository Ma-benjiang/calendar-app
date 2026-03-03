/**
 * 历史台历日历组件
 * 以月历形式展示历史生成的台历
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DailyCalendarRecord } from '../types';
import {
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getDaysInMonth,
  formatDateKey,
  addMonths,
} from '../utils/dateUtils';

interface HistoryCalendarProps {
  records: Map<string, DailyCalendarRecord>;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onSelectDate: (date: string) => void;
  selectedDate?: string;
  onClose: () => void;
  isOpen: boolean;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

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

  // 计算当前月份的日历数据
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;

    const firstDay = getFirstDayOfMonth(year, month);
    const daysInMonth = getDaysInMonth(year, month);

    const firstWeekday = firstDay.getDay(); // 0 = Sunday
    const days: Array<{
      date: Date;
      dateKey: string;
      isCurrentMonth: boolean;
      record: DailyCalendarRecord | null;
    }> = [];

    // 上个月的日期
    const prevMonthDays = firstWeekday;
    const prevMonth = new Date(year, month - 2, 1);
    const prevMonthLastDay = getLastDayOfMonth(prevMonth.getFullYear(), prevMonth.getMonth() + 1);

    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevMonthLastDay.getDate() - i);
      days.push({
        date,
        dateKey: formatDateKey(date),
        isCurrentMonth: false,
        record: records.get(formatDateKey(date)) || null,
      });
    }

    // 当前月的日期
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month - 1, i);
      days.push({
        date,
        dateKey: formatDateKey(date),
        isCurrentMonth: true,
        record: records.get(formatDateKey(date)) || null,
      });
    }

    // 下个月的日期
    const remainingDays = 42 - days.length; // 6行 x 7列 = 42
    const nextMonth = new Date(year, month, 1);

    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), i);
      days.push({
        date,
        dateKey: formatDateKey(date),
        isCurrentMonth: false,
        record: records.get(formatDateKey(date)) || null,
      });
    }

    return days;
  }, [currentMonth, records]);

  // 月份标题
  const monthTitle = useMemo(() => {
    return `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;
  }, [currentMonth]);

  // 切换月份
  const goToPrevMonth = () => {
    onMonthChange(addMonths(currentMonth, -1));
  };

  const goToNextMonth = () => {
    onMonthChange(addMonths(currentMonth, 1));
  };

  const goToToday = () => {
    onMonthChange(new Date());
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* 弹窗 */}
          <motion.div
            className="fixed inset-x-4 top-[5%] max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-900">历史台历</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPrevMonth}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <span className="text-base font-medium text-gray-800 min-w-[100px] text-center">
                    {monthTitle}
                  </span>
                  <button
                    onClick={goToNextMonth}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToToday}
                  className="px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  今天
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* 日历 */}
            <div className="p-4">
              {/* 星期标题 */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-gray-500 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* 日期网格 */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const isSelected = day.dateKey === selectedDate;
                  const isHovered = day.dateKey === hoveredDate;
                  const hasRecord = !!day.record;

                  return (
                    <motion.button
                      key={day.dateKey}
                      className={`
                        relative aspect-square rounded-lg overflow-hidden transition-all
                        ${day.isCurrentMonth ? 'bg-gray-50' : 'bg-gray-100/50'}
                        ${isSelected ? 'ring-2 ring-amber-500 ring-offset-2' : ''}
                        ${hasRecord ? 'cursor-pointer' : 'cursor-default'}
                      `}
                      onClick={() => hasRecord && onSelectDate(day.dateKey)}
                      onMouseEnter={() => setHoveredDate(day.dateKey)}
                      onMouseLeave={() => setHoveredDate(null)}
                      whileHover={hasRecord ? { scale: 1.05 } : {}}
                      whileTap={hasRecord ? { scale: 0.95 } : {}}
                    >
                      {hasRecord ? (
                        <>
                          {/* 台历缩略图 */}
                          <img
                            src={day.record!.image.url}
                            alt={day.dateKey}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                          />
                          {/* 日期数字 */}
                          <div
                            className={`
                              absolute top-1 left-1 px-1.5 py-0.5 rounded text-xs font-medium
                              ${isSelected
                                ? 'bg-amber-500 text-white'
                                : 'bg-black/50 text-white'
                              }
                            `}
                          >
                            {day.date.getDate()}
                          </div>
                          {/* 悬停效果 */}
                          {isHovered && (
                            <motion.div
                              className="absolute inset-0 bg-black/40 flex items-center justify-center"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              <span className="text-white text-xs font-medium">
                                查看
                              </span>
                            </motion.div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span
                            className={`
                              text-sm
                              ${day.isCurrentMonth ? 'text-gray-700' : 'text-gray-400'}
                            `}
                          >
                            {day.date.getDate()}
                          </span>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* 底部统计 */}
            <div className="p-4 bg-gray-50 border-t">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  本月已生成{' '}
                  <span className="font-medium text-amber-600">
                    {calendarDays.filter((d) => d.isCurrentMonth && d.record).length}
                  </span>{' '}
                  张台历
                </span>
                <span>
                  总计{' '}
                  <span className="font-medium text-amber-600">{records.size}</span>{' '}
                  张
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HistoryCalendar;
