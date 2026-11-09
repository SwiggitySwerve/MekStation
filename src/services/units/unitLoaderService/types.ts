import type { AerospaceState } from '@/stores/aerospaceState';
import type { BattleArmorState } from '@/stores/battleArmorState';
import type { InfantryState } from '@/stores/infantryState';
import type { ProtoMechState } from '@/stores/protoMechState';
/**
 * Unit Loader Service - Type Definitions
 *
 * Types and interfaces for unit loading and serialization.
 *
 * @spec openspec/specs/unit-services/spec.md
 */
import type { VehicleState } from '@/stores/vehicleState';
import type { IMechCrewSeat } from '@/types/pilot/MechCrewSeats';
import type {
  ISerializedFluff,
  ISerializedStructure,
} from '@/types/unit/UnitSerialization';

import { UnitState } from '@/stores/unitState';

import type { ICapitalShipView } from './capitalShipView';
import type {
  IUnitDefinitionReference,
  UnitDefinitionLoadErrorCode,
} from './definitionTypes';

/**
 * Source of a unit (canonical or custom)
 */
export type { UnitSource } from './definitionTypes';

/**
 * Serialized unit JSON format (from canonical JSON files)
 *
 * This is the lenient version used for importing from external sources.
 * It has optional fields and an index signature for flexible import handling.
 *
 * For the strict canonical version with required fields, see ISerializedUnit in src/types/unit/UnitSerialization.ts
 */
export interface IRawSerializedUnit {
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
  readonly structure?: ISerializedStructure;
  readonly armor?: {
    readonly type: string;
    readonly allocation?: Record<
      string,
      number | { front: number; rear: number }
    >;
  };
  readonly heatSinks?: {
    readonly type: string;
    readonly count: number;
  };
  readonly movement?: {
    readonly walk: number;
    readonly jump?: number;
    readonly jumpJetType?: string;
    readonly enhancements?: readonly string[];
  };
  readonly equipment?: ReadonlyArray<{
    readonly id: string;
    readonly location: string;
    readonly slots?: readonly number[];
    readonly isRearMounted?: boolean;
    readonly linkedAmmo?: string;
    readonly isRemovable?: boolean;
    readonly isOmniPodMounted?: boolean;
  }>;
  /**
   * Optional critical slot grid from import sources (e.g., MegaMek).
   * Used as a hint for tech-base variant resolution (Clan vs Inner Sphere) in mixed-tech units.
   */
  readonly criticalSlots?: Readonly<
    Record<string, ReadonlyArray<string | null>>
  >;
  readonly mulId?: number | string;
  /** Originating definition retained across draft and library round trips. */
  readonly sourceDefinition?: IUnitDefinitionReference;
  readonly clanName?: string;
  /** Mixed Tech per-component selections, keyed by TechBaseComponent. */
  readonly componentTechBases?: Readonly<
    Partial<Record<string, 'INNER_SPHERE' | 'CLAN'>>
  >;
  /** Authored Tripod/QuadVee crew seats. */
  readonly crewSeats?: readonly IMechCrewSeat[];
  readonly role?: string;
  readonly fluff?: ISerializedFluff;
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
  readonly errorCode?:
    | UnitDefinitionLoadErrorCode
    | 'unsupported-store-family'
    | 'unsupported-configuration'
    | 'session-failed';
  readonly sourceDefinition?: IUnitDefinitionReference;
  readonly success: boolean;
  /** BattleMech editor state. */
  readonly state?: UnitState;
  /** Editor state for a family with its own store, or a capital read-only view. */
  readonly familyState?: FamilyEditorState;
  readonly error?: string;
}

export type FamilyEditorState =
  | { readonly store: 'infantry'; readonly state: InfantryState }
  | { readonly store: 'protomech'; readonly state: ProtoMechState }
  | { readonly store: 'battlearmor'; readonly state: BattleArmorState }
  | { readonly store: 'vehicle'; readonly state: VehicleState }
  | { readonly store: 'aerospace'; readonly state: AerospaceState }
  | { readonly store: 'capital'; readonly state: ICapitalShipView };
