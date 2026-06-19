/**
 * useScreenReaderAnnouncer
 *
 * Manages an aria-live region that announces tactical events to screen-reader
 * users without disrupting the visible UI. Provides an imperative `announce`
 * function for components that need to push one-off messages, and
 * automatically announces phase and active-unit changes derived from
 * `usePhaseQueueProjection`.
 *
 * The hook returns an `announcerRef` that must be attached to the hidden
 * aria-live DOM node rendered by `<TacticalLiveRegion>`. Message injection
 * works by toggling the node's `textContent` so the browser fires the
 * mutation-observer-based live-region algorithm even when the text is
 * unchanged from the last announcement (a common edge case when a unit acts
 * twice in succession on the same phase).
 *
 * Priority map:
 *   'polite'    — appended to the pending announcement queue; read when idle.
 *   'assertive' — interrupts the current utterance immediately. Use sparingly
 *                 (e.g. critical hit, unit destroyed).
 *
 * @spec openspec/changes/add-responsive-tactical-hud-accessibility/specs/accessibility-system/spec.md
 *   "Screen Reader Live Region" ADDED requirement — §3.2
 */

import { useCallback, useEffect, useRef } from 'react';

import { getPhaseAnnouncementLabel } from '@/components/gameplay/EventLogDisplay.helpers';
import { usePhaseQueueProjection } from '@/hooks/gameplay/usePhaseQueueProjection';
import { GamePhase } from '@/types/gameplay/GameSessionCoreTypes';

// =============================================================================
// Types
// =============================================================================

export type AnnouncePriority = 'polite' | 'assertive';

export interface IScreenReaderAnnouncer {
  /**
   * Ref to attach to the hidden aria-live DOM node in `<TacticalLiveRegion>`.
   * The hook drives the live region by writing to `node.textContent`.
   */
  readonly politeRef: React.RefObject<HTMLDivElement | null>;
  readonly assertiveRef: React.RefObject<HTMLDivElement | null>;
  /**
   * Push a message to the live region.
   *
   * @param message   - The text to announce.
   * @param priority  - 'polite' (default) or 'assertive'.
   */
  readonly announce: (message: string, priority?: AnnouncePriority) => void;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Returns an `IScreenReaderAnnouncer` containing:
 *   - `politeRef` / `assertiveRef` — attach to the corresponding aria-live
 *     nodes in `<TacticalLiveRegion>`.
 *   - `announce(message, priority)` — imperative push for one-off messages.
 *
 * Automatically announces phase and active-unit changes so consumers do not
 * need to duplicate this logic.
 */
export function useScreenReaderAnnouncer(): IScreenReaderAnnouncer {
  const politeRef = useRef<HTMLDivElement | null>(null);
  const assertiveRef = useRef<HTMLDivElement | null>(null);

  // ---------------------------------------------------------------------------
  // Imperative announce function
  // ---------------------------------------------------------------------------

  const announce = useCallback(
    (message: string, priority: AnnouncePriority = 'polite') => {
      const node =
        priority === 'assertive' ? assertiveRef.current : politeRef.current;
      if (!node) return;

      // Toggling to empty string first forces the browser's live-region
      // algorithm to re-fire even if the new text equals the previous text.
      node.textContent = '';
      // Schedule the actual message in the next microtask so the empty-string
      // mutation is processed before the new text arrives.
      Promise.resolve().then(() => {
        if (node) node.textContent = message;
      });
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Auto-announce phase and active-unit changes
  // ---------------------------------------------------------------------------

  const projection = usePhaseQueueProjection();

  // Track previous values to detect changes.
  const prevPhaseRef = useRef<GamePhase | null>(null);
  const prevActiveUnitRef = useRef<string | null>(null);

  useEffect(() => {
    const { phase, activeUnitId } = projection;

    // Announce phase transitions.
    if (prevPhaseRef.current !== null && prevPhaseRef.current !== phase) {
      announce(getPhaseAnnouncementLabel(phase), 'polite');
    }
    prevPhaseRef.current = phase;

    // Announce active-unit changes (separate from phase change to keep
    // messages short and non-redundant).
    if (prevActiveUnitRef.current !== activeUnitId && activeUnitId !== null) {
      announce(`Active unit: ${activeUnitId}`, 'polite');
    }
    prevActiveUnitRef.current = activeUnitId;
  }, [projection, announce]);

  return { politeRef, assertiveRef, announce };
}
