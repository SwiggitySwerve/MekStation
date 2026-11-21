/** Public facts and results for the aerospace construction weight owner. */
import type {
  EngineType,
  VehicleEngineType,
} from '@/types/construction/EngineType';
import type { AerospaceLocation } from '@/types/construction/UnitLocation';
import type { TechBase } from '@/types/enums/TechBase';
import type {
  AerospaceCockpitType,
  IAerospaceBreakdown,
  IAerospaceMountedEquipment,
} from '@/types/unit/AerospaceInterfaces';
import type { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';

export type {
  IAerospaceBreakdown,
  IAerospaceEquipmentWeightTerms,
} from '@/types/unit/AerospaceInterfaces';

export type AerospaceArmorWeightInput =
  | {
      readonly kind: 'installedTonnage';
      readonly tons: number;
      readonly nativeCode: number;
      readonly techBase: TechBase;
    }
  | {
      readonly kind: 'allocatedPoints';
      readonly nativeCode: number;
      readonly techBase: TechBase;
      readonly locations: readonly {
        readonly location: AerospaceLocation;
        readonly points: number;
        readonly nativeCode: number;
        readonly techBase: TechBase;
      }[];
    };

export type AerospaceFuelWeightInput =
  | { readonly unit: 'tons'; readonly amount: number }
  | { readonly unit: 'points'; readonly amount: number };

export interface IAerospaceWeightMount extends IAerospaceMountedEquipment {
  readonly isAmmo: boolean;
  readonly size: number;
  /** Omitted means a full ammunition bin, not zero shots. */
  readonly shots?: number;
  /** Implicit one-shot ammunition has no physical location. */
  readonly noPhysicalLocation: boolean;
  /** A synthetic weapon group is not another physical gun. */
  readonly weaponGroup: boolean;
}

export interface IAerospaceWeightCommonInput {
  readonly tonnage: number;
  readonly safeThrust: number;
  readonly year: number;
  readonly techBase: TechBase;
  readonly armor: AerospaceArmorWeightInput;
  readonly fuel: AerospaceFuelWeightInput;
  readonly heatSinks: number;
  readonly cockpit: AerospaceCockpitType;
  readonly equipment: readonly IAerospaceWeightMount[];
  /** Current native bay declarations, never a cached aggregate weight. */
  readonly transporters: readonly string[];
}

export type AerospaceWeightInput = IAerospaceWeightCommonInput &
  (
    | {
        readonly family: 'aerospaceFighter' | 'conventionalFighter';
        readonly engineType: EngineType;
        readonly vstol: boolean;
      }
    | {
        readonly family: 'smallCraft';
        readonly clan: boolean;
        readonly originalBuildYear: number;
        readonly primitive: boolean;
        readonly motionType: AerospaceMotionType;
        readonly structuralIntegrity: number;
        readonly lifeBoats: number;
        readonly escapePods: number;
      }
    | {
        readonly family: 'fixedWingSupport';
        readonly engineType: VehicleEngineType;
        readonly engineTechRating: number;
        readonly structuralTechRating: number;
        readonly armorTechRating: number;
        readonly barRating: number;
        readonly baseChassisFireConWeight?: number;
        readonly baseChassisSponsonPintleWeight?: number;
      }
  );

export interface IAerospaceWeightIssue {
  readonly component:
    | 'engine'
    | 'structure'
    | 'armor'
    | 'heatSinks'
    | 'cockpit'
    | 'fuel'
    | 'equipment'
    | 'transport';
  readonly code:
    | 'missing-fact'
    | 'unresolved-equipment'
    | 'unsupported-rule'
    | 'invalid-input';
  readonly mountId?: string;
  readonly field?: string;
  readonly message: string;
}

export type AerospaceWeightResult =
  | { readonly status: 'complete'; readonly breakdown: IAerospaceBreakdown }
  | {
      readonly status: 'unresolved';
      readonly breakdown: null;
      readonly issues: readonly IAerospaceWeightIssue[];
    };
