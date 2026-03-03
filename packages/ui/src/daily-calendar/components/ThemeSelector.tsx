/**
 * 主题选择器组件
 * 允许用户选择台历主题风格
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, X, Check, Sparkles, Calendar, Shuffle, Bot } from 'lucide-react';
import { ThemeType, ThemeStrategyType, ThemeConfig } from '../types';

interface ThemeSelectorProps {
  currentTheme: ThemeType;
  strategy: ThemeStrategyType;
  onThemeChange: (theme: ThemeType) => void;
  onStrategyChange: (strategy: ThemeStrategyType) => void;
  isOpen: boolean;
  onClose: () => void;
}

// 主题配置
const THEMES: ThemeConfig[] = [
  {
    id: 'vintage',
    name: '复古时光',
    description: '怀旧色调、老照片质感、优雅字体',
    promptStyle: 'Vintage calendar page, warm sepia tones, old paper texture',
    colorPalette: {
      primary: '#D4A574',
      secondary: '#8B6914',
      background: '#F5F0E8',
      text: '#2C2416',
    },
  },
  {
    id: 'minimal',
    name: '极简主义',
    description: '留白设计、现代字体、几何元素',
    promptStyle: 'Minimalist calendar design, clean white background, modern sans-serif typography',
    colorPalette: {
      primary: '#3b82f6',
      secondary: '#64748b',
      background: '#ffffff',
      text: '#1e293b',
    },
  },
  {
    id: 'nature',
    name: '自然之境',
    description: '植物花卉、自然风光、清新色调',
    promptStyle: 'Nature-inspired calendar, lush green botanical elements, morning light',
    colorPalette: {
      primary: '#4a7c4e',
      secondary: '#7cb342',
      background: '#F0F4F0',
      text: '#1a3d1a',
    },
  },
  {
    id: 'art',
    name: '艺术画廊',
    description: '油画风格、艺术插画、丰富色彩',
    promptStyle: 'Artistic calendar illustration, impressionist painting style, vibrant colors',
    colorPalette: {
      primary: '#8b7355',
      secondary: '#c4a77d',
      background: '#FAF8F5',
      text: '#2d2a26',
    },
  },
  {
    id: 'zen',
    name: '禅意东方',
    description: '水墨风格、东方美学、宁静意境',
    promptStyle: 'Zen-inspired calendar, ink wash painting style, oriental aesthetics',
    colorPalette: {
      primary: '#666666',
      secondary: '#999999',
      background: '#F7F5F0',
      text: '#3d3d3d',
    },
  },
  {
    id: 'cosmic',
    name: '星空宇宙',
    description: '星空元素、深邃色调、神秘感',
    promptStyle: 'Cosmic calendar design, deep space background, stars and nebulae',
    colorPalette: {
      primary: '#6060ff',
      secondary: '#a0a0ff',
      background: '#1a1a2e',
      text: '#e0e0ff',
    },
  },
];

// 策略配置
const STRATEGIES: { id: ThemeStrategyType; name: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'manual',
    name: '手动选择',
    description: '固定使用选定的主题',
    icon: <Palette className="w-4 h-4" />,
  },
  {
    id: 'seasonal',
    name: '季节自动',
    description: '根据当前季节自动切换主题',
    icon: <Calendar className="w-4 h-4" />,
  },
  {
    id: 'daily-random',
    name: '每日随机',
    description: '每天随机选择一个主题',
    icon: <Shuffle className="w-4 h-4" />,
  },
  {
    id: 'ai-recommended',
    name: 'AI 推荐',
    description: '根据日期和天气智能推荐',
    icon: <Bot className="w-4 h-4" />,
  },
];

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  strategy,
  onThemeChange,
  onStrategyChange,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'theme' | 'strategy'>('theme');

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
            className="fixed inset-x-4 top-[10%] max-w-lg mx-auto bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">选择主题风格</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 标签页 */}
            <div className="flex border-b">
              <button
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'theme'
                    ? 'text-amber-600 border-b-2 border-amber-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('theme')}
              >
                主题风格
              </button>
              <button
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'strategy'
                    ? 'text-amber-600 border-b-2 border-amber-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('strategy')}
              >
                切换策略
              </button>
            </div>

            {/* 内容 */}
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {activeTab === 'theme' ? (
                <div className="grid grid-cols-2 gap-3">
                  {THEMES.map((theme) => (
                    <motion.button
                      key={theme.id}
                      className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                        currentTheme === theme.id
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => onThemeChange(theme.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* 选中标记 */}
                      {currentTheme === theme.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}

                      {/* 颜色预览 */}
                      <div className="flex gap-1 mb-3">
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: theme.colorPalette.primary }}
                        />
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: theme.colorPalette.secondary }}
                        />
                        <div
                          className="w-6 h-6 rounded-full border border-gray-200"
                          style={{ backgroundColor: theme.colorPalette.background }}
                        />
                      </div>

                      {/* 主题信息 */}
                      <h3 className="font-medium text-gray-900 mb-1">{theme.name}</h3>
                      <p className="text-xs text-gray-500 line-clamp-2">{theme.description}</p>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {STRATEGIES.map((s) => (
                    <motion.button
                      key={s.id}
                      className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                        strategy === s.id
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => onStrategyChange(s.id)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className={`p-2 rounded-lg ${
                        strategy === s.id ? 'bg-amber-200 text-amber-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {s.icon}
                      </div>
                      <div className="text-left flex-1">
                        <h3 className="font-medium text-gray-900">{s.name}</h3>
                        <p className="text-sm text-gray-500">{s.description}</p>
                      </div>
                      {strategy === s.id && (
                        <Check className="w-5 h-5 text-amber-500" />
                      )}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* 底部提示 */}
            <div className="p-4 bg-gray-50 border-t">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>切换主题后会重新生成台历图片</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ThemeSelector;
