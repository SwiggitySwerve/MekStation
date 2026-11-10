import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';
import { getEquipmentEntry } from '@/utils/construction/equipmentBVResolver';

import type { UnitData } from './types';

import { normalizeCritName } from './normalizers';

export interface CritWeaponMountCounts {
  rearWeaponCountByLoc: Map<string, Map<string, number>>;
  turretWeaponCountByLoc: Map<string, Map<string, number>>;
}

let _weaponSlotCache: Map<string, number> | null = null;

function getWeaponSlotCounts(): Map<string, number> {
  if (_weaponSlotCache) return _weaponSlotCache;
  _weaponSlotCache = new Map();
  for (const file of WEAPON_CATALOG_FILES) {
    for (const item of file.items ?? []) {
      if (
        typeof item.id !== 'string' ||
        typeof item.criticalSlots !== 'number' ||
        item.criticalSlots <= 0
      )
        continue;
      const norm = item.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      _weaponSlotCache.set(norm, item.criticalSlots);
      const clanNorm = ('clan' + item.id)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      if (!_weaponSlotCache.has(clanNorm))
        _weaponSlotCache.set(clanNorm, item.criticalSlots);
    }
  }
  return _weaponSlotCache;
}

function markedWeaponIdentity(name: string): { key: string; slots: number } {
  const clean = name
    .replace(/^\d+-/, '')
    .replace(/\s*\((?:R|T|OMNIPOD)\)/gi, '')
    .trim();
  const entry = getEquipmentEntry(clean);
  let identity = normalizeCritName(
    (entry?.id ?? clean).replace(/-registry$/, '').replace(/^clan-/, ''),
  );
  // Legacy lookup can resolve a prototype slug to its ordinary family. Retain
  // the source kind when comparing it with a native suffix-style identity.
  if (
    normalizeCritName(clean).includes('prototype') &&
    !identity.includes('prototype')
  ) {
    identity += 'prototype';
  }
  return {
    key: identity.replace(/^prototype(.+)$/, '$1prototype'),
    slots:
      entry?.criticalSlots ||
      getWeaponSlotCounts().get(normalizeCritName(clean)) ||
      1,
  };
}

/** Consume one marker for the same resolved weapon family, retaining tech-specific
 * slot counts when assembling mounts. MtfFile.java:1015-1023,1062 (48fcb2f64).
 */
export function consumeCritWeaponMount(
  counts: Map<string, number> | undefined,
  equipmentId: string,
): boolean {
  const key = markedWeaponIdentity(equipmentId).key;
  const count = counts?.get(key) ?? 0;
  if (count <= 0) return false;
  counts!.set(key, count - 1);
  return true;
}

function countMarkedWeaponsByLocation(
  unit: UnitData,
  marker: 'R' | 'T',
): Map<string, Map<string, number>> {
  const countsByLoc = new Map<string, Map<string, number>>();

  for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    const locKey = loc.toUpperCase();
    let previousWeaponNorm: string | null = null;
    let previousSlotsPerWeapon = 1;
    let runLength = 0;

    const flushRun = () => {
      if (previousWeaponNorm && runLength > 0) {
        const weaponCount = Math.max(
          1,
          Math.round(runLength / previousSlotsPerWeapon),
        );
        if (!countsByLoc.has(locKey)) countsByLoc.set(locKey, new Map());
        const locMap = countsByLoc.get(locKey)!;
        locMap.set(
          previousWeaponNorm,
          (locMap.get(previousWeaponNorm) ?? 0) + weaponCount,
        );
      }
    };

    for (const slot of slots) {
      if (!slot || typeof slot !== 'string') {
        flushRun();
        previousWeaponNorm = null;
        runLength = 0;
        continue;
      }
      const slotClean = slot.replace(/\s*\(omnipod\)/gi, '').trim();
      const slotLo = slotClean.toLowerCase();
      if (
        !new RegExp(`\\(${marker}\\)`, 'i').test(slotClean) ||
        slotLo.includes('ammo') ||
        slotLo.includes('heat sink') ||
        slotLo.includes('engine') ||
        slotLo.includes('gyro') ||
        slotLo.includes('case') ||
        (marker === 'R' && slotLo.includes('lift hoist'))
      ) {
        flushRun();
        previousWeaponNorm = null;
        runLength = 0;
        continue;
      }
      const { key: weaponNorm, slots: slotsPerWeapon } =
        markedWeaponIdentity(slotClean);
      if (weaponNorm === previousWeaponNorm) {
        runLength++;
      } else {
        flushRun();
        previousWeaponNorm = weaponNorm;
        previousSlotsPerWeapon = slotsPerWeapon;
        runLength = 1;
      }
    }
    flushRun();
  }

  return countsByLoc;
}

export function countCritWeaponMounts(unit: UnitData): CritWeaponMountCounts {
  return {
    rearWeaponCountByLoc: countMarkedWeaponsByLocation(unit, 'R'),
    turretWeaponCountByLoc: countMarkedWeaponsByLocation(unit, 'T'),
  };
}
