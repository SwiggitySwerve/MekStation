/** Persistent lifecycle posture for the networked tactical match surface. */

import type { IClientLifecycleState } from '@/lib/multiplayer/client';

import {
  GameEventType,
  GamePhase,
  type GameSide,
} from '@/types/gameplay/GameSessionInterfaces';

export type TacticalLifecycleState =
  | 'pending'
  | 'sealed'
  | 'finalized'
  | 'syncing'
  | 'reconnecting'
  | 'behind'
  | 'blocked'
  | 'rewound'
  | 'rebuilding'
  | 'live';

/**
 * Reserved for `add-authoritative-history-branches`. The tactical client does
 * not emit either signal yet: accepting one here would falsely claim that a
 * live match can rewind or rebuild today. The branch can pass its typed signal
 * to this model without changing this banner or its locators.
 */
export type TacticalLifecycleProjectionSignal =
  | 'PROJECTION_REWOUND'
  | 'PROJECTION_REBUILDING';

export interface ITacticalLifecyclePosture {
  readonly state: TacticalLifecycleState;
  readonly commandsEnabled: boolean;
  readonly message: string;
}

export interface ITacticalLifecycleInput {
  readonly client: IClientLifecycleState;
  readonly sealedChoiceAwaitingReveal: boolean;
  readonly finalizationLanded: boolean;
  readonly projectionSignal: TacticalLifecycleProjectionSignal | null;
}

/** The wire fields the tactical surface needs, without importing server code. */
export interface ITacticalLifecycleWireEvent {
  readonly actorId?: string;
  readonly payload: unknown;
  readonly phase: GamePhase;
  readonly sequence: number;
  readonly side?: GameSide;
  readonly turn: number;
  readonly type: GameEventType;
}

export interface ITacticalWireFacts {
  readonly sealedChoiceAwaitingReveal: boolean;
  readonly finalizationLanded: boolean;
}

const MESSAGES: Readonly<Record<TacticalLifecycleState, string>> = {
  pending: 'Your command is awaiting the match server.',
  sealed: 'Your declaration is sealed until the phase is revealed.',
  finalized: 'The latest tactical declarations have been finalized.',
  syncing: 'Recovering the tactical match stream…',
  reconnecting: 'Reconnecting to the tactical match…',
  behind: 'Catching up on tactical match updates…',
  blocked: 'Tactical updates stopped because the match stream conflicted.',
  rewound: 'The tactical projection was rewound to an authoritative branch.',
  rebuilding: 'Rebuilding the tactical projection from authoritative history…',
  live: 'Tactical match is up to date.',
};

/** Derives one stable posture with strict severity precedence. */
export function deriveTacticalLifecyclePosture(
  input: ITacticalLifecycleInput,
): ITacticalLifecyclePosture {
  const state = deriveState(input);
  return {
    state,
    commandsEnabled: state === 'live' || state === 'finalized',
    message: MESSAGES[state],
  };
}

/**
 * Reads actor-visible declaration/reveal facts from the mirror. A player's
 * sealed declaration remains sealed only until its phase finalization lands.
 */
export function deriveTacticalWireFacts(
  events: readonly ITacticalLifecycleWireEvent[],
  localSide: GameSide | null,
): ITacticalWireFacts {
  if (localSide === null) {
    return { sealedChoiceAwaitingReveal: false, finalizationLanded: false };
  }

  const ordered = [...events].sort(
    (left, right) => right.sequence - left.sequence,
  );
  for (const event of ordered) {
    if (isFinalization(event)) {
      return { sealedChoiceAwaitingReveal: false, finalizationLanded: true };
    }
    if (isOwnSealedDeclaration(event, localSide)) {
      return { sealedChoiceAwaitingReveal: true, finalizationLanded: false };
    }
  }
  return { sealedChoiceAwaitingReveal: false, finalizationLanded: false };
}

function deriveState(input: ITacticalLifecycleInput): TacticalLifecycleState {
  if (input.client.blockedBySequenceCollision) return 'blocked';
  switch (input.projectionSignal) {
    case 'PROJECTION_REBUILDING':
      return 'rebuilding';
    case 'PROJECTION_REWOUND':
      return 'rewound';
    case null:
      break;
    default:
      return assertNever(input.projectionSignal);
  }
  if (input.client.recoveringFromGap) return 'syncing';
  if (input.client.reconnectScheduled) return 'reconnecting';
  if (!input.client.ready) return 'behind';
  if (input.client.pendingIntentCount > 0) return 'pending';
  if (input.sealedChoiceAwaitingReveal) return 'sealed';
  if (input.finalizationLanded) return 'finalized';
  return 'live';
}

function isOwnSealedDeclaration(
  event: ITacticalLifecycleWireEvent,
  localSide: GameSide,
): boolean {
  return event.side === localSide && isSealedDeclarationType(event.type);
}

function isSealedDeclarationType(type: GameEventType): boolean {
  return (
    type === GameEventType.MovementDeclared ||
    type === GameEventType.AttackDeclared ||
    type === GameEventType.PhysicalAttackDeclared
  );
}

function isFinalization(event: ITacticalLifecycleWireEvent): boolean {
  if (event.type === GameEventType.AttacksRevealed) return true;
  if (event.type !== GameEventType.PhaseChanged) return false;
  const fromPhase = stringField(event.payload, 'fromPhase');
  return (
    fromPhase === GamePhase.Movement ||
    fromPhase === GamePhase.WeaponAttack ||
    fromPhase === GamePhase.PhysicalAttack
  );
}

function stringField(value: unknown, key: string): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const field = (value as Readonly<Record<string, unknown>>)[key];
  return typeof field === 'string' ? field : null;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected tactical projection signal: ${value}`);
}

export type { IClientLifecycleState } from '@/lib/multiplayer/client';
