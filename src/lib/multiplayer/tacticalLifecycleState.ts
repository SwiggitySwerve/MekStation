/** Persistent lifecycle posture for the networked tactical match surface. */

import type {
  LifecycleProjectionSignal,
  LifecycleState,
} from '@/lib/lifecycle/lifecycleState';
import type { IClientLifecycleState } from '@/lib/multiplayer/client';

import {
  GameEventType,
  GamePhase,
  type GameSide,
} from '@/types/gameplay/GameSessionInterfaces';

/**
 * Aliased to the shared vocabulary (umbrella 19.1) rather than redeclared.
 * The campaign and GM surfaces name their postures from the same union, and
 * the compiler is what keeps the three from drifting apart - a name added or
 * renamed here is added or renamed everywhere, which is the whole point of
 * having one vocabulary.
 */
export type TacticalLifecycleState = LifecycleState;

/**
 * Owned by `add-authoritative-history-branches`; half of it is now LIVE.
 *
 * `PROJECTION_REBUILDING` is a real server refusal: the match stream
 * refuses an engine-mutating intent while a correction lease rebuilds
 * this match's history, and `projectionSignalFromServerError` below
 * turns that refusal into this signal. So `rebuilding` is reachable in
 * a live match today, and the tactical surface must gate on it.
 *
 * `PROJECTION_REWOUND` remains reachable-when-emitted, and not by
 * oversight: it is not a member of `ErrorCodeSchema`, so the wire
 * cannot carry it at all. A producer landing is what earns the second
 * arm of the mapper - a row pins that absence rather than leaving it a
 * claim in a comment.
 *
 * `STALE_BRANCH` is the live combat branch-admission refusal. Campaign
 * already folds it onto the existing `blocked` posture; this channel
 * admits the same code here as a typed payload so the surface can
 * carry the server's head and recovery action without a new state name.
 */
export interface ITacticalConflictHead {
  readonly branchId: string;
  readonly revision: number;
}

export interface ITacticalBranchRefusal {
  readonly code: 'STALE_BRANCH';
  readonly conflictHead: ITacticalConflictHead | null;
  readonly recoveryAction: string | null;
}

export type TacticalLifecycleProjectionSignal =
  | LifecycleProjectionSignal
  | ITacticalBranchRefusal;

/**
 * WHAT: Narrows the projection channel to a typed branch refusal.
 * WHY: STALE_BRANCH is an object on a channel that is otherwise two
 * string codes; callers must distinguish it without treating the payload
 * as a bare string.
 */
export function isTacticalBranchRefusal(
  signal: TacticalLifecycleProjectionSignal | null,
): signal is ITacticalBranchRefusal {
  return (
    typeof signal === 'object' &&
    signal !== null &&
    signal.code === 'STALE_BRANCH'
  );
}

/**
 * Turns a server `Error` frame's code into a projection signal.
 *
 * Deliberately total and deliberately narrow: every code that is not a
 * projection refusal or a live branch refusal answers `null`, so a
 * rate-limit or a wrong-phase rejection can never freeze the board. The
 * parameter is a plain `string | undefined` rather than `IErrorCode`
 * because the client surfaces whatever the wire sent - including a code
 * from a newer server this build does not know - and an unknown code
 * must map to "no signal" rather than throw.
 */
export function projectionSignalFromServerError(
  code: string | undefined,
  frame?: unknown,
): TacticalLifecycleProjectionSignal | null {
  if (code === 'PROJECTION_REBUILDING') return 'PROJECTION_REBUILDING';
  if (code === 'STALE_BRANCH') {
    return {
      code: 'STALE_BRANCH',
      conflictHead: readConflictHead(frame),
      recoveryAction: readRecoveryAction(frame),
    };
  }
  return null;
}

export interface ITacticalLifecyclePosture {
  readonly state: TacticalLifecycleState;
  readonly commandsEnabled: boolean;
  readonly message: string;
  readonly recoveryAction?: string | null;
  readonly conflictHead?: ITacticalConflictHead | null;
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
  const branch = isTacticalBranchRefusal(input.projectionSignal)
    ? input.projectionSignal
    : null;
  return {
    state,
    commandsEnabled: state === 'live' || state === 'finalized',
    message: MESSAGES[state],
    recoveryAction: branch?.recoveryAction ?? null,
    conflictHead: branch?.conflictHead ?? null,
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
  if (isTacticalBranchRefusal(input.projectionSignal)) return 'blocked';
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

/**
 * WHAT: Reads the optional conflict head off an Error-frame-shaped object.
 * WHY: The wire head is optional and untrusted; a malformed head must not
 * invent a branch the server never named.
 */
function readConflictHead(frame: unknown): ITacticalConflictHead | null {
  if (typeof frame !== 'object' || frame === null) return null;
  const raw = Reflect.get(frame, 'conflictHead');
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null;
  }
  const branchId = Reflect.get(raw, 'branchId');
  const revision = Reflect.get(raw, 'revision');
  if (typeof branchId !== 'string' || branchId.length === 0) return null;
  if (
    typeof revision !== 'number' ||
    !Number.isInteger(revision) ||
    revision < 0
  ) {
    return null;
  }
  return { branchId, revision };
}

/**
 * WHAT: Reads the optional recovery action off an Error-frame-shaped object.
 * WHY: The surface renders this string verbatim; an empty or non-string
 * value is treated as absent so the bar never invents wording.
 */
function readRecoveryAction(frame: unknown): string | null {
  if (typeof frame !== 'object' || frame === null) return null;
  const value = Reflect.get(frame, 'recoveryAction');
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected tactical projection signal: ${value}`);
}

export type { IClientLifecycleState } from '@/lib/multiplayer/client';
