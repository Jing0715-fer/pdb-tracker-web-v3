'use client';

import React from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ContextMenuItemDef {
  /** Display label for the menu item */
  label: string;
  /** Icon element to render (usually a Lucide icon) */
  icon: React.ReactNode;
  /** Click handler — called after stopping propagation */
  onClick: () => void;
  /** Render a `<hr>` separator before this item */
  separator?: boolean;
  /** Extra Tailwind classes appended to the button */
  className?: string;
}

interface ContextMenuOverlayProps {
  /** Whether the context menu is currently visible */
  visible: boolean;
  /** X position (clientX) of the menu origin */
  x: number;
  /** Y position (clientY) of the menu origin */
  y: number;
  /** Ordered list of menu items to render */
  items: ContextMenuItemDef[];
  /** Callback to close the menu (and its backdrop) */
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

const buttonBase =
  'w-full text-left px-3 py-2 text-xs text-claude-text-secondary hover:bg-claude-accent-light dark:hover:bg-[#3d2a22] hover:text-claude-accent rounded-md flex items-center gap-2 transition-colors duration-100';

export function ContextMenuOverlay({
  visible,
  x,
  y,
  items,
  onClose,
}: ContextMenuOverlayProps) {
  if (!visible) return null;

  return (
    <>
      {/* Menu panel */}
      <div
        className="fixed z-50 bg-claude-surface dark:bg-[#2b2926] border border-claude-border dark:border-[#4a4540] shadow-xl rounded-lg p-1 min-w-[160px] context-menu-enter"
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, i) => (
          <React.Fragment key={i}>
            {item.separator && <div className="h-px bg-claude-border-light my-1" />}
            <button
              className={`${buttonBase} ${item.className ?? ''}`}
              onClick={item.onClick}
            >
              {item.icon}
              {item.label}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Invisible backdrop — closes the menu on click / right-click */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
    </>
  );
}
