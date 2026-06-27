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
