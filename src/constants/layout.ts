/**
 * Layout Constants
 *
 * Centralized constants for layout dimensions, breakpoints, and z-indexes.
 * Single source of truth for responsive design values.
 */

// =============================================================================
// Sidebar Dimensions
// =============================================================================

export const SIDEBAR = {
  /** Collapsed sidebar width in pixels (Tailwind: w-16) */
  COLLAPSED_WIDTH: 64,
  /** Expanded sidebar width in pixels (Tailwind: w-56) */
  EXPANDED_WIDTH: 224,
  /** Collapsed sidebar margin class */
  MARGIN_COLLAPSED: 'lg:ml-16',
  /** Expanded sidebar margin class */
  MARGIN_EXPANDED: 'lg:ml-56',
  /** Collapsed sidebar width class */
  WIDTH_COLLAPSED: 'w-16',
  /** Expanded sidebar width class */
  WIDTH_EXPANDED: 'w-56',
} as const;

// =============================================================================
// Z-Index Layers
// =============================================================================

export const Z_INDEX = {
  /** Base content layer */
  BASE: 0,
  /** Floating elements, dropdowns */
  DROPDOWN: 10,
  /** Sticky headers */
  STICKY: 20,
  /** Desktop sidebar */
  SIDEBAR_DESKTOP: 30,
  /** Mobile navigation overlay */
  MOBILE_NAV: 40,
  /** Mobile sidebar drawer */
  SIDEBAR_MOBILE: 50,
  /** Modals and dialogs */
  MODAL: 60,
  /** Tooltips and popovers */
  TOOLTIP: 70,
  /** Toast notifications */
  TOAST: 80,
} as const;

// =============================================================================
// Breakpoints (matches Tailwind defaults)
// =============================================================================

export const BREAKPOINTS = {
  /** Small devices (phones) */
  SM: 640,
  /** Medium devices (tablets) */
  MD: 768,
  /** Large devices (laptops) */
  LG: 1024,
  /** Extra large devices (desktops) */
  XL: 1280,
  /** 2XL devices (large desktops) */
  XXL: 1536,
} as const;

// =============================================================================
// Touch & Mobile
// =============================================================================

export const TOUCH = {
  /** Minimum touch target size per accessibility guidelines */
  MIN_TARGET_SIZE: 44,
  /** Standard touch spacing */
  SPACING: 8,
} as const;

// =============================================================================
// Animation Durations (in ms)
// =============================================================================

export const ANIMATION = {
  /** Fast micro-interactions */
  FAST: 150,
  /** Standard transitions */
  NORMAL: 300,
  /** Slower animations for emphasis */
  SLOW: 500,
} as const;

// =============================================================================
// Header Heights
// =============================================================================

export const HEADER = {
  /** Mobile header height in pixels */
  MOBILE_HEIGHT: 48,
  /** Desktop header height in pixels (if applicable) */
  DESKTOP_HEIGHT: 56,
} as const;
