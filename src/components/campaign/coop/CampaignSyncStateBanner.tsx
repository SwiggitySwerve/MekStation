/**
 * Persistent synchronization posture for a shared campaign (task 5.6,
 * extended by umbrella 19.1).
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
 * Since 19.1 the strip carries BOTH names: `data-sync-state` is the
 * campaign replica's own vocabulary, unchanged for the readers - an e2e
 * spec among them - that already walk it, and `data-state` is the
 * lifecycle vocabulary shared with the tactical and GM surfaces. The
 * strip is deliberately a single element carrying both rather than two
 * strips saying the same thing twice.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D5, D6)
 */

import React from 'react';

import type { ICampaignLifecyclePosture } from '@/lib/campaign/lifecycle/campaignLifecycleState';

import { LifecycleStateBanner } from '@/components/common/LifecycleStateBanner';

export interface CampaignSyncStateBannerProps {
  readonly posture: ICampaignLifecyclePosture;
}

/** The always-on posture strip. */
export function CampaignSyncStateBanner({
  posture,
}: CampaignSyncStateBannerProps): React.ReactElement {
  return (
    <LifecycleStateBanner
      testId="campaign-sync-state"
      state={posture.lifecycleState}
      message={posture.message}
      extraDataAttributes={{ 'data-sync-state': posture.state }}
    />
  );
}

export default CampaignSyncStateBanner;
