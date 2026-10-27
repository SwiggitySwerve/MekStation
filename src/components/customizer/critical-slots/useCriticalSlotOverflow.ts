import { useEffect, useRef, useState } from 'react';

import { hasContentBelow } from '../shared/scrollOverflow';

/** Track the visible location viewport, including content reflow and scrolling. */
export function useCriticalSlotOverflow(isBiped: boolean): {
  rootRef: React.RefObject<HTMLDivElement | null>;
  hasMoreBelow: boolean;
} {
  const rootRef = useRef<HTMLDivElement>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  useEffect(() => {
    const viewports = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>(
        '[aria-label="Critical slot locations"]',
      ) ?? [],
    );
    const update = () => {
      setHasMoreBelow(
        viewports.some(
          (viewport) =>
            viewport.getClientRects().length > 0 && hasContentBelow(viewport),
        ),
      );
    };
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(update);
    for (const viewport of viewports) {
      observer?.observe(viewport);
      for (const content of Array.from(viewport.children))
        observer?.observe(content);
      viewport.addEventListener('scroll', update, { passive: true });
    }
    update();
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
      for (const viewport of viewports)
        viewport.removeEventListener('scroll', update);
    };
  }, [isBiped]);

  return { rootRef, hasMoreBelow };
}
