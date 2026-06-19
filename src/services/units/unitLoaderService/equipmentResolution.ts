/**
 * Unit Loader Service - Equipment Resolution
 *
 * Functions for resolving equipment IDs and variants from serialized units.
 * Handles ID normalization, alias resolution, and tech-base variant selection.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { IEquipmentItem } from '@/types/equipment';

type TechHint = 'clan' | 'is';

interface IResolvedEquipment {
  equipmentDef: IEquipmentItem | undefined;
  resolvedId: string;
}

interface IEquipmentVariantCandidates {
  baseId: string;
  isId: string;
  clanId: string;
  isDef: IEquipmentItem | undefined;
  clanDef: IEquipmentItem | undefined;
}

export const CRITICAL_SLOTS_LOCATION_KEYS: Partial<
  Readonly<Record<MechLocation, string>>
> = {
  [MechLocation.HEAD]: 'HEAD',
  [MechLocation.CENTER_TORSO]: 'CENTER_TORSO',
  [MechLocation.LEFT_TORSO]: 'LEFT_TORSO',
  [MechLocation.RIGHT_TORSO]: 'RIGHT_TORSO',
  [MechLocation.LEFT_ARM]: 'LEFT_ARM',
  [MechLocation.RIGHT_ARM]: 'RIGHT_ARM',
  [MechLocation.LEFT_LEG]: 'LEFT_LEG',
  [MechLocation.RIGHT_LEG]: 'RIGHT_LEG',
};

function normalizeMatchKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function stripTechMarkersFromName(name: string): string {
  return name
    .replace(/\s*\(Clan\)\s*$/i, '')
    .replace(/\s*\(IS\)\s*$/i, '')
    .replace(/\s*\[IS\]\s*$/i, '')
    .replace(/^Clan\s+/i, '')
    .replace(/^IS\s+/i, '')
    .trim();
}

function getTechHintFromToken(token: string): TechHint | null {
  const trimmed = token.trim();

  // Clan markers commonly found in MegaMek exports
  if (
    /^CL[A-Za-z0-9]/.test(trimmed) ||
    /^Clan\s+/i.test(trimmed) ||
    /\(Clan\)/i.test(trimmed)
  ) {
    return 'clan';
  }

  // Inner Sphere markers commonly found in import sources
  if (
    /^IS[A-Za-z0-9]/.test(trimmed) ||
    /^IS\s+/i.test(trimmed) ||
    /\(IS\)/i.test(trimmed) ||
    /\[IS\]/i.test(trimmed)
  ) {
    return 'is';
  }

  return null;
}

function stripTechPrefixFromNormalizedKey(
  normalized: string,
  hint: TechHint,
): string {
  if (hint === 'clan') {
    if (normalized.startsWith('clan')) return normalized.slice(4);
    if (normalized.startsWith('cl')) return normalized.slice(2);
    return normalized;
  }

  if (hint === 'is') {
    if (normalized.startsWith('is')) return normalized.slice(2);
    return normalized;
  }

  return normalized;
}

function resolveCandidate(
  equipmentDef: IEquipmentItem | undefined,
  resolvedId: string,
): IResolvedEquipment | null {
  return equipmentDef ? { equipmentDef, resolvedId } : null;
}

function buildEquipmentVariantCandidates(
  normalizedId: string,
): IEquipmentVariantCandidates {
  const baseId = normalizedId.startsWith('clan-')
    ? normalizedId.slice(5)
    : normalizedId;

  // Canonical IDs in our catalog generally follow the pattern:
  // - Inner Sphere: <id>
  // - Clan: clan-<id>
  const isId = baseId;
  const clanId = `clan-${baseId}`;
  const lookupService = getEquipmentLookupService();

  return {
    baseId,
    isId,
    clanId,
    isDef: lookupService.getById(isId),
    clanDef: lookupService.getById(clanId),
  };
}

function resolveVariantByTechBase(
  candidates: IEquipmentVariantCandidates,
  techBase: TechBase,
): IResolvedEquipment | null {
  return techBase === TechBase.CLAN
    ? resolveCandidate(candidates.clanDef, candidates.clanId)
    : resolveCandidate(candidates.isDef, candidates.isId);
}

function resolveMixedTechVariant(
  candidates: IEquipmentVariantCandidates,
  unitTechBaseMode: TechBaseMode,
  locationCriticalSlots: ReadonlyArray<string | null> | undefined,
): IResolvedEquipment | null {
  if (
    unitTechBaseMode !== TechBaseMode.MIXED ||
    (!candidates.isDef && !candidates.clanDef)
  ) {
    return null;
  }

  const candidateName = (candidates.isDef ?? candidates.clanDef)?.name;
  const equipmentNameKey = candidateName
    ? normalizeMatchKey(stripTechMarkersFromName(candidateName))
    : normalizeMatchKey(candidates.baseId);

  const hintedTechBase = inferPreferredTechBaseFromCriticalSlots(
    locationCriticalSlots,
    equipmentNameKey,
  );

  return hintedTechBase
    ? resolveVariantByTechBase(candidates, hintedTechBase)
    : null;
}

function resolveUnitPreferredVariant(
  candidates: IEquipmentVariantCandidates,
  unitTechBaseMode: TechBaseMode,
): IResolvedEquipment | null {
  const preferredTechBase =
    unitTechBaseMode === TechBaseMode.CLAN
      ? TechBase.CLAN
      : TechBase.INNER_SPHERE;

  return resolveVariantByTechBase(candidates, preferredTechBase);
}

function resolveAnyVariant(
  candidates: IEquipmentVariantCandidates,
): IResolvedEquipment | null {
  return (
    resolveCandidate(candidates.isDef, candidates.isId) ??
    resolveCandidate(candidates.clanDef, candidates.clanId)
  );
}

function resolveRegistryLookupToken(token: string): IResolvedEquipment | null {
  const lookupResult = getEquipmentRegistry().lookup(token);

  if (!lookupResult.found || !lookupResult.equipment) {
    return null;
  }

  const resolvedId = lookupResult.equipment.id;
  const resolvedEquipment = getEquipmentLookupService().getById(resolvedId);

  return resolveCandidate(resolvedEquipment, resolvedId);
}

function resolveRegistryAlias(
  id: string,
  normalizedId: string,
): IResolvedEquipment | null {
  const registry = getEquipmentRegistry();

  if (!registry.isReady()) {
    return null;
  }

  return (
    resolveRegistryLookupToken(id) ??
    (normalizedId !== id ? resolveRegistryLookupToken(normalizedId) : null)
  );
}

export function inferPreferredTechBaseFromCriticalSlots(
  locationSlots: ReadonlyArray<string | null> | undefined,
  equipmentNameKey: string,
): TechBase | null {
  if (!locationSlots || locationSlots.length === 0) {
    return null;
  }

  for (const entry of locationSlots) {
    if (typeof entry !== 'string') {
      continue;
    }

    const hint = getTechHintFromToken(entry);
    if (!hint) {
      continue;
    }

    const normalizedToken = normalizeMatchKey(entry);
    const strippedToken = stripTechPrefixFromNormalizedKey(
      normalizedToken,
      hint,
    );

    if (strippedToken === equipmentNameKey) {
      return hint === 'clan' ? TechBase.CLAN : TechBase.INNER_SPHERE;
    }
  }

  return null;
}

/**
 * Normalize an equipment ID by converting legacy formats to canonical IDs.
 * Handles patterns like:
 * - 'ultra-ac-5' → 'uac-5'
 * - 'clan-ultra-ac-5' → 'clan-uac-5'
 * - 'lb-10-x-ac' → 'lb-10x-ac'
 * - 'rotary-ac-5' → 'rac-5'
 */
export function normalizeEquipmentId(
  id: string,
  _unitTechBase: TechBase,
): string {
  let normalized = id
    .toLowerCase()
    .trim()
    .replace(/[ \-_]+/g, '-');

  // Check for Clan prefix
  const isClanPrefix = normalized.startsWith('clan-');
  if (isClanPrefix) {
    normalized = normalized.slice(5); // Remove 'clan-' prefix
  }

  // Ultra AC/x patterns: 'ultra-ac-5' → 'uac-5'
  if (/^ultra-?ac-?\d+$/.test(normalized)) {
    const num = normalized.match(/\d+$/)?.[0];
    normalized = `uac-${num}`;
  }

  // Rotary AC patterns: 'rotary-ac-5' → 'rac-5'
  if (/^rotary-?ac-?\d+$/.test(normalized)) {
    const num = normalized.match(/\d+$/)?.[0];
    normalized = `rac-${num}`;
  }

  // Light AC patterns: 'light-ac-5' → 'lac-5'
  if (/^light-?ac-?\d+$/.test(normalized)) {
    const num = normalized.match(/\d+$/)?.[0];
    normalized = `lac-${num}`;
  }

  // LB X AC patterns: 'lb-10-x-ac' → 'lb-10x-ac'
  normalized = normalized.replace(/^lb-(\d+)-x-ac$/, 'lb-$1x-ac');

  // ER laser patterns
  normalized = normalized.replace(/^extended-range-(.*)$/, 'er-$1');

  // Handle ammo patterns
  if (normalized.endsWith('-ammo') || normalized.includes('-ammo-')) {
    // 'ultra-ac-5-ammo' → 'uac-5-ammo'
    normalized = normalized.replace(/ultra-ac-(\d+)/, 'uac-$1');
    normalized = normalized.replace(/rotary-ac-(\d+)/, 'rac-$1');
    normalized = normalized.replace(/light-ac-(\d+)/, 'lac-$1');
    normalized = normalized.replace(/lb-(\d+)-x-ac/, 'lb-$1x-ac');
  }

  // Re-add clan prefix if it was explicitly present in the source ID
  if (isClanPrefix) {
    normalized = `clan-${normalized}`;
  }

  return normalized;
}

/**
 * Attempt to resolve an equipment ID using multiple strategies.
 * Returns the equipment definition if found, or undefined.
 */
export function resolveEquipmentId(
  id: string,
  unitTechBase: TechBase,
  unitTechBaseMode: TechBaseMode,
  locationCriticalSlots: ReadonlyArray<string | null> | undefined,
): IResolvedEquipment {
  const normalizedId = normalizeEquipmentId(id, unitTechBase);

  const candidates = buildEquipmentVariantCandidates(normalizedId);

  return (
    resolveMixedTechVariant(
      candidates,
      unitTechBaseMode,
      locationCriticalSlots,
    ) ??
    resolveUnitPreferredVariant(candidates, unitTechBaseMode) ??
    resolveAnyVariant(candidates) ??
    resolveRegistryAlias(id, normalizedId) ?? {
      equipmentDef: undefined,
      resolvedId: normalizedId,
    }
  );
}
