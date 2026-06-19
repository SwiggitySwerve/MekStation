import type { IWeapon } from '../ai/types';
import type { IUnitEquipmentEntry } from './UnitHydrationTypes';

import { artemisFcsKindFromNormalizedId } from './UnitHydrationArtemis';
import {
  normalizeCriticalSlotText,
  normalizeEquipmentId,
  normalizeEquipmentLocation,
  normalizedWithoutTechPrefix,
  runtimeWeaponCatalogId,
  stripCriticalSlotRearMarker,
} from './UnitHydrationText';

export function isPrototypeImprovedJumpJetCriticalSlot(
  normalized: string,
): boolean {
  return normalizedWithoutTechPrefix(normalized) === 'prototypeimprovedjumpjet';
}

export function isExtendedFuelTankCriticalSlot(normalized: string): boolean {
  return /^extendedfueltank(?:\d+tons?)?$/.test(
    normalizedWithoutTechPrefix(normalized),
  );
}

export function isEmergencyCoolantSystemCriticalSlot(
  normalized: string,
): boolean {
  const withoutTechPrefix = normalizedWithoutTechPrefix(normalized);
  return (
    withoutTechPrefix === 'riscemergencycoolantsystem' ||
    withoutTechPrefix === 'emergencycoolantsystem'
  );
}

export function isBlueShieldParticleFieldDamperCriticalSlot(
  normalized: string,
): boolean {
  return (
    normalizedWithoutTechPrefix(normalized) === 'blueshieldparticlefielddamper'
  );
}

export function isRiscLaserPulseModuleCriticalSlot(
  normalized: string,
): boolean {
  return normalizedWithoutTechPrefix(normalized) === 'risclaserpulsemodule';
}

export function weaponForCriticalSlot(
  slotText: string,
  sourceLocation: string,
  aiWeapons: readonly IWeapon[],
): IWeapon | undefined {
  return aiWeapons.find((weapon) =>
    criticalSlotMatchesWeapon(slotText, weapon, sourceLocation),
  );
}

export function blueShieldExplosionDamageForCriticalSlot(
  sourceLocation: string,
  equipmentEntries: readonly IUnitEquipmentEntry[],
): number | undefined {
  const mode = blueShieldModeForCriticalSlot(sourceLocation, equipmentEntries);
  return mode !== undefined && normalizeCriticalSlotText(mode) === 'off'
    ? undefined
    : 5;
}

export function equipmentEntryForCriticalSlotWeapon(
  slotText: string,
  sourceLocation: string,
  weapon: IWeapon,
  equipmentEntries: readonly IUnitEquipmentEntry[],
): IUnitEquipmentEntry | undefined {
  const source = normalizeEquipmentLocation(sourceLocation);
  const aliases = new Set(weaponAliases(weapon));
  const normalizedSlot = normalizeCriticalSlotText(
    stripCriticalSlotRearMarker(slotText),
  );
  const normalizedSlotWithoutPrefix =
    normalizedWithoutTechPrefix(normalizedSlot);

  const matches = equipmentEntries.filter((entry) => {
    if (normalizeEquipmentLocation(entry.location) !== source) return false;

    const normalizedEntryId = normalizeEquipmentId(entry.id);
    const normalizedEntryIdWithoutPrefix =
      normalizedWithoutTechPrefix(normalizedEntryId);
    return (
      aliases.has(normalizedEntryId) ||
      aliases.has(normalizedEntryIdWithoutPrefix) ||
      normalizedEntryId === normalizedSlot ||
      normalizedEntryIdWithoutPrefix === normalizedSlotWithoutPrefix
    );
  });

  return matches.length === 1 ? matches[0] : undefined;
}

export function hotLoadedCriticalMetadataFromEquipmentEntry(
  entry: IUnitEquipmentEntry | undefined,
  equipmentEntries: readonly IUnitEquipmentEntry[],
): { readonly hotLoaded: true; readonly explosionDamage: number } | undefined {
  if (entry === undefined) return undefined;
  if (!isHotLoadMode(entry.currentMode)) return undefined;

  const explosionDamage =
    entry.explosionDamage ??
    linkedAmmoExplosionDamageFromEquipmentEntry(entry, equipmentEntries);
  if (explosionDamage === undefined) return undefined;

  return {
    hotLoaded: true,
    explosionDamage,
  };
}

export function equipmentExplosionMetadataForCriticalSlot(
  normalizedSlot: string,
  sourceLocation: string,
  equipmentEntries: readonly IUnitEquipmentEntry[],
): { readonly explosionDamage: number } | undefined {
  const source = normalizedEquipmentLocationKey(sourceLocation);
  const normalizedSlotWithoutPrefix =
    normalizedWithoutTechPrefix(normalizedSlot);
  const matches = equipmentEntries.filter((entry) => {
    if (entry.explosionDamage === undefined) return false;
    if (normalizedEquipmentLocationKey(entry.location) !== source) return false;

    const normalizedEntryId = normalizeEquipmentId(entry.id);
    const normalizedEntryIdWithoutPrefix =
      normalizedWithoutTechPrefix(normalizedEntryId);
    return (
      normalizedEntryId === normalizedSlot ||
      normalizedEntryIdWithoutPrefix === normalizedSlotWithoutPrefix
    );
  });

  if (matches.length !== 1) return undefined;
  const [match] = matches;
  return match.explosionDamage === undefined
    ? undefined
    : { explosionDamage: match.explosionDamage };
}

export function linkedWeaponForRiscLaserPulseModule(
  sourceLocation: string,
  equipmentEntries: readonly IUnitEquipmentEntry[],
  aiWeapons: readonly IWeapon[],
): IWeapon | undefined {
  const normalizedSourceLocation = normalizeEquipmentLocation(sourceLocation);
  const moduleEntry = equipmentEntries.find((entry) => {
    return (
      normalizeEquipmentId(entry.id) === 'risclaserpulsemodule' &&
      normalizeEquipmentLocation(entry.location) === normalizedSourceLocation &&
      Array.isArray(entry.linkedEquipment) &&
      entry.linkedEquipment.length > 0
    );
  });
  if (!moduleEntry) {
    return unambiguousSameLocationLaserWeapon(sourceLocation, aiWeapons);
  }

  const linkedIds = new Set(
    moduleEntry.linkedEquipment?.map((id) => normalizeEquipmentId(id)) ?? [],
  );
  const candidates = aiWeapons.filter((weapon) => {
    if (weapon.destroyed === true) return false;
    if (
      typeof weapon.location !== 'string' ||
      normalizeEquipmentLocation(weapon.location) !== normalizedSourceLocation
    ) {
      return false;
    }
    if (!isLaserWeapon(weapon)) return false;

    return (
      linkedIds.has(normalizeEquipmentId(weapon.name)) ||
      linkedIds.has(normalizeEquipmentId(weapon.id)) ||
      linkedIds.has(normalizeEquipmentId(runtimeWeaponCatalogId(weapon.id)))
    );
  });
  return candidates.length === 1 ? candidates[0] : undefined;
}

export function linkedWeaponForArtemisFcs(
  normalizedCriticalSlotText: string,
  sourceLocation: string,
  equipmentEntries: readonly IUnitEquipmentEntry[],
  aiWeapons: readonly IWeapon[],
): IWeapon | undefined {
  const fcsKind = artemisFcsKindFromNormalizedId(normalizedCriticalSlotText);
  if (fcsKind === undefined) return undefined;

  const moduleEntry = equipmentEntries.find((entry) => {
    return (
      artemisFcsKindFromNormalizedId(normalizeEquipmentId(entry.id)) ===
        fcsKind &&
      normalizeEquipmentLocation(entry.location) ===
        normalizeEquipmentLocation(sourceLocation) &&
      Array.isArray(entry.linkedEquipment) &&
      entry.linkedEquipment.length > 0
    );
  });
  if (!moduleEntry) return undefined;

  const linkedIds = new Set(
    moduleEntry.linkedEquipment?.map((id) => normalizeEquipmentId(id)) ?? [],
  );
  return aiWeapons.find((weapon) => {
    return (
      weapon.location === normalizeEquipmentLocation(sourceLocation) &&
      (linkedIds.has(normalizeEquipmentId(weapon.name)) ||
        linkedIds.has(normalizeEquipmentId(weapon.id)))
    );
  });
}

function addAutocannonAlias(aliases: Set<string>, normalized: string): void {
  const match = normalized.match(/^ac(\d+)$/);
  if (match) {
    aliases.add(`autocannon${match[1]}`);
  }
}

function weaponAliases(weapon: IWeapon): readonly string[] {
  const aliases = new Set<string>();
  const baseId = normalizeCriticalSlotText(runtimeWeaponCatalogId(weapon.id));
  const name = normalizeCriticalSlotText(weapon.name);

  for (const alias of [baseId, name]) {
    aliases.add(alias);
    aliases.add(normalizedWithoutTechPrefix(alias));
    addAutocannonAlias(aliases, alias);
  }

  return Array.from(aliases);
}

function criticalSlotMatchesWeapon(
  slotText: string,
  weapon: IWeapon,
  sourceLocation: string,
): boolean {
  const weaponLocation =
    typeof weapon.location === 'string'
      ? normalizeEquipmentLocation(weapon.location)
      : '';
  if (
    weaponLocation.length > 0 &&
    normalizeEquipmentLocation(sourceLocation) !== weaponLocation
  ) {
    return false;
  }

  const normalized = normalizeCriticalSlotText(
    stripCriticalSlotRearMarker(slotText),
  );
  const normalizedWithoutPrefix = normalizedWithoutTechPrefix(normalized);
  return weaponAliases(weapon).some(
    (alias) => alias === normalized || alias === normalizedWithoutPrefix,
  );
}

function isBlueShieldEquipmentEntry(entry: IUnitEquipmentEntry): boolean {
  return (
    normalizedWithoutTechPrefix(normalizeEquipmentId(entry.id)) ===
    'blueshieldparticlefielddamper'
  );
}

function normalizedEquipmentLocationKey(location: string): string {
  return normalizeCriticalSlotText(normalizeEquipmentLocation(location));
}

function blueShieldModeForCriticalSlot(
  sourceLocation: string,
  equipmentEntries: readonly IUnitEquipmentEntry[],
): string | undefined {
  const source = normalizedEquipmentLocationKey(sourceLocation);
  return equipmentEntries.find(
    (entry) =>
      isBlueShieldEquipmentEntry(entry) &&
      normalizedEquipmentLocationKey(entry.location) === source,
  )?.currentMode;
}

function linkedAmmoExplosionDamageFromEquipmentEntry(
  entry: IUnitEquipmentEntry,
  equipmentEntries: readonly IUnitEquipmentEntry[],
): number | undefined {
  if (
    !Array.isArray(entry.linkedEquipment) ||
    entry.linkedEquipment.length === 0
  ) {
    return undefined;
  }

  const sourceLocation = normalizeEquipmentLocation(entry.location);
  const linkedIds = new Set(
    entry.linkedEquipment.map((id) => normalizeEquipmentId(id)),
  );
  const matches = equipmentEntries.filter((candidate) => {
    if (candidate.explosionDamage === undefined) return false;
    if (normalizeEquipmentLocation(candidate.location) !== sourceLocation) {
      return false;
    }
    const normalizedId = normalizeEquipmentId(candidate.id);
    return linkedIds.has(normalizedId) && isLinkedAmmoEquipmentId(normalizedId);
  });

  if (matches.length !== 1) return undefined;
  const [match] = matches;
  return match.explosionDamage;
}

function isLinkedAmmoEquipmentId(normalizedId: string): boolean {
  return normalizedId.includes('ammo');
}

function isHotLoadMode(mode: string | undefined): boolean {
  if (mode === undefined) return false;
  const normalized = normalizeCriticalSlotText(mode);
  return normalized === 'hotload' || normalized === 'hotloaded';
}

function unambiguousSameLocationLaserWeapon(
  sourceLocation: string,
  aiWeapons: readonly IWeapon[],
): IWeapon | undefined {
  const source = normalizeEquipmentLocation(sourceLocation);
  const candidates = aiWeapons.filter((weapon) => {
    if (weapon.destroyed === true) return false;
    if (
      typeof weapon.location !== 'string' ||
      normalizeEquipmentLocation(weapon.location) !== source
    ) {
      return false;
    }
    return isLaserWeapon(weapon);
  });

  return candidates.length === 1 ? candidates[0] : undefined;
}

function isLaserWeapon(weapon: IWeapon): boolean {
  const normalizedName = normalizeEquipmentId(weapon.name);
  const normalizedId = normalizeEquipmentId(runtimeWeaponCatalogId(weapon.id));
  return normalizedName.includes('laser') || normalizedId.includes('laser');
}
