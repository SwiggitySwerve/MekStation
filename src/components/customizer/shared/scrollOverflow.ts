/**
 * Scroll overflow detection shared by the customizer's scrolling lists.
 */

/** True when a scroll viewport has content hidden below its visible area. */
export function hasContentBelow(viewport: HTMLElement): boolean {
  return (
    viewport.clientHeight > 0 &&
    Math.ceil(
      viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop,
    ) > 2
  );
}
