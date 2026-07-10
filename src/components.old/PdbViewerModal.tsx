'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { PdbStructureViewer } from '@/components/PdbStructureViewer';
import { X, Loader2, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdbViewerModalProps {
  pdbId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PdbViewerModal({ pdbId, open, onOpenChange }: PdbViewerModalProps) {
  // Delay rendering the viewer until the Dialog animation completes.
  // This ensures the container has proper dimensions for Mol* initialization.
  const openTimeRef = useRef<number>(0);
  const [viewerReadyKey, setViewerReadyKey] = useState(0);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      openTimeRef.current = 0;
      setViewerReadyKey(0);
    }
    onOpenChange(nextOpen);
  }, [onOpenChange]);

  // Always render viewer when open — Dialog handles its own animation
  const viewerReady = open;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[92vw] max-h-[92vh] p-0 gap-0 overflow-hidden border border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#1a1917] rounded-xl"
      >
        <DialogTitle className="sr-only">
          3D Structure Viewer — {pdbId}
        </DialogTitle>
        <div className="flex flex-col h-[88vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220] flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-claude-accent uppercase tracking-wider">
                {pdbId}
              </span>
              <span className="text-xs text-claude-text-muted">3D Structure Viewer</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
              className="h-7 w-7 p-0 rounded-full bg-claude-border-light/80 dark:bg-[#2b2926]/80 hover:bg-red-100 dark:hover:bg-red-900/30 text-claude-text-muted hover:text-red-500 transition-all duration-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {/* Body: Side-by-side layout */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {pdbId && viewerReady ? (
              <PdbStructureViewer
                pdbId={pdbId}
                layout="side-by-side"
                className="h-full border-0 rounded-none"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Box className="h-8 w-8 text-claude-accent animate-pulse" />
                  <div className="flex items-center gap-2 text-xs text-claude-text-muted">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Initializing 3D Viewer...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Thumbnail Preview Card ──────────────────────────────────────────────────

interface PdbThumbnailPreviewProps {
  pdbId: string;
  title?: string;
  onClick: () => void;
}

export function PdbThumbnailPreview({ pdbId, title, onClick }: PdbThumbnailPreviewProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [triedSources, setTriedSources] = useState(0);

  // Try loading image from multiple sources sequentially
  // Source 1: Our API proxy (most reliable, handles CORS)
  // Source 2: Direct RCSB CDN (fallback)
  const proxyUrl = `/api/pdb-image/${pdbId.toUpperCase()}`;
  const lower = pdbId.toLowerCase();
  const directUrl = `https://cdn.rcsb.org/images/rCSB/${lower.substring(1, 3)}/${lower}/${lower}.thumb_350.png`;

  // Start with API proxy
  React.useEffect(() => {
    setImgSrc(proxyUrl);
    setTriedSources(1);
  }, [pdbId]);

  const handleImageError = useCallback(() => {
    if (triedSources === 1) {
      // Try direct RCSB CDN as fallback
      setImgSrc(directUrl);
      setTriedSources(2);
      setImgLoaded(false);
    } else {
      // All sources failed
      setImgError(true);
    }
  }, [triedSources, directUrl]);

  return (
    <div
      className="group relative rounded-lg border border-claude-border/60 dark:border-[#3d3832]/60 overflow-hidden cursor-pointer transition-all duration-200 hover:border-claude-accent/40 hover:shadow-md"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      {/* Thumbnail area */}
      <div className="relative h-[180px] bg-gradient-to-br from-claude-border-light dark:from-[#2b2926] to-[#e8e5df] dark:to-[#1a1917] flex items-center justify-center overflow-hidden">
        {/* RCSB thumbnail image */}
        {imgSrc && !imgError && (
          <img
            src={imgSrc}
            alt={`${pdbId} structure preview`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            onError={handleImageError}
          />
        )}

        {/* Fallback / loading content */}
        <div className={`relative z-10 flex flex-col items-center gap-2 transition-opacity duration-300 ${imgLoaded && !imgError ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="w-12 h-12 rounded-xl bg-claude-accent/10 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-claude-accent">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-mono font-bold text-lg text-claude-text/60">{pdbId}</span>
          {!imgError && !imgLoaded && (
            <Loader2 className="h-3 w-3 text-claude-accent animate-spin" />
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-claude-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-20">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-claude-accent/90 text-white text-xs font-medium shadow-lg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
            View 3D Structure
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div className="px-3 py-2 bg-claude-surface/80 dark:bg-[#242220]/80 border-t border-claude-border/40 dark:border-[#3d3832]/40">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-bold text-claude-accent">{pdbId}</span>
          <span className="text-[10px] text-claude-text-muted">
            {title ? (title.length > 30 ? title.slice(0, 30) + '…' : title) : 'Click to view 3D'}
          </span>
        </div>
      </div>
    </div>
  );
}
