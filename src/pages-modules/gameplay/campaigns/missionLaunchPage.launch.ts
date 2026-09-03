import type { NextRouter } from 'next/router';

import type { ICoopParticipationRecord } from '@/lib/campaign/coop/coopRuntimeSession';
import type { CampaignLaunchHeadRead } from '@/lib/campaign/encounter/readCampaignLaunchHead';
import type { IMissionReadinessProjection } from '@/lib/campaign/readiness/missionReadinessProjection';
import type { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { CoopParticipationChoice } from '@/types/campaign/CoopCampaign';
import type { IForce } from '@/types/campaign/Force';

import {
  getCoopLocalPlayerId,
  getCoopMatchId,
  getCoopOtherPlayerId,
  getCoopRuntimeSessionByMatch,
} from '@/lib/campaign/coop/coopRuntimeSession';
import { materializeCampaignMissionEncounter } from '@/lib/campaign/encounter/materializeCampaignMissionEncounter';
import { assertOwnedForcesCurrent } from '@/lib/campaign/encounter/materializeCampaignMissionEncounter.ownedForces';
import { readCampaignLaunchHead } from '@/lib/campaign/encounter/readCampaignLaunchHead';
import {
  classifyLaunchFailure,
  resolveLaunchForces,
} from '@/lib/campaign/encounter/requestLaunchAuthority';
import { fetchCanonicalCatalogSnapshot } from '@/lib/campaign/readiness/canonicalCatalogAdmission';
import { selectedRosterUnitsForLaunch } from '@/lib/campaign/readiness/missionReadinessProjection';
import {
  type CampaignPersistenceSaveResult,
  useCampaignPersistenceStore,
} from '@/stores/campaign/useCampaignPersistenceStore';

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
  readonly router: Pick<NextRouter, 'push'>;
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

/**
 * Name the journal revision the server head reported, or omit it.
 *
 * Why: sequence N lives at journal revision N+1, so a runtime-derived
 * revision is reliably one too low. Only a `head` answer is a number
 * this launch may send.
 */
function catalogRevisionFromLaunchHead(
  launchHead: CampaignLaunchHeadRead,
): number | undefined {
  return launchHead.kind === 'head' ? launchHead.revision : undefined;
}

/**
 * Surface a launch failure as the dashboard's typed conflict or a message.
 *
 * Why: a stale head must reach `reportLaunchConflict` so the existing
 * dashboard card can render it. Folding it into a bare string would hide
 * the resync action.
 */
function surfacePageLaunchFailure(
  error: unknown,
  setLaunchError: (error: string | null) => void,
): void {
  const failure = classifyLaunchFailure(error);
  if (failure.kind === 'conflict') {
    useCampaignPersistenceStore
      .getState()
      .reportLaunchConflict(failure.conflict);
    setLaunchError(
      `Launch refused (${failure.conflict.code}): the campaign has moved on to revision ${failure.conflict.activeHead.revision}.`,
    );
    return;
  }
  setLaunchError(failure.message);
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
    const catalog = await fetchCanonicalCatalogSnapshot();
    const runtime = getCoopRuntimeSessionByMatch(matchId);
    useCampaignPersistenceStore.getState().clearLaunchConflict();
    const launchHead = await readCampaignLaunchHead(campaign.id);
    const ownedForces = await resolveLaunchForces({
      campaignId: campaign.id,
      missionId: missionKey,
      launchHead,
      sessionId: matchId,
    });
    assertOwnedForcesCurrent(ownedForces);
    const revision = catalogRevisionFromLaunchHead(launchHead);
    const result = await launchCoopMission(
      buildLaunchEncounter(campaign, missionKey),
      contributions,
      undefined,
      {
        snapshot: {
          campaignId: campaign.id,
          matchId,
          revision,
          catalog,
        },
        expected: { campaignId: campaign.id, matchId, revision },
        selectedUnits: Object.values(
          runtime?.host.getState().rosterUnits ?? {},
        ).map((unit) => ({
          unitId: unit.unitId,
          unitName: unit.designation,
          unitRef: unit.unitRef,
          unitSource: unit.unitSource,
        })),
      },
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
    surfacePageLaunchFailure(error, setLaunchError);
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

    const rosterUnits = selectedRosterUnitsForLaunch(readinessProjection);
    const catalog = await fetchCanonicalCatalogSnapshot();
    useCampaignPersistenceStore.getState().clearLaunchConflict();
    const launchHead = await readCampaignLaunchHead(campaign.id);
    const ownedForces = await resolveLaunchForces({
      campaignId: campaign.id,
      missionId: missionKey,
      launchHead,
    });
    const result = await materializeCampaignMissionEncounter({
      campaign,
      missionId: missionKey,
      rosterUnits,
      catalog,
      ...(ownedForces === undefined ? {} : { ownedForces }),
    });
    await syncLaunchedMission(campaign, missionKey, result.encounterId, store);
    await router.push(
      campaignEncounterHref({
        encounterId: result.encounterId,
        campaignId: campaignKey,
        missionId: missionKey,
      }),
    );
  } catch (error) {
    surfacePageLaunchFailure(error, setLaunchError);
  } finally {
    setIsLaunching(false);
  }
}

export function syncLaunchedMission(
  campaign: ICampaign,
  missionKey: string,
  encounterId: string,
  store: CampaignPageStore,
): Promise<void> {
  const mission = campaign.missions.get(missionKey);
  if (!mission) return Promise.resolve();

  const nextMission = withMissionScenario(mission, encounterId);
  const missions = new Map(campaign.missions);
  missions.set(missionKey, nextMission);
  store.getState().updateCampaign({ missions });
  store.getState().getMissionsStore()?.getState().addMission(nextMission);
  return persistLaunchedMission(store);
}

async function persistLaunchedMission(store: CampaignPageStore): Promise<void> {
  const localCommit = await store.getState().saveCampaign();
  if (!localCommit.committed) {
    throw new Error(localCommit.reason ?? 'Campaign checkpoint failed');
  }

  const durableCommit = await useCampaignPersistenceStore
    .getState()
    .saveCampaign();
  if (durableCommit.status !== 'saved') {
    throw new Error(campaignPersistenceFailureMessage(durableCommit));
  }
}

function campaignPersistenceFailureMessage(
  result: Exclude<CampaignPersistenceSaveResult, { readonly status: 'saved' }>,
): string {
  if (result.status === 'error') return result.errorMessage;
  if (result.status === 'conflict') {
    return 'Campaign changed on another client. Resolve the save conflict before launching.';
  }
  return 'Campaign checkpoint was skipped. Retry mission launch.';
}
