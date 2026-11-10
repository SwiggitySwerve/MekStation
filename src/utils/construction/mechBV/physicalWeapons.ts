import { hasBVActuatorEnhancement } from '@/utils/construction/battleValueWeapons';

import type { CritScan } from './critScanTypes';
export type PhysicalWeaponType =
  | 'backhoe'
  | 'buzzsaw'
  | 'chain-whip'
  | 'chainsaw'
  | 'claw'
  | 'combine'
  | 'dual-saw'
  | 'flail'
  | 'hatchet'
  | 'lance'
  | 'mace'
  | 'mining-drill'
  | 'pile-driver'
  | 'retractable-blade'
  | 'rock-cutter'
  | 'spot-welder'
  | 'sword'
  | 'talon'
  | 'vibroblade-large'
  | 'vibroblade-medium'
  | 'vibroblade-small'
  | 'wrecking-ball';

type PhysicalWeaponBvRule = (tonnage: number, tsmMod: number) => number;

const EXACT_PHYSICAL_WEAPON_ALIASES = new Map<string, PhysicalWeaponType>([
  ['hatchet', 'hatchet'],
  ['sword', 'sword'],
  ['mace', 'mace'],
  ['is lance', 'lance'],
  ['lance', 'lance'],
  ['isclaw', 'claw'],
  ['clclaw', 'claw'],
  ['claw', 'claw'],
  ['claws', 'claw'],
  ['talons', 'talon'],
  ['is flail', 'flail'],
  ['flail', 'flail'],
  ['is wrecking ball', 'wrecking-ball'],
  ['wrecking ball', 'wrecking-ball'],
  ['chain whip', 'chain-whip'],
  ['buzzsaw', 'buzzsaw'],
  ['is buzzsaw', 'buzzsaw'],
  ['clan buzzsaw', 'buzzsaw'],
  ['clbuzzsaw', 'buzzsaw'],
  ['dual saw', 'dual-saw'],
  ['is dual saw', 'dual-saw'],
  ['miningdrill', 'mining-drill'],
  ['mining drill', 'mining-drill'],
  ['is mining drill', 'mining-drill'],
  ['chainsaw', 'chainsaw'],
  ['is chainsaw', 'chainsaw'],
  ['backhoe', 'backhoe'],
  ['is backhoe', 'backhoe'],
  ['combine', 'combine'],
  ['spot welder', 'spot-welder'],
  ['is spot welder', 'spot-welder'],
  ['rock cutter', 'rock-cutter'],
  ['is rock cutter', 'rock-cutter'],
  ['pile driver', 'pile-driver'],
  ['is pile driver', 'pile-driver'],
  ['heavy-duty pile driver', 'pile-driver'],
  ['heavy duty pile driver', 'pile-driver'],
]);

const PHYSICAL_WEAPON_BV_RULES: Record<
  PhysicalWeaponType,
  PhysicalWeaponBvRule
> = {
  hatchet: (tonnage, tsmMod) => Math.ceil(tonnage / 5.0) * 1.5 * tsmMod,
  sword: (tonnage, tsmMod) => Math.ceil(tonnage / 10.0 + 1) * 1.725 * tsmMod,
  lance: (tonnage, tsmMod) => Math.ceil(tonnage / 5.0) * tsmMod,
  mace: (tonnage, tsmMod) => Math.ceil(tonnage / 4.0) * tsmMod,
  'retractable-blade': (tonnage, tsmMod) =>
    Math.ceil(tonnage / 10.0) * 1.725 * tsmMod,
  claw: (tonnage, tsmMod) => Math.ceil(tonnage / 7.0) * 1.275 * tsmMod,
  talon: (tonnage, tsmMod) =>
    Math.round(Math.floor(tonnage / 5.0) * 0.5) * tsmMod,
  flail: () => 11,
  'wrecking-ball': () => 8,
  'chain-whip': () => 5.175,
  buzzsaw: () => 67,
  'dual-saw': () => 9,
  'mining-drill': () => 6,
  chainsaw: () => 7,
  backhoe: () => 8,
  combine: () => 5,
  'spot-welder': () => 5,
  'rock-cutter': () => 6,
  'pile-driver': () => 5,
  'vibroblade-large': () => 24,
  'vibroblade-medium': () => 17,
  'vibroblade-small': () => 12,
};

function normalizePhysicalWeaponSlot(slotLower: string): string {
  return slotLower.replace(/\s*\(omnipod\)/gi, '').trim();
}

function classifyVibroblade(slot: string): PhysicalWeaponType | null {
  if (
    !slot.includes('vibroblade') &&
    slot !== 'islargevibroblade' &&
    slot !== 'ismediumvibroblade' &&
    slot !== 'issmallvibroblade'
  ) {
    return null;
  }

  if (slot.includes('large')) return 'vibroblade-large';
  if (slot.includes('small')) return 'vibroblade-small';
  return 'vibroblade-medium';
}

export function classifyPhysicalWeapon(
  slotLower: string,
): PhysicalWeaponType | null {
  const slot = normalizePhysicalWeaponSlot(slotLower);
  const exactMatch = EXACT_PHYSICAL_WEAPON_ALIASES.get(slot);
  if (exactMatch) return exactMatch;
  if (slot.startsWith('retractable blade')) return 'retractable-blade';
  return classifyVibroblade(slot);
}

export function calculatePhysicalWeaponBV(
  type: string,
  tonnage: number,
  hasTSM: boolean,
): number {
  const rule = PHYSICAL_WEAPON_BV_RULES[type as PhysicalWeaponType];
  return rule ? rule(tonnage, hasTSM ? 2 : 1) : 0;
}

// MekWithArms.java:242-270 (48fcb2f64): BV forces active blade heat.
const PHYSICAL_WEAPON_BV_HEAT = new Map<string, number>([
  ['vibroblade-small', 3],
  ['vibroblade-medium', 5],
  ['vibroblade-large', 7],
]);

export function getPhysicalWeaponBVHeat(type: string): number {
  return PHYSICAL_WEAPON_BV_HEAT.get(type) ?? 0;
}

/** Preserve mount order, per-mount rounding and AES before accumulation. */
export function calculatePhysicalBVTotal(
  crit: Pick<CritScan, 'physicalWeapons' | 'hasTSM' | 'aesLocs'>,
  tonnage: number,
): number {
  let physicalWeaponBV = 0;
  for (const pw of crit.physicalWeapons) {
    // Heat-generating mounts enter the weapon heat sequence instead.
    if (getPhysicalWeaponBVHeat(pw.type) > 0) continue;
    let bv = calculatePhysicalWeaponBV(pw.type, tonnage, crit.hasTSM);
    bv = Math.round(bv * 1000.0) / 1000.0;
    if (hasBVActuatorEnhancement(crit.aesLocs, pw.location)) bv *= 1.25;
    physicalWeaponBV += bv;
  }
  return physicalWeaponBV;
}
