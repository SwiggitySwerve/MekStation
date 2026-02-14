/**
 * Shared types for StateCycleDetector
 */

import type { GameSide } from '@/types/gameplay/GameSessionInterfaces';

/**
 * Static information about a unit in the battle.
 * Provided by the caller to give the detector context about each unit.
 */
export interface BattleUnit {
  readonly id: string;
  readonly name: string;
  readonly side: GameSide;
}

/**
 * Static battle context provided to the detector.
 * Contains all participating units with their starting attributes.
 */
export interface BattleState {
  readonly units: readonly BattleUnit[];
}

/**
 * Gets a unit name by ID, falling back to the ID itself.
 */
export function getUnitName(
  units: readonly BattleUnit[],
  unitId: string,
): string {
  const unit = units.find((u) => u.id === unitId);
  return unit ? unit.name : unitId;
}
