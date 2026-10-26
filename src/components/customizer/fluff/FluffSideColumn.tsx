/**
 * Fluff side column
 *
 * Role, manufacturing and the section index, pinned to the top of the scroll
 * area beside the long narrative column. When the stack is taller than the
 * viewport it scrolls inside itself, and a 32px fade at the top or bottom edge
 * shows which side still has content, so a field is never cut off at the fold
 * without a cue.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

const SIDE_COLUMN =
  'flex min-w-0 flex-col gap-5 @[64rem]:sticky @[64rem]:top-4 @[64rem]:max-h-[calc(100dvh-12rem)] @[64rem]:overflow-y-auto @[64rem]:overscroll-contain @[64rem]:[scrollbar-width:thin]';

const FADE_SIZE = '2rem';

interface ScrollEdges {
  readonly top: boolean;
  readonly bottom: boolean;
}

/** Which edges of a scroll container still have hidden content beyond them. */
function useScrollEdges(): {
  readonly ref: React.RefObject<HTMLDivElement | null>;
  readonly edges: ScrollEdges;
  readonly update: () => void;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<ScrollEdges>({
    top: false,
    bottom: false,
  });

  const update = useCallback((): void => {
    const element = ref.current;
    if (!element) return;
    const top = element.scrollTop > 1;
    const bottom =
      element.scrollTop + element.clientHeight < element.scrollHeight - 1;
    setEdges((current) =>
      current.top === top && current.bottom === bottom
        ? current
        : { top, bottom },
    );
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    for (const child of Array.from(element.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [update]);

  return { ref, edges, update };
}

function fadeMask({ top, bottom }: ScrollEdges): React.CSSProperties {
  if (!top && !bottom) return {};
  const mask = `linear-gradient(to bottom, ${top ? `transparent, #000 ${FADE_SIZE}` : '#000, #000'}, ${bottom ? `#000 calc(100% - ${FADE_SIZE}), transparent` : '#000, #000'})`;
  return { maskImage: mask, WebkitMaskImage: mask };
}

export function FluffSideColumn({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { ref, edges, update } = useScrollEdges();
  return (
    <div
      ref={ref}
      className={SIDE_COLUMN}
      style={fadeMask(edges)}
      onScroll={update}
      data-testid="fluff-side-column"
      data-scroll-more-above={edges.top || undefined}
      data-scroll-more-below={edges.bottom || undefined}
    >
      {children}
    </div>
  );
}
