import { blkEngineName } from '@/services/conversion/blkEngineIdentity';
import { getEquipmentEntry } from '@/utils/construction/equipmentBV';
import {
  AMMUNITION_CATALOG_FILES,
  ELECTRONICS_CATALOG_FILES,
  MISCELLANEOUS_CATALOG_FILES,
  WEAPON_CATALOG_FILES,
} from '@/utils/construction/equipmentBV/catalogData';

import { resolveVehicleClanArmor } from './armor';

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
export interface VehicleSlotUnit {
  readonly tonnage: number;
  readonly equipment: readonly {
    readonly equipmentId: string;
    readonly location: string;
  }[];
  readonly movement: { readonly jumpMP: number };
  /** BLK engine_type and armor_type codes. */
  readonly engineType: number;
  readonly engineRating: number;
  readonly clanEngine?: boolean;
  readonly armorType: number;
  /** BLK `armor_tech_level`; absent means the unit's side (BLKTankFile.java:291-298). */
  readonly armorTechLevel?: number;
  readonly techBase?: unknown;
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
// Catalog records of Java ArmorType types: skipped as items (Tank.java:2604-2606,
// TestSupportVehicle.java:1650-1653); armor is charged once by its code.
const ARMOR = new Set(
  'reactive-armor is-reflective-registry clan-reflective-registry stealth-armor is-vehicular-stealth-registry clan-ferro-lamellor-registry clan-electric-discharge-protomech is-ba-advanced-registry is-ba-stealth-basic-registry clan-ba-stealth-basic-registry is-ba-stealth-standard-registry clan-ba-stealth-standard-registry is-ba-stealth-improved-registry clan-ba-stealth-improved-registry is-ba-stealth-prototype-registry clan-ba-fire-resistant-registry is-ba-mimetic-registry is-ba-laser-reflective-reflec-glazed-registry clan-ba-laser-reflective-reflec-glazed-registry is-ba-reactive-blazer-registry clan-ba-reactive-blazer-registry'.split(
    ' ',
  ),
);
/** Shared identity of Java ArmorType records, which do not enter mechanism mass. */
export function isVehicleArmorEquipment(id: string): boolean {
  return ARMOR.has(id);
}
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
    readonly location: string;
    /** The record is the other tech base's type (CLCASE -> IS `case`): cost unknown, 0. */
    readonly crossTech: boolean;
  }[];
  readonly ammo: (SlotRecord | undefined)[];
}
function resolve(source: VehicleSlotUnit): Mounts | undefined {
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

/** Tank.java:2617-2642. */
function engineSlots(source: VehicleSlotUnit, clan: boolean): number {
  const name = blkEngineName(source.engineType);
  let slots = { LIGHT: 1, XL: clan ? 1 : 2, XXL: clan ? 2 : 4 }[name] ?? 0;
  if (source.engineRating > 400) slots++;
  if (name === 'COMPACT') slots--;
  return slots;
}

/** Tank.java:2677-2704 (non-patchwork; patchwork counts 0 here). */
function armorSlots(source: VehicleSlotUnit, unitClan: boolean): number {
  const clan = resolveVehicleClanArmor(source.armorTechLevel, unitClan);
  const code = source.armorType;
  if (code === 1 || code === 2) return clan ? 1 : 2;
  if (code === 6) return 3;
  if (code === 22) return 2;
  return [3, 4, 5, 16, 23, 26].includes(code) ? 1 : 0;
}

function overrun(used: number, available: number): string[] {
  return used > available
    ? [
        `Not enough item slots available! Using ${used - available} slot(s) too many.`,
      ]
    : [];
}

/**
 * `sideUnknown`: the unit carries neither clan_engine nor armor_tech_level
 * (IVTOL), so both take the Clan side, the smaller cost.
 */
export function combatVehicleSlotErrors(
  source: VehicleSlotUnit,
  sideUnknown = false,
): string[] {
  const mounts = resolve(source);
  if (!mounts) return [];
  let used = 0,
    cargo = false;
  for (const { record, crossTech } of mounts.items) {
    if (crossTech || ARMOR.has(record.id)) continue;
    const tank = record.vehicleSlots?.tank;
    if (tank === null || tank === undefined) return [];
    if (JUMP_JETS.has(record.id) || FUEL.has(record.id)) continue;
    if (CARGO.has(record.id) && cargo) continue;
    cargo ||= CARGO.has(record.id);
    used += tank;
  }
  used += source.movement.jumpMP > 0 ? 1 : 0;
  used += mounts.items.some(({ record }) => FUEL.has(record.id)) ? 1 : 0;
  // Mixed may be a Clan chassis (Java isClan): the Clan side is the lower cost.
  const clan = sideUnknown || /clan|mixed/i.test(String(source.techBase));
  used += engineSlots(source, sideUnknown || source.clanEngine === true);
  used += ammoSlots(mounts.ammo) + transportSlots(source.transporters);
  used += armorSlots(source, clan);
  return overrun(used, 5 + Math.floor(source.tonnage / 5));
}

export function supportVehicleSlotErrors(source: VehicleSlotUnit): string[] {
  const mounts = resolve(source);
  if (!mounts) return [];
  let used = 0;
  for (const { record, crossTech } of mounts.items) {
    if (crossTech || ARMOR.has(record.id)) continue;
    const slots = record.vehicleSlots?.supportVehicle;
    if (slots === null || slots === undefined) return [];
    // getMiscEquipSlots:1646-1660: jump jets take one slot together.
    if (!JUMP_JETS.has(record.id)) used += slots;
  }
  used += mounts.items.some(({ record }) => JUMP_JETS.has(record.id)) ? 1 : 0;
  // getAmmoSlots:1618-1622: only small SVs (< 5 t) share their weapons' slots.
  used += source.tonnage >= 5 ? ammoSlots(mounts.ammo) : 0;
  used += transportSlots(source.transporters);
  return overrun(used, 5 + Math.floor(source.tonnage / 10));
}
