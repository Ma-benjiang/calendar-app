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
  // RefreshCw - reserved for future use
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useDailyCalendar } from '../hooks/useDailyCalendar';
import { CalendarCard } from '../components/CalendarCard';
import { ThemeSelector } from '../components/ThemeSelector';
import { HistoryCalendar } from '../components/HistoryCalendar';
import { ThemeType, ThemeStrategyType } from '../types';

export const DailyCalendarPage: React.FC = () => {
  const {
    currentRecord,
    currentDate,
    isLoading,
    isGenerating,
    progress,
    error,
    // generateCalendar - reserved for future use
    regenerateCalendar,
    changeTheme,
    changeDate,
    goToToday,
    goToPrevDay,
    goToNextDay,
    currentTheme,
    themeStrategy,
    setThemeStrategy,
    // setManualTheme - reserved for future use
    // hasRecordForDate - reserved for future use
    // getRecordForDate - reserved for future use
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
  }, [error]);

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

  // 处理策略变更
  const handleStrategyChange = useCallback((strategy: ThemeStrategyType) => {
    setThemeStrategy(strategy);
  }, [setThemeStrategy]);

  // 格式化日期显示
  const formatDateDisplay = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日 周${weekday}`;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-amber-100">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* 左侧：标题和日期 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-6 h-6 text-amber-600" />
                <h1 className="text-xl font-bold text-gray-900">每日台历</h1>
              </div>
              <div className="h-6 w-px bg-gray-200" />
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPrevDay}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  disabled={isGenerating}
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-base font-medium text-gray-800 min-w-[140px] text-center">
                  {formatDateDisplay(currentDate)}
                </span>
                <button
                  onClick={goToNextDay}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  disabled={isGenerating}
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              >
                今天
              </button>
              <div className="h-6 w-px bg-gray-200" />
              <button
                onClick={() => setShowThemeSelector(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                主题
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <History className="w-4 h-4" />
                历史
              </button>
              <button
                onClick={regenerateCalendar}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 rounded-lg transition-colors"
              >
                {isGenerating ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    重新生成
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 错误提示 */}
      <AnimatePresence>
        {showError && error && (
          <motion.div
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span>{error.message}</span>
              <button
                onClick={() => setShowError(false)}
                className="ml-2 text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主内容区 */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：台历卡片 */}
          <div className="lg:col-span-2">
            {currentRecord ? (
              <CalendarCard
                record={currentRecord}
                isLoading={isLoading || isGenerating}
                progress={progress}
                onRegenerate={regenerateCalendar}
              />
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
                  <ImageIcon className="w-10 h-10 text-amber-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  暂无台历
                </h3>
                <p className="text-gray-500 mb-6">
                  点击下方按钮生成今日台历
                </p>
                <button
                  onClick={regenerateCalendar}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:bg-gray-300 transition-colors"
                >
                  {isGenerating ? '生成中...' : '生成台历'}
                </button>
              </div>
            )}
          </div>

          {/* 右侧：信息面板 */}
          <div className="space-y-6">
            {/* 当前主题 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
                当前主题
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xl">
                  {currentTheme === 'vintage' && '📷'}
                  {currentTheme === 'minimal' && '◻️'}
                  {currentTheme === 'nature' && '🌿'}
                  {currentTheme === 'art' && '🎨'}
                  {currentTheme === 'zen' && '🍃'}
                  {currentTheme === 'cosmic' && '✨'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {currentTheme === 'vintage' && '复古胶片'}
                    {currentTheme === 'minimal' && '极简现代'}
                    {currentTheme === 'nature' && '自然风景'}
                    {currentTheme === 'art' && '艺术插画'}
                    {currentTheme === 'zen' && '东方禅意'}
                    {currentTheme === 'cosmic' && '宇宙星空'}
                  </p>
                  <p className="text-sm text-gray-500">
                    策略: {themeStrategy === 'manual' && '手动选择'}
                    {themeStrategy === 'seasonal' && '季节自动'}
                    {themeStrategy === 'daily-random' && '每日随机'}
                    {themeStrategy === 'ai-recommended' && 'AI推荐'}
                  </p>
                </div>
              </div>
            </div>

            {/* 生成进度 */}
            {(isLoading || isGenerating) && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
                  生成进度
                </h3>
                <div className="space-y-2">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-amber-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 text-right">{progress}%</p>
                </div>
              </div>
            )}

            {/* 快捷操作 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
                快捷操作
              </h3>
              <div className="space-y-3">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                  <Share2 className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">分享台历</span>
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <History className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">查看历史</span>
                  <span className="ml-auto text-sm text-gray-400">
                    {records.size} 张
                  </span>
                </button>
              </div>
            </div>

            {/* 使用提示 */}
            <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
              <h3 className="text-sm font-medium text-amber-800 mb-2">
                💡 使用提示
              </h3>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• 每天自动生成一张独特台历</li>
                <li>• 支持 6 种不同主题风格</li>
                <li>• 可查看和重新生成历史台历</li>
                <li>• 文案根据日期智能匹配</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* 主题选择器弹窗 */}
      <ThemeSelector
        isOpen={showThemeSelector}
        currentTheme={currentTheme}
        currentStrategy={themeStrategy}
        onThemeChange={handleThemeChange}
        onStrategyChange={handleStrategyChange}
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
