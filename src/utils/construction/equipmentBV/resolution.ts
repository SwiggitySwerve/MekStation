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

import { loadEquipmentCatalog, getLoggedUnresolvable } from './catalogLoader';
import { normalizeEquipmentId } from './normalization';

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

  if (name.includes('ultra ac') || name.includes('ultra ac/')) {
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

export function resolveEquipmentBV(equipmentId: string): EquipmentBVResult {
  const catalog = loadEquipmentCatalog();
  const normalizedId = normalizeEquipmentId(equipmentId);
  const entry = catalog.get(normalizedId);

  if (!entry) {
    const loggedUnresolvable = getLoggedUnresolvable();
    if (!loggedUnresolvable.has(equipmentId)) {
      loggedUnresolvable.add(equipmentId);
      if (typeof console !== 'undefined' && process.env.NODE_ENV !== 'test') {
        logger.warn(
          `[equipmentBVResolver] Unresolvable equipment ID: "${equipmentId}" (normalized: "${normalizedId}")`,
        );
      }
    }
    return { battleValue: 0, heat: 0, resolved: false };
  }

  const baseHeat = typeof entry.heat === 'number' ? entry.heat : 0;
  const bvHeat = applyBVHeatOverride(baseHeat, entry);

  return {
    battleValue: entry.battleValue ?? 0,
    heat: bvHeat,
    resolved: true,
  };
}

export function getEquipmentEntry(
  equipmentId: string,
): EquipmentCatalogEntry | undefined {
  const catalog = loadEquipmentCatalog();
  const normalizedId = normalizeEquipmentId(equipmentId);
  return catalog.get(normalizedId);
}

export function isResolvable(equipmentId: string): boolean {
  const catalog = loadEquipmentCatalog();
  const normalizedId = normalizeEquipmentId(equipmentId);
  return catalog.has(normalizedId);
}

export function resolveAmmoBV(ammoId: string): AmmoBVResult {
  const catalog = loadEquipmentCatalog();
  const normalizedId = normalizeEquipmentId(ammoId);
  const entry = catalog.get(normalizedId);

  if (!entry) {
    return { battleValue: 0, weaponType: '', resolved: false };
  }

  return {
    battleValue: entry.battleValue ?? 0,
    weaponType: normalizedId.replace(/-ammo$/, '').replace(/^ammo-/, ''),
    resolved: true,
  };
}

export function getCatalogSize(): number {
  return loadEquipmentCatalog().size;
}
