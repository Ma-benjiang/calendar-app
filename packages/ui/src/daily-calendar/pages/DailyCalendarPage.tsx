/**
 * 每日台历主页面
 * 整合所有组件，提供完整的台历功能
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Settings,
  Image as ImageIcon,
  History,
  Share2,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useDailyCalendar } from '../hooks/useDailyCalendar';
import { CalendarCard } from '../components/CalendarCard';
import { ThemeSelector } from '../components/ThemeSelector';
import { HistoryCalendar } from '../components/HistoryCalendar';
import { ThemeType, ThemeStrategyType } from '../types';
import { formatDateKey, isToday } from '../utils/dateUtils';

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
    setManualTheme,
    hasRecordForDate,
    getRecordForDate,
    records,
  } = useDailyCalendar();

  // UI 状态
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(new Date());
  const [showError, setShowError] = useState(false);

  // 错误提示
  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error]);

  // 处理主题切换
  const handleThemeChange = useCallback(async (theme: ThemeType) => {
    await changeTheme(theme);
    setShowThemeSelector(false);
  }, [changeTheme]);

  // 处理策略切换
  const handleStrategyChange = useCallback((strategy: ThemeStrategyType) => {
    setThemeStrategy(strategy);
  }, [setThemeStrategy]);

  // 处理日期选择（从历史日历）
  const handleSelectDate = useCallback((dateKey: string) => {
    const date = new Date(dateKey);
    changeDate(date);
    setShowHistory(false);
  }, [changeDate]);

  // 保存图片
  const handleSave = useCallback(async () => {
    if (!currentRecord) return;

    try {
      const response = await fetch(currentRecord.image.url, {
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `daily-calendar-${currentRecord.date}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to save image:', err);

      // 处理 CORS 错误
      if (err instanceof TypeError && err.message.includes('CORS')) {
        alert('图片下载失败：跨域限制。请尝试右键点击图片另存为。');
      } else if (err instanceof Error) {
        alert(`保存失败：${err.message}`);
      } else {
        alert('保存失败，请重试');
      }
    }
  }, [currentRecord]);

  // 分享功能
  const handleShare = useCallback(async () => {
    if (!currentRecord) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `每日台历 - ${currentRecord.date}`,
          text: currentRecord.quote.text,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      // 复制到剪贴板
      try {
        await navigator.clipboard.writeText(
          `${currentRecord.quote.text} - 每日台历 ${currentRecord.date}`
        );
        alert('文案已复制到剪贴板');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  }, [currentRecord]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50"
    >
      {/* 顶部导航 */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200"
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-3"
          >
            <div className="p-2 bg-amber-100 rounded-xl"
            >
              <Calendar className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900"
              >每日台历</h1>
              <p className="text-xs text-gray-500"
              >用 AI 记录每一天的美好</p>
            </div>
          </div>

          <div className="flex items-center gap-2"
          >
            <button
              onClick={() => setShowHistory(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
              title="历史记录"
            >
              <History className="w-5 h-5 text-gray-600" />
              <span className="hidden sm:inline text-sm text-gray-600"
              >历史</span>
            </button>
            <button
              onClick={() => setShowThemeSelector(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
              title="主题设置"
            >
              <Settings className="w-5 h-5 text-gray-600" />
              <span className="hidden sm:inline text-sm text-gray-600"
              >主题</span>
            </button>
          </div>
        </div>
      </header>

      {/* 错误提示 */}
      <AnimatePresence>
        {showError && error && (
          <motion.div
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <span className="text-sm">{error.message}</span>
            <button
              onClick={() => setShowError(false)}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主内容区 */}
      <main className="max-w-4xl mx-auto px-4 py-8"
      >
        {/* 日期导航栏 */}
        <div className="flex items-center justify-between mb-6"
        >
          <button
            onClick={goToPrevDay}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>

          <div className="text-center"
          >
            <h2 className="text-lg font-medium text-gray-900"
            >
              {currentDate.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h2>
            <p className="text-sm text-gray-500"
            >
              {currentDate.toLocaleDateString('zh-CN', { weekday: 'long' })}
            </p>
          </div>

          <button
            onClick={goToNextDay}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* 台历卡片 */}
        <CalendarCard
          record={currentRecord}
          isLoading={isLoading}
          isGenerating={isGenerating}
          progress={progress}
          onRegenerate={regenerateCalendar}
          onSave={handleSave}
          onShare={handleShare}
          onPrevDay={goToPrevDay}
          onNextDay={goToNextDay}
          onGoToToday={goToToday}
        />

        {/* 快捷操作栏 */}
        <div className="mt-8 flex justify-center gap-4"
        >
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all text-gray-700"
          >
            <History className="w-5 h-5" />
            <span>历史台历</span>
          </button>

          <button
            onClick={regenerateCalendar}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl shadow-sm hover:shadow-md hover:bg-amber-600 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>重新生成</span>
          </button>

          <button
            onClick={() => setShowThemeSelector(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all text-gray-700"
          >
            <Sparkles className="w-5 h-5" />
            <span>切换主题</span>
          </button>
        </div>

        {/* 功能说明 */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4"
            >
              <ImageIcon className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2"
            >AI 生成图片</h3>
            <p className="text-sm text-gray-600"
            >
              每天自动生成独特的艺术风格台历图片，融合日期信息和温暖祝福
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4"
            >
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2"
            >农历与节气</h3>
            <p className="text-sm text-gray-600"
            >
              显示农历日期、二十四节气、传统节日和星座信息
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4"
            >
              <Share2 className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2"
            >保存与分享</h3>
            <p className="text-sm text-gray-600"
            >
              支持下载高清台历图片，一键分享到社交媒体
            </p>
          </div>
        </div>
      </main>

      {/* 主题选择器 */}
      <ThemeSelector
        currentTheme={currentTheme}
        strategy={themeStrategy}
        onThemeChange={handleThemeChange}
        onStrategyChange={handleStrategyChange}
        isOpen={showThemeSelector}
        onClose={() => setShowThemeSelector(false)}
      />

      {/* 历史日历 */}
      <HistoryCalendar
        records={records}
        currentMonth={historyMonth}
        onMonthChange={setHistoryMonth}
        onSelectDate={handleSelectDate}
        selectedDate={currentRecord?.date}
        onClose={() => setShowHistory(false)}
        isOpen={showHistory}
      />
    </div>
  );
};

export default DailyCalendarPage;
