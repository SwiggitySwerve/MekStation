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
 * The picker publishes the local participation choice into the co-op
 * runtime session and subscribes to the other player's choice before
 * allowing the composed co-op encounter launch.
 *
 * @spec openspec/changes/wire-coop-campaign-route/specs/coop-campaign-sync/spec.md
 */

import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { CoopParticipationChoice } from '@/types/campaign/CoopCampaign';
import type { IForce } from '@/types/campaign/Force';
import type { IEncounter } from '@/types/encounter';

import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import { CoopParticipationPicker } from '@/components/campaign/coop';
import { EmptyState, PageLayout } from '@/components/ui';
import {
  getCoopLocalPlayerId,
  getCoopMatchId,
  getCoopOtherPlayerId,
  type ICoopParticipationRecord,
  publishCoopParticipation,
  subscribeCoopParticipation,
} from '@/lib/campaign/coop/coopRuntimeSession';
import { launchCoopMission } from '@/lib/campaign/coop/launchCoopMission';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { ForceRole, FormationLevel } from '@/types/campaign/enums';
import { EncounterStatus, TerrainPreset } from '@/types/encounter';

function routeParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function fallbackRootForce(campaign: ICampaign): IForce {
  return {
    id: campaign.rootForceId,
    name: `${campaign.name} Command`,
    subForceIds: [],
    unitIds: [],
    forceType: ForceRole.STANDARD,
    formationLevel: FormationLevel.REGIMENT,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

function rootForceForCampaign(campaign: ICampaign): IForce {
  return (
    campaign.forces.get(campaign.rootForceId) ?? fallbackRootForce(campaign)
  );
}

function buildLaunchEncounter(
  campaign: ICampaign,
  missionId: string,
): IEncounter {
  const mission = campaign.missions.get(missionId);
  const rootForce = rootForceForCampaign(campaign);
  return {
    id: `enc-${missionId}`,
    name: mission?.name ?? `Mission ${missionId}`,
    description: mission?.description ?? `Co-op campaign mission ${missionId}.`,
    status: EncounterStatus.Ready,
    playerForce: {
      forceId: rootForce.id,
      forceName: rootForce.name,
      totalBV: 0,
      unitCount: rootForce.unitIds.length,
    },
    mapConfig: {
      radius: 8,
      terrain: TerrainPreset.Clear,
      playerDeploymentZone: 'south',
      opponentDeploymentZone: 'north',
    },
    victoryConditions: [],
    optionalRules: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    campaignMeta: {
      campaignId: campaign.id,
      contractId: mission?.id ?? missionId,
      scenarioId: mission?.scenarioIds[0] ?? missionId,
    },
  };
}

export default function CoopMissionLaunchPage(): React.ReactElement {
  const router = useRouter();
  const { id: campaignId, missionId } = router.query;
  const missionKey = routeParam(missionId);

  const store = useCampaignStore();
  const campaign = store.getState().getCampaign();
  const matchId = getCoopMatchId(campaign?.coopSession);
  const localPlayerId = campaign?.coopSession
    ? getCoopLocalPlayerId(campaign.coopSession)
    : 'host';
  const otherPlayerId = campaign?.coopSession
    ? getCoopOtherPlayerId(campaign.coopSession)
    : 'guest';
  const localForce = useMemo(
    () => (campaign ? rootForceForCampaign(campaign) : null),
    [campaign],
  );

  const [isClient, setIsClient] = useState(false);
  const [participationRecords, setParticipationRecords] = useState<
    readonly ICoopParticipationRecord[]
  >([]);
  const [launchError, setLaunchError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!campaign?.coopSession || !matchId || !missionKey || !localForce) {
      return;
    }
    publishCoopParticipation({
      matchId,
      missionId: missionKey,
      playerId: localPlayerId,
      role: campaign.coopSession.mode,
      choice: localChoice,
      force: localForce,
    });
  }, [
    campaign?.coopSession,
    localChoice,
    localForce,
    localPlayerId,
    matchId,
    missionKey,
  ]);

  useEffect(() => {
    if (!campaign?.coopSession || !matchId || !missionKey) {
      setParticipationRecords([]);
      return () => undefined;
    }
    return subscribeCoopParticipation(
      matchId,
      missionKey,
      setParticipationRecords,
    );
  }, [campaign?.coopSession, matchId, missionKey]);

  const otherRecord = useMemo(
    () =>
      participationRecords.find((entry) => entry.playerId === otherPlayerId),
    [otherPlayerId, participationRecords],
  );
  const otherChoice = otherRecord?.choice;

  const handleLaunch = useCallback(() => {
    if (!campaignId || !missionKey) {
      return;
    }
    if (campaign?.coopSession) {
      if (!matchId || !localForce || !otherRecord) {
        return;
      }
      const localRecord: ICoopParticipationRecord = {
        matchId,
        missionId: missionKey,
        playerId: localPlayerId,
        role: campaign.coopSession.mode,
        choice: localChoice,
        force: localForce,
      };
      const contributions = [localRecord, otherRecord].map((entry) => ({
        playerId: entry.playerId,
        role: entry.role,
        force: entry.force,
        participation: entry.choice,
      }));
      const result = launchCoopMission(
        buildLaunchEncounter(campaign, missionKey),
        contributions,
      );
      if (!result.ok) {
        setLaunchError(result.error);
        return;
      }
      setLaunchError(null);
      if (localChoice === 'deploy') {
        void router.push(
          `/gameplay/encounters/${encodeURIComponent(
            result.encounterId ?? missionKey,
          )}`,
        );
        return;
      }
      void router.push(`/gameplay/campaigns/${campaign.id}`);
      return;
    }
    // Re-enter the encounter URL so the player who chose `deploy` lands
    // on the tactical map; the `command-hq` chooser stays on the
    // campaign side (handled by the encounter page's own coop guard).
    void router.push(`/gameplay/encounters/${missionKey}`);
  }, [
    campaign,
    campaignId,
    localChoice,
    localForce,
    localPlayerId,
    matchId,
    missionKey,
    otherRecord,
    router,
  ]);

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
          onChange={(choice) => {
            setLaunchError(null);
            setLocalChoice(choice);
          }}
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

        {launchError ? (
          <p
            role="alert"
            data-testid="coop-launch-error"
            className="text-sm text-rose-300"
          >
            {launchError}
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
