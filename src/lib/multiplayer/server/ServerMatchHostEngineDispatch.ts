import type { InteractiveSession } from '@/engine/InteractiveSession';
import type { IIntent } from '@/types/multiplayer/Protocol';

import {
  GameSide,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';

export function dispatchToEngine(
  session: InteractiveSession,
  intent: IIntent['intent'],
): void {
  switch (intent.kind) {
    case 'Move': {
      const movementType = parseMovementType(intent.movementType);
      const facing = intent.facing as Facing;
      session.applyMovement(
        intent.unitId,
        { q: intent.to.q, r: intent.to.r },
        facing,
        movementType,
      );
      return;
    }
    case 'Stand': {
      session.attemptStandUp(intent.unitId);
      return;
    }
    case 'GoProne': {
      session.goProne(intent.unitId);
      return;
    }
    case 'ActivateMovementEnhancement': {
      session.activateMovementEnhancement(intent.unitId, intent.enhancement);
      return;
    }
    case 'TorsoTwist': {
      session.torsoTwist(intent.unitId, intent.secondaryFacing as Facing);
      return;
    }
    case 'Attack': {
      session.applyAttack(intent.attackerId, intent.targetId, intent.weaponIds);
      return;
    }
    case 'Physical': {
      session.applyPhysicalAttack(
        intent.attackerId,
        intent.targetId,
        intent.attackType,
        intent.limb,
      );
      return;
    }
    case 'RequestSpot': {
      session.requestSpot(intent.unitId, intent.targetId);
      return;
    }
    case 'AdvancePhase': {
      session.advancePhase();
      return;
    }
    case 'Eject': {
      session.ejectUnit(intent.unitId);
      return;
    }
    case 'Withdraw': {
      session.declareWithdrawal(intent.unitId, intent.edge);
      return;
    }
    case 'Concede': {
      const side =
        intent.side === 'player' ? GameSide.Player : GameSide.Opponent;
      session.concede(side);
      return;
    }
    case 'OccupySeat':
    case 'LeaveSeat':
    case 'ReassignSeat':
    case 'SetAiSlot':
    case 'SetHumanSlot':
    case 'SetReady':
    case 'LaunchMatch':
    case 'MarkSeatAi':
    case 'ForfeitMatch': {
      throw new Error(
        `Lobby intent ${intent.kind} routed to engine dispatcher (bug)`,
      );
    }
    default: {
      const _exhaustive: never = intent;
      throw new Error(
        `Unknown intent kind: ${(intent as { kind: string }).kind} (${String(_exhaustive)})`,
      );
    }
  }
}

export function parseMovementType(kind: string): MovementType {
  switch (kind) {
    case 'walk':
    case 'Walk':
      return MovementType.Walk;
    case 'run':
    case 'Run':
      return MovementType.Run;
    case 'sprint':
    case 'Sprint':
      return MovementType.Sprint;
    case 'evade':
    case 'Evade':
      return MovementType.Evade;
    case 'jump':
    case 'Jump':
      return MovementType.Jump;
    case 'stationary':
    case 'Stationary':
      return MovementType.Stationary;
    default:
      throw new Error(`Unknown movement type: ${kind}`);
  }
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
