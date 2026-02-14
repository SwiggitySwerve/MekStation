/**
 * Battle state types for simulation and key moment detection.
 * Extracted from simulation layer to allow component-level imports.
 */

import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

/**
 * Static information about a unit in the battle.
 * Provided by the caller to give the detector context about each unit.
 */
export interface BattleUnit {
  readonly id: string;
  readonly name: string;
  readonly side: GameSide;
  readonly bv: number;
  readonly weaponIds: readonly string[];
  readonly initialArmor: Readonly<Record<string, number>>;
  readonly initialStructure: Readonly<Record<string, number>>;
}

/**
 * Static battle context provided to the detector.
 * Contains all participating units with their starting attributes.
 */
export interface BattleState {
  readonly units: readonly BattleUnit[];
}
