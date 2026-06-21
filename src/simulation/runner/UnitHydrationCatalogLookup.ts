import { normalizeEquipmentId as normalizeCatalogEquipmentId } from '@/utils/construction/equipmentBV/normalization';
import { NAME_MAPPINGS_DATA } from '@/utils/construction/equipmentBVCatalogData';

import type {
  AmmoLookup,
  ICatalogAmmoStats,
  ICatalogWeaponStats,
  WeaponLookup,
} from './UnitHydrationTypes';

import {
  normalizeCriticalSlotText,
  normalizeEquipmentSignalKey,
  normalizedWithoutTechPrefix,
} from './UnitHydrationText';

const SOURCE_BACKED_WEAPON_LOOKUP_ALIASES = {
  'plasma-cannon': 'clan-plasma-cannon',
  plasmacannon: 'clan-plasma-cannon',
  clplasmacannon: 'clan-plasma-cannon',
  clanplasmacannon: 'clan-plasma-cannon',
  plasmarifle: 'plasma-rifle',
  isplasmarifle: 'plasma-rifle',
} satisfies Readonly<Record<string, string>>;

interface CatalogWeaponCandidate {
  readonly id: string;
  readonly name: string;
  readonly subType?: string;
  readonly damage: number | string;
  readonly heat: number;
  readonly ranges: ICatalogWeaponStats['ranges'];
  readonly ammoPerTon: number;
  readonly special: readonly string[];
  readonly techBase?: unknown;
}

function normalizeAmmoLookupKey(idOrName: string): string {
  return normalizeCriticalSlotText(idOrName);
}

function readCatalogWeaponCandidate(
  raw: unknown,
): CatalogWeaponCandidate | null {
  if (!raw || typeof raw !== 'object') return null;

  const item = raw as Record<string, unknown>;
  const id = item.id;
  const damage = item.damage;
  const heat = item.heat;
  const name = item.name;
  const ranges = item.ranges;

  if (
    typeof id !== 'string' ||
    (typeof damage !== 'number' && typeof damage !== 'string') ||
    typeof heat !== 'number' ||
    typeof name !== 'string' ||
    !ranges ||
    typeof ranges !== 'object'
  ) {
    return null;
  }

  const rangeRecord = ranges as Record<string, unknown>;
  const subType = item.subType;

  return {
    id,
    name,
    ...(typeof subType === 'string' ? { subType } : {}),
    damage,
    heat,
    ranges: {
      minimum:
        typeof rangeRecord.minimum === 'number' ? rangeRecord.minimum : 0,
      short: typeof rangeRecord.short === 'number' ? rangeRecord.short : 0,
      medium: typeof rangeRecord.medium === 'number' ? rangeRecord.medium : 0,
      long: typeof rangeRecord.long === 'number' ? rangeRecord.long : 0,
    },
    ammoPerTon: typeof item.ammoPerTon === 'number' ? item.ammoPerTon : -1,
    special: Array.isArray(item.special)
      ? item.special.filter(
          (entry): entry is string => typeof entry === 'string',
        )
      : [],
    techBase: item.techBase,
  };
}

function addWeaponAlias(
  map: Map<string, ICatalogWeaponStats>,
  alias: string,
  weapon: ICatalogWeaponStats,
): void {
  if (alias.length === 0) return;
  if (!map.has(alias)) {
    map.set(alias, weapon);
  }

  const normalizedAlias = normalizeCriticalSlotText(alias);
  if (!map.has(normalizedAlias)) {
    map.set(normalizedAlias, weapon);
  }
}

function addTechBaseWeaponAliases(
  map: Map<string, ICatalogWeaponStats>,
  candidate: CatalogWeaponCandidate,
  weapon: ICatalogWeaponStats,
): void {
  const compactId = normalizeCriticalSlotText(candidate.id);
  const unprefixedCompactId = normalizedWithoutTechPrefix(compactId);

  if (candidate.techBase === 'CLAN') {
    addWeaponAlias(map, `cl${unprefixedCompactId}`, weapon);
    addWeaponAlias(map, `clan${unprefixedCompactId}`, weapon);
  } else if (candidate.techBase === 'INNER_SPHERE') {
    addWeaponAlias(map, `is${compactId}`, weapon);
  }
}

function addSourceBackedWeaponAliases(
  map: Map<string, ICatalogWeaponStats>,
): void {
  for (const [alias, canonicalId] of Object.entries(
    SOURCE_BACKED_WEAPON_LOOKUP_ALIASES,
  )) {
    const stats = map.get(canonicalId);
    if (stats) {
      addWeaponAlias(map, alias, stats);
    }
  }
}

export function buildWeaponLookupFromCatalogFiles(
  files: readonly { items?: readonly unknown[] }[],
): WeaponLookup {
  const map = new Map<string, ICatalogWeaponStats>();

  for (const file of files) {
    for (const raw of file.items ?? []) {
      const candidate = readCatalogWeaponCandidate(raw);
      if (candidate === null) continue;

      const { techBase: _techBase, ...weapon } = candidate;
      map.set(weapon.id, weapon);
      addWeaponAlias(map, weapon.id, weapon);
      addWeaponAlias(map, weapon.name, weapon);
      addTechBaseWeaponAliases(map, candidate, weapon);
    }
  }

  addSourceBackedWeaponAliases(map);

  return (id: string) => {
    const canonical = normalizeCatalogEquipmentId(id);
    const normalized = normalizeEquipmentSignalKey(id);
    return (
      map.get(id) ??
      map.get(canonical) ??
      map.get(normalizeCriticalSlotText(id)) ??
      map.get(normalized) ??
      map.get(normalizedWithoutTechPrefix(normalized)) ??
      null
    );
  };
}

function addAmmoAlias(
  byAlias: Map<string, ICatalogAmmoStats>,
  alias: string,
  ammo: ICatalogAmmoStats,
): void {
  if (alias.length === 0) return;
  byAlias.set(alias, ammo);
  byAlias.set(normalizeAmmoLookupKey(alias), ammo);
}

function readCatalogAmmoStats(raw: unknown): ICatalogAmmoStats | null {
  if (!raw || typeof raw !== 'object') return null;

  const item = raw as Record<string, unknown>;
  const id = item.id;
  const name = item.name;
  const shotsPerTon = item.shotsPerTon;
  const isExplosive = item.isExplosive;

  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    typeof shotsPerTon !== 'number' ||
    typeof isExplosive !== 'boolean'
  ) {
    return null;
  }

  return {
    id,
    name,
    shotsPerTon,
    isExplosive,
    compatibleWeaponIds: Array.isArray(item.compatibleWeaponIds)
      ? item.compatibleWeaponIds.filter(
          (weaponId): weaponId is string => typeof weaponId === 'string',
        )
      : [],
  };
}

export function buildAmmoLookupFromCatalogFiles(
  files: readonly { items?: readonly unknown[] }[],
): AmmoLookup {
  const byId = new Map<string, ICatalogAmmoStats>();
  const byAlias = new Map<string, ICatalogAmmoStats>();

  for (const file of files) {
    for (const raw of file.items ?? []) {
      const ammo = readCatalogAmmoStats(raw);
      if (ammo === null) continue;

      byId.set(ammo.id, ammo);
      addAmmoAlias(byAlias, ammo.id, ammo);
      addAmmoAlias(byAlias, ammo.name, ammo);
    }
  }

  for (const [alias, mappedId] of Object.entries(NAME_MAPPINGS_DATA)) {
    if (typeof mappedId !== 'string') continue;
    const ammo = byId.get(mappedId);
    if (ammo) {
      addAmmoAlias(byAlias, alias, ammo);
      addAmmoAlias(byAlias, mappedId, ammo);
    }
  }

  return (idOrName: string) =>
    byAlias.get(idOrName) ??
    byAlias.get(normalizeCatalogEquipmentId(idOrName)) ??
    byAlias.get(normalizeAmmoLookupKey(idOrName)) ??
    null;
}
