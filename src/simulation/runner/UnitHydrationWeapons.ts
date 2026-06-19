import type { IFullUnit } from '@/services/units/CanonicalUnitService';

import { FiringArc } from '@/types/gameplay';

import type { IWeapon, IWeaponFiringModes } from '../ai/types';
import type {
  ICatalogWeaponStats,
  IHydratedAIWeaponsReport,
  IUnitEquipmentEntry,
  WeaponLookup,
} from './UnitHydrationTypes';

import {
  applyArtemisGuidanceFlags,
  artemisCompatibleWeaponCountByLocation,
  catalogWeaponStatsForEquipmentEntry,
} from './UnitHydrationArtemis';
import {
  criticalSlotsFromFullUnit,
  equipmentEntriesFromFullUnit,
  locationSlotTexts,
} from './UnitHydrationEquipment';
import { normalizeEquipmentLocation } from './UnitHydrationText';

export function resolveCatalogDamage(
  damage: number | string,
  weaponId: string,
): number {
  if (typeof damage === 'number') {
    return damage;
  }

  const match = damage.match(/^(?:\d+\s*-\s*)?(\d+)\s*\/\s*missile$/i);
  if (!match) {
    return 0;
  }
  const perMissile = parseInt(match[1], 10);
  const idMatch = weaponId.match(/(\d+)(?!.*\d)/);
  if (!idMatch) {
    return perMissile;
  }
  const missileCount = parseInt(idMatch[1], 10);
  return perMissile * missileCount;
}

export function toAIWeapon(
  catalogWeapon: ICatalogWeaponStats,
  mountIndex: number,
  location?: string,
  mountingArcs?: readonly FiringArc[],
): IWeapon {
  const damage = resolveCatalogDamage(catalogWeapon.damage, catalogWeapon.id);
  const firingModes = buildCatalogFiringModes(catalogWeapon, damage);
  return {
    id: `${catalogWeapon.id}-${mountIndex}`,
    name: catalogWeapon.name,
    shortRange: catalogWeapon.ranges.short,
    mediumRange: catalogWeapon.ranges.medium,
    longRange: catalogWeapon.ranges.long,
    ...(catalogWeapon.ranges.extreme !== undefined
      ? { extremeRange: catalogWeapon.ranges.extreme }
      : {}),
    damage,
    heat: catalogWeapon.heat,
    minRange: catalogWeapon.ranges.minimum,
    ammoPerTon: catalogWeapon.ammoPerTon ?? -1,
    ...(location ? { location } : {}),
    ...(mountingArcs && mountingArcs.length === 1
      ? { mountingArc: mountingArcs[0] }
      : {}),
    ...(mountingArcs && mountingArcs.length > 0 ? { mountingArcs } : {}),
    destroyed: false,
    ...(firingModes ? { firingModes } : {}),
  };
}

function mountingArcsFromEquipment(
  entry: IUnitEquipmentEntry,
): readonly FiringArc[] {
  if (entry.isRearMounted === true) return [FiringArc.Rear];

  const location =
    typeof entry.location === 'string'
      ? normalizeEquipmentLocation(entry.location)
          .toUpperCase()
          .replace(/[\s-]+/g, '_')
      : '';
  if (location === 'LEFT_ARM') return [FiringArc.Front, FiringArc.Left];
  if (location === 'RIGHT_ARM') return [FiringArc.Front, FiringArc.Right];
  return [FiringArc.Front];
}

function catalogText(catalogWeapon: ICatalogWeaponStats): string {
  return [
    catalogWeapon.id,
    catalogWeapon.name,
    catalogWeapon.subType ?? '',
    ...(catalogWeapon.special ?? []),
  ]
    .join(' ')
    .toLowerCase();
}

function buildCatalogFiringModes(
  catalogWeapon: ICatalogWeaponStats,
  damage: number,
): IWeaponFiringModes | undefined {
  const text = catalogText(catalogWeapon);
  if (
    catalogWeapon.subType === 'Autocannon' &&
    /^ac-\d+$/.test(catalogWeapon.id)
  ) {
    return {
      kind: 'rate-of-fire',
      defaultModeId: 'single',
      modes: [
        {
          id: 'single',
          damage,
          heat: catalogWeapon.heat,
          shotsPerTurn: 1,
        },
        {
          id: 'rapid-fire',
          damage: damage * 2,
          heat: catalogWeapon.heat * 2,
          shotsPerTurn: 2,
        },
      ],
    };
  }

  if (text.includes('ultra ac') || /^clan-uac-\d+/.test(catalogWeapon.id)) {
    return {
      kind: 'rate-of-fire',
      defaultModeId: 'single',
      modes: [
        {
          id: 'single',
          damage,
          heat: catalogWeapon.heat,
          shotsPerTurn: 1,
        },
        {
          id: 'double',
          damage: damage * 2,
          heat: catalogWeapon.heat * 2,
          shotsPerTurn: 2,
        },
      ],
    };
  }

  if (text.includes('rotary ac') || /^clan-rac-\d+/.test(catalogWeapon.id)) {
    return {
      kind: 'rate-of-fire',
      defaultModeId: 'rof-1',
      modes: [1, 2, 3, 4, 5, 6].map((shots) => ({
        id: `rof-${shots}`,
        damage: damage * shots,
        heat: catalogWeapon.heat * shots,
        shotsPerTurn: shots,
      })),
    };
  }

  if (text.includes('lb-x ac') || /^clan-lb-\d+-x-ac/.test(catalogWeapon.id)) {
    return {
      kind: 'cluster-slug',
      defaultModeId: 'slug',
      modes: [
        {
          id: 'slug',
          damage,
          heat: catalogWeapon.heat,
          shotsPerTurn: 1,
        },
        {
          id: 'cluster',
          damage,
          heat: catalogWeapon.heat,
          shotsPerTurn: 1,
        },
      ],
    };
  }

  if (catalogWeapon.subType === 'MML' || /\bmml\b/.test(text)) {
    const rackSize = missileCountFromWeaponId(catalogWeapon.id);
    return {
      kind: 'ammo-mode',
      defaultModeId: 'srm',
      modes: [
        {
          id: 'srm',
          damage,
          heat: catalogWeapon.heat,
          shotsPerTurn: 1,
          ammoWeaponType: `srm-${rackSize}`,
        },
        {
          id: 'lrm',
          damage: rackSize,
          heat: catalogWeapon.heat,
          shotsPerTurn: 1,
          ammoWeaponType: `lrm-${rackSize}`,
        },
      ],
    };
  }

  return undefined;
}

function missileCountFromWeaponId(weaponId: string): number {
  const match = weaponId.match(/(\d+)(?!.*\d)/);
  return match ? parseInt(match[1], 10) : 1;
}

export function hydrateAIWeaponsFromFullUnitWithReport(
  fullUnit: IFullUnit,
  weaponLookup: WeaponLookup,
): IHydratedAIWeaponsReport {
  const equipment =
    (fullUnit.equipment as readonly unknown[] | undefined) ?? [];
  const equipmentEntries = equipmentEntriesFromFullUnit(fullUnit);
  const criticalSlots = criticalSlotsFromFullUnit(fullUnit);
  const artemisCompatibleWeaponCountsByLocation =
    artemisCompatibleWeaponCountByLocation(equipment, weaponLookup);
  const out: IWeapon[] = [];
  const resolvedEquipmentIds: string[] = [];
  const unresolvedEquipmentIds: string[] = [];
  let mountIndex = 0;
  for (const raw of equipment) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as IUnitEquipmentEntry;
    if (typeof entry.id !== 'string') continue;
    const stats = catalogWeaponStatsForEquipmentEntry(entry, weaponLookup);
    if (!stats) {
      unresolvedEquipmentIds.push(entry.id);
      continue;
    }
    const location =
      typeof entry.location === 'string'
        ? normalizeEquipmentLocation(entry.location)
        : '';
    const aiWeapon = toAIWeapon(
      stats,
      mountIndex,
      location,
      mountingArcsFromEquipment(entry),
    );
    out.push(
      applyArtemisGuidanceFlags(
        aiWeapon,
        stats,
        locationSlotTexts(criticalSlots, location),
        {
          equipmentEntries,
          weaponEntry: entry,
          location,
          sameLocationArtemisCompatibleWeaponCount:
            artemisCompatibleWeaponCountsByLocation.get(location) ?? 0,
        },
      ),
    );
    resolvedEquipmentIds.push(entry.id);
    mountIndex++;
  }
  return { weapons: out, resolvedEquipmentIds, unresolvedEquipmentIds };
}

export function hydrateAIWeaponsFromFullUnitStrict(
  fullUnit: IFullUnit,
  weaponLookup: WeaponLookup,
): readonly IWeapon[] {
  const report = hydrateAIWeaponsFromFullUnitWithReport(fullUnit, weaponLookup);
  const unitLabel =
    [fullUnit.chassis, fullUnit.model ?? fullUnit.variant]
      .filter((part): part is string => typeof part === 'string')
      .join(' ')
      .trim() || fullUnit.id;

  if (report.unresolvedEquipmentIds.length > 0) {
    throw new Error(
      `Unable to hydrate combat weapons for ${unitLabel}: unresolved equipment ids ${report.unresolvedEquipmentIds.join(
        ', ',
      )}`,
    );
  }
  if (report.weapons.length === 0) {
    throw new Error(
      `Unable to hydrate combat weapons for ${unitLabel}: no combat weapons resolved`,
    );
  }

  return report.weapons;
}

export function hydrateAIWeaponsFromFullUnit(
  fullUnit: IFullUnit,
  weaponLookup: WeaponLookup,
): readonly IWeapon[] {
  return hydrateAIWeaponsFromFullUnitWithReport(fullUnit, weaponLookup).weapons;
}
