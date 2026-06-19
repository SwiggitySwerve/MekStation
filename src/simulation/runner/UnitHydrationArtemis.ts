import type { IWeapon } from '../ai/types';
import type {
  ICatalogWeaponStats,
  IUnitEquipmentEntry,
  WeaponLookup,
} from './UnitHydrationTypes';

import {
  normalizeCriticalSlotText,
  normalizeEquipmentId,
  normalizeEquipmentLocation,
  normalizedWithoutTechPrefix,
} from './UnitHydrationText';

export type ArtemisFcsKind =
  | 'artemis_iv'
  | 'prototype_artemis_iv'
  | 'artemis_v';

export function artemisFcsKindFromNormalizedId(
  normalized: string,
): ArtemisFcsKind | undefined {
  if (normalized.includes('ammo') || normalized.includes('capable')) {
    return undefined;
  }
  if (normalized.includes('prototypeartemisiv')) {
    return 'prototype_artemis_iv';
  }
  if (
    normalized.includes('artemisivproto') ||
    normalized.includes('protoartemisiv')
  ) {
    return 'prototype_artemis_iv';
  }
  if (normalized.includes('artemisv')) {
    return 'artemis_v';
  }
  if (normalized.includes('artemisiv')) {
    return 'artemis_iv';
  }
  return undefined;
}

function artemisFcsKindSystemCountFromSlots(
  slots: readonly string[],
  kind: ArtemisFcsKind,
): number {
  let count = 0;
  let previousMatched = false;
  for (const slot of slots) {
    const matched =
      artemisFcsKindFromNormalizedId(normalizeCriticalSlotText(slot)) === kind;
    if (matched && !previousMatched) {
      count++;
    }
    previousMatched = matched;
  }
  return count;
}

function artemisFcsKindSystemCountForLocation(
  options: {
    readonly equipmentEntries: readonly IUnitEquipmentEntry[];
    readonly location: string;
  },
  locationSlots: readonly string[],
  kind: ArtemisFcsKind,
): number {
  const equipmentEntryCount = options.equipmentEntries.filter((entry) => {
    return (
      normalizeEquipmentLocation(entry.location) ===
        normalizeEquipmentLocation(options.location) &&
      artemisFcsKindFromNormalizedId(normalizeEquipmentId(entry.id)) === kind
    );
  }).length;

  return equipmentEntryCount > 0
    ? equipmentEntryCount
    : artemisFcsKindSystemCountFromSlots(locationSlots, kind);
}

function hasArtemisIVCapableAmmo(slots: readonly string[]): boolean {
  return slots.some((slot) => {
    const normalized = normalizeCriticalSlotText(slot);
    return (
      normalized.includes('artemiscapable') &&
      !normalized.includes('artemisvcapable')
    );
  });
}

function hasArtemisVCapableAmmo(slots: readonly string[]): boolean {
  return slots.some((slot) =>
    normalizeCriticalSlotText(slot).includes('artemisvcapable'),
  );
}

function catalogWeaponText(catalogWeapon: ICatalogWeaponStats): string {
  return [
    catalogWeapon.id,
    catalogWeapon.name,
    catalogWeapon.subType ?? '',
    ...(catalogWeapon.special ?? []),
  ]
    .join(' ')
    .toLowerCase();
}

export function isArtemisCompatibleCatalogWeapon(
  catalogWeapon: ICatalogWeaponStats,
): boolean {
  const text = catalogWeaponText(catalogWeapon);
  if (/\bstreak\b|narc|tag|anti[-\s]?missile|ams/.test(text)) return false;
  return (
    /\blrm\b|lrm[-\s]?\d+/.test(text) ||
    /\bsrm\b|srm[-\s]?\d+/.test(text) ||
    /\bmml\b|mml[-\s]?\d+/.test(text)
  );
}

export function catalogWeaponStatsForEquipmentEntry(
  entry: IUnitEquipmentEntry,
  weaponLookup: WeaponLookup,
): ICatalogWeaponStats | null {
  const normalizedEntryId = normalizeEquipmentId(entry.id);
  return (
    weaponLookup(entry.id) ??
    weaponLookup(normalizedEntryId) ??
    weaponLookup(normalizedWithoutTechPrefix(normalizedEntryId))
  );
}

export function artemisCompatibleWeaponCountByLocation(
  equipment: readonly unknown[],
  weaponLookup: WeaponLookup,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const raw of equipment) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as IUnitEquipmentEntry;
    if (typeof entry.id !== 'string' || typeof entry.location !== 'string') {
      continue;
    }

    const stats = catalogWeaponStatsForEquipmentEntry(entry, weaponLookup);
    if (!stats || !isArtemisCompatibleCatalogWeapon(stats)) continue;

    const location = normalizeEquipmentLocation(entry.location);
    counts.set(location, (counts.get(location) ?? 0) + 1);
  }

  return counts;
}

function artemisLinkedFcsKindsForWeapon(options: {
  readonly equipmentEntries: readonly IUnitEquipmentEntry[];
  readonly weaponEntry: IUnitEquipmentEntry;
  readonly aiWeapon: IWeapon;
  readonly catalogWeapon: ICatalogWeaponStats;
  readonly location: string;
}): readonly ArtemisFcsKind[] {
  const { aiWeapon, catalogWeapon, equipmentEntries, location, weaponEntry } =
    options;
  const linkedCandidates = new Set(
    [
      weaponEntry.id,
      aiWeapon.id,
      aiWeapon.name,
      catalogWeapon.id,
      catalogWeapon.name,
    ]
      .filter((value): value is string => typeof value === 'string')
      .map((value) => normalizeEquipmentId(value)),
  );

  return equipmentEntries.flatMap((entry) => {
    if (
      normalizeEquipmentLocation(entry.location) !==
      normalizeEquipmentLocation(location)
    ) {
      return [];
    }
    if (
      !Array.isArray(entry.linkedEquipment) ||
      entry.linkedEquipment.length === 0
    ) {
      return [];
    }

    const kind = artemisFcsKindFromNormalizedId(normalizeEquipmentId(entry.id));
    if (kind === undefined) return [];

    const linkedIds = new Set(
      entry.linkedEquipment.map((id) => normalizeEquipmentId(id)),
    );
    return Array.from(linkedCandidates).some((id) => linkedIds.has(id))
      ? [kind]
      : [];
  });
}

function hasExplicitLinkedArtemisFcsInLocation(options: {
  readonly equipmentEntries: readonly IUnitEquipmentEntry[];
  readonly location: string;
}): boolean {
  const { equipmentEntries, location } = options;
  return equipmentEntries.some((entry) => {
    return (
      normalizeEquipmentLocation(entry.location) ===
        normalizeEquipmentLocation(location) &&
      Array.isArray(entry.linkedEquipment) &&
      entry.linkedEquipment.length > 0 &&
      artemisFcsKindFromNormalizedId(normalizeEquipmentId(entry.id)) !==
        undefined
    );
  });
}

type ArtemisFlag = 'hasArtemisV' | 'hasArtemisIV' | 'hasPrototypeArtemisIV';

const ARTEMIS_FLAG_PRIORITY: readonly {
  readonly kind: ArtemisFcsKind;
  readonly flag: ArtemisFlag;
  readonly hasCapableAmmo: (slots: readonly string[]) => boolean;
}[] = [
  {
    kind: 'artemis_v',
    flag: 'hasArtemisV',
    hasCapableAmmo: hasArtemisVCapableAmmo,
  },
  {
    kind: 'artemis_iv',
    flag: 'hasArtemisIV',
    hasCapableAmmo: hasArtemisIVCapableAmmo,
  },
  {
    kind: 'prototype_artemis_iv',
    flag: 'hasPrototypeArtemisIV',
    hasCapableAmmo: hasArtemisIVCapableAmmo,
  },
];

function weaponWithGuidanceFlag(weapon: IWeapon, flag: ArtemisFlag): IWeapon {
  return { ...weapon, [flag]: true };
}

function firstApplicableGuidanceFlag(
  kinds: readonly ArtemisFcsKind[],
  locationSlots: readonly string[],
): ArtemisFlag | undefined {
  return ARTEMIS_FLAG_PRIORITY.find(
    (entry) =>
      kinds.includes(entry.kind) && entry.hasCapableAmmo(locationSlots),
  )?.flag;
}

function exactCardinalityFcsKinds(
  options: {
    readonly equipmentEntries: readonly IUnitEquipmentEntry[];
    readonly location: string;
  },
  locationSlots: readonly string[],
  sameLocationArtemisCompatibleWeaponCount: number,
): readonly ArtemisFcsKind[] {
  return ARTEMIS_FLAG_PRIORITY.map((entry) => entry.kind).filter(
    (kind) =>
      artemisFcsKindSystemCountForLocation(options, locationSlots, kind) ===
      sameLocationArtemisCompatibleWeaponCount,
  );
}

export function applyArtemisGuidanceFlags(
  weapon: IWeapon,
  catalogWeapon: ICatalogWeaponStats,
  locationSlots: readonly string[],
  options?: {
    readonly equipmentEntries: readonly IUnitEquipmentEntry[];
    readonly weaponEntry: IUnitEquipmentEntry;
    readonly location: string;
    readonly sameLocationArtemisCompatibleWeaponCount: number;
  },
): IWeapon {
  if (!isArtemisCompatibleCatalogWeapon(catalogWeapon)) return weapon;

  if (
    options !== undefined &&
    hasExplicitLinkedArtemisFcsInLocation({
      equipmentEntries: options.equipmentEntries,
      location: options.location,
    })
  ) {
    const flag = firstApplicableGuidanceFlag(
      artemisLinkedFcsKindsForWeapon({
        equipmentEntries: options.equipmentEntries,
        weaponEntry: options.weaponEntry,
        aiWeapon: weapon,
        catalogWeapon,
        location: options.location,
      }),
      locationSlots,
    );
    return flag === undefined ? weapon : weaponWithGuidanceFlag(weapon, flag);
  }

  const sameLocationArtemisCompatibleWeaponCount =
    options?.sameLocationArtemisCompatibleWeaponCount ?? 0;
  if (options === undefined || sameLocationArtemisCompatibleWeaponCount < 1) {
    return weapon;
  }

  const exactKinds = exactCardinalityFcsKinds(
    options,
    locationSlots,
    sameLocationArtemisCompatibleWeaponCount,
  );
  const flag =
    exactKinds.length === 1
      ? firstApplicableGuidanceFlag(exactKinds, locationSlots)
      : undefined;

  return flag === undefined ? weapon : weaponWithGuidanceFlag(weapon, flag);
}
