'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

interface ScrollFabProps {
  scrollProgress: number;
  onScroll: (toTop: boolean) => void;
  visible: boolean;
}

export default function ScrollFab({ scrollProgress, onScroll, visible }: ScrollFabProps) {
  // SVG circular progress dimensions
  const size = 48;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference * (1 - scrollProgress / 100);

  // Show the FAB when scroll progress indicates meaningful scrolling (> ~3% ≈ 300px+)
  const shouldShow = visible && scrollProgress > 3;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => onScroll(true)}
          className="fixed bottom-20 right-6 z-50 w-12 h-12 rounded-full glass-enhanced shadow-lg hover:shadow-xl flex items-center justify-center hover:scale-110 transition-all duration-200 btn-press-subtle no-print cursor-pointer"
          title="Scroll to top"
          aria-label="Scroll to top"
        >
          {/* SVG circular progress ring */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox={`0 0 ${size} ${size}`}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="scroll-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
            {/* Background track circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-black/5 dark:text-white/10"
            />
            {/* Progress arc circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="url(#scroll-progress-gradient)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={progressOffset}
              className="transition-[stroke-dashoffset] duration-150 ease-linear"
            />
          </svg>
          {/* Arrow up icon */}
          <ArrowUp className="h-5 w-5 text-foreground/70" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
