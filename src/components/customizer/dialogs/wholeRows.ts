/**
 * Whole-row list height for the phone Add Unit catalog, so the list ends on
 * a whole row above the sticky footer instead of a row cut in half.
 */

import { useLayoutEffect, useState, type RefObject } from 'react';

/** Below this width the catalog is a one-column list of two-line rows. */
const PHONE_QUERY = '(max-width: 639px)';

/**
 * Height of a scroll viewport that ends on a whole row: the bottom of the
 * last row that fits in `available`, or `available` when not even the first
 * row fits. Row bottoms are measured from the top of the list content.
 */
export function wholeRowsHeight(
  rowBottoms: Iterable<number>,
  available: number,
): number {
  let fit = 0;
  for (const bottom of rowBottoms) {
    if (bottom > available) break;
    fit = bottom;
  }
  return fit > 0 ? fit : available;
}

function* rowBottomsOf(list: HTMLElement): Generator<number> {
  const top = list.getBoundingClientRect().top - list.scrollTop;
  for (const row of Array.from(list.querySelectorAll('tbody > tr')))
    yield row.getBoundingClientRect().bottom - top;
}

/**
 * On phones, the height that ends `list` on a whole row within `frame`;
 * undefined on wider screens, where the list fills its frame. Measured again
 * when the frame resizes or `rowsKey` changes.
 */
export function useWholeRowsHeight(
  frame: RefObject<HTMLElement | null>,
  list: RefObject<HTMLElement | null>,
  rowsKey: unknown,
): number | undefined {
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const frameEl = frame.current;
    const listEl = list.current;
    if (!frameEl || !listEl) return;
    const measure = (): void => {
      if (!window.matchMedia?.(PHONE_QUERY).matches) {
        setHeight(undefined);
        return;
      }
      setHeight(wholeRowsHeight(rowBottomsOf(listEl), frameEl.clientHeight));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(frameEl);
    return () => observer.disconnect();
  }, [frame, list, rowsKey]);

  return height;
}
