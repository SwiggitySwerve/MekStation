import type { InteractiveSession } from '@/engine/InteractiveSession';
import type { IIntent } from '@/types/multiplayer/Protocol';

import {
  GameSide,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';

type EngineIntent = Exclude<
  IIntent['intent'],
  {
    readonly kind:
      | 'OccupySeat'
      | 'LeaveSeat'
      | 'ReassignSeat'
      | 'SetAiSlot'
      | 'SetHumanSlot'
      | 'SetReady'
      | 'LaunchMatch'
      | 'MarkSeatAi'
      | 'ForfeitMatch';
  }
>;

type EngineIntentHandler<K extends EngineIntent['kind']> = (
  session: InteractiveSession,
  intent: Extract<EngineIntent, { readonly kind: K }>,
) => void;

type EngineIntentHandlers = {
  readonly [K in EngineIntent['kind']]: EngineIntentHandler<K>;
};

const ENGINE_INTENT_HANDLERS: EngineIntentHandlers = {
  Move: (session, intent) => {
    const movementType = parseMovementType(intent.movementType);
    const facing = intent.facing as Facing;
    session.applyMovement(
      intent.unitId,
      { q: intent.to.q, r: intent.to.r },
      facing,
      movementType,
    );
  },
  Stand: (session, intent) => {
    session.attemptStandUp(intent.unitId);
  },
  GoProne: (session, intent) => {
    session.goProne(intent.unitId);
  },
  ActivateMovementEnhancement: (session, intent) => {
    session.activateMovementEnhancement(intent.unitId, intent.enhancement);
  },
  TorsoTwist: (session, intent) => {
    session.torsoTwist(intent.unitId, intent.secondaryFacing as Facing);
  },
  Attack: (session, intent) => {
    session.applyAttack(intent.attackerId, intent.targetId, intent.weaponIds);
  },
  Physical: (session, intent) => {
    session.applyPhysicalAttack(
      intent.attackerId,
      intent.targetId,
      intent.attackType,
      intent.limb,
    );
  },
  RequestSpot: (session, intent) => {
    session.requestSpot(intent.unitId, intent.targetId);
  },
  AdvancePhase: (session) => {
    session.advancePhase();
  },
  Eject: (session, intent) => {
    session.ejectUnit(intent.unitId);
  },
  Withdraw: (session, intent) => {
    session.declareWithdrawal(intent.unitId, intent.edge);
  },
  Concede: (session, intent) => {
    const side = intent.side === 'player' ? GameSide.Player : GameSide.Opponent;
    session.concede(side);
  },
};

const LOBBY_INTENT_KINDS = new Set<IIntent['intent']['kind']>([
  'OccupySeat',
  'LeaveSeat',
  'ReassignSeat',
  'SetAiSlot',
  'SetHumanSlot',
  'SetReady',
  'LaunchMatch',
  'MarkSeatAi',
  'ForfeitMatch',
]);

export function dispatchToEngine(
  session: InteractiveSession,
  intent: IIntent['intent'],
): void {
  if (LOBBY_INTENT_KINDS.has(intent.kind)) {
    throw new Error(
      `Lobby intent ${intent.kind} routed to engine dispatcher (bug)`,
    );
  }
  const handler = ENGINE_INTENT_HANDLERS[intent.kind as EngineIntent['kind']];
  if (!handler) {
    throw new Error(
      `Unknown intent kind: ${(intent as { kind: string }).kind}`,
    );
  }
  handler(session, intent as never);
}

const MOVEMENT_TYPES: Readonly<Record<string, MovementType>> = {
  walk: MovementType.Walk,
  Walk: MovementType.Walk,
  run: MovementType.Run,
  Run: MovementType.Run,
  sprint: MovementType.Sprint,
  Sprint: MovementType.Sprint,
  evade: MovementType.Evade,
  Evade: MovementType.Evade,
  jump: MovementType.Jump,
  Jump: MovementType.Jump,
  stationary: MovementType.Stationary,
  Stationary: MovementType.Stationary,
};

export function parseMovementType(kind: string): MovementType {
  const movementType = MOVEMENT_TYPES[kind];
  if (movementType === undefined) {
    throw new Error(`Unknown movement type: ${kind}`);
  }
  return movementType;
}

export function drainNewEvents(
  events: readonly IGameEvent[],
  lastBroadcastSeq: number,
): {
  readonly events: readonly IGameEvent[];
  readonly lastBroadcastSeq: number;
} {
  const fresh: IGameEvent[] = [];
  for (const evt of events) {
    if (evt.sequence > lastBroadcastSeq) {
      fresh.push(evt);
    }
  }
  if (fresh.length === 0) {
    return { events: fresh, lastBroadcastSeq };
  }
  return {
    events: fresh,
    lastBroadcastSeq: fresh[fresh.length - 1].sequence,
  };
}
