import {
  GameEventType,
  GamePhase,
  GameSide,
  LockState,
  type IGameSession,
  type IUnitGameState,
} from '@/types/gameplay';

export function isPhaseActivationEligible(
  unit: IUnitGameState | undefined,
): unit is IUnitGameState {
  return Boolean(
    unit &&
    !unit.destroyed &&
    !unit.shutdown &&
    !unit.hasRetreated &&
    !unit.hasEjected &&
    unit.pilotConscious,
  );
}

const PHASE_LOCK_EVENTS: Partial<Record<GamePhase, GameEventType>> = {
  [GamePhase.Movement]: GameEventType.MovementLocked,
  [GamePhase.WeaponAttack]: GameEventType.AttackLocked,
  [GamePhase.PhysicalAttack]: GameEventType.PhysicalAttackLocked,
};

/** Eligible actors in alternating order, preserving slots already consumed. */
export function getPhaseActivationOrder(session: IGameSession): string[] {
  const { phase, turn, units } = session.currentState;
  // An ejection resolves lockState even if the unit never acted. Only an
  // actual phase-lock event proves its slot was consumed before it left.
  const activated = new Set(
    (session.events ?? [])
      .filter(
        (event) =>
          event.turn === turn &&
          event.phase === phase &&
          event.type === PHASE_LOCK_EVENTS[phase],
      )
      .map((event) => event.actorId),
  );
  const firstMover = session.currentState.firstMover ?? GameSide.Player;
  const opposingSide =
    firstMover === GameSide.Player ? GameSide.Opponent : GameSide.Player;
  const firstMoverUnits: string[] = [];
  const opposingUnits: string[] = [];
  for (const gameUnit of session.units) {
    const unit = units[gameUnit.id];
    if (!isPhaseActivationEligible(unit) && !activated.has(gameUnit.id))
      continue;
    const side = unit?.side ?? gameUnit.side ?? null;
    if (side === firstMover) firstMoverUnits.push(gameUnit.id);
    else if (side === opposingSide) opposingUnits.push(gameUnit.id);
  }
  const order: string[] = [];
  const count = Math.max(firstMoverUnits.length, opposingUnits.length);
  for (let index = 0; index < count; index += 1) {
    if (firstMoverUnits[index]) order.push(firstMoverUnits[index]);
    if (opposingUnits[index]) order.push(opposingUnits[index]);
  }
  return order.filter((unitId) => isPhaseActivationEligible(units[unitId]));
}

/** Lock state identifies unfinished work; a shrinking roster cannot skip it. */
export function getActivePhaseUnitId(session: IGameSession): string | null {
  return (
    getPhaseActivationOrder(session).find((unitId) => {
      const lock = session.currentState.units[unitId].lockState;
      return lock === LockState.Pending || lock === LockState.Planning;
    }) ?? null
  );
}
