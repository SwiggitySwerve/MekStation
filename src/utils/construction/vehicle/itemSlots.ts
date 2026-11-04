import { blkEngineName } from '@/services/conversion/blkEngineIdentity';
import { getEquipmentEntry } from '@/utils/construction/equipmentBV';
import {
  AMMUNITION_CATALOG_FILES,
  ELECTRONICS_CATALOG_FILES,
  MISCELLANEOUS_CATALOG_FILES,
  WEAPON_CATALOG_FILES,
} from '@/utils/construction/equipmentBV/catalogData';

/**
 * Vehicle item slots: MegaMek 48fcb2f6 Tank.getFreeSlots (Tank.java:2581-2726,
 * checked by TestTank.java:331-337) and TestSupportVehicle.occupiedSlotCount
 * (:1032-1037, :1577-1660, :1722-1757). Per-item costs are the generated
 * catalog `vehicleSlots`. A report must hold in Java too, so every term is
 * exact or a lower bound, so the reported count can be below Java's: crew
 * seats/quarters, patchwork and SV armor count 0, seat and quarters bays and
 * cross-tech mounts are not counted, and ammo bins sharing a weapon (or with no
 * known weapon) count once. A mount that is unresolved or whose Java cost needs the unit
 * (null) makes the check abstain.
 */
export interface VehicleSlotSource {
  readonly tonnage: number;
  readonly equipment: readonly {
    readonly equipmentId: string;
    readonly location?: string;
  }[];
  readonly jumpMP: number;
  readonly engineCode: number;
  readonly engineRating: number;
  readonly clanEngine: boolean;
  readonly armorCode: number;
  /** BLK `armor_tech_level`; absent means the unit's side (BLKTankFile.java:291-298). */
  readonly armorTechLevel?: number;
  readonly clan: boolean;
  readonly transporters?: readonly string[];
}

interface SlotRecord {
  readonly id: string;
  readonly name?: string;
  readonly techBase?: string;
  readonly vehicleSlots?: {
    readonly tank: number | null;
    readonly supportVehicle: number | null;
  };
  readonly compatibleWeaponIds?: readonly string[];
}

// Catalog records of the Java types with F_JUMP_JET, F_FUEL and F_CARGO
// (same alias owner as scripts/equipment-catalog/vehicle-slots.mjs).
const JUMP_JETS = new Set(
  'jump-jet improved-jump-jet vehiclejumpjet protomechjumpjet-registry extended-jump-jet-system jump-jet-ba primitive-prototype-jump-jet prototype-improved-jump-jet'.split(
    ' ',
  ),
);
const FUEL = new Set(['extended-fuel-tank']);
const CARGO = new Set(['cargo', 'cargo-registry', 'cargo-container-10-tons']);
/** TestTank.isBodyEquipment:1079-1093 fire control, via isValidTankLocation:979-980. */
const FIRE_CONTROL = new Set(['basic-fire-control', 'advanced-fire-control']);
/** TechConstants.isClan:394-398. */
const CLAN_TECH_LEVELS = new Set([2, 6, 8, 10, 12]);

let catalog: { items: Map<string, SlotRecord>; ammo: Map<string, SlotRecord> };
function records() {
  const index = (files: readonly { items?: unknown[] }[]) => {
    const map = new Map<string, SlotRecord>();
    for (const item of files.flatMap(
      (file) => file.items ?? [],
    ) as SlotRecord[])
      if (!map.has(item.id)) map.set(item.id, item);
    return map;
  };
  catalog ??= {
    items: index([
      ...WEAPON_CATALOG_FILES,
      ...ELECTRONICS_CATALOG_FILES,
      ...MISCELLANEOUS_CATALOG_FILES,
    ]),
    ammo: index(AMMUNITION_CATALOG_FILES),
  };
  return catalog;
}

interface Mounts {
  readonly items: {
    readonly record: SlotRecord;
    readonly location?: string;
    /** The record is the other tech base's type (CLCASE -> IS `case`): cost unknown, 0. */
    readonly crossTech: boolean;
  }[];
  readonly ammo: (SlotRecord | undefined)[];
}
function resolve(source: VehicleSlotSource): Mounts | undefined {
  const items: Mounts['items'] = [],
    ammo: Mounts['ammo'] = [];
  for (const { equipmentId, location } of source.equipment) {
    const name = equipmentId.replace(/:OMNI$/i, '').trim();
    const id = getEquipmentEntry(name)?.id;
    if (/\bammo\b/i.test(name)) {
      ammo.push(id ? records().ammo.get(id) : undefined);
      continue;
    }
    const record = id ? records().items.get(id) : undefined;
    if (!record?.vehicleSlots) return undefined;
    const crossTech =
      (/^(CL|Clan\b)/.test(name) && record.techBase === 'INNER_SPHERE') ||
      (/^IS/.test(name) && record.techBase === 'CLAN');
    items.push({ record, location, crossTech });
  }
  return { items, ammo };
}

/** One slot per Java ammoType:rackSize; bins sharing a weapon count once. */
function ammoSlots(ammo: Mounts['ammo']): number {
  const keys = (record?: SlotRecord) =>
    (record?.compatibleWeaponIds ?? []).map((id) => id.replace(/^clan-/, ''));
  const groups: Set<string>[] = [];
  for (const record of ammo) {
    const own = new Set(keys(record));
    if (!own.size) continue;
    for (const group of groups.filter((g) => [...own].some((k) => g.has(k)))) {
      group.forEach((key) => own.add(key));
      groups.splice(groups.indexOf(group), 1);
    }
    groups.push(own);
  }
  return groups.length || (ammo.length ? 1 : 0);
}

/** Troop space once, plus one per non-seat, non-quarters bay. */
function transportSlots(transporters: readonly string[] = []): number {
  const kinds = transporters.map((line) =>
    line.split(':')[0].trim().toLowerCase(),
  );
  return (
    (kinds.includes('troopspace') ? 1 : 0) +
    kinds.filter((kind) => kind.endsWith('bay')).length
  );
}

/** Tank.java:2617-2642. Unknown Clan side takes the smaller cost. */
function engineSlots(source: VehicleSlotSource): number {
  const name = blkEngineName(source.engineCode);
  const clan = source.clanEngine;
  let slots = { LIGHT: 1, XL: clan ? 1 : 2, XXL: clan ? 2 : 4 }[name] ?? 0;
  if (source.engineRating > 400) slots++;
  if (name === 'COMPACT') slots--;
  return slots;
}

/** Tank.java:2677-2704 (non-patchwork; patchwork counts 0 here). */
function armorSlots(source: VehicleSlotSource): number {
  const clan =
    source.armorTechLevel === undefined
      ? source.clan
      : CLAN_TECH_LEVELS.has(source.armorTechLevel);
  if (source.armorCode === 1 || source.armorCode === 2) return clan ? 1 : 2;
  if (source.armorCode === 6) return 3;
  if (source.armorCode === 22) return 2;
  return [3, 4, 5, 16, 23, 26].includes(source.armorCode) ? 1 : 0;
}

function overrun(used: number, available: number): string[] {
  return used > available
    ? [
        `Not enough item slots available! Using ${used - available} slot(s) too many.`,
      ]
    : [];
}

function fireControlErrors(mounts: Mounts): string[] {
  return mounts.items
    .filter(
      ({ record, location }) =>
        FIRE_CONTROL.has(record.id) &&
        location !== undefined &&
        location !== 'Body',
    )
    .map(({ record }) => `${record.name} must be mounted in the body.`);
}

export function combatVehicleSlotErrors(source: VehicleSlotSource): string[] {
  const mounts = resolve(source);
  if (!mounts) return [];
  let used = 0,
    cargo = false;
  for (const { record, crossTech } of mounts.items) {
    if (crossTech) continue;
    const tank = record.vehicleSlots?.tank;
    if (tank === null || tank === undefined) return [];
    if (JUMP_JETS.has(record.id) || FUEL.has(record.id)) continue;
    if (CARGO.has(record.id) && cargo) continue;
    cargo ||= CARGO.has(record.id);
    used += tank;
  }
  used += source.jumpMP > 0 ? 1 : 0;
  used += mounts.items.some(({ record }) => FUEL.has(record.id)) ? 1 : 0;
  used += engineSlots(source) + ammoSlots(mounts.ammo);
  used += transportSlots(source.transporters) + armorSlots(source);
  return [
    ...overrun(used, 5 + Math.floor(source.tonnage / 5)),
    ...fireControlErrors(mounts),
  ];
}

export function supportVehicleSlotErrors(source: VehicleSlotSource): string[] {
  const mounts = resolve(source);
  if (!mounts) return [];
  let used = 0;
  for (const { record, crossTech } of mounts.items) {
    if (crossTech) continue;
    const slots = record.vehicleSlots?.supportVehicle;
    if (slots === null || slots === undefined) return [];
    // getMiscEquipSlots:1646-1660: jump jets take one slot together.
    if (!JUMP_JETS.has(record.id)) used += slots;
  }
  used += mounts.items.some(({ record }) => JUMP_JETS.has(record.id)) ? 1 : 0;
  // getAmmoSlots:1618-1622: small SV ammo shares its weapon's slot (< 5 t is
  // small; 5 t is treated as small here, the lower bound).
  used += source.tonnage > 5 ? ammoSlots(mounts.ammo) : 0;
  used += transportSlots(source.transporters);
  return [
    ...overrun(used, 5 + Math.floor(source.tonnage / 10)),
    ...fireControlErrors(mounts),
  ];
}
