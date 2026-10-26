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
            viewport.clientHeight > 0 &&
            viewport.scrollHeight - viewport.scrollTop >
              viewport.clientHeight + 1,
        ),
      );
    };
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(update);
    for (const viewport of viewports) {
      observer?.observe(viewport);
      if (viewport.firstElementChild)
        observer?.observe(viewport.firstElementChild);
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
