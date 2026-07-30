/**
 * 台历头部组件
 * 显示日期信息（公历、农历、星期、特殊标记）
 */

import React from 'react';
import { motion } from 'framer-motion';
import { CalendarDateInfo } from '../types';

interface CalendarHeaderProps {
  dateInfo: CalendarDateInfo;
  isDarkOverlay?: boolean;
  className?: string;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  dateInfo,
  isDarkOverlay = false,
  className = '',
}) => {
  const { gregorian, lunar, weekday, special } = dateInfo;

  const textColor = isDarkOverlay ? 'text-white' : 'text-gray-900';
  const subTextColor = isDarkOverlay ? 'text-white/80' : 'text-gray-600';
  const mutedTextColor = isDarkOverlay ? 'text-white/60' : 'text-gray-500';

  return (
    <motion.div
      className={`text-center ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* 年月 */}
      <div className={`text-sm tracking-widest mb-1 ${mutedTextColor}`}>
        {gregorian.year}年{gregorian.month}月
      </div>

      {/* 日期数字 */}
      <motion.div
        className={`text-6xl font-light mb-2 ${textColor}`}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {String(gregorian.day).padStart(2, '0')}
      </motion.div>

      {/* 星期 */}
      <div className={`text-lg mb-3 ${subTextColor}`}>
        {weekday.name}
      </div>

      {/* 农历 */}
      <div className={`text-sm mb-2 ${mutedTextColor}`}>
        农历{lunar.monthName}{lunar.dayName}
        <span className="ml-2">{lunar.zodiac}年</span>
      </div>

      {/* 特殊标记 */}
      <div className="flex justify-center gap-2 flex-wrap">
        {special.isHoliday && special.holidayName && (
          <motion.span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isDarkOverlay
                ? 'bg-red-500/80 text-white'
                : 'bg-red-100 text-red-700'
            }`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            {special.holidayName}
          </motion.span>
        )}

        {special.isWorkdayAdjustment && special.holidayName && (
          <motion.span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isDarkOverlay
                ? 'bg-amber-500/80 text-white'
                : 'bg-amber-100 text-amber-800'
            }`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            {special.holidayName}补班
          </motion.span>
        )}

        {special.isSolarTerm && special.solarTermName && (
          <motion.span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isDarkOverlay
                ? 'bg-green-500/80 text-white'
                : 'bg-green-100 text-green-700'
            }`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            {special.solarTermName}
          </motion.span>
        )}

        <motion.span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            isDarkOverlay
              ? 'bg-purple-500/80 text-white'
              : 'bg-purple-100 text-purple-700'
          }`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
        >
          {special.constellation}
        </motion.span>
      </div>
    </motion.div>
  );
};

export default CalendarHeader;
