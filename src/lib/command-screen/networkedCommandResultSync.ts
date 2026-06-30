import type {
  ICommandCommitResult,
  IPlayerCommandResult,
} from '@/types/command-screen';
import type {
  ICommandResultPublishedPayload,
  IGameEvent,
} from '@/types/gameplay';

import { GameEventType } from '@/types/gameplay';

import { projectCommandResultForPlayer } from './commandScreenProjection';

export interface IBuildCommandResultPublishedEventInput {
  readonly gameId: string;
  readonly sequence: number;
  readonly turn: number;
  readonly phase: IGameEvent['phase'];
  readonly actorId: string;
  readonly source: ICommandResultPublishedPayload['source'];
  readonly result: ICommandCommitResult;
  readonly eventId?: string;
  readonly timestamp?: string;
}

export function buildPlayerSafeCommandResultEvent(
  input: IBuildCommandResultPublishedEventInput,
): IGameEvent {
  const playerResult = projectCommandResultForPlayer(input.result);
  return {
    id: input.eventId ?? `command-result-${input.sequence}`,
    gameId: input.gameId,
    type: GameEventType.CommandResultPublished,
    sequence: input.sequence,
    timestamp: input.timestamp ?? new Date().toISOString(),
    turn: input.turn,
    phase: input.phase,
    actorId: input.actorId,
    visibility: 'public',
    payload: {
      source: input.source,
      result: playerResult,
      publicSummary: extractPublicSummary(playerResult.publicEffect),
    } satisfies ICommandResultPublishedPayload,
  };
}

export function extractPlayerSafeCommandResults(
  events: readonly IGameEvent[],
): readonly (ICommandResultPublishedPayload & {
  readonly result: IPlayerCommandResult;
})[] {
  return events
    .filter(isCommandResultPublishedEvent)
    .map((event) => event.payload)
    .filter(isPlayerCommandResultPayload);
}

function isCommandResultPublishedEvent(event: IGameEvent): boolean {
  return event.type === GameEventType.CommandResultPublished;
}

function isPlayerCommandResultPayload(
  payload: IGameEvent['payload'],
): payload is ICommandResultPublishedPayload & {
  readonly result: IPlayerCommandResult;
} {
  if (typeof payload !== 'object' || payload === null) return false;
  const candidate = payload as ICommandResultPublishedPayload;
  const result = candidate.result as Partial<IPlayerCommandResult> | null;
  return (
    (candidate.source === 'host-command' ||
      candidate.source === 'host-gm-intervention') &&
    typeof candidate.publicSummary === 'string' &&
    typeof result === 'object' &&
    result !== null &&
    typeof result.commandId === 'string' &&
    typeof result.domain === 'string' &&
    typeof result.status === 'string'
  );
}

function extractPublicSummary(effect: unknown): string {
  if (
    typeof effect === 'object' &&
    effect !== null &&
    'summary' in effect &&
    typeof (effect as { summary?: unknown }).summary === 'string'
  ) {
    return (effect as { summary: string }).summary;
  }
  return 'Command result published.';
}
