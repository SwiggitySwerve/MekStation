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
 * preserved - spec scenario "non-co-op mission skips the picker and
 * launches directly").
 *
 * The picker publishes the local participation choice into the co-op
 * runtime session and subscribes to the other player's choice before
 * allowing the composed co-op encounter launch.
 *
 * @spec openspec/changes/wire-coop-campaign-route/specs/coop-campaign-sync/spec.md
 */

import { useRouter } from 'next/router';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { CoopParticipationChoice } from '@/types/campaign/CoopCampaign';

import { connectStoredCampaignSyncTransport } from '@/lib/campaign/coop/campaignSyncTransport';
import {
  boundCampaignSyncTransport,
  followCampaignSyncSeat,
  type ICampaignSyncSeat,
} from '@/lib/campaign/coop/campaignSyncTransportSeat';
import { readCoopCampaignToken } from '@/lib/campaign/coop/coopCampaignAuthTokenStore';
import {
  type ICoopParticipationRecord,
  publishCoopParticipation,
  subscribeCoopParticipation,
} from '@/lib/campaign/coop/coopRuntimeSession';
import { buildMissionReadinessProjection } from '@/lib/campaign/readiness/missionReadinessProjection';
import { useCombatCatalog } from '@/lib/campaign/readiness/useCombatCatalog';
import {
  getLoadedCampaign,
  renderPendingCampaignPage,
  useCampaignPageShell,
} from '@/pages-modules/gameplay/campaigns/campaignPageShell';
import {
  customizerResultFromRouter,
  missionKeyFromRouter,
  rootForceForCampaign,
} from '@/pages-modules/gameplay/campaigns/missionLaunchPage.helpers';
import {
  coopIdentity,
  defaultParticipationChoice,
  hasCoopSession,
  launchMissionFromPage,
  missionForCampaign,
  nextRosterUnitSelection,
} from '@/pages-modules/gameplay/campaigns/missionLaunchPage.launch';
import {
  CoopMissionLaunchSurface,
  SinglePlayerMissionLaunchSurface,
} from '@/pages-modules/gameplay/campaigns/missionLaunchPage.surfaces';
import { selectRepairBay } from '@/stores/campaign/campaignBaySelectors';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';

function launchSeat(
  campaignId: string,
  matchId: string,
  role: 'host' | 'guest',
): ICampaignSyncSeat | null {
  const playerId = readCoopCampaignToken(matchId)?.playerId;
  return playerId ? { matchId, campaignId, playerId, role } : null;
}

export default function CoopMissionLaunchPage(): React.ReactElement {
  const router = useRouter();
  const catalog = useCombatCatalog(router.asPath);
  const shell = useCampaignPageShell('Mission Launch');
  const campaignKey = shell.routeCampaignId;
  const missionKey = missionKeyFromRouter(router);
  const customizerResult = customizerResultFromRouter(router);

  const store = shell.store;
  const campaign = shell.campaign;
  const { localPlayerId, matchId, otherPlayerId } = coopIdentity(campaign);
  const localForce = useMemo(
    () => (campaign ? rootForceForCampaign(campaign) : null),
    [campaign],
  );
  const rosterUnits = useCampaignRosterStore((state) =>
    state.getUnitsWithReadiness(),
  );
  const rosterPilots = useCampaignRosterStore((state) => state.pilots);
  const mission = missionForCampaign(campaign, missionKey);
  const [selectedRosterUnitIds, setSelectedRosterUnitIds] = useState<
    readonly string[] | null
  >(null);
  const readinessProjection = useMemo(
    () =>
      buildMissionReadinessProjection({
        catalog,
        campaignId: campaign?.id ?? campaignKey ?? 'campaign-pending',
        mission,
        units: rosterUnits,
        pilots: rosterPilots,
        repairBay: selectRepairBay(campaign ?? null),
        selectedRosterUnitIds: selectedRosterUnitIds ?? undefined,
        maxUnits: 4,
        baseCampaignHref: campaign
          ? `/gameplay/campaigns/${encodeURIComponent(campaign.id)}`
          : undefined,
      }),
    [
      campaign,
      campaignKey,
      catalog,
      mission,
      rosterPilots,
      rosterUnits,
      selectedRosterUnitIds,
    ],
  );

  const [participationRecords, setParticipationRecords] = useState<
    readonly ICoopParticipationRecord[]
  >([]);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  // Local player's pick: `deploy` is the canonical default so a host who
  // never opens the picker still launches. Guests start at `command-hq` so
  // the gating rule visibly fires until they pick.
  const localDefault = defaultParticipationChoice(campaign);
  const [localChoice, setLocalChoice] =
    useState<CoopParticipationChoice>(localDefault);
  // A replacement transport re-sends the choice current when it is seated.
  const localChoiceRef = useRef(localChoice);
  localChoiceRef.current = localChoice;

  useEffect(() => {
    setSelectedRosterUnitIds(null);
  }, [campaignKey, missionKey]);

  const handleToggleRosterUnit = useCallback(
    (unitId: string) => {
      setLaunchError(null);
      const selected = readinessProjection.selectedRosterUnitIds;
      setSelectedRosterUnitIds(nextRosterUnitSelection(selected, unitId));
    },
    [readinessProjection.selectedRosterUnitIds],
  );

  useEffect(() => {
    if (!campaign?.coopSession || !matchId || !missionKey || !localForce) {
      return;
    }
    const record: ICoopParticipationRecord = {
      matchId,
      missionId: missionKey,
      playerId: localPlayerId,
      role: campaign.coopSession.mode,
      choice: localChoice,
      force: localForce,
    };
    publishCoopParticipation(record);
    connectStoredCampaignSyncTransport({
      expectedCampaignId: campaign.id,
      matchId,
      role: campaign.coopSession.mode,
      roomCode: campaign.coopSession.roomCode,
    });
    const seat = launchSeat(campaign.id, matchId, campaign.coopSession.mode);
    (seat && boundCampaignSyncTransport(seat))?.sendParticipation({
      missionId: missionKey,
      forceId: localForce.id,
      choice: localChoice,
    });
  }, [
    campaign?.coopSession,
    campaign?.id,
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
    const unsubscribeLocal = subscribeCoopParticipation(
      matchId,
      missionKey,
      setParticipationRecords,
    );
    connectStoredCampaignSyncTransport({
      expectedCampaignId: campaign.id,
      matchId,
      role: campaign.coopSession.mode,
      roomCode: campaign.coopSession.roomCode,
    });
    const seat = launchSeat(campaign.id, matchId, campaign.coopSession.mode);
    // G2-RESEAT-1: A's listener is detached before B's is attached, so a
    // late A frame publishes nothing; B is told the current choice once.
    const stopFollowing = seat
      ? followCampaignSyncSeat(seat, (transport, replaced) => {
          const force = rootForceForCampaign(campaign);
          if (replaced && force) {
            transport.sendParticipation({
              missionId: missionKey,
              forceId: force.id,
              choice: localChoiceRef.current,
            });
          }
          return transport.onFrame((message) => {
            if (
              message.kind !== 'CampaignParticipation' ||
              message.matchId !== matchId ||
              message.participation.missionId !== missionKey
            ) {
              return;
            }
            const force = campaign.forces.get(message.participation.forceId);
            if (!force) {
              return;
            }
            publishCoopParticipation({
              matchId: message.matchId,
              missionId: message.participation.missionId,
              playerId: message.playerId,
              role: message.role,
              choice: message.participation.choice,
              force,
            });
          });
        })
      : () => undefined;
    return () => {
      unsubscribeLocal();
      stopFollowing();
    };
  }, [campaign, matchId, missionKey]);

  const otherRecord = useMemo(
    () =>
      participationRecords.find((entry) => entry.playerId === otherPlayerId),
    [otherPlayerId, participationRecords],
  );
  const otherChoice = otherRecord?.choice;

  const handleLaunch = useCallback(async () => {
    await launchMissionFromPage({
      campaign,
      campaignKey,
      localChoice,
      localForce,
      localPlayerId,
      matchId,
      missionKey,
      otherRecord,
      readinessProjection,
      router,
      setIsLaunching,
      setLaunchError,
      store,
    });
  }, [
    campaign,
    campaignKey,
    localChoice,
    localForce,
    localPlayerId,
    matchId,
    missionKey,
    otherRecord,
    readinessProjection,
    router,
    store,
  ]);

  const pending = renderPendingCampaignPage(shell, {
    title: 'Mission Launch',
    subtitle: 'Loading mission launch surface...',
  });
  if (pending) return pending;

  const loadedCampaign = getLoadedCampaign(shell);
  const missionDisplayName = mission?.name ?? 'Selected mission';

  if (!hasCoopSession(loadedCampaign)) {
    return (
      <SinglePlayerMissionLaunchSurface
        breadcrumbs={shell.breadcrumbs}
        customizerResult={customizerResult}
        isLaunching={isLaunching}
        launchError={launchError}
        loadedCampaign={loadedCampaign}
        missionDisplayName={missionDisplayName}
        missionKey={missionKey}
        onLaunch={handleLaunch}
        onToggleRosterUnit={handleToggleRosterUnit}
        readinessProjection={readinessProjection}
      />
    );
  }

  return (
    <CoopMissionLaunchSurface
      breadcrumbs={shell.breadcrumbs}
      launchError={launchError}
      loadedCampaign={loadedCampaign}
      localChoice={localChoice}
      missionDisplayName={missionDisplayName}
      onClearLaunchError={() => setLaunchError(null)}
      onLaunch={handleLaunch}
      onLocalChoiceChange={setLocalChoice}
      otherChoice={otherChoice}
    />
  );
}
