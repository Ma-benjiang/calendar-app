/**
 * DailyCalendarPage - 极致复古相机风格 & 顶级台历排版重构
 * 支持：后台挂机生图、动态摄像头控制
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  RefreshCw,
  Camera,
  RotateCcw,
  History,
  Palette,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  CameraOff
} from 'lucide-react';
import { useDailyCalendar } from '../hooks/useDailyCalendar';
import { ThemeSelector } from '../components/ThemeSelector';
import { HistoryCalendar } from '../components/HistoryCalendar';
import { ThemeType } from '../types';
import { getDaysInMonth, getFirstDayOfMonth, getCalendarDateInfo } from '../utils/dateUtils';

interface DailyCalendarPageProps {
  isVisible?: boolean; // 新增：控制当前页面是否可见
}

export const DailyCalendarPage: React.FC<DailyCalendarPageProps> = ({ isVisible = true }) => {
  const {
    currentRecord,
    currentDate,
    isGenerating,
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

  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(new Date());
  const [developmentStage, setDevelopmentStage] = useState(100);
  const [flash, setFlash] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [img2imgEnabled, setImg2imgEnabled] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = useState(false);

  // 初始化相机取景器 - 只有在页面可见且没有照片时开启
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1024, height: 1024, facingMode: "user" } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasCamera(true);
        }
      } catch (err) {
        setHasCamera(false);
      }
    };

    if (isVisible && !currentRecord && !isGenerating) {
      startCamera();
    } else {
      // 不可见或有照片时，关闭摄像头省电/隐私
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
        setHasCamera(false);
      }
    }

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [currentRecord, isGenerating, isVisible]);

  useEffect(() => {
    if (isGenerating) {
      setDevelopmentStage(0);
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

  const dateInfo = useMemo(() => {
    const weekdays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const liveDateInfo = getCalendarDateInfo(currentDate);
    return {
      year: currentDate.getFullYear(),
      month: months[currentDate.getMonth()],
      day: String(currentDate.getDate()).padStart(2, '0'),
      weekday: weekdays[currentDate.getDay()],
      lunar: liveDateInfo.lunarDate ? `${liveDateInfo.lunarDate.month}${liveDateInfo.lunarDate.day}` : '',
      solarTerm: liveDateInfo.special?.solarTermName || '',
      holiday: liveDateInfo.special?.holidayName || ''
    };
  }, [currentDate]);

  const miniMonthGrid = useMemo(() => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const totalDays = getDaysInMonth(year, month);
      const firstDayDate = new Date(year, month, 1);
      const firstDay = firstDayDate.getDay();
      const days = [];
      for (let i = 0; i < firstDay; i++) days.push(null);
      for (let i = 1; i <= totalDays; i++) days.push(i);
      return days;
    } catch (e) {
      return [];
    }
  }, [currentDate]);

  const filterString = useMemo(() => {
    const blurAmount = developmentStage < 30 ? 15 * (1 - developmentStage / 30) : Math.max(0, 5 * (1 - (developmentStage - 30) / 70));
    const grayscale = Math.max(0, 100 - developmentStage);
    const brightness = 25 + (developmentStage * 0.8);
    const contrast = 40 + (developmentStage * 0.7);
    return `blur(${developmentStage === 100 ? 0 : blurAmount}px) grayscale(${grayscale}%) brightness(${brightness}%) contrast(${contrast}%)`;
  }, [developmentStage]);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !hasCamera || !img2imgEnabled) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1024;
      canvas.height = videoRef.current.videoHeight || 1024;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.9);
    } catch (e) {
      return null;
    }
  }, [hasCamera, img2imgEnabled]);

  const triggerShutter = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), 450);
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
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
  }, []);

  const handleCapture = useCallback(() => {
    if (isGenerating) return;
    triggerShutter();
    const frame = captureFrame();
    generateCalendar(currentDate, undefined, frame || undefined);
  }, [isGenerating, currentDate, generateCalendar, captureFrame, triggerShutter]);

  const handleThemeChange = useCallback((theme: ThemeType) => {
    changeTheme(theme);
    setShowThemeSelector(false);
  }, [changeTheme]);

  const isTodayDate = useMemo(() => {
    const today = new Date();
    return currentDate.getDate() === today.getDate() &&
           currentDate.getMonth() === today.getMonth() &&
           currentDate.getFullYear() === today.getFullYear();
  }, [currentDate]);

  return (
    <div className="flex flex-col items-center bg-[#f0ede9] overflow-y-auto relative w-full h-full font-serif pb-12">
      <AnimatePresence>
        {flash && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
          >
            <motion.div 
              initial={{ scale: 3, rotate: 0 }} animate={{ scale: 0, rotate: 120 }}
              transition={{ duration: 0.3, ease: "circIn" }}
              className="w-[250vmax] h-[200vmax] rounded-full border-[100vmax] border-black flex items-center justify-center"
            >
              <div className="w-20 h-20 bg-transparent" />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.4, times: [0, 0.4, 1] }}
              className="absolute inset-0 bg-white"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper-fibers.png")' }} />

      <div className="w-full max-w-5xl flex items-center justify-between px-8 py-6 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-white/50 backdrop-blur-sm p-1 rounded-full border border-black/5">
            <button onClick={goToPrevDay} className="p-2 hover:bg-white rounded-full transition-colors"><ChevronLeft size={18} /></button>
            <div className="text-center px-4 min-w-[140px]">
              <div className="text-sm font-bold tracking-tighter">{currentDate.getFullYear()} / {currentDate.getMonth()+1} / {dateInfo.day}</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-black/40 font-bold">{dateInfo.weekday}</div>
            </div>
            <button 
              onClick={goToNextDay} 
              disabled={isTodayDate || isGenerating}
              className={`p-2 rounded-full transition-all ${isTodayDate ? 'opacity-5 cursor-not-allowed scale-75' : 'hover:bg-white active:scale-90'}`}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowHistory(true)} className="p-2.5 bg-white/80 rounded-full shadow-sm border border-black/5 hover:bg-white transition-all group"><History size={18} /></button>
          <button onClick={() => setShowThemeSelector(true)} className="p-2.5 bg-white/80 rounded-full shadow-sm border border-black/5 hover:bg-white transition-all group"><Palette size={18} /></button>
          <button onClick={goToToday} className="px-5 py-2 bg-black text-white rounded-full text-xs font-bold tracking-widest uppercase hover:bg-black/80 transition-colors shadow-lg active:scale-95">Today</button>
        </div>
      </div>

      <div className="flex-1 w-full flex items-center justify-center relative min-h-[750px]">
        <div className={`relative transition-all duration-1000 ${currentRecord ? 'scale-75 opacity-20 blur-sm translate-y-[-100px]' : 'scale-100 opacity-100 blur-0'}`}>
          {!currentRecord && !isGenerating && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-black/5 z-50 cursor-pointer" onClick={() => setImg2imgEnabled(!img2imgEnabled)}>
              {img2imgEnabled ? <><Zap size={14} className="text-amber-500 fill-amber-500" /><span className="text-[10px] tracking-[0.2em] uppercase font-bold text-black">AI Vision On</span></> : <><CameraOff size={14} className="text-gray-400" /><span className="text-[10px] tracking-[0.2em] uppercase font-bold text-gray-400">Pure Imagination</span></>}
            </motion.div>
          )}
          <div className="relative w-[500px] h-[500px]">
            <img src="https://s.baoyu.io/images/retro-camera.webp" alt="Camera" className="w-full h-full object-contain relative z-10 pointer-events-none drop-shadow-2xl" />
            <div className="absolute z-0 overflow-hidden rounded-full bg-[#1a1a1a]" style={{ bottom: '35.5%', left: '62.2%', transform: 'translateX(-50%)', width: '25%', height: '25%', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)' }}>
              {hasCamera && !isGenerating ? <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1] opacity-80" /> : <div className="w-full h-full flex flex-col items-center justify-center bg-black relative">{isGenerating ? <><div className="w-8 h-8 border-2 border-white/5 border-t-white/40 rounded-full animate-spin mb-2" /><div className="absolute inset-0 bg-blue-500/10 animate-pulse pointer-events-none" /></> : <Sparkles className="text-white/20" />}</div>}
              {hasCamera && img2imgEnabled && !isGenerating && <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full animate-pulse pointer-events-none" />}
            </div>
            {!currentRecord && !isGenerating && <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleCapture} className="absolute z-20 rounded-full cursor-pointer" style={{ bottom: '38%', left: '15%', width: '16%', height: '16%' }} />}
          </div>
          {!currentRecord && !isGenerating && (
            <div className="absolute -bottom-16 left-0 right-0 text-center">
              <p className="text-black/30 text-[10px] tracking-[0.4em] uppercase mb-6">Click shutter to capture the day</p>
              <button onClick={handleCapture} className="px-10 py-4 bg-white rounded-full shadow-lg text-xs font-bold tracking-widest uppercase flex items-center gap-3 mx-auto border border-black/5 hover:bg-gray-50 transition-all">
                <Camera size={16} /> Capture Today
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {currentRecord && (
            <motion.div
              key={currentRecord.id}
              initial={{ y: 400, scale: 0.6, opacity: 0, rotate: -5 }}
              animate={{ y: 0, scale: 1, opacity: 1, rotate: 0 }}
              exit={{ y: 600, opacity: 0, scale: 0.5 }}
              transition={{ y: { type: 'spring', damping: 25, stiffness: 40, mass: 1.5 }, opacity: { duration: 0.4 } }}
              className="absolute z-30 group"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div className="bg-[#fdfbf7] w-[420px] p-6 pb-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border border-white/60 relative flex flex-col gap-6">
                <div className="flex justify-between items-baseline border-b border-black/5 pb-4">
                  <div className="text-[14px] font-black tracking-widest text-black/80">{dateInfo.month} {dateInfo.year}</div>
                  <div className="text-[10px] tracking-[0.3em] text-black/30 font-bold">{dateInfo.weekday}</div>
                </div>
                <div className="w-full h-[320px] bg-[#111] overflow-hidden relative shadow-inner rounded-sm">
                  <img src={currentRecord.image.url} alt="Daily Art" className="w-full h-full object-cover" style={{ filter: filterString }} />
                  {developmentStage < 100 && <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10"><div className="h-full bg-white/40 transition-all duration-300" style={{ width: `${developmentStage}%` }} /></div>}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.05] pointer-events-none" />
                </div>
                <div className="flex items-start gap-6 relative">
                  <div className="text-[84px] leading-[0.8] font-black tracking-tighter text-black/90 select-none">{dateInfo.day}</div>
                  <div className="flex flex-col gap-1 pt-1">
                    <div className="text-[12px] font-bold text-black/60 tracking-wider">{dateInfo.lunar}</div>
                    {(dateInfo.solarTerm || dateInfo.holiday) && (
                      <div className="px-2 py-0.5 bg-black text-white text-[9px] font-black tracking-widest uppercase rounded-sm inline-block w-fit">
                        {dateInfo.holiday || dateInfo.solarTerm}
                      </div>
                    )}
                  </div>
                  <div className="ml-auto grid grid-cols-7 gap-x-1 gap-y-0.5 opacity-[0.25] scale-90 origin-top-right transition-opacity hover:opacity-100">
                    {['S','M','T','W','T','F','S'].map((d, i) => <div key={`${d}-${i}`} className="text-[7px] font-black text-center">{d}</div>)}
                    {miniMonthGrid.map((d, i) => (
                      <div 
                        key={i} 
                        className={`text-[7px] text-center w-3 h-3 flex items-center justify-center transition-all ${
                          d === currentDate.getDate() ? 'bg-black text-white rounded-full font-bold' : 
                          d ? 'cursor-pointer hover:bg-black/10 rounded-full' : ''
                        }`}
                        onClick={(e) => {
                          if (d) {
                            e.stopPropagation();
                            changeDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), d));
                          }
                        }}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-2 border-t border-black/5 pt-6 text-center">
                  <div className="text-[#333] text-xl leading-relaxed italic" style={{ fontFamily: '"Ma Shan Zheng", cursive' }}>{currentRecord.quote?.text}</div>
                </div>
                <div className="absolute left-[-8px] top-1/2 -translate-y-1/2 flex flex-col gap-4">
                  {[1,2,3].map(i => <div key={i} className="w-2 h-2 bg-[#e0dcd5] rounded-full shadow-inner border border-black/5" />)}
                </div>
              </div>
              <AnimatePresence>
                {isHovered && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute -right-16 top-0 flex flex-col gap-3">
                    <button className="p-3 bg-white rounded-full shadow-lg border border-black/5 hover:bg-black hover:text-white transition-all"><Download size={18} /></button>
                    <button onClick={() => { triggerShutter(); regenerateCalendar(captureFrame() || undefined); }} className="p-3 bg-white rounded-full shadow-lg border border-black/5 hover:bg-black hover:text-white transition-all"><RotateCcw size={18} className={isGenerating ? 'animate-spin' : ''} /></button>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="absolute -bottom-20 left-0 right-0 text-center opacity-40 hover:opacity-100 transition-opacity">
                <button onClick={() => deleteCurrentRecord()} className="text-[10px] tracking-[0.3em] uppercase underline underline-offset-4">Discard and Return to Camera</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isGenerating && (
          <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center z-40 pointer-events-none">
            <p className="text-[10px] font-bold tracking-[0.4em] uppercase text-black/40 animate-pulse notranslate" translate="no">
              {img2imgEnabled && hasCamera ? '正在重新构思你的瞬间...' : '正在将你的想法转化为现实...'}
            </p>
          </div>
        )}
      </div>

      <ThemeSelector isOpen={showThemeSelector} currentTheme={currentTheme} strategy={themeStrategy} onThemeChange={handleThemeChange} onStrategyChange={setThemeStrategy} onClose={() => setShowThemeSelector(false)} />
      <HistoryCalendar
        isOpen={showHistory} records={records} currentMonth={historyMonth} onMonthChange={setHistoryMonth}
        onSelectDate={(key) => { const [y, m, d] = key.split('-').map(Number); changeDate(new Date(y, m - 1, d)); setShowHistory(false); }}
        onClose={() => setShowHistory(false)}
      />
    </div>
  );
};

export default DailyCalendarPage;
