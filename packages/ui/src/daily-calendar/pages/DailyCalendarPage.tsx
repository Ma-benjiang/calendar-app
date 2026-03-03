/**
 * DailyCalendarPage - 极致复古相机风格重构
 * 参考 bao-retro-camera 风格
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  RefreshCw,
  Sparkles,
  Camera,
  RotateCcw,
  History,
  Palette,
  ChevronLeft,
  ChevronRight
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
    isGenerating,
    progress,
    generateCalendar,
    regenerateCalendar,
    deleteCurrentRecord,
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
  const [flash, setFlash] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // 视频流引用
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = useState(false);

  // 初始化相机取景器
  useEffect(() => {
    if (!currentRecord && !isGenerating) {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 400, height: 400, facingMode: "user" } 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setHasCamera(true);
          }
        } catch (err) {
          console.warn("Camera access denied or unavailable");
          setHasCamera(false);
        }
      };
      startCamera();
    }
    
    // 清理相机
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [currentRecord, isGenerating]);

  // 显影效果逻辑
  useEffect(() => {
    if (isGenerating) {
      setDevelopmentStage(0);
      // 触发闪光灯
      setFlash(true);
      setTimeout(() => setFlash(false), 150);
      
      // 播放快门声
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } catch (e) {}
    } else if (currentRecord && !isGenerating) {
      const interval = setInterval(() => {
        setDevelopmentStage(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 2;
        });
      }, 50);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isGenerating, currentRecord]);

  const dateInfo = {
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
    day: currentDate.getDate(),
    weekday: ['日', '一', '二', '三', '四', '五', '六'][currentDate.getDay()]
  };

  // 显影滤镜 - 确保 100% 时 blur 为 0
  const blur = Math.max(0, 10 - (developmentStage / 10));
  const grayscale = Math.max(0, 100 - developmentStage);
  const brightness = 100 + Math.max(0, (100 - developmentStage) / 2);
  const filterString = `blur(${blur <= 0.5 ? 0 : blur}px) grayscale(${grayscale}%) brightness(${brightness}%)`;

  const handleCapture = useCallback(() => {
    if (isGenerating) return;
    console.log("Capture triggered for date:", currentDate);
    generateCalendar(currentDate);
  }, [isGenerating, currentDate, generateCalendar]);

  const handleThemeChange = useCallback((theme: ThemeType) => {
    changeTheme(theme);
    setShowThemeSelector(false);
  }, [changeTheme]);

  return (
    <div className="flex flex-col items-center bg-[#f0ede9] overflow-y-auto relative w-full h-full font-serif pb-12">
      {/* 闪光灯遮罩 */}
      <AnimatePresence>
        {flash && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-[100] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* 背景装饰纹理 */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper-fibers.png")' }} />

      {/* 顶部控制栏 */}
      <div className="w-full max-w-5xl flex items-center justify-between px-8 py-6 z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-white/50 backdrop-blur-sm p-1 rounded-full border border-black/5">
            <button onClick={goToPrevDay} className="p-2 hover:bg-white rounded-full transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center px-2">
              <div className="text-sm font-bold tracking-tighter">{dateInfo.year} / {dateInfo.month} / {dateInfo.day}</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-black/40">{dateInfo.weekday}</div>
            </div>
            <button onClick={goToNextDay} className="p-2 hover:bg-white rounded-full transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowHistory(true)} className="p-2.5 bg-white/80 rounded-full shadow-sm border border-black/5 hover:bg-white transition-all group">
            <History size={18} className="group-hover:rotate-[-12deg] transition-transform" />
          </button>
          <button onClick={() => setShowThemeSelector(true)} className="p-2.5 bg-white/80 rounded-full shadow-sm border border-black/5 hover:bg-white transition-all group">
            <Palette size={18} className="group-hover:scale-110 transition-transform" />
          </button>
          <button onClick={goToToday} className="px-5 py-2 bg-black text-white rounded-full text-xs font-bold tracking-widest uppercase hover:bg-black/80 transition-colors shadow-lg">
            Today
          </button>
        </div>
      </div>

      {/* 主展态区 */}
      <div className="flex-1 w-full flex items-center justify-center relative min-h-[600px]">
        <AnimatePresence mode="wait">
          {!currentRecord ? (
            <motion.div
              key="camera-state"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -100 }}
              className="relative w-[500px] h-[500px] flex items-center justify-center"
            >
              {/* 复古相机主体容器 */}
              <div className="relative w-full h-full">
                {/* 复古相机底图 */}
                <img 
                  src="https://s.baoyu.io/images/retro-camera.webp" 
                  alt="Retro Camera"
                  className="w-full h-full object-contain z-20 relative pointer-events-none drop-shadow-[0_35px_35px_rgba(0,0,0,0.25)]"
                />

                {/* 实时取景器 (嵌在镜头里) */}
                <div className="absolute z-10 overflow-hidden rounded-full bg-[#1a1a1a]"
                     style={{
                       bottom: '35.5%',
                       left: '62.2%',
                       transform: 'translateX(-50%)',
                       width: '25%',
                       height: '25%',
                       boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
                     }}>
                  {hasCamera ? (
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover scale-x-[-1] opacity-80" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-black">
                      <Sparkles className="text-white/20 animate-pulse" />
                    </div>
                  )}
                  {/* 镜头玻璃质感反光 */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none" />
                </div>

                {/* 实体拍照按钮 (热区) - 极大化热区并提升层级 */}
                <motion.div 
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleCapture}
                  className="absolute z-[60] rounded-full cursor-pointer flex items-center justify-center group"
                  style={{
                    bottom: '38%',
                    left: '15%',
                    width: '16%',
                    height: '16%'
                  }}
                  title="点击快门拍照"
                >
                  <div className="w-4 h-4 bg-white/0 group-hover:bg-white/20 rounded-full transition-colors" />
                </motion.div>
              </div>

              {/* 引导文案与大按钮 */}
              <div className="absolute -bottom-16 left-0 right-0 text-center z-50">
                <p className="text-black/30 text-[10px] tracking-[0.4em] uppercase mb-6">Click shutter to capture the day</p>
                <motion.button
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isGenerating}
                  onClick={handleCapture}
                  className="px-10 py-4 bg-white rounded-full shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1)] text-xs font-bold tracking-[0.2em] uppercase border border-black/5 hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.15)] transition-all flex items-center gap-3 mx-auto"
                >
                  <Camera size={16} className={isGenerating ? 'animate-spin' : ''} />
                  {isGenerating ? 'Processing...' : 'Capture Today'}
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="polaroid-state"
              initial={{ y: 400, rotate: -10, opacity: 0 }}
              animate={{ y: 0, rotate: 2, opacity: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 100 }}
              className="relative group cursor-grab active:cursor-grabbing"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {/* 拍立得照片卡片 */}
              <div className="bg-[#fdfbf7] p-4 pb-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border border-white/50 relative">
                {/* 装饰图钉 */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-red-500/80 rounded-full border-4 border-white/30 shadow-md z-30" />
                
                {/* 图像区域 */}
                <div className="w-[320px] h-[400px] bg-[#111] overflow-hidden relative shadow-inner">
                  <img
                    src={currentRecord.image.url}
                    alt="Captured moment"
                    className="w-full h-full object-cover"
                    style={{ filter: filterString }}
                  />
                  {/* 显影中的进度条 */}
                  {developmentStage < 100 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                      <div className="h-full bg-white/40 transition-all duration-300" style={{ width: `${developmentStage}%` }} />
                    </div>
                  )}
                  {/* 相纸质感反光 */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.08] pointer-events-none" />
                </div>

                {/* 底部文案区 */}
                <div className="mt-8 text-center px-4">
                  <div className="text-[10px] tracking-[0.3em] text-black/30 uppercase mb-4 font-sans">
                    {dateInfo.year} . {String(dateInfo.month).padStart(2, '0')} . {String(dateInfo.day).padStart(2, '0')}
                  </div>
                  <div className="text-[#333] text-xl leading-relaxed" 
                       style={{ fontFamily: '"Ma Shan Zheng", "Caveat", cursive' }}>
                    {currentRecord.quote?.text || "今天也是美好的一天"}
                  </div>
                </div>
              </div>

              {/* 悬浮操作按钮 */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="absolute -right-16 top-0 flex flex-col gap-3"
                  >
                    <button className="p-3 bg-white rounded-full shadow-lg border border-black/5 hover:bg-black hover:text-white transition-all group">
                      <Download size={18} />
                    </button>
                    <button onClick={() => regenerateCalendar()} className="p-3 bg-white rounded-full shadow-lg border border-black/5 hover:bg-black hover:text-white transition-all group">
                      <RotateCcw size={18} className={isGenerating ? 'animate-spin' : ''} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 重拍引导 */}
              <div className="absolute -bottom-20 left-0 right-0 text-center opacity-40 hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => deleteCurrentRecord()}
                  className="text-[10px] tracking-[0.3em] uppercase underline underline-offset-4"
                >
                  Discard and Return to Camera
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
        onSelectDate={(key) => { changeDate(new Date(key)); setShowHistory(false); }}
        onClose={() => setShowHistory(false)}
      />
    </div>
  );
};

export default DailyCalendarPage;
