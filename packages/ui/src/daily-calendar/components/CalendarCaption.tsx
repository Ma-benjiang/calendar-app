/**
 * 台历文案组件
 * 显示每日祝福语/文案
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Quote as QuoteType, ThemeType } from '../types';
import { Quote } from 'lucide-react';

/**
 * 转义 HTML 特殊字符，防止 XSS 攻击
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

interface CalendarCaptionProps {
  quote: QuoteType;
  theme: ThemeType;
  className?: string;
}

// 主题样式
const THEME_STYLES: Record<ThemeType, { text: string; accent: string; quote: string }> = {
  vintage: {
    text: 'text-[#2C2416]',
    accent: 'text-[#8B6914]',
    quote: 'text-[#D4A574]',
  },
  minimal: {
    text: 'text-gray-900',
    accent: 'text-gray-600',
    quote: 'text-gray-400',
  },
  nature: {
    text: 'text-[#1a3d1a]',
    accent: 'text-[#4a7c4e]',
    quote: 'text-[#7cb342]',
  },
  art: {
    text: 'text-[#2d2a26]',
    accent: 'text-[#8b7355]',
    quote: 'text-[#c4a77d]',
  },
  zen: {
    text: 'text-[#3d3d3d]',
    accent: 'text-[#666666]',
    quote: 'text-[#999999]',
  },
  cosmic: {
    text: 'text-[#e0e0ff]',
    accent: 'text-[#a0a0ff]',
    quote: 'text-[#6060ff]',
  },
  clay: {
    text: 'text-[#4a4a4a]',
    accent: 'text-[#c96f75]',
    quote: 'text-[#ff9a9e]',
  },
  sticker: {
    text: 'text-[#3e2723]',
    accent: 'text-[#795548]',
    quote: 'text-[#a1887f]',
  },
  illustration: {
    text: 'text-[#1a1a1a]',
    accent: 'text-[#0072ff]',
    quote: 'text-[#00c6ff]',
  },
  cyberpunk: {
    text: 'text-white',
    accent: 'text-[#00ffea]',
    quote: 'text-[#f000ff]',
  },
  ukiyoe: {
    text: 'text-[#1d3557]',
    accent: 'text-[#457b9d]',
    quote: 'text-[#e63946]',
  },
  ghibli: {
    text: 'text-[#6d6875]',
    accent: 'text-[#b5838d]',
    quote: 'text-[#ffcdb2]',
  },
};

// 分类标签
const CATEGORY_LABELS: Record<QuoteType['category'], string> = {
  poetry: '诗词',
  healing: '治愈',
  inspirational: '励志',
  'solar-term': '节气',
  holiday: '节日',
  general: '每日一句',
};

export const CalendarCaption: React.FC<CalendarCaptionProps> = ({
  quote,
  theme,
  className = '',
}) => {
  const styles = THEME_STYLES[theme];

  // 对文案内容进行安全转义
  const safeText = escapeHtml(quote.text);
  const safeTextEn = quote.textEn ? escapeHtml(quote.textEn) : undefined;

  return (
    <motion.div
      className={`text-center ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      {/* 引号装饰 */}
      <div className="flex justify-center mb-3">
        <Quote className={`w-6 h-6 ${styles.quote} opacity-50`} />
      </div>

      {/* 文案内容 - 使用 dangerouslySetInnerHTML 渲染转义后的内容 */}
      <blockquote
        className={`text-lg font-medium leading-relaxed mb-3 ${styles.text}`}
        dangerouslySetInnerHTML={{ __html: safeText }}
      />

      {/* 分类标签 */}
      <div className="flex justify-center items-center gap-2"
      >
        <span className={`text-xs px-2 py-0.5 rounded-full ${styles.accent} bg-current bg-opacity-10`}
        >
          {CATEGORY_LABELS[quote.category]}
        </span>

        {safeTextEn && (
          <span
            className={`text-xs ${styles.accent} opacity-70`}
            dangerouslySetInnerHTML={{ __html: safeTextEn }}
          />
        )}
      </div>
    </motion.div>
  );
};

export default CalendarCaption;
