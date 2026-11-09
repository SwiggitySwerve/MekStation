import type { NextRouter } from 'next/router';

import type { ICoopParticipationRecord } from '@/lib/campaign/coop/coopRuntimeSession';
import type { IMissionReadinessProjection } from '@/lib/campaign/readiness/missionReadinessProjection';
import type { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { CoopParticipationChoice } from '@/types/campaign/CoopCampaign';
import type { IForce } from '@/types/campaign/Force';

import {
  CoopMissionCheckpointConflict,
  CoopMissionLaunchRefusal,
  runCoopMissionLaunch,
  hasCoopSession,
  type CoopCampaign,
} from '@/lib/campaign/coop/coopMissionLaunchAttempt';
import { getCoopMatchId } from '@/lib/campaign/coop/coopRuntimeSession';
import { materializeCampaignMissionEncounter } from '@/lib/campaign/encounter/materializeCampaignMissionEncounter';
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
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';

import {
  coopDestination,
  joinRecordedCoopMission,
  prepareCoopMission,
} from './missionLaunchPage.coop';
import {
  campaignEncounterHref,
  withMissionScenario,
} from './missionLaunchPage.helpers';

export type CampaignPageStore = ReturnType<typeof useCampaignStore>;
export {
  hasCoopSession,
  coopIdentity,
  defaultParticipationChoice,
  coopLaunchReadiness,
} from '@/lib/campaign/coop/coopMissionLaunchAttempt';
export type {
  CoopCampaign,
  ICoopIdentity,
  ICoopLaunchReadiness,
} from '@/lib/campaign/coop/coopMissionLaunchAttempt';
export interface ILaunchMissionInput {
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

export interface ICoopLaunchMissionInput extends ILaunchMissionInput {
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
    if (input.campaign.coopSession.mode === 'guest') {
      await joinRecordedCoopMission(input).catch((error: unknown) =>
        surfacePageLaunchFailure(error, input.setLaunchError),
      );
      return;
    }
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

export function missionForCampaign(
  campaign: ICampaign | null,
  missionKey: string | null,
): ReturnType<ICampaign['missions']['get']> {
  return campaign && missionKey ? campaign.missions.get(missionKey) : undefined;
}

export function nextRosterUnitSelection(
  selected: readonly string[],
  unitId: string,
): readonly string[] {
  return selected.includes(unitId)
    ? selected.filter((candidate) => candidate !== unitId)
    : [...selected, unitId];
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

async function launchCoopMissionFromPage(
  input: ICoopLaunchMissionInput,
): Promise<void> {
  const {
    campaign,
    missionKey,
    matchId,
    store,
    setLaunchError,
    setIsLaunching,
    router,
    localChoice,
  } = input;
  if (store.getState().dayAdvanceInFlight) {
    setLaunchError('The campaign clock is advancing. Try again in a moment.');
    return;
  }
  const outcome = await runCoopMissionLaunch({
    owner: store,
    key: [campaign.id, matchId, missionKey],
    prepare: () => prepareCoopMission(input),
    setIsLaunching,
    checkpoint: async (receipt, resync) => {
      if (!receipt.encounterId)
        throw new Error('Mission launch returned no encounter id.');
      if (
        !(await useCampaignPersistenceStore
          .getState()
          .loadCampaign(campaign.id))
      ) {
        throw new CoopMissionCheckpointConflict(
          resync
            ? 'Campaign resync failed. Resync and retry the checkpoint.'
            : 'Could not refresh the campaign. Retry the checkpoint.',
        );
      }
      const current = store.getState().campaign;
      if (
        !current ||
        current.id !== campaign.id ||
        current.coopSession?.mode !== 'host' ||
        getCoopMatchId(current.coopSession) !== matchId
      ) {
        throw new Error(
          'The campaign session changed. Return to this mission before retrying.',
        );
      }
      try {
        await syncLaunchedMission(
          current,
          missionKey,
          receipt.encounterId,
          store,
        );
      } catch (error) {
        if (useCampaignPersistenceStore.getState().saveState === 'conflict') {
          throw new CoopMissionCheckpointConflict(
            'Campaign changed on another client. Resync and retry the checkpoint; the mission will not launch again.',
          );
        }
        throw error;
      }
    },
    navigate: (receipt) =>
      router.push(
        coopDestination(campaign.id, missionKey, localChoice, receipt),
      ),
  });
  if (outcome.kind === 'failed') {
    if (outcome.error instanceof CoopMissionLaunchRefusal) {
      setLaunchError(
        outcome.error.message.includes('COOP_MISSION_UNIT_NOT_READY')
          ? 'A deploying unit is not ready.'
          : outcome.error.message,
      );
    } else surfacePageLaunchFailure(outcome.error, setLaunchError);
  } else if (outcome.kind === 'complete') setLaunchError(null);
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
      readinessContext: {
        campaign,
        pilots: useCampaignRosterStore.getState().pilots,
        rosterUnits: useCampaignRosterStore.getState().units,
        authority: launchHead.readinessAuthority,
      },
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
  if (!mission) {
    if (campaign.coopSession)
      throw new Error(
        'The mission is no longer available. Resync the campaign before retrying the checkpoint.',
      );
    return Promise.resolve();
  }

  const nextMission = withMissionScenario(mission, encounterId);
  const missions = new Map(campaign.missions);
  missions.set(missionKey, nextMission);
  if (campaign.coopSession) {
    if (campaign.coopSession.mode !== 'host') {
      throw new Error('Only the host can checkpoint a mission.');
    }
    // updateCampaign auto-saves co-op. Install both child-store projections
    // through the store's public switch operation, then save exactly once.
    store.getState().switchCampaign({ ...campaign, missions });
    return persistLaunchedMission(store, true);
  }
  store.getState().updateCampaign({ missions });
  store.getState().getMissionsStore()?.getState().addMission(nextMission);
  return persistLaunchedMission(store, false);
}

async function persistLaunchedMission(
  store: CampaignPageStore,
  coop: boolean,
): Promise<void> {
  const localCommit = await store.getState().saveCampaign();
  if (!localCommit.committed) {
    throw new Error(localCommit.reason ?? 'Campaign checkpoint failed');
  }

  if (coop) return;

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
