/**
 * Co-op Mission Launch Page
 *
 * The `/gameplay/campaigns/[id]/missions/[missionId]/launch` route added
 * by `wire-coop-campaign-route` (Wave 6.1, task 3.1). The route is the
 * pre-launch handshake for co-op missions: each player picks `deploy`
 * or `command-hq`, and the launch button stays gated until both have
 * picked. The zero-`deploy` rule from `add-coop-campaign-play` (Wave 5)
 * blocks the launch if neither player chose to deploy.
 *
 * For a single-player (non-co-op) campaign the route SHALL skip the
 * picker and launch directly (existing single-player behavior is
 * preserved — spec scenario "non-co-op mission skips the picker and
 * launches directly").
 *
 * Wave 6.1 ships the picker mount + the gating rule. The live CO1
 * intent transport that synchronizes the two players' choices across
 * the wire lands in a follow-up — for now the page tracks the local
 * player's choice in component state and surfaces a placeholder
 * "waiting for other player" affordance.
 *
 * @spec openspec/changes/wire-coop-campaign-route/specs/coop-campaign-sync/spec.md
 */

import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useState } from 'react';

import type { CoopParticipationChoice } from '@/types/campaign/CoopCampaign';

import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import { CoopParticipationPicker } from '@/components/campaign/coop';
import { EmptyState, PageLayout } from '@/components/ui';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

export default function CoopMissionLaunchPage(): React.ReactElement {
  const router = useRouter();
  const { id: campaignId, missionId } = router.query;

  const store = useCampaignStore();
  const campaign = store.getState().getCampaign();

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Local player's pick — `deploy` is the canonical default so a host who
  // never opens the picker still launches. Guests start at `command-hq` so
  // the gating rule visibly fires until they pick.
  const localDefault: CoopParticipationChoice =
    campaign?.coopSession?.mode === 'host' ? 'deploy' : 'command-hq';
  const [localChoice, setLocalChoice] =
    useState<CoopParticipationChoice>(localDefault);

  // Other player's pick — surfaced from CO1 intent broadcast in a
  // follow-up. For Wave 6.1 the placeholder is `undefined` so the
  // launch stays gated until the other player commits.
  const [otherChoice] = useState<CoopParticipationChoice | undefined>(
    undefined,
  );

  const handleLaunch = useCallback(() => {
    if (!campaignId || !missionId) {
      return;
    }
    // Re-enter the encounter URL so the player who chose `deploy` lands
    // on the tactical map; the `command-hq` chooser stays on the
    // campaign side (handled by the encounter page's own coop guard).
    void router.push(`/gameplay/encounters/${String(missionId)}`);
  }, [router, campaignId, missionId]);

  if (!isClient) {
    return (
      <PageLayout title="Mission Launch" subtitle="Loading…" maxWidth="wide">
        <EmptyState title="Loading mission launch surface…" message="" />
      </PageLayout>
    );
  }

  if (!campaign) {
    return (
      <PageLayout
        title="Mission Launch"
        subtitle="Campaign not found"
        maxWidth="wide"
      >
        <EmptyState
          title="Campaign not found"
          message="Return to the campaigns list to select a campaign."
        />
      </PageLayout>
    );
  }

  // Non-co-op mission — skip the picker and launch directly, preserving
  // the existing single-player behavior. Spec scenario "Single-player
  // campaign mounts neither co-op surface" + the launch-direct expectation.
  if (!campaign.coopSession) {
    return (
      <PageLayout
        title="Mission Launch"
        subtitle={`${campaign.name} — single-player mission ${String(missionId)}`}
        maxWidth="wide"
      >
        <CampaignNavigation
          campaignId={campaign.id}
          currentPage="missions"
          coopSession={campaign.coopSession}
        />
        <div className="mt-6">
          <button
            type="button"
            data-testid="launch-mission-direct"
            onClick={handleLaunch}
            className="rounded-lg border border-sky-500/60 bg-sky-600/20 px-4 py-2 font-semibold text-sky-100"
          >
            Launch mission
          </button>
        </div>
      </PageLayout>
    );
  }

  // Co-op mission — mount the picker for the local player. The launch
  // button is gated until both players have picked AND at least one
  // chose `deploy` (the Wave-5 zero-deploy block).
  const bothChosen = otherChoice !== undefined;
  const noDeploy =
    bothChosen && localChoice !== 'deploy' && otherChoice !== 'deploy';
  const canLaunch = bothChosen && !noDeploy;

  const localPlayerName =
    campaign.coopSession.mode === 'host' ? 'You (Host)' : 'You (Guest)';

  return (
    <PageLayout
      title="Co-op Mission Launch"
      subtitle={`${campaign.name} — mission ${String(missionId)}`}
      maxWidth="wide"
    >
      <CampaignNavigation
        campaignId={campaign.id}
        currentPage="missions"
        coopSession={campaign.coopSession}
      />

      <div className="mt-6 space-y-4">
        <CoopParticipationPicker
          playerName={localPlayerName}
          value={localChoice}
          onChange={setLocalChoice}
          otherPlayerChoice={otherChoice}
        />

        {!bothChosen ? (
          <p
            data-testid="coop-launch-waiting"
            className="text-sm text-slate-400"
          >
            Waiting for the other player&apos;s pick — the launch button enables
            once both players choose.
          </p>
        ) : null}

        {noDeploy ? (
          <p
            data-testid="coop-launch-zero-deploy-block"
            className="text-sm text-rose-400"
          >
            Neither player chose to deploy — the mission cannot launch (at least
            one player must take the field).
          </p>
        ) : null}

        <button
          type="button"
          data-testid="coop-launch-mission"
          disabled={!canLaunch}
          onClick={handleLaunch}
          className={
            canLaunch
              ? 'rounded-lg border border-sky-500/60 bg-sky-600/20 px-4 py-2 font-semibold text-sky-100'
              : 'cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-2 font-semibold text-slate-500'
          }
        >
          Launch mission
        </button>
      </div>
    </PageLayout>
  );
}
