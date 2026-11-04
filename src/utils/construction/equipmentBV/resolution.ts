import {
  addAmmunitionAliases,
  ammunitionAliasKey,
  isPhysicalAmmunitionBin,
} from '@/services/equipment/aliases/ammunition';
import { TechBase } from '@/types/enums/TechBase';
/**
 * Equipment BV Resolver - BV Resolution
 *
 * Resolves equipment IDs to BV and heat values with BV-context heat overrides.
 * Provides the main public API for equipment lookup and validation.
 */
import { logger } from '@/utils/logger';

import type {
  AmmoBVResult,
  EquipmentBVResult,
  EquipmentCatalogEntry,
} from './types';

import {
  isLegacyEquipmentId,
  preferRegistryEquipment,
} from '../equipmentBVCatalogData';
import {
  loadEquipmentCatalog,
  loadCatalogForEquipmentId,
  loadAmmunitionCatalog,
  getLoggedUnresolvable,
} from './catalogLoader';
import { normalizeEquipmentId } from './normalization';
import { applyOneShotBVHeat } from './weaponHeat';

/** BVCalculator.processWeapon: apply only to the launcher linked by Artemis. */
export function getArtemisBVMultiplier(type?: 'iv' | 'v'): number {
  return type === 'iv' ? 1.2 : type === 'v' ? 1.3 : 1;
}

function applyBVHeatOverride(
  baseHeat: number,
  entry: EquipmentCatalogEntry,
): number {
  const subType = (entry.subType ?? '').toLowerCase();
  const name = entry.name.toLowerCase();

  if (subType.includes('ultra ac') || subType === 'ultra ac') {
    return baseHeat * 2;
  }

  if (subType.includes('rotary ac') || subType === 'rotary ac') {
    return baseHeat * 6;
  }

  if (subType.includes('streak srm') || subType === 'streak srm') {
    return baseHeat * 0.5;
  }

  // ISUAC5Prototype.java:62-71; HeatTrackingBVCalculator.java:178-180 (48fcb2f64).
  if (name.includes('ultra ac') || name.includes('ultra autocannon')) {
    return baseHeat * 2;
  }
  if (name.includes('rotary ac') || name.includes('rotary ac/')) {
    return baseHeat * 6;
  }
  if (name.includes('streak srm')) {
    return baseHeat * 0.5;
  }

  if (name.includes('streak lrm')) {
    return baseHeat * 0.5;
  }

  if (name.includes('improved atm') || name.includes('iatm')) {
    return baseHeat * 0.5;
  }

  return baseHeat;
}

/** Retain source mount identity when a caller tries a tech-qualified catalog spelling. */
export function resolveEquipmentBV(
  equipmentId: string,
  sourceEquipmentId: string = equipmentId,
): EquipmentBVResult {
  const entry = getEquipmentEntry(equipmentId);

  if (!entry) {
    const loggedUnresolvable = getLoggedUnresolvable();
    if (!loggedUnresolvable.has(equipmentId)) {
      loggedUnresolvable.add(equipmentId);
      if (typeof console !== 'undefined' && process.env.NODE_ENV !== 'test') {
        logger.warn(
          `[equipmentBVResolver] Unresolvable equipment ID: "${equipmentId}" (normalized: "${normalizeEquipmentId(equipmentId)}")`,
        );
      }
    }
    return { battleValue: 0, heat: 0, resolved: false };
  }

  const baseHeat = typeof entry.heat === 'number' ? entry.heat : 0;
  // HeatTrackingBVCalculator.java:170-180: one-shot /4 precedes other heat modifiers.
  const bvHeat = applyBVHeatOverride(
    applyOneShotBVHeat(
      baseHeat,
      equipmentId,
      sourceEquipmentId,
      entry.id,
      entry.name,
    ),
    entry,
  );

  return {
    battleValue: entry.battleValue ?? 0,
    heat: bvHeat,
    resolved: true,
  };
}

export function getEquipmentEntry(
  equipmentId: string,
): EquipmentCatalogEntry | undefined {
  const catalog = loadCatalogForEquipmentId(equipmentId);
  const normalizedId = normalizeEquipmentId(equipmentId, catalog);
  return catalog.get(normalizedId);
}

export function isResolvable(equipmentId: string): boolean {
  return getEquipmentEntry(equipmentId) !== undefined;
}

export function getAmmunitionEntry(
  ammoId: string,
): EquipmentCatalogEntry | undefined {
  const catalog = loadAmmunitionCatalog();
  return catalog.get(normalizeEquipmentId(ammoId, catalog));
}

/** Native large-craft standard IS bins may carry an Artemis-capability label.
 * This is not a munition BV bonus; keep legacy Mech/fighter lookup unchanged.
 */
export function getLargeAerospaceAmmoEntry(
  ammoId: string,
): EquipmentCatalogEntry | undefined {
  return getAmmunitionEntry(
    ammoId.replace(/^(is-ammo-(?:lrm|srm)-\d+)-artemis-capable$/, '$1'),
  );
}

export function resolveAmmoBV(ammoId: string): AmmoBVResult {
  const entry = getAmmunitionEntry(ammoId);

  if (!entry) {
    return { battleValue: 0, weaponType: '', resolved: false };
  }

  return {
    battleValue: entry.battleValue ?? 0,
    weaponType: entry.id.replace(/-ammo$/, '').replace(/^ammo-/, ''),
    resolved: true,
  };
}

export function getCatalogSize(): number {
  return loadEquipmentCatalog().size;
}

/** Physical-bin aliases reuse the registry owner, including its malformed-half-bin guard.
 * Keep legacy BV identity resolution unchanged; physical construction needs bin size.
 */
export function getAmmunitionWeightEntry(
  ammoId: string,
): EquipmentCatalogEntry | undefined {
  const catalog = loadAmmunitionCatalog(),
    aliases = new Map<string, string>();
  const normalize = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const entry of catalog.values())
    if (
      isLegacyEquipmentId(entry.id) &&
      entry.weight !== undefined &&
      entry.shotsPerTon !== undefined
    )
      addAmmunitionAliases(
        {
          ...entry,
          weight: entry.weight,
          shotsPerTon: entry.shotsPerTon,
          techBase:
            entry.techBase === 'CLAN' ? TechBase.CLAN : TechBase.INNER_SPHERE,
        },
        aliases,
        normalize,
      );
  const alias = aliases.get(ammunitionAliasKey(ammoId, normalize) ?? '');
  const imported = getAmmunitionEntry(ammoId);
  const entry = preferRegistryEquipment(
    (alias ? catalog.get(alias) : undefined) ?? imported,
    imported,
    ammoId,
  );
  return entry?.weight !== undefined &&
    isPhysicalAmmunitionBin({ ...entry, weight: entry.weight })
    ? entry
    : undefined;
}
