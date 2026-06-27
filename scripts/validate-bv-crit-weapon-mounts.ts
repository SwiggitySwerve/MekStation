import * as fs from 'fs';
import * as path from 'path';

import type { UnitData } from './validate-bv-types';

import { normalizeCritName } from './validate-bv-normalizers';

export interface CritWeaponMountCounts {
  rearWeaponCountByLoc: Map<string, Map<string, number>>;
  turretWeaponCountByLoc: Map<string, Map<string, number>>;
}

let _weaponSlotCache: Map<string, number> | null = null;

function getWeaponSlotCounts(): Map<string, number> {
  if (_weaponSlotCache) return _weaponSlotCache;
  _weaponSlotCache = new Map();
  // Load weapon catalogs data-driven from index.json
  let catalogs: string[] = [];
  try {
    const idx = JSON.parse(
      fs.readFileSync(
        path.resolve(
          process.cwd(),
          'public/data/equipment/official/index.json',
        ),
        'utf-8',
      ),
    );
    if (idx?.files?.weapons && typeof idx.files.weapons === 'object') {
      catalogs = (Object.values(idx.files.weapons) as string[]).map(
        (f) => '../' + f,
      );
    }
  } catch {
    /* fallback */
  }
  if (catalogs.length === 0)
    catalogs = [
      'energy-laser.json',
      'energy-ppc.json',
      'energy-other.json',
      'ballistic-autocannon.json',
      'ballistic-gauss.json',
      'ballistic-machinegun.json',
      'ballistic-other.json',
      'missile-atm.json',
      'missile-lrm.json',
      'missile-mrm.json',
      'missile-other.json',
      'missile-srm.json',
      'physical.json',
    ];
  for (const cat of catalogs) {
    try {
      const d = JSON.parse(
        fs.readFileSync(
          path.resolve(
            process.cwd(),
            'public/data/equipment/official/weapons/' + cat,
          ),
          'utf-8',
        ),
      );
      for (const item of d.items || []) {
        if (item.criticalSlots && item.criticalSlots > 0) {
          const norm = item.id.toLowerCase().replace(/[^a-z0-9]/g, '');
          _weaponSlotCache.set(norm, item.criticalSlots);
          const clanNorm = ('clan' + item.id)
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
          if (!_weaponSlotCache.has(clanNorm))
            _weaponSlotCache.set(clanNorm, item.criticalSlots);
        }
      }
    } catch {
      /* ignore */
    }
  }
  return _weaponSlotCache;
}

function countMarkedWeaponsByLocation(
  unit: UnitData,
  marker: 'R' | 'T',
): Map<string, Map<string, number>> {
  const weaponSlotCounts = getWeaponSlotCounts();
  const countsByLoc = new Map<string, Map<string, number>>();

  for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    const locKey = loc.toUpperCase();
    let previousWeaponNorm: string | null = null;
    let runLength = 0;

    const flushRun = () => {
      if (previousWeaponNorm && runLength > 0) {
        const slotsPerWeapon = weaponSlotCounts.get(previousWeaponNorm) ?? 1;
        const weaponCount = Math.max(1, Math.round(runLength / slotsPerWeapon));
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
      const weaponNorm = normalizeCritName(slotClean);
      if (weaponNorm === previousWeaponNorm) {
        runLength++;
      } else {
        flushRun();
        previousWeaponNorm = weaponNorm;
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
