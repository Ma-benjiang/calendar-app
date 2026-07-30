/**
 * 台历卡片组件
 * 主台历展示组件，整合图片、日期信息、文案
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, RefreshCw, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { DailyCalendarRecord, ThemeType } from '../types';
import { CalendarHeader } from './CalendarHeader';
import { CalendarImage } from './CalendarImage';
import { CalendarCaption } from './CalendarCaption';
import { isToday } from '../utils/dateUtils';

interface CalendarCardProps {
  record: DailyCalendarRecord | null;
  isLoading?: boolean;
  isGenerating?: boolean;
  progress?: number;
  onRegenerate?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  onGoToToday?: () => void;
}

// 主题样式配置
const THEME_STYLES: Record<ThemeType, { bg: string; text: string; accent: string }> = {
  vintage: {
    bg: 'bg-[#F5F0E8]',
    text: 'text-[#2C2416]',
    accent: 'text-[#8B6914]',
  },
  minimal: {
    bg: 'bg-white',
    text: 'text-gray-900',
    accent: 'text-gray-600',
  },
  nature: {
    bg: 'bg-[#F0F4F0]',
    text: 'text-[#1a3d1a]',
    accent: 'text-[#4a7c4e]',
  },
  art: {
    bg: 'bg-[#FAF8F5]',
    text: 'text-[#2d2a26]',
    accent: 'text-[#8b7355]',
  },
  zen: {
    bg: 'bg-[#F7F5F0]',
    text: 'text-[#3d3d3d]',
    accent: 'text-[#666666]',
  },
  cosmic: {
    bg: 'bg-[#1a1a2e]',
    text: 'text-[#e0e0ff]',
    accent: 'text-[#a0a0ff]',
  },
  clay: {
    bg: 'bg-[#fff5f5]',
    text: 'text-[#4a4a4a]',
    accent: 'text-[#c96f75]',
  },
  sticker: {
    bg: 'bg-[#f5f5f5]',
    text: 'text-[#3e2723]',
    accent: 'text-[#795548]',
  },
  illustration: {
    bg: 'bg-white',
    text: 'text-[#1a1a1a]',
    accent: 'text-[#0072ff]',
  },
  cyberpunk: {
    bg: 'bg-[#0a0a0a]',
    text: 'text-white',
    accent: 'text-[#00ffea]',
  },
  ukiyoe: {
    bg: 'bg-[#f1faee]',
    text: 'text-[#1d3557]',
    accent: 'text-[#457b9d]',
  },
  ghibli: {
    bg: 'bg-[#fefae0]',
    text: 'text-[#6d6875]',
    accent: 'text-[#b5838d]',
  },
};

const THEME_LABELS: Record<ThemeType, string> = {
  vintage: '复古',
  minimal: '极简',
  nature: '自然',
  art: '艺术',
  zen: '禅意',
  cosmic: '星空',
  clay: '粘土',
  sticker: '贴纸',
  illustration: '插画',
  cyberpunk: '赛博朋克',
  ukiyoe: '浮世绘',
  ghibli: '童话',
};

export const CalendarCard: React.FC<CalendarCardProps> = ({
  record,
  isLoading = false,
  isGenerating = false,
  progress = 0,
  onRegenerate,
  onSave,
  onShare,
  onPrevDay,
  onNextDay,
  onGoToToday,
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const theme = record?.theme || 'vintage';
  const styles = THEME_STYLES[theme];
  const isDarkTheme = theme === 'cosmic';

  const handleImageLoad = useCallback(() => {
    setIsImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setIsImageLoaded(false);
  }, []);

  // 加载状态
  if (isGenerating || (isLoading && !record)) {
    return (
      <div className={`relative w-full max-w-md mx-auto ${styles.bg} rounded-2xl shadow-2xl overflow-hidden`}>
        <div className="aspect-[3/4] flex flex-col items-center justify-center p-8">
          {/* 加载动画 */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 mb-6"
          >
            <div className={`w-full h-full rounded-full border-4 border-t-transparent ${
              isDarkTheme ? 'border-blue-400' : 'border-amber-600'
            }`} />
          </motion.div>

          <h3 className={`text-xl font-medium mb-4 ${styles.text}`}>
            正在创作今日台历
          </h3>

          {/* 进度条 */}
          <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
            <motion.div
              className={`h-full ${isDarkTheme ? 'bg-blue-500' : 'bg-amber-600'}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <p className={`text-sm ${styles.accent}`}>
            {progress < 30 && '准备画布...'}
            {progress >= 30 && progress < 50 && '构思画面...'}
            {progress >= 50 && progress < 80 && 'AI 正在绘制...'}
            {progress >= 80 && '即将完成...'}
          </p>
        </div>
      </div>
    );
  }

  // 错误/无数据状态
  if (!record) {
    return (
      <div className={`relative w-full max-w-md mx-auto ${styles.bg} rounded-2xl shadow-2xl overflow-hidden`}>
        <div className="aspect-[3/4] flex flex-col items-center justify-center p-8 text-center">
          <Calendar className={`w-16 h-16 mb-4 ${styles.accent}`} />
          <h3 className={`text-xl font-medium mb-2 ${styles.text}`}>
            暂无台历
          </h3>
          <p className={`text-sm mb-6 ${styles.accent}`}>
            点击下方按钮生成今日台历
          </p>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                isDarkTheme
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              生成台历
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={`relative w-full max-w-md mx-auto ${styles.bg} rounded-2xl shadow-2xl overflow-hidden`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* 日期导航 */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
        <button
          onClick={onPrevDay}
          className={`p-2 rounded-full backdrop-blur-sm transition-all ${
            isDarkTheme
              ? 'bg-black/30 hover:bg-black/50 text-white'
              : 'bg-white/70 hover:bg-white/90 text-gray-800'
          }`}
          aria-label="前一天"
        >
          <ChevronLeft size={20} />
        </button>

        {isToday(new Date(record.date)) ? (
          <span className={`px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm ${
            isDarkTheme
              ? 'bg-blue-600/80 text-white'
              : 'bg-amber-600/80 text-white'
          }`}>
            今天
          </span>
        ) : (
          <button
            onClick={onGoToToday}
            className={`px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm transition-all ${
              isDarkTheme
                ? 'bg-black/30 hover:bg-black/50 text-white'
                : 'bg-white/70 hover:bg-white/90 text-gray-800'
            }`}
          >
            回今天
          </button>
        )}

        <button
          onClick={onNextDay}
          className={`p-2 rounded-full backdrop-blur-sm transition-all ${
            isDarkTheme
              ? 'bg-black/30 hover:bg-black/50 text-white'
              : 'bg-white/70 hover:bg-white/90 text-gray-800'
          }`}
          aria-label="后一天"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 主图片区域 */}
      <div className="relative aspect-square">
        <CalendarImage
          imageUrl={record.image.url}
          alt={`${record.date} 的台历`}
          isLoading={isLoading}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />

        {/* 图片加载后的渐变遮罩 */}
        {isImageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        )}

        {/* 日期信息叠加层 */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <CalendarHeader dateInfo={record.dateInfo} isDarkOverlay />
        </div>
      </div>

      {/* 文案区域 */}
      <div className="p-6">
        <CalendarCaption quote={record.quote} theme={record.theme} />

        {/* 操作按钮 */}
        <motion.div
          className="flex justify-center gap-4 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0.7 }}
          transition={{ duration: 0.2 }}
        >
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isDarkTheme
                  ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
              }`}
              title="重新生成"
            >
              <RefreshCw size={16} />
              <span>换一张</span>
            </button>
          )}

          {onSave && (
            <button
              onClick={onSave}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isDarkTheme
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title="保存"
            >
              <Download size={16} />
              <span>保存</span>
            </button>
          )}

          {onShare && (
            <button
              onClick={onShare}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isDarkTheme
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title="分享"
            >
              <Share2 size={16} />
              <span>分享</span>
            </button>
          )}
        </motion.div>
      </div>

      {/* 主题标签 */}
      <div className={`absolute top-4 right-4 px-2 py-1 rounded text-xs font-medium backdrop-blur-sm ${
        isDarkTheme
          ? 'bg-black/30 text-white/80'
          : 'bg-white/70 text-gray-600'
      }`}>
        {THEME_LABELS[record.theme]}
      </div>
    </motion.div>
  );
};

export default CalendarCard;
