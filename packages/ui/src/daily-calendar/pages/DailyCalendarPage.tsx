/**
 * DailyCalendarPage - 每日台历页面
 * 宝丽来拍立得风格设计
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Camera,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { useDailyCalendar } from '../hooks/useDailyCalendar';
import { ThemeSelector } from '../components/ThemeSelector';
import { HistoryCalendar } from '../components/HistoryCalendar';
import { ThemeType } from '../types';
import { formatDateKey } from '../utils/dateUtils';

export const DailyCalendarPage: React.FC = () => {
  const {
    currentRecord,
    currentDate,
    isLoading,
    isGenerating,
    progress,
    error,
    generateCalendar,
    regenerateCalendar,
    changeTheme,
    changeDate,
    goToToday,
    goToPrevDay,
    goToNextDay,
    currentTheme,
    themeStrategy,
    setThemeStrategy,
    records,
  } = useDailyCalendar();

  // UI 状态
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(new Date());
  const [developmentStage, setDevelopmentStage] = useState(100);
  const [isHovered, setIsHovered] = useState(false);

  // 显影效果
  useEffect(() => {
    if (isGenerating) {
      setDevelopmentStage(0);
    } else if (currentRecord && !isGenerating) {
      // 模拟显影过程
      const interval = setInterval(() => {
        setDevelopmentStage(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 5;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isGenerating, currentRecord]);

  // 处理日期选择
  const handleSelectDate = useCallback((dateKey: string) => {
    const date = new Date(dateKey);
    changeDate(date);
    setShowHistory(false);
  }, [changeDate]);

  // 处理主题变更
  const handleThemeChange = useCallback(async (theme: ThemeType) => {
    await changeTheme(theme);
    setShowThemeSelector(false);
  }, [changeTheme]);

  // 格式化日期显示
  const formatDateDisplay = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[date.getDay()];
    return { year, month, day, weekday };
  }, []);

  const dateInfo = formatDateDisplay(currentDate);

  // 计算显影滤镜
  const blur = Math.max(0, 10 - (developmentStage / 10));
  const grayscale = Math.max(0, 100 - developmentStage);
  const brightness = 100 + Math.max(0, (100 - developmentStage) / 2);
  const contrast = 80 + (developmentStage * 0.2);
  const filterString = `blur(${blur}px) grayscale(${grayscale}%) brightness(${brightness}%) contrast(${contrast}%)`;

  // 下载宝丽来图片
  const handleDownload = async () => {
    if (!currentRecord?.image?.url) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 2;
    const padding = 16 * scale;
    const width = 320 * scale;
    const photoHeight = 380 * scale;
    const height = padding + photoHeight + 140 * scale + padding;

    canvas.width = width;
    canvas.height = height;

    // 背景 - 米白色
    ctx.fillStyle = '#fdfbf7';
    ctx.fillRect(0, 0, width, height);

    // 加载并绘制图片
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = currentRecord.image.url;
    await new Promise((resolve) => { img.onload = resolve; });
    ctx.drawImage(img, padding, padding, width - padding * 2, photoHeight);

    // 绘制日期
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9ca3af';
    ctx.font = `bold ${12 * scale}px sans-serif`;
    ctx.letterSpacing = '3px';
    const dateText = `${dateInfo.year}.${String(dateInfo.month).padStart(2, '0')}.${String(dateInfo.day).padStart(2, '0')}`;
    ctx.fillText(dateText, width / 2, padding + photoHeight + 35 * scale);

    // 绘制文案
    ctx.fillStyle = '#374151';
    ctx.font = `${18 * scale}px 'Caveat', cursive, serif`;
    const caption = currentRecord.quote?.text || '愿每一天都充满阳光';
    wrapText(ctx, caption, width / 2, padding + photoHeight + 75 * scale, width - padding * 3, 28 * scale);

    // 绘制农历/节气
    if (currentRecord.dateInfo?.lunarDate) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = `${10 * scale}px sans-serif`;
      const lunarText = `${currentRecord.dateInfo.lunarDate.month}${currentRecord.dateInfo.lunarDate.day}`;
      ctx.fillText(lunarText, width / 2, padding + photoHeight + 115 * scale);
    }

    // 下载
    const link = document.createElement('a');
    link.download = `daily-calendar-${formatDateKey(currentDate)}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 文字换行辅助函数
  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const chars = text.split('');
    let line = '';
    let currentY = y;

    for (let n = 0; n < chars.length; n++) {
      const testLine = line + chars[n];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = chars[n];
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  // 主题名称映射
  const themeNames: Record<ThemeType, string> = {
    vintage: '复古时光',
    minimal: '极简主义',
    nature: '自然之境',
    art: '艺术画廊',
    zen: '禅意东方',
    cosmic: '星空宇宙',
  };

  return (
    <div className="min-h-screen bg-[#f5f3f0] relative overflow-hidden">
      {/* 顶部标题 */}
      <div className="absolute top-8 left-0 right-0 text-center z-10">
        <h1 className="text-5xl font-bold text-[#2c2c2c] tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
          每日台历
        </h1>
        <p className="text-gray-500 mt-2 text-sm tracking-widest">DAILY CALENDAR</p>
      </div>

      {/* 主内容区 */}
      <div className="h-screen flex flex-col items-center justify-center pt-20 pb-8 px-4">
        {/* 日期导航 */}
        <div className="flex items-center gap-6 mb-8">
          <button
            onClick={goToPrevDay}
            disabled={isGenerating}
            className="p-3 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
            <div className="text-3xl font-light text-gray-800">
              {dateInfo.year}年{dateInfo.month}月{dateInfo.day}日
            </div>
            <div className="text-gray-500 text-sm mt-1">
              星期{dateInfo.weekday}
              {currentRecord?.dateInfo?.lunarDate && (
                <span className="ml-2 text-amber-600">
                  {currentRecord.dateInfo.lunarDate.month}{currentRecord.dateInfo.lunarDate.day}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={goToNextDay}
            disabled={isGenerating}
            className="p-3 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 宝丽来卡片区域 */}
        <div className="relative flex-1 flex items-center justify-center w-full max-w-4xl">
          <AnimatePresence mode="wait">
            {currentRecord?.image?.url ? (
              <motion.div
                key={currentRecord.id}
                initial={{ scale: 0.8, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', damping: 20 }}
                className="relative"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {/* 宝丽来卡片 */}
                <div className="bg-[#fdfbf7] p-4 pb-6 shadow-2xl rotate-1 hover:rotate-0 transition-transform duration-300"
                  style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.3)' }}
                >
                  {/* 图片区域 */}
                  <div className="w-[300px] h-[380px] bg-gray-100 relative overflow-hidden">
                    <img
                      src={currentRecord.image.url}
                      alt="Daily Calendar"
                      className="w-full h-full object-cover transition-all duration-1000"
                      style={{ filter: filterString }}
                    />
                    {/* 光泽效果 */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                  </div>

                  {/* 底部文字区域 */}
                  <div className="mt-4 text-center min-h-[100px] flex flex-col justify-center">
                    {/* 日期 */}
                    <div className="text-gray-400 text-xs tracking-[0.3em] uppercase mb-2">
                      {dateInfo.year}.{String(dateInfo.month).padStart(2, '0')}.{String(dateInfo.day).padStart(2, '0')}
                      {currentRecord.dateInfo?.solarTerm && (
                        <span className="ml-2 text-amber-500">{currentRecord.dateInfo.solarTerm}</span>
                      )}
                    </div>

                    {/* 文案 */}
                    <div className="text-gray-700 text-lg leading-relaxed px-2"
                      style={{ fontFamily: '"Caveat", "Ma Shan Zheng", cursive' }}
                    >
                      {currentRecord.quote?.text || '愿每一天都充满阳光'}
                    </div>

                    {/* 作者 */}
                    {currentRecord.quote?.author && (
                      <div className="text-gray-400 text-xs mt-2">
                        — {currentRecord.quote.author}
                      </div>
                    )}
                  </div>
                </div>

                {/* 悬浮操作按钮 */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute -right-16 top-0 flex flex-col gap-2"
                    >
                      <button
                        onClick={handleDownload}
                        className="p-3 bg-white rounded-full shadow-lg hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors"
                        title="下载台历"
                      >
                        <Download size={20} />
                      </button>
                      <button
                        onClick={() => regenerateCalendar()}
                        disabled={isGenerating}
                        className="p-3 bg-white rounded-full shadow-lg hover:bg-green-50 text-gray-600 hover:text-green-600 transition-colors disabled:opacity-50"
                        title="重新生成"
                      >
                        <RefreshCw size={20} className={isGenerating ? 'animate-spin' : ''} />
                      </button>
                      <button
                        onClick={() => setShowThemeSelector(true)}
                        className="p-3 bg-white rounded-full shadow-lg hover:bg-purple-50 text-gray-600 hover:text-purple-600 transition-colors"
                        title="切换主题"
                      >
                        <Sparkles size={20} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                {/* 空白状态 - 相机按钮 */}
                <div className="relative">
                  {/* 相机装饰 - 复古宝丽来相机 */}
                  <motion.div
                    className="w-56 h-56 mx-auto mb-10 relative"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {/* 相机主体外壳 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#e8e4dc] to-[#c4b8a8] rounded-[2rem] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.4)] border border-[#d4ccc0]" />

                    {/* 相机正面面板 */}
                    <div className="absolute inset-3 bg-gradient-to-br from-[#f5f1eb] to-[#e0d8cc] rounded-[1.5rem]" />

                    {/* 镜头外圈 */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-gradient-to-br from-[#2a2a2a] to-[#0a0a0a] shadow-inner border-4 border-[#3a3a3a]">
                      {/* 镜头玻璃反光 */}
                      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23]">
                        {/* 镜头高光 */}
                        <div className="absolute top-3 right-4 w-8 h-8 rounded-full bg-blue-400/20 blur-sm" />
                        <div className="absolute top-6 right-6 w-4 h-4 rounded-full bg-white/30" />
                      </div>
                    </div>

                    {/* 快门按钮 */}
                    <div className="absolute top-6 right-8 w-12 h-8 bg-gradient-to-b from-[#8b7355] to-[#6b5344] rounded-full shadow-md border border-[#a08060]" />
                    <div className="absolute top-5 right-9 w-10 h-4 bg-gradient-to-b from-[#a08060] to-[#8b7355] rounded-full" />

                    {/* 闪光灯 */}
                    <div className="absolute top-8 left-8 w-10 h-10 rounded-lg bg-gradient-to-br from-[#f5f1eb] to-[#e0d8cc] shadow-inner border border-[#d4ccc0]">
                      <div className="absolute inset-2 rounded bg-[#fff8e7] shadow-[0_0_10px_rgba(255,248,231,0.8)]" />
                    </div>

                    {/* 品牌标志 */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[#8b7355] text-xs font-bold tracking-widest" style={{ fontFamily: 'Georgia, serif' }}>
                      DAILY
                    </div>

                    {/* 装饰线条 */}
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-20 h-0.5 bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent" />
                  </motion.div>

                  <motion.button
                    onClick={() => generateCalendar(currentDate)}
                    disabled={isGenerating}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="group relative px-10 py-5 bg-gradient-to-r from-[#8b7355] to-[#6b5344] text-white rounded-full text-xl font-bold shadow-[0_10px_40px_-10px_rgba(139,115,85,0.5)] hover:shadow-[0_15px_50px_-10px_rgba(139,115,85,0.7)] transition-all disabled:opacity-70 border border-[#a08060]"
                  >
                    <span className="flex items-center gap-3">
                      <Camera className={`w-7 h-7 ${isGenerating ? 'animate-pulse' : 'group-hover:rotate-12'} transition-transform`} />
                      {isGenerating ? '生成中...' : '咔嚓！生成今日台历'}
                    </span>
                  </motion.button>

                  {/* 当前主题提示 */}
                  <p className="mt-4 text-gray-500 text-sm">
                    当前主题：<span className="text-amber-600 font-medium">{themeNames[currentTheme]}</span>
                    <button
                      onClick={() => setShowThemeSelector(true)}
                      className="ml-2 text-blue-500 hover:underline"
                    >
                      切换
                    </button>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 生成进度指示器 */}
          {isGenerating && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64">
              <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-amber-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-center text-gray-500 text-sm mt-2">
                {progress < 30 ? '准备中...' : progress < 60 ? 'AI 绘图中...' : '显影中...'}
              </p>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        {currentRecord && (
          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={() => setShowHistory(true)}
              className="px-4 py-2 bg-white rounded-full shadow-md hover:shadow-lg text-gray-600 text-sm transition-shadow flex items-center gap-2"
            >
              <Calendar size={16} />
              历史台历
            </button>
            <button
              onClick={() => setShowThemeSelector(true)}
              className="px-4 py-2 bg-white rounded-full shadow-md hover:shadow-lg text-gray-600 text-sm transition-shadow flex items-center gap-2"
            >
              <ImageIcon size={16} />
              主题风格
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-amber-500 text-white rounded-full shadow-md hover:shadow-lg text-sm transition-shadow"
            >
              回到今天
            </button>
          </div>
        )}
      </div>

      {/* 主题选择器弹窗 */}
      <ThemeSelector
        isOpen={showThemeSelector}
        currentTheme={currentTheme}
        strategy={themeStrategy}
        onThemeChange={handleThemeChange}
        onStrategyChange={setThemeStrategy}
        onClose={() => setShowThemeSelector(false)}
      />

      {/* 历史记录弹窗 */}
      <HistoryCalendar
        isOpen={showHistory}
        records={records}
        currentMonth={historyMonth}
        onMonthChange={setHistoryMonth}
        onSelectDate={handleSelectDate}
        onClose={() => setShowHistory(false)}
      />
    </div>
  );
};

export default DailyCalendarPage;
