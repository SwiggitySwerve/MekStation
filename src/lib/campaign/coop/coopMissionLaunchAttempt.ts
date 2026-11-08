import type { ICampaign } from '@/types/campaign/Campaign';
import type { CoopParticipationChoice } from '@/types/campaign/CoopCampaign';

import type { LaunchCoopMissionResult } from './launchCoopMission';

import {
  getCoopMatchId,
  getCoopLocalPlayerId,
  getCoopOtherPlayerId,
} from './coopRuntimeSession';

export type CoopMissionLaunchReceipt = Pick<
  Extract<LaunchCoopMissionResult, { ok: true }>,
  'ok' | 'encounterId' | 'gameSessionId' | 'missionMatchId'
>;
export type CoopMissionLaunchOperation = () => Promise<
  CoopMissionLaunchReceipt | Extract<LaunchCoopMissionResult, { ok: false }>
>;
type Progress =
  | { readonly stage: 'preparing' }
  | { readonly stage: 'launching'; readonly launch: CoopMissionLaunchOperation }
  | {
      readonly stage: 'checkpointing';
      readonly receipt: CoopMissionLaunchReceipt;
      readonly resync: boolean;
    }
  | {
      readonly stage: 'navigating' | 'complete';
      readonly receipt: CoopMissionLaunchReceipt;
    };

interface IAttempt {
  busy: boolean;
  progress: Progress;
}

interface ICoopMissionLaunchInput {
  readonly owner: object;
  readonly key: readonly string[];
  readonly prepare: () => Promise<CoopMissionLaunchOperation>;
  readonly checkpoint: (
    receipt: CoopMissionLaunchReceipt,
    resync: boolean,
  ) => Promise<void>;
  readonly navigate: (
    receipt: CoopMissionLaunchReceipt,
  ) => Promise<boolean | void>;
  readonly setIsLaunching: (busy: boolean) => void;
}

export class CoopMissionCheckpointConflict extends Error {}
export class CoopMissionLaunchRefusal extends Error {}

const attempts = new WeakMap<object, Map<string, IAttempt>>();

/** A scenario placeholder is not a launched encounter. Resolve a stored session link. */
export async function readRecordedCoopEncounter(
  scenarioIds: readonly string[],
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  for (const id of scenarioIds) {
    const response = await fetchImpl(
      `/api/encounters/${encodeURIComponent(id)}`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (response.status === 404) continue;
    if (!response.ok)
      throw new Error('Could not read the host encounter. Try again.');
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object' || !('encounter' in payload))
      throw new Error('The host encounter response is invalid.');
    const encounter = payload.encounter;
    if (
      !encounter ||
      typeof encounter !== 'object' ||
      !('id' in encounter) ||
      encounter.id !== id
    )
      throw new Error('The host encounter response is invalid.');
    if (
      'gameSessionId' in encounter &&
      typeof encounter.gameSessionId === 'string' &&
      encounter.gameSessionId.trim()
    )
      return id;
  }
  return null;
}

/**
 * One retained attempt per mission. Capture the guard before calling anything
 * asynchronous; a rendered disabled button cannot protect two calls in one tick.
 * @spec openspec/changes/guard-coop-mission-launch/specs/coop-campaign-sync/spec.md
 */
export async function runCoopMissionLaunch(
  input: ICoopMissionLaunchInput,
): Promise<
  | { readonly kind: 'busy' | 'complete' }
  | { readonly kind: 'failed'; readonly error: unknown }
> {
  let owned = attempts.get(input.owner);
  if (!owned) {
    owned = new Map();
    attempts.set(input.owner, owned);
  }
  const key = JSON.stringify(input.key);
  let attempt = owned.get(key);
  if (!attempt) {
    attempt = { busy: false, progress: { stage: 'preparing' } };
    owned.set(key, attempt);
  }
  if (attempt.busy) return { kind: 'busy' };
  if (attempt.progress.stage === 'complete') {
    attempt.progress = {
      stage: 'navigating',
      receipt: attempt.progress.receipt,
    };
  }
  attempt.busy = true;
  input.setIsLaunching(true);
  try {
    if (attempt.progress.stage === 'preparing') {
      const launch = await input.prepare();
      attempt.progress = { stage: 'launching', launch };
    }
    if (attempt.progress.stage === 'launching') {
      const receipt = await attempt.progress.launch();
      if (!receipt.ok) {
        if (!receipt.retryable) attempt.progress = { stage: 'preparing' };
        throw new CoopMissionLaunchRefusal(receipt.error);
      }
      attempt.progress = { stage: 'checkpointing', receipt, resync: false };
    }
    if (attempt.progress.stage === 'checkpointing') {
      await input.checkpoint(attempt.progress.receipt, attempt.progress.resync);
      attempt.progress = {
        stage: 'navigating',
        receipt: attempt.progress.receipt,
      };
    }
    if (attempt.progress.stage === 'navigating') {
      const navigated = await input.navigate(attempt.progress.receipt);
      if (navigated === false)
        throw new Error('Navigation was cancelled. Retry to open the mission.');
      attempt.progress = {
        stage: 'complete',
        receipt: attempt.progress.receipt,
      };
    }
    return { kind: 'complete' };
  } catch (error) {
    if (
      error instanceof CoopMissionCheckpointConflict &&
      attempt.progress.stage === 'checkpointing'
    ) {
      attempt.progress = { ...attempt.progress, resync: true };
    }
    return { kind: 'failed', error };
  } finally {
    attempt.busy = false;
    input.setIsLaunching(false);
  }
}

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

export function defaultParticipationChoice(
  campaign: ICampaign | null,
): CoopParticipationChoice {
  return campaign?.coopSession?.mode === 'host' ? 'deploy' : 'command-hq';
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
