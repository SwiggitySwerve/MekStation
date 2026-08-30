import {
  GameEventType,
  GamePhase,
  type IGameEvent,
  type IGameState,
} from '@/types/gameplay';

import type { IAuthorizedViewer } from '../authorization/AuthorizedViewer';
import type { IViewerAudienceRuntimeContext } from './ViewerAudienceProjector';

/** Tactical choices that are withheld until their authoritative reveal. */
export const MATCH_WIRE_SEALED_DECLARATION_TYPES = new Set<GameEventType>([
  GameEventType.MovementDeclared,
  GameEventType.AttackDeclared,
  GameEventType.PhysicalAttackDeclared,
]);

type SealedDeclarationType =
  | GameEventType.MovementDeclared
  | GameEventType.AttackDeclared
  | GameEventType.PhysicalAttackDeclared;

type AudienceState = IGameState & {
  readonly sideAssignments?: readonly {
    readonly playerId: string;
    readonly side: string;
  }[];
};

interface IWireEvent {
  readonly type: string;
  readonly turn: number;
  readonly sequence: number;
  readonly actorId?: string;
  readonly payload: unknown;
}

export function isMatchWireSealedDeclaration(
  event: Pick<IGameEvent, 'type'> | { readonly type?: unknown },
): event is Pick<IGameEvent, 'type'> & {
  readonly type: SealedDeclarationType;
} {
  return (
    typeof event.type === 'string' &&
    MATCH_WIRE_SEALED_DECLARATION_TYPES.has(event.type as GameEventType)
  );
}

export function createMatchWireSealedChoiceAudienceContext(
  events: readonly IGameEvent[],
  state: AudienceState,
  visibleThroughSequence: number,
): IViewerAudienceRuntimeContext {
  const finalizedAt = finalizationSequences(events, visibleThroughSequence);
  return {
    isSealedChoiceRevealed(event: unknown): boolean {
      const declaration = readWireEvent(event);
      if (declaration === null || !isMatchWireSealedDeclaration(declaration)) {
        return false;
      }
      const declarationPhase = phaseForDeclaration(declaration.type);
      if (declarationPhase === null) return false;
      const finalization = finalizedAt.get(
        finalizationKey(declaration.turn, declarationPhase),
      );
      return finalization !== undefined && finalization > declaration.sequence;
    },
    isActorOwnedByViewer(viewer: IAuthorizedViewer, event: unknown): boolean {
      if (viewer.role === 'gm') return true;
      const declaration = readWireEvent(event);
      if (declaration === null) return false;
      const actorId =
        declaration.actorId ?? actorIdFromPayload(declaration.payload);
      if (actorId === null) return false;
      const unit = state.units[actorId];
      if (unit === undefined) return false;
      const assignment = state.sideAssignments?.find(
        (candidate) => candidate.side === unit.side,
      );
      return assignment?.playerId === viewer.principalId;
    },
  };
}

export function sealedDeclarationsRevealedBy(
  events: readonly IGameEvent[],
  revealEvent: IGameEvent,
): readonly IGameEvent[] {
  const finalizedPhase = finalizedPhaseFor(revealEvent);
  if (finalizedPhase === null) return [];
  return events.filter(
    (event) =>
      event.sequence < revealEvent.sequence &&
      event.turn === revealEvent.turn &&
      event.phase === finalizedPhase &&
      isMatchWireSealedDeclaration(event),
  );
}

function finalizationSequences(
  events: readonly IGameEvent[],
  visibleThroughSequence: number,
): ReadonlyMap<string, number> {
  const finalizedAt = new Map<string, number>();
  for (const event of events) {
    if (event.sequence > visibleThroughSequence) continue;
    const finalizedPhase = finalizedPhaseFor(event);
    if (finalizedPhase === null) continue;
    finalizedAt.set(
      finalizationKey(event.turn, finalizedPhase),
      event.sequence,
    );
  }
  return finalizedAt;
}

function finalizedPhaseFor(event: IGameEvent): GamePhase | null {
  if (event.type === GameEventType.AttacksRevealed) {
    return GamePhase.WeaponAttack;
  }
  if (event.type !== GameEventType.PhaseChanged) return null;
  const fromPhase = stringField(event.payload, 'fromPhase');
  if (fromPhase === GamePhase.Movement) return GamePhase.Movement;
  if (fromPhase === GamePhase.WeaponAttack) return GamePhase.WeaponAttack;
  if (fromPhase === GamePhase.PhysicalAttack) return GamePhase.PhysicalAttack;
  return null;
}

function finalizationKey(turn: number, phase: string): string {
  return `${turn}:${phase}`;
}

function phaseForDeclaration(type: string): GamePhase | null {
  if (type === GameEventType.MovementDeclared) return GamePhase.Movement;
  if (type === GameEventType.AttackDeclared) return GamePhase.WeaponAttack;
  if (type === GameEventType.PhysicalAttackDeclared) {
    return GamePhase.PhysicalAttack;
  }
  return null;
}

function readWireEvent(value: unknown): IWireEvent | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Readonly<Record<string, unknown>>;
  const type = record['type'];
  const turn = record['turn'];
  const sequence = record['sequence'];
  if (
    typeof type !== 'string' ||
    typeof turn !== 'number' ||
    typeof sequence !== 'number'
  ) {
    return null;
  }
  const actorId = record['actorId'];
  return {
    type,
    turn,
    sequence,
    ...(typeof actorId === 'string' ? { actorId } : {}),
    payload: record['payload'],
  };
}

function actorIdFromPayload(payload: unknown): string | null {
  return stringField(payload, 'attackerId') ?? stringField(payload, 'unitId');
}

function stringField(value: unknown, key: string): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const field = (value as Readonly<Record<string, unknown>>)[key];
  return typeof field === 'string' ? field : null;
}
