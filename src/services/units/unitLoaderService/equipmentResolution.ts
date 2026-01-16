/**
 * Unit Loader Service - Equipment Resolution
 *
 * Functions for resolving equipment IDs and variants from serialized units.
 * Handles ID normalization, alias resolution, and tech-base variant selection.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import { TechBase } from '@/types/enums/TechBase';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { IEquipmentItem } from '@/types/equipment';
import { equipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';

type TechHint = 'clan' | 'is';

export const CRITICAL_SLOTS_LOCATION_KEYS: Partial<Readonly<Record<MechLocation, string>>> = {
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
  if (/^CL[A-Za-z0-9]/.test(trimmed) || /^Clan\s+/i.test(trimmed) || /\(Clan\)/i.test(trimmed)) {
    return 'clan';
  }

  // Inner Sphere markers commonly found in import sources
  if (/^IS[A-Za-z0-9]/.test(trimmed) || /^IS\s+/i.test(trimmed) || /\(IS\)/i.test(trimmed) || /\[IS\]/i.test(trimmed)) {
    return 'is';
  }

  return null;
}

function stripTechPrefixFromNormalizedKey(normalized: string, hint: TechHint): string {
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

export function inferPreferredTechBaseFromCriticalSlots(
  locationSlots: ReadonlyArray<string | null> | undefined,
  equipmentNameKey: string
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
    const strippedToken = stripTechPrefixFromNormalizedKey(normalizedToken, hint);

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
export function normalizeEquipmentId(id: string, _unitTechBase: TechBase): string {
  let normalized = id.toLowerCase().trim()
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
  locationCriticalSlots: ReadonlyArray<string | null> | undefined
): { equipmentDef: IEquipmentItem | undefined; resolvedId: string } {
  const normalizedId = normalizeEquipmentId(id, unitTechBase);
  const baseId = normalizedId.startsWith('clan-') ? normalizedId.slice(5) : normalizedId;

  // Canonical IDs in our catalog generally follow the pattern:
  // - Inner Sphere: <id>
  // - Clan: clan-<id>
  const isId = baseId;
  const clanId = `clan-${baseId}`;

  const isDef = equipmentLookupService.getById(isId);
  const clanDef = equipmentLookupService.getById(clanId);

  // For mixed-tech units, use critical slot tokens as a per-item hint for Clan vs IS variants.
  if (unitTechBaseMode === TechBaseMode.MIXED && (isDef || clanDef)) {
    const candidateName = (isDef ?? clanDef)?.name;
    const equipmentNameKey = candidateName
      ? normalizeMatchKey(stripTechMarkersFromName(candidateName))
      : normalizeMatchKey(baseId);

    const hintedTechBase = inferPreferredTechBaseFromCriticalSlots(locationCriticalSlots, equipmentNameKey);

    if (hintedTechBase === TechBase.CLAN && clanDef) {
      return { equipmentDef: clanDef, resolvedId: clanId };
    }
    if (hintedTechBase === TechBase.INNER_SPHERE && isDef) {
      return { equipmentDef: isDef, resolvedId: isId };
    }
  }

  // Unit-level preference: Clan units prefer clan-* variants when available.
  const preferredTechBase: TechBase =
    unitTechBaseMode === TechBaseMode.CLAN ? TechBase.CLAN : TechBase.INNER_SPHERE;

  if (preferredTechBase === TechBase.CLAN && clanDef) {
    return { equipmentDef: clanDef, resolvedId: clanId };
  }
  if (preferredTechBase === TechBase.INNER_SPHERE && isDef) {
    return { equipmentDef: isDef, resolvedId: isId };
  }

  // Fallback: return whichever variant exists.
  if (isDef) {
    return { equipmentDef: isDef, resolvedId: isId };
  }
  if (clanDef) {
    return { equipmentDef: clanDef, resolvedId: clanId };
  }

  // Final fallback: EquipmentRegistry name-based alias resolution
  const registry = getEquipmentRegistry();
  if (registry.isReady()) {
    const lookupResult = registry.lookup(id);
    if (lookupResult.found && lookupResult.equipment) {
      const resolvedEquipment = equipmentLookupService.getById(lookupResult.equipment.id);
      if (resolvedEquipment) {
        return { equipmentDef: resolvedEquipment, resolvedId: lookupResult.equipment.id };
      }
    }

    if (normalizedId !== id) {
      const normalizedLookup = registry.lookup(normalizedId);
      if (normalizedLookup.found && normalizedLookup.equipment) {
        const resolvedEquipment = equipmentLookupService.getById(normalizedLookup.equipment.id);
        if (resolvedEquipment) {
          return { equipmentDef: resolvedEquipment, resolvedId: normalizedLookup.equipment.id };
        }
      }
    }
  }

  // Not found
  return { equipmentDef: undefined, resolvedId: normalizedId };
}
