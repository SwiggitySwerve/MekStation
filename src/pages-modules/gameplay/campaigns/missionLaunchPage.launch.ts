import type { NextRouter } from 'next/router';

import type { ICoopParticipationRecord } from '@/lib/campaign/coop/coopRuntimeSession';
import type { IMissionReadinessProjection } from '@/lib/campaign/readiness/missionReadinessProjection';
import type { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { CoopParticipationChoice } from '@/types/campaign/CoopCampaign';
import type { IForce } from '@/types/campaign/Force';

import {
  getCoopLocalPlayerId,
  getCoopMatchId,
  getCoopOtherPlayerId,
} from '@/lib/campaign/coop/coopRuntimeSession';
import { materializeCampaignMissionEncounter } from '@/lib/campaign/encounter/materializeCampaignMissionEncounter';
import { selectedRosterUnitsForLaunch } from '@/lib/campaign/readiness/missionReadinessProjection';

import {
  buildLaunchEncounter,
  campaignEncounterHref,
  withMissionScenario,
} from './missionLaunchPage.helpers';

export type CampaignPageStore = ReturnType<typeof useCampaignStore>;
export type CoopCampaign = ICampaign & {
  readonly coopSession: NonNullable<ICampaign['coopSession']>;
};

export interface ICoopIdentity {
  readonly matchId: string | null;
  readonly localPlayerId: string;
  readonly otherPlayerId: string;
}

export interface ICoopLaunchReadiness {
  readonly bothChosen: boolean;
  readonly noDeploy: boolean;
  readonly canLaunch: boolean;
}

interface ILaunchMissionInput {
  readonly campaign: ICampaign | null;
  readonly campaignKey: string | null;
  readonly missionKey: string | null;
  readonly matchId: string | null;
  readonly localForce: IForce | null;
  readonly otherRecord?: ICoopParticipationRecord;
  readonly localPlayerId: string;
  readonly localChoice: CoopParticipationChoice;
  readonly readinessProjection: IMissionReadinessProjection;
  readonly router: NextRouter;
  readonly store: CampaignPageStore;
  readonly setLaunchError: (error: string | null) => void;
  readonly setIsLaunching: (isLaunching: boolean) => void;
}

interface ICoopLaunchMissionInput extends ILaunchMissionInput {
  readonly campaign: CoopCampaign;
  readonly missionKey: string;
  readonly matchId: string;
  readonly localForce: IForce;
  readonly otherRecord: ICoopParticipationRecord;
}

interface ISinglePlayerLaunchMissionInput extends ILaunchMissionInput {
  readonly campaign: ICampaign;
  readonly campaignKey: string;
  readonly missionKey: string;
}

export async function launchMissionFromPage(
  input: ILaunchMissionInput,
): Promise<void> {
  if (!input.campaignKey || !input.missionKey) {
    return;
  }

  if (hasCoopSession(input.campaign)) {
    if (!input.matchId || !input.localForce || !input.otherRecord) {
      return;
    }
    await launchCoopMissionFromPage({
      ...input,
      campaign: input.campaign,
      matchId: input.matchId,
      missionKey: input.missionKey,
      localForce: input.localForce,
      otherRecord: input.otherRecord,
    });
    return;
  }

  if (!input.campaign) {
    return;
  }

  await launchSinglePlayerMissionFromPage({
    ...input,
    campaign: input.campaign,
    campaignKey: input.campaignKey,
    missionKey: input.missionKey,
  });
}

export function hasCoopSession(
  campaign: ICampaign | null,
): campaign is CoopCampaign {
  return Boolean(campaign?.coopSession);
}

export function coopIdentity(campaign: ICampaign | null): ICoopIdentity {
  const coopSession = campaign?.coopSession;
  return {
    matchId: getCoopMatchId(coopSession) ?? null,
    localPlayerId: coopSession ? getCoopLocalPlayerId(coopSession) : 'host',
    otherPlayerId: coopSession ? getCoopOtherPlayerId(coopSession) : 'guest',
  };
}

export function missionForCampaign(
  campaign: ICampaign | null,
  missionKey: string | null,
): ReturnType<ICampaign['missions']['get']> {
  return campaign && missionKey ? campaign.missions.get(missionKey) : undefined;
}

export function defaultParticipationChoice(
  campaign: ICampaign | null,
): CoopParticipationChoice {
  return campaign?.coopSession?.mode === 'host' ? 'deploy' : 'command-hq';
}

export function nextRosterUnitSelection(
  selected: readonly string[],
  unitId: string,
): readonly string[] {
  return selected.includes(unitId)
    ? selected.filter((candidate) => candidate !== unitId)
    : [...selected, unitId];
}

export function coopLaunchReadiness(
  localChoice: CoopParticipationChoice,
  otherChoice: CoopParticipationChoice | undefined,
): ICoopLaunchReadiness {
  const bothChosen = otherChoice !== undefined;
  const noDeploy =
    bothChosen && localChoice !== 'deploy' && otherChoice !== 'deploy';
  return { bothChosen, noDeploy, canLaunch: bothChosen && !noDeploy };
}

async function launchCoopMissionFromPage({
  campaign,
  localChoice,
  localForce,
  localPlayerId,
  matchId,
  missionKey,
  otherRecord,
  router,
  setLaunchError,
}: ICoopLaunchMissionInput): Promise<void> {
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

  try {
    const { launchCoopMission } =
      await import('@/lib/campaign/coop/launchCoopMission');
    const result = await launchCoopMission(
      buildLaunchEncounter(campaign, missionKey),
      contributions,
    );
    if (!result.ok) {
      setLaunchError(result.error);
      return;
    }

    setLaunchError(null);
    const destination =
      localChoice === 'deploy'
        ? campaignEncounterHref({
            encounterId: result.encounterId ?? missionKey,
            campaignId: campaign.id,
            missionId: missionKey,
          })
        : `/gameplay/campaigns/${campaign.id}`;
    void router.push(destination);
  } catch (error) {
    setLaunchError(
      error instanceof Error
        ? error.message
        : 'Failed to load co-op launch runtime',
    );
  }
}

async function launchSinglePlayerMissionFromPage({
  campaign,
  campaignKey,
  missionKey,
  readinessProjection,
  router,
  setIsLaunching,
  setLaunchError,
  store,
}: ISinglePlayerLaunchMissionInput): Promise<void> {
  setIsLaunching(true);
  setLaunchError(null);

  try {
    if (!readinessProjection.canLaunch) {
      setLaunchError(
        readinessProjection.unresolvedBlockers
          .map((reason) => reason.message)
          .join(' '),
      );
      return;
    }

    const result = await materializeCampaignMissionEncounter({
      campaign,
      missionId: missionKey,
      rosterUnits: selectedRosterUnitsForLaunch(readinessProjection),
    });
    syncLaunchedMission(campaign, missionKey, result.encounterId, store);
    await router.push(
      campaignEncounterHref({
        encounterId: result.encounterId,
        campaignId: campaignKey,
        missionId: missionKey,
      }),
    );
  } catch (error) {
    setLaunchError(
      error instanceof Error ? error.message : 'Failed to launch mission',
    );
  } finally {
    setIsLaunching(false);
  }
}

function syncLaunchedMission(
  campaign: ICampaign,
  missionKey: string,
  encounterId: string,
  store: CampaignPageStore,
): void {
  const mission = campaign.missions.get(missionKey);
  if (!mission) return;

  const nextMission = withMissionScenario(mission, encounterId);
  const missions = new Map(campaign.missions);
  missions.set(missionKey, nextMission);
  store.getState().updateCampaign({ missions });
  store.getState().getMissionsStore()?.getState().addMission(nextMission);
  store.getState().saveCampaign();
}
