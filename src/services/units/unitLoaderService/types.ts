/**
 * Unit Loader Service - Type Definitions
 *
 * Types and interfaces for unit loading and serialization.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import { UnitState } from '@/stores/unitState';

/**
 * Source of a unit (canonical or custom)
 */
export type UnitSource = 'canonical' | 'custom';

/**
 * Serialized unit JSON format (from canonical JSON files)
 */
export interface ISerializedUnit {
  readonly id: string;
  readonly chassis: string;
  readonly model?: string;
  readonly variant?: string;
  readonly unitType?: string;
  readonly configuration?: string;
  readonly techBase: string;
  readonly rulesLevel?: string;
  readonly era?: string;
  readonly year?: number;
  readonly tonnage: number;
  readonly engine?: {
    readonly type: string;
    readonly rating: number;
  };
  readonly gyro?: {
    readonly type: string;
  };
  readonly cockpit?: string;
  readonly structure?: {
    readonly type: string;
  };
  readonly armor?: {
    readonly type: string;
    readonly allocation?: Record<string, number | { front: number; rear: number }>;
  };
  readonly heatSinks?: {
    readonly type: string;
    readonly count: number;
  };
  readonly movement?: {
    readonly walk: number;
    readonly jump?: number;
  };
  readonly equipment?: ReadonlyArray<{
    readonly id: string;
    readonly location: string;
    readonly isOmniPodMounted?: boolean;
  }>;
  /**
   * Optional critical slot grid from import sources (e.g., MegaMek).
   * Used as a hint for tech-base variant resolution (Clan vs Inner Sphere) in mixed-tech units.
   */
  readonly criticalSlots?: Readonly<Record<string, ReadonlyArray<string | null>>>;
  readonly mulId?: number;
  /** Whether this unit is an OmniMech */
  readonly isOmni?: boolean;
  /** Base chassis heat sinks for OmniMechs (-1 = auto-calculate) */
  readonly baseChassisHeatSinks?: number;
  readonly [key: string]: unknown;
}

/**
 * Result of loading a unit
 */
export interface ILoadUnitResult {
  readonly success: boolean;
  readonly state?: UnitState;
  readonly error?: string;
}
