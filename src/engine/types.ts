/**
 * Engine Module Shared Types
 * Core type definitions for the game engine module.
 */

import type { IWeapon } from '@/simulation/ai/types';
import type { IUnitGameState } from '@/types/gameplay/GameSessionInterfaces';
import type { IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';

// =============================================================================
// Engine Configuration
// =============================================================================

/**
 * Configuration for the GameEngine.
 */
export interface IGameEngineConfig {
  /** Map hex grid radius (default: 7) */
  readonly mapRadius?: number;
  /** Maximum turns before draw (default: 30) */
  readonly turnLimit?: number;
  /** Random seed for deterministic playback (default: Date.now()) */
  readonly seed?: number;
}

// =============================================================================
// Adapted Unit
// =============================================================================

/**
 * Extended unit game state with engine-specific data.
 * Carries weapon and movement capability info alongside the base state.
 */
export interface IAdaptedUnit extends IUnitGameState {
  /** Weapons equipped on this unit */
  readonly weapons: readonly IWeapon[];
  /** Walking movement points */
  readonly walkMP: number;
  /** Running movement points (ceil(walkMP * 1.5)) */
  readonly runMP: number;
  /** Jump movement points (0 if no jump jets) */
  readonly jumpMP: number;
}

// =============================================================================
// Interactive Session
// =============================================================================

/**
 * Available actions for a unit in the current phase.
 */
export interface IAvailableActions {
  /** Valid movement destinations */
  readonly validMoves: readonly IHexCoordinate[];
  /** Valid attack targets with selectable weapons */
  readonly validTargets: readonly {
    readonly unitId: string;
    readonly weapons: readonly string[];
  }[];
}

// =============================================================================
// Weapon Data (for adapter)
// =============================================================================

/**
 * Static weapon data for the compendium adapter.
 * Matches IWeapon from the AI system but used for initial construction.
 */
export interface IWeaponData {
  /** Weapon identifier (e.g. "medium-laser") */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Short range in hexes */
  readonly shortRange: number;
  /** Medium range in hexes */
  readonly mediumRange: number;
  /** Long range in hexes */
  readonly longRange: number;
  /** Damage per hit */
  readonly damage: number;
  /** Heat generated when fired */
  readonly heat: number;
  /** Minimum range (0 = no minimum) */
  readonly minRange: number;
  /** Ammo per ton (-1 = energy weapon) */
  readonly ammoPerTon: number;
  /** Whether this weapon is destroyed */
  readonly destroyed: boolean;
}

// =============================================================================
// Adapter Options
// =============================================================================

/**
 * Options for adapting a unit from compendium data.
 */
export interface IAdaptUnitOptions {
  /** Which side this unit fights for */
  readonly side?: import('@/types/gameplay/GameSessionInterfaces').GameSide;
  /** Starting hex position */
  readonly position?: IHexCoordinate;
  /** Starting facing direction */
  readonly facing?: import('@/types/gameplay/HexGridInterfaces').Facing;
  /** Pilot gunnery skill (default: 4) */
  readonly gunnery?: number;
  /** Pilot piloting skill (default: 5) */
  readonly piloting?: number;
  /** Pre-existing damage by location key */
  readonly initialDamage?: Record<string, number>;
}
