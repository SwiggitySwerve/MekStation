import type { EquipmentCategory } from '@/types/equipment/EquipmentCategory';

import type { CriticalSlotRecoveryResponsibility } from './criticalSlotNoticeEffects';

/** Stable public discriminants; the owner selects them once before admission. */
export enum CriticalSlotEntryKind {
  AMMO = 'ammo',
  CASE = 'case',
  ARMOR_STRUCTURE = 'armor_structure',
  MOBILITY = 'mobility',
  CARGO = 'cargo',
  HEAT_SINKS = 'heat_sinks',
  ELECTRONICS = 'electronics',
  OTHER = 'other',
}
export enum CriticalSlotEntrySubkind {
  AMMO = 'ammo',
  CASE = 'case',
  MARKERS = 'markers',
  MASC = 'masc',
  TSM = 'tsm',
  SUPERCHARGER = 'supercharger',
  PARTIAL_WING = 'partial-wing',
  UMU = 'umu',
  IMPROVED_JETS = 'improved-jets',
  STANDARD_JETS = 'standard-jets',
  MOBILITY_UNESTABLISHED = 'mobility-unestablished',
  CARGO = 'cargo',
  HEAT_SINKS = 'heat-sinks',
  ELECTRONICS = 'electronics',
  BOMB_BAY = 'bomb-bay',
  TRACKS = 'tracks',
  CONVERSION = 'conversion',
  SUPERCOOLED_MYOMER = 'supercooled-myomer',
  WHEELS = 'wheels',
  QUAD_TURRET = 'quad-turret',
  SYSTEM_BOUNDARY = 'system-boundary',
  HEAD_TURRET = 'head-turret',
  LAM_FUEL_TANK = 'lam-fuel-tank',
  WEAPON_CONTROL = 'weapon-control',
  MISCELLANEOUS = 'miscellaneous',
  UNASSIGNED = 'unassigned',
}

export interface ICriticalSlotNoticeIdentity {
  readonly lookupToken: string;
  readonly resolvedId?: string | null;
  readonly equipmentId?: string | null;
  readonly equipmentName?: string | null;
  readonly equipmentCategory?: EquipmentCategory | null;
  readonly registryId?: string | null;
  readonly registryName?: string | null;
}
export interface ICriticalSlotNoticeEffect {
  readonly id: CriticalSlotEntrySubkind;
  readonly title: string;
  readonly responsibility:
    | CriticalSlotRecoveryResponsibility
    | 'weapon-control'
    | 'unassigned';
  readonly prerequisite?: string;
  readonly consequence: string;
  readonly pattern?: RegExp;
  readonly excludePattern?: RegExp;
  readonly evidence: {
    readonly unit: string;
    readonly testFile: string;
    readonly testName: string;
  };
}
export interface INoticeKindRule {
  readonly kind: CriticalSlotEntryKind;
  readonly title: string;
  readonly pattern?: RegExp;
  readonly category?: EquipmentCategory;
  readonly canonicalHeatSinkIds?: boolean;
  readonly effects: readonly ICriticalSlotNoticeEffect[];
}

export interface ICriticalSlotEntryClassification {
  readonly kind: CriticalSlotEntryKind;
  readonly subkind: CriticalSlotEntrySubkind;
  readonly title: string;
  readonly ruleId: string;
  readonly effect: ICriticalSlotNoticeEffect;
}
