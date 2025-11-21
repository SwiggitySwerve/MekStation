/**
 * Layout Constants for Consistent Tab Interface
 * 
 * Simple height calculations for tab-based components.
 * These values are used to ensure consistent spacing across all tabs.
 */

/**
 * Fixed header and navigation heights in pixels
 */
export const LAYOUT_HEIGHTS = {
  /** Unit information banner height */
  HEADER: 80,
  /** Tab navigation bar height */
  NAVIGATION: 60,
  /** Combined height of header + navigation */
  get TOTAL_FIXED() {
    return this.HEADER + this.NAVIGATION;
  }
} as const;

/**
 * Pre-calculated CSS height for tab content areas
 * Uses a more generous calculation to ensure content visibility
 */
export const TAB_CONTENT_HEIGHT = `calc(100vh - 120px)`;

/**
 * Standard scrollbar styling classes
 * These provide consistent scrollbar appearance across all tabs
 */
export const SCROLLBAR_CLASSES = 'scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800';

/**
 * Utility function to calculate custom height if needed
 * @param additionalOffset - Additional pixels to subtract from viewport height
 */
export const calculateTabHeight = (additionalOffset: number = 0): string => {
  return `calc(100vh - ${LAYOUT_HEIGHTS.TOTAL_FIXED + additionalOffset}px)`;
};
