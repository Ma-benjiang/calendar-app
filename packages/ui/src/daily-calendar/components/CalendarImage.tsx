/**
 * 台历图片组件
 * 显示 AI 生成的台历图片，支持加载状态和动画
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CalendarImageProps {
  imageUrl: string;
  alt: string;
  isLoading?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export const CalendarImage: React.FC<CalendarImageProps> = ({
  imageUrl,
  alt,
  isLoading = false,
  onLoad,
  onError,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // 重置状态当图片 URL 改变时
    setLoaded(false);
    setError(false);
  }, [imageUrl]);

  const handleLoad = () => {
    setLoaded(true);
    setError(false);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    setLoaded(false);
    onError?.();
  };

  return (
    <div className="relative w-full h-full bg-gray-100">
      {/* 加载占位 */}
      <AnimatePresence>
        {!loaded && !error && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-gray-100"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col items-center">
              <motion.div
                className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <span className="mt-2 text-sm text-gray-500">加载中...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 错误状态 */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-gray-100"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-center">
              <svg
                className="w-12 h-12 mx-auto mb-2 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm text-gray-500">图片加载失败</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 实际图片 */}
      <motion.img
        src={imageUrl}
        alt={alt}
        className="w-full h-full object-cover"
        initial={{ opacity: 0, filter: 'blur(10px)' }}
        animate={{
          opacity: loaded ? 1 : 0,
          filter: loaded ? 'blur(0px)' : 'blur(10px)',
        }}
        transition={{ duration: 0.5 }}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />

      {/* 光泽效果 */}
      {loaded && (
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none" />
      )}
    </div>
  );
};

export default CalendarImage;
