/**
 * useEventListener Hook
 *
 * A utility hook for attaching event listeners with automatic cleanup.
 * Supports window, document, and element ref targets.
 *
 * @module hooks/utils/useEventListener
 */

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Target types that can receive event listeners
 */
type EventTarget = Window | Document | HTMLElement | null;

/**
 * Options for useEventListener
 */
export interface UseEventListenerOptions {
  /** Target element - defaults to window */
  target?: EventTarget | RefObject<HTMLElement | null>;
  /** Whether the listener is enabled - defaults to true */
  enabled?: boolean;
  /** Use capture phase */
  capture?: boolean;
  /** Passive listener (improves scroll performance) */
  passive?: boolean;
  /** Fire only once */
  once?: boolean;
}

/**
 * Check if a value is a RefObject
 */
function isRefObject<T>(value: unknown): value is RefObject<T> {
  return value !== null && typeof value === 'object' && 'current' in value;
}

/**
 * Get the actual target element from the options
 */
function getTargetElement(
  target: EventTarget | RefObject<HTMLElement | null> | undefined,
): EventTarget {
  if (target === undefined) {
    return typeof window !== 'undefined' ? window : null;
  }

  if (isRefObject<HTMLElement | null>(target)) {
    return target.current;
  }

  return target;
}

/**
 * Attach an event listener with automatic cleanup
 *
 * @param eventName - The event to listen for
 * @param handler - The event handler function
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * // Window resize
 * useEventListener('resize', handleResize);
 *
 * // Document keydown
 * useEventListener('keydown', handleKeyDown, { target: document });
 *
 * // Element click
 * const buttonRef = useRef<HTMLButtonElement>(null);
 * useEventListener('click', handleClick, { target: buttonRef });
 *
 * // With options
 * useEventListener('scroll', handleScroll, { passive: true, capture: true });
 *
 * // Conditionally enabled
 * useEventListener('mousemove', handleMove, { enabled: isTracking });
 * ```
 */
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  options?: UseEventListenerOptions,
): void;

export function useEventListener<K extends keyof DocumentEventMap>(
  eventName: K,
  handler: (event: DocumentEventMap[K]) => void,
  options?: UseEventListenerOptions & { target: Document },
): void;

export function useEventListener<K extends keyof HTMLElementEventMap>(
  eventName: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: UseEventListenerOptions & {
    target: RefObject<HTMLElement | null> | HTMLElement;
  },
): void;

export function useEventListener(
  eventName: string,
  handler: (event: Event) => void,
  options: UseEventListenerOptions = {},
): void {
  const { target, enabled = true, capture, passive, once } = options;

  // Store handler in a ref so we don't need to re-subscribe when handler changes
  const savedHandler = useRef(handler);

  // Update ref when handler changes
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  // Store the previous target element to detect changes
  const previousTargetRef = useRef<EventTarget>(null);

  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') {
      return;
    }

    // Get the target element
    const targetElement = getTargetElement(target);

    // Don't add listener if disabled or no target
    if (!enabled || !targetElement) {
      // If we were previously attached to an element, we need to clean up
      if (previousTargetRef.current) {
        previousTargetRef.current.removeEventListener(eventName, eventListener);
        previousTargetRef.current = null;
      }
      return;
    }

    // Build listener options
    const listenerOptions: AddEventListenerOptions = {};
    if (capture !== undefined) listenerOptions.capture = capture;
    if (passive !== undefined) listenerOptions.passive = passive;
    if (once !== undefined) listenerOptions.once = once;

    // Create event listener that calls the latest handler
    function eventListener(event: Event) {
      savedHandler.current(event);
    }

    // If target changed, remove from old target first
    if (
      previousTargetRef.current &&
      previousTargetRef.current !== targetElement
    ) {
      previousTargetRef.current.removeEventListener(eventName, eventListener);
    }

    // Add event listener
    targetElement.addEventListener(
      eventName,
      eventListener,
      Object.keys(listenerOptions).length > 0 ? listenerOptions : undefined,
    );

    // Track current target
    previousTargetRef.current = targetElement;

    // Cleanup function
    return () => {
      targetElement.removeEventListener(
        eventName,
        eventListener,
        Object.keys(listenerOptions).length > 0 ? listenerOptions : undefined,
      );
      previousTargetRef.current = null;
    };
  }, [eventName, target, enabled, capture, passive, once]);
}

export default useEventListener;
