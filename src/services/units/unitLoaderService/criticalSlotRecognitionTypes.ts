import type { UnitState } from '@/stores/unitState';
import type { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import type { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import type { TechBase } from '@/types/enums/TechBase';
import type { IEquipmentItem } from '@/types/equipment';
import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';
import type { IUnrecoveredCriticalSlot } from '@/types/unit/UnitLoadDiagnostics';

import type { parseCriticalSlotToken } from './equipmentResolution';
import type { ISourceCriticalWeapon } from './sourceWeaponMounts';

export type UnitCriticalSlots = Readonly<
  Record<string, ReadonlyArray<string | null>>
>;

export type CriticalSlotSystemContext = Pick<
  UnitState,
  'engineType' | 'gyroType' | 'armActuators' | 'cockpitType'
> &
  Partial<Pick<UnitState, 'configuration' | 'engineRating'>>;

export type CriticalEntryKind =
  | 'armor-marker'
  | 'structure-marker'
  | 'mobility'
  | 'configuration-system'
  | 'ammunition'
  | 'heat-sink'
  | 'bomb-bay'
  | 'weapon'
  | 'unclassified';

export type CriticalEntryEffect =
  | 'placement-only'
  | 'equipment-or-ability'
  | 'configuration-system'
  | 'unknown';

export interface ICriticalSlotRecognitionInput {
  readonly criticalSlots: UnitCriticalSlots | undefined;
  /** All current mounts, including weapons recovered earlier in this load. */
  readonly equipment: readonly IMountedEquipmentInstance[];
  readonly tonnage?: number;
  readonly unitTechBase: TechBase;
  readonly unitTechBaseMode: TechBaseMode;
  readonly isOmni?: boolean;
  readonly systems?: CriticalSlotSystemContext;
}

export interface IRecognizedCriticalEntry extends IUnrecoveredCriticalSlot {
  readonly parsedToken: ReturnType<typeof parseCriticalSlotToken>;
  readonly lookupToken: string;
  readonly equipmentId?: string;
  readonly definition?: IEquipmentItem;
  readonly kind: CriticalEntryKind;
  readonly effect: CriticalEntryEffect;
  readonly isRearMounted: boolean;
  readonly isOmniPodMounted: boolean;
  readonly represented: boolean;
}

export interface ICriticalSlotRecognitionResult {
  readonly cells: readonly IRecognizedCriticalEntry[];
  readonly missing: readonly IRecognizedCriticalEntry[];
}

/** One recovery dispatch receives unit facts and its complete location facts.
 * Sizing remains with equipment owners, never with the dispatch switch.
 */
export interface ICriticalSlotRecoveryInput extends ICriticalSlotRecognitionInput {
  readonly entry: IRecognizedCriticalEntry;
  readonly location: MechLocation;
  readonly locationEntries: readonly IRecognizedCriticalEntry[];
  /** Legacy summary-dependent ammo/sink/bay admission; not a global gate. */
  readonly physicalOnly?: boolean;
  /** Existing reservations, including invalid serialized allocations. */
  readonly reservedSlots?: ReadonlyMap<MechLocation, ReadonlySet<number>>;
  /** Grouping evidence from the existing sourceCriticalWeapons owner. */
  readonly sourceWeapon?: ISourceCriticalWeapon;
}
