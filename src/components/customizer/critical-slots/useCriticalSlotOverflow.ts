import { useEffect, useRef, useState } from 'react';

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
            viewport.getClientRects().length > 0 &&
            viewport.clientHeight > 0 &&
            Math.ceil(
              viewport.scrollHeight -
                viewport.clientHeight -
                viewport.scrollTop,
            ) > 2,
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
