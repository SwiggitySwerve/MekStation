import type { IFullUnit } from '@/services/units/CanonicalUnitService';
import type { IAmmoSlotState } from '@/types/gameplay';

import { UNIT_DEFINITION_FAMILIES } from '@/services/units/unitLoaderService/definitionTypes';
import {
  extractWeaponTypeFromAmmoId,
  getNativeAmmoBVGroup,
  resolveNativeAmmoBin,
} from '@/utils/construction/battleValueAmmo';
import { AMMUNITION_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';

import type { AmmoLookup, ICatalogAmmoStats } from './UnitHydrationTypes';

import { buildAmmoLookupFromCatalogFiles } from './UnitHydrationCatalogLookup';
import {
  criticalSlotsFromFullUnit,
  equipmentEntriesFromFullUnit,
} from './UnitHydrationEquipment';
import { runnerCriticalLocationFromCatalogLocation } from './UnitHydrationLocations';
import { stripCriticalSlotRearMarker } from './UnitHydrationText';

const UNSUPPORTED_AMMO_RUNTIME_IDS = new Set(['rotaryac10', 'rotaryac20']);

function ammoLookupCandidates(slotText: string): readonly string[] {
  const cleaned = stripCriticalSlotRearMarker(slotText)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(?:artemis|narc)-capable\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const candidates = new Set<string>([cleaned]);

  const addAmmoNameCandidates = (
    techLabel: string | undefined,
    rest: string,
  ) => {
    const restWithSpaces = rest.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    const restVariants = new Set<string>([rest.trim(), restWithSpaces]);
    for (const variant of Array.from(restVariants)) {
      if (!variant) continue;
      candidates.add(`${variant} Ammo`);
      if (techLabel) {
        candidates.add(`${techLabel} ${variant} Ammo`);
      }
    }
  };

  const techMatch = cleaned.match(/^(IS|CL|Clan)\s+Ammo\s+(.+)$/i);
  if (techMatch) {
    const tech = techMatch[1];
    const rest = techMatch[2];
    if (tech === undefined || rest === undefined) return Array.from(candidates);
    const techLabel = tech.toUpperCase() === 'CL' ? 'Clan' : tech;
    addAmmoNameCandidates(techLabel, rest);
  }

  const ammoFirstMatch = cleaned.match(/^Ammo\s+(.+)$/i);
  const ammoFirstRest = ammoFirstMatch?.[1];
  if (ammoFirstRest !== undefined) {
    addAmmoNameCandidates(undefined, ammoFirstRest);
  }

  return Array.from(candidates);
}

function weaponTypeFromAmmoId(ammoId: string): string {
  if (ammoId.startsWith('ammo-')) {
    return ammoId.slice('ammo-'.length);
  }
  if (ammoId.endsWith('-ammo')) {
    return ammoId.slice(0, -'-ammo'.length);
  }
  return ammoId;
}

function weaponTypeFromAmmoStats(ammo: ICatalogAmmoStats): string | undefined {
  // This explicit full-bin catalog row has no compatibleWeaponIds. Its
  // packaging suffix is not part of the weapon family consumed in combat.
  if (ammo.id === 'ammo-mg-full') return 'machine-gun';
  if (ammo.compatibleWeaponIds.length === 1) {
    return ammo.compatibleWeaponIds[0];
  }
  if (UNSUPPORTED_AMMO_RUNTIME_IDS.has(ammo.id)) return undefined;
  return weaponTypeFromAmmoId(ammo.id);
}

export function ammoBinIdForCriticalSlot(
  sourceLocation: string,
  slotIndex: number,
  ammoId: string,
): string | undefined {
  const runnerLocation =
    runnerCriticalLocationFromCatalogLocation(sourceLocation);
  return runnerLocation !== undefined
    ? `${runnerLocation}-${slotIndex}-${ammoId}`
    : undefined;
}

export function ammoStatsForCriticalSlot(
  slotText: string,
  ammoLookup: AmmoLookup,
): ICatalogAmmoStats | null {
  for (const candidate of ammoLookupCandidates(slotText)) {
    const stats = ammoLookup(candidate);
    if (stats) return stats;
  }
  return null;
}

let cachedCatalogAmmoLookup: AmmoLookup | undefined;

export function defaultCatalogAmmoLookup(): AmmoLookup {
  cachedCatalogAmmoLookup ??= buildAmmoLookupFromCatalogFiles(
    AMMUNITION_CATALOG_FILES as readonly { items?: readonly unknown[] }[],
  );
  return cachedCatalogAmmoLookup;
}

export function hydrateAmmoStateFromFullUnit(
  fullUnit: IFullUnit,
  ammoLookup: AmmoLookup = defaultCatalogAmmoLookup(),
): Record<string, IAmmoSlotState> | undefined {
  const nativeTypes: readonly string[] = [
    ...UNIT_DEFINITION_FAMILIES.vehicles.unitTypes,
    ...UNIT_DEFINITION_FAMILIES.aerospace.unitTypes,
  ];
  if (nativeTypes.includes(fullUnit.unitType))
    return hydrateNativeAmmo(fullUnit, ammoLookup);
  const criticalSlots = criticalSlotsFromFullUnit(fullUnit);
  const ammoState: Record<string, IAmmoSlotState> = {};

  for (const [sourceLocation, sourceSlots] of Object.entries(criticalSlots)) {
    const runnerLocation =
      runnerCriticalLocationFromCatalogLocation(sourceLocation);
    if (runnerLocation === undefined) continue;

    for (let slotIndex = 0; slotIndex < sourceSlots.length; slotIndex++) {
      const slotText = sourceSlots[slotIndex];
      if (typeof slotText !== 'string') continue;
      const ammo = ammoStatsForCriticalSlot(slotText, ammoLookup);
      if (!ammo) continue;
      if (!Number.isFinite(ammo.shotsPerTon) || ammo.shotsPerTon <= 0) continue;
      const binId = ammoBinIdForCriticalSlot(
        sourceLocation,
        slotIndex,
        ammo.id,
      );
      if (binId === undefined) continue;
      const weaponType = weaponTypeFromAmmoStats(ammo);
      if (weaponType === undefined) continue;

      ammoState[binId] = {
        binId,
        weaponType,
        location: runnerLocation,
        remainingRounds: ammo.shotsPerTon,
        maxRounds: ammo.shotsPerTon,
        isExplosive: ammo.isExplosive,
      };
    }
  }

  return Object.keys(ammoState).length > 0 ? ammoState : undefined;
}

/** One equipment occurrence is one physical bin; retain native location keys.
 * @spec openspec/specs/ammo-tracking/spec.md (Per-Bin Ammo State)
 */
function hydrateNativeAmmo(
  fullUnit: IFullUnit,
  ammoLookup: AmmoLookup,
): Record<string, IAmmoSlotState> | undefined {
  const state: Record<string, IAmmoSlotState> = {};
  equipmentEntriesFromFullUnit(fullUnit).forEach((mount, index) => {
    const bin = resolveNativeAmmoBin(mount.id, mount.name);
    if (!bin) return;
    const ammo = ammoLookup(bin.ammoId);
    if (!ammo) return;
    const clan =
      /^cl(?!uster)/i.test(mount.id) ||
      (!/^is/i.test(mount.id) && fullUnit.techBase === 'CLAN');
    const group = getNativeAmmoBVGroup(mount.id);
    const compatible = ammo.compatibleWeaponIds.filter(
      (id) => !group || getNativeAmmoBVGroup(id) === group,
    );
    const fallback = extractWeaponTypeFromAmmoId(ammo.id);
    const weaponType =
      compatible.length === 1
        ? compatible[0]
        : (compatible.find((id) => id.startsWith('clan-') === clan) ??
          (clan ? `clan-${fallback}` : fallback));
    if (!weaponType) return;
    const location = mount.location.toLowerCase();
    const binId = `${location}-${index}-${bin.ammoId}`;
    state[binId] = {
      binId,
      weaponType,
      location,
      remainingRounds: bin.shots,
      maxRounds: bin.shots,
      isExplosive: ammo.isExplosive,
    };
  });
  return Object.keys(state).length ? state : undefined;
}
