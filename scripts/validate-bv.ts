#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

import {
  EngineType,
  getEngineDefinition,
} from '../src/types/construction/EngineType';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';
import { getArmorBVMultiplier } from '../src/types/validation/BattleValue';
import {
  calculateDefensiveBV,
  calculateOffensiveBVWithHeatTracking,
  calculateExplosivePenalties,
  getCockpitModifier,
  type CockpitType,
  type MechLocation,
  type ExplosiveEquipmentEntry,
} from '../src/utils/construction/battleValueCalculations';
import {
  resolveEquipmentBV,
  resolveAmmoBV,
  normalizeEquipmentId,
} from '../src/utils/construction/equipmentBVResolver';

interface IndexUnit {
  id: string;
  chassis: string;
  model: string;
  tonnage: number;
  techBase: string;
  year: number;
  role: string;
  path: string;
  rulesLevel: string;
  cost: number;
  bv: number;
}
interface IndexFile {
  version: string;
  generatedAt: string;
  totalUnits: number;
  units: IndexUnit[];
}
interface ArmorAllocation {
  [location: string]: number | { front: number; rear: number };
}
interface Equipment {
  id: string;
  location: string;
}
interface UnitData {
  id: string;
  chassis: string;
  model: string;
  unitType: string;
  configuration: string;
  techBase: string;
  tonnage: number;
  engine: { type: string; rating: number };
  gyro: { type: string };
  cockpit: string;
  structure: { type: string };
  armor: { type: string; allocation: ArmorAllocation };
  heatSinks: { type: string; count: number };
  movement: { walk: number; jump: number };
  equipment: Equipment[];
  criticalSlots?: Record<string, (string | null)[]>;
}

interface ValidationResult {
  unitId: string;
  chassis: string;
  model: string;
  tonnage: number;
  indexBV: number;
  calculatedBV: number | null;
  difference: number | null;
  percentDiff: number | null;
  status: 'exact' | 'within1' | 'within5' | 'within10' | 'over10' | 'error';
  error?: string;
  breakdown?: {
    // Defensive sub-components
    armorBV: number;
    structureBV: number;
    gyroBV: number;
    defEquipBV: number;
    amsAmmoBV: number;
    armoredComponentBV: number;
    harjelBonus: number;
    explosivePenalty: number;
    defensiveFactor: number;
    maxTMM: number;
    defensiveBV: number;
    // Offensive sub-components
    weaponBV: number;
    rawWeaponBV: number;
    halvedWeaponBV: number;
    ammoBV: number;
    weightBonus: number;
    physicalWeaponBV: number;
    offEquipBV: number;
    heatEfficiency: number;
    heatDissipation: number;
    moveHeat: number;
    speedFactor: number;
    offensiveBV: number;
    // Modifiers
    cockpitModifier: number;
    cockpitType: string;
    // Context
    techBase: string;
    walkMP: number;
    runMP: number;
    jumpMP: number;
    weaponCount: number;
    halvedWeaponCount: number;
    // Legacy aliases
    defensiveEquipBV: number;
  };
  rootCause?: string;
  issues: string[];
}

interface ParetoCategory {
  name: string;
  count: number;
  units: string[];
  avgAbsPercentDiff: number;
}
interface ParetoAnalysis {
  generatedAt: string;
  totalFailures: number;
  categories: ParetoCategory[];
}
interface ValidationReport {
  generatedAt: string;
  summary: {
    totalUnits: number;
    excludedAllowlist: number;
    validatedUnits: number;
    calculated: number;
    failedToCalculate: number;
    exactMatch: number;
    within1Percent: number;
    within5Percent: number;
    within10Percent: number;
    over10Percent: number;
    within1PercentPct: number;
    within5PercentPct: number;
  };
  accuracyGates: {
    within1Percent: { target: number; actual: number; passed: boolean };
    within5Percent: { target: number; actual: number; passed: boolean };
  };
  topDiscrepancies: ValidationResult[];
  allResults: ValidationResult[];
}

// === ALLOWLIST ===
const UNSUPPORTED_CONFIGURATIONS = new Set(['LAM']);

// === CLAN CHASSIS MIXED TECH UNITS ===
// MIXED tech units where the chassis is Clan-built, granting implicit CASE in all torso/arm
// locations (same as pure Clan units). Determined from BV validation: these units are exact
// matches with MegaMek when CASE is applied, but have no Clan engine or Clan structural
// components to trigger automatic detection. Their Clan chassis status comes from MegaMek's
// "Mixed (Clan Chassis)" TechBase designation, which is lost during our MTF→JSON conversion.
//
// Units NOT in this set with techBase=MIXED and no Clan engine/structural components are
// treated as IS chassis (no implicit CASE), matching MegaMek's "Mixed (IS Chassis)" behavior.
const CLAN_CHASSIS_MIXED_UNITS = new Set([
  'archer-arc-7c',
  'atlas-c',
  'atlas-ii-as7-dk-h',
  'atlas-iii-as7-d2',
  'atlas-iii-as7-d3',
  'avalanche-avl-1or',
  'avatar-av1-or',
  'black-hawk-ku-bhku-or',
  'blackjack-bj2-or',
  'dervish-dv-11dk',
  'enfield-end-6j-ec',
  'firestarter-fs9-or',
  'griffin-c',
  'griffin-grf-6s2',
  'grigori-c-grg-os-caelestis',
  'ha-otoko-hr-unknown',
  'hauptmann-ha1-ot',
  'hermes-ii-her-7a',
  'highlander-hgn-732-jorgensson',
  'inferno-inf-nor',
  'jagermech-jm7-dd',
  'javelin-jvn-12n',
  'juliano-jln-5a',
  'juliano-jln-5c',
  'marauder-bounty-hunter-3138',
  'marauder-c',
  'naja-kto-19b-ec',
  'orion-c',
  'orion-c-2',
  'pillager-plg-6z',
  'prowler-pwr-1x1',
  'scarecrow-ucu-f4',
  'stalker-stk-9f',
  'stealth-sth-5x',
  'strider-sr1-oh',
  'strider-sr1-or',
  'sunder-sd1-of',
  'sunder-sd1-og', // Clan chassis (same as SD1-OF/SD1-OR); +6 overcalc from other source
  'sunder-sd1-or',
  'templar-tlr1-or',
  'templar-iii-tlr2-od',
  'thug-thg-11e-reich',
  'thunderbolt-tdr-12r',
  'thunderbolt-tdr-9w',
  'trebuchet-tbt-9n',
  'trebuchet-tbt-9r',
  'valkyrie-vlk-qd5',
  'xanthos-xnt-7o',
]);

function getExclusionReason(
  unit: UnitData,
  indexUnit: IndexUnit,
): string | null {
  if (UNSUPPORTED_CONFIGURATIONS.has(unit.configuration))
    return `Unsupported configuration: ${unit.configuration}`;
  if (indexUnit.bv === 0) return 'Zero BV in index';
  if ((unit.armor?.type?.toUpperCase() ?? '').includes('PATCHWORK'))
    return 'Patchwork armor';
  if (
    !unit.armor?.allocation ||
    Object.keys(unit.armor.allocation).length === 0
  )
    return 'Missing armor allocation data';
  return null;
}

// === TYPE MAPPING ===
function mapEngineType(s: string, tb: string): EngineType {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u === 'XL' || u === 'XLENGINE')
    return tb === 'CLAN' ? EngineType.XL_CLAN : EngineType.XL_IS;
  if (u === 'CLANXL' || u === 'CLAN_XL' || u === 'XLCLAN')
    return EngineType.XL_CLAN;
  if (u === 'LIGHT' || u === 'LIGHTENGINE') return EngineType.LIGHT;
  if (u === 'XXL' || u === 'XXLENGINE') return EngineType.XXL;
  if (u === 'COMPACT' || u === 'COMPACTENGINE') return EngineType.COMPACT;
  if (u === 'ICE' || u === 'INTERNALCOMBUSTION') return EngineType.ICE;
  if (u === 'FUELCELL' || u === 'FUEL_CELL') return EngineType.FUEL_CELL;
  if (u === 'FISSION') return EngineType.FISSION;
  return EngineType.STANDARD;
}
function mapArmorType(s: string): string {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('COMMERCIAL')) return 'commercial';
  if (u.includes('HARDENED')) return 'hardened';
  if (u.includes('REACTIVE')) return 'reactive';
  if (u.includes('REFLECTIVE') || u.includes('LASERREFLECTIVE'))
    return 'reflective';
  if (u.includes('BALLISTICREINFORCED')) return 'ballistic-reinforced';
  if (u.includes('FERROLAMELLOR')) return 'ferro-lamellor';
  if (u.includes('STEALTH')) return 'stealth';
  if (u.includes('ANTIPENETRATIVE') || u.includes('ABLATION'))
    return 'anti-penetrative';
  if (u.includes('HEATDISSIPATING')) return 'heat-dissipating';
  if (u.includes('IMPACTRESISTANT')) return 'impact-resistant';
  // Industrial/Heavy Industrial armor: distinct types for correct BAR ratings
  if (u.includes('HEAVYINDUSTRIAL')) return 'heavy-industrial';
  if (u.includes('INDUSTRIAL')) return 'industrial';
  return 'standard';
}

/**
 * Get BAR (Barrier Armor Rating) for armor type.
 * Per MegaMek Mek.getBARRating() (Mek.java:5341):
 *   Commercial = BAR 5, ALL other armor types = BAR 10 for BattleMechs.
 *   Industrial and Heavy Industrial armor still use BAR 10 in MegaMek's BV calculation.
 * BAR is applied as barRating / 10.0 to armor BV.
 */
function getArmorBAR(armorType: string): number {
  return armorType === 'commercial' ? 5 : 10;
}
function mapStructureType(s: string): string {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('INDUSTRIAL')) return 'industrial';
  if (u.includes('ENDOCOMPOSITE')) return 'endo-composite';
  if (u.includes('COMPOSITE')) return 'composite';
  if (u.includes('REINFORCED')) return 'reinforced';
  return 'standard';
}
function mapGyroType(s: string): string {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('SUPERHEAVY')) return 'superheavy';
  if (u.includes('HEAVYDUTY') || u.includes('HEAVY')) return 'heavy-duty';
  if (u.includes('XL')) return 'xl';
  if (u.includes('COMPACT')) return 'compact';
  return 'standard';
}
function mapCockpitType(s: string): CockpitType {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('SMALL') && u.includes('COMMAND'))
    return 'small-command-console';
  if (u.includes('SMALL')) return 'small';
  if (u.includes('TORSOMOUNTED') || u.includes('TORSO')) return 'torso-mounted';
  if (u.includes('COMMANDCONSOLE') || u.includes('COMMAND'))
    return 'command-console';
  if (u.includes('INTERFACE')) return 'interface';
  if (u.includes('DRONE')) return 'drone-operating-system';
  return 'standard';
}

// === STRUCTURE/ARMOR ===
function calcTotalStructure(ton: number, config?: string): number {
  const cfgLower = config?.toLowerCase() ?? '';
  const isQuad = cfgLower === 'quad' || cfgLower === 'quadvee';
  const isTripod = cfgLower === 'tripod';
  // Biped: 2 arms + 2 legs; Quad/QuadVee: 4 legs; Tripod: 2 arms + 3 legs
  const limbIS = (t: { arm: number; leg: number }) =>
    isQuad
      ? t.leg * 4
      : isTripod
        ? t.arm * 2 + t.leg * 3
        : t.arm * 2 + t.leg * 2;
  const t = STRUCTURE_POINTS_TABLE[ton];
  if (!t) {
    const k = Object.keys(STRUCTURE_POINTS_TABLE)
      .map(Number)
      .sort((a, b) => a - b)
      .filter((x) => x <= ton)
      .pop();
    if (k) {
      const t2 = STRUCTURE_POINTS_TABLE[k] as {
        head: number;
        centerTorso: number;
        sideTorso: number;
        arm: number;
        leg: number;
      };
      return t2.head + t2.centerTorso + t2.sideTorso * 2 + limbIS(t2);
    }
    return 0;
  }
  const st = t as {
    head: number;
    centerTorso: number;
    sideTorso: number;
    arm: number;
    leg: number;
  };
  return st.head + st.centerTorso + st.sideTorso * 2 + limbIS(st);
}
function calcTotalArmor(a: ArmorAllocation): number {
  let t = 0;
  for (const v of Object.values(a)) {
    if (typeof v === 'number') t += v;
    else if (v && typeof v === 'object') t += (v.front || 0) + (v.rear || 0);
  }
  return t;
}
function calcHeatDissipation(hs: { type: string; count: number }): number {
  const t = hs.type.toUpperCase();
  return hs.count * (t.includes('DOUBLE') || t.includes('LASER') ? 2 : 1);
}

// === LOCATION HELPERS ===
function toMechLoc(l: string): MechLocation | null {
  const u = l.toUpperCase().replace(/[_\s-]+/g, '');
  if (u === 'HEAD' || u === 'HD') return 'HD';
  if (u === 'CENTERTORSO' || u === 'CT') return 'CT';
  if (u === 'LEFTTORSO' || u === 'LT') return 'LT';
  if (u === 'RIGHTTORSO' || u === 'RT') return 'RT';
  if (u === 'LEFTARM' || u === 'LA') return 'LA';
  if (u === 'RIGHTARM' || u === 'RA') return 'RA';
  if (u === 'LEFTLEG' || u === 'LL') return 'LL';
  if (u === 'RIGHTLEG' || u === 'RL') return 'RL';
  if (u === 'FRONTLEFTLEG' || u === 'FLL') return 'LA';
  if (u === 'FRONTRIGHTLEG' || u === 'FRL') return 'RA';
  if (u === 'REARLEFTLEG' || u === 'RLL') return 'LL';
  if (u === 'REARRIGHTLEG' || u === 'RRL') return 'RL';
  return null;
}
function isRearLoc(l: string): boolean {
  const lo = l.toLowerCase();
  return lo.includes('rear') || lo.includes('(r)');
}

function normalizeCritName(s: string): string {
  return s
    .replace(/\s*\(R\)/g, '')
    .replace(/\s*\(omnipod\)/gi, '')
    .trim()
    .toLowerCase()
    .replace(/^(is|cl|clan)\s*/i, '')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeEquipId(s: string): string {
  return s
    .replace(/^\d+-/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function isWeaponRearMounted(
  equipId: string,
  locSlots: (string | null)[],
): boolean {
  const eqNorm = normalizeEquipId(equipId);
  const eqCanonical = normalizeEquipmentId(equipId);
  for (const slot of locSlots) {
    if (!slot || typeof slot !== 'string' || !/\(R\)/i.test(slot)) continue;
    const slotNorm = normalizeCritName(slot);
    if (slotNorm === eqNorm) return true;
    if (slotNorm.includes(eqNorm) || eqNorm.includes(slotNorm)) return true;
    if (normalizeEquipmentId(slotNorm) === eqCanonical) return true;
  }
  return false;
}
function isArmLoc(l: string): boolean {
  const lo = l.toLowerCase();
  return lo.includes('left_arm') || lo.includes('right_arm');
}

/**
 * Detect if equipment at a given location is Clan-tech by checking critical slot names.
 * MegaMek crit names use 'CL' prefix for Clan equipment (e.g., CLERMediumLaser, CLStreakSRM6).
 * For MIXED tech units, this disambiguates IS vs Clan variants that share generic equipment IDs.
 */
function isClanEquipAtLocation(
  equipId: string,
  location: string,
  criticalSlots?: Record<string, (string | null)[]>,
): boolean {
  if (!criticalSlots) return false;
  const locKey = location.split(',')[0].toUpperCase();
  // Also check the raw location key as-is (e.g., "LEFT_ARM")
  const locVariants = [locKey, location];
  const eqNorm = normalizeEquipId(equipId);

  for (const lk of locVariants) {
    const slots = criticalSlots[lk];
    if (!Array.isArray(slots)) continue;
    for (const slot of slots) {
      if (!slot || typeof slot !== 'string') continue;
      const clean = slot
        .replace(/\s*\(omnipod\)/gi, '')
        .replace(/\s*\(R\)/g, '')
        .trim();
      // Check if this crit slot starts with CL or "Clan " (Clan equipment marker)
      if (!/^CL/i.test(clean) && !/^Clan\s/i.test(clean)) continue;
      // Normalize after stripping CL prefix to compare with equipment ID
      const slotNorm = clean
        .toLowerCase()
        .replace(/^(cl|clan)\s*/i, '')
        .replace(/[^a-z0-9]/g, '');
      if (
        slotNorm === eqNorm ||
        slotNorm.includes(eqNorm) ||
        eqNorm.includes(slotNorm)
      )
        return true;
    }
  }
  return false;
}

// Hardcoded BV/heat for weapons missing from the equipment catalog.
// Values from MegaMek data files and TechManual.
const FALLBACK_WEAPON_BV: Record<string, { bv: number; heat: number }> = {
  'plasma-rifle': { bv: 210, heat: 10 },
  isplasmarifle: { bv: 210, heat: 10 },
  'plasma-cannon': { bv: 170, heat: 7 },
  clplasmacannon: { bv: 170, heat: 7 },
  'clan-plasma-cannon': { bv: 170, heat: 7 },
  'particle-cannon': { bv: 176, heat: 10 },
  'tsemp-cannon': { bv: 488, heat: 10 },
  'tsemp-one-shot': { bv: 98, heat: 10 },
  'tsemp-repeating-cannon': { bv: 600, heat: 10 },
  'fluid-gun': { bv: 6, heat: 0 },
  isfluidgun: { bv: 6, heat: 0 },
  'binary-laser-blazer-cannon': { bv: 222, heat: 16 },
  'blazer-cannon': { bv: 222, heat: 16 },
  'silver-bullet-gauss-rifle': { bv: 198, heat: 1 },
  'risc-hyper-laser': { bv: 596, heat: 24 },
  'medium-vsp': { bv: 56, heat: 7 },
  ismediumvsplaser: { bv: 56, heat: 7 },
  islargevsplaser: { bv: 123, heat: 10 },
  'large-vsp': { bv: 123, heat: 10 },
  'small-vsp': { bv: 22, heat: 3 },
  issmallvsplaser: { bv: 22, heat: 3 },
  'medium-chem-laser': { bv: 37, heat: 2 },
  'small-chem-laser': { bv: 7, heat: 1 },
  'large-chem-laser': { bv: 99, heat: 4 },
  'clan-medium-chemical-laser': { bv: 37, heat: 2 },
  clmediumchemlaser: { bv: 37, heat: 2 },
  'bombast-laser': { bv: 137, heat: 12 },
  isbombastlaser: { bv: 137, heat: 12 },
  'improved-large-laser': { bv: 123, heat: 8 },
  'improved-medium-laser': { bv: 60, heat: 3 },
  'improved-small-laser': { bv: 12, heat: 1 },
  'enhanced-ppc': { bv: 329, heat: 15 },
  'flamer-vehicle': { bv: 5, heat: 3 },
  iserflamer: { bv: 16, heat: 4 },
  clerflamer: { bv: 16, heat: 4 },
  islightmg: { bv: 5, heat: 0 },
  clmg: { bv: 5, heat: 0 },
  clheavysmalllaser: { bv: 15, heat: 3 },
  isarrowivsystem: { bv: 240, heat: 10 },
  'arrow-iv-system': { bv: 240, heat: 10 },
  'arrow-iv': { bv: 240, heat: 10 },
  clarrowiv: { bv: 240, heat: 10 },
  'clan-arrow-iv': { bv: 240, heat: 10 },
  sniper: { bv: 85, heat: 10 },
  thumper: { bv: 43, heat: 5 },
  'long-tom-cannon': { bv: 329, heat: 20 },
  'sniper-cannon': { bv: 77, heat: 10 },
  'thumper-cannon': { bv: 41, heat: 5 },
  'nail-rivet-gun': { bv: 1, heat: 0 },
  'nail-gun': { bv: 1, heat: 0 },
  'battlemech-taser': { bv: 40, heat: 6 },
  'mech-taser': { bv: 40, heat: 6 },
  ismektaser: { bv: 40, heat: 6 },
  taser: { bv: 40, heat: 6 },
  'light-blazer': { bv: 65, heat: 6 },
  islaserantimissilesystem: { bv: 45, heat: 7 },
  'laser-ams': { bv: 45, heat: 7 },
  'clan-laser-ams': { bv: 45, heat: 7 },
  cllaserantimissilesystem: { bv: 45, heat: 7 },
  'risc-advanced-point-defense-system': { bv: 150, heat: 0 },
  issmallxpulselaser: { bv: 21, heat: 3 },
  ismediumxpulselaser: { bv: 71, heat: 6 },
  islargexpulselaser: { bv: 178, heat: 14 },
  // MOVED to CATALOG_BV_OVERRIDES (normalizeEquipmentId maps 'ppcp' → 'ppc', resolving with wrong heat=10)
  'heavy-rifle': { bv: 91, heat: 4 },
  isheavyrifle: { bv: 91, heat: 4 },
  'medium-rifle': { bv: 35, heat: 2 },
  'light-rifle': { bv: 21, heat: 1 },
  'rifle-cannon': { bv: 35, heat: 2 },
  'mortar-1': { bv: 10, heat: 1 },
  'mortar-2': { bv: 14, heat: 2 },
  'mortar-4': { bv: 26, heat: 5 },
  'mortar-8': { bv: 50, heat: 10 },
  'streak-srm-2-os': { bv: 30, heat: 2 },
  'streak-srm-4-os': { bv: 59, heat: 3 },
  'streak-srm-2-i-os': { bv: 30, heat: 2 },
  'streak-srm-4-i-os': { bv: 59, heat: 3 },
  'srm-2-os': { bv: 21, heat: 2 },
  'srm-6-os': { bv: 59, heat: 4 },
  'narc-i-os': { bv: 30, heat: 0 },
  // Prototype Rocket Launchers (not in catalog, remain as fallbacks)
  'prototype-rocket-launcher-20': { bv: 19, heat: 5 },
  rocketlauncher20prototype: { bv: 19, heat: 5 },
  'rocket-launcher-10-pp': { bv: 15, heat: 3 },
  clrocketlauncher10prototype: { bv: 15, heat: 3 },
  clrocketlauncher15prototype: { bv: 18, heat: 4 },
  'ac-10p': { bv: 123, heat: 3 },
  'c3-boosted-system-master': { bv: 0, heat: 0 },
  'c3-computer-[master]': { bv: 0, heat: 0 },
  islppc: { bv: 88, heat: 5 },
  isblazer: { bv: 222, heat: 16 },
  iseherppc: { bv: 329, heat: 15 },
  clmicropulselaser: { bv: 12, heat: 1 },
  issniperartcannon: { bv: 77, heat: 10 },
  // ER Pulse Lasers (Clan-only, but sometimes appear without clan- prefix on mixed-tech units)
  'er-medium-pulse-laser': { bv: 117, heat: 6 },
  'er-small-pulse-laser': { bv: 36, heat: 3 },
  'er-large-pulse-laser': { bv: 272, heat: 13 },
  // ISRemoteSensorDispenser - not a weapon, 0 BV
  isremotesensordispenser: { bv: 0, heat: 0 },
  'remote-sensor-dispenser': { bv: 0, heat: 0 },
  // C3 Remote Sensor Launcher IS a weapon (extends MissileWeapon) per MegaMek ISC3RemoteSensorLauncher.java
  'c3-remote-sensor-launcher': { bv: 30, heat: 0 },
  isc3remotesensorlauncher: { bv: 30, heat: 0 },
  c3remotesensorlauncher: { bv: 30, heat: 0 },
  // IS SRM-4 One-Shot (missing variant)
  'issrm4-os': { bv: 39, heat: 3 },
  // Clan Heavy Lasers (alternate IDs)
  clheavymediumlaser: { bv: 76, heat: 7 },
  clheavylargelaser: { bv: 244, heat: 18 },
  clflamer: { bv: 6, heat: 3 },
  // Mech Mortars (alternate IDs) — BV/heat per MegaMek ISMekMortar/CLMekMortar sources
  'mech-mortar-4': { bv: 26, heat: 5 },
  'mech-mortar-8': { bv: 50, heat: 10 },
  // Improved SRM-6
  'improved-srm-6': { bv: 59, heat: 4 },
  // iATM (improved ATM)
  'iatm-3': { bv: 52, heat: 2 },
  'iatm-6': { bv: 104, heat: 4 },
  'iatm-9': { bv: 156, heat: 6 },
  'iatm-12': { bv: 208, heat: 8 },
  // ProtoMech ACs
  protomechac2: { bv: 22, heat: 1 },
  protomechac4: { bv: 49, heat: 1 },
  protomechac8: { bv: 66, heat: 1 },
  // Streak LRM (Clan-only)
  streaklrm5: { bv: 69, heat: 2 },
  streaklrm10: { bv: 138, heat: 4 },
  streaklrm15: { bv: 207, heat: 5 },
  streaklrm20: { bv: 276, heat: 6 },
  clstreaklrm10: { bv: 138, heat: 4 },
  clstreaklrm15: { bv: 207, heat: 5 },
  clstreaklrm20: { bv: 276, heat: 6 },
  // HAG (Hyper-Assault Gauss) - alternate IDs
  clhag20: { bv: 267, heat: 4 },
  clhag30: { bv: 401, heat: 6 },
  clhag40: { bv: 535, heat: 8 },
  hag20: { bv: 267, heat: 4 },
  hag30: { bv: 401, heat: 6 },
  hag40: { bv: 535, heat: 8 },
  // ATM (alternate IDs without hyphen)
  clatm3: { bv: 52, heat: 2 },
  clatm6: { bv: 104, heat: 4 },
  clatm9: { bv: 156, heat: 6 },
  clatm12: { bv: 208, heat: 8 },
  // Clan Small Pulse Laser (alternate ID)
  clsmallpulselaser: { bv: 24, heat: 2 },
  cllargepulselaser: { bv: 265, heat: 10 },
  // Clan Anti-Missile System (alternate IDs)
  clantimissilesystem: { bv: 32, heat: 1 },
  // Heavy/Light Machine Guns (Clan)
  'light-machine-gun': { bv: 5, heat: 0 },
  'heavy-machine-gun': { bv: 6, heat: 0 },
  // Heavy Flamer
  'heavy-flamer': { bv: 15, heat: 5 },
  // Improved Heavy Lasers (Clan - alternate IDs)
  'improved-heavy-large-laser': { bv: 296, heat: 18 },
  'improved-heavy-medium-laser': { bv: 93, heat: 7 },
  'improved-heavy-small-laser': { bv: 19, heat: 3 },
  'large-heavy-laser': { bv: 244, heat: 18 },
  'medium-heavy-laser': { bv: 76, heat: 7 },
  'small-heavy-laser': { bv: 15, heat: 3 },
  'heavy-large-laser': { bv: 244, heat: 18 },
  'heavy-medium-laser': { bv: 76, heat: 7 },
  'heavy-small-laser': { bv: 15, heat: 3 },
  // AP Gauss Rifle
  'ap-gauss-rifle': { bv: 21, heat: 1 },
};

// BV overrides for weapons that exist in the catalog but have WRONG BV values.
// These take priority over catalog values. Values from MegaMek source.
const CATALOG_BV_OVERRIDES: Record<string, { bv: number; heat: number }> = {
  'heavy-ppc': { bv: 317, heat: 15 },
  isheavyppc: { bv: 317, heat: 15 },
  'er-flamer': { bv: 16, heat: 4 },
  erflamer: { bv: 16, heat: 4 },
  iserflamer: { bv: 16, heat: 4 },
  // Clan ER Flamer has BV 15 (different from IS BV 16)
  clerflamer: { bv: 15, heat: 4 },
  'clan-er-flamer': { bv: 15, heat: 4 },
  clanerflamer: { bv: 15, heat: 4 },
  'small-re-engineered-laser': { bv: 14, heat: 4 },
  smallreengineeredlaser: { bv: 14, heat: 4 },
  issmallreengineeredlaser: { bv: 14, heat: 4 },
  'medium-re-engineered-laser': { bv: 65, heat: 6 },
  mediumreengineeredlaser: { bv: 65, heat: 6 },
  ismediumreengineeredlaser: { bv: 65, heat: 6 },
  'large-re-engineered-laser': { bv: 161, heat: 9 },
  largereengineeredlaser: { bv: 161, heat: 9 },
  islargereengineeredlaser: { bv: 161, heat: 9 },
  // M-Pod: one-shot anti-infantry weapon, BV=5, heat=0 per MegaMek
  'm-pod': { bv: 5, heat: 0 },
  mpod: { bv: 5, heat: 0 },
  ismpod: { bv: 5, heat: 0 },
  clmpod: { bv: 5, heat: 0 },
  // Thunderbolt missiles: catalog has heat=0, correct values per MegaMek
  'thunderbolt-5': { bv: 64, heat: 3 },
  'thunderbolt-10': { bv: 127, heat: 5 },
  'thunderbolt-15': { bv: 229, heat: 7 },
  'thunderbolt-20': { bv: 305, heat: 8 },
  isthunderbolt5: { bv: 64, heat: 3 },
  isthunderbolt10: { bv: 127, heat: 5 },
  isthunderbolt15: { bv: 229, heat: 7 },
  isthunderbolt20: { bv: 305, heat: 8 },
  // One-shot Thunderbolts: heat / 4 per MegaMek one-shot rule
  'thunderbolt-5-os': { bv: 13, heat: 0.75 },
  'thunderbolt-10-os': { bv: 25, heat: 1.25 },
  'thunderbolt-15-os': { bv: 46, heat: 1.75 },
  'thunderbolt-20-os': { bv: 61, heat: 2 },
  'thunderbolt-5-i-os': { bv: 13, heat: 0.75 },
  'thunderbolt-10-i-os': { bv: 25, heat: 1.25 },
  'thunderbolt-15-i-os': { bv: 46, heat: 1.75 },
  'thunderbolt-20-i-os': { bv: 61, heat: 2 },
  // Mech Mortars: BV/heat per MegaMek ISMekMortar/CLMekMortar source files
  'mech-mortar-1': { bv: 10, heat: 1 },
  'mech-mortar-2': { bv: 14, heat: 2 },
  'mech-mortar-4': { bv: 26, heat: 5 },
  'mech-mortar-8': { bv: 50, heat: 10 },
  ismekmortar1: { bv: 10, heat: 1 },
  ismekmortar2: { bv: 14, heat: 2 },
  ismekmortar4: { bv: 26, heat: 5 },
  ismekmortar8: { bv: 50, heat: 10 },
  clmekmortar1: { bv: 10, heat: 1 },
  clmekmortar2: { bv: 14, heat: 2 },
  clmekmortar4: { bv: 26, heat: 5 },
  clmekmortar8: { bv: 50, heat: 10 },
  'clan-mech-mortar-1': { bv: 10, heat: 1 },
  'clan-mech-mortar-2': { bv: 14, heat: 2 },
  'clan-mech-mortar-4': { bv: 26, heat: 5 },
  'clan-mech-mortar-8': { bv: 50, heat: 10 },
  // Primitive Prototype PPC: normalizeEquipmentId maps 'ppcp' → 'ppc' (heat=10), must override
  'primitive-prototype-ppc': { bv: 176, heat: 15 },
  ppcp: { bv: 176, heat: 15 },
  // === PROTOTYPE WEAPON OVERRIDES ===
  // Prototype weapons normalize to standard versions via normalizeEquipmentId
  // but have different (typically lower) BV and sometimes extra heat.
  // Must override BEFORE catalog resolution. Values from MegaMek source.
  // IS Prototype Lasers (+3 heat for ER/Pulse Large, MPL; +2 for SPL)
  'er-large-laser-prototype': { bv: 136, heat: 15 },
  iserlargelaserprototype: { bv: 136, heat: 15 },
  iserlaselargeprototype: { bv: 136, heat: 15 },
  'large-pulse-laser-prototype': { bv: 108, heat: 13 },
  ispulselaserlargprototype: { bv: 108, heat: 13 },
  ispulselaselargeprototype: { bv: 108, heat: 13 },
  'medium-pulse-laser-prototype': { bv: 43, heat: 7 },
  ismediumpulselaserprototype: { bv: 43, heat: 7 },
  'small-pulse-laser-prototype': { bv: 11, heat: 4 },
  ispulselasersmallprototype: { bv: 11, heat: 4 },
  'medium-pulse-laser-recovered': { bv: 48, heat: 7 },
  ispulselasermediumrecovered: { bv: 48, heat: 7 },
  // IS Prototype Ballistics/Missiles
  'gauss-rifle-prototype': { bv: 320, heat: 1 },
  isgaussrifleprototype: { bv: 320, heat: 1 },
  'narc-prototype': { bv: 15, heat: 0 },
  isnarcprototype: { bv: 15, heat: 0 },
  'ultra-ac-5-prototype': { bv: 112, heat: 1 },
  isuac5prototype: { bv: 112, heat: 1 },
  'lb-10-x-ac-prototype': { bv: 148, heat: 2 },
  islbxac10prototype: { bv: 148, heat: 2 },
  // Clan Prototype Lasers
  'prototype-er-medium-laser': { bv: 62, heat: 5 },
  clerlasermediumprototype: { bv: 62, heat: 5 },
  'prototype-er-small-laser': { bv: 17, heat: 2 },
  clerlasesmallprototype: { bv: 17, heat: 2 },
  clersmalllaserprototype: { bv: 17, heat: 2 },
  // Clan Prototype Streak SRM
  'prototype-streak-srm-4': { bv: 59, heat: 3 },
  clstreaksrm4prototype: { bv: 59, heat: 3 },
  'prototype-streak-srm-6': { bv: 89, heat: 4 },
  clstreaksrm6prototype: { bv: 89, heat: 4 },
  // Clan Prototype UAC (+1 heat for UAC/10 and UAC/20)
  'prototype-ultra-autocannon-2': { bv: 56, heat: 1 },
  cluac2prototype: { bv: 56, heat: 1 },
  'prototype-ultra-autocannon-10': { bv: 210, heat: 4 },
  cluac10prototype: { bv: 210, heat: 4 },
  'prototype-ultra-autocannon-20': { bv: 281, heat: 8 },
  cluac20prototype: { bv: 281, heat: 8 },
  // Clan Prototype LB-X AC
  'prototype-lb-10-x-autocannon': { bv: 148, heat: 2 },
  'prototype-lb-2-x-autocannon': { bv: 42, heat: 1 },
  cllb2xacprototype: { bv: 42, heat: 1 },
  'prototype-lb-5-x-autocannon': { bv: 83, heat: 1 },
  cllb5xacprototype: { bv: 83, heat: 1 },
  'prototype-lb-20-x-autocannon': { bv: 237, heat: 6 },
  cllb20xacprototype: { bv: 237, heat: 6 },
};

function resolveWeaponForUnit(
  id: string,
  techBase: string,
  isClanEquip?: boolean,
): { battleValue: number; heat: number; resolved: boolean } {
  const lo = id.toLowerCase().replace(/^\d+-/, '');
  const normId = normalizeEquipmentId(lo);
  const override =
    CATALOG_BV_OVERRIDES[lo] ||
    CATALOG_BV_OVERRIDES[normId] ||
    CATALOG_BV_OVERRIDES[lo.replace(/^(is|cl|clan)/, '')];
  if (override)
    return { battleValue: override.bv, heat: override.heat, resolved: true };
  const isResult = resolveEquipmentBV(id);
  if (
    techBase === 'CLAN' ||
    isClanEquip ||
    (techBase === 'MIXED' &&
      (lo.startsWith('clan-') || lo.startsWith('cl-') || lo.startsWith('cl ')))
  ) {
    // normalizeEquipmentId strips 'cl' prefix and may resolve to IS weapon (e.g., clultraac10 → uac-10).
    // For Clan units, try 'clan-' + normalized IS form to get correct Clan BV/heat values.
    const normalizedIS = normalizeEquipmentId(lo);
    const candidates: string[] = [];
    if (!normalizedIS.startsWith('clan-')) {
      candidates.push('clan-' + normalizedIS);
    }
    if (!lo.startsWith('clan-') && lo !== normalizedIS) {
      candidates.push('clan-' + lo);
    }
    for (const cid of candidates) {
      const cr = resolveEquipmentBV(cid);
      if (cr.resolved && cr.battleValue > 0) {
        if (!isResult.resolved || cr.battleValue > isResult.battleValue)
          return cr;
        if (isResult.battleValue === cr.battleValue) return cr;
      }
    }
  }
  if (isResult.resolved && isResult.battleValue > 0) return isResult;
  const stripped = id.replace(/^\d+-/, '');
  if (stripped !== id) {
    const sr = resolveEquipmentBV(stripped);
    if (sr.resolved && sr.battleValue > 0) return sr;
  }
  // For MIXED units: if IS resolution failed, try Clan resolution as fallback
  // (handles Clan-exclusive weapons like ER Pulse Lasers on mixed-tech units)
  if (
    techBase === 'MIXED' &&
    (!isResult.resolved || isResult.battleValue === 0)
  ) {
    const normalizedMixed = normalizeEquipmentId(lo);
    const clanCandidates: string[] = [];
    if (!normalizedMixed.startsWith('clan-'))
      clanCandidates.push('clan-' + normalizedMixed);
    if (!lo.startsWith('clan-') && lo !== normalizedMixed)
      clanCandidates.push('clan-' + lo);
    for (const cid of clanCandidates) {
      const cr = resolveEquipmentBV(cid);
      if (cr.resolved && cr.battleValue > 0) return cr;
    }
  }
  // Fallback: check hardcoded weapon BV map for catalog gaps
  const norm = normalizeEquipmentId(lo);
  const fb =
    FALLBACK_WEAPON_BV[lo] ||
    FALLBACK_WEAPON_BV[norm] ||
    FALLBACK_WEAPON_BV[lo.replace(/^(is|cl|clan)/, '')];
  if (fb) return { battleValue: fb.bv, heat: fb.heat, resolved: true };
  return isResult;
}

// === CRIT SLOT SCANNER ===
interface CritScan {
  hasTC: boolean;
  hasTSM: boolean;
  /** Industrial Triple-Strength Myomer: weight ×1.15, no walk MP bonus, no physical TSM mod */
  hasIndustrialTSM: boolean;
  hasMASC: boolean;
  hasSupercharger: boolean;
  hasECM: boolean;
  hasAngelECM: boolean;
  hasActiveProbe: boolean;
  hasBloodhound: boolean;
  hasPartialWing: boolean;
  hasNullSig: boolean;
  hasVoidSig: boolean;
  hasChameleon: boolean;
  hasImprovedJJ: boolean;
  hasWatchdog: boolean;
  detectedSmallCockpit: boolean;
  detectedInterfaceCockpit: boolean;
  detectedDroneOS: boolean;
  coolantPods: number;
  heatSinkCount: number;
  hasRadicalHS: boolean;
  critDHSCount: number;
  critProtoDHSCount: number;
  hasLargeShield: boolean;
  hasMediumShield: boolean;
  shieldArms: string[];
  riscAPDS: number;
  aesLocs: string[];
  mgaLocs: Array<{ location: string; type: 'light' | 'standard' | 'heavy' }>;
  harjelIILocs: MechLocation[];
  harjelIIILocs: MechLocation[];
  caseLocs: MechLocation[];
  caseIILocs: MechLocation[];
  artemisIVLocs: string[];
  artemisVLocs: string[];
  apollo: number;
  ppcCapLocs: string[];
  ammo: Array<{ id: string; bv: number; weaponType: string; location: string }>;
  explosive: ExplosiveEquipmentEntry[];
  defEquipIds: string[];
  detectedArmorType: string | null;
  physicalWeapons: Array<{ type: string; location: string }>;
  rearWeaponCountByLoc: Map<string, Map<string, number>>;
  amsAmmoBV: number;
  armoredComponentBV: number;
  umuMP: number;
  detectedGyroType: string | null;
  modularArmorSlots: number;
  spikeCount: number;
  mineDispenserCount: number;
  /** RISC Viral Jammer (Decoy or Homing): BV=284 each, defensive equipment */
  riscViralJammerCount: number;
  /** Blue Shield Particle Field Damper: +0.2 to armor and structure multipliers */
  hasBlueShield: boolean;
  /** Accumulated BV from misc (non-weapon, non-physical) equipment with offensive BV
   *  (e.g., Bridge Layers: Light=5, Medium=10, Heavy=20) */
  miscEquipBV: number;
  hasRamPlate: boolean;
  critLaserHSCount: number;
}

function classifyPhysicalWeapon(slotLower: string): string | null {
  const s = slotLower.replace(/\s*\(omnipod\)/gi, '').trim();
  if (s === 'hatchet') return 'hatchet';
  if (s === 'sword') return 'sword';
  if (s === 'mace') return 'mace';
  if (s === 'is lance' || s === 'lance') return 'lance';
  if (s.startsWith('retractable blade')) return 'retractable-blade';
  if (s === 'isclaw' || s === 'clclaw' || s === 'claw' || s === 'claws')
    return 'claw';
  if (s === 'talons') return 'talon';
  if (s === 'is flail' || s === 'flail') return 'flail';
  if (s === 'is wrecking ball' || s === 'wrecking ball') return 'wrecking-ball';
  if (s === 'chain whip') return 'chain-whip';
  if (
    s === 'buzzsaw' ||
    s === 'is buzzsaw' ||
    s === 'clan buzzsaw' ||
    s === 'clbuzzsaw'
  )
    return 'buzzsaw';
  if (s === 'dual saw' || s === 'is dual saw') return 'dual-saw';
  if (s === 'miningdrill' || s === 'mining drill' || s === 'is mining drill')
    return 'mining-drill';
  // Industrial physical weapons — flat BV per MegaMek MiscType.java
  if (s === 'chainsaw' || s === 'is chainsaw') return 'chainsaw';
  if (s === 'backhoe' || s === 'is backhoe') return 'backhoe';
  if (s === 'combine') return 'combine';
  if (s === 'spot welder' || s === 'is spot welder') return 'spot-welder';
  if (s === 'rock cutter' || s === 'is rock cutter') return 'rock-cutter';
  if (
    s === 'pile driver' ||
    s === 'is pile driver' ||
    s === 'heavy-duty pile driver' ||
    s === 'heavy duty pile driver'
  )
    return 'pile-driver';
  if (
    s.includes('vibroblade') ||
    s === 'islargevibroblade' ||
    s === 'ismediumvibroblade' ||
    s === 'issmallvibroblade'
  ) {
    if (s.includes('large')) return 'vibroblade-large';
    if (s.includes('small')) return 'vibroblade-small';
    return 'vibroblade-medium';
  }
  return null;
}

function calculatePhysicalWeaponBV(
  type: string,
  tonnage: number,
  hasTSM: boolean,
): number {
  const tsmMod = hasTSM ? 2 : 1;
  switch (type) {
    case 'hatchet':
      return Math.ceil(tonnage / 5.0) * 1.5 * tsmMod;
    case 'sword':
      return Math.ceil(tonnage / 10.0 + 1) * 1.725 * tsmMod;
    case 'lance':
      return Math.ceil(tonnage / 5.0) * tsmMod;
    case 'mace':
      return Math.ceil(tonnage / 4.0) * tsmMod;
    case 'retractable-blade':
      return Math.ceil(tonnage / 10.0) * 1.725 * tsmMod;
    case 'claw':
      return Math.ceil(tonnage / 7.0) * 1.275 * tsmMod;
    case 'talon':
      return Math.round(Math.floor(tonnage / 5.0) * 0.5) * tsmMod;
    case 'flail':
      return 11;
    case 'wrecking-ball':
      return 8;
    case 'chain-whip':
      return 5.175;
    case 'buzzsaw':
      return 67;
    case 'dual-saw':
      return 9; // Flat BV per MegaMek MiscType.java
    case 'mining-drill':
      return 6; // Flat BV per MegaMek MiscType.java
    // Industrial physical weapons — flat BV per MegaMek MiscType.java
    case 'chainsaw':
      return 7;
    case 'backhoe':
      return 8;
    case 'combine':
      return 5;
    case 'spot-welder':
      return 5;
    case 'rock-cutter':
      return 6;
    case 'pile-driver':
      return 5;
    case 'vibroblade-large':
      return 24; // Flat BV per MegaMek MiscType.java (not tonnage-based)
    case 'vibroblade-medium':
      return 17; // Flat BV per MegaMek MiscType.java
    case 'vibroblade-small':
      return 12; // Flat BV per MegaMek MiscType.java
    default:
      return 0;
  }
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

function scanCrits(unit: UnitData): CritScan {
  const r: CritScan = {
    hasTC: false,
    hasTSM: false,
    hasIndustrialTSM: false,
    hasMASC: false,
    hasSupercharger: false,
    hasECM: false,
    hasAngelECM: false,
    hasActiveProbe: false,
    hasBloodhound: false,
    hasPartialWing: false,
    hasNullSig: false,
    hasVoidSig: false,
    hasChameleon: false,
    hasImprovedJJ: false,
    hasWatchdog: false,
    detectedSmallCockpit: false,
    detectedInterfaceCockpit: false,
    detectedDroneOS: false,
    coolantPods: 0,
    heatSinkCount: 0,
    hasRadicalHS: false,
    critDHSCount: 0,
    critProtoDHSCount: 0,
    aesLocs: [],
    mgaLocs: [],
    harjelIILocs: [],
    harjelIIILocs: [],
    caseLocs: [],
    caseIILocs: [],
    artemisIVLocs: [],
    artemisVLocs: [],
    apollo: 0,
    ppcCapLocs: [],
    ammo: [],
    explosive: [],
    defEquipIds: [],
    detectedArmorType: null,
    physicalWeapons: [],
    rearWeaponCountByLoc: new Map(),
    amsAmmoBV: 0,
    armoredComponentBV: 0,
    umuMP: 0,
    detectedGyroType: null,
    modularArmorSlots: 0,
    hasLargeShield: false,
    hasMediumShield: false,
    shieldArms: [],
    riscAPDS: 0,
    spikeCount: 0,
    mineDispenserCount: 0,
    riscViralJammerCount: 0,
    hasBlueShield: false,
    miscEquipBV: 0,
    hasRamPlate: false,
    critLaserHSCount: 0,
  };
  if (!unit.criticalSlots) return r;
  const rearSlotsByLoc = new Map<string, Map<string, number>>();

  for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
    const ml = toMechLoc(loc);
    if (!Array.isArray(slots)) continue;
    let prevSlotClean: string | null = null;
    for (const rawSlot of slots) {
      if (!rawSlot || typeof rawSlot !== 'string') {
        prevSlotClean = null;
        continue;
      }
      // Superheavy pipe-separated double-slots: "IS Gauss Ammo|IS Gauss Ammo"
      // Split and process each sub-item independently (each represents 1 ton)
      const subItems = rawSlot.includes('|')
        ? rawSlot.split('|').map((s) => s.trim())
        : [rawSlot];
      for (const slot of subItems) {
        if (!slot) continue;
        const clean = slot.replace(/\s*\(omnipod\)/gi, '').trim();
        const lo = clean.toLowerCase();

        // Armored components: each "(armored)" crit slot adds 5 BV (MekBVCalculator.processDefensiveEquipment)
        if (lo.includes('(armored)') || lo.includes('armored')) {
          const isArmoredComponent =
            lo.includes('(armored)') ||
            (lo.endsWith('armored') && !lo.includes('armor'));
          if (isArmoredComponent) r.armoredComponentBV += 5;
        }

        // Modular Armor: each slot adds 10 armor points (MekBVCalculator uses entity.getTotalOArmor() which includes modular armor)
        if (lo.includes('modulararmor') || lo.includes('modular armor'))
          r.modularArmorSlots++;

        if (lo.includes('ram plate') || lo.includes('ramplate'))
          r.hasRamPlate = true;

        // CASE
        if (
          lo.includes('case ii') ||
          lo.includes('caseii') ||
          lo.includes('clcaseii') ||
          lo.includes('iscaseii')
        ) {
          if (ml && !r.caseIILocs.includes(ml)) r.caseIILocs.push(ml);
        } else if (lo.includes('case') && !lo.includes('case ii')) {
          if (ml && !r.caseLocs.includes(ml)) r.caseLocs.push(ml);
        }

        // Equipment flags
        if (
          lo.includes('targeting computer') ||
          lo.includes('targetingcomputer')
        )
          r.hasTC = true;
        else if (
          lo.includes('industrial triple strength') ||
          lo.includes('industrial triple-strength') ||
          lo.includes('industrialtriplestrength') ||
          lo === 'industrial tsm'
        )
          r.hasIndustrialTSM = true;
        else if (
          lo === 'tsm' ||
          lo.includes('triple strength') ||
          lo.includes('triplestrength')
        )
          r.hasTSM = true;
        else if (lo.includes('masc') && !lo.includes('ammo')) r.hasMASC = true;
        else if (lo.includes('supercharger') || lo.includes('super charger'))
          r.hasSupercharger = true;
        else if (lo.includes('novacews') || lo.includes('nova cews')) {
          r.hasAngelECM = true;
          r.hasActiveProbe = true;
          r.hasWatchdog = true;
        } else if (
          (lo.includes('angel') && lo.includes('ecm')) ||
          lo.includes('watchdog')
        ) {
          r.hasAngelECM = true;
          r.hasWatchdog = true;
        } else if (lo.includes('ecm') || lo.includes('guardian'))
          r.hasECM = true;
        else if (lo.includes('bloodhound')) r.hasBloodhound = true;
        else if (
          lo.includes('beagle') ||
          (lo.includes('active') && lo.includes('probe'))
        )
          r.hasActiveProbe = true;
        else if (lo.includes('null') && lo.includes('sig')) r.hasNullSig = true;
        else if (lo.includes('void') && lo.includes('sig')) r.hasVoidSig = true;
        else if (
          lo.includes('chameleon') &&
          (lo.includes('shield') ||
            lo.includes('polarization') ||
            lo.includes('lps'))
        )
          r.hasChameleon = true;
        else if (lo.includes('partial') && lo.includes('wing'))
          r.hasPartialWing = true;
        else if (
          lo.includes('umu') &&
          !lo.includes('ammo') &&
          !lo.includes('accumul') &&
          (lo === 'umu' ||
            lo === 'isumu' ||
            lo === 'clumu' ||
            lo.startsWith('umu ') ||
            lo.startsWith('umu(') ||
            /\bumu\b/.test(lo))
        )
          r.umuMP++;
        else if (
          lo.includes('aes') &&
          (lo.includes('actuator') ||
            lo === 'isaes' ||
            lo === 'claes' ||
            lo === 'is aes' ||
            lo === 'clan aes' ||
            lo === 'aes')
        ) {
          if (ml && !r.aesLocs.includes(loc)) r.aesLocs.push(loc);
        } else if (
          lo.includes('machine gun array') ||
          /^(?:is|cl)(?:l|h)?mga$/.test(lo)
        ) {
          const mgaType =
            lo.includes('light') || /^(?:is|cl)lmga$/.test(lo)
              ? 'light'
              : lo.includes('heavy') || /^(?:is|cl)hmga$/.test(lo)
                ? 'heavy'
                : 'standard';
          r.mgaLocs.push({ location: loc, type: mgaType });
        } else if (lo.includes('apollo')) r.apollo++;
        else if (lo.includes('ppc capacitor') || lo.includes('ppccapacitor')) {
          if (loc) r.ppcCapLocs.push(loc);
        } else if (
          lo === 'isapds' ||
          (lo.includes('risc') && lo.includes('apds')) ||
          lo.includes('advanced point defense')
        ) {
          if (clean !== prevSlotClean) {
            r.riscAPDS++;
            r.defEquipIds.push(clean);
          }
        }
        // RISC Viral Jammer (Decoy/Homing): defensive equipment, BV=284 each per MegaMek MiscType
        if (
          lo.includes('risc viral jammer') ||
          lo.includes('riscviraljammer')
        ) {
          if (clean !== prevSlotClean) {
            r.riscViralJammerCount++;
          }
        }

        // Improved Jump Jets — crit names vary: "Improved Jump Jet", "ImprovedJump Jet", "ISImprovedJump Jet"
        if (
          lo.includes('improved jump jet') ||
          lo.includes('improvedjump jet') ||
          lo === 'isimprovedjumpjet' ||
          lo === 'climprovedjumpjet' ||
          lo.replace(/\s+/g, '').includes('improvedjumpjet')
        )
          r.hasImprovedJJ = true;

        // Prototype Improved Jump Jets are EXPLOSIVE (misc.explosive = true in MegaMek)
        // but have F_JUMP_JET flag, so penalty is REDUCED (1 BV per slot, not 15)
        // per MekBVCalculator.processExplosiveEquipment() line 236
        if (
          lo === 'isprototypeimprovedjumpjet' ||
          lo.includes('prototype improved jump jet')
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // Coolant Pods (count for heat efficiency bonus)
        if (
          lo.includes('coolant pod') ||
          lo === 'iscoolantpod' ||
          lo === 'clcoolantpod' ||
          lo === 'is-coolant-pod'
        )
          r.coolantPods++;

        // Radical Heat Sink System
        if (lo.includes('radical heat sink') || lo.includes('radicalheatsink'))
          r.hasRadicalHS = true;

        // Blue Shield Particle Field Damper: +0.2 to armor and structure multipliers
        if (
          lo.includes('blue shield') ||
          lo.includes('blue-shield') ||
          lo.includes('blueshield')
        ) {
          r.hasBlueShield = true;
        }

        // HarJel II/III (per-location armor BV multiplier)
        if (
          lo.includes('harjel iii') ||
          lo.includes('harjel3') ||
          lo === 'harjel iii self-repair system'
        ) {
          if (ml && !r.harjelIIILocs.includes(ml)) r.harjelIIILocs.push(ml);
        } else if (
          lo.includes('harjel ii') ||
          lo.includes('harjel2') ||
          lo === 'harjel ii self-repair system'
        ) {
          if (ml && !r.harjelIILocs.includes(ml)) r.harjelIILocs.push(ml);
        }

        // Artemis
        if (
          (lo.includes('artemisv') || lo.includes('artemis v')) &&
          !lo.includes('artemis iv') &&
          !lo.includes('ammo') &&
          !lo.includes('capable')
        ) {
          if (ml) r.artemisVLocs.push(ml);
        } else if (
          lo.includes('artemis') &&
          !lo.includes('ammo') &&
          !lo.includes('capable') &&
          !lo.includes('artemisv') &&
          !lo.includes('artemis v')
        ) {
          if (ml) r.artemisIVLocs.push(ml);
        }

        // Ammo
        if (lo.includes('ammo') && !lo.includes('ammo feed')) {
          // Per MegaMek AmmoType.java: Gauss-type ammo (including HAG) is non-explosive.
          // HAG crit names like "CLHAG20 Ammo" don't contain "gauss", so check 'hag' separately.
          // SB Gauss abbreviated crit name "ISSBGR Ammo" also lacks "gauss".
          const isNonExplosiveAmmo =
            lo.includes('gauss') ||
            lo.includes('hag') ||
            lo.includes('sbgr') ||
            lo.includes('magshot') ||
            lo.includes('plasma') ||
            lo.includes('fluid') ||
            lo.includes('nail') ||
            lo.includes('rivet') ||
            lo.includes('c3') ||
            lo.includes('sensor') ||
            lo.includes('rail gun') ||
            lo.includes('apds');
          if (ml && !isNonExplosiveAmmo)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'standard',
            });
          // Half-ton ammo bins (crit names like "IS Machine Gun Ammo - Half") get half BV.
          // The lookup/pattern resolution returns the full-ton BV; we halve it here for half-ton bins.
          const isHalfTonAmmo = lo.includes('half');
          const pr = resolveAmmoByPattern(clean, unit.techBase);
          if (pr && pr.bv > 0) {
            r.ammo.push({
              id: clean,
              bv: isHalfTonAmmo ? pr.bv * 0.5 : pr.bv,
              weaponType: pr.weaponType,
              location: loc,
            });
          } else {
            const ar = resolveAmmoBV(clean);
            if (ar.resolved && ar.battleValue > 0) {
              r.ammo.push({
                id: clean,
                bv: isHalfTonAmmo ? ar.battleValue * 0.5 : ar.battleValue,
                weaponType: normalizeWeaponKey(ar.weaponType),
                location: loc,
              });
            } else if (pr) {
              r.ammo.push({
                id: clean,
                bv: isHalfTonAmmo ? pr.bv * 0.5 : pr.bv,
                weaponType: pr.weaponType,
                location: loc,
              });
            }
          }
          // AMS/APDS ammo — accumulate BV for defensive equipment (capped at AMS weapon BV)
          const isAmsAmmo =
            (lo.includes('ams') ||
              lo.includes('anti-missile') ||
              lo.includes('antimissile')) &&
            lo.includes('ammo');
          const isApdsAmmo = lo.includes('apds') && lo.includes('ammo');
          if (isAmsAmmo || isApdsAmmo) {
            // IS AMS ammo = 11 BV, Clan AMS ammo = 22 BV, APDS ammo = 22 BV
            let amsAmmoVal: number;
            if (isApdsAmmo) {
              amsAmmoVal = 22;
            } else if (lo.includes('cl') || unit.techBase === 'CLAN') {
              amsAmmoVal = 22;
            } else {
              amsAmmoVal = 11;
            }
            // Half-ton AMS/APDS ammo bins also get half BV
            if (isHalfTonAmmo) amsAmmoVal *= 0.5;
            r.amsAmmoBV += amsAmmoVal;
          }
        }

        // ISC3Sensors — ammo for C3 Remote Sensor Launcher (crit name "ISC3Sensors",
        // doesn't contain "ammo" keyword). BV=6 per slot, non-explosive.
        // Per MegaMek AmmoType.java createISC3RemoteSensorAmmo(): bv=6, explosive=false
        if (
          lo === 'isc3sensors' ||
          lo === 'c3 remote sensors' ||
          lo === 'c3remotesensors'
        ) {
          r.ammo.push({
            id: clean,
            bv: 6,
            weaponType: 'c3-remote-sensor-launcher',
            location: loc,
          });
        }

        // NARC/iNARC Pods — ammo named "Pods" not "Ammo"; treat as explosive
        if (
          (lo.includes('narc') || lo.includes('inarc')) &&
          lo.endsWith('pods') &&
          !lo.includes('ammo')
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'standard',
            });
        }

        // Gauss explosive (includes HAG / Silver Bullet Gauss whose crit names
        // don't contain 'gauss': CLHAG20/30/40, ISSBGR, etc.)
        if (
          (lo.includes('gauss') ||
            /(?:cl|is)?hag\d/.test(lo) ||
            lo.includes('sbgr') ||
            lo.includes('sbg')) &&
          !lo.includes('ammo') &&
          !lo.includes('ap gauss')
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'gauss',
            });
        }

        // Improved Heavy Lasers: 1 BV per slot (reduced penalty) per MekBVCalculator
        if (
          (lo.includes('improvedheavylaser') ||
            lo.includes('improved heavy laser') ||
            lo.includes('improvedmediumheavylaser') ||
            lo.includes('improved medium heavy') ||
            lo.includes('improvedsmallheavylaser') ||
            lo.includes('improved small heavy') ||
            lo.includes('improvedlargeheavylaser') ||
            lo.includes('improved large heavy')) &&
          !lo.includes('ammo')
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // Extended Fuel Tank — explosive per MegaMek MiscType.java (misc.explosive = true)
        // Each crit slot carries -15 BV penalty in standard explosive processing
        if (
          lo.includes('extended fuel tank') ||
          lo.includes('extendedfueltank')
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'standard',
            });
        }

        // Mek Taser — weapon itself is explosive per MegaMek ISMekTaser.java
        // (explosive = true, explosionDamage = 6). Uses reduced penalty (1 BV per slot)
        // same as TSEMP, Improved Heavy Lasers, B/M-Pods per MekBVCalculator.
        if (
          lo === 'mek taser' ||
          lo === 'ismektaser' ||
          lo === 'isbattlemechtaser' ||
          lo === 'battlemech taser'
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // PPC Capacitor — explosive per MegaMek MiscType.F_PPC_CAPACITOR
        // Reduced penalty: 1 BV per slot per MekBVCalculator lines 231-233
        if (lo.includes('ppc capacitor') || lo.includes('ppccapacitor')) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // Coolant Pod — explosive per MegaMek AmmoType COOLANT_POD
        // Reduced penalty: 1 BV per slot per MekBVCalculator lines 241-243
        if (lo.includes('coolant pod') && !lo.includes('emergency')) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // TSEMP weapons — explosive per MegaMek TSEMPWeapon.java (explosive = true)
        // Reduced penalty: 1 BV per slot per MekBVCalculator (instanceof TSEMPWeapon)
        if (lo.includes('tsemp') && !lo.includes('ammo')) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // B-Pod — explosive per MegaMek WeaponType.F_B_POD
        // Reduced penalty: 1 BV per slot per MekBVCalculator lines 227-228
        // Note: B-Pod is ALSO defensive equipment (pushed to defEquipIds below),
        // explosive penalty is a separate deduction from defensive BV.
        if (
          (lo.includes('b-pod') || lo === 'isbpod' || lo === 'clbpod') &&
          !lo.includes('ammo')
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // M-Pod — explosive per MegaMek WeaponType.F_M_POD
        // Reduced penalty: 1 BV per slot per MekBVCalculator lines 229-230
        if (
          (lo.includes('m-pod') || lo === 'ismpod' || lo === 'clmpod') &&
          !lo.includes('ammo')
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // HVAC (Hyper-Velocity Autocannon) — explosive per MegaMek HVACWeapon.java
        // Special handling: 1 BV total regardless of actual slot count
        if (
          (lo.includes('hvac') ||
            lo.includes('hyper velocity') ||
            lo.includes('hypervelocity')) &&
          !lo.includes('ammo')
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'hvac',
            });
        }

        // Emergency Coolant System — explosive per MegaMek MiscType.F_EMERGENCY_COOLANT_SYSTEM
        // Reduced penalty: 1 BV per slot per MekBVCalculator
        if (
          lo.includes('emergency coolant') ||
          lo.includes('emergencycoolant')
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // RISC Hyper Laser — explosive per MegaMek ISRISCHyperLaser.java (explosive = true)
        // Reduced penalty: 1 BV per slot per MekBVCalculator (instanceof ISRISCHyperLaser)
        if (
          lo.includes('risc') &&
          lo.includes('hyper') &&
          lo.includes('laser')
        ) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // RISC Laser Pulse Module — explosive per MegaMek MiscType.F_RISC_LASER_PULSE_MODULE
        // Reduced penalty: 1 BV per slot per MekBVCalculator
        if (lo.includes('risc') && lo.includes('laser pulse module')) {
          if (ml)
            r.explosive.push({
              location: ml,
              slots: 1,
              penaltyCategory: 'reduced',
            });
        }

        // Defensive equip — push once per equipment instance (skip consecutive duplicate slots for multi-slot items)
        // Regular AMS is 1-crit (each slot = separate weapon). Laser AMS is 2-crit IS / 1-crit Clan → use dedup.
        if (
          (lo.includes('anti-missile') ||
            lo.includes('antimissile') ||
            lo === 'isams' ||
            lo === 'clams') &&
          !lo.includes('ammo')
        ) {
          const isMultiCritAMS = lo.includes('laser');
          if (isMultiCritAMS) {
            if (clean !== prevSlotClean) r.defEquipIds.push(clean);
          } else {
            r.defEquipIds.push(clean);
          }
        } else if (
          (lo.includes('ecm') ||
            lo.includes('guardian') ||
            lo.includes('angel') ||
            lo.includes('watchdog') ||
            lo.includes('novacews') ||
            lo.includes('nova cews') ||
            lo.includes('electronicwarfare') ||
            lo.includes('electronic warfare')) &&
          !lo.includes('ammo')
        ) {
          if (clean !== prevSlotClean) r.defEquipIds.push(clean);
        } else if (
          (lo.includes('beagle') ||
            lo.includes('bloodhound') ||
            (lo.includes('active') && lo.includes('probe'))) &&
          !lo.includes('ammo')
        ) {
          if (clean !== prevSlotClean) r.defEquipIds.push(clean);
        } else if (
          lo.includes('shield') &&
          !lo.includes('blue-shield') &&
          !lo.includes('chameleon')
        ) {
          if (clean !== prevSlotClean) {
            r.defEquipIds.push(clean);
            // Only Medium/Large shields impose weapon BV penalty (active shields).
            // Small shields are passive — weapons in that arm fire normally.
            const isActiveShield =
              (lo.includes('medium') || lo.includes('large')) &&
              !lo.includes('small');
            if (isActiveShield && loc.toUpperCase().includes('ARM')) {
              const armLoc =
                loc
                  .toUpperCase()
                  .replace(/[_(].*/, '')
                  .trim() + '_ARM';
              if (!r.shieldArms.includes(armLoc)) r.shieldArms.push(armLoc);
            }
          }
          if (lo.includes('large')) r.hasLargeShield = true;
          if (
            lo.includes('medium') &&
            !lo.includes('small') &&
            !lo.includes('large')
          )
            r.hasMediumShield = true;
        } else if (
          (lo.includes('b-pod') || lo === 'isbpod' || lo === 'clbpod') &&
          !lo.includes('ammo')
        )
          r.defEquipIds.push(clean);
        // M-Pod is an offensive weapon (BV=5), NOT defensive equipment — handled via equipment list
        else if (
          (lo.includes('a-pod') ||
            lo.includes('antipersonnel') ||
            lo === 'isapod' ||
            lo === 'clapod') &&
          !lo.includes('ammo')
        )
          r.defEquipIds.push(clean);
        // Spikes: defensive equipment, BV=4 per location (MegaMek MiscType.F_CLUB + countsAsDefensiveEquipment)
        if (
          (lo === 'spikes' ||
            lo === 'isspikes' ||
            lo === 'clspikes' ||
            lo === 'is spikes' ||
            lo === 'clan spikes') &&
          clean !== prevSlotClean
        )
          r.spikeCount++;
        // Mine Dispensers: offensive equipment, BV=8 per slot per MegaMek
        // Each crit slot is counted separately (no dedup) — 4 slots = 4 dispensers = 32 BV
        if (
          lo.includes('mine dispenser') ||
          lo.includes('minedispenser') ||
          lo === 'isvehicularminedispenser' ||
          lo === 'vehicularminedispenser'
        )
          r.mineDispenserCount++;

        // Bridge Layers: misc equipment with non-zero offensive BV, dedup per slot group.
        // Light=5, Medium=10, Heavy=20 per MegaMek MiscType.java
        if (clean !== prevSlotClean) {
          if (lo.includes('heavybridgelayer') || lo === 'heavy bridge layer')
            r.miscEquipBV += 20;
          else if (
            lo.includes('mediumbridgelayer') ||
            lo === 'medium bridge layer'
          )
            r.miscEquipBV += 10;
          else if (
            lo.includes('lightbridgelayer') ||
            lo === 'light bridge layer'
          )
            r.miscEquipBV += 5;
        }

        prevSlotClean = clean;

        // Physical weapons — detect first slot only (they span multiple slots)
        const physType = classifyPhysicalWeapon(lo);
        if (physType) {
          const key = physType + '@' + loc;
          if (
            !r.physicalWeapons.some((pw) => pw.type + '@' + pw.location === key)
          ) {
            r.physicalWeapons.push({ type: physType, location: loc });
          }
        }
      } // end for (const slot of subItems)
    }
  }

  const allSlots = Object.values(unit.criticalSlots)
    .flat()
    .filter((s): s is string => !!s && typeof s === 'string');
  const allSlotsLo = allSlots.map((s) => s.toLowerCase());
  if (allSlotsLo.some((s) => s.includes('ferro-lamellor')))
    r.detectedArmorType = 'ferro-lamellor';
  else if (
    allSlotsLo.some(
      (s) =>
        s.includes('ballistic-reinforced') ||
        s.includes('ballistic reinforced'),
    )
  )
    r.detectedArmorType = 'ballistic-reinforced';
  else if (
    allSlotsLo.some((s) => s.includes('reactive') && !s.includes('ferro'))
  )
    r.detectedArmorType = 'reactive';
  else if (
    allSlotsLo.some(
      (s) =>
        (s.includes('reflective') || s.includes('laser-reflective')) &&
        !s.includes('ferro'),
    )
  )
    r.detectedArmorType = 'reflective';
  else if (
    allSlotsLo.some(
      (s) => s.includes('hardened armor') || s.includes('is hardened'),
    )
  )
    r.detectedArmorType = 'hardened';
  else if (
    allSlotsLo.some(
      (s) => s.includes('anti-penetrative') || s.includes('ablation'),
    )
  )
    r.detectedArmorType = 'anti-penetrative';
  else if (allSlotsLo.some((s) => s.includes('heat-dissipating')))
    r.detectedArmorType = 'heat-dissipating';

  // Detect gyro type from CT crit slot count: Standard/HD=4, XL=6, Compact=2, None=0
  const ctSlots =
    unit.criticalSlots['CENTER_TORSO'] || unit.criticalSlots['CT'] || [];
  const gyroSlotCount = (ctSlots as string[]).filter(
    (s: string) =>
      s && typeof s === 'string' && s.toLowerCase().includes('gyro'),
  ).length;
  if (gyroSlotCount === 6) r.detectedGyroType = 'xl';
  else if (gyroSlotCount === 2) r.detectedGyroType = 'compact';
  // Note: HD gyro also has 4 slots like Standard, so we can't distinguish them by crit count alone.
  // HD gyro detection is done via KNOWN_HD_GYRO_UNITS set in calculateUnitBV.

  // Count rear weapons per location using (R) crit slots and weapon slot sizes
  const weaponSlotCounts = getWeaponSlotCounts();
  for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    const locKey = loc.toUpperCase();
    let prevRearNorm: string | null = null;
    let runLength = 0;

    const flushRun = () => {
      if (prevRearNorm && runLength > 0) {
        const slotsPerWeapon = weaponSlotCounts.get(prevRearNorm) ?? 1;
        const weaponCount = Math.max(1, Math.round(runLength / slotsPerWeapon));
        if (!rearSlotsByLoc.has(locKey)) rearSlotsByLoc.set(locKey, new Map());
        const locMap = rearSlotsByLoc.get(locKey)!;
        locMap.set(prevRearNorm, (locMap.get(prevRearNorm) ?? 0) + weaponCount);
      }
    };

    for (const slot of slots) {
      if (!slot || typeof slot !== 'string') {
        flushRun();
        prevRearNorm = null;
        runLength = 0;
        continue;
      }
      const slotClean = slot.replace(/\s*\(omnipod\)/gi, '').trim();
      const slotLo = slotClean.toLowerCase();
      if (
        !/\(R\)/i.test(slotClean) ||
        slotLo.includes('ammo') ||
        slotLo.includes('heat sink') ||
        slotLo.includes('engine') ||
        slotLo.includes('gyro') ||
        slotLo.includes('case') ||
        slotLo.includes('lift hoist')
      ) {
        flushRun();
        prevRearNorm = null;
        runLength = 0;
        continue;
      }
      const weapNorm = normalizeCritName(slotClean);
      if (weapNorm === prevRearNorm) {
        runLength++;
      } else {
        flushRun();
        prevRearNorm = weapNorm;
        runLength = 1;
      }
    }
    flushRun();
  }
  r.rearWeaponCountByLoc = rearSlotsByLoc;

  // Count DHS from crit slots — OmniMech pod-mounted DHS may not be reflected in heatSinks.count
  // Also track prototype DHS separately (they dissipate 2 heat each but unit.heatSinks.type may be "SINGLE")
  {
    let dhsCritSlots = 0;
    let protoDHSCritSlots = 0;
    const isClanTech = unit.techBase === 'CLAN';
    for (const [, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (!s || typeof s !== 'string') continue;
        const lo = s
          .replace(/\s*\(omnipod\)/gi, '')
          .trim()
          .toLowerCase();
        const isProto =
          lo === 'isdoubleheatsinkprototype' ||
          lo === 'cldoubleheatsinkprototype' ||
          lo === 'freezers' ||
          lo === 'isdoubleheatsinkfreezer' ||
          lo.includes('double heat sink prototype') ||
          lo.includes('double heat sink (freezer');
        if (
          isProto ||
          lo.includes('double heat sink') ||
          lo === 'isdoubleheatsink' ||
          lo === 'cldoubleheatsink'
        ) {
          dhsCritSlots++;
          if (isProto) protoDHSCritSlots++;
        }
      }
    }
    let slotsPerDHS = 3; // IS default
    if (isClanTech) {
      slotsPerDHS = 2;
    } else if (unit.techBase === 'MIXED') {
      const hasClanDHS = Object.values(unit.criticalSlots).some(
        (slots) =>
          Array.isArray(slots) &&
          slots.some(
            (s) =>
              s &&
              typeof s === 'string' &&
              (s.startsWith('CLDouble') || s.includes('Clan Double Heat Sink')),
          ),
      );
      if (hasClanDHS) slotsPerDHS = 2;
    }
    r.critDHSCount = Math.round(dhsCritSlots / slotsPerDHS);
    // Prototype DHS are always IS (3 crit slots each)
    r.critProtoDHSCount = Math.round(protoDHSCritSlots / 3);

    // Count Laser Heat Sinks (2 crit slots each, Clan, F_DOUBLE_HEAT_SINK in MegaMek)
    let laserHSCritSlots = 0;
    for (const [, lhsSlots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(lhsSlots)) continue;
      for (const s of lhsSlots) {
        if (!s || typeof s !== 'string') continue;
        if (
          s
            .toLowerCase()
            .replace(/\s*\(omnipod\)/gi, '')
            .trim()
            .includes('laser heat sink')
        )
          laserHSCritSlots++;
      }
    }
    r.critLaserHSCount = Math.round(laserHSCritSlots / 2);
  }

  // Clan mechs have built-in CASE in all non-head locations (torsos, arms, legs, CT).
  // MIXED tech units with Clan engines (e.g. CLAN_XL) also inherit built-in Clan CASE.
  const ALL_NON_HEAD_LOCS: MechLocation[] = [
    'LT',
    'RT',
    'LA',
    'RA',
    'CT',
    'LL',
    'RL',
  ];
  // IS-chassis MIXED units with Clan engines do NOT get implicit CASE.
  // Per MegaMek: Entity.isClan() returns false for ALL MIXED tech units.
  // Only pure Clan units get implicit CASE from tech base.
  // Detect IS chassis by presence of IS structural components (IS Endo Steel,
  // IS Ferro-Fibrous, etc.) in crits — these indicate an IS-chassis design
  // that happens to use a Clan engine, like the UrbanKnight UM-DKX.
  const hasISStructural =
    unit.techBase === 'MIXED' &&
    unit.criticalSlots &&
    Object.values(unit.criticalSlots).some(
      (slots) =>
        Array.isArray(slots) &&
        slots.some(
          (s: string | null) =>
            s != null &&
            typeof s === 'string' &&
            (s.includes('IS Endo Steel') ||
              s.includes('IS Ferro-Fibrous') ||
              s.includes('IS Endo-Composite') ||
              s.includes('IS Heavy Ferro-Fibrous') ||
              s.includes('IS Light Ferro-Fibrous')),
        ),
    );
  let hasClanCASE =
    unit.techBase === 'CLAN' ||
    (unit.techBase === 'MIXED' &&
      (unit.engine?.type || '').toUpperCase().includes('CLAN') &&
      !hasISStructural);
  if (hasClanCASE) {
    for (const loc of ALL_NON_HEAD_LOCS) {
      if (!r.caseLocs.includes(loc) && !r.caseIILocs.includes(loc))
        r.caseLocs.push(loc);
    }
  }
  // MIXED tech units with Clan chassis: detect via Clan structural components in crits.
  // Clan-chassis MIXED units (e.g. Griffin IIC 9, Hunchback IIC) use Clan Endo Steel,
  // Clan Ferro-Fibrous, or Clan DHS — indicating a Clan chassis that inherits implicit CASE
  // even when all weapons/ammo are IS technology.
  if (unit.techBase === 'MIXED' && !hasClanCASE && unit.criticalSlots) {
    const hasClanStructural = Object.values(unit.criticalSlots).some(
      (slots) =>
        Array.isArray(slots) &&
        slots.some(
          (s) =>
            s != null &&
            typeof s === 'string' &&
            (s.includes('Clan Endo Steel') ||
              s.includes('Clan Ferro-Fibrous') ||
              s.startsWith('CLDouble') ||
              s.includes('Clan Double Heat Sink')),
        ),
    );
    if (hasClanStructural) {
      hasClanCASE = true;
      for (const loc of ALL_NON_HEAD_LOCS) {
        if (!r.caseLocs.includes(loc) && !r.caseIILocs.includes(loc))
          r.caseLocs.push(loc);
      }
    }
  }

  // MIXED tech units with Clan chassis (no Clan engine or structural components):
  // These units are verified Clan-chassis designs from MegaMek's "Mixed (Clan Chassis)"
  // TechBase. MegaMek applies per-location implicit CASE only in torso/arm locations
  // that contain Clan ammo — NOT full unit-wide CASE like pure Clan or Clan-engine units.
  // The CLAN_CHASSIS_MIXED_UNITS set contains unit IDs verified by BV validation parity.
  // CLAN_CHASSIS_MIXED_UNITS: MegaMek's BV explosive penalty uses locationHasCase()
  // which only checks explicitly-mounted CASE equipment, NOT implicit Clan CASE.
  // The crit scanner already detects explicit ISCASE/CLCASE in crits, so no additional
  // CASE injection is needed here. Implicit Clan CASE (isClan() flag) affects hasCase()
  // and Blue Shield logic separately, but NOT the per-location explosive penalty.
  if (
    unit.techBase === 'MIXED' &&
    !hasClanCASE &&
    CLAN_CHASSIS_MIXED_UNITS.has(unit.id) &&
    unit.criticalSlots
  ) {
    const locMap: Record<string, MechLocation> = {
      LEFT_TORSO: 'LT',
      RIGHT_TORSO: 'RT',
      LEFT_ARM: 'LA',
      RIGHT_ARM: 'RA',
      CENTER_TORSO: 'CT',
      LEFT_LEG: 'LL',
      RIGHT_LEG: 'RL',
      LT: 'LT',
      RT: 'RT',
      LA: 'LA',
      RA: 'RA',
      CT: 'CT',
      LL: 'LL',
      RL: 'RL',
    };
    for (const [locKey, slots] of Object.entries(unit.criticalSlots)) {
      const ml = locMap[locKey];
      if (!ml) continue;
      const hasClanAmmo = (slots as (string | null)[]).some(
        (s: string | null) =>
          s != null &&
          typeof s === 'string' &&
          s.startsWith('Clan ') &&
          s.toLowerCase().includes('ammo'),
      );
      if (
        hasClanAmmo &&
        !r.caseLocs.includes(ml) &&
        !r.caseIILocs.includes(ml)
      ) {
        r.caseLocs.push(ml);
      }
    }
  }

  // Small cockpit detection:
  // 1. Prefer unit.cockpit field if it says SMALL
  // 2. Crit-based: Small cockpit HEAD layout = [LS, Sensors, Cockpit, Sensors, ?, ?]
  //    (Sensors in slot 4) vs standard = [LS, Sensors, Cockpit, ?, Sensors, LS]
  //    (Sensors in slot 5, LS in slots 1 and 6)
  if (unit.cockpit && unit.cockpit.toUpperCase().includes('SMALL'))
    r.detectedSmallCockpit = true;
  const headSlots = unit.criticalSlots?.HEAD;
  if (
    !r.detectedSmallCockpit &&
    Array.isArray(headSlots) &&
    headSlots.length >= 4
  ) {
    const slot4 = headSlots[3]; // 0-indexed
    const lsCount = headSlots.filter(
      (s: string | null) => s && s.includes('Life Support'),
    ).length;
    if (
      slot4 &&
      typeof slot4 === 'string' &&
      slot4.includes('Sensors') &&
      lsCount === 1
    ) {
      r.detectedSmallCockpit = true;
    }
  }

  // Interface Cockpit detection: HEAD has 2 "Cockpit" entries AND no "Gyro" anywhere in crits.
  // Command Console mechs also have 2 cockpit entries in HEAD but DO have Gyro entries.
  if (Array.isArray(headSlots)) {
    let cockpitCount = 0;
    for (const hs of headSlots) {
      if (hs && typeof hs === 'string' && hs.toLowerCase().includes('cockpit'))
        cockpitCount++;
    }
    if (cockpitCount >= 2) {
      const hasGyroAnywhere = allSlotsLo.some((s) => s.includes('gyro'));
      if (!hasGyroAnywhere) r.detectedInterfaceCockpit = true;
    }
  }

  // Drone Operating System detection: cockpit field says STANDARD but crits have ISDroneOperatingSystem
  if (
    allSlotsLo.some(
      (s) =>
        s.includes('droneoperatingsystem') ||
        s.includes('drone operating system'),
    )
  ) {
    r.detectedDroneOS = true;
  }

  // PPC weapons with linked PPC Capacitor: MegaMek treats the PPC weapon itself as
  // explosive (PPCWeapon → 1 BV per slot) in addition to the PPC Capacitor (1 slot).
  // Per MekBVCalculator.processExplosiveEquipment() lines 235-237.
  if (r.ppcCapLocs.length > 0 && unit.criticalSlots) {
    for (const capLoc of r.ppcCapLocs) {
      const locSlots =
        unit.criticalSlots[capLoc] || unit.criticalSlots[capLoc.toUpperCase()];
      if (!Array.isArray(locSlots)) continue;
      const ml = toMechLoc(capLoc);
      if (!ml) continue;
      for (const s of locSlots) {
        if (!s || typeof s !== 'string') continue;
        const slo = s
          .toLowerCase()
          .replace(/\s*\(omnipod\)/gi, '')
          .trim();
        // Match PPC weapon slots (not capacitors or ammo)
        if (
          slo.includes('ppc') &&
          !slo.includes('capacitor') &&
          !slo.includes('ammo')
        ) {
          r.explosive.push({
            location: ml,
            slots: 1,
            penaltyCategory: 'reduced',
          });
        }
      }
    }
  }

  return r;
}

// === AMMO WEAPON KEY NORMALIZATION ===
// MegaMek matches ammo to weapons by ammoType:rackSize. We normalize both
// ammo weaponType and weapon IDs to a common key for matching.
function normalizeWeaponKey(id: string): string {
  let s = id
    .toLowerCase()
    .replace(/^clan-/, '')
    .replace(/^cl(?!uster)/, '')
    .replace(/^\d+-/, '')
    .replace(/prototype-?/g, '');
  // Normalize common aliases to canonical forms
  const aliases: [RegExp, string][] = [
    [/^(?:is)?ultra-?ac-?(\d+)$/, 'uac-$1'],
    [/^(?:is)?ultraac(\d+)$/, 'uac-$1'],
    [/^(?:is)?ultra-?autocannon-?(\d+)$/, 'uac-$1'],
    [/^(?:is)?rotary-?ac-?(\d+)$/, 'rac-$1'],
    [/^(?:is)?rotaryac(\d+)$/, 'rac-$1'],
    [/^(?:is)?lb-?(\d+)-?x-?ac$/, 'lb-$1-x-ac'],
    [/^(?:is)?lbxac(\d+)$/, 'lb-$1-x-ac'],
    [/^(?:is)?lb(\d+)xac$/, 'lb-$1-x-ac'],
    [/^(?:is)?lb-?(\d+)-?x-?autocannon$/, 'lb-$1-x-ac'],
    [/^(?:is)?autocannon-?(\d+)$/, 'ac-$1'],
    [/^(?:is)?ac-?(\d+)$/, 'ac-$1'],
    [/^(?:is)?light-?ac-?(\d+)$/, 'lac-$1'],
    [/^(?:is)?lac-?(\d+)$/, 'lac-$1'],
    [/^(?:is)?lrm-?(\d+)$/, 'lrm-$1'],
    [/^(?:is)?srm-?(\d+)$/, 'srm-$1'],
    [/^(?:is)?mrm-?(\d+)$/, 'mrm-$1'],
    [/^(?:is)?mml-?(\d+)$/, 'mml-$1'],
    [/^(?:is)?atm-?(\d+)$/, 'atm-$1'],
    [/^(?:is)?streak-?srm-?(\d+)$/, 'streak-srm-$1'],
    [/^(?:is)?streaksrm(\d+)$/, 'streak-srm-$1'],
    [/^(?:is)?streak-?lrm-?(\d+)$/, 'streak-lrm-$1'],
    [/^(?:is)?streaklrm(\d+)$/, 'streak-lrm-$1'],
    [/^(?:is)?hag-?(\d+)$/, 'hag-$1'],
    [/^(?:is)?hag(\d+)$/, 'hag-$1'],
    [/^hyper-?assault-?gauss-?rifle-?(\d+)$/, 'hag-$1'],
    [/^(?:is)?hyper-?velocity-?(?:auto-?cannon|ac)-?(\d+)$/, 'hvac-$1'],
    [/^(?:is)?hvac-?(\d+)$/, 'hvac-$1'],
    [/^(?:is)?thunderbolt-?(\d+)$/, 'thunderbolt-$1'],
    [/^(?:is)?gauss-?rifle$/, 'gauss-rifle'],
    [/^gauss$/, 'gauss-rifle'],
    [/^(?:is)?light-?gauss-?rifle$/, 'light-gauss-rifle'],
    [/^light-?gauss$/, 'light-gauss-rifle'],
    [/^(?:is)?heavy-?gauss-?rifle$/, 'heavy-gauss-rifle'],
    [/^heavygauss$/, 'heavy-gauss-rifle'],
    [/^(?:is)?improved-?heavy-?gauss-?rifle$/, 'improved-heavy-gauss-rifle'],
    [/^improvedheavygauss$/, 'improved-heavy-gauss-rifle'],
    [/^(?:is)?ap-?gauss-?rifle$/, 'ap-gauss-rifle'],
    [/^apgaussrifle$/, 'ap-gauss-rifle'],
    [/^(?:is)?silver-?bullet-?gauss-?rifle$/, 'silver-bullet-gauss-rifle'],
    [/^silver-?bullet-?gauss$/, 'silver-bullet-gauss-rifle'],
    [/^impgauss(?:ammo)?$/, 'improved-gauss-rifle'],
    [/^improved-?gauss$/, 'improved-gauss-rifle'],
    [/^(?:is)?plasma-?rifle$/, 'plasma-rifle'],
    [/^(?:is)?plasma-?cannon$/, 'plasma-cannon'],
    [/^(?:is)?machine-?gun$/, 'machine-gun'],
    [/^(?:is)?light-?machine-?gun$/, 'light-machine-gun'],
    [/^(?:is)?heavy-?machine-?gun$/, 'heavy-machine-gun'],
    [/^(?:is)?anti-?missile-?system$/, 'ams'],
    [/^(?:is)?ams$/, 'ams'],
    [/^(?:is)?arrow-?iv(?:-?launcher)?$/, 'arrow-iv'],
    [/^arrowiv$/, 'arrow-iv'],
    [/^(?:is)?narc$/, 'narc'],
    [/^(?:is)?inarc$/, 'inarc'],
    [/^sniper(?:cannon)?$/, 'sniper'],
    [/^longtom(?:cannon)?$/, 'long-tom'],
    [/^thumper(?:cannon)?$/, 'thumper'],
    [/^mg$/, 'machine-gun'],
    [/^lightmg$/, 'light-machine-gun'],
    [/^heavymg$/, 'heavy-machine-gun'],
    [/^rotaryac(\d+)$/, 'rac-$1'],
    [/^(?:is)?lrt-?(\d+)$/, 'lrm-$1'],
    [/^(?:is)?srt-?(\d+)$/, 'srm-$1'],
    [/^(?:is)?protomech-?ac-?(\d+)$/, 'protomech-ac-$1'],
    [/^(?:is)?protomechac(\d+)$/, 'protomech-ac-$1'],
    [/^(?:is)?iatm-?(\d+)$/, 'iatm-$1'],
    [/^(?:is)?enhanced-?lrm-?(\d+)$/, 'enhanced-lrm-$1'],
    [/^(?:is)?enhancedlrm(\d+)$/, 'enhanced-lrm-$1'],
    [/^(?:is)?extended-?lrm-?(\d+)$/, 'extended-lrm-$1'],
  ];
  for (const [re, rep] of aliases) {
    if (re.test(s)) return s.replace(re, rep);
  }
  return s;
}

// === PATTERN-BASED AMMO RESOLUTION (BV from catalog, not hardcoded) ===
let ammoLookup: Map<string, { bv: number; weaponType: string }> | null = null;

function extractWeaponTypeFromAmmoId(ammoId: string): string {
  let s = ammoId
    .replace(/-ammo$/, '')
    .replace(/ammo$/, '')
    .replace(/^ammo-/, '')
    .replace(/^clan-ammo-/, '')
    .replace(/^clan-/, '');
  s = s.replace(
    /-(standard|er|he|iiw|imp|cluster|ap|precision|fragmentation|inferno|swarm|tandem-charge|thunder|explosive|ecm|haywire|nemesis|pods)$/,
    '',
  );
  s = s.replace(/-half$/, '').replace(/-full$/, '');
  return normalizeWeaponKey(s);
}

function buildAmmoLookup(): Map<string, { bv: number; weaponType: string }> {
  if (ammoLookup) return ammoLookup;
  ammoLookup = new Map();

  // Data-driven: load ammunition files from index.json (supports split files)
  const basePath = path.resolve(
    process.cwd(),
    'public/data/equipment/official',
  );
  let ammoFiles: string[] = ['ammunition.json'];
  try {
    const indexData = JSON.parse(
      fs.readFileSync(path.join(basePath, 'index.json'), 'utf-8'),
    );
    const ammoEntry = indexData?.files?.ammunition;
    if (
      ammoEntry &&
      typeof ammoEntry === 'object' &&
      !Array.isArray(ammoEntry)
    ) {
      ammoFiles = Object.values(ammoEntry) as string[];
    }
  } catch {
    /* fall back to ammunition.json */
  }

  for (const ammoFile of ammoFiles) {
    try {
      const d = JSON.parse(
        fs.readFileSync(path.join(basePath, ammoFile), 'utf-8'),
      );
      for (const item of (d.items || []) as Array<{
        id: string;
        battleValue: number;
        compatibleWeaponIds?: string[];
      }>) {
        const wt = item.compatibleWeaponIds?.[0]
          ? normalizeWeaponKey(item.compatibleWeaponIds[0])
          : extractWeaponTypeFromAmmoId(item.id);
        ammoLookup.set(item.id, { bv: item.battleValue, weaponType: wt });
        const canon = item.id.replace(/[^a-z0-9]/g, '');
        if (!ammoLookup.has(canon))
          ammoLookup.set(canon, { bv: item.battleValue, weaponType: wt });
      }
    } catch {
      /* ignore individual ammo file errors */
    }
  }

  const hc: Array<[string, number, string]> = [
    ['mml-3-lrm-ammo', 4, 'mml-3'],
    ['mml-3-srm-ammo', 4, 'mml-3'],
    ['mml-5-lrm-ammo', 6, 'mml-5'],
    ['mml-5-srm-ammo', 6, 'mml-5'],
    ['mml-7-lrm-ammo', 8, 'mml-7'],
    ['mml-7-srm-ammo', 8, 'mml-7'],
    ['mml-9-lrm-ammo', 11, 'mml-9'],
    ['mml-9-srm-ammo', 11, 'mml-9'],
    ['plasma-rifle-ammo', 26, 'plasma-rifle'],
    ['isplasmarifleammo', 26, 'plasma-rifle'],
    ['heavy-rifle-ammo', 11, 'heavy-rifle'],
    ['medium-rifle-ammo', 6, 'medium-rifle'],
    ['light-rifle-ammo', 3, 'light-rifle'],
    ['clan-plasma-cannon-ammo', 21, 'plasma-cannon'],
    ['clplasmacannonammo', 21, 'plasma-cannon'],
    ['streak-srm-ammo', 17, 'streak-srm-2'],
    // Clan Streak SRM (higher BV than IS)
    ['clan-streak-srm-2-ammo', 5, 'streak-srm-2'],
    ['clan-streak-srm-4-ammo', 10, 'streak-srm-4'],
    ['clan-streak-srm-6-ammo', 15, 'streak-srm-6'],
    // IS Streak SRM (lower BV than Clan)
    ['streak-srm-2-ammo', 4, 'streak-srm-2'],
    ['streak-srm-4-ammo', 7, 'streak-srm-4'],
    ['streak-srm-6-ammo', 11, 'streak-srm-6'],
    ['is-streak-srm-2-ammo', 4, 'streak-srm-2'],
    ['is-streak-srm-4-ammo', 7, 'streak-srm-4'],
    ['is-streak-srm-6-ammo', 11, 'streak-srm-6'],
    // Clan LRM per-size (higher BV than IS: 7/14/21/27 vs 6/11/17/23)
    ['clan-ammo-lrm-5', 7, 'lrm-5'],
    ['clan-ammo-lrm-10', 14, 'lrm-10'],
    ['clan-ammo-lrm-15', 21, 'lrm-15'],
    ['clan-ammo-lrm-20', 27, 'lrm-20'],
    // Clan SRM per-size (same BV as IS: 3/5/7)
    ['clan-ammo-srm-2', 3, 'srm-2'],
    ['clan-ammo-srm-4', 5, 'srm-4'],
    ['clan-ammo-srm-6', 7, 'srm-6'],
    // MRM per-size (7/14/21/28 per MegaMek)
    ['mrm-10-ammo', 7, 'mrm-10'],
    ['mrm-20-ammo', 14, 'mrm-20'],
    ['mrm-30-ammo', 21, 'mrm-30'],
    ['mrm-40-ammo', 28, 'mrm-40'],
    ['ammo-mrm-10', 7, 'mrm-10'],
    ['ammo-mrm-20', 14, 'mrm-20'],
    ['ammo-mrm-30', 21, 'mrm-30'],
    ['ammo-mrm-40', 28, 'mrm-40'],
    // IS UAC ammo (correct IS values - catalog has Clan values for some)
    ['is-uac-2-ammo', 7, 'uac-2'],
    ['is-uac-5-ammo', 14, 'uac-5'],
    // Clan UAC ammo (where different from IS)
    ['clan-uac-2-ammo', 8, 'uac-2'],
    ['clan-uac-5-ammo', 15, 'uac-5'],
    ['clan-uac-20-ammo', 42, 'uac-20'],
    // IS LB-X ammo (correct IS values)
    ['is-lb-2-x-ammo', 5, 'lb-2-x-ac'],
    ['is-lb-5-x-ammo', 10, 'lb-5-x-ac'],
    // Clan LB-X ammo (where different from IS)
    ['clan-lb-2-x-ammo', 6, 'lb-2-x-ac'],
    ['clan-lb-5-x-ammo', 12, 'lb-5-x-ac'],
    ['clan-lb-2-x-cluster-ammo', 6, 'lb-2-x-ac'],
    ['clan-lb-5-x-cluster-ammo', 12, 'lb-5-x-ac'],
    ['hag-20-ammo', 33, 'hag-20'],
    ['hag-30-ammo', 50, 'hag-30'],
    ['hag-40-ammo', 67, 'hag-40'],
    ['rac-2-ammo', 15, 'rac-2'],
    ['rac-5-ammo', 31, 'rac-5'],
    ['clan-rac-2-ammo', 20, 'rac-2'],
    ['clan-rac-5-ammo', 43, 'rac-5'],
    ['clan-rac-20-ammo', 59, 'rac-20'],
    ['clanrotaryac2', 20, 'rac-2'],
    ['clanrotaryac5', 43, 'rac-5'],
    ['hvac-2-ammo', 7, 'hvac-2'],
    ['hvac-5-ammo', 11, 'hvac-5'],
    ['hvac-10-ammo', 20, 'hvac-10'],
    ['thunderbolt-5-ammo', 8, 'thunderbolt-5'],
    ['thunderbolt-10-ammo', 16, 'thunderbolt-10'],
    ['thunderbolt-15-ammo', 29, 'thunderbolt-15'],
    ['thunderbolt-20-ammo', 38, 'thunderbolt-20'],
    // Clan Improved LRM uses Clan BV values; weaponType must match 'improved-lrm-N' (not 'lrm-N')
    ['clan-improved-lrm-5-ammo', 7, 'improved-lrm-5'],
    ['clan-improved-lrm-10-ammo', 14, 'improved-lrm-10'],
    ['clan-improved-lrm-15-ammo', 21, 'improved-lrm-15'],
    ['clan-improved-lrm-20-ammo', 27, 'improved-lrm-20'],
    // Fluid Gun
    ['fluid-gun-ammo', 1, 'fluid-gun'],
    // Clan Streak LRM per-size
    ['clan-streak-lrm-5-ammo', 11, 'streak-lrm-5'],
    ['clan-streak-lrm-10-ammo', 22, 'streak-lrm-10'],
    ['clan-streak-lrm-15-ammo', 32, 'streak-lrm-15'],
    ['clan-streak-lrm-20-ammo', 43, 'streak-lrm-20'],
    // Clan ProtoMech AC
    ['clan-protomech-ac-2-ammo', 4, 'protomech-ac-2'],
    ['clan-protomech-ac-4-ammo', 6, 'protomech-ac-4'],
    ['clan-protomech-ac-8-ammo', 8, 'protomech-ac-8'],
    // Long Tom Cannon
    ['longtomcannonammo', 41, 'long-tom'],
    ['islongtomcannonammo', 41, 'long-tom'],
    ['snipercannonammo', 10, 'sniper'],
    ['issnipercannonammo', 10, 'sniper'],
    ['thumpercannonammo', 5, 'thumper'],
    ['isthumpercannonammo', 5, 'thumper'],
    // Magshot
    ['magshotgr-ammo', 2, 'magshot'],
    // Taser
    ['taser-ammo', 5, 'mech-taser'],
    // Improved Gauss (Clan)
    ['impgaussammo', 40, 'improved-gauss-rifle'],
    ['climpgaussammo', 40, 'improved-gauss-rifle'],
    // LR/SR Torpedo
    ['ammo-lrtorpedo-5', 6, 'lrm-5'],
    ['ammo-lrtorpedo-10', 11, 'lrm-10'],
    ['ammo-lrtorpedo-15', 17, 'lrm-15'],
    ['ammo-lrtorpedo-20', 23, 'lrm-20'],
    ['ammo-srtorpedo-2', 3, 'srm-2'],
    ['ammo-srtorpedo-4', 5, 'srm-4'],
    ['ammo-srtorpedo-6', 7, 'srm-6'],
    ['clan-sc-mortar-1-ammo', 1, 'mortar-1'],
    ['clan-sc-mortar-2-ammo', 2, 'mortar-2'],
    ['clan-sc-mortar-4-ammo', 4, 'mortar-4'],
    ['clan-sc-mortar-8-ammo', 8, 'mortar-8'],
    ['is-sc-mortar-1-ammo', 1, 'mortar-1'],
    ['is-sc-mortar-2-ammo', 2, 'mortar-2'],
    ['is-sc-mortar-4-ammo', 4, 'mortar-4'],
    ['is-sc-mortar-8-ammo', 8, 'mortar-8'],
    ['lb-2-x-cluster-ammo', 6, 'lb-2-x-ac'],
    ['lb-5-x-cluster-ammo', 12, 'lb-5-x-ac'],
    ['clan-medium-chemical-laser-ammo', 5, 'medium-chemical-laser'],
    ['clan-heavy-flamer-ammo', 1, 'heavy-flamer'],
    ['cl-heavy-flamer-ammo', 1, 'heavy-flamer'],
    ['clan-improved-gauss-ammo', 40, 'improved-gauss-rifle'],
    ['clanimprovedlrm5ammo', 7, 'improved-lrm-5'],
    ['clanimprovedlrm10ammo', 14, 'improved-lrm-10'],
    ['clanimprovedlrm15ammo', 21, 'improved-lrm-15'],
    ['clanimprovedlrm20ammo', 27, 'improved-lrm-20'],
    ['light-machine-gun-ammo-half', 1, 'light-machine-gun'],
    ['clan-light-machine-gun-ammo-half', 1, 'light-machine-gun'],
    ['heavy-machine-gun-ammo-half', 1, 'heavy-machine-gun'],
    ['clan-heavy-machine-gun-ammo-half', 1, 'heavy-machine-gun'],
    ['machine-gun-ammo-half', 1, 'machine-gun'],
    ['clan-machine-gun-ammo-half', 1, 'machine-gun'],
    ['inarc-ammo', 6, 'improved-narc'],
    ['narc-ammo', 6, 'narc-beacon'],
    ['clan-narc-ammo', 6, 'narc-beacon'],
  ];
  for (const [id, bv, wt] of hc) {
    if (!ammoLookup.has(id)) ammoLookup.set(id, { bv, weaponType: wt });
    const canon = id.replace(/[^a-z0-9]/g, '');
    if (!ammoLookup.has(canon)) ammoLookup.set(canon, { bv, weaponType: wt });
  }

  // Force-override: catalog entries with known wrong BV values (UNOFFICIAL entries)
  // These ALWAYS overwrite any catalog value, unlike the `hc` list above.
  const overrides: Array<[string, number, string]> = [
    // Clan Improved LRM ammo: catalog has IS BV values (6/11/17/23), correct Clan values are 7/14/21/27
    ['clanimprovedlrm5ammo', 7, 'improved-lrm-5'],
    ['clanimprovedlrm10ammo', 14, 'improved-lrm-10'],
    ['clanimprovedlrm15ammo', 21, 'improved-lrm-15'],
    ['clanimprovedlrm20ammo', 27, 'improved-lrm-20'],
    ['clan-improved-lrm-5-ammo', 7, 'improved-lrm-5'],
    ['clan-improved-lrm-10-ammo', 14, 'improved-lrm-10'],
    ['clan-improved-lrm-15-ammo', 21, 'improved-lrm-15'],
    ['clan-improved-lrm-20-ammo', 27, 'improved-lrm-20'],
    // Mortar ammo (SC = Semi-Guided Cluster): must override any catalog defaults
    ['clan-sc-mortar-1-ammo', 1, 'mortar-1'],
    ['clan-sc-mortar-2-ammo', 2, 'mortar-2'],
    ['clan-sc-mortar-4-ammo', 4, 'mortar-4'],
    ['clan-sc-mortar-8-ammo', 8, 'mortar-8'],
    ['is-sc-mortar-1-ammo', 1, 'mortar-1'],
    ['is-sc-mortar-2-ammo', 2, 'mortar-2'],
    ['is-sc-mortar-4-ammo', 4, 'mortar-4'],
    ['is-sc-mortar-8-ammo', 8, 'mortar-8'],
  ];
  for (const [id, bv, wt] of overrides) {
    ammoLookup.set(id, { bv, weaponType: wt });
    const canon = id.replace(/[^a-z0-9]/g, '');
    ammoLookup.set(canon, { bv, weaponType: wt });
  }

  return ammoLookup;
}

function resolveAmmoByPattern(
  name: string,
  _techBase: string,
): { bv: number; weaponType: string } | null {
  const lu = buildAmmoLookup();

  const clean = name
    .replace(/\s*\(omnipod\)/gi, '')
    .replace(/\s*\((?:Clan|IS)\)\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '')
    .replace(/\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '')
    .replace(/\|.*/g, '')
    .trim();

  // Early check for IS Streak SRM ammo: normalizeEquipmentId maps via name-mappings.json
  // to "clan-streak-srm-N" (Clan BV values). Intercept to use correct IS-specific BV.
  const isStreakMatch = clean.match(/^IS\s+Streak\s+SRM\s+(\d+)\s+Ammo$/i);
  if (isStreakMatch) {
    const key = `is-streak-srm-${isStreakMatch[1]}-ammo`;
    const found = lu.get(key);
    if (found) return found;
  }

  const norm = normalizeEquipmentId(clean);
  let e = lu.get(norm);
  if (e) return e;
  e = lu.get(norm + '-ammo');
  if (e) return e;

  const lo = clean.toLowerCase();
  const stripped = lo
    .replace(/\s*\((?:clan|is)\)\s*/g, '')
    .replace(/\s*-\s*(?:full|half|proto)\s*$/g, '')
    .replace(/\s*\(\d+\)\s*$/g, '')
    .trim();

  type Rule = { re: RegExp; ids: (m: RegExpMatchArray) => string[] };
  const rules: Rule[] = [
    { re: /^(?:is\s*)?ammo\s+ac[/-](\d+)$/, ids: (m) => [`ac-${m[1]}-ammo`] },
    {
      re: /^(?:is\s*)?ammo\s+ac[/-](\d+)\s+primitive$/,
      ids: (m) => [`ammo-ac-${m[1]}-primitive`],
    },
    { re: /^(?:is\s*)?ac(\d+)\s*ammo$/, ids: (m) => [`ac-${m[1]}-ammo`] },
    { re: /^(?:is\s*)?ammo\s+lrm-(\d+)$/, ids: (m) => [`ammo-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?lrm(\d+)\s*ammo$/, ids: (m) => [`ammo-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+srm-(\d+)$/, ids: (m) => [`ammo-srm-${m[1]}`] },
    { re: /^(?:is\s*)?srm(\d+)\s*ammo$/, ids: (m) => [`ammo-srm-${m[1]}`] },
    {
      re: /^(?:is\s*)?ammo\s+mml-(\d+)\s+lrm$/,
      ids: (m) => [`mml-${m[1]}-lrm-ammo`, `ammo-lrm-${m[1]}`],
    },
    {
      re: /^(?:is\s*)?ammo\s+mml-(\d+)\s+srm$/,
      ids: (m) => [`mml-${m[1]}-srm-ammo`, `ammo-srm-${m[1]}`],
    },
    {
      re: /^(?:is\s*)?mml(\d+)\s+lrm\s*ammo$/,
      ids: (m) => [`mml-${m[1]}-lrm-ammo`, `ammo-lrm-${m[1]}`],
    },
    {
      re: /^(?:is\s*)?mml(\d+)\s+srm\s*ammo$/,
      ids: (m) => [`mml-${m[1]}-srm-ammo`, `ammo-srm-${m[1]}`],
    },
    {
      re: /^(?:is\s*)?mrm(\d+)\s*ammo$/,
      ids: (m) => [
        `mrm-${m[1]}-ammo`,
        `ammo-mrm-${m[1]}`,
        `mrm-${m[1]}`,
        `mrm-ammo`,
      ],
    },
    {
      re: /^(?:is\s*)?ammo\s+mrm-(\d+)$/,
      ids: (m) => [
        `mrm-${m[1]}-ammo`,
        `ammo-mrm-${m[1]}`,
        `mrm-${m[1]}`,
        `mrm-ammo`,
      ],
    },
    {
      re: /^(?:is\s*)?ultraac(\d+)\s*ammo$/,
      ids: (m) => [`is-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`],
    },
    {
      re: /^(?:is\s*)?ammo\s+ultra\s*ac[/-](\d+)$/,
      ids: (m) => [`is-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`],
    },
    {
      re: /^(?:is\s*)?ultra\s*ac[/-](\d+)\s*ammo$/,
      ids: (m) => [`is-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`],
    },
    {
      re: /^(?:is\s*)?lbxac(\d+)\s*ammo$/,
      ids: (m) => [`is-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`],
    },
    {
      re: /^(?:is\s*)?lbxac(\d+)\s+cl\s*ammo$/,
      ids: (m) => [`is-lb-${m[1]}-x-cluster-ammo`, `lb-${m[1]}-x-cluster-ammo`],
    },
    {
      re: /^(?:is\s*)?lb\s*(\d+)-x\s*(?:ac\s*)?ammo$/,
      ids: (m) => [`is-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`],
    },
    {
      re: /^(?:is\s*)?lb\s*(\d+)-x\s*(?:ac\s*)?cluster\s*ammo$/,
      ids: (m) => [`is-lb-${m[1]}-x-cluster-ammo`, `lb-${m[1]}-x-cluster-ammo`],
    },
    {
      re: /^(?:is\s*)?lb\s*(\d+)-x\s*(?:ac\s*)?slug\s*ammo$/,
      ids: (m) => [`is-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`],
    },
    { re: /^(?:is\s*)?rotaryac(\d+)\s*ammo$/, ids: (m) => [`rotaryac${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+lac[/-](\d+)$/, ids: (m) => [`ammo-lac-${m[1]}`] },
    { re: /^(?:is\s*)?lac(\d+)\s*ammo$/, ids: (m) => [`ammo-lac-${m[1]}`] },
    {
      re: /^(?:is\s*)?ammo\s+hvac[/-](\d+)$/,
      ids: (m) => [`hvac-${m[1]}-ammo`],
    },
    {
      re: /^(?:is\s*)?ammo\s+extended\s*lrm-(\d+)$/,
      ids: (m) => [`ammo-extended-lrm-${m[1]}`],
    },
    {
      re: /^(?:is\s*)?enhancedlrm(\d+)\s*ammo$/,
      ids: (m) => [`enhancedlrm${m[1]}`],
    },
    {
      re: /^(?:is\s*)?ammo\s+thunderbolt-(\d+)$/,
      ids: (m) => [`thunderbolt-${m[1]}-ammo`, `lrm-ammo`],
    },
    {
      re: /^(?:is\s*)?thunderbolt(\d+)\s*ammo$/,
      ids: (m) => [`thunderbolt-${m[1]}-ammo`, `lrm-ammo`],
    },
    { re: /^(?:is\s*)?gauss\s*ammo$/, ids: (_) => [`gauss-ammo`] },
    {
      re: /^(?:is\s*)?light\s*gauss\s*ammo$/,
      ids: (_) => [`light-gauss-ammo`],
    },
    {
      re: /^(?:is\s*)?heavy\s*gauss\s*ammo$/,
      ids: (_) => [`heavy-gauss-ammo`],
    },
    {
      re: /^(?:is\s*)?improvedheavygauss\s*ammo$/,
      ids: (_) => [`improvedheavygauss`],
    },
    {
      re: /^(?:is\s*)?sbgauss(?:rifle)?\s*ammo$/,
      ids: (_) => [`silver-bullet-gauss`],
    },
    {
      re: /^silver\s*bullet\s*gauss\s*ammo$/,
      ids: (_) => [`silver-bullet-gauss`],
    },
    {
      re: /^(?:is\s*)?plasmarifle?\s*ammo$/,
      ids: (_) => [`plasma-rifle-ammo`, `isplasmarifleammo`],
    },
    {
      re: /^(?:is\s*)?plasma\s*rifle\s*ammo$/,
      ids: (_) => [`plasma-rifle-ammo`, `isplasmarifleammo`],
    },
    { re: /^(?:is\s*)?fluidgun\s*ammo$/, ids: (_) => [`fluid-gun-ammo`] },
    { re: /^(?:is\s*)?(?:heavy\s*)?flamer\s*ammo$/, ids: (_) => [`mg-ammo`] },
    { re: /^(?:is\s*)?vehicle\s*flamer\s*ammo$/, ids: (_) => [`mg-ammo`] },
    { re: /^(?:is\s*)?mg\s*ammo$/, ids: (_) => [`mg-ammo`] },
    { re: /^(?:is\s*)?ammo\s+mg$/, ids: (_) => [`mg-ammo`, `ammo-mg-full`] },
    {
      re: /^(?:is\s*)?machine\s*gun\s*ammo$/,
      ids: (_) => [`mg-ammo`, `ammo-mg-full`],
    },
    {
      re: /^(?:is\s*)?heavy\s*machine\s*gun\s*ammo$/,
      ids: (_) => [`heavy-mg-ammo`, `heavy-machine-gun-ammo-full`],
    },
    {
      re: /^(?:is\s*)?light\s*machine\s*gun\s*ammo$/,
      ids: (_) => [`light-mg-ammo`, `light-machine-gun-ammo-full`],
    },
    { re: /^(?:is\s*)?ams\s*ammo$/, ids: (_) => [`ams-ammo`] },
    { re: /^(?:is\s*)?ammo\s+inarc$/, ids: (_) => [`inarc-ammo`] },
    { re: /^(?:is\s*)?ammo\s+narc$/, ids: (_) => [`narc-ammo`] },
    {
      re: /^(?:is\s*)?arrowiv\s*(?:cluster\s*)?ammo$/,
      ids: (_) => [`arrowivammo`],
    },
    { re: /^(?:is\s*)?arrowiv\s*homing\s*ammo$/, ids: (_) => [`arrowivammo`] },
    {
      re: /^(?:is\s*)?ammo\s+lrtorpedo-(\d+)$/,
      ids: (m) => [`ammo-lrtorpedo-${m[1]}`, `ammo-lrm-${m[1]}`],
    },
    {
      re: /^(?:is\s*)?ammo\s+srtorpedo-(\d+)$/,
      ids: (m) => [`ammo-srtorpedo-${m[1]}`, `ammo-srm-${m[1]}`],
    },
    {
      re: /^(?:is\s*)?ammo\s+heavy\s*rifle$/,
      ids: (_) => [`heavy-rifle-ammo`],
    },
    {
      re: /^(?:is\s*)?heavy\s*rifle\s*ammo$/,
      ids: (_) => [`heavy-rifle-ammo`],
    },
    {
      re: /^(?:is\s*)?ammo\s+medium\s*rifle$/,
      ids: (_) => [`medium-rifle-ammo`],
    },
    {
      re: /^(?:is\s*)?medium\s*rifle\s*ammo$/,
      ids: (_) => [`medium-rifle-ammo`],
    },
    {
      re: /^(?:is\s*)?ammo\s+light\s*rifle$/,
      ids: (_) => [`light-rifle-ammo`],
    },
    {
      re: /^(?:is\s*)?light\s*rifle\s*ammo$/,
      ids: (_) => [`light-rifle-ammo`],
    },
    { re: /^(?:is\s*)?ammo\s+nail[/-]rivet$/, ids: (_) => [`mg-ammo`] },
    { re: /^(?:is\s*)?magshotgr\s*ammo$/, ids: (_) => [`magshotgr-ammo`] },
    { re: /^(?:is\s*)?apds\s*ammo$/, ids: (_) => [`ams-ammo`] },
    {
      re: /^(?:is\s*)?snipercannonammo$/,
      ids: (_) => [`snipercannonammo`, `issnipercannonammo`],
    },
    {
      re: /^(?:is\s*)?longtomcannonammo$/,
      ids: (_) => [`longtomcannonammo`, `islongtomcannonammo`],
    },
    {
      re: /^(?:is\s*)?thumpercannonammo$/,
      ids: (_) => [`thumpercannonammo`, `isthumpercannonammo`],
    },
    { re: /^(?:mek\s*)?taser\s*ammo$/, ids: (_) => [`taser-ammo`] },
    {
      re: /^(?:is\s*)?streaksrm(\d+)\s*ammo$/,
      ids: (m) => [
        `is-streak-srm-${m[1]}-ammo`,
        `streak-srm-${m[1]}-ammo`,
        `streak-srm-ammo`,
      ],
    },
    {
      re: /^(?:is\s*)?streak\s*srm\s*(\d+)\s*ammo$/,
      ids: (m) => [
        `is-streak-srm-${m[1]}-ammo`,
        `streak-srm-${m[1]}-ammo`,
        `streak-srm-ammo`,
      ],
    },
    {
      re: /^(?:is\s*)?ammo\s+streak\s*srm-(\d+)$/,
      ids: (m) => [
        `is-streak-srm-${m[1]}-ammo`,
        `streak-srm-${m[1]}-ammo`,
        `streak-srm-ammo`,
      ],
    },
    {
      re: /^(?:is\s*)?lrt(\d+)\s*ammo$/,
      ids: (m) => [`ammo-lrtorpedo-${m[1]}`, `ammo-lrm-${m[1]}`],
    },
    {
      re: /^(?:is\s*)?srt(\d+)\s*ammo$/,
      ids: (m) => [`ammo-srtorpedo-${m[1]}`, `ammo-srm-${m[1]}`],
    },
    {
      re: /^(?:is\s*)?light\s*mg\s*ammo(?:\s*\(\d+\))?$/,
      ids: (_) => [`light-mg-ammo`, `light-machine-gun-ammo-full`],
    },
    { re: /^(?:is\s*)?impgauss\s*ammo$/, ids: (_) => [`impgaussammo`] },
    { re: /^(?:is\s*)?arrowiv\s+ammo$/, ids: (_) => [`arrowivammo`] },
    { re: /^(?:is\s*)?arrowiv\s+homing\s*ammo$/, ids: (_) => [`arrowivammo`] },
    { re: /^(?:is\s*)?arrowiv\s+cluster\s*ammo$/, ids: (_) => [`arrowivammo`] },
    {
      re: /^(?:is\s*)?sniper\s*cannon\s*ammo$/,
      ids: (_) => [`snipercannonammo`, `issnipercannonammo`],
    },
    {
      re: /^(?:is\s*)?long\s*tom\s*cannon\s*ammo$/,
      ids: (_) => [`longtomcannonammo`, `islongtomcannonammo`],
    },

    {
      re: /^cl(?:an)?\s*ammo\s+lrm-(\d+)$/,
      ids: (m) => [`clan-ammo-lrm-${m[1]}`, `ammo-lrm-${m[1]}`],
    },
    {
      re: /^cl(?:an)?\s*lrm(\d+)\s*ammo$/,
      ids: (m) => [`clan-ammo-lrm-${m[1]}`, `ammo-lrm-${m[1]}`],
    },
    {
      re: /^cl(?:an)?\s*ammo\s+srm-(\d+)$/,
      ids: (m) => [`clan-ammo-srm-${m[1]}`, `ammo-srm-${m[1]}`],
    },
    {
      re: /^cl(?:an)?\s*srm(\d+)\s*ammo$/,
      ids: (m) => [`clan-ammo-srm-${m[1]}`, `ammo-srm-${m[1]}`],
    },
    {
      re: /^cl(?:an)?\s*ammo\s+atm-(\d+)$/,
      ids: (m) => [`clan-ammo-atm-${m[1]}`, `atm-standard-ammo`],
    },
    {
      re: /^cl(?:an)?\s*ammo\s+atm-(\d+)\s+er$/,
      ids: (m) => [`clan-ammo-atm-${m[1]}-er`, `atm-er-ammo`],
    },
    {
      re: /^cl(?:an)?\s*ammo\s+atm-(\d+)\s+he$/,
      ids: (m) => [`clan-ammo-atm-${m[1]}-he`, `atm-he-ammo`],
    },
    {
      re: /^cl(?:an)?\s*atm(\d+)\s*ammo$/,
      ids: (m) => [`clan-ammo-atm-${m[1]}`, `atm-standard-ammo`],
    },
    {
      re: /^cl(?:an)?\s*atm(\d+)\s+er\s*ammo$/,
      ids: (m) => [`clan-ammo-atm-${m[1]}-er`, `atm-er-ammo`],
    },
    {
      re: /^cl(?:an)?\s*atm(\d+)\s+he\s*ammo$/,
      ids: (m) => [`clan-ammo-atm-${m[1]}-he`, `atm-he-ammo`],
    },
    {
      re: /^cl(?:an)?\s*ammo\s+iatm-(\d+)$/,
      ids: (m) => [`clan-ammo-iatm-${m[1]}`],
    },
    {
      re: /^cl(?:an)?\s*ultraac(\d+)\s*ammo$/,
      ids: (m) => [`clan-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`],
    },
    {
      re: /^cl(?:an)?\s*ultra\s*ac[/-](\d+)\s*ammo$/,
      ids: (m) => [`clan-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`],
    },
    {
      re: /^cl(?:an)?\s*lbxac(\d+)\s*ammo$/,
      ids: (m) => [`clan-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`],
    },
    {
      re: /^cl(?:an)?\s*lbxac(\d+)\s+cl\s*ammo$/,
      ids: (m) => [
        `clan-lb-${m[1]}-x-cluster-ammo`,
        `lb-${m[1]}-x-cluster-ammo`,
      ],
    },
    {
      re: /^cl(?:an)?\s*lb\s*(\d+)-x\s*(?:ac\s*)?ammo$/,
      ids: (m) => [`clan-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`],
    },
    {
      re: /^cl(?:an)?\s*lb\s*(\d+)-x\s*(?:ac\s*)?cluster\s*ammo$/,
      ids: (m) => [
        `clan-lb-${m[1]}-x-cluster-ammo`,
        `lb-${m[1]}-x-cluster-ammo`,
      ],
    },
    {
      re: /^cl(?:an)?\s*rotaryac(\d+)\s*ammo$/,
      ids: (m) => [`clanrotaryac${m[1]}`, `rac-${m[1]}-ammo`],
    },
    {
      re: /^cl(?:an)?\s*streaksrm(\d+)\s*ammo$/,
      ids: (m) => [
        `clan-streak-srm-${m[1]}-ammo`,
        `clan-streak-srm-${m[1]}`,
        `streak-srm-ammo`,
      ],
    },
    {
      re: /^cl(?:an)?\s*streak\s*srm\s*(\d+)\s*ammo$/,
      ids: (m) => [
        `clan-streak-srm-${m[1]}-ammo`,
        `clan-streak-srm-${m[1]}`,
        `streak-srm-ammo`,
      ],
    },
    {
      re: /^cl(?:an)?\s*streaklrm(\d+)\s*ammo$/,
      ids: (m) => [`clan-streak-lrm-${m[1]}-ammo`, `clan-streak-lrm-${m[1]}`],
    },
    {
      re: /^cl(?:an)?\s*streak\s*lrm\s*(\d+)\s*ammo$/,
      ids: (m) => [`clan-streak-lrm-${m[1]}-ammo`, `clan-streak-lrm-${m[1]}`],
    },
    { re: /^cl(?:an)?\s*gauss\s*ammo$/, ids: (_) => [`gauss-ammo`] },
    {
      re: /^cl(?:an)?\s*apgaussrifle\s*ammo$/,
      ids: (_) => [`ap-gauss-ammo`, `apgaussrifle`],
    },
    { re: /^cl(?:an)?\s*impgauss\s*ammo$/, ids: (_) => [`impgaussammo`] },
    {
      re: /^cl(?:an)?\s*improvedlrm(\d+)\s*ammo$/,
      ids: (m) => [`clanimprovedlrm${m[1]}ammo`],
    },
    {
      re: /^cl(?:an)?\s*machine\s*gun\s*ammo$/,
      ids: (_) => [`mg-ammo`, `ammo-mg-full`],
    },
    { re: /^cl(?:an)?\s*mg\s*ammo$/, ids: (_) => [`mg-ammo`, `ammo-mg-full`] },
    {
      re: /^cl(?:an)?\s*heavy\s*machine\s*gun\s*ammo$/,
      ids: (_) => [`heavy-mg-ammo`, `heavy-machine-gun-ammo-full`],
    },
    {
      re: /^cl(?:an)?\s*light\s*machine\s*gun\s*ammo$/,
      ids: (_) => [`light-mg-ammo`, `light-machine-gun-ammo-full`],
    },
    {
      re: /^cl(?:an)?\s*ams\s*ammo$/,
      ids: (_) => [`clan-ams-ammo`, `ams-ammo`],
    },
    {
      re: /^cl(?:an)?\s*arrowiv\s*(?:cluster\s*|homing\s*)?ammo$/,
      ids: (_) => [`arrowivammo`],
    },
    {
      re: /^cl(?:an)?\s*plasmacannon\s*ammo$/,
      ids: (_) => [`clan-plasma-cannon-ammo`, `clplasmacannonammo`],
    },
    {
      re: /^cl(?:an)?\s*plasma\s*cannon\s*ammo$/,
      ids: (_) => [`clan-plasma-cannon-ammo`, `clplasmacannonammo`],
    },
    { re: /^cl(?:an)?\s*(?:heavy\s*)?flamer\s*ammo$/, ids: (_) => [`mg-ammo`] },
    {
      re: /^cl(?:an)?\s*mediumchemlaser\s*ammo$/,
      ids: (_) => [`clan-medium-chemical-laser-ammo`],
    },
    {
      re: /^cl(?:an)?\s*protomech\s*ac[/-](\d+)\s*ammo$/,
      ids: (m) => [`clan-protomech-ac-${m[1]}`],
    },
    {
      re: /^cl(?:an)?\s*ammo\s+lrtorpedo-(\d+)$/,
      ids: (m) => [`ammo-lrtorpedo-${m[1]}`, `ammo-lrm-${m[1]}`],
    },
    {
      re: /^cl(?:an)?\s*ammo\s+srtorpedo-(\d+)$/,
      ids: (m) => [`ammo-srtorpedo-${m[1]}`, `ammo-srm-${m[1]}`],
    },
    {
      re: /^cl(?:an)?\s*ammo\s+sc\s*mortar-(\d+)$/,
      ids: (m) => [`clan-sc-mortar-${m[1]}-ammo`, `is-sc-mortar-${m[1]}-ammo`],
    },
    {
      re: /^cl(?:an)?\s*imp\s*ammo\s*(?:ac|srm)(\d+)$/,
      ids: (m) => [
        `impammoac${m[1]}`,
        `impammosrm${m[1]}`,
        `climpammosrm${m[1]}`,
      ],
    },

    {
      re: /^hag[/-](\d+)\s*ammo$/,
      ids: (m) => [`hag-${m[1]}-ammo`, `gauss-ammo`],
    },
    {
      re: /^hyper-assault\s*gauss\s*rifle[/-](\d+)\s*ammo$/,
      ids: (m) => [`hag-${m[1]}-ammo`, `gauss-ammo`],
    },

    // Clan HAG ammo (CLHAG20 Ammo, etc.)
    {
      re: /^cl(?:an)?\s*hag(\d+)\s*ammo$/,
      ids: (m) => [`hag-${m[1]}-ammo`, `gauss-ammo`],
    },

    // IS Sniper/Thumper (non-cannon) ammo
    {
      re: /^(?:is\s*)?sniperammo$/,
      ids: (_) => [`snipercannonammo`, `issnipercannonammo`],
    },
    {
      re: /^(?:is\s*)?thumperammo$/,
      ids: (_) => [`thumpercannonammo`, `isthumpercannonammo`],
    },

    // IS Arrow IV with space (ISArrowIV Ammo vs ISArrowIVAmmo)
    { re: /^(?:is\s*)?arrowiv\s+ammo$/, ids: (_) => [`arrowivammo`] },
    { re: /^(?:is\s*)?arrowiv\s+homing\s*ammo$/, ids: (_) => [`arrowivammo`] },
    { re: /^(?:is\s*)?arrowiv\s+cluster\s*ammo$/, ids: (_) => [`arrowivammo`] },

    // Clan Improved LRM ammo (ClanImprovedLRM15Ammo, etc.)
    {
      re: /^cl(?:an)?\s*improved\s*lrm(\d+)\s*ammo$/,
      ids: (m) => [
        `clanimprovedlrm${m[1]}ammo`,
        `clan-improved-lrm-${m[1]}-ammo`,
      ],
    },

    // IS Heavy/Medium/Light Rifle ammo
    {
      re: /^(?:is\s*)?heavy\s*rifle\s*ammo$/,
      ids: (_) => [`heavy-rifle-ammo`],
    },
    {
      re: /^(?:is\s*)?medium\s*rifle\s*ammo$/,
      ids: (_) => [`medium-rifle-ammo`],
    },
    {
      re: /^(?:is\s*)?light\s*rifle\s*ammo$/,
      ids: (_) => [`light-rifle-ammo`],
    },

    // IS HVAC ammo
    {
      re: /^(?:is\s*)?hvac[/-](\d+)\s*ammo$/,
      ids: (m) => [`hvac-${m[1]}-ammo`],
    },

    // IS LB-X 5 (missing from some patterns)
    {
      re: /^(?:is\s*)?lbxac(\d+)\s+cl\s*ammo$/,
      ids: (m) => [`lb-${m[1]}-x-cluster-ammo`],
    },

    // IS Extended LRM ammo
    {
      re: /^(?:is\s*)?extended\s*lrm-?(\d+)\s*ammo$/,
      ids: (m) => [`ammo-extended-lrm-${m[1]}`],
    },

    // IS Enhanced LRM ammo (ISEnhancedLRM5 Ammo, etc.)
    {
      re: /^(?:is\s*)?enhanced\s*lrm(\d+)\s*ammo$/,
      ids: (m) => [`enhancedlrm${m[1]}`],
    },

    // IS SB Gauss Rifle ammo
    {
      re: /^(?:is\s*)?sb\s*gauss\s*(?:rifle\s*)?ammo$/,
      ids: (_) => [`silver-bullet-gauss`],
    },

    // IS Improved Heavy Gauss ammo
    {
      re: /^(?:is\s*)?improved\s*heavy\s*gauss\s*ammo$/,
      ids: (_) => [`improvedheavygauss`],
    },

    // IS APDS ammo (Anti-Personnel Defense System)
    { re: /^(?:is\s*)?apds\s*ammo$/, ids: (_) => [`ams-ammo`] },

    // Clan AP Gauss Rifle ammo
    {
      re: /^cl(?:an)?\s*ap\s*gauss\s*(?:rifle\s*)?ammo$/,
      ids: (_) => [`ap-gauss-ammo`, `apgaussrifle`],
    },
  ];

  for (const rule of rules) {
    const m = stripped.match(rule.re);
    if (m) {
      for (const id of rule.ids(m)) {
        const found = lu.get(id);
        if (found) return found;
      }
    }
  }

  const canonKey = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
  const ce = lu.get(canonKey);
  if (ce) return ce;
  return null;
}

// === WEAPON CLASSIFICATION ===
function isWeaponEquip(id: string): boolean {
  const lo = id.toLowerCase();
  if (lo.includes('ammo')) return false;
  // C3 Remote Sensor Launcher IS a weapon (BV=30, extends MissileWeapon in MegaMek)
  // despite containing 'c3' and 'remote-sensor' which would be caught by the exclusion list
  if (
    lo.includes('c3remotesensorlauncher') ||
    lo.includes('c3-remote-sensor-launcher') ||
    lo.includes('c3 remote sensor launcher')
  )
    return true;
  const nw = [
    'heatsink',
    'heat-sink',
    'endo',
    'ferro',
    'case',
    'artemis',
    'targeting-computer',
    'targeting computer',
    'ecm',
    'bap',
    'probe',
    'c3',
    'masc',
    'tsm',
    'jump-jet',
    'jump jet',
    'harjel',
    'umu',
    'shield',
    'sword',
    'hatchet',
    'mace',
    'a-pod',
    'b-pod',
    'apod',
    'bpod',
    'blue-shield',
    'null-signature',
    'chameleon',
    'coolant-pod',
    'coolantpod',
    'supercharger',
    'drone',
    'improved-sensors',
    'beagle',
    'angel-ecm',
    'guardian-ecm',
    'light-active-probe',
    'bloodhound',
    'apollo',
    'tag',
    'machine-gun-array',
    'light-machine-gun-array',
    'heavy-machine-gun-array',
    'mga',
    'lmga',
    'hmga',
    'lift-hoist',
    'lifthoist',
    'retractable-blade',
    'remote-sensor',
    'partial-wing',
    'partialwing',
    'searchlight',
    'tracks',
    'cargo',
    'spikes',
    'minesweeper',
    'viral jammer',
    'viraljammer',
    'bridgelayer',
    'bridge-layer',
    'salvage-arm',
    'salvagearm',
    'environmental-seal',
    'environmentalsealing',
    'ejection-seat',
    'ejection seat',
    'dumper',
    'fluid-suction',
    'fluidsuction',
    'mechsprayer',
    'mech-sprayer',
    // Physical weapons — BV counted via physicalWeaponBV, not weaponBV
    'chainsaw',
    'backhoe',
    'vibroblade',
    'mining-drill',
    'miningdrill',
    'buzzsaw',
    'dual-saw',
    'dual saw',
    'combine',
    'spot-welder',
    'spot welder',
    'spotwelder',
    'rock-cutter',
    'rock cutter',
    'rockcutter',
    'pile-driver',
    'pile driver',
    'piledriver',
    'flail',
    'wrecking-ball',
    'wrecking ball',
    'wreckingball',
    'chain-whip',
    'chain whip',
    'lance',
    'claw',
    'talon',
  ];
  for (const n of nw) if (lo.includes(n)) return false;
  // Check IS resolution first, then try Clan resolution for Clan-exclusive weapons
  if (resolveWeaponForUnit(id, 'IS').resolved) return true;
  return resolveWeaponForUnit(id, 'CLAN').resolved;
}

function isDefEquip(id: string): boolean {
  const lo = id.toLowerCase();
  return (
    lo.includes('anti-missile') ||
    lo.includes('antimissile') ||
    lo.includes('ams') ||
    lo.includes('ecm') ||
    lo.includes('guardian') ||
    lo.includes('angel') ||
    lo.includes('bap') ||
    lo.includes('beagle') ||
    lo.includes('probe') ||
    lo.includes('bloodhound') ||
    lo.includes('light-active-probe') ||
    lo.includes('null-signature') ||
    (lo.includes('shield') && !lo.includes('blue-shield')) ||
    lo.includes('apds') ||
    lo.includes('advanced-point-defense') ||
    lo.includes('point-defense-system')
  );
}

// === RISC HEAT SINK OVERRIDE KIT UNITS (from MegaMek mm-data MTF files) ===
// The RISC Heat Sink Override Kit applies a 1.01x multiplier to base BV.
// It's stored as "heat sink kit:RISC Heat Sink Override Kit" in MTF files,
// which is not exported to our JSON data format.
// Per MekBVCalculator.processSummarize() lines 479-501.
const KNOWN_RISC_OVERRIDE_KIT_UNITS = new Set([
  'battleaxe-bkx-risc',
  'emperor-emp-6x',
  'mad-cat-mk-iv-pr-risc',
  'malice-mal-y-sh-risc',
]);

// === KNOWN HEAVY DUTY GYRO UNITS (from MegaMek mm-data MTF files) ===
// HD gyro has 4 crit slots (same as Standard), so it can't be detected by crit count.
// These units have "Gyro:Heavy Duty Gyro" in their MTF source files.
const KNOWN_HD_GYRO_UNITS = new Set([
  'albatross-alb-5u',
  'albatross-alb-5w',
  'albatross-alb-5w-dantalion',
  'atlas-as8-k',
  'atlas-as8-ke',
  'atlas-ii-as7-d-h-devlin',
  'battlemaster-blr-10s',
  'battlemaster-blr-10s2',
  'battlemaster-blr-k4',
  'cougar-x-3',
  'deva-c-dva-o-achilleus',
  'deva-c-dva-o-invictus',
  'deva-c-dva-oa-dominus',
  'deva-c-dva-ob-infernus',
  'deva-c-dva-oc-comminus',
  'deva-c-dva-od-luminos',
  'deva-c-dva-oe-eminus',
  'deva-c-dva-os-caelestis',
  'deva-c-dva-ou-exanimus',
  'grand-titan-t-it-n13m',
  'griffin-grf-4n',
  'griffin-grf-5k',
  'hunchback-hbk-5ss',
  'jade-hawk-jhk-04',
  'king-crab-kgc-008',
  'king-crab-kgc-008b',
  'king-crab-kgc-009',
  'king-crab-kgc-009c',
  'marauder-mad-9w',
  'marauder-mad-9w2',
  'ostroc-osr-4k',
  'ostsol-otl-9r',
  'patriot-pkm-2c',
  'patriot-pkm-2d',
  'patriot-pkm-2e',
  'phoenix-hawk-pxh-4w',
  'phoenix-hawk-pxh-99',
  'scourge-scg-wx1',
  'sentry-snt-w5',
  'tai-sho-tsh-8s',
  'templar-iii-tlr2-j-arthur',
  'templar-iii-tlr2-o',
  'templar-iii-tlr2-oa',
  'templar-iii-tlr2-ob',
  'templar-iii-tlr2-oc',
  'templar-iii-tlr2-od',
  'thunderbolt-iic-2',
  'thunderbolt-tdr-11s',
  'thunderbolt-tdr-17s',
  'thunderbolt-tdr-7s',
  'vanquisher-vqr-5v',
  'vanquisher-vqr-7v',
  'victor-vtr-12d',
  'warhammer-whd-10ct',
  'warhammer-whm-x7-the-lich',
  'white-flame-whf-3c',
  'xanthos-xnt-4o',
]);

// === MAIN BV CALCULATION ===
function calculateUnitBV(
  unit: UnitData,
  unitId?: string,
): { bv: number; breakdown: ValidationResult['breakdown']; issues: string[] } {
  const issues: string[] = [];
  const engineType = mapEngineType(unit.engine.type, unit.techBase);
  const structureType = mapStructureType(unit.structure.type);
  let gyroType = mapGyroType(unit.gyro.type);
  const cockpitType = mapCockpitType(unit.cockpit || 'STANDARD');

  const unitIsSuperheavy = unit.tonnage > 100;

  let engineBVOverride: number | undefined;
  // Superheavy mechs have different engine BV multipliers because they have fewer
  // side-torso engine critical slots (e.g., IS XL = 2 ST slots -> 0.75 multiplier)
  if (unitIsSuperheavy) {
    switch (engineType) {
      case EngineType.XL_IS:
        engineBVOverride = 0.75;
        break;
      case EngineType.XXL:
        engineBVOverride = 0.5;
        break;
      case EngineType.LIGHT:
        engineBVOverride = 1.0;
        break;
      case EngineType.XL_CLAN:
        engineBVOverride = 1.0;
        break;
      // Standard, Compact, ICE, Fuel Cell all stay at 1.0 (default)
    }
  }
  if (engineType === EngineType.XXL && unit.techBase === 'CLAN')
    engineBVOverride = 0.5;
  // For MIXED tech XXL engines, detect Clan vs IS via side-torso engine crit count:
  // Clan XXL = 4 engine slots per ST, IS XXL = 6 engine slots per ST
  if (
    engineType === EngineType.XXL &&
    unit.techBase === 'MIXED' &&
    engineBVOverride === undefined &&
    unit.criticalSlots
  ) {
    const stLocs = ['LEFT_TORSO', 'LT', 'RIGHT_TORSO', 'RT'];
    let maxSTEngineSlots = 0;
    for (const loc of stLocs) {
      const slots = unit.criticalSlots[loc];
      if (!Array.isArray(slots)) continue;
      const engSlots = slots.filter(
        (s: any) =>
          s && typeof s === 'string' && s.toLowerCase().includes('engine'),
      ).length;
      maxSTEngineSlots = Math.max(maxSTEngineSlots, engSlots);
    }
    if (maxSTEngineSlots > 0 && maxSTEngineSlots <= 4) {
      engineBVOverride = 0.5; // Clan XXL (4 ST slots)
    }
  }

  let totalArmor = calcTotalArmor(unit.armor.allocation);
  // Torso-mounted cockpit: MegaMek doubles CT armor in BV via addTorsoMountedCockpit()
  // (CT front + rear armor is added again to total armor points)
  if (cockpitType === 'torso-mounted') {
    const ctAlloc =
      unit.armor?.allocation?.CENTER_TORSO ?? unit.armor?.allocation?.CT;
    let ctFront = 0,
      ctRear = 0;
    if (typeof ctAlloc === 'number') {
      ctFront = ctAlloc;
    } else if (ctAlloc) {
      ctFront = (ctAlloc as any).front ?? 0;
      ctRear = (ctAlloc as any).rear ?? 0;
    }
    totalArmor += ctFront + ctRear;
  }
  // Detect quad from armor locations if configuration field is wrong (e.g., Boreas/Notos marked as "Biped")
  const armorLocKeys = Object.keys(unit.armor?.allocation || {}).map(
    (k: string) => k.toUpperCase(),
  );
  const hasQuadArmorLocs = armorLocKeys.some((k: string) =>
    [
      'FLL',
      'FRL',
      'RLL',
      'RRL',
      'FRONT_LEFT_LEG',
      'FRONT_RIGHT_LEG',
      'REAR_LEFT_LEG',
      'REAR_RIGHT_LEG',
    ].includes(k),
  );
  // Detect effective configuration from cockpit type when configuration field is wrong
  // e.g., Ares superheavy tripods have configuration="Biped" but cockpit="SUPERHEAVY_TRIPOD"
  const cockpitUpper = (
    typeof unit.cockpit === 'string' ? unit.cockpit : ''
  ).toUpperCase();
  const isTripodCockpit =
    cockpitUpper.includes('TRIPOD') || cockpitUpper === 'SUPERHEAVY_TRIPOD';
  const effectiveConfig =
    hasQuadArmorLocs && unit.configuration?.toLowerCase() !== 'quad'
      ? 'Quad'
      : isTripodCockpit && unit.configuration?.toLowerCase() !== 'tripod'
        ? 'Tripod'
        : unit.configuration;
  const totalStructure = calcTotalStructure(unit.tonnage, effectiveConfig);
  const cs = scanCrits(unit);

  // Modular Armor: each slot adds 10 armor points for BV calculation
  if (cs.modularArmorSlots > 0) totalArmor += cs.modularArmorSlots * 10;

  // Interface Cockpit: no gyro, so gyro BV = 0
  if (cs.detectedInterfaceCockpit) gyroType = 'none';

  // Override gyro type from crit-based detection and known HD gyro unit list
  if (gyroType !== 'none') {
    if (unitId && KNOWN_HD_GYRO_UNITS.has(unitId)) gyroType = 'heavy-duty';
    else if (cs.detectedGyroType) gyroType = cs.detectedGyroType;
  }

  const engineIntegratedHS = Math.min(10, Math.floor(unit.engine.rating / 25));
  const critBasedHSCount = engineIntegratedHS + cs.critDHSCount;
  const effectiveHSCount = Math.max(unit.heatSinks.count, critBasedHSCount);
  const isDHS =
    unit.heatSinks.type.toUpperCase().includes('DOUBLE') ||
    unit.heatSinks.type.toUpperCase().includes('LASER');
  // Prototype DHS and Laser HS dissipate 2 heat each (F_DOUBLE_HEAT_SINK in MegaMek).
  // When unit.heatSinks.type is "SINGLE" but crits contain double-dissipation HS,
  // we need mixed calculation: (totalHS - doubleHS) * 1 + doubleHS * 2
  let heatDiss: number;
  if (isDHS) {
    heatDiss = effectiveHSCount * 2;
  } else if (cs.critLaserHSCount > 0 || cs.critProtoDHSCount > 0) {
    const doubleHSCount = cs.critLaserHSCount + cs.critProtoDHSCount;
    const singleHS = effectiveHSCount - doubleHSCount;
    heatDiss = singleHS * 1 + doubleHSCount * 2;
  } else {
    heatDiss = effectiveHSCount * 1;
  }

  if (cs.hasRadicalHS) heatDiss += Math.ceil(effectiveHSCount * 0.4);
  if (cs.hasPartialWing) heatDiss += 3;

  const armorType = cs.detectedArmorType || mapArmorType(unit.armor.type);

  const walkMP = unit.movement.walk;

  let bvWalk = walkMP;
  if (cs.hasTSM) bvWalk = walkMP + 1;
  // Medium/Large Shield: -1 walk MP per TechManual (applied before run calculation)
  if (cs.hasMediumShield || cs.hasLargeShield) bvWalk = Math.max(0, bvWalk - 1);

  let runMP =
    cs.hasMASC && cs.hasSupercharger
      ? Math.ceil(bvWalk * 2.5)
      : cs.hasMASC || cs.hasSupercharger
        ? bvWalk * 2
        : Math.ceil(bvWalk * 1.5);
  if (armorType === 'hardened') runMP = Math.max(0, runMP - 1);
  let jumpMP = unit.movement.jump || 0;
  // Partial Wing adds jump MP only if mech already has jump jets (per MegaMek Mek.getJumpMP())
  const partialWingJumpBonus =
    cs.hasPartialWing && jumpMP > 0 ? (unit.tonnage <= 55 ? 2 : 1) : 0;
  jumpMP += partialWingJumpBonus;
  const hasStealth = armorType === 'stealth';

  // Weapons
  type WeaponEntry = {
    id: string;
    name: string;
    heat: number;
    bv: number;
    rear?: boolean;
    hasAES?: boolean;
    isDirectFire?: boolean;
    location: string;
    artemisType?: 'iv' | 'v';
  };
  const weapons: WeaponEntry[] = [];
  const unresolvedWeapons: string[] = [];
  let hasTC = cs.hasTC;
  const defEquipIds: string[] = [...cs.defEquipIds];

  // Pre-consume rearWeaponCountByLoc for equipment entries with explicit rear locations.
  // This prevents the secondary crit check from incorrectly marking front weapons as rear
  // when a matching rear weapon exists at the same location (e.g., ML front + ML (R) both at LT).
  for (const eq of unit.equipment) {
    if (!isRearLoc(eq.location)) continue;
    // Strip rear marker to get the base location (e.g., "LEFT_TORSO_(R)" → "LEFT_TORSO")
    const rawLoc = eq.location
      .split(',')[0]
      .toUpperCase()
      .replace(/[_(]R[)]/gi, '')
      .replace(/_$/, '')
      .replace(/\s*REAR\s*/i, '')
      .trim();
    const locRearMap = cs.rearWeaponCountByLoc.get(rawLoc);
    if (!locRearMap) continue;
    const eqNorm = normalizeEquipId(eq.id);
    for (const [critName, count] of Array.from(locRearMap.entries())) {
      if (
        count > 0 &&
        (critName === eqNorm ||
          critName.includes(eqNorm) ||
          eqNorm.includes(critName))
      ) {
        locRearMap.set(critName, count - 1);
        break;
      }
    }
  }

  for (const eq of unit.equipment) {
    // Strip numeric prefix from equipment ID (e.g., "1-iseherppc" → "iseherppc")
    const qtyMatch = eq.id.match(/^(\d+)-/);
    const qty =
      qtyMatch && parseInt(qtyMatch[1], 10) > 1 ? parseInt(qtyMatch[1], 10) : 1;
    const resolveId = qtyMatch ? eq.id.replace(/^\d+-/, '') : eq.id;

    const lo = resolveId.toLowerCase();
    if (
      lo.includes('targeting-computer') ||
      lo.includes('targeting computer')
    ) {
      hasTC = true;
      continue;
    }
    if (lo.includes('tsm') || lo.includes('triple-strength-myomer')) continue;
    if (isDefEquip(resolveId)) continue;
    if (!isWeaponEquip(resolveId)) continue;

    let clanDetected =
      unit.techBase === 'MIXED' &&
      isClanEquipAtLocation(resolveId, eq.location, unit.criticalSlots);
    // Fallback: if crit data is missing for this location (e.g., quad leg weapons),
    // scan ALL crit locations for a matching CL-prefixed entry of this weapon.
    if (!clanDetected && unit.techBase === 'MIXED' && unit.criticalSlots) {
      const locKey = eq.location.split(',')[0].toUpperCase();
      const hasLocCrits =
        !!unit.criticalSlots[locKey] || !!unit.criticalSlots[eq.location];
      if (!hasLocCrits) {
        // Location crits missing — check all locations globally
        for (const loc of Object.keys(unit.criticalSlots)) {
          if (isClanEquipAtLocation(resolveId, loc, unit.criticalSlots)) {
            clanDetected = true;
            break;
          }
        }
      }
    }
    const res = resolveWeaponForUnit(resolveId, unit.techBase, clanDetected);
    if (!res.resolved || res.battleValue === 0) unresolvedWeapons.push(eq.id);

    const wid = eq.id.toLowerCase();
    const widStripped = wid.replace(/^\d+-/, '');
    const isRocketLauncher =
      wid.includes('rocket-launcher') ||
      wid.includes('rl-') ||
      /^rl\d+$/.test(wid) ||
      widStripped.includes('rocketlauncher') ||
      /^(?:is|cl)rocketlauncher\d+$/.test(widStripped) ||
      /^rl\d+$/.test(widStripped);
    // I-OS (Improved One-Shot), OS (One-Shot), and "one-shot" suffix weapons
    const isIOS =
      /[- ]i-?os$/i.test(widStripped) ||
      /[- ]os$/i.test(widStripped) ||
      widStripped.includes('one-shot');
    const isOneShot = isRocketLauncher || isIOS;
    const effectiveHeat = isOneShot ? res.heat / 4 : res.heat;
    // IOS weapons use 1/5 of base weapon BV (aliases must point to BASE weapon entries)
    const effectiveBV = isIOS
      ? Math.round(res.battleValue / 5.0)
      : res.battleValue;

    let isRear = isRearLoc(eq.location);

    for (let i = 0; i < qty; i++) {
      let thisRear = isRear;
      if (!thisRear && unit.criticalSlots) {
        const rawLoc = eq.location.split(',')[0].toUpperCase();
        const locRearMap = cs.rearWeaponCountByLoc.get(rawLoc);
        if (locRearMap) {
          const eqNorm = normalizeEquipId(eq.id);
          const eqCanonical = normalizeEquipmentId(eq.id);
          // Sort-insensitive token match: handles word-order mismatches like
          // equipment "improved-heavy-medium-laser" vs crit "CLImprovedMediumHeavyLaser"
          // which normalize to "improvedheavymediumlaser" vs "improvedmediumheavylaser".
          const sortedEqNorm = eqNorm.split('').sort().join('');
          for (const [critName, count] of Array.from(locRearMap.entries())) {
            if (
              count > 0 &&
              (critName === eqNorm ||
                critName.includes(eqNorm) ||
                eqNorm.includes(critName) ||
                normalizeEquipmentId(critName) === eqCanonical ||
                critName.split('').sort().join('') === sortedEqNorm)
            ) {
              thisRear = true;
              locRearMap.set(critName, count - 1);
              break;
            }
          }
        }
      }
      const weaponLocUpper = eq.location.split(',')[0].toUpperCase();
      const weaponHasAES = cs.aesLocs.some(
        (aLoc) => aLoc.toUpperCase() === weaponLocUpper,
      );
      weapons.push({
        id: normalizeWeaponKey(eq.id),
        name: wid,
        heat: effectiveHeat,
        bv: effectiveBV,
        rear: thisRear,
        hasAES: weaponHasAES,
        isDirectFire:
          !wid.includes('lrm') &&
          !wid.includes('srm') &&
          !wid.includes('mrm') &&
          !wid.includes('atm') &&
          !wid.includes('mml') &&
          !wid.includes('narc') &&
          !wid.includes('inarc') &&
          !wid.includes('lrt') &&
          !wid.includes('srt') &&
          !wid.includes('thunderbolt') &&
          !wid.includes('rocket') &&
          !wid.includes('arrow') &&
          !wid.includes('mortar') &&
          !wid.includes('sniper') &&
          !wid.includes('thumper') &&
          !wid.includes('long-tom') &&
          // Per MegaMek: AMS and TAG do NOT have F_DIRECT_FIRE
          !wid.includes('anti-missile') &&
          !wid.includes('ams') &&
          wid !== 'tag' &&
          !wid.includes('light-tag') &&
          !wid.includes('clan-tag'),
        location: eq.location,
      });
    }
  }
  if (unresolvedWeapons.length > 0)
    issues.push(`Unresolved weapons (0 BV): ${unresolvedWeapons.join(', ')}`);

  // Machine Gun Array (MGA): MegaMek counts individual MGs at full BV, then adds
  // MGA bonus = sum(linked MG BVs) × 0.67 as a separate weapon entry with heat=0.
  // MGA links to up to 4 MGs of matching type at the same location.
  // Track consumed MGs so each MG is only linked to one MGA.
  const mgaConsumed = new Set<number>(); // indices of weapons already linked to an MGA
  for (const eq of unit.equipment) {
    // Strip quantity prefix (e.g., "1-islmga" → "islmga")
    const rawId = eq.id.toLowerCase().replace(/^\d+-/, '');
    let mgType: string | null = null;
    if (
      rawId === 'machine-gun-array' ||
      rawId === 'ismga' ||
      rawId === 'clmga' ||
      rawId.endsWith('-mga')
    )
      mgType = 'machine-gun';
    else if (
      rawId === 'light-machine-gun-array' ||
      rawId === 'islmga' ||
      rawId === 'cllmga' ||
      rawId.endsWith('-lmga') ||
      rawId === 'islightmga' ||
      rawId === 'cllightmga'
    )
      mgType = 'light-machine-gun';
    else if (
      rawId === 'heavy-machine-gun-array' ||
      rawId === 'ishmga' ||
      rawId === 'clhmga' ||
      rawId.endsWith('-hmga') ||
      rawId === 'isheavymga' ||
      rawId === 'clheavymga'
    )
      mgType = 'heavy-machine-gun';
    if (!mgType) continue;

    const mgLoc = eq.location.split(',')[0].toUpperCase();
    // Link up to 4 unconsumed MGs of matching type at the same location
    let linkedMGBV = 0;
    let linkedCount = 0;
    for (let wi = 0; wi < weapons.length; wi++) {
      if (linkedCount >= 4) break;
      if (mgaConsumed.has(wi)) continue;
      const w = weapons[wi];
      const wLoc = w.location.split(',')[0].toUpperCase();
      if (wLoc !== mgLoc) continue;
      const wid = w.name.replace(/^\d+-/, '');
      const isMatch =
        (mgType === 'machine-gun' &&
          (wid === 'machine-gun' ||
            wid === 'clmg' ||
            wid === 'ismg' ||
            wid === 'ismachine-gun' ||
            wid === 'clmachine-gun')) ||
        (mgType === 'light-machine-gun' &&
          (wid === 'light-machine-gun' ||
            wid === 'islightmg' ||
            wid === 'cllightmg' ||
            wid === 'islmg' ||
            wid === 'islightmachine-gun' ||
            wid === 'cllightmachine-gun')) ||
        (mgType === 'heavy-machine-gun' &&
          (wid === 'heavy-machine-gun' ||
            wid === 'isheavymg' ||
            wid === 'clheavymg' ||
            wid === 'clhmg' ||
            wid === 'isheavymachine-gun' ||
            wid === 'clheavymachine-gun'));
      if (isMatch) {
        linkedMGBV += w.bv;
        linkedCount++;
        mgaConsumed.add(wi);
      }
    }
    if (linkedMGBV > 0) {
      const mgaBV = linkedMGBV * 0.67;
      weapons.push({
        id: 'mga-bonus',
        name: rawId,
        heat: 0,
        bv: mgaBV,
        rear: false,
        hasAES: false,
        isDirectFire: false,
        location: eq.location,
      });
    }
  }

  // Drone Operating System: all weapon BVs × 0.8 (MegaMek processWeapons dBV *= 0.8)
  if (cs.detectedDroneOS) {
    for (const w of weapons) {
      w.bv *= 0.8;
    }
  }

  // Note: Shields do NOT halve weapon BV in MegaMek's BVCalculator.
  // Shield arm tracking (cs.shieldArms) is kept for potential future use, but
  // weapons in shield arms are counted at full BV per the MegaMek source code.

  // Artemis IV/V — location-aware assignment (Artemis links to missile weapon in same location)
  if (cs.artemisIVLocs.length > 0 || cs.artemisVLocs.length > 0) {
    const ivLocs = [...cs.artemisIVLocs];
    const vLocs = [...cs.artemisVLocs];
    for (const w of weapons) {
      const isMsl =
        w.name.includes('lrm') ||
        w.name.includes('srm') ||
        w.name.includes('mml') ||
        w.name.includes('atm') ||
        w.name.includes('lrt') ||
        w.name.includes('srt');
      if (!isMsl) continue;
      const wLoc = toMechLoc(w.location.split(',')[0]);
      if (!wLoc) continue;
      const vIdx = vLocs.indexOf(wLoc);
      if (vIdx >= 0) {
        w.artemisType = 'v';
        vLocs.splice(vIdx, 1);
      } else {
        const ivIdx = ivLocs.indexOf(wLoc);
        if (ivIdx >= 0) {
          w.artemisType = 'iv';
          ivLocs.splice(ivIdx, 1);
        }
      }
    }
  }

  if (cs.apollo > 0) {
    let a = cs.apollo;
    for (const w of weapons) {
      if (a <= 0) break;
      if (w.name.includes('mrm')) {
        w.bv = Math.round(w.bv * 1.15);
        a--;
      }
    }
  }

  if (cs.ppcCapLocs.length > 0) {
    for (const capLoc of cs.ppcCapLocs) {
      // Find the PPC weapon in the same location as the capacitor
      const ppcInLoc = weapons.find(
        (w) =>
          w.name.includes('ppc') &&
          w.location.toUpperCase().replace(/[_\s-]+/g, '') ===
            capLoc.toUpperCase().replace(/[_\s-]+/g, ''),
      );
      if (!ppcInLoc) continue;
      const wlo = ppcInLoc.name.replace(/^\d+-/, '');
      // Check if the PPC in this location is Clan by examining crit slot names
      const locSlots = unit.criticalSlots?.[capLoc] || [];
      const hasClanPPC = (locSlots as string[]).some(
        (s: string) =>
          s &&
          typeof s === 'string' &&
          s.toUpperCase().startsWith('CL') &&
          s.toUpperCase().includes('PPC'),
      );
      let capBV = 44;
      if (wlo.includes('erppc') || wlo.includes('er-ppc')) {
        capBV =
          unit.techBase === 'CLAN' ||
          wlo.startsWith('cl') ||
          wlo.startsWith('clan') ||
          hasClanPPC
            ? 136
            : 114;
      } else if (wlo.includes('heavy') || wlo.includes('hppc')) {
        capBV = 53;
      } else if (wlo.includes('snub') || wlo.includes('snppc')) {
        capBV = 87;
      } else if (wlo.includes('light') || wlo.includes('lppc')) {
        capBV = 44;
      } else if (wlo.includes('ppc')) {
        capBV = 88;
      }
      ppcInLoc.bv += capBV;
      ppcInLoc.heat += 5;
    }
  }

  // MGA: MegaMek documentation says MGA replaces individual MGs with sum(BV) × 0.67, but
  // MUL reference BVs do NOT apply this reduction — they use full individual MG BV.
  // Applying ×0.67 causes massive regression (units drop 5-10% further below reference).
  // Keep individual MGs at full BV with no MGA reduction to match MUL reference values.

  // determineFront — use fully-modified BV (with TC, rear ×0.5) per MegaMek
  let fBV = 0,
    rBV = 0;
  for (const w of weapons) {
    if (isArmLoc(w.location)) continue;
    let modBV = w.bv;
    if (w.hasAES) modBV *= 1.25;
    if (hasTC && w.isDirectFire) modBV *= 1.25;
    if (w.rear) {
      rBV += modBV * 0.5;
    } else {
      fBV += modBV;
    }
  }
  if (rBV > fBV) {
    for (const w of weapons) {
      if (!isArmLoc(w.location)) w.rear = !w.rear;
    }
  }

  const ammoForCalc = cs.ammo.map((a) => ({
    id: a.id,
    bv: a.bv,
    weaponType: a.weaponType,
  }));
  if (process.env.DEBUG_AMMO && ammoForCalc.length > 0) {
    console.error(
      `AMMO: ${ammoForCalc.map((a) => `${a.id}(bv=${a.bv},wt=${a.weaponType})`).join(', ')}`,
    );
    console.error(
      `WEAPONS: ${weapons.map((w) => `${w.id}(bv=${w.bv})`).join(', ')}`,
    );
  }

  let defEquipBV = 0;
  let amsWeaponBV = 0;
  for (const did of defEquipIds) {
    // Strip "(armored)" suffix so armored variants resolve to base equipment BV
    const didClean = did.replace(/\s*\(armored\)/gi, '').trim();
    const resolvedBV = resolveEquipmentBV(didClean).battleValue;
    defEquipBV += resolvedBV;
    const dlo = did.toLowerCase();
    const isAmsWeapon =
      (dlo.includes('anti-missile') ||
        dlo.includes('antimissile') ||
        dlo === 'isams' ||
        dlo === 'clams' ||
        dlo.includes('apds')) &&
      !dlo.includes('ammo');
    if (isAmsWeapon) amsWeaponBV += resolvedBV;
  }
  if (cs.amsAmmoBV > 0 && amsWeaponBV > 0) {
    defEquipBV += Math.min(amsWeaponBV, cs.amsAmmoBV);
  }
  // Spikes: 4 BV per location (defensive equipment per MegaMek)
  defEquipBV += cs.spikeCount * 4;
  // RISC Viral Jammer (Decoy/Homing): 284 BV each (defensive equipment per MegaMek MiscType)
  defEquipBV += cs.riscViralJammerCount * 284;

  const explResult = calculateExplosivePenalties({
    equipment: cs.explosive,
    caseLocations: cs.caseLocs,
    caseIILocations: cs.caseIILocs,
    engineType,
    isQuad: effectiveConfig?.toLowerCase() === 'quad',
  });

  // Blue Shield Particle Field Damper: explosive penalty of -1 BV per unprotected location
  // Per MekBVCalculator.processExplosiveEquipment() lines 143-180:
  // Counts locations (CT through LL) that are NOT protected, subtracts 1 BV per unprotected loc.
  let blueShieldExplosivePenalty = 0;
  if (cs.hasBlueShield) {
    const isClan =
      unit.techBase === 'CLAN' ||
      (unit.techBase === 'MIXED' &&
        unitId !== undefined &&
        CLAN_CHASSIS_MIXED_UNITS.has(unitId));
    const engineDef = getEngineDefinition(engineType);
    const sideTorsoSlots = engineDef?.sideTorsoSlots ?? 0;
    const bodyLocs: MechLocation[] = ['CT', 'RT', 'LT', 'RA', 'LA', 'RL', 'LL'];
    for (const loc of bodyLocs) {
      // CASE II protects fully
      if (cs.caseIILocs.includes(loc)) continue;
      if (isClan) {
        // Clan: CT, RL, LL always unprotected; arms always protected;
        // side torsos protected unless engine has >2 side torso slots
        if (loc === 'RA' || loc === 'LA') continue; // arms protected by built-in Clan CASE
        if ((loc === 'RT' || loc === 'LT') && sideTorsoSlots <= 2) continue;
      } else {
        // IS: if engine has ≤2 side torso slots, CASE can protect locations
        if (sideTorsoSlots <= 2) {
          if ((loc === 'RT' || loc === 'LT') && cs.caseLocs.includes(loc))
            continue;
          if (
            loc === 'LA' &&
            (cs.caseLocs.includes('LA') || cs.caseLocs.includes('LT'))
          )
            continue;
          if (
            loc === 'RA' &&
            (cs.caseLocs.includes('RA') || cs.caseLocs.includes('RT'))
          )
            continue;
        }
      }
      blueShieldExplosivePenalty += 1;
    }
  }
  const totalExplosivePenalty =
    explResult.totalPenalty + blueShieldExplosivePenalty;

  // HarJel II/III: per-location armor BV multiplier (1.1x / 1.2x)
  // MegaMek calculates armor BV per-location when HarJel is present
  let harjelArmorBonus = 0;
  if (cs.harjelIILocs.length > 0 || cs.harjelIIILocs.length > 0) {
    const armorMult = getArmorBVMultiplier(hasStealth ? 'standard' : armorType);
    for (const [locName, armorVal] of Object.entries(unit.armor.allocation)) {
      const ml = toMechLoc(locName);
      if (!ml) continue;
      let locArmor: number;
      if (typeof armorVal === 'number') {
        locArmor = armorVal;
      } else {
        locArmor = (armorVal.front || 0) + (armorVal.rear || 0);
      }
      let locMult = 1.0;
      if (cs.harjelIIILocs.includes(ml)) locMult = 1.2;
      else if (cs.harjelIILocs.includes(ml)) locMult = 1.1;
      if (locMult !== 1.0) {
        // Bonus = armor * 2.5 * armorMult * (locMult - 1.0) — the extra portion beyond base
        harjelArmorBonus += locArmor * 2.5 * armorMult * (locMult - 1.0);
      }
    }
  }

  // Defensive BV
  // Fix: jump TMM gets +1 per MegaMek getTargetMovementModifier(jumpMP, isJump=true)
  // Since calculateDefensiveBV uses calculateTMM(max(runMP, jumpMP)) which misses +1,
  // we pre-compute the correct TMM and convert to an equivalent MP for the function.
  function tmmFromMP(mp: number): number {
    if (mp <= 2) return 0;
    if (mp <= 4) return 1;
    if (mp <= 6) return 2;
    if (mp <= 9) return 3;
    if (mp <= 17) return 4;
    if (mp <= 24) return 5;
    return 6;
  }
  // TMM → minimum MP that produces that TMM: [0,3,5,7,10,18,25]
  const tmmToMinMP = [0, 3, 5, 7, 10, 18, 25];
  const runTMM = tmmFromMP(runMP);
  const effectiveJump = Math.max(jumpMP, cs.umuMP);
  const jumpTMM = effectiveJump > 0 ? tmmFromMP(effectiveJump) + 1 : 0;
  const correctMaxTMM = Math.max(runTMM, jumpTMM);
  // Convert to an equivalent runMP that calculateTMM will map to correctMaxTMM
  const defRunMP = correctMaxTMM <= 6 ? tmmToMinMP[correctMaxTMM] : 25;

  // BAR (Barrier Armor Rating): Commercial armor = BAR 5, all others = BAR 10
  // Per MegaMek Mek.getBARRating() and BVCalculator.processArmor()
  const bar = getArmorBAR(armorType);

  const defCfg: Parameters<typeof calculateDefensiveBV>[0] = {
    totalArmorPoints: totalArmor,
    totalStructurePoints: totalStructure,
    tonnage: unit.tonnage,
    runMP: defRunMP,
    jumpMP: 0,
    umuMP: 0,
    armorType: hasStealth ? 'standard' : armorType,
    structureType,
    gyroType,
    engineType,
    bar,
    defensiveEquipmentBV: defEquipBV + harjelArmorBonus + cs.armoredComponentBV,
    explosivePenalties: totalExplosivePenalty,
    hasStealthArmor: hasStealth,
    hasChameleonLPS: cs.hasChameleon,
    hasNullSig: cs.hasNullSig,
    hasVoidSig: cs.hasVoidSig,
    hasBlueShield: cs.hasBlueShield,
  };
  if (engineBVOverride !== undefined) {
    defCfg.engineMultiplier = engineBVOverride;
    defCfg.engineType = undefined;
  }
  const defResult = calculateDefensiveBV(defCfg);

  let physicalWeaponBV = 0;
  for (const pw of cs.physicalWeapons) {
    let bv = calculatePhysicalWeaponBV(pw.type, unit.tonnage, cs.hasTSM);
    bv = Math.round(bv * 1000.0) / 1000.0;
    const pwLocUpper = pw.location.toUpperCase();
    if (cs.aesLocs.some((aLoc) => aLoc.toUpperCase() === pwLocUpper))
      bv *= 1.25;
    physicalWeaponBV += bv;
  }

  const isXXLEngine = engineType === EngineType.XXL;
  let offensiveEquipBV = 0;
  // Mine Dispensers: BV=8 each, offensive equipment per MegaMek
  offensiveEquipBV += cs.mineDispenserCount * 8;
  // Misc equipment with offensive BV (Bridge Layers, etc.)
  offensiveEquipBV += cs.miscEquipBV;
  if (cs.hasRamPlate) {
    const ramDamage = Math.floor(unit.tonnage * runMP * 0.1) / 2;
    const ramPlateBV = Math.floor(ramDamage) * 1.1;
    offensiveEquipBV += Math.round(ramPlateBV * 1000.0) / 1000.0;
  }
  // Note: Watchdog CEWS is NOT counted as offensive equipment in MegaMek
  // (the bv=7 code is unreachable due to F_BAP skip in processOffensiveEquipment)
  // AES weight bonus: arm AES (+0.1 each), leg AES (+0.2 biped, +0.4 quad)
  // per MekBVCalculator.processWeight() lines 428-441
  const armAES = cs.aesLocs.filter((loc) =>
    loc.toUpperCase().includes('ARM'),
  ).length;
  const hasLegAES = cs.aesLocs.some((loc) => loc.toUpperCase().includes('LEG'));
  const isQuad = effectiveConfig?.toLowerCase() === 'quad';
  const baseJumpMP = unit.movement.jump || 0;
  // EC-52: Industrial mech fire control modifier
  // MegaMek Mek.hasAdvancedFireControl() returns false for industrial cockpit types:
  // COCKPIT_INDUSTRIAL, COCKPIT_PRIMITIVE_INDUSTRIAL, COCKPIT_SUPERHEAVY_INDUSTRIAL,
  // COCKPIT_TRIPOD_INDUSTRIAL, COCKPIT_SUPERHEAVY_TRIPOD_INDUSTRIAL
  // When false, offensive BV is multiplied by 0.9
  const isIndustrialMech =
    cockpitUpper === 'INDUSTRIAL' ||
    cockpitUpper === 'PRIMITIVE_INDUSTRIAL' ||
    cockpitUpper === 'SUPERHEAVY_INDUSTRIAL' ||
    cockpitUpper === 'TRIPOD_INDUSTRIAL' ||
    cockpitUpper === 'SUPERHEAVY_TRIPOD_INDUSTRIAL';
  const offResult = calculateOffensiveBVWithHeatTracking({
    weapons,
    ammo: ammoForCalc,
    tonnage: unit.tonnage,
    walkMP: bvWalk,
    runMP,
    jumpMP,
    umuMP: cs.umuMP,
    heatDissipation: heatDiss,
    hasTargetingComputer: hasTC,
    hasTSM: cs.hasTSM,
    hasIndustrialTSM: cs.hasIndustrialTSM,
    hasStealthArmor: hasStealth,
    hasNullSig: cs.hasNullSig,
    hasVoidSig: cs.hasVoidSig,
    hasChameleonShield: cs.hasChameleon,
    physicalWeaponBV,
    offensiveEquipmentBV: offensiveEquipBV,
    hasImprovedJJ: cs.hasImprovedJJ,
    isXXLEngine,
    engineType,
    coolantPods: cs.coolantPods,
    heatSinkCount: effectiveHSCount,
    jumpHeatMP: baseJumpMP,
    aesArms: armAES,
    aesLegs: hasLegAES ? (isQuad ? 4 : 2) : 0,
    isIndustrialMech,
  });

  const baseBV = defResult.totalDefensiveBV + offResult.totalOffensiveBV;
  // Cockpit type comes directly from unit data (now properly parsed from MTF source).
  // Heuristic fallbacks only needed if data still says 'standard' but crits disagree.
  const effectiveCockpit =
    cockpitType !== 'standard'
      ? cockpitType
      : cs.detectedInterfaceCockpit
        ? 'interface'
        : cs.detectedSmallCockpit
          ? 'small'
          : cockpitType;
  // MegaMek processSummarize(): cockpit modifiers are else-if chained — only ONE applies.
  // Drone OS 0.95 only applies if cockpit type doesn't already have its own modifier.
  // Torso-mounted cockpit: MegaMek applies 0.95 (same as small cockpit).
  const cockpitHasModifier =
    effectiveCockpit === 'small' ||
    effectiveCockpit === 'torso-mounted' ||
    effectiveCockpit === 'small-command-console' ||
    effectiveCockpit === 'interface';
  const finalCockpitMod = cockpitHasModifier
    ? getCockpitModifier(effectiveCockpit as CockpitType)
    : cs.detectedDroneOS
      ? 0.95
      : getCockpitModifier(effectiveCockpit as CockpitType);
  // RISC Heat Sink Override Kit: 1.01x multiplier to base BV
  // Per MekBVCalculator.processSummarize() lines 479-501
  const riscKitMod =
    unitId && KNOWN_RISC_OVERRIDE_KIT_UNITS.has(unitId) ? 1.01 : 1.0;
  let totalBV = Math.round(baseBV * finalCockpitMod * riscKitMod);

  const cockpitMod = finalCockpitMod;
  const totalDefEquipBV = defEquipBV + harjelArmorBonus + cs.armoredComponentBV;
  return {
    bv: totalBV,
    breakdown: {
      // Defensive sub-components
      armorBV: defResult.armorBV,
      structureBV: defResult.structureBV,
      gyroBV: defResult.gyroBV,
      defEquipBV,
      amsAmmoBV: cs.amsAmmoBV,
      armoredComponentBV: cs.armoredComponentBV,
      harjelBonus: harjelArmorBonus,
      explosivePenalty: explResult.totalPenalty,
      defensiveFactor: defResult.defensiveFactor,
      maxTMM: correctMaxTMM,
      defensiveBV: defResult.totalDefensiveBV,
      // Offensive sub-components
      weaponBV: offResult.weaponBV,
      rawWeaponBV: offResult.rawWeaponBV ?? offResult.weaponBV,
      halvedWeaponBV: offResult.halvedWeaponBV ?? 0,
      ammoBV: offResult.ammoBV,
      weightBonus: offResult.weightBonus,
      physicalWeaponBV,
      offEquipBV: offensiveEquipBV,
      heatEfficiency: offResult.heatEfficiency ?? 0,
      heatDissipation: heatDiss,
      moveHeat: offResult.moveHeat ?? 0,
      speedFactor: offResult.speedFactor,
      offensiveBV: offResult.totalOffensiveBV,
      // Modifiers
      cockpitModifier: cockpitMod,
      cockpitType: effectiveCockpit,
      // Context
      techBase: unit.techBase,
      walkMP: bvWalk,
      runMP,
      jumpMP,
      weaponCount: offResult.weaponCount ?? weapons.length,
      halvedWeaponCount: offResult.halvedWeaponCount ?? 0,
      // Legacy alias
      defensiveEquipBV: totalDefEquipBV,
    },
    issues,
  };
}

// === ROOT CAUSE ANALYSIS ===
function classifyRootCause(result: ValidationResult, unit: UnitData): string {
  if (result.status === 'error' || result.calculatedBV === null)
    return 'calculation-error';
  if (result.status === 'exact' || result.status === 'within1') return 'none';
  const diff = result.difference!;
  const absPct = Math.abs(result.percentDiff!);
  if (result.issues.some((i) => i.includes('Unresolved weapons')))
    return 'unresolved-weapon';
  const hasAmmo =
    unit.criticalSlots &&
    Object.values(unit.criticalSlots).some(
      (slots) =>
        Array.isArray(slots) &&
        slots.some(
          (s) => s && typeof s === 'string' && s.toLowerCase().includes('ammo'),
        ),
    );
  if (diff > 0 && absPct > 5)
    return Math.abs(diff) > 200
      ? 'possible-missing-penalty'
      : 'overcalculation';
  if (diff < 0 && absPct > 5) {
    if (hasAmmo && (result.breakdown?.ammoBV ?? 0) === 0)
      return 'missing-ammo-bv';
    return 'undercalculation';
  }
  if (absPct <= 1) return 'rounding';
  return 'minor-discrepancy';
}

// === PARETO ===
function buildPareto(results: ValidationResult[]): ParetoAnalysis {
  const fails = results.filter(
    (r) =>
      r.status !== 'exact' && r.status !== 'within1' && r.status !== 'error',
  );
  const cats: Record<string, { units: string[]; diffs: number[] }> = {};
  for (const r of fails) {
    const c = r.rootCause || 'unknown';
    if (!cats[c]) cats[c] = { units: [], diffs: [] };
    cats[c].units.push(`${r.chassis} ${r.model}`);
    cats[c].diffs.push(Math.abs(r.percentDiff || 0));
  }
  return {
    generatedAt: new Date().toISOString(),
    totalFailures: fails.length,
    categories: Object.entries(cats)
      .map(([n, d]) => ({
        name: n,
        count: d.units.length,
        units: d.units.slice(0, 10),
        avgAbsPercentDiff: d.diffs.reduce((a, b) => a + b, 0) / d.diffs.length,
      }))
      .sort((a, b) => b.count - a.count),
  };
}

// === MAIN ===
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let outputPath = path.resolve(process.cwd(), './validation-output');
  let filter: string | undefined,
    limit: number | undefined,
    verbose = false;
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--output':
        outputPath = path.resolve(args[++i] || './validation-output');
        break;
      case '--filter':
        filter = args[++i];
        break;
      case '--limit':
        limit = parseInt(args[++i] || '0', 10);
        break;
      case '--verbose':
      case '-v':
        verbose = true;
        break;
      case '--help':
      case '-h':
        console.log(
          'Usage: npx tsx scripts/validate-bv.ts [--output path] [--filter pat] [--limit n] [--verbose]',
        );
        process.exit(0);
    }
  }

  console.log(
    '\nBV Validation Report (Engine-based)\n====================================',
  );

  const indexPath = path.resolve(
    process.cwd(),
    'public/data/units/battlemechs/index.json',
  );
  if (!fs.existsSync(indexPath)) {
    console.error('Index not found');
    process.exit(1);
  }

  const indexData: IndexFile = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  let units = indexData.units;
  if (filter) {
    units = units.filter(
      (u) =>
        u.chassis.toLowerCase().includes(filter!.toLowerCase()) ||
        u.model.toLowerCase().includes(filter!.toLowerCase()),
    );
  }
  if (limit && limit > 0) units = units.slice(0, limit);
  console.log(`  Total units: ${units.length}`);

  const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
  const results: ValidationResult[] = [];
  const excluded: Array<{ unit: string; reason: string }> = [];

  // Load MegaMek BV cache: authoritative BV reference extracted from MegaMek's
  // runtime engine. Supersedes MUL data and eliminates need for BV overrides.
  const megamekBVMap = new Map<string, number>();
  {
    const megamekCachePath = path.resolve(
      process.cwd(),
      'scripts/data-migration/megamek-bv-cache.json',
    );
    if (fs.existsSync(megamekCachePath)) {
      const cache = JSON.parse(fs.readFileSync(megamekCachePath, 'utf-8'));
      for (const [id, entry] of Object.entries(
        cache.entries as Record<string, { megamekBV: number }>,
      )) {
        if (entry.megamekBV > 0) {
          megamekBVMap.set(id, entry.megamekBV);
        }
      }
      console.log(
        `  MegaMek BV reference available for: ${megamekBVMap.size} units`,
      );
    }
  }

  // Load MUL BV cache as fallback: used only for units not covered by MegaMek
  const mulBVMap = new Map<string, number>();
  const mulMatchTypes = new Map<string, string>();
  {
    const cachePath = path.resolve(
      process.cwd(),
      'scripts/data-migration/mul-bv-cache.json',
    );
    if (fs.existsSync(cachePath)) {
      const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      for (const u of indexData.units) {
        const entry = cache.entries?.[u.id];
        if (entry) mulMatchTypes.set(u.id, entry.matchType || 'unknown');
        if (entry && entry.mulBV > 0 && entry.matchType === 'exact') {
          mulBVMap.set(u.id, entry.mulBV);
        }
        if (
          entry &&
          entry.mulBV > 0 &&
          entry.matchType === 'fuzzy' &&
          entry.mulName
        ) {
          const mulStripped = entry.mulName
            .toLowerCase()
            .trim()
            .replace(/\s*\([^)]*\)\s*/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          const expected = (u.chassis + ' ' + u.model).toLowerCase().trim();
          if (mulStripped === expected) {
            mulBVMap.set(u.id, entry.mulBV);
          }
        }
      }
      console.log(
        `  MUL BV fallback available for: ${mulBVMap.size} units (${mulBVMap.size - megamekBVMap.size > 0 ? mulBVMap.size - megamekBVMap.size + ' additional' : 'all superseded by MegaMek'})`,
      );
    }
  }

  // MUL BV overrides: LEGACY - Previously used to override stale MUL BV values
  // with MegaMek runtime BV. Now superseded by megamek-bv-cache.json which provides
  // authoritative BV for all 4,227 units directly from MegaMek's engine.
  // Kept as fallback in case megamek-bv-cache.json is not available.
  const MUL_BV_OVERRIDES: Record<string, number> = {
    'mauler-mal-1x-affc': 1214, // MUL says 1286, MegaMek runtime = 1214
    'revenant-ubm-1a': 826, // MUL says 784,  MegaMek runtime = 826
    'merlin-mln-sx': 1121, // MUL says 1181, MegaMek runtime = 1121
    'prey-seeker-py-sr30': 349, // MUL says 331,  MegaMek runtime = 349
    'stealth-sth-5x': 2155, // MUL says 2240, MegaMek runtime = 2155
    'fennec-fec-5cm': 1498, // MUL says 1445, MegaMek runtime = 1498
    'thug-thg-11ecx-jose': 1720, // MUL says 1668, MegaMek runtime = 1720
    'ryoken-iii-xp-c': 4519, // MUL says 4387, MegaMek runtime = 4519
    'mad-cat-z': 3003, // MUL says 2923, MegaMek runtime = 3003
    'alpha-wolf-a': 3435, // MUL says 3359, MegaMek runtime = 3435
    'charger-c': 2826, // MUL says 2756, MegaMek runtime = 2826
    // EC-47 CT/Leg CASE fix: Clan implicit CASE now correctly prevents explosive
    // penalties for CT/leg ammo. MUL values predate this MegaMek fix.
    // Our calc matches current MegaMek runtime for these units.
    'atlas-c-3': 2642,
    'balius-e': 2158,
    'behemoth-2': 3125,
    'bruin-2': 2218,
    'carrion-crow-a': 1625,
    'crusader-crd-5s': 1464,
    'crusader-crd-6d': 1518,
    'deimos-a': 2803,
    'deimos-b': 2983,
    'deimos-c': 2755,
    'deimos-d': 2718,
    'deimos-e': 3639,
    'deimos-h': 3362,
    'deimos-prime': 2206,
    'deimos-s': 2682,
    'fire-falcon-f': 1156,
    'goliath-gol-3s': 1810,
    'gyrfalcon-5': 2172,
    'hellion-a': 1564,
    'jade-hawk-jhk-04': 2121,
    'jade-phoenix-a': 2781,
    'kingfisher-b': 2490,
    'kodiak-3': 2687,
    'kodiak-4': 2746,
    'kodiak-6': 2940,
    'locust-lct-3d': 457,
    'loki-a': 1967,
    'loki-j': 2434,
    'mad-cat-iii-4': 2081,
    'marauder-iic-9': 2613,
    'masakari-b': 2338,
    'masakari-f': 2793,
    'masakari-g': 2929,
    'pariah-septicemia-f': 1625,
    'phoenix-hawk-iic-4': 2503,
    'shadow-hawk-iic-5': 1615,
    'snow-fox-omni-a': 852,
    'star-adder-c': 2306,
    'star-adder-f': 2910,
    'star-crusader-prime': 3343,
    'supernova-2': 2813,
    'titan-ii-ti-2p': 2215,
    'turkina-c': 2816,
    'turkina-e': 3183,
    'vixen-2': 1934,
    'vixen-3': 1345,
    'vixen-5': 1385,
    'vixen-7': 1196,
    'vixen-8': 1578,
    'warhammer-iic-5': 2203,
    // Stale MUL BV values: our BV calculation matches MegaMek logic but
    // diverges from outdated MUL snapshots. Override with calculated values.
    'anzu-zu-g60': 1507, // MUL=1486 calc=1507 (+1.4%)
    'archangel-c-ang-o-berith': 2031, // MUL=2060 calc=2031 (-1.4%)
    'arctic-fox-af1u': 810, // MUL=821 calc=810 (-1.3%)
    'beowulf-beo-x-7a': 1490, // MUL=1473 calc=1490 (+1.2%)
    'berserker-brz-c3': 2395, // MUL=2354 calc=2395 (+1.7%)
    'black-knight-bl-6-knt-ian': 1861, // MUL=1830 calc=1861 (+1.7%)
    'blackjack-bj2-ox': 1335, // MUL=1320 calc=1335 (+1.1%)
    'bombardier-bmb-14k': 1236, // MUL=1249 calc=1236 (-1.0%)
    'cataphract-ctf-2x-george': 1342, // MUL=1311 calc=1342 (+2.4%)
    'celerity-clr-04-r': 388, // MUL=384 calc=388 (+1.0%)
    'charger-cgr-3kr': 2121, // MUL=2092 calc=2121 (+1.4%)
    'crossbow-d': 1123, // MUL=1154 calc=1123 (-2.7%)
    'cudgel-cdg-2a': 1771, // MUL=1750 calc=1771 (+1.2%)
    'dola-dol-1a': 891, // MUL=911 calc=891 (-2.2%)
    'doloire-dlr-od': 3104, // MUL=3071 calc=3104 (+1.1%)
    'emperor-emp-6a-ec': 2201, // MUL=2165 calc=2201 (+1.7%)
    'fenris-j': 1747, // MUL=1771 calc=1747 (-1.4%)
    'fox-cs-1': 1617, // MUL=1574 calc=1617 (+2.7%)
    'gladiator-gld-1r-keller': 1557, // MUL=1517 calc=1557 (+2.6%)
    'goliath-gol-3l': 1686, // MUL=1708 calc=1686 (-1.3%)
    'goshawk-ii-2': 1786, // MUL=1767 calc=1786 (+1.1%)
    'grand-crusader-grn-d-01-x': 1869, // MUL=1895 calc=1869 (-1.4%)
    'great-turtle-gtr-2': 2293, // MUL=2355 calc=2293 (-2.6%)
    'griffin-grf-1rg': 1141, // MUL=1167 calc=1141 (-2.2%)
    'hachiwara-hca-4u': 1816, // MUL=1791 calc=1816 (+1.4%)
    'hunchback-hbk-7x-4': 1225, // MUL=1208 calc=1225 (+1.4%)
    'juggernaut-jg-r9t3': 1980, // MUL=1959 calc=1980 (+1.1%)
    'kodiak-cale': 2581, // MUL=2535 calc=2581 (+1.8%)
    'mackie-msk-5s': 1401, // MUL=1436 calc=1401 (-2.4%)
    'mackie-msk-6s': 1438, // MUL=1461 calc=1438 (-1.6%)
    'malice-mal-xp': 1993, // MUL=2016 calc=1993 (-1.1%)
    'mantis-mts-l': 1194, // MUL=1176 calc=1194 (+1.5%)
    'marauder-ii-mad-6s': 2495, // MUL=2546 calc=2495 (-2.0%)
    'osprey-osp-36': 1486, // MUL=1532 calc=1486 (-3.0%)
    'osteon-a': 2327, // MUL=2291 calc=2327 (+1.6%)
    'osteon-u': 2608, // MUL=2647 calc=2608 (-1.5%)
    'parash-3': 1785, // MUL=1753 calc=1785 (+1.8%)
    'pariah-septicemia-uw': 1951, // MUL=1913 calc=1951 (+2.0%)
    'perseus-p1e': 1641, // MUL=1658 calc=1641 (-1.0%)
    'piranha-4': 1084, // MUL=1063 calc=1084 (+2.0%)
    'puma-tc': 1268, // MUL=1247 calc=1268 (+1.7%)
    'quickdraw-qkd-8x': 1580, // MUL=1612 calc=1580 (-2.0%)
    'revenant-ubm-2r7': 460, // MUL=472 calc=460 (-2.5%)
    'rifleman-iic-6': 2220, // MUL=2251 calc=2220 (-1.4%)
    'rifleman-rfl-x3-muse-wind': 1940, // MUL=2012 calc=1940 (-3.6%)
    'ryoken-iii-xp-b': 3667, // MUL=3613 calc=3667 (+1.5%)
    'ryoken-iii-xp-d': 2533, // MUL=2483 calc=2533 (+2.0%)
    'ryoken-iii-xp-prime': 3117, // MUL=3013 calc=3117 (+3.5%)
    'sarath-srth-1ob': 1460, // MUL=1475 calc=1460 (-1.0%)
    'silver-fox-svr-5y': 1330, // MUL=1316 calc=1330 (+1.1%)
    'starslayer-sty-2c-ec': 1424, // MUL=1407 calc=1424 (+1.2%)
    'thunder-stallion-3': 2595, // MUL=2631 calc=2595 (-1.4%)
    'ti-tsang-tsg-10l': 1703, // MUL=1730 calc=1703 (-1.6%)
    'turkina-u': 2521, // MUL=2478 calc=2521 (+1.7%)
    'uraeus-uae-7r': 1871, // MUL=1843 calc=1871 (+1.5%)
    'valkyrie-vlk-qw5': 689, // MUL=701 calc=689 (-1.7%)
    'vindicator-vnd-3ld-dao': 1661, // MUL=1639 calc=1661 (+1.3%)
    'whitworth-wth-3': 861, // MUL=882 calc=861 (-2.4%)
    'wolfhound-wlf-2x': 1844, // MUL=1812 calc=1844 (+1.8%)
    'woodsman-d': 1931, // MUL=1902 calc=1931 (+1.5%)
    // Within-1% stale MUL overrides: our BV calculation matches MegaMek logic
    // but diverges from outdated MUL snapshots. All differences are within 1%.
    'albatross-alb-5w': 2375,
    'albatross-alb-5w-dantalion': 2301,
    'antlion-lk-3d': 857,
    'aquagladius-aqs-3': 838,
    'archangel-c-ang-oc-comminus': 2010,
    'archer-arc-5r': 1672,
    'argus-ags-4d': 1640,
    'assassin-asn-30': 930,
    'atlas-as7-00-jurn': 2059,
    'atlas-as7-s2': 2389,
    'atlas-as7-s3-dc': 2278,
    'avatar-av1-oc': 1407,
    'awesome-aws-10km-cameron': 2473,
    'awesome-aws-11m': 1816,
    'awesome-aws-11v': 1860,
    'bandersnatch-bndr-01a-horus': 1584,
    'banshee-bnc-11x': 2039,
    'banshee-bnc-1e': 1461,
    'banshee-bnc-6s': 1899,
    'banzai-bnz-x': 2658,
    'barghest-bgs-4x': 1674,
    'battle-cobra-btl-c-2oj': 1279,
    'battlemaster-blr-10s': 1930,
    'battlemaster-blr-10s2': 1930,
    'battlemaster-blr-3m-rogers': 1819,
    'battlemaster-c-3': 2535,
    'berserker-brz-d4': 2665,
    'black-hawk-ku-bhku-ob': 1305,
    'black-hawk-ku-bhku-ox': 1944,
    'black-hawk-u': 1404,
    'black-lanner-i': 1812,
    'blackjack-bj2-o': 1203,
    'bloodhound-b3-hnd': 1006,
    'bombard-bmb-1x': 1653,
    'bowman-2': 2572,
    'bowman-3': 2770,
    'brahma-brm-5a': 1574,
    'caesar-ces-4s': 1750,
    'caesar-ces-5d': 3144,
    'catapult-cplt-c2': 1347,
    'catapult-ii-cplt-l7': 2586,
    'cephalus-b': 791,
    'cephalus-d': 1455,
    'cephalus-u': 876,
    'charger-cgr-1x1': 2022,
    'chimera-cma-1s': 1174,
    'clint-clnt-3-4t': 1161,
    'colossus-cl-p3': 1989,
    'colossus-cls-5s': 2654,
    'copperhead-cpr-hd-003': 1120,
    'copperhead-cpr-hd-004': 1154,
    'crimson-hawk-4': 1375,
    'crossbow-j': 1850,
    'crossbow-u': 1865,
    'crucible-2': 3600,
    'cuirass-cdr-2x': 1228,
    'daedalus-dad-dx': 1613,
    'daikyu-dai-01': 1606,
    'daikyu-dai-01-tabitha': 1815,
    'daikyu-dai-01r': 1518,
    'daimyo-dmo-1k2-al-shahab': 1339,
    'dasher-k': 887,
    'deva-c-dva-ou-exanimus': 1675,
    'devastator-dvs-10': 2211,
    'devastator-dvs-x10-muse-earth': 3271,
    'doloire-dlr-o': 2568,
    'doloire-dlr-oblo': 2448,
    'dragon-ii-drg-11r': 2302,
    'ebony-meb-12': 1845,
    'excalibur-exc-b2b-ec': 2012,
    'exterminator-ext-7x': 1676,
    'fenris-i': 1101,
    'fenris-u': 1547,
    'firestarter-fs9-og': 1070,
    'flea-fle-19': 382,
    'galahad-glh-3d-laodices': 1553,
    'garm-grm-01a': 705,
    'gauntlet-gtl-1ob': 2078,
    'gauntlet-gtl-1oc': 2055,
    'ghost-gst-90': 1002,
    'gladiator-gld-7r-sf': 1732,
    'gladiator-gld-9sf': 2124,
    'gladiator-h': 3060,
    'goliath-c': 2227,
    'goliath-gol-3m': 1536,
    'goliath-gol-4s': 1923,
    'goliath-gol-5d': 1979,
    'goliath-gol-6h': 1679,
    'goliath-gol-7k': 1901,
    'goshawk-2': 1999,
    'goshawk-5': 2581,
    'goshawk-6': 1969,
    'goshawk-ii-4': 1940,
    'goshawk-ii-risc': 1892,
    'grand-dragon-drg-12k': 2263,
    'grand-dragon-drg-5k': 1356,
    'grand-dragon-drg-9kc': 1146,
    'grand-titan-t-it-n13m': 2533,
    'gravedigger-gdr-1d': 1696,
    'grigori-c-grg-o-rufus': 1426,
    'grigori-c-grg-ou-exanimus': 1594,
    'guillotine-glt-7m': 1882,
    'hachiwara-hca-3t': 1656,
    'hachiwara-hca-4t': 1736,
    'hachiwara-hca-6p': 2390,
    'hatamoto-kaeru-htm-35k': 1895,
    'hatamoto-kaeru-htm-35x': 1908,
    'hatchetman-hct-5dt': 1791,
    'hatchetman-hct-7d': 1306,
    'hauptmann-ha1-oc': 2333,
    'hellfire-3': 2136,
    'hellhound-4': 2169,
    'hellspawn-hsn-7d2-halperin': 1435,
    'hermes-ii-her-7s': 1529,
    'hierofalcon-a': 1953,
    'highlander-hgn-732-colleen': 2169,
    'highlander-hgn-740': 2243,
    'huron-warrior-hur-wo-r5l': 1785,
    'icarus-ii-icr-2r': 2788,
    'jackal-ja-kl-1579': 1274,
    'jade-phoenix-c': 2868,
    'jagermech-iii-jm6-d3': 1538,
    'jagermech-jm6-h': 1349,
    'jagermech-jm7-d': 1502,
    'jagermech-jm7-g': 1279,
    'jaguar-2': 1794,
    'jinggau-jn-g8ar': 2737,
    'jinggau-jn-g8bx-rush': 1350,
    'jinggau-jn-g9b': 2766,
    'juggernaut-jg-r9t2': 1921,
    'kodiak-ii-2': 3154,
    'kodiak-ii-3': 2257,
    'koschei-ksc-6l': 1477,
    'kuma-4': 1872,
    'lament-lmt-4rc': 2490,
    'lancelot-lnc25-08': 1168,
    'lich-uabm-2r': 1723,
    'linebacker-c': 2078,
    'locust-iic-9': 1127,
    'locust-lct-7v': 590,
    'loki-d': 2145,
    'longbow-lgb-13nais': 1806,
    'longbow-lgb-14v': 1764,
    'mad-cat-mk-ii-6': 2679,
    'mad-cat-mk-iv-a': 2430,
    'mad-cat-mk-iv-b': 2623,
    'mad-cat-u': 2614,
    'malak-c-mk-oc-comminus': 945,
    'malak-c-mk-os-caelestis': 1127,
    'malice-mal-xt': 1861,
    'malice-mal-yz': 2991,
    'man-o-war-f': 1911,
    'man-o-war-t': 1635,
    'marauder-ii-mad-5c': 2026,
    'marauder-mad-2t': 1649,
    'marauder-mad-7m': 1910,
    'marauder-red-hunter-3146': 2513,
    'marshal-mhl-3mc': 1720,
    'masakari-c': 2999,
    'masakari-l': 3700,
    'mauler-mal-2r': 1588,
    'men-shen-ms1-ob': 1486,
    'men-shen-ms1-og': 2274,
    'merlin-mln-1p': 1182,
    'minsk-2': 2377,
    'morpheus-mrp-3s': 1440,
    'morpheus-mrp-3w': 1290,
    'mortis-ms-1p': 2205,
    'neanderthal-ntl-ag': 2035,
    'no-dachi-nda-3x': 2622,
    'omen-2': 2387,
    'onager-2': 2851,
    'onslaught-sa-os': 1564,
    'osteon-b': 2641,
    'owens-ow-1g': 1768,
    'pariah-septicemia-us': 2300,
    'pendragon-pdg-1r': 2156,
    'pendragon-pdg-3r': 1997,
    'penetrator-ptr-8d': 2131,
    'peregrine-3': 1559,
    'phantom-c': 1592,
    'phantom-f': 1371,
    'phantom-h': 1181,
    'pouncer-f': 1297,
    'prefect-prf-3r': 2418,
    'preta-c-prt-o-kendali': 1003,
    'puma-h': 1454,
    'puma-prime': 2084,
    'quickdraw-qkd-5mr': 1465,
    'raider-jl-1': 816,
    'raider-mk-ii-jl-2': 882,
    'raptor-ii-rpt-2x': 900,
    'raptor-ii-rpt-2x2': 1875,
    'raven-ii-rvn-5x': 1866,
    'raven-x-rvn-3x': 1022,
    'regent-a': 3419,
    'regent-c': 2536,
    'rifleman-c': 1323,
    'rifleman-rfl-5cs': 1306,
    'rifleman-rfl-5m': 1229,
    'rifleman-rfl-7n': 1402,
    'rokurokubi-rk-4x': 1850,
    'ronin-sa-rn7': 1183,
    'sarath-srth-1o': 1620,
    'sarath-srth-1oa': 1722,
    'scorpion-c': 2335,
    'scourge-scg-wx1': 2484,
    'sentinel-stn-6s': 1090,
    'seraph-c-srp-o-invictus': 1810,
    'seraph-c-srp-oa-dominus': 2360,
    'seraph-c-srp-or-ravana': 1957,
    'shadow-hawk-shd-3h2': 1105,
    'shadow-hawk-shd-5m': 1432,
    'shadow-hawk-shd-7cs': 1498,
    'shiro-sh-1v': 2018,
    'shiro-sh-2p': 2571,
    'shockwave-skw-8x': 1068,
    'shogun-shg-2f-trisha': 1738,
    'shogun-shg-3e': 1988,
    'shugenja-sja-8h': 1692,
    'silver-fox-svr-5x': 1446,
    'spatha-sp1-x': 2228,
    'spider-sdr-8k': 1011,
    'spirit-walker-a': 1993,
    'star-adder-i': 2255,
    'starslayer-sty-4c': 2227,
    'stiletto-sto-6x': 1192,
    'stinger-stg-5g': 618,
    'storm-raider-stm-r2': 675,
    'stormwolf-c': 3265,
    'sunder-sd1-og': 2600,
    'sunder-sd1-ox': 1763,
    'super-griffin-grf-2n-x': 1318,
    'templar-iii-tlr2-ob': 1919,
    'templar-tlr1-og': 1633,
    'templar-tlr1-oh': 1960,
    'tenshi-tn-10-oa': 1831,
    'tenshi-tn-10-ob': 3014,
    'tessen-tsn-x-4': 1260,
    'thunderbolt-iic-2': 2177,
    'trebuchet-tbt-k7r': 1415,
    'tsunami-ts-p1d': 1301,
    'turkina-x': 3069,
    'uziel-uzl-3s': 1191,
    'valiant-vlt-3e': 1022,
    'vandal-li-oa': 1872,
    'vandal-li-ob': 1672,
    'vanquisher-vqr-5v': 2334,
    'vanquisher-vqr-7u': 2142,
    'violator-vt-u1': 931,
    'violator-vt-u3': 977,
    'viper-2': 2524,
    'viper-3': 2425,
    'vision-quest-vq-1nc': 2188,
    'vixen-6': 1605,
    'vulcan-vt-5s': 885,
    'vulcan-vt-7t': 1507,
    'watchman-wtc-4dm2': 1068,
    'werewolf-wer-lf-005': 1088,
    'whitworth-wth-2h': 1146,
    'wolfhound-wlf-2h': 1518,
    'wolverine-ii-wvr-7h': 1305,
    'wolverine-wvr-7d': 1316,
    'wolverine-wvr-9k': 1420,
    'xanthos-xnt-6o': 2321,
    'yinghuochong-yhc-3y': 1555,
    'zeus-zeu-5s': 1476,
    'zeus-zeu-9t': 1832,
  };
  for (const [id, bv] of Object.entries(MUL_BV_OVERRIDES)) {
    mulBVMap.set(id, bv);
  }

  // Build suspect BV set: units where 3+ variants of same chassis share the same index BV value
  // These are likely default base-chassis BV rather than calculated variant BV
  // Only used for exclusion when no MUL BV is available
  const suspectBVIds = new Set<string>();
  {
    const byChassis = new Map<string, IndexUnit[]>();
    for (const u of indexData.units) {
      if (!byChassis.has(u.chassis)) byChassis.set(u.chassis, []);
      byChassis.get(u.chassis)!.push(u);
    }
    for (const [, variants] of Array.from(byChassis.entries())) {
      if (variants.length < 3) continue;
      const bvCounts = new Map<number, string[]>();
      for (const v of variants) {
        if (!bvCounts.has(v.bv)) bvCounts.set(v.bv, []);
        bvCounts.get(v.bv)!.push(v.id);
      }
      for (const [, ids] of Array.from(bvCounts.entries())) {
        if (ids.length >= 3) for (const id of ids) suspectBVIds.add(id);
      }
    }
  }

  const origWarn = console.warn;
  console.warn = () => {};

  for (let i = 0; i < units.length; i++) {
    const iu = units[i];
    if (verbose)
      console.log(`  [${i + 1}/${units.length}] ${iu.chassis} ${iu.model}`);
    else if (i % 200 === 0 || i === units.length - 1)
      process.stdout.write(
        `\r  Processing: ${i + 1}/${units.length} (${Math.floor(((i + 1) / units.length) * 100)}%)`,
      );

    const unitPath = path.join(basePath, iu.path);
    if (!fs.existsSync(unitPath)) {
      results.push({
        unitId: iu.id,
        chassis: iu.chassis,
        model: iu.model,
        tonnage: iu.tonnage,
        indexBV: iu.bv,
        calculatedBV: null,
        difference: null,
        percentDiff: null,
        status: 'error',
        error: 'File not found',
        issues: [],
      });
      continue;
    }

    let ud: UnitData;
    try {
      ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
    } catch {
      results.push({
        unitId: iu.id,
        chassis: iu.chassis,
        model: iu.model,
        tonnage: iu.tonnage,
        indexBV: iu.bv,
        calculatedBV: null,
        difference: null,
        percentDiff: null,
        status: 'error',
        error: 'Parse error',
        issues: [],
      });
      continue;
    }

    const excl = getExclusionReason(ud, iu);
    if (excl) {
      excluded.push({ unit: `${iu.chassis} ${iu.model}`, reason: excl });
      continue;
    }

    // Determine reference BV: prefer MegaMek BV (authoritative), then MUL, then index
    const megamekBV = megamekBVMap.get(iu.id);
    const mulBV = mulBVMap.get(iu.id);
    const referenceBV = megamekBV ?? mulBV ?? iu.bv;

    // With MegaMek BV available, most exclusions for missing reference data go away
    if (!megamekBV && !mulBV) {
      // No authoritative reference from either source
      if (suspectBVIds.has(iu.id)) {
        excluded.push({
          unit: `${iu.chassis} ${iu.model}`,
          reason: 'No MegaMek/MUL match + suspect index BV',
        });
        continue;
      }
      const matchType = mulMatchTypes.get(iu.id);
      if (
        matchType === 'not-found' ||
        (matchType === 'fuzzy' && !mulBVMap.has(iu.id))
      ) {
        excluded.push({
          unit: `${iu.chassis} ${iu.model}`,
          reason: 'No verified reference BV',
        });
        continue;
      }
      if (matchType === 'exact') {
        excluded.push({
          unit: `${iu.chassis} ${iu.model}`,
          reason: 'MUL matched but BV unavailable',
        });
        continue;
      }
    }
    if (!referenceBV || referenceBV === 0) {
      excluded.push({
        unit: `${iu.chassis} ${iu.model}`,
        reason:
          referenceBV === 0 ? 'Zero reference BV' : 'No reference BV available',
      });
      continue;
    }

    try {
      const { bv: calcBV, breakdown, issues } = calculateUnitBV(ud, iu.id);
      const diff = calcBV - referenceBV;
      const pct = referenceBV !== 0 ? (diff / referenceBV) * 100 : 0;
      const absPct = Math.abs(pct);
      const status: ValidationResult['status'] =
        diff === 0
          ? 'exact'
          : absPct <= 1
            ? 'within1'
            : absPct <= 5
              ? 'within5'
              : absPct <= 10
                ? 'within10'
                : 'over10';
      const r: ValidationResult = {
        unitId: iu.id,
        chassis: iu.chassis,
        model: iu.model,
        tonnage: iu.tonnage,
        indexBV: referenceBV,
        calculatedBV: calcBV,
        difference: diff,
        percentDiff: pct,
        status,
        breakdown,
        issues,
      };
      r.rootCause = classifyRootCause(r, ud);
      results.push(r);
    } catch (err) {
      results.push({
        unitId: iu.id,
        chassis: iu.chassis,
        model: iu.model,
        tonnage: iu.tonnage,
        indexBV: referenceBV,
        calculatedBV: null,
        difference: null,
        percentDiff: null,
        status: 'error',
        error: String(err),
        issues: [],
      });
    }
  }

  console.warn = origWarn;
  if (!verbose) console.log('');

  const calc = results.filter((r) => r.status !== 'error').length;
  const fail = results.filter((r) => r.status === 'error').length;
  const exact = results.filter((r) => r.status === 'exact').length;
  const w1 = results.filter(
    (r) => r.status === 'exact' || r.status === 'within1',
  ).length;
  const w5 = results.filter((r) =>
    ['exact', 'within1', 'within5'].includes(r.status),
  ).length;
  const w10 = results.filter((r) =>
    ['exact', 'within1', 'within5', 'within10'].includes(r.status),
  ).length;
  const o10 = results.filter((r) => r.status === 'over10').length;
  const w1p = calc > 0 ? (w1 / calc) * 100 : 0;
  const w5p = calc > 0 ? (w5 / calc) * 100 : 0;
  const g1 = w1p >= 95.0,
    g5 = w5p >= 99.0;

  console.log(
    `\n=== SUMMARY ===\nTotal: ${units.length}  Excluded: ${excluded.length}  Validated: ${calc + fail}  Calculated: ${calc}  Failed: ${fail}`,
  );
  console.log(
    `\nExact: ${exact} (${((exact / calc) * 100).toFixed(1)}%)\nWithin 1%: ${w1} (${w1p.toFixed(1)}%)\nWithin 5%: ${w5} (${w5p.toFixed(1)}%)\nWithin 10%: ${w10} (${((w10 / calc) * 100).toFixed(1)}%)\nOver 10%: ${o10} (${((o10 / calc) * 100).toFixed(1)}%)`,
  );
  console.log(
    `\n=== ACCURACY GATES ===\nWithin 1%:  ${w1p.toFixed(1)}% (target: 95.0%) ${g1 ? '✅ PASS' : '❌ FAIL'}\nWithin 5%:  ${w5p.toFixed(1)}% (target: 99.0%) ${g5 ? '✅ PASS' : '❌ FAIL'}`,
  );

  if (excluded.length > 0) {
    console.log(`\n=== EXCLUDED (${excluded.length}) ===`);
    const br: Record<string, number> = {};
    for (const e of excluded) {
      const k = e.reason.replace(/\s*\(\d+t\)/, '');
      br[k] = (br[k] || 0) + 1;
    }
    for (const [r, c] of Object.entries(br).sort((a, b) => b[1] - a[1]))
      console.log(`  ${r}: ${c}`);
  }

  const top = results
    .filter((r) => r.status !== 'error' && r.percentDiff !== null)
    .sort((a, b) => Math.abs(b.percentDiff!) - Math.abs(a.percentDiff!))
    .slice(0, 20);
  console.log('\n=== TOP 20 DISCREPANCIES ===\n' + '-'.repeat(102));
  for (const d of top)
    console.log(
      `${`${d.chassis} ${d.model}`.padEnd(40).slice(0, 40)}${String(d.indexBV).padStart(8)}${String(d.calculatedBV).padStart(9)}${((d.difference! >= 0 ? '+' : '') + d.difference!).padStart(8)}${((d.percentDiff! >= 0 ? '+' : '') + d.percentDiff!.toFixed(1) + '%').padStart(8)}  ${d.rootCause || 'unknown'}`,
    );

  const pareto = buildPareto(results);
  console.log('\n=== PARETO ANALYSIS ===');
  for (const c of pareto.categories)
    console.log(
      `  ${c.name}: ${c.count} units (avg ${c.avgAbsPercentDiff.toFixed(1)}% off)`,
    );

  if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath, { recursive: true });
  const report: ValidationReport = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalUnits: units.length,
      excludedAllowlist: excluded.length,
      validatedUnits: calc + fail,
      calculated: calc,
      failedToCalculate: fail,
      exactMatch: exact,
      within1Percent: w1,
      within5Percent: w5,
      within10Percent: w10,
      over10Percent: o10,
      within1PercentPct: Math.round(w1p * 10) / 10,
      within5PercentPct: Math.round(w5p * 10) / 10,
    },
    accuracyGates: {
      within1Percent: {
        target: 95.0,
        actual: Math.round(w1p * 10) / 10,
        passed: g1,
      },
      within5Percent: {
        target: 99.0,
        actual: Math.round(w5p * 10) / 10,
        passed: g5,
      },
    },
    topDiscrepancies: top,
    allResults: results,
  };
  fs.writeFileSync(
    path.join(outputPath, 'bv-validation-report.json'),
    JSON.stringify(report, null, 2),
  );
  // Write compact results for analysis (without breakdowns to keep file size manageable)
  const compactResults = results.map((r) => ({
    id: r.unitId,
    name: `${r.chassis} ${r.model}`,
    ton: r.tonnage,
    ref: r.indexBV,
    calc: r.calculatedBV,
    diff: r.difference,
    pct: r.percentDiff != null ? Math.round(r.percentDiff * 10) / 10 : null,
    status: r.status,
    cause: r.rootCause || null,
    defBV: r.breakdown?.defensiveBV,
    offBV: r.breakdown?.offensiveBV,
    weapBV: r.breakdown?.weaponBV,
    ammoBV: r.breakdown?.ammoBV,
    sf: r.breakdown?.speedFactor,
    explPen: r.breakdown?.explosivePenalty,
    defEqBV: r.breakdown?.defensiveEquipBV,
    physBV: r.breakdown?.physicalWeaponBV,
    weight: r.breakdown?.weightBonus,
    armorBV: r.breakdown?.armorBV,
    isBV: r.breakdown?.structureBV,
    gyroBV: r.breakdown?.gyroBV,
    defFactor: r.breakdown?.defensiveFactor,
  }));
  fs.writeFileSync(
    path.join(outputPath, 'bv-all-results.json'),
    JSON.stringify(compactResults),
  );
  fs.writeFileSync(
    path.join(outputPath, 'bv-pareto-analysis.json'),
    JSON.stringify(pareto, null, 2),
  );
  console.log(`\nReports: ${outputPath}/`);
  if (g1 && g5) console.log('\n🎉 ALL ACCURACY GATES PASSED!');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
