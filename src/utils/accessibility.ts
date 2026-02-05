/**
 * Accessibility utility functions for WCAG 2.1 AA compliance.
 *
 * Provides screen reader announcements, focus trapping, keyboard navigation
 * helpers, and live region management for the simulation viewer components.
 */

/* ========================================================================== */
/*  Screen Reader Announcements                                                */
/* ========================================================================== */

/**
 * Announce a message to screen readers via a live region.
 *
 * Creates a temporary live region element, appends it to the document body,
 * and removes it after the announcement is read.
 *
 * @param message - Text to announce
 * @param priority - 'polite' waits for idle, 'assertive' interrupts
 */
export function announce(
  message: string,
  priority: 'polite' | 'assertive' = 'polite',
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.style.cssText =
    'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
  announcement.textContent = message;
  document.body.appendChild(announcement);

  setTimeout(() => {
    if (document.body.contains(announcement)) {
      document.body.removeChild(announcement);
    }
  }, 1000);
}

/* ========================================================================== */
/*  Focus Management                                                           */
/* ========================================================================== */

/** CSS selector for all natively focusable elements. */
const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Trap keyboard focus within an element (e.g., modal/dialog).
 *
 * Wraps Tab navigation so that focus cycles between the first and last
 * focusable elements inside the container.
 *
 * @param element - Container to trap focus within
 * @returns Cleanup function to remove the event listener
 */
export function trapFocus(element: HTMLElement): () => void {
  const getFocusableElements = (): HTMLElement[] =>
    Array.from(
      element.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const firstElement = focusable[0];
    const lastElement = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  };

  element.addEventListener('keydown', handleKeyDown);
  return () => element.removeEventListener('keydown', handleKeyDown);
}

/* ========================================================================== */
/*  Keyboard Navigation Helpers                                                */
/* ========================================================================== */

/**
 * Handle arrow key navigation for a list of elements (e.g., tab bar, menu).
 *
 * Supports Up/Down for vertical lists and Left/Right for horizontal lists.
 *
 * @param e - Keyboard event
 * @param currentIndex - Current focused item index
 * @param totalItems - Total number of navigable items
 * @param orientation - 'horizontal' uses Left/Right, 'vertical' uses Up/Down
 * @returns New index, or null if the key wasn't a navigation key
 */
export interface IKeyboardEventLike {
  readonly key: string;
  preventDefault(): void;
}

export function handleArrowNavigation(
  e: IKeyboardEventLike,
  currentIndex: number,
  totalItems: number,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
): number | null {
  const prevKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
  const nextKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';

  if (e.key === prevKey) {
    e.preventDefault();
    return (currentIndex - 1 + totalItems) % totalItems;
  }
  if (e.key === nextKey) {
    e.preventDefault();
    return (currentIndex + 1) % totalItems;
  }
  if (e.key === 'Home') {
    e.preventDefault();
    return 0;
  }
  if (e.key === 'End') {
    e.preventDefault();
    return totalItems - 1;
  }

  return null;
}

/**
 * Create a keyboard event handler for clickable elements (buttons, links).
 *
 * Triggers the callback on Enter or Space key press, matching native button behavior.
 *
 * @param callback - Function to call when activated
 * @returns React keyboard event handler
 */
export function createKeyboardClickHandler(
  callback: () => void,
): (e: IKeyboardEventLike) => void {
  return (e: IKeyboardEventLike) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };
}

/* ========================================================================== */
/*  Tailwind Class Helpers                                                     */
/* ========================================================================== */

/**
 * Standard focus indicator classes for interactive elements.
 * Provides visible focus rings that meet WCAG 2.1 AA requirements.
 */
export const FOCUS_RING_CLASSES =
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900';

/**
 * Inset focus ring variant (for elements where offset would break layout).
 */
export const FOCUS_RING_INSET_CLASSES =
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset';

/**
 * Screen-reader-only utility class string.
 * Visually hides content while keeping it accessible to assistive technology.
 */
export const SR_ONLY_CLASSES =
  'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0';

/* ========================================================================== */
/*  Live Region Component Props                                                */
/* ========================================================================== */

/**
 * Props for a reusable live region component pattern.
 */
export interface ILiveRegionProps {
  /** Message to announce */
  readonly message: string;
  /** Politeness level */
  readonly priority?: 'polite' | 'assertive';
  /** Whether the region should be visible */
  readonly visible?: boolean;
}
