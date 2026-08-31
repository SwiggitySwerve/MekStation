/** Persistent lifecycle posture for the networked tactical match surface. */

import React from 'react';

import type { ITacticalLifecyclePosture } from '@/lib/multiplayer/tacticalLifecycleState';

export interface TacticalLifecycleStateBannerProps {
  readonly posture: ITacticalLifecyclePosture;
}

/** Tone per posture, using palette classes already used by sibling surfaces. */
const TONE: Readonly<Record<string, string>> = {
  pending: 'border-amber-700 bg-amber-900/30 text-amber-200',
  sealed: 'border-violet-700 bg-violet-950/30 text-violet-200',
  finalized: 'border-emerald-700 bg-emerald-950/30 text-emerald-200',
  syncing: 'border-amber-700 bg-amber-900/30 text-amber-200',
  reconnecting: 'border-amber-700 bg-amber-900/30 text-amber-200',
  behind: 'border-sky-700 bg-sky-900/30 text-sky-200',
  blocked: 'border-red-700 bg-red-950/40 text-red-200',
  rewound: 'border-sky-700 bg-sky-900/30 text-sky-200',
  rebuilding: 'border-sky-700 bg-sky-900/30 text-sky-200',
  live: 'border-emerald-700 bg-emerald-950/30 text-emerald-200',
};

/** The always-on posture strip. */
export function TacticalLifecycleStateBanner({
  posture,
}: TacticalLifecycleStateBannerProps): React.ReactElement {
  return (
    <p
      data-testid="tactical-lifecycle-state"
      data-state={posture.state}
      // A state change without a live region is invisible to a screen reader.
      role="status"
      // Polite, never assertive, INCLUDING for `blocked`. Assertive interrupts
      // the current sentence; blocked controls are also discoverable by trying.
      aria-live="polite"
      // Read the whole sentence rather than only the changed fragment.
      aria-atomic="true"
      className={`mb-3 rounded-lg border px-3 py-2 text-xs ${TONE[posture.state] ?? TONE.behind}`}
    >
      {posture.message}
    </p>
  );
}

export default TacticalLifecycleStateBanner;
