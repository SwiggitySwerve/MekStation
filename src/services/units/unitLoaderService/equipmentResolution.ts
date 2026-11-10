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
import {
  isAmmunitionEquipmentId,
  loadAmmunitionCatalog,
} from '@/utils/construction/equipmentBV/catalogLoader';
import { normalizeNativeEquipmentName as normalizeCatalogEquipmentId } from '@/utils/construction/equipmentBV/normalization';
import { getAmmunitionEntry } from '@/utils/construction/equipmentBV/resolution';
import { nativeIdentityId } from '@/utils/construction/equipmentBV/sourceLookupAliases';
import {
  isRegistryEquipment,
  isLegacyEquipmentId,
  preferRegistryEquipment,
  resolveRegistryId,
  techRoute,
  techRouteId,
} from '@/utils/construction/equipmentBVCatalogData';

import { parseCriticalSlotToken } from './criticalSlotToken';

type TechHint = 'clan' | 'is';

export { parseCriticalSlotToken } from './criticalSlotToken';

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
    .replace(/\s*\[Clan\]\s*$/i, '')
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
    /\(Clan\)/i.test(trimmed) ||
    /\[Clan\]/i.test(trimmed)
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

/**
 * A native name that carries its own tech prefix (CLLRM20, cllrm20, clan-lrm-20,
 * ISTAG) names one Java item whatever the unit is: the prefix is the side when
 * removing it leaves the same base item, or when the normalizer kept the Clan
 * marker (cllightmg -> clan-light-machine-gun). Unit lists without crit slots
 * (vehicles) otherwise fell back to the IS record on mixed-tech units.
 */
function ownTechSide(
  id: string,
  normalizedId: string,
  candidates: IEquipmentVariantCandidates,
): TechBase | null {
  const { baseId } = candidates;
  const token = parseCriticalSlotToken(id).lookupToken;
  const raw = token.toLowerCase().trim();
  if (/^cl/.test(raw) && normalizedId === `clan-${baseId}`)
    return TechBase.CLAN;
  const sides: [RegExp, TechBase][] = [
    [/^clan-?/, TechBase.CLAN],
    [/^cl/, TechBase.CLAN],
    [/^is-?/, TechBase.INNER_SPHERE],
  ];
  for (const [prefix, side] of sides) {
    if (!prefix.test(raw)) continue;
    const rest = raw.replace(prefix, '');
    if (rest && normalizeCatalogEquipmentId(rest, false) === baseId)
      return side;
  }
  // A bracketed source marker names the side before unit-mode fallback.
  const hint = getTechHintFromToken(token);
  const stripped = stripTechMarkersFromName(raw);
  if (
    raw.endsWith(']') &&
    stripped !== raw &&
    hint &&
    normalizeCatalogEquipmentId(stripped, false) === baseId
  ) {
    const side = hint === 'clan' ? TechBase.CLAN : TechBase.INNER_SPHERE;
    const candidate = resolveVariantByTechBase(candidates, side);
    return candidate?.equipmentDef?.techBase === side ? side : null;
  }
  return null;
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
 * Tech-dependent identities (follow-up 93): the list id and the crit token of one
 * mount resolve to the pinned Java item for the unit's side. Mixed-tech units use
 * the location's Clan/IS crit marker for that item, then the side whose target a
 * crit token at the location resolves to, else the unit's tech base.
 */
function techRouteSideFromSlots(
  route: Readonly<{ INNER_SPHERE: string; CLAN: string }>,
  slots: ReadonlyArray<string | null> | undefined,
): TechBase | null {
  for (const entry of slots ?? []) {
    if (typeof entry !== 'string') continue;
    const token = parseCriticalSlotToken(entry).lookupToken;
    const own = techRoute(token);
    // A tech-dependent token says nothing about the side; a single-owner one names its id.
    if (own && own.INNER_SPHERE !== own.CLAN) continue;
    const tokenId = own ? own.CLAN : normalizeCatalogEquipmentId(token);
    if (tokenId === route.CLAN) return TechBase.CLAN;
    if (tokenId === route.INNER_SPHERE) return TechBase.INNER_SPHERE;
  }
  return null;
}

function resolveTechRoutedEquipment(
  id: string,
  unitTechBase: TechBase,
  mode: TechBaseMode,
  slots: ReadonlyArray<string | null> | undefined,
): IResolvedEquipment | null {
  const name = parseCriticalSlotToken(id).lookupToken;
  const route = techRoute(name);
  if (!route) return null;
  const side =
    mode === TechBaseMode.CLAN
      ? TechBase.CLAN
      : mode === TechBaseMode.INNER_SPHERE
        ? TechBase.INNER_SPHERE
        : (inferPreferredTechBaseFromCriticalSlots(
            slots,
            normalizeMatchKey(name),
          ) ??
          techRouteSideFromSlots(route, slots) ??
          unitTechBase);
  const routedId = techRouteId(name, side === TechBase.CLAN);
  const equipmentDef = routedId
    ? getEquipmentLookupService().getById(routedId)
    : undefined;
  return equipmentDef ? { equipmentDef, resolvedId: equipmentDef.id } : null;
}

/**
 * A bin on a list without crit slots (vehicles) takes the record the BV owner
 * resolves it to when that is a pinned Java AmmoType record (Clan Ammo LRM-20,
 * BV 27), not the legacy record of the same base (IS ammo-lrm-20, BV 23). Mech
 * lists keep the legacy pairing, which their crit tokens share.
 */
function resolveSlotlessAmmo(id: string): IResolvedEquipment | null {
  if (!isAmmunitionEquipmentId(id)) return null;
  const native = getAmmunitionEntry(id)?.id;
  const equipmentDef =
    native && isRegistryEquipment(native)
      ? getEquipmentLookupService().getById(native)
      : undefined;
  return equipmentDef?.category === EquipmentCategory.AMMUNITION
    ? { equipmentDef, resolvedId: equipmentDef.id }
    : null;
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
  sourceName?: string,
): IResolvedEquipment {
  const routed = resolveTechRoutedEquipment(id, unitTechBase, mode, slots);
  if (routed) return routed;
  const ammo = slots === undefined ? resolveSlotlessAmmo(id) : null;
  if (ammo) return ammo;
  const previous = resolveLegacyEquipmentId(id, unitTechBase, mode, slots);
  const target = normalizeCatalogEquipmentId(id);
  const lookup = getEquipmentLookupService();
  // Converted slugs can lose native punctuation. The retained name may recover
  // a generated definition without replacing an existing ID or ammo identity.
  const namedTarget =
    !previous.equipmentDef &&
    !isRegistryEquipment(target) &&
    sourceName &&
    !isAmmunitionEquipmentId(id) &&
    !isAmmunitionEquipmentId(sourceName)
      ? normalizeCatalogEquipmentId(sourceName)
      : undefined;
  const added =
    (isRegistryEquipment(target) ? lookup.getById(target) : undefined) ??
    (namedTarget && isRegistryEquipment(namedTarget)
      ? lookup.getById(namedTarget)
      : undefined);
  // Recovery must retain the legacy ammo/category boundary and exclude imports.
  const registryId =
    nativeIdentityId(id.replaceAll('-', ' ')) ??
    getEquipmentRegistry().lookup(id).equipment?.id;
  const legacy =
    previous.equipmentDef ??
    legacyDefinition(lookup.getById(registryId ?? ''), id);
  // MtfFile/BLKFile names use Java's exact registry, even when our catalog
  // reserves that spelling for an ammo ID (ISMRM1.java:57-63, 48fcb2f64).
  const nativeAmmoIdCollision =
    loadAmmunitionCatalog().has(id.toLowerCase().trim()) &&
    resolveRegistryId(id) === target;
  const equipmentDef =
    (nativeAmmoIdCollision ? added : undefined) ??
    preferRegistryEquipment(legacy, added, id);
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
  const normalizedId = normalizeCatalogEquipmentId(id, false);

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
  // Mixed mounts retain their explicit technology even when a saved critical
  // grid contains display names. Unqualified source IDs still use slot hints.
  const ownSide =
    locationCriticalSlots === undefined ||
    unitTechBaseMode === TechBaseMode.MIXED
      ? ownTechSide(id, normalizedId, candidates)
      : null;

  return (
    (ownSide ? resolveVariantByTechBase(candidates, ownSide) : null) ??
    resolveMixedTechVariant(
      candidates,
      unitTechBaseMode,
      locationCriticalSlots,
    ) ??
    resolveVariantByTechBase(
      candidates,
      unitTechBaseMode === TechBaseMode.CLAN
        ? TechBase.CLAN
        : TechBase.INNER_SPHERE,
    ) ??
    resolveCandidate(candidates.isDef, candidates.isId) ??
    resolveCandidate(candidates.clanDef, candidates.clanId) ??
    resolveRegistryAlias(id, normalizedId) ?? {
      equipmentDef: undefined,
      resolvedId: normalizedId,
    }
  );
}
