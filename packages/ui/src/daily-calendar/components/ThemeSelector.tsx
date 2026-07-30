/**
 * ThemeSelector - Notion 风格主题选择器
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Camera, Palette, Shuffle } from 'lucide-react';
import { ThemeType, ThemeStrategyType, ThemeConfig } from '../types';

interface ThemeSelectorProps {
  currentTheme: ThemeType;
  strategy: ThemeStrategyType;
  onSave: (strategy: ThemeStrategyType, theme: ThemeType) => void;
  isOpen: boolean;
  onClose: () => void;
}

const THEMES: ThemeConfig[] = [
  {
    id: 'vintage',
    name: '复古画报',
    description: '90年代胶片质感、直打闪光灯、低饱和度的高级杂志感',
    promptStyle: 'Vintage editorial, direct flash, 90s film grain',
    colorPalette: { primary: '#D4A574', secondary: '#8B6914', background: '#F5F0E8', text: '#2C2416' },
  },
  {
    id: 'minimal',
    name: '纸张触感',
    description: '特种纸纹理、凹凸压印工艺、极简而精致的文具美学',
    promptStyle: 'Premium paper texture, letterpress, minimalist layout',
    colorPalette: { primary: '#3b82f6', secondary: '#64748b', background: '#ffffff', text: '#1e293b' },
  },
  {
    id: 'nature',
    name: '工业自然',
    description: '磨砂玻璃后的植物、大理石纹理、美术馆级的冷淡光影',
    promptStyle: 'Frosted glass, marble, museum lighting, nature',
    colorPalette: { primary: '#4a7c4e', secondary: '#7cb342', background: '#F0F4F0', text: '#1a3d1a' },
  },
  {
    id: 'art',
    name: '先锋艺术',
    description: '超现实拟物、悬浮元素、纯净虚空中的概念艺术装置',
    promptStyle: 'Conceptual art, surrealism, minimalist void',
    colorPalette: { primary: '#8b7355', secondary: '#c4a77d', background: '#FAF8F5', text: '#2d2a26' },
  },
  {
    id: 'zen',
    name: '极简线条',
    description: '黑白纤细线条、大胆色块留白、富有哲思的独立杂志感',
    promptStyle: 'Thin line art, B&W, extreme negative space',
    colorPalette: { primary: '#666666', secondary: '#999999', background: '#F7F5F0', text: '#3d3d3d' },
  },
  {
    id: 'cosmic',
    name: '深空磨砂',
    description: '深蓝色调、透光材质、带有未来工业感的星云陈列',
    promptStyle: 'Industrial cosmic, translucent nebula, deep navy',
    colorPalette: { primary: '#6060ff', secondary: '#a0a0ff', background: '#1a1a2e', text: '#e0e0ff' },
  },
  {
    id: 'clay',
    name: '3D 粘土',
    description: '软萌粘土质感、手工捏制痕迹、圆润可爱的立体世界',
    promptStyle: '3D claymation, matte texture, rounded shapes',
    colorPalette: { primary: '#ff9a9e', secondary: '#fad0c4', background: '#ffffff', text: '#4a4a4a' },
  },
  {
    id: 'sticker',
    name: '立体贴纸',
    description: '加厚白边、亮面质感、像是可以从屏幕撕下的实体贴纸',
    promptStyle: '3D sticker, die-cut, glossy finish',
    colorPalette: { primary: '#a1887f', secondary: '#d7ccc8', background: '#f5f5f5', text: '#3e2723' },
  },
  {
    id: 'illustration',
    name: '先锋插画',
    description: 'C4D 渲染、光滑塑料质感、极具未来感的潮流 3D 风格',
    promptStyle: '3D illustration, C4D render, trendy aesthetic',
    colorPalette: { primary: '#00c6ff', secondary: '#0072ff', background: '#ffffff', text: '#1a1a1a' },
  },
  {
    id: 'cyberpunk',
    name: '霓虹未来',
    description: '赛博朋克美学、霓虹灯影、雨夜反光与未来科技感',
    promptStyle: 'Cyberpunk, neon city, rainy night, futuristic',
    colorPalette: { primary: '#f000ff', secondary: '#00ffea', background: '#0a0a0a', text: '#ffffff' },
  },
  {
    id: 'ukiyoe',
    name: '浮世绘',
    description: '传统江户木刻版画、平涂色彩、极具东方韵味的线条',
    promptStyle: 'Ukiyo-e, traditional Japanese, iconic waves',
    colorPalette: { primary: '#e63946', secondary: '#457b9d', background: '#f1faee', text: '#1d3557' },
  },
  {
    id: 'ghibli',
    name: '童话治愈',
    description: '吉卜力画风、手绘水彩、充满呼吸感的怀旧童话场景',
    promptStyle: 'Studio Ghibli style, hand-drawn, heartwarming',
    colorPalette: { primary: '#ffcdb2', secondary: '#b5838d', background: '#fefae0', text: '#6d6875' },
  },
];

const STRATEGIES: { id: ThemeStrategyType; name: string; description: string; icon: React.ReactNode }[] = [
  { id: 'daily-random', name: '随机主题', description: '每次点击相机时随机选择主题', icon: <Shuffle className="w-4 h-4" /> },
  { id: 'manual', name: '手动选择', description: '固定使用选定的主题', icon: <Palette className="w-4 h-4" /> },
];

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  strategy,
  onSave,
  isOpen,
  onClose,
}) => {
  const [draftStrategy, setDraftStrategy] = useState(strategy);
  const [draftTheme, setDraftTheme] = useState(currentTheme);

  useEffect(() => {
    if (isOpen) {
      setDraftStrategy(strategy);
      setDraftTheme(currentTheme);
    }
  }, [currentTheme, isOpen, strategy]);

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
            className="fixed inset-x-4 top-[15%] max-w-lg mx-auto bg-[var(--color-bg-primary)] rounded-xl shadow-[var(--shadow-lg)] border border-[var(--color-border)] z-[1001] overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] tracking-tight">配置台历风格</h2>
              <button aria-label="关闭主题设置" onClick={onClose} className="p-1 hover:bg-[var(--color-bg-hover)] rounded-md transition-colors text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[58vh] overflow-y-auto p-5">
              <div className="mb-5">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                  切换策略
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {STRATEGIES.map((item) => (
                    <button
                      key={item.id}
                      aria-label={item.name}
                      className={`rounded-lg border p-4 text-left transition-all ${
                        draftStrategy === item.id
                          ? 'border-[var(--color-text-primary)] bg-[var(--color-bg-secondary)]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-hover)]'
                      }`}
                      onClick={() => setDraftStrategy(item.id)}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className={`rounded-md p-2 ${
                          draftStrategy === item.id
                            ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]'
                            : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                        }`}>
                          {item.icon}
                        </div>
                        {draftStrategy === item.id && (
                          <Check size={14} strokeWidth={3} className="text-[var(--color-text-primary)]" />
                        )}
                      </div>
                      <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">{item.name}</h3>
                      <p className="mt-1 text-[10px] leading-normal text-[var(--color-text-tertiary)]">{item.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {draftStrategy === 'manual' ? (
                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                    主题风格
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      aria-label={theme.name}
                      className={`group relative flex flex-col gap-3 rounded-lg border p-4 text-left transition-all ${
                        draftTheme === theme.id
                          ? 'border-[var(--color-text-primary)] bg-[var(--color-bg-secondary)]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-hover)]'
                      }`}
                      onClick={() => setDraftTheme(theme.id)}
                    >
                      {draftTheme === theme.id && (
                        <div className="absolute top-3 right-3 text-[var(--color-text-primary)]">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}

                      <div className="flex gap-1.5">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colorPalette.primary }} />
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colorPalette.secondary }} />
                        <div className="w-4 h-4 rounded-full border border-[var(--color-border)]" style={{ backgroundColor: theme.colorPalette.background }} />
                      </div>

                      <div>
                        <h3 className="text-xs font-semibold text-[var(--color-text-primary)] mb-1">{theme.name}</h3>
                        <p className="text-[10px] text-[var(--color-text-tertiary)] leading-normal line-clamp-2">{theme.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                  <Camera size={16} className="text-[var(--color-text-secondary)]" />
                  <p className="text-[11px] text-[var(--color-text-secondary)]">
                    保存后，每次点击相机都会从全部主题中随机选择一个。
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-5 py-4">
              <button
                onClick={onClose}
                className="rounded-md px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-hover)]"
              >
                取消
              </button>
              <button
                onClick={() => onSave(draftStrategy, draftTheme)}
                className="rounded-md bg-[var(--color-text-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-bg-primary)] transition-opacity hover:opacity-80"
              >
                保存设置
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ThemeSelector;
