/**
 * Ammo Tracking Types
 * Type definitions for ammunition tracking, consumption, and explosion systems.
 */

import type {
  IAmmoSlotState,
  IAmmoConsumedPayload,
} from '@/types/gameplay/GameSessionInterfaces';

/**
 * CASE protection level for a location.
 */
export type CASEProtectionLevel = 'none' | 'case' | 'case_ii';

/**
 * Unit CASE configuration: maps locations to their CASE protection level.
 */
export type UnitCASEConfig = Partial<Record<string, CASEProtectionLevel>>;

/**
 * Construction data for initializing ammo bins at game start.
 *
 * Re-exported from the single source-of-truth definition in
 * `@/types/gameplay/AmmoTypes` (PR6 collapse). The duplicate that lived
 * here was kept for "circular import avoidance," but no real cycle ever
 * existed — types/gameplay never imports from utils/gameplay.
 */
export type { IAmmoConstructionData } from '@/types/gameplay/AmmoTypes';

/**
 * Result of consuming ammo.
 */
export interface IAmmoConsumeResult {
  /** Updated ammo state (immutable) */
  readonly updatedAmmoState: Record<string, IAmmoSlotState>;
  /** The event payload to emit */
  readonly event: IAmmoConsumedPayload;
  /** Whether ammo was successfully consumed */
  readonly success: boolean;
}

/**
 * Result of an ammo explosion.
 */
export interface IAmmoExplosionResult {
  /** Total explosion damage */
  readonly totalDamage: number;
  /** Location where explosion occurs */
  readonly location: string;
  /** CASE protection level at location */
  readonly caseProtection: CASEProtectionLevel;
  /** Damage that transfers to adjacent locations */
  readonly transferDamage: number;
  /** Whether pilot takes damage */
  readonly pilotDamage: number;
  /** Whether the bin was destroyed */
  readonly binDestroyed: boolean;
  /** Updated ammo state with bin marked as destroyed */
  readonly updatedAmmoState: Record<string, IAmmoSlotState>;
  /** The bin that exploded */
  readonly binId: string;
  /** Weapon type of exploded ammo */
  readonly weaponType: string;
}

/**
 * Result of a Gauss rifle explosion.
 */
export interface IGaussExplosionResult {
  /** Always 20 damage */
  readonly totalDamage: number;
  /** Location of the Gauss rifle */
  readonly location: string;
  /** Whether CASE limits the explosion */
  readonly caseProtection: CASEProtectionLevel;
  /** Damage transferred */
  readonly transferDamage: number;
  /** Pilot damage */
  readonly pilotDamage: number;
}
