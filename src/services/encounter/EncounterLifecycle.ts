import type { IEncounter } from '@/types/encounter';

import { EncounterStatus } from '@/types/encounter';
import {
  GameEventType,
  isGameEvent,
  type IGameEvent,
  type IGameConfig,
} from '@/types/gameplay/GameSessionInterfaces';

const TRANSITIONS: Readonly<
  Record<EncounterStatus, readonly EncounterStatus[]>
> = {
  [EncounterStatus.Draft]: [EncounterStatus.Ready, EncounterStatus.Launched],
  [EncounterStatus.Ready]: [EncounterStatus.Draft, EncounterStatus.Launched],
  [EncounterStatus.Launched]: [
    EncounterStatus.Completed,
    EncounterStatus.Draft,
  ],
  [EncounterStatus.Completed]: [],
};

/** Domain policy only; same-session acknowledgements are handled by the writer. */
export function encounterTransitionError(
  current: IEncounter,
  next: EncounterStatus,
  sessionId: string | undefined = current.gameSessionId,
  forceDeletion = false,
): string | null {
  if (!Object.hasOwn(TRANSITIONS, current.status))
    return 'Unknown encounter status';
  if (current.status === next) {
    return sessionId === current.gameSessionId
      ? null
      : 'Cannot reassign encounter session';
  }
  if (!TRANSITIONS[current.status].includes(next)) {
    return `Cannot transition encounter from ${current.status} to ${next}`;
  }
  if (next === EncounterStatus.Launched) {
    return !sessionId?.trim() || current.gameSessionId
      ? 'Launch requires a new session and an encounter without stale linkage'
      : null;
  }
  if (next === EncounterStatus.Completed) {
    return sessionId && sessionId === current.gameSessionId
      ? null
      : 'Completion requires the linked game session';
  }
  if (current.status === EncounterStatus.Launched) {
    return forceDeletion && !current.playerForce && !current.opponentForce
      ? null
      : 'Only force deletion clearing both slots may demote a launched encounter';
  }
  return current.gameSessionId ? 'Encounter has stale session linkage' : null;
}

/** Validate supplied history before any link, replay write or completion. */
export function encounterSessionEvidenceError(
  encounterId: string,
  gameId: string,
  events: unknown,
  terminal: boolean,
): string | null {
  if (!gameId.trim() || !Array.isArray(events) || events.length === 0) {
    return 'Game session history is required';
  }
  if (
    !events.every(
      (event: unknown): event is IGameEvent =>
        isGameEvent(event) && event.payload !== null,
    )
  ) {
    return 'Invalid game session event';
  }
  const history: readonly IGameEvent[] = events;
  if (
    history.some(
      (event, index) =>
        event.gameId !== gameId ||
        (index > 0 && event.sequence <= history[index - 1].sequence),
    )
  ) {
    return 'Game session events do not match the game or sequence';
  }
  const created = history[0];
  if (created.type !== GameEventType.GameCreated || created.sequence !== 0)
    return 'GameCreated must start the history';
  const payload: unknown = created.payload;
  if (!payload || typeof payload !== 'object' || !('config' in payload))
    return 'GameCreated config is required';
  const config = payload.config;
  if (
    !config ||
    typeof config !== 'object' ||
    !('encounterId' in config) ||
    config.encounterId !== encounterId
  )
    return 'Game session does not match the encounter';
  if (terminal && history.at(-1)?.type !== GameEventType.GameEnded)
    return 'GameEnded must finish the history';
  return null;
}

/** Existing configuration/cascade classification, independent of persistence. */
export function recalculateEncounterLifecycleStatus(
  encounter: IEncounter,
): EncounterStatus {
  if (encounter.status === EncounterStatus.Completed) return encounter.status;
  if (encounter.status === EncounterStatus.Launched) {
    return !encounter.playerForce && !encounter.opponentForce
      ? EncounterStatus.Draft
      : encounter.status;
  }
  return encounter.playerForce &&
    (encounter.opponentForce || encounter.opForConfig) &&
    encounter.victoryConditions &&
    encounter.victoryConditions.length > 0
    ? EncounterStatus.Ready
    : EncounterStatus.Draft;
}

function hasLaunchId(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function normalizeLaunchId(
  value: string | null | undefined,
): string | null {
  return hasLaunchId(value) ? value : null;
}

export function validateContractLaunchLinkage(
  options: Pick<IGameConfig, 'campaignId' | 'contractId' | 'scenarioId'>,
): string | null {
  if (options.contractId === undefined || options.contractId === null) {
    return null;
  }

  const missing: string[] = [];
  if (!hasLaunchId(options.campaignId)) missing.push('campaignId');
  if (!hasLaunchId(options.contractId)) missing.push('contractId');
  if (!hasLaunchId(options.scenarioId)) missing.push('scenarioId');

  if (missing.length === 0) {
    return null;
  }

  return `Cannot launch contract encounter without ${missing.join(', ')}`;
}
