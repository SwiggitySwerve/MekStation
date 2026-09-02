/**
 * The always-on lifecycle posture strip, shared by every surface that
 * has a lifecycle (umbrella 19.1).
 *
 * It is always rendered, including while everything is fine. A banner
 * that appears only when something is wrong teaches a player that its
 * absence means nothing in particular; one that is always present makes
 * "up to date" a fact they can check rather than assume.
 *
 * It states the posture and nothing about the contents behind it - no
 * counts, no "N events behind". A distance on screen for a SCOPED view
 * rebuilds the inference channel the scoped-projection proofs closed: a
 * guest comparing their lag against activity they can see would learn
 * how much was withheld. The same applies to what a screen reader
 * speaks, which is why the announcement is the message and nothing else.
 */

import React from 'react';

import type { LifecycleState } from '@/lib/lifecycle/lifecycleState';

import { LIFECYCLE_TONE } from '@/lib/lifecycle/lifecycleState';

export interface LifecycleStateBannerProps {
  /** The shared posture name, published as the stable `data-state` locator. */
  readonly state: LifecycleState;
  /** One sentence a player can act on, never a status code. */
  readonly message: string;
  /** The surface's stable locator, e.g. `campaign-sync-state`. */
  readonly testId: string;
  /**
   * Extra data attributes the surface needs to keep. Exists so a surface
   * that already published its own locator attribute can adopt the
   * shared `data-state` WITHOUT breaking the readers of the old one.
   */
  readonly extraDataAttributes?: Readonly<Record<string, string>>;
  /** Optional class override for the strip. */
  readonly className?: string;
}

/** The always-on posture strip. */
export function LifecycleStateBanner({
  state,
  message,
  testId,
  extraDataAttributes,
  className = '',
}: LifecycleStateBannerProps): React.ReactElement {
  return (
    <p
      data-testid={testId}
      data-state={state}
      {...extraDataAttributes}
      // A state change without a live region is invisible to a screen
      // reader: a sighted player watches the strip flip from "up to date"
      // to "reconnecting", while a screen-reader user gets nothing at
      // all. For a strip whose entire job is telling you whether to trust
      // what you see, silence is the worst answer.
      role="status"
      // Polite, never assertive, INCLUDING for `blocked`. Assertive
      // interrupts whatever the reader is currently speaking, and a
      // lifecycle posture is never more urgent than the sentence the
      // player is in the middle of - the blocked postures also disable
      // the controls they refer to, so they are discoverable by trying
      // rather than only by hearing.
      aria-live="polite"
      // The whole sentence is re-read on change. Without this a reader
      // may announce only the changed words, which turns "you are up to
      // date" into a fragment that means nothing on its own.
      aria-atomic="true"
      className={`mb-3 rounded-lg border px-3 py-2 text-xs ${LIFECYCLE_TONE[state]} ${className}`}
    >
      {message}
    </p>
  );
}

export default LifecycleStateBanner;
