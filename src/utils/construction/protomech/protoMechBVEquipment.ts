import type {
  IProtoMechBVMountValue,
  IProtoMechBVResolvedZeroMount,
} from '@/types/unit/BVBreakdownTypes';

import {
  IProtoMechMountedEquipment,
  IProtoMechUnit,
  ProtoLocation,
} from '@/types/unit/ProtoMechInterfaces';

import {
  normalizeEquipmentId,
  resolveEquipmentBV,
} from '../equipmentBVResolver';
import { isProtoEDPArmorMount } from './armorType';

/** Retain the admitted value and original mount identity without resolution. */
export function protoMechBVMountValue(
  equipmentIndex: number,
  mount: IProtoMechMountedEquipment,
  battleValue: number,
): IProtoMechBVMountValue {
  return {
    equipmentIndex,
    equipmentId: mount.equipmentId,
    location: mount.location,
    battleValue,
  };
}

// Pinned native trace calls offensiveEquipmentBV even when the value is zero.
// BLKProtoMekFile + TestProtoMek.requiresSlot place these four no-slot types at
// Body. Partial Wing occupies the supplied Torso; no other source is inferred.
const ZERO_MISC_SOURCE_BLOCKS = new Map([
  ['EIInterface', 'Body'],
  ['CLMyomerBooster', 'Body'],
  ['ProtoMechJumpJet', 'Body'],
  ['ExtendedJumpJetSystem', 'Body'],
  ['ProtoMechPartialWing', 'Torso'],
]);

/** Diagnostic-only catalog zero; unresolved fallback zeros are never facts. */
export function resolveProtoZeroEquipmentMountBV(
  equipmentIndex: number,
  mount: IProtoMechMountedEquipment,
): IProtoMechBVResolvedZeroMount | undefined {
  const source = mount.blkSource;
  if (
    source === undefined ||
    source.errors.length > 0 ||
    source.lookupName !== mount.equipmentId ||
    ZERO_MISC_SOURCE_BLOCKS.get(mount.equipmentId) !== source.blockKey ||
    (source.blockKey === 'Torso' && mount.location !== ProtoLocation.TORSO)
  ) {
    return undefined;
  }
  const resolved = resolveEquipmentBV(mount.equipmentId);
  if (!resolved.resolved || resolved.battleValue !== 0) return undefined;
  return {
    ...protoMechBVMountValue(equipmentIndex, mount, resolved.battleValue),
    ...(source.blockKey === 'Body' ? { nativeLocation: 0 as const } : {}),
  };
}

/** Native misc belongs outside the weapon/ammo-cap pool (BVCalculator:978-1042). */
export function resolveProtoOffensiveEquipmentBV(
  equipmentId: string,
  tonnage: number,
): number | undefined {
  const id = normalizeEquipmentId(equipmentId).replace(/[^a-z0-9]/g, '');
  if (id === 'protoquadmeleesystem' || id === 'protomechquadmeleesystem') {
    // MegaMek 48fcb2f6 MiscType.java:1367-1369; dynamic, not catalog BV.
    return 2.5 * Math.ceil(0.2 * tonnage);
  }
  if (id === 'protomagneticclamp' || isProtoEDPArmorMount(equipmentId)) {
    // Fixed values stay catalog-owned (MiscType:9401, ArmorType:1405).
    return resolveEquipmentBV(equipmentId).battleValue;
  }
  return undefined;
}

/** IDs treated as defensive-only equipment (no weapon BV contribution). */
const DEFENSIVE_EQUIPMENT_HINTS: readonly string[] = [
  'ams',
  'amsammo',
  'ecm',
  'guardian-ecm',
  'ecm-suite',
  'angel-ecm',
  'bap',
  'beagle-active-probe',
  'activeprobe',
  'active-probe',
  'light-active-probe',
];

/** IDs treated as offensive non-weapon equipment (e.g. targeting computer). */
const OFFENSIVE_EQUIPMENT_HINTS: readonly string[] = [
  'targeting-computer',
  'tc',
  'c3',
  'c3-master',
  'c3-slave',
  'c3i',
  'tag',
];

// =============================================================================
// Helpers
// =============================================================================

function sumNumericRecord(rec: object | undefined): number {
  if (!rec) return 0;
  let sum = 0;
  for (const v of Object.values(rec)) {
    if (typeof v === 'number') sum += v;
  }
  return sum;
}

function armorTotal(unit: IProtoMechUnit): number {
  return sumNumericRecord(unit.armorByLocation);
}

function structureTotal(unit: IProtoMechUnit): number {
  return sumNumericRecord(unit.structureByLocation);
}

function classifyEquipment(
  mount: IProtoMechMountedEquipment,
): 'weapon' | 'defensive' | 'offensive' | 'ammo' | 'other' {
  const id = mount.equipmentId.toLowerCase();

  if (id.includes('ammo')) return 'ammo';

  for (const hint of DEFENSIVE_EQUIPMENT_HINTS) {
    if (id.includes(hint)) return 'defensive';
  }
  for (const hint of OFFENSIVE_EQUIPMENT_HINTS) {
    if (id.includes(hint)) return 'offensive';
  }

  // The resolver is the source of truth: if it returns a nonzero BV, assume
  // weapon. Anything else (structure, special) contributes 0 and gets tagged
  // 'other' to keep the breakdown honest.
  const resolved = resolveEquipmentBV(mount.equipmentId);
  if (resolved.resolved && resolved.battleValue > 0) return 'weapon';
  return 'other';
}

function isMainGunMount(mount: IProtoMechMountedEquipment): boolean {
  return mount.isMainGun || mount.location === ProtoLocation.MAIN_GUN;
}

export { armorTotal, structureTotal, classifyEquipment, isMainGunMount };
