/**
 * TacticalLiveRegion
 *
 * A pair of visually-hidden `aria-live` nodes that the `useScreenReaderAnnouncer`
 * hook writes to when tactical events occur (phase changes, active-unit shifts,
 * one-off imperative messages from combat actions).
 *
 * Mounting model:
 *   Mount once inside `GameplayLayout` (or the equivalent root of the tactical
 *   UI tree). Pass the `announcer` returned by `useScreenReaderAnnouncer` as
 *   the sole prop. The hook attaches `politeRef` and `assertiveRef` to the two
 *   internal `<div>` nodes so it can write `textContent` directly, avoiding
 *   React re-renders on every announcement.
 *
 * Visibility:
 *   The component uses the standard "visually hidden" pattern:
 *   `position: absolute; width: 1px; height: 1px; overflow: hidden;
 *    clip: rect(0,0,0,0); white-space: nowrap`
 *   so the nodes participate in accessibility trees but are not visible on
 *   screen and do not affect layout.
 *
 * @spec openspec/changes/add-responsive-tactical-hud-accessibility/specs/accessibility-system/spec.md
 *   "Screen Reader Live Region" ADDED requirement — §3.2
 */

import React from 'react';

import type { IScreenReaderAnnouncer } from '@/hooks/gameplay/useScreenReaderAnnouncer';

// =============================================================================
// Component
// =============================================================================

interface TacticalLiveRegionProps {
  /** The announcer object returned by `useScreenReaderAnnouncer`. */
  readonly announcer: IScreenReaderAnnouncer;
}

/**
 * Renders two visually-hidden aria-live nodes driven by the
 * `useScreenReaderAnnouncer` hook. Mount exactly once in the tactical shell.
 */
export function TacticalLiveRegion({
  announcer,
}: TacticalLiveRegionProps): React.ReactElement {
  return (
    <>
      {/* Polite region: phase changes, active-unit shifts, non-urgent events. */}
      <div
        ref={announcer.politeRef}
        aria-live="polite"
        aria-atomic="true"
        role="status"
        style={VISUALLY_HIDDEN}
        data-testid="tactical-live-region-polite"
      />
      {/* Assertive region: critical hits, unit destroyed — interrupts current utterance. */}
      <div
        ref={announcer.assertiveRef}
        aria-live="assertive"
        aria-atomic="true"
        role="alert"
        style={VISUALLY_HIDDEN}
        data-testid="tactical-live-region-assertive"
      />
    </>
  );
}

// =============================================================================
// Style constant
// =============================================================================

/**
 * Standard visually-hidden CSS-in-JS style object.
 *
 * Hides the node from sighted users while keeping it in the accessibility
 * tree and positioning it off-screen so it does not affect layout flow.
 * `clip` and `clipPath` are both set for cross-browser compatibility.
 */
const VISUALLY_HIDDEN: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
};
