import type { IBlkDocument } from '@/types/formats/BlkFormat';

import {
  isClanBlkEngine,
  decodeBlkConstructionEngine,
} from '@/services/conversion/blkEngineIdentity';
import {
  EngineType,
  getEngineDefinition,
} from '@/types/construction/EngineType';
import { ceilToHalfTon as half } from '@/utils/physical/weightUtils';

import {
  calculateEngineWeight,
  isFusionEngine,
  validateEngineRating,
} from '../engineCalculations';
import { isAmmunitionEquipmentId } from '../equipmentBV/catalogLoader';
import {
  getEquipmentEntry,
  getAmmunitionWeightEntry,
} from '../equipmentBVResolver';
import { aerospaceArmor, isPrimitiveAerospaceArmor } from './armor';
import { capitalDriveWeight } from './capitalStructure';
import { aerospaceBays } from './sourceBays';

export type {
  AerospaceArmorWeightInput,
  AerospaceFuelWeightInput,
  AerospaceWeightInput,
  AerospaceWeightResult,
  IAerospaceBreakdown,
  IAerospaceEquipmentWeightTerms,
  IAerospaceWeightCommonInput,
  IAerospaceWeightIssue,
  IAerospaceWeightMount,
} from './sourceWeight.types';

// ============================================================================
// Cockpit Tonnage by Cockpit Type
// ============================================================================

/** Cockpit tonnage by cockpit type name. Standard = 3, Small = 2. */
const COCKPIT_TONS: Record<string, number> = {
  Standard: 3,
  Small: 2,
  Primitive: 5,
  'Command Console': 6,
};

/** Return tonnage for a cockpit type string. Defaults to 3 (standard). */
export function cockpitTons(cockpitType: string): number {
  return COCKPIT_TONS[cockpitType] ?? 3;
}

// ============================================================================
// Heat Sink Tonnage
// ============================================================================

/**
 * Aerospace baseline: 10 heat sinks are engine-integral and cost no tonnage.
 * Additional sinks each weigh 1 ton (SHS) or 1 ton (DHS — same weight, more dissipation).
 */
const ENGINE_FREE_HEAT_SINKS = 10;

/**
 * Return tonnage consumed by heat sinks above the engine-free baseline.
 */
export function heatSinkExtraTons(totalHeatSinks: number): number {
  return Math.max(0, totalHeatSinks - ENGINE_FREE_HEAT_SINKS);
}

export type Source = Pick<
  IBlkDocument,
  'unitType' | 'tonnage' | 'year' | 'type' | 'armor' | 'rawTags'
> &
  Partial<IBlkDocument>;

// Native-only physical facts missing from catalog: matching Java weapon classes,
// AmmoType.java:4301,4355,12457-12500,12631,12823,12879. Not BV overrides.
const WEAPONS: Readonly<Record<string, number>> = {
  'naval autocannon (nac/10)': 2000,
  'naval autocannon (nac/20)': 2500,
  'naval laser 55': 1100,
  'naval ppc (heavy)': 3000,
  'capital missile launcher (barracuda)': 90,
  'tele-operated missile (kraken t)': 220,
  'screen launcher': 40,
  'improved large laser': 4,
  islongtomcannon: 20,
};
const AMMO: Readonly<Record<string, number>> = {
  'ammo barracuda': 30,
  'ammo krakent': 100,
  'ammo screen': 10,
};
// TestSmallCraft:238-307; SmallCraft.primitiveFuelFactor. Year, engine, controls, fuel.
const SMALL_BANDS = [
  [2500, 0.065, 0.0075, 1],
  [2400, 0.078, 0.00825, 1.2],
  [2300, 0.091, 0.00975, 1.4],
  [2251, 0.0975, 0.01125, 1.5],
  [2201, 0.1105, 0.01275, 1.7],
  [2151, 0.1235, 0.01245, 1.9],
  [0, 0.143, 0.01575, 2.2],
];

function smallCraftBand(year: number): readonly number[] {
  return SMALL_BANDS.find(([y]) => year >= y) ?? SMALL_BANDS[6];
}

export type AerospaceEngineTonsInput =
  | {
      readonly family: 'aerospaceFighter';
      readonly tonnage: number;
      readonly safeThrust: number;
      readonly engineType: EngineType | null;
      readonly primitiveCockpit: boolean;
    }
  | {
      readonly family: 'conventionalFighter';
      readonly tonnage: number;
      readonly safeThrust: number;
      readonly engineType: EngineType | null;
    }
  | {
      readonly family: 'smallCraft' | 'dropShip';
      readonly tonnage: number;
      readonly safeThrust: number;
      readonly clan: boolean;
      readonly originalBuildYear: number;
    }
  | { readonly family: 'fixedWingSupport' };

/**
 * Installed engine mass in tons; unsupported inputs have no mass estimate.
 * MegaMek 48fcb2f64: TestAero.java:369-387,510-519;
 * BLKAeroSpaceFighterFile.java:133-145; BLKConvFighterFile.java:118-122;
 * TestSmallCraft.java:198-208,236-253,373-378; Engine.java:67-81,409-438.
 */
export function aerospaceEngineTons(
  input: AerospaceEngineTonsInput,
): number | undefined {
  if (input.family === 'fixedWingSupport') return undefined;
  const { tonnage, safeThrust } = input;
  if (
    !Number.isFinite(tonnage) ||
    tonnage <= 0 ||
    !Number.isInteger(safeThrust) ||
    safeThrust < 0
  )
    return undefined;

  if (input.family === 'smallCraft' || input.family === 'dropShip') {
    if (!Number.isFinite(input.originalBuildYear)) return undefined;
    const band = smallCraftBand(input.originalBuildYear);
    return half(
      tonnage *
        safeThrust *
        (input.clan ? 0.061 : input.family === 'dropShip' ? 0.065 : band[1]),
    );
  }

  if (!('engineType' in input)) return undefined;
  const { engineType } = input;
  if (!engineType || !getEngineDefinition(engineType)) return undefined;
  const rating =
    input.family === 'conventionalFighter'
      ? tonnage * safeThrust
      : Math.ceil(
          (tonnage * (safeThrust - 2) * (input.primitiveCockpit ? 1.2 : 1)) / 5,
        ) * 5;
  if (!validateEngineRating(rating).isValid) return undefined;
  const tons = calculateEngineWeight(rating, engineType);
  // Engine.java:428-430: the generic owner still lacks the fission minimum.
  // Decline that unsupported result until the shared rule is corrected.
  if (engineType === EngineType.FISSION && tons < 5) return undefined;
  return input.family === 'conventionalFighter' &&
    (isFusionEngine(engineType) || engineType === EngineType.FISSION)
    ? half(tons * 1.5)
    : tons;
}

export const sourceClan = (s: Source) => isClanBlkEngine(s.type);
const lines = (v: string | string[] = []) =>
  Array.isArray(v) ? v : v.split(/\r?\n/).filter(Boolean);
const sourceEquipment = (s: Source) =>
  Object.entries(s.rawTags).filter(([k]) => /equipment$/i.test(k));
export const sourcePoints = (s: Source) => s.armor.reduce((a, b) => a + b, 0);
const familyOf = (s: Source) => s.unitType.toLowerCase().replace(/\s/g, '');
export const large = (s: Source) => /^(smallcraft|dropship)$/.test(familyOf(s));
export const advanced = (s: Source) =>
  ['warship', 'jumpship', 'spacestation'].includes(familyOf(s));
const primitive = (s: Source) => isPrimitiveAerospaceArmor(s.armorType ?? 0);
export function sourceArmor(s: Source) {
  return aerospaceArmor({
    armorCode: s.armorType ?? 0,
    clan:
      s.rawTags.armor_tech_level === undefined
        ? sourceClan(s)
        : [2, 4, 6, 8].includes(Number(s.rawTags.armor_tech_level)),
    structuralIntegrity: s.structuralIntegrity ?? 0,
    spheroid: s.motionType?.toLowerCase() === 'spheroid',
    large: large(s),
    advanced: advanced(s),
    tonnage: s.tonnage,
    allocated: sourcePoints(s),
  });
}
/** TestAero/TestSmallCraft/TestAdvancedAerospace: omitted unknown mass stays a bound. */
export function aerospaceSourceWeight(s: Source) {
  const {
    tonnage: tons,
    safeThrust: thrust = 0,
    structuralIntegrity: si = 0,
    fuel: points = 0,
  } = s;
  const spheroid = s.motionType?.toLowerCase() === 'spheroid';
  const clan = sourceClan(s),
    hs = s.heatsinks ?? 0,
    cockpit = s.cockpitType ?? 0,
    military = s.designType === 1,
    tags = s.rawTags;
  const family = familyOf(s),
    bays = aerospaceBays(s.transporters ?? [], clan);
  let payload = 0,
    nc3 = false;
  const arcs = new Map<string, { count: number; weight: number }>();
  for (const [arc, mounts] of sourceEquipment(s))
    for (const raw of lines(mounts)) {
      const cleaned = raw
        .replace(/^(?:(?:\(R\)|\(B\))\s*)+/i, '')
        .replace(/^(?:r-|b-)+/i, '')
        .replace(/:OMNI$/i, '');
      const [name, quantity] = cleaned.split(':'),
        lower = name.toLowerCase(),
        entry = getEquipmentEntry(name);
      let mass = 0,
        weapon = false;
      if (isAmmunitionEquipmentId(name)) {
        const nac = /^ammo nac\/(\d+)$/i.exec(name),
          cruise = /^iscruisemissile(\d+)ammo$/i.exec(name),
          ammo = getAmmunitionWeightEntry(name);
        const perShot = nac
          ? Number(nac[1]) * 0.02
          : cruise
            ? Number(cruise[1]) / 2
            : AMMO[lower];
        const bins =
          quantity === undefined
            ? 1
            : Math.ceil(Number(quantity) / (ammo?.shotsPerTon ?? 1));
        mass =
          perShot === undefined
            ? bins * (ammo?.weight ?? 0)
            : perShot * Number(quantity ?? 1);
        if (advanced(s)) mass = half(mass);
      } else {
        const category = entry?.category ?? '';
        weapon =
          WEAPONS[lower] !== undefined ||
          /^(Energy|Ballistic|Missile|Artillery|Capital)$/.test(category);
        mass = WEAPONS[lower] ?? Math.max(0, entry?.weight ?? 0);
        if (entry?.id === 'case' && clan) mass = 0;
        if (entry?.id === 'nc3') {
          mass = tons * 0.01;
          nc3 = true;
        }
      }
      payload += mass;
      if (weapon) {
        const key = arc + (/^\(R\)|^r-/i.test(raw) ? ':rear' : '');
        const pool = arcs.get(key) ?? { count: 0, weight: 0 };
        pool.count++;
        pool.weight += mass;
        arcs.set(key, pool);
      }
    }
  const armor = sourceArmor(s);
  if (
    !armor ||
    ['convfighter', 'conventionalfighter', 'fixedwingsupport'].includes(family)
  )
    return undefined;
  let engine = 0,
    structure = 0,
    control = 0,
    fuel = 0,
    sinks = 0,
    extras = 0;
  if (large(s)) {
    const drop = family === 'dropship';
    // Primitive/early DropShip drive variants remain outside this mass bound.
    if (drop && (primitive(s) || s.year < 2500)) return undefined;
    const year = s.originalBuildYear ?? s.year;
    const eng = smallCraftBand(year);
    const ctl = smallCraftBand(primitive(s) ? year : 2500);
    engine =
      aerospaceEngineTons({
        family: drop ? 'dropShip' : 'smallCraft',
        tonnage: tons,
        safeThrust: thrust,
        clan,
        originalBuildYear: year,
      }) ?? 0;
    control = drop ? Math.ceil(tons * 0.0075) : half(tons * ctl[2]);
    structure = half((tons * si) / (spheroid ? 500 : 200));
    const factor = primitive(s) ? eng[3] : 1;
    const thresholds = [400, 800, 1200, 1900, 3000, 20000, 40000],
      ppt = drop
        ? [80, 70, 60, 50, 40, 30, 20, 10][
            thresholds.filter((t) => tons >= t).length
          ]
        : 80;
    fuel = half((Math.round((2 * points * factor) / ppt) / 2) * 1.02);
    const sf = primitive(s) ? 1.3 : drop && military ? 6.8 : 1.6;
    const af = primitive(s) ? 75 : drop && military ? 20 : 60;
    const free = Math.floor(spheroid ? Math.sqrt(engine * sf) : engine / af);
    sinks = Math.max(0, hs - free);
  } else if (family === 'warship' && !primitive(s)) {
    engine = Math.round(tons * thrust * 0.06 * 2) / 2;
    structure = half((tons * si) / 1000);
    control = Math.ceil(tons * 0.0025);
    const fuelRate = tons < 110000 ? 10 : tons < 250000 ? 5 : 2.5;
    const fuelTons = Math.round((2 * points) / fuelRate) / 2;
    fuel = fuelTons + Math.ceil(fuelTons * 0.02);
    sinks = Math.max(0, hs - Math.floor(45 + Math.sqrt(engine * 2)));
    extras =
      capitalDriveWeight(tons, Number(tags.kf_core ?? 1)) +
      (Number(tags.sail ?? 1) !== 0 ? Math.ceil(tons / 20000) + 30 : 0) +
      (Number(tags.lfbattery ?? 0) !== 0 ? tons * 0.01 : 0) +
      lines(tags.grav_decks)
        .map(Number)
        .reduce((sum, d) => sum + (d <= 100 ? 50 : d <= 250 ? 100 : 500), 0);
  } else if (!advanced(s)) {
    const type = decodeBlkConstructionEngine(s.engineType ?? 0, clan);
    engine =
      aerospaceEngineTons({
        family: 'aerospaceFighter',
        tonnage: tons,
        safeThrust: thrust,
        engineType: type,
        primitiveCockpit: cockpit === 3,
      }) ?? 0;
    control = cockpitTons(
      ['Standard', 'Small', 'Command Console', 'Primitive'][cockpit],
    );
    fuel = Math.round((2 * points) / 80) / 2;
    sinks = heatSinkExtraTons(hs);
  } else return undefined;
  if (large(s) || advanced(s)) {
    extras += 7 * ((s.lifeBoat ?? 0) + (s.escapePod ?? 0)) + bays.weight;
    const slots = advanced(s) ? 20 : 12;
    for (const { count, weight } of arcs.values())
      extras +=
        half((Math.trunc((count - 1) / slots) * weight) / 10) * (nc3 ? 2 : 1);
  }
  const chassis = engine + structure + control + fuel + sinks;
  const total = chassis + armor.mass + payload + extras;
  return half(Math.round(total * 1000) / 1000);
}
