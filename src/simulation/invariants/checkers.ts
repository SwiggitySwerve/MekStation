/**
 * Invariant Checker Functions
 * Pure functions that check game state invariants.
 */

import { IGameState, IGameEvent, GamePhase } from '@/types/gameplay';

import { IViolation } from './types';

function coordKey(q: number, r: number): string {
  return `${q},${r}`;
}

export function checkUnitPositionUniqueness(
  state: IGameState,
): readonly IViolation[] {
  const violations: IViolation[] = [];
  const positionMap = new Map<string, string[]>();

  for (const unit of Object.values(state.units)) {
    if (unit.destroyed) continue;

    const key = coordKey(unit.position.q, unit.position.r);
    const existing = positionMap.get(key) || [];
    existing.push(unit.id);
    positionMap.set(key, existing);
  }

  for (const [key, unitIds] of Array.from(positionMap.entries())) {
    if (unitIds.length > 1) {
      const [q, r] = key.split(',').map(Number);
      violations.push({
        invariant: 'unit_position_uniqueness',
        severity: 'critical',
        message: `Multiple units occupy the same hex: ${unitIds.join(', ')}`,
        context: {
          position: { q, r },
          unitIds,
        },
      });
    }
  }

  return violations;
}

export function checkHeatNonNegative(state: IGameState): readonly IViolation[] {
  const violations: IViolation[] = [];

  for (const unit of Object.values(state.units)) {
    if (unit.heat < 0) {
      violations.push({
        invariant: 'heat_non_negative',
        severity: 'critical',
        message: `Unit ${unit.id} has negative heat: ${unit.heat}`,
        context: {
          unitId: unit.id,
          heat: unit.heat,
        },
      });
    }
  }

  return violations;
}

export function checkArmorBounds(state: IGameState): readonly IViolation[] {
  const violations: IViolation[] = [];

  for (const unit of Object.values(state.units)) {
    for (const [location, value] of Object.entries(unit.armor)) {
      if (value < 0) {
        violations.push({
          invariant: 'armor_bounds',
          severity: 'critical',
          message: `Unit ${unit.id} has negative armor at ${location}: ${value}`,
          context: {
            unitId: unit.id,
            location,
            value,
            type: 'armor',
          },
        });
      }
    }

    for (const [location, value] of Object.entries(unit.structure)) {
      if (value < 0) {
        violations.push({
          invariant: 'armor_bounds',
          severity: 'critical',
          message: `Unit ${unit.id} has negative structure at ${location}: ${value}`,
          context: {
            unitId: unit.id,
            location,
            value,
            type: 'structure',
          },
        });
      }
    }
  }

  return violations;
}

export function checkDestroyedUnitsStayDestroyed(
  currentState: IGameState,
  previousState: IGameState | undefined,
): readonly IViolation[] {
  if (!previousState) return [];

  const violations: IViolation[] = [];

  for (const [unitId, previousUnit] of Object.entries(previousState.units)) {
    const currentUnit = currentState.units[unitId];
    if (!currentUnit) continue;

    if (previousUnit.destroyed && !currentUnit.destroyed) {
      violations.push({
        invariant: 'destroyed_units_stay_destroyed',
        severity: 'critical',
        message: `Unit ${unitId} was destroyed but has been resurrected`,
        context: {
          unitId,
        },
      });
    }
  }

  return violations;
}

export function checkPhaseTransitions(
  currentState: IGameState,
  previousState: IGameState | undefined,
): readonly IViolation[] {
  if (!previousState) return [];

  const violations: IViolation[] = [];
  const fromPhase = previousState.phase;
  const toPhase = currentState.phase;

  if (fromPhase === toPhase) return [];

  const validTransitions: Record<GamePhase, GamePhase[]> = {
    [GamePhase.Initiative]: [GamePhase.Movement],
    [GamePhase.Movement]: [GamePhase.WeaponAttack],
    [GamePhase.WeaponAttack]: [GamePhase.PhysicalAttack, GamePhase.Heat],
    [GamePhase.PhysicalAttack]: [GamePhase.Heat],
    [GamePhase.Heat]: [GamePhase.End],
    [GamePhase.End]: [GamePhase.Initiative],
  };

  const allowedNextPhases = validTransitions[fromPhase] || [];
  if (!allowedNextPhases.includes(toPhase)) {
    violations.push({
      invariant: 'phase_transitions',
      severity: 'critical',
      message: `Invalid phase transition from ${fromPhase} to ${toPhase}`,
      context: {
        fromPhase,
        toPhase,
        allowedNextPhases,
      },
    });
  }

  return violations;
}

export function checkSequenceMonotonicity(
  events: readonly IGameEvent[],
): readonly IViolation[] {
  const violations: IViolation[] = [];

  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1];
    const curr = events[i];

    if (curr.sequence <= prev.sequence) {
      violations.push({
        invariant: 'sequence_monotonicity',
        severity: 'critical',
        message: `Event sequence out of order: ${prev.sequence} -> ${curr.sequence}`,
        context: {
          previousEventId: prev.id,
          previousSequence: prev.sequence,
          currentEventId: curr.id,
          currentSequence: curr.sequence,
        },
      });
    }
  }

  return violations;
}

export function checkTurnNonDecreasing(
  currentState: IGameState,
  previousState: IGameState | undefined,
): readonly IViolation[] {
  if (!previousState) return [];

  const violations: IViolation[] = [];

  if (currentState.turn < previousState.turn) {
    violations.push({
      invariant: 'turn_non_decreasing',
      severity: 'critical',
      message: `Turn number decreased from ${previousState.turn} to ${currentState.turn}`,
      context: {
        previousTurn: previousState.turn,
        currentTurn: currentState.turn,
      },
    });
  }

  return violations;
}
