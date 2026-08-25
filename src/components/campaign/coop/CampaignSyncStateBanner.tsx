/**
 * Persistent synchronization posture for a shared campaign (task 5.6).
 *
 * Rendered whenever the guest surface is on screen, including while
 * everything is fine. A banner that appears only when something is wrong
 * teaches a player that its absence means nothing in particular; one
 * that is always present makes "up to date" a fact they can check rather
 * than assume.
 *
 * It states the posture and nothing about the campaign's contents - no
 * counts, no "N events behind". Those numbers exist on the replica, but
 * putting a distance on screen for a SCOPED view rebuilds the inference
 * channel tasks 3.2/3.4 spent their proofs closing: a guest comparing
 * their lag against activity they can see would learn how much was
 * withheld.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D5, D6)
 */

import React from 'react';

import type { ICampaignSyncUxPosture } from '@/lib/campaign/replica/campaignSyncUxState';

export interface CampaignSyncStateBannerProps {
  readonly posture: ICampaignSyncUxPosture;
}

/** Tone per posture, using palette classes already used by sibling surfaces. */
const TONE: Readonly<Record<string, string>> = {
  blocked: 'border-red-700 bg-red-950/40 text-red-200',
  resyncing: 'border-amber-700 bg-amber-900/30 text-amber-200',
  retrying: 'border-amber-700 bg-amber-900/30 text-amber-200',
  'catching-up': 'border-sky-700 bg-sky-900/30 text-sky-200',
  behind: 'border-sky-700 bg-sky-900/30 text-sky-200',
  live: 'border-emerald-700 bg-emerald-950/30 text-emerald-200',
};

/** The always-on posture strip. */
export function CampaignSyncStateBanner({
  posture,
}: CampaignSyncStateBannerProps): React.ReactElement {
  return (
    <p
      data-testid="campaign-sync-state"
      data-sync-state={posture.state}
      // A status that changes with no live region is invisible to a
      // screen reader: a sighted player watches the strip flip from "up
      // to date" to "reconnecting", while a screen-reader user gets
      // nothing at all. For a banner whose entire job is telling you
      // whether to trust what you see, silence is the worst answer.
      role="status"
      // Polite, never assertive, INCLUDING for `blocked`. Assertive
      // interrupts whatever the reader is currently speaking, and a sync
      // posture is never more urgent than the sentence the player is in
      // the middle of - the blocked case also disables the controls, so
      // it is discoverable by trying rather than only by hearing.
      aria-live="polite"
      // The whole sentence is re-read on change. Without this a reader
      // may announce only the changed words, which turns "you are up to
      // date" into a fragment that means nothing on its own.
      aria-atomic="true"
      className={`mb-3 rounded-lg border px-3 py-2 text-xs ${TONE[posture.state] ?? TONE.behind}`}
    >
      {posture.message}
    </p>
  );
}

export default CampaignSyncStateBanner;
