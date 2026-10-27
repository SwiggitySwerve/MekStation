/**
 * Fluff side column
 *
 * Sections index, role and manufacturing beside the long narrative column.
 * Nothing in it scrolls or fades: every card renders at its natural height.
 *
 * Wide editors keep the column in view while the narrative scrolls. If the
 * whole column fits in the scroll area it is sticky as one piece. If it is
 * taller, only the Sections index is sticky (pinned under the tab bar) while
 * the other cards scroll normally. If even the Sections card alone would cover
 * half the scroll area, nothing is sticky, so no card is ever hidden behind
 * another one.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

/** Matches the p-4 of the tab and the top-4 sticky offset, both sides. */
const STICKY_INSET_PX = 16;

export type SideColumnStickyMode = 'column' | 'sections' | 'none';

/** Largest share of the scroll area a pinned Sections card may cover. */
const MAX_PINNED_SHARE = 0.5;

const SIDE_COLUMN_BASE = 'flex min-w-0 flex-col gap-5';

/** Whole column pinned; the grid cell hugs its content so there is room to travel. */
const COLUMN_MODE = '@[64rem]:sticky @[64rem]:top-4';

/** Column fills the row, giving the sticky Sections card room to travel. */
const SECTIONS_MODE = '@[64rem]:self-stretch';

const COLUMN_CLASSES: Record<SideColumnStickyMode, string> = {
  column: COLUMN_MODE,
  sections: SECTIONS_MODE,
  none: '',
};

const SECTIONS_SLOT = '@container hidden @[64rem]:block';
const SECTIONS_SLOT_STICKY = '@[64rem]:sticky @[64rem]:top-4 @[64rem]:z-10';

/** Nearest ancestor that scrolls vertically, or null when the page scrolls. */
function scrollParentOf(element: HTMLElement): HTMLElement | null {
  for (
    let parent = element.parentElement;
    parent;
    parent = parent.parentElement
  ) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === 'auto' || overflowY === 'scroll') return parent;
  }
  return null;
}

/** Natural height of the stacked cards, independent of sticky offsets. */
function stackHeight(column: HTMLElement): number {
  const gap = Number.parseFloat(getComputedStyle(column).rowGap) || 0;
  const items = Array.from(column.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.offsetHeight > 0,
  );
  return (
    items.reduce((sum, item) => sum + item.offsetHeight, 0) +
    gap * Math.max(0, items.length - 1)
  );
}

/** What stays pinned beside the narrative: the whole column, Sections only, or nothing. */
function useStickyMode(): {
  readonly ref: React.RefObject<HTMLDivElement | null>;
  readonly mode: SideColumnStickyMode;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<SideColumnStickyMode>('column');

  const measure = useCallback((): void => {
    const column = ref.current;
    if (!column) return;
    const viewport = scrollParentOf(column)?.clientHeight ?? window.innerHeight;
    const available = viewport - 2 * STICKY_INSET_PX;
    const slot = column.firstElementChild;
    const slotHeight = slot instanceof HTMLElement ? slot.offsetHeight : 0;
    let next: SideColumnStickyMode = 'column';
    if (stackHeight(column) > available) {
      next = slotHeight > available * MAX_PINNED_SHARE ? 'none' : 'sections';
    }
    setMode((current) => (current === next ? current : next));
  }, []);

  useEffect(() => {
    const column = ref.current;
    if (!column) return undefined;
    measure();
    window.addEventListener('resize', measure);
    if (typeof ResizeObserver === 'undefined') {
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    for (const child of Array.from(column.children)) observer.observe(child);
    const scrollParent = scrollParentOf(column);
    if (scrollParent) observer.observe(scrollParent);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  return { ref, mode };
}

interface FluffSideColumnProps {
  /** The Sections index; first in the column. */
  sections: React.ReactNode;
  /** Remaining cards, in reading order. */
  children: React.ReactNode;
}

export function FluffSideColumn({
  sections,
  children,
}: FluffSideColumnProps): React.ReactElement {
  const { ref, mode } = useStickyMode();
  return (
    <div
      ref={ref}
      className={`${SIDE_COLUMN_BASE} ${COLUMN_CLASSES[mode]}`}
      data-testid="fluff-side-column"
      data-sticky={mode}
    >
      <div
        className={`${SECTIONS_SLOT} ${mode === 'sections' ? SECTIONS_SLOT_STICKY : ''}`}
        data-testid="fluff-sections-slot"
      >
        {sections}
      </div>
      {children}
    </div>
  );
}
