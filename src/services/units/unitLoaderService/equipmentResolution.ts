import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
/**
 * Unit Loader Service - Equipment Resolution
 *
 * Functions for resolving equipment IDs and variants from serialized units.
 * Handles ID normalization, alias resolution, and tech-base variant selection.
 *
 * @spec openspec/specs/unit-services/spec.md
 */
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, IEquipmentItem } from '@/types/equipment';
import { isAmmunitionEquipmentId } from '@/utils/construction/equipmentBV/catalogLoader';
import { normalizeEquipmentId as normalizeCatalogEquipmentId } from '@/utils/construction/equipmentBV/normalization';
import { nativeIdentityId } from '@/utils/construction/equipmentBV/sourceLookupAliases';
import {
  isRegistryEquipment,
  isLegacyEquipmentId,
  preferRegistryEquipment,
} from '@/utils/construction/equipmentBVCatalogData';

type TechHint = 'clan' | 'is';

export function parseCriticalSlotToken(token: string): {
  readonly lookupToken: string;
  readonly isRearMounted: boolean;
} {
  const rearSuffix = / *[(](?:R|Rear)[)] *$/i;
  // MtfFile.java:952-956,1010-1020: armor, then pod, then rear markers.
  const mountName = token
    .replace(/\s*\(ARMORED\)\s*$/i, '')
    .replace(/\s*\(OMNIPOD\)\s*$/i, '');
  return {
    lookupToken: mountName.replace(rearSuffix, '').trim(),
    isRearMounted: rearSuffix.test(mountName),
  };
}

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
  return legacyDefinition(equipmentDef) ? { equipmentDef, resolvedId } : null;
}

function legacyDefinition(
  item: IEquipmentItem | undefined,
  request?: string,
): IEquipmentItem | undefined {
  return item &&
    isLegacyEquipmentId(item.id) &&
    (!request ||
      isAmmunitionEquipmentId(request) ===
        (item.category === EquipmentCategory.AMMUNITION))
    ? item
    : undefined;
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
    isDef: legacyDefinition(lookupService.getById(isId)),
    clanDef: legacyDefinition(lookupService.getById(clanId)),
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
  const resolvedEquipment = legacyDefinition(
    getEquipmentLookupService().getById(resolvedId),
    token,
  );

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

    const normalizedToken = normalizeMatchKey(
      parseCriticalSlotToken(entry).lookupToken,
    );
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
 * Normalize an equipment ID through the catalog-backed canonical resolver.
 * Unit tech base remains in the adapter signature because callers use this
 * module as the variant-resolution boundary.
 */
export function normalizeEquipmentId(
  id: string,
  _unitTechBase: TechBase,
): string {
  return normalizeCatalogEquipmentId(id);
}

/**
 * Attempt to resolve an equipment ID using multiple strategies.
 * Returns the equipment definition if found, or undefined.
 */
export function resolveEquipmentId(
  id: string,
  unitTechBase: TechBase,
  mode: TechBaseMode,
  slots: ReadonlyArray<string | null> | undefined,
): IResolvedEquipment {
  const previous = resolveLegacyEquipmentId(id, unitTechBase, mode, slots);
  const target = normalizeCatalogEquipmentId(id);
  const lookup = getEquipmentLookupService();
  const added = isRegistryEquipment(target)
    ? lookup.getById(target)
    : undefined;
  // Recovery must retain the legacy ammo/category boundary and exclude imports.
  const registryId =
    nativeIdentityId(id.replaceAll('-', ' ')) ??
    getEquipmentRegistry().lookup(id).equipment?.id;
  const legacy =
    previous.equipmentDef ??
    legacyDefinition(lookup.getById(registryId ?? ''), id);
  const equipmentDef = preferRegistryEquipment(legacy, added, id);
  return { equipmentDef, resolvedId: equipmentDef?.id ?? previous.resolvedId };
}
function resolveLegacyEquipmentId(
  id: string,
  _unitTechBase: TechBase,
  unitTechBaseMode: TechBaseMode,
  locationCriticalSlots: ReadonlyArray<string | null> | undefined,
): IResolvedEquipment {
  const identity = nativeIdentityId(id);
  const exact = identity
    ? legacyDefinition(getEquipmentLookupService().getById(identity), id)
    : undefined;
  if (exact) return { equipmentDef: exact, resolvedId: exact.id };
  const normalizedId = normalizeCatalogEquipmentId(id, undefined, false);

  // The normalization owner deliberately keeps missing ammo variants unresolved.
  // Do not reclassify them through weapon variants or registry aliases; ammo and
  // weapons can also share a canonical ID (for example mrm-20).
  if (isAmmunitionEquipmentId(id)) {
    return {
      equipmentDef: getEquipmentLookupService()
        .getAllEquipment()
        .find(
          (item) =>
            legacyDefinition(item) &&
            item.id === normalizedId &&
            item.category === EquipmentCategory.AMMUNITION,
        ),
      resolvedId: normalizedId,
    };
  }

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
