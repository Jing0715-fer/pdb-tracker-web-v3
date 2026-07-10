'use client';

import { useState, useEffect, useCallback, useRef, type RefObject } from 'react';
import { toast } from 'sonner';
import { TOUR_STEPS, type TourStepConfig } from '@/components/tour-overlay';

/** Refs for each tour target element. */
export interface TourRefs {
  tourTitleRef: RefObject<HTMLDivElement | null>;
  tourSidebarRef: RefObject<HTMLDivElement | null>;
  tourModeSwitcherRef: RefObject<HTMLDivElement | null>;
  tourSearchRef: RefObject<HTMLDivElement | null>;
  tourPreviewRef: RefObject<HTMLDivElement | null>;
  tourShortcutsRef: RefObject<HTMLButtonElement | null>;
}

export interface UseTourOptions {
  /** `true` once the component has mounted (client-side). */
  mounted: boolean;
  /** Whether the preview panel is currently open; the hook may force it open at step 4. */
  previewOpen: boolean;
  /** Setter to open the preview panel. */
  setPreviewOpen: (open: boolean) => void;
}

export interface UseTourReturn {
  /** Whether the tour overlay is currently visible. */
  tourActive: boolean;
  /** Current zero-based step index. */
  tourStep: number;
  /** Setter forwarded to TourOverlay for Next/Back navigation. */
  setTourStep: (s: number) => void;
  /** Dismisses the tour and records completion in localStorage. */
  finishTour: () => void;
  /** Manually start the tour from step 0. */
  startTour: () => void;
  /** Refs that must be attached to the corresponding DOM elements. */
  refs: TourRefs;
  /** Pre-built `TourStepConfig[]` ready to pass to `<TourOverlay steps={…} />`. */
  steps: TourStepConfig[];
}

export function useTour({ mounted, previewOpen, setPreviewOpen }: UseTourOptions): UseTourReturn {
  // ── State ──
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  // ── Refs ──
  const tourTitleRef = useRef<HTMLDivElement>(null);
  const tourSidebarRef = useRef<HTMLDivElement>(null);
  const tourModeSwitcherRef = useRef<HTMLDivElement>(null);
  const tourSearchRef = useRef<HTMLDivElement>(null);
  const tourPreviewRef = useRef<HTMLDivElement>(null);
  const tourShortcutsRef = useRef<HTMLButtonElement>(null);

  // ── Auto-start on first visit (desktop only) ──
  const tourAutoStartRef = useRef(false);
  useEffect(() => {
    if (!mounted) return;
    if (tourAutoStartRef.current) return;
    tourAutoStartRef.current = true;
    if (window.innerWidth < 768) return;
    try {
      const completed = localStorage.getItem('pdb-tour-completed');
      if (!completed) {
        const timer = setTimeout(() => {
          setTourActive(true);
          setTourStep(0);
        }, 1500);
        return () => clearTimeout(timer);
      }
    } catch {
      /* ignore */
    }
  }, [mounted]);

  // ── Completion handler ──
  const finishTour = useCallback(() => {
    setTourActive(false);
    setTourStep(0);
    try {
      localStorage.setItem('pdb-tour-completed', 'true');
    } catch {
      /* ignore */
    }
    toast('Tour complete!', {
      description: 'Explore the app and use ⌘K anytime to search.',
    });
  }, []);

  // ── Manual start ──
  const startTour = useCallback(() => {
    setTourActive(true);
    setTourStep(0);
  }, []);

  // ── Ensure preview panel is open for the preview step (index 4) ──
  useEffect(() => {
    if (tourActive && tourStep === 4 && !previewOpen) {
      setPreviewOpen(true);
    }
  }, [tourActive, tourStep, previewOpen, setPreviewOpen]);

  // ── Build the steps array, binding each TOUR_STEPS entry to its ref ──
  const steps: TourStepConfig[] = [
    { title: TOUR_STEPS[0].title, description: TOUR_STEPS[0].description, targetRef: tourTitleRef as RefObject<HTMLElement | null> },
    { title: TOUR_STEPS[1].title, description: TOUR_STEPS[1].description, targetRef: tourSidebarRef as RefObject<HTMLElement | null> },
    { title: TOUR_STEPS[2].title, description: TOUR_STEPS[2].description, targetRef: tourModeSwitcherRef as RefObject<HTMLElement | null> },
    { title: TOUR_STEPS[3].title, description: TOUR_STEPS[3].description, targetRef: tourSearchRef as RefObject<HTMLElement | null> },
    { title: TOUR_STEPS[4].title, description: TOUR_STEPS[4].description, targetRef: tourPreviewRef as RefObject<HTMLElement | null> },
    { title: TOUR_STEPS[5].title, description: TOUR_STEPS[5].description, targetRef: tourShortcutsRef as RefObject<HTMLElement | null> },
  ];

  return {
    tourActive,
    tourStep,
    setTourStep,
    finishTour,
    startTour,
    refs: {
      tourTitleRef,
      tourSidebarRef,
      tourModeSwitcherRef,
      tourSearchRef,
      tourPreviewRef,
      tourShortcutsRef,
    },
    steps,
  };
}
