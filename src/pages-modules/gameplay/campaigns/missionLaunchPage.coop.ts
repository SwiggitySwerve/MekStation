import type {
  CoopMissionLaunchReceipt,
  CoopMissionLaunchOperation,
} from '@/lib/campaign/coop/coopMissionLaunchAttempt';
import type { CoopParticipationChoice } from '@/types/campaign/CoopCampaign';

import { readRecordedCoopEncounter } from '@/lib/campaign/coop/coopMissionLaunchAttempt';
import {
  getCoopMatchId,
  getCoopRuntimeSessionByMatch,
} from '@/lib/campaign/coop/coopRuntimeSession';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';

import type {
  ILaunchMissionInput,
  ICoopLaunchMissionInput,
} from './missionLaunchPage.launch';

import {
  buildLaunchEncounter,
  campaignEncounterHref,
} from './missionLaunchPage.helpers';

export function coopDestination(
  campaignId: string,
  missionId: string,
  choice: CoopParticipationChoice,
  receipt: Pick<CoopMissionLaunchReceipt, 'encounterId'>,
): string {
  if (choice === 'command-hq') return `/gameplay/campaigns/${campaignId}`;
  if (!receipt.encounterId)
    throw new Error('The host has not recorded this mission yet.');
  return campaignEncounterHref({
    encounterId: receipt.encounterId,
    campaignId,
    missionId,
  });
}

export async function joinRecordedCoopMission(
  input: ILaunchMissionInput,
): Promise<void> {
  const {
    campaign,
    missionKey,
    store,
    router,
    localChoice,
    setIsLaunching,
    setLaunchError,
  } = input;
  if (!campaign || !missionKey) return;
  setIsLaunching(true);
  setLaunchError(null);
  try {
    if (
      !(await useCampaignPersistenceStore.getState().loadCampaign(campaign.id))
    ) {
      throw new Error('Could not refresh the host mission. Try again.');
    }
    const current = store.getState().campaign;
    if (
      !current ||
      current.id !== campaign.id ||
      current.coopSession?.mode !== 'guest' ||
      getCoopMatchId(current.coopSession) !==
        getCoopMatchId(campaign.coopSession)
    ) {
      throw new Error(
        'The campaign session changed. Reopen this mission to join.',
      );
    }
    const encounterId =
      localChoice === 'deploy'
        ? await readRecordedCoopEncounter(
            current.missions.get(missionKey)?.scenarioIds ?? [],
          )
        : null;
    const navigated = await router.push(
      coopDestination(campaign.id, missionKey, localChoice, {
        encounterId: encounterId ?? undefined,
      }),
    );
    if (navigated === false)
      throw new Error('Navigation was cancelled. Retry to join the mission.');
  } finally {
    setIsLaunching(false);
  }
}

export async function prepareCoopMission(
  input: ICoopLaunchMissionInput,
): Promise<CoopMissionLaunchOperation> {
  const {
    campaign,
    missionKey,
    matchId,
    store,
    localForce,
    localChoice,
    localPlayerId,
    otherRecord,
  } = input;
  const { launchCoopMission, prepareCoopMissionLaunch } =
    await import('@/lib/campaign/coop/launchCoopMission');
  useCampaignPersistenceStore.getState().clearLaunchConflict();
  const runtime = getCoopRuntimeSessionByMatch(matchId);
  return prepareCoopMissionLaunch({
    campaign,
    missionKey,
    matchId,
    encounter: buildLaunchEncounter(campaign, missionKey),
    contributions: [
      {
        playerId: localPlayerId,
        role: campaign.coopSession.mode,
        force: localForce,
        choice: localChoice,
      },
      otherRecord,
    ].map((entry) => ({
      playerId: entry.playerId,
      role: entry.role,
      force: entry.force,
      participation: entry.choice,
    })),
    selectedUnits: Object.values(
      runtime?.host.getState().rosterUnits ?? {},
    ).map((unit) => ({
      unitId: unit.unitId,
      unitName: unit.designation,
      unitRef: unit.unitRef,
      unitSource: unit.unitSource,
    })),
    roster: useCampaignRosterStore.getState(),
    launch: launchCoopMission,
    beforeLaunch: () => {
      if (store.getState().dayAdvanceInFlight)
        throw new Error(
          'The campaign clock is advancing. Try again in a moment.',
        );
      const current = store.getState().campaign;
      if (
        current &&
        (current.id !== campaign.id ||
          current.coopSession?.mode !== 'host' ||
          getCoopMatchId(current.coopSession) !== matchId)
      )
        throw new Error('The campaign session changed. Reopen this mission.');
    },
  });
}
