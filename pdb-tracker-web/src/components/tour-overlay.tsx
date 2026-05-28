'use client';

import { useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

// ─── Tour Types & Config ──────────────────────────────────────────────────────

export interface TourStepConfig {
  targetRef: React.RefObject<HTMLElement | null>;
  title: string;
  description: string;
}

export const TOUR_STEPS: Omit<TourStepConfig, 'targetRef'>[] = [
  {
    title: 'Welcome to PDB Tracker',
    description: 'This dashboard tracks protein structure publications. Browse by week or search by UniProt ID for detailed analysis.',
  },
  {
    title: 'Sidebar Navigation',
    description: 'Use the sidebar to switch between weekly updates and evaluation modes. All your tracked proteins appear here.',
  },
  {
    title: 'Mode Switcher',
    description: 'Toggle between Weekly mode (latest structures) and Evaluation mode (BLAST results and impact factor analysis).',
  },
  {
    title: 'Search & Filters',
    description: 'Search by PDB ID, UniProt, or gene name. Use filters to narrow down by method, resolution, or impact factor.',
  },
  {
    title: 'Structure Preview',
    description: 'Click any structure to see detailed information including sequences, ligands, and cross-references.',
  },
  {
    title: 'Keyboard Shortcuts',
    description: 'Press ? to toggle the shortcuts overlay. Use / to focus search, Escape to close panels.',
  },
];

// ─── Tour Overlay ──────────────────────────────────────────────────────────────

export function TourOverlay({
  tourActive,
  tourStep,
  setTourStep,
  finishTour,
  steps,
}: {
  tourActive: boolean;
  tourStep: number;
  setTourStep: (s: number) => void;
  finishTour: () => void;
  steps: TourStepConfig[];
}) {
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [positionAbove, setPositionAbove] = useState(false);
  const rafRef = useRef<number | null>(null);

  const currentStep = steps[tourStep];
  const isLastStep = tourStep === steps.length - 1;

  const updatePosition = useCallback(() => {
    if (!currentStep?.targetRef?.current) {
      setSpotlightRect(null);
      return;
    }
    const el = currentStep.targetRef.current;
    const rect = el.getBoundingClientRect();
    setSpotlightRect(rect);

    const tooltipWidth = 280;
    const tooltipHeight = 200;
    const gap = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const above = spaceBelow < tooltipHeight + gap && spaceAbove > spaceBelow;
    setPositionAbove(above);

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(8, Math.min(left, vw - tooltipWidth - 8));

    let top: number;
    if (above) {
      top = rect.top - gap - tooltipHeight;
    } else {
      top = rect.bottom + gap;
    }
    top = Math.max(8, top);

    setTooltipPos({ top, left });
  }, [currentStep]);

  useLayoutEffect(() => {
    if (!tourActive) return;
    const raf = requestAnimationFrame(() => updatePosition());
    const handleResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePosition);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tourActive, updatePosition]);

  useEffect(() => {
    if (tourActive) {
      const raf = requestAnimationFrame(() => updatePosition());
      return () => cancelAnimationFrame(raf);
    }
  }, [tourActive, tourStep, updatePosition]);

  if (!tourActive || !currentStep || !spotlightRect) return null;

  const stepConfig = TOUR_STEPS[tourStep];

  return createPortal(
    <AnimatePresence mode="wait">
      <motion.div
        key={`tour-step-${tourStep}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] pointer-events-none"
      >
        <div
          className="absolute inset-0"
          style={{
            boxShadow: spotlightRect
              ? `0 0 0 9999px rgba(0, 0, 0, 0.4)`
              : undefined,
          }}
        />

        <div
          className="absolute rounded-lg border-2 border-claude-accent animate-[pulse_2s_ease-in-out_infinite] pointer-events-none"
          style={{
            top: spotlightRect.top - 4,
            left: spotlightRect.left - 4,
            width: spotlightRect.width + 8,
            height: spotlightRect.height + 8,
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: positionAbove ? 6 : -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: positionAbove ? 6 : -6 }}
          transition={{ duration: 0.2 }}
          className="absolute bg-claude-surface dark:bg-[#242220] border border-claude-border dark:border-[#3d3832] rounded-xl shadow-2xl p-4 max-w-[280px] pointer-events-auto"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
          }}
        >
          <button
            onClick={finishTour}
            className="absolute top-3 right-3 text-[10px] text-claude-text-muted hover:text-claude-text transition-colors"
          >
            Skip
          </button>

          <div className="flex items-start gap-2.5 mb-2">
            <span className="h-5 w-5 rounded-full bg-claude-accent text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {tourStep + 1}
            </span>
            <div className="min-w-0 pr-8">
              <div className="text-sm font-semibold text-claude-text leading-tight">
                {stepConfig.title}
              </div>
            </div>
          </div>

          <p className="text-xs text-claude-text-secondary leading-relaxed mb-4 pl-[30px]">
            {stepConfig.description}
          </p>

          <div className="flex items-center gap-1.5 pl-[30px] mb-3">
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                  i === tourStep
                    ? 'bg-claude-accent'
                    : 'border border-claude-text-muted/40 bg-transparent'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 pl-[30px]">
            {tourStep > 0 && (
              <button
                onClick={() => setTourStep(tourStep - 1)}
                className="px-3 py-1.5 rounded-md text-[11px] font-medium text-claude-text-secondary hover:text-claude-text hover:bg-claude-border-light dark:hover:bg-claude-border transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (isLastStep) {
                  finishTour();
                } else {
                  setTourStep(tourStep + 1);
                }
              }}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                isLastStep
                  ? 'bg-claude-accent text-white hover:bg-claude-accent-hover'
                  : 'bg-claude-accent text-white hover:bg-claude-accent-hover'
              }`}
            >
              {isLastStep ? 'Get Started' : 'Next'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}