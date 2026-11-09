import type { AerospaceArc } from './AerospaceArcTypes';

export interface IAerospaceArcContribution {
  readonly arc: AerospaceArc;
  readonly rawBV: number;
  readonly weight: number;
  readonly weightedBV: number;
  readonly isPrimary: boolean;
}

export interface IAerospaceBVBreakdown {
  readonly typeModifier?: number;
  readonly armorBV: number;
  readonly siBV: number;
  readonly defensiveEquipmentBV: number;
  readonly explosivePenalties: number;
  readonly defensiveFactor: number;
  readonly defensive: number;

  readonly arcContributions: readonly IAerospaceArcContribution[];
  readonly primaryArc: AerospaceArc | null;
  readonly weaponFirePoolBV: number;
  readonly fuselageWeaponBV: number;
  readonly ammoBV: number;
  readonly offensiveEquipmentBV: number;
  readonly avgThrust: number;
  readonly speedFactor: number;
  readonly offensive: number;

  readonly subTypeMultiplier: number;
  readonly pilotMultiplier: number;
  readonly final: number;
}

/** Actual aircraft weapon value before speed; identity belongs to the local input. */
export interface IAerospaceBVWeaponMount {
  readonly equipmentIndex: number;
  readonly equipmentId: string;
  readonly location: AerospaceArc;
  readonly battleValue: number;
}

/** Already-admitted mount value; indices/ids belong to the local input. */
export interface IProtoMechBVMountValue {
  readonly equipmentIndex: number;
  readonly equipmentId: string;
  readonly location: string;
  readonly battleValue: number;
}

/** Retained public weapon snapshot contract. */
export type IProtoMechBVWeaponMount = IProtoMechBVMountValue & {
  /** Native diagnostic index when intrinsic ammo shifts the source index. */
  readonly nativeEquipmentIndex?: number;
};

/** Actual positive bin value with the existing ammo owner's native group. */
export interface IProtoMechBVAmmoMount extends IProtoMechBVMountValue {
  readonly nativeGroup: string;
}

export interface IProtoMechBVBreakdown {
  readonly defensiveBV: number;
  readonly offensiveBV: number;
  readonly baseBV: number;
  /** Neutral compatibility field: ProtoMechs have no generic chassis modifier. */
  readonly chassisMultiplier: number;
  readonly pilotMultiplier: number;
  readonly final: number;

  readonly armorBV: number;
  readonly structureBV: number;
  readonly defensiveEquipmentBV: number;
  /** Always zero: native ProtoMech BV has no explosive-equipment penalty. */
  readonly explosivePenalty: number;
  readonly defensiveFactor: number;

  readonly weaponBV: number;
  /** Optional diagnostic snapshot; absent when no weapon was admitted. */
  readonly weaponMountBV?: readonly IProtoMechBVWeaponMount[];
  readonly ammoBV: number;
  readonly ammoAvailableMountBV?: readonly IProtoMechBVAmmoMount[];
  /** Existing native cap-owner values for real positive-bin groups only. */
  readonly ammoCapBVByGroup?: Readonly<Record<string, number>>;
  /** Always zero: ProtoMech offense has no weight-only contribution. */
  readonly physicalWeaponBV: number;
  readonly offensiveEquipmentBV: number;
  /** Positive values already admitted by the native offensive-misc owner. */
  readonly offensiveEquipmentMountBV?: readonly IProtoMechBVMountValue[];
  readonly speedFactor: number;
  /** Resolved zero misc values with retained source-location evidence. */
  readonly resolvedZeroEquipmentMountBV?: readonly IProtoMechBVResolvedZeroMount[];
}

/** Body has no public armor location; other locations use the existing trace map. */
export interface IProtoMechBVResolvedZeroMount extends IProtoMechBVMountValue {
  readonly nativeLocation?: 0;
}

/** Shared optional diagnostic keys for calculations and strict replay payloads. */
export const INFANTRY_BV_TRACE_FIELDS = [
  'baseBV',
  'structureBV',
  'defensiveFactor',
  'summaryModifier',
  'weaponBV',
  'armorBV',
  'defensiveEquipmentBV',
  'explosivePenalty',
  'typeModifier',
  'ammoBV',
  'speedFactor',
  'offensiveEquipmentBV',
  'weightBV',
  'offensiveTypeModifier',
  'adjustment',
  'infantry.primaryWeaponBV',
  'infantry.secondaryWeaponBV',
  'infantry.antiMekWeaponBV',
  'infantry.weaponRemainderBV',
] as const;

/** Temporary trooper identities and local field-gun mount ordinals. */
export type InfantryBVWeaponTerm =
  | `weapon.-1.TPRS.${string}`
  | `weapon.${number}.FGUN.${string}`;

export function isInfantryBVWeaponTerm(
  key: string,
): key is InfantryBVWeaponTerm {
  return /^weapon\.(?:-1\.TPRS|\d+\.FGUN)\..+$/.test(key);
}

export interface IInfantryBVBreakdown
  extends
    Readonly<
      Partial<Record<(typeof INFANTRY_BV_TRACE_FIELDS)[number], number>>
    >,
    Readonly<Partial<Record<InfantryBVWeaponTerm, number>>> {
  /** Defensive aggregate, including represented source movement and stealth. */
  readonly defensiveBV: number;
  readonly perTrooper: number;
  readonly motiveMultiplier: number;
  readonly antiMechMultiplier: number;
  readonly fieldGunBV: number;
  readonly platoonBV: number;
  readonly pilotMultiplier: number;
  readonly final: number;

  readonly primaryBV: number;
  readonly secondaryBV: number;
  readonly armorKitBV: number;
  readonly fieldGunWeaponBV: number;
  readonly fieldGunAmmoBV: number;
  readonly troopers: number;
}

export interface BADefensiveBVBreakdown {
  readonly defensiveFactor?: number;
  readonly armorBV: number;
  /** Sensor/ECM/AMS bonus, added before the defensive factor. */
  readonly defensiveEquipmentBV: number;
  readonly moveBV: number;
  readonly jumpBV: number;
  readonly antiMechBonus: number;
  readonly total: number;
}

export interface BAOffensiveBVBreakdown {
  readonly speedFactor?: number;
  readonly weaponBV: number;
  readonly ammoBV: number;
  readonly manipulatorBV: number;
  /** Trooper-located offensive equipment, added before the speed factor. */
  readonly offensiveEquipmentBV: number;
  readonly total: number;
}

export interface BAPerTrooperBV {
  readonly defensive: BADefensiveBVBreakdown;
  readonly offensive: BAOffensiveBVBreakdown;
  readonly total: number;
}

export interface IBABreakdown {
  readonly squadFactor?: number;
  readonly perTrooper: BAPerTrooperBV;
  readonly squadSize: number;
  readonly squadTotal: number;
  readonly pilotMultiplier: number;
  readonly final: number;
  /** Native `ammoType:rackSize` -> pre-cap per-trooper ammo BV (Java ammoMap). */
  readonly ammoAvailableBVByPool?: Readonly<Record<string, number>>;
  /** Native `ammoType:rackSize` -> launcher BV in that pool (Java weaponsForExcessiveAmmo). */
  readonly ammoCapBVByPool?: Readonly<Record<string, number>>;
}
