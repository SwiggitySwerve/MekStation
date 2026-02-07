#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

import { EngineType } from '../src/types/construction/EngineType';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';
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
import { getArmorBVMultiplier } from '../src/types/validation/BattleValue';

interface IndexUnit { id: string; chassis: string; model: string; tonnage: number; techBase: string; year: number; role: string; path: string; rulesLevel: string; cost: number; bv: number; }
interface IndexFile { version: string; generatedAt: string; totalUnits: number; units: IndexUnit[]; }
interface ArmorAllocation { [location: string]: number | { front: number; rear: number }; }
interface Equipment { id: string; location: string; }
interface UnitData { id: string; chassis: string; model: string; unitType: string; configuration: string; techBase: string; tonnage: number; engine: { type: string; rating: number }; gyro: { type: string }; cockpit: string; structure: { type: string }; armor: { type: string; allocation: ArmorAllocation }; heatSinks: { type: string; count: number }; movement: { walk: number; jump: number }; equipment: Equipment[]; criticalSlots?: Record<string, (string | null)[]>; }

interface ValidationResult {
  unitId: string; chassis: string; model: string; tonnage: number;
  indexBV: number; calculatedBV: number | null; difference: number | null; percentDiff: number | null;
  status: 'exact' | 'within1' | 'within5' | 'within10' | 'over10' | 'error';
  error?: string;
  breakdown?: {
    // Defensive sub-components
    armorBV: number; structureBV: number; gyroBV: number;
    defEquipBV: number; amsAmmoBV: number; armoredComponentBV: number; harjelBonus: number;
    explosivePenalty: number; defensiveFactor: number; maxTMM: number;
    defensiveBV: number;
    // Offensive sub-components
    weaponBV: number; rawWeaponBV: number; halvedWeaponBV: number;
    ammoBV: number; weightBonus: number; physicalWeaponBV: number; offEquipBV: number;
    heatEfficiency: number; heatDissipation: number; moveHeat: number;
    speedFactor: number; offensiveBV: number;
    // Modifiers
    cockpitModifier: number; cockpitType: string;
    // Context
    techBase: string; walkMP: number; runMP: number; jumpMP: number;
    weaponCount: number; halvedWeaponCount: number;
    // Legacy aliases
    defensiveEquipBV: number;
  };
  rootCause?: string; issues: string[];
}

interface ParetoCategory { name: string; count: number; units: string[]; avgAbsPercentDiff: number; }
interface ParetoAnalysis { generatedAt: string; totalFailures: number; categories: ParetoCategory[]; }
interface ValidationReport {
  generatedAt: string;
  summary: { totalUnits: number; excludedAllowlist: number; validatedUnits: number; calculated: number; failedToCalculate: number; exactMatch: number; within1Percent: number; within5Percent: number; within10Percent: number; over10Percent: number; within1PercentPct: number; within5PercentPct: number; };
  accuracyGates: { within1Percent: { target: number; actual: number; passed: boolean }; within5Percent: { target: number; actual: number; passed: boolean }; };
  topDiscrepancies: ValidationResult[]; allResults: ValidationResult[];
}

// === ALLOWLIST ===
const UNSUPPORTED_CONFIGURATIONS = new Set(['LAM', 'Tripod', 'QuadVee']);
const SUPERHEAVY_TONNAGE_THRESHOLD = 100;

function getExclusionReason(unit: UnitData, indexUnit: IndexUnit): string | null {
  if (UNSUPPORTED_CONFIGURATIONS.has(unit.configuration)) return `Unsupported configuration: ${unit.configuration}`;
  if (unit.tonnage > SUPERHEAVY_TONNAGE_THRESHOLD) return `Superheavy mech (${unit.tonnage}t)`;
  if (indexUnit.bv === 0) return 'Zero BV in index';
  if ((unit.armor?.type?.toUpperCase() ?? '').includes('PATCHWORK')) return 'Patchwork armor';
  if (unit.equipment?.some(eq => eq.id.toLowerCase().includes('blue-shield') || eq.id.toLowerCase().includes('blueshield'))) return 'Blue Shield Particle Field Damper';
  // Also check crit slots for Blue Shield (some units have it in crits but not equipment list)
  if (unit.criticalSlots && Object.values(unit.criticalSlots).some(slots => Array.isArray(slots) && slots.some(s => s && typeof s === 'string' && /blue.?shield/i.test(s)))) return 'Blue Shield Particle Field Damper (crit-detected)';
  if (!unit.armor?.allocation || Object.keys(unit.armor.allocation).length === 0) return 'Missing armor allocation data';
  return null;
}

// === TYPE MAPPING ===
function mapEngineType(s: string, tb: string): EngineType {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u === 'XL' || u === 'XLENGINE') return tb === 'CLAN' ? EngineType.XL_CLAN : EngineType.XL_IS;
  if (u === 'CLANXL' || u === 'CLAN_XL' || u === 'XLCLAN') return EngineType.XL_CLAN;
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
  if (u.includes('HARDENED')) return 'hardened'; if (u.includes('REACTIVE')) return 'reactive';
  if (u.includes('REFLECTIVE') || u.includes('LASERREFLECTIVE')) return 'reflective';
  if (u.includes('BALLISTICREINFORCED')) return 'ballistic-reinforced';
  if (u.includes('FERROLAMELLOR')) return 'ferro-lamellor'; if (u.includes('STEALTH')) return 'stealth';
  if (u.includes('ANTIPENETRATIVE') || u.includes('ABLATION')) return 'anti-penetrative';
  if (u.includes('HEATDISSIPATING')) return 'heat-dissipating';
  return 'standard';
}
function mapStructureType(s: string): string { const u = s.toUpperCase().replace(/[_\s-]+/g, ''); if (u.includes('INDUSTRIAL')) return 'industrial'; if (u.includes('ENDOCOMPOSITE')) return 'endo-composite'; if (u.includes('COMPOSITE')) return 'composite'; if (u.includes('REINFORCED')) return 'reinforced'; return 'standard'; }
function mapGyroType(s: string): string { const u = s.toUpperCase().replace(/[_\s-]+/g, ''); if (u.includes('HEAVYDUTY') || u.includes('HEAVY')) return 'heavy-duty'; if (u.includes('XL')) return 'xl'; if (u.includes('COMPACT')) return 'compact'; return 'standard'; }
function mapCockpitType(s: string): CockpitType { const u = s.toUpperCase().replace(/[_\s-]+/g, ''); if (u.includes('SMALL') && u.includes('COMMAND')) return 'small-command-console'; if (u.includes('SMALL')) return 'small'; if (u.includes('TORSOMOUNTED') || u.includes('TORSO')) return 'torso-mounted'; if (u.includes('COMMANDCONSOLE') || u.includes('COMMAND')) return 'command-console'; if (u.includes('INTERFACE')) return 'interface'; if (u.includes('DRONE')) return 'drone-operating-system'; return 'standard'; }

// === STRUCTURE/ARMOR ===
function calcTotalStructure(ton: number, config?: string): number {
  const isQuad = config?.toLowerCase() === 'quad';
  const limbIS = (t: any) => isQuad ? t.leg * 4 : t.arm * 2 + t.leg * 2;
  const t = STRUCTURE_POINTS_TABLE[ton];
  if (!t) { const k = Object.keys(STRUCTURE_POINTS_TABLE).map(Number).sort((a,b)=>a-b).filter(x=>x<=ton).pop(); if (k) { const t2 = STRUCTURE_POINTS_TABLE[k]; return t2.head+t2.centerTorso+t2.sideTorso*2+limbIS(t2); } return 0; }
  return t.head+t.centerTorso+t.sideTorso*2+limbIS(t);
}
function calcTotalArmor(a: ArmorAllocation): number { let t=0; for (const v of Object.values(a)) { if (typeof v==='number') t+=v; else if (v && typeof v==='object') t+=(v.front||0)+(v.rear||0); } return t; }
function calcHeatDissipation(hs: { type: string; count: number }): number { const t = hs.type.toUpperCase(); return hs.count * ((t.includes('DOUBLE') || t.includes('LASER')) ? 2 : 1); }

// === LOCATION HELPERS ===
function toMechLoc(l: string): MechLocation | null { const u = l.toUpperCase().replace(/[_\s-]+/g, ''); if (u==='HEAD'||u==='HD') return 'HD'; if (u==='CENTERTORSO'||u==='CT') return 'CT'; if (u==='LEFTTORSO'||u==='LT') return 'LT'; if (u==='RIGHTTORSO'||u==='RT') return 'RT'; if (u==='LEFTARM'||u==='LA') return 'LA'; if (u==='RIGHTARM'||u==='RA') return 'RA'; if (u==='LEFTLEG'||u==='LL') return 'LL'; if (u==='RIGHTLEG'||u==='RL') return 'RL'; if (u==='FRONTLEFTLEG'||u==='FLL') return 'LA'; if (u==='FRONTRIGHTLEG'||u==='FRL') return 'RA'; if (u==='REARLEFTLEG'||u==='RLL') return 'LL'; if (u==='REARRIGHTLEG'||u==='RRL') return 'RL'; return null; }
function isRearLoc(l: string): boolean { const lo = l.toLowerCase(); return lo.includes('rear') || lo.includes('(r)'); }

function normalizeCritName(s: string): string {
  return s.replace(/\s*\(R\)/g, '').replace(/\s*\(omnipod\)/gi, '').trim().toLowerCase()
    .replace(/^(is|cl|clan)\s*/i, '').replace(/[^a-z0-9]/g, '');
}

function normalizeEquipId(s: string): string {
  return s.replace(/^\d+-/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isWeaponRearMounted(equipId: string, locSlots: (string | null)[]): boolean {
  const eqNorm = normalizeEquipId(equipId);
  const eqCanonical = normalizeEquipmentId(equipId);
  for (const slot of locSlots) {
    if (!slot || typeof slot !== 'string' || !slot.includes('(R)')) continue;
    const slotNorm = normalizeCritName(slot);
    if (slotNorm === eqNorm) return true;
    if (slotNorm.includes(eqNorm) || eqNorm.includes(slotNorm)) return true;
    if (normalizeEquipmentId(slotNorm) === eqCanonical) return true;
  }
  return false;
}
function isArmLoc(l: string): boolean { const lo = l.toLowerCase(); return lo.includes('left_arm') || lo.includes('right_arm'); }

/**
 * Detect if equipment at a given location is Clan-tech by checking critical slot names.
 * MegaMek crit names use 'CL' prefix for Clan equipment (e.g., CLERMediumLaser, CLStreakSRM6).
 * For MIXED tech units, this disambiguates IS vs Clan variants that share generic equipment IDs.
 */
function isClanEquipAtLocation(equipId: string, location: string, criticalSlots?: Record<string, (string | null)[]>): boolean {
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
      const clean = slot.replace(/\s*\(omnipod\)/gi, '').replace(/\s*\(R\)/g, '').trim();
      // Check if this crit slot starts with CL (Clan equipment marker)
      if (!/^CL/i.test(clean)) continue;
      // Normalize after stripping CL prefix to compare with equipment ID
      const slotNorm = clean.toLowerCase().replace(/^(cl|clan)\s*/i, '').replace(/[^a-z0-9]/g, '');
      if (slotNorm === eqNorm || slotNorm.includes(eqNorm) || eqNorm.includes(slotNorm)) return true;
    }
  }
  return false;
}

// Hardcoded BV/heat for weapons missing from the equipment catalog.
// Values from MegaMek data files and TechManual.
const FALLBACK_WEAPON_BV: Record<string, { bv: number; heat: number }> = {
  'plasma-rifle': { bv: 210, heat: 10 }, 'isplasmarifle': { bv: 210, heat: 10 },
  'plasma-cannon': { bv: 170, heat: 7 }, 'clplasmacannon': { bv: 170, heat: 7 },
  'clan-plasma-cannon': { bv: 170, heat: 7 },
  'particle-cannon': { bv: 176, heat: 10 },
  'tsemp-cannon': { bv: 488, heat: 10 }, 'tsemp-one-shot': { bv: 98, heat: 10 },
  'tsemp-repeating-cannon': { bv: 600, heat: 10 },
  'fluid-gun': { bv: 6, heat: 0 }, 'isfluidgun': { bv: 6, heat: 0 },
  'binary-laser-blazer-cannon': { bv: 222, heat: 16 }, 'blazer-cannon': { bv: 222, heat: 16 },
  'silver-bullet-gauss-rifle': { bv: 198, heat: 1 },
  'risc-hyper-laser': { bv: 596, heat: 24 },
  'medium-vsp': { bv: 56, heat: 7 }, 'ismediumvsplaser': { bv: 56, heat: 7 }, 'islargevsplaser': { bv: 123, heat: 10 },
  'large-vsp': { bv: 123, heat: 10 }, 'small-vsp': { bv: 22, heat: 3 }, 'issmallvsplaser': { bv: 22, heat: 3 },
  'medium-chem-laser': { bv: 37, heat: 2 }, 'small-chem-laser': { bv: 7, heat: 1 }, 'large-chem-laser': { bv: 99, heat: 4 },
  'clan-medium-chemical-laser': { bv: 37, heat: 2 }, 'clmediumchemlaser': { bv: 37, heat: 2 },
  'bombast-laser': { bv: 137, heat: 12 }, 'isbombastlaser': { bv: 137, heat: 12 },
  'improved-large-laser': { bv: 123, heat: 8 }, 'improved-medium-laser': { bv: 60, heat: 3 }, 'improved-small-laser': { bv: 12, heat: 1 },
  'enhanced-ppc': { bv: 329, heat: 15 },
  'flamer-vehicle': { bv: 5, heat: 3 }, 'iserflamer': { bv: 16, heat: 4 }, 'clerflamer': { bv: 16, heat: 4 },
  'islightmg': { bv: 5, heat: 0 }, 'clmg': { bv: 5, heat: 0 }, 'clheavysmalllaser': { bv: 15, heat: 3 },
  'isarrowivsystem': { bv: 240, heat: 10 }, 'arrow-iv-system': { bv: 240, heat: 10 }, 'arrow-iv': { bv: 240, heat: 10 },
  'clarrowiv': { bv: 240, heat: 10 }, 'clan-arrow-iv': { bv: 240, heat: 10 },
  'sniper': { bv: 85, heat: 10 }, 'thumper': { bv: 43, heat: 5 }, 'long-tom-cannon': { bv: 329, heat: 20 },
  'sniper-cannon': { bv: 77, heat: 10 }, 'thumper-cannon': { bv: 41, heat: 5 },
  'nail-rivet-gun': { bv: 7, heat: 0 }, 'nail-gun': { bv: 7, heat: 0 },
  'battlemech-taser': { bv: 40, heat: 6 }, 'mech-taser': { bv: 40, heat: 6 }, 'ismektaser': { bv: 40, heat: 6 }, 'taser': { bv: 40, heat: 6 },
  'light-blazer': { bv: 65, heat: 6 },
  'islaserantimissilesystem': { bv: 45, heat: 7 }, 'laser-ams': { bv: 45, heat: 7 },
  'clan-laser-ams': { bv: 45, heat: 7 }, 'cllaserantimissilesystem': { bv: 45, heat: 7 },
  'risc-advanced-point-defense-system': { bv: 150, heat: 0 },
  'issmallxpulselaser': { bv: 21, heat: 3 }, 'ismediumxpulselaser': { bv: 71, heat: 6 }, 'islargexpulselaser': { bv: 178, heat: 14 },
  'primitive-prototype-ppc': { bv: 176, heat: 15 }, 'ppcp': { bv: 176, heat: 15 },
  'heavy-rifle': { bv: 64, heat: 4 }, 'isheavyrifle': { bv: 64, heat: 4 },
  'medium-rifle': { bv: 35, heat: 2 }, 'light-rifle': { bv: 21, heat: 1 }, 'rifle-cannon': { bv: 35, heat: 2 },
  'mortar-1': { bv: 10, heat: 0 }, 'mortar-2': { bv: 14, heat: 0 }, 'mortar-4': { bv: 24, heat: 0 }, 'mortar-8': { bv: 36, heat: 0 },
  'streak-srm-2-os': { bv: 30, heat: 2 }, 'streak-srm-4-os': { bv: 59, heat: 3 },
  'streak-srm-2-i-os': { bv: 30, heat: 2 }, 'streak-srm-4-i-os': { bv: 59, heat: 3 },
  'srm-2-os': { bv: 21, heat: 2 }, 'srm-6-os': { bv: 59, heat: 4 },
  'narc-i-os': { bv: 30, heat: 0 },
  'prototype-er-medium-laser': { bv: 62, heat: 5 }, 'prototype-er-small-laser': { bv: 31, heat: 2 },
  'er-large-laser-prototype': { bv: 163, heat: 12 },
  'prototype-streak-srm-4': { bv: 59, heat: 3 }, 'prototype-streak-srm-6': { bv: 89, heat: 4 },
  'prototype-ultra-autocannon-10': { bv: 210, heat: 4 }, 'prototype-lb-10-x-autocannon': { bv: 148, heat: 2 },
  'prototype-rocket-launcher-20': { bv: 24, heat: 5 },
  'rocket-launcher-10-pp': { bv: 18, heat: 3 }, 'ac-10p': { bv: 123, heat: 3 },
  'c3-boosted-system-master': { bv: 0, heat: 0 }, 'c3-computer-[master]': { bv: 0, heat: 0 },
  'islppc': { bv: 88, heat: 5 },
  'isblazer': { bv: 222, heat: 16 }, 'iseherppc': { bv: 329, heat: 15 },
  'clmicropulselaser': { bv: 12, heat: 1 },
  'issniperartcannon': { bv: 77, heat: 10 },
  'ismediumpulselaserprototype': { bv: 48, heat: 4 },
  'islbxac10prototype': { bv: 148, heat: 2 },
  'clrocketlauncher15prototype': { bv: 23, heat: 4 },
  // ER Pulse Lasers (Clan-only, but sometimes appear without clan- prefix on mixed-tech units)
  'er-medium-pulse-laser': { bv: 117, heat: 6 }, 'er-small-pulse-laser': { bv: 36, heat: 3 }, 'er-large-pulse-laser': { bv: 272, heat: 13 },
  // ISRemoteSensorDispenser - not a weapon, 0 BV
  'isremotesensordispenser': { bv: 0, heat: 0 }, 'remote-sensor-dispenser': { bv: 0, heat: 0 },
  // IS SRM-4 One-Shot (missing variant)
  'issrm4-os': { bv: 39, heat: 3 },
  // Clan Heavy Lasers (alternate IDs)
  'clheavymediumlaser': { bv: 76, heat: 7 }, 'clheavylargelaser': { bv: 244, heat: 18 },
  'clflamer': { bv: 6, heat: 3 },
  // Mech Mortars (alternate IDs)
  'mech-mortar-4': { bv: 24, heat: 0 }, 'mech-mortar-8': { bv: 36, heat: 0 },
  // Improved SRM-6
  'improved-srm-6': { bv: 59, heat: 4 },
  // iATM (improved ATM)
  'iatm-3': { bv: 52, heat: 2 }, 'iatm-6': { bv: 104, heat: 4 }, 'iatm-9': { bv: 156, heat: 6 }, 'iatm-12': { bv: 208, heat: 8 },
  // ProtoMech ACs
  'protomechac2': { bv: 22, heat: 1 }, 'protomechac4': { bv: 49, heat: 1 }, 'protomechac8': { bv: 66, heat: 1 },
  // Streak LRM (Clan-only)
  'streaklrm5': { bv: 69, heat: 2 }, 'streaklrm10': { bv: 138, heat: 4 }, 'streaklrm15': { bv: 207, heat: 5 }, 'streaklrm20': { bv: 276, heat: 6 },
  'clstreaklrm10': { bv: 138, heat: 4 }, 'clstreaklrm15': { bv: 207, heat: 5 }, 'clstreaklrm20': { bv: 276, heat: 6 },
  // HAG (Hyper-Assault Gauss) - alternate IDs
  'clhag20': { bv: 267, heat: 4 }, 'clhag30': { bv: 401, heat: 6 }, 'clhag40': { bv: 535, heat: 8 },
  'hag20': { bv: 267, heat: 4 }, 'hag30': { bv: 401, heat: 6 }, 'hag40': { bv: 535, heat: 8 },
  // ATM (alternate IDs without hyphen)
  'clatm3': { bv: 52, heat: 2 }, 'clatm6': { bv: 104, heat: 4 }, 'clatm9': { bv: 156, heat: 6 }, 'clatm12': { bv: 208, heat: 8 },
  // Clan Small Pulse Laser (alternate ID)
  'clsmallpulselaser': { bv: 24, heat: 2 }, 'cllargepulselaser': { bv: 265, heat: 10 },
  // Clan Anti-Missile System (alternate IDs)
  'clantimissilesystem': { bv: 32, heat: 1 },
  // Heavy/Light Machine Guns (Clan)
  'light-machine-gun': { bv: 5, heat: 0 }, 'heavy-machine-gun': { bv: 6, heat: 0 },
  // Heavy Flamer
  'heavy-flamer': { bv: 15, heat: 5 },
  // Improved Heavy Lasers (Clan - alternate IDs)
  'improved-heavy-large-laser': { bv: 296, heat: 18 }, 'improved-heavy-medium-laser': { bv: 93, heat: 7 }, 'improved-heavy-small-laser': { bv: 19, heat: 3 },
  'large-heavy-laser': { bv: 244, heat: 18 }, 'medium-heavy-laser': { bv: 76, heat: 7 }, 'small-heavy-laser': { bv: 15, heat: 3 },
  'heavy-large-laser': { bv: 244, heat: 18 }, 'heavy-medium-laser': { bv: 76, heat: 7 }, 'heavy-small-laser': { bv: 15, heat: 3 },
  // AP Gauss Rifle
  'ap-gauss-rifle': { bv: 21, heat: 1 },
};

// BV overrides for weapons that exist in the catalog but have WRONG BV values.
// These take priority over catalog values. Values from MegaMek source.
const CATALOG_BV_OVERRIDES: Record<string, { bv: number; heat: number }> = {
  'heavy-ppc': { bv: 317, heat: 15 },
  'isheavyppc': { bv: 317, heat: 15 },
  'er-flamer': { bv: 16, heat: 4 },
  'erflamer': { bv: 16, heat: 4 },
  'iserflamer': { bv: 16, heat: 4 },
  // Clan ER Flamer has BV 15 (different from IS BV 16)
  'clerflamer': { bv: 15, heat: 4 },
  'clan-er-flamer': { bv: 15, heat: 4 },
  'clanerflamer': { bv: 15, heat: 4 },
  'small-re-engineered-laser': { bv: 14, heat: 4 },
  'smallreengineeredlaser': { bv: 14, heat: 4 },
  'issmallreengineeredlaser': { bv: 14, heat: 4 },
  'medium-re-engineered-laser': { bv: 65, heat: 6 },
  'mediumreengineeredlaser': { bv: 65, heat: 6 },
  'ismediumreengineeredlaser': { bv: 65, heat: 6 },
  'large-re-engineered-laser': { bv: 161, heat: 9 },
  'largereengineeredlaser': { bv: 161, heat: 9 },
  'islargereengineeredlaser': { bv: 161, heat: 9 },
  // M-Pod: one-shot anti-infantry weapon, BV=5, heat=0 per MegaMek
  'm-pod': { bv: 5, heat: 0 },
  'mpod': { bv: 5, heat: 0 },
  'ismpod': { bv: 5, heat: 0 },
  'clmpod': { bv: 5, heat: 0 },
  // Thunderbolt missiles: catalog has heat=0, correct values per MegaMek
  'thunderbolt-5': { bv: 64, heat: 3 },
  'thunderbolt-10': { bv: 127, heat: 5 },
  'thunderbolt-15': { bv: 229, heat: 7 },
  'thunderbolt-20': { bv: 305, heat: 8 },
  'isthunderbolt5': { bv: 64, heat: 3 },
  'isthunderbolt10': { bv: 127, heat: 5 },
  'isthunderbolt15': { bv: 229, heat: 7 },
  'isthunderbolt20': { bv: 305, heat: 8 },
  // One-shot Thunderbolts: heat / 4 per MegaMek one-shot rule
  'thunderbolt-5-os': { bv: 13, heat: 0.75 },
  'thunderbolt-10-os': { bv: 25, heat: 1.25 },
  'thunderbolt-15-os': { bv: 46, heat: 1.75 },
  'thunderbolt-20-os': { bv: 61, heat: 2 },
  'thunderbolt-5-i-os': { bv: 13, heat: 0.75 },
  'thunderbolt-10-i-os': { bv: 25, heat: 1.25 },
  'thunderbolt-15-i-os': { bv: 46, heat: 1.75 },
  'thunderbolt-20-i-os': { bv: 61, heat: 2 },
};

function resolveWeaponForUnit(id: string, techBase: string, isClanEquip?: boolean): { battleValue: number; heat: number; resolved: boolean } {
  const lo = id.toLowerCase().replace(/^\d+-/, '');
  const normId = normalizeEquipmentId(lo);
  const override = CATALOG_BV_OVERRIDES[lo] || CATALOG_BV_OVERRIDES[normId] || CATALOG_BV_OVERRIDES[lo.replace(/^(is|cl|clan)/, '')];
  if (override) return { battleValue: override.bv, heat: override.heat, resolved: true };
  const isResult = resolveEquipmentBV(id);
  if (techBase === 'CLAN' || isClanEquip || (techBase === 'MIXED' && (lo.startsWith('clan-') || lo.startsWith('cl-') || lo.startsWith('cl ')))) {
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
        if (!isResult.resolved || cr.battleValue > isResult.battleValue) return cr;
        if (isResult.battleValue === cr.battleValue) return cr;
      }
    }
  }
  if (isResult.resolved && isResult.battleValue > 0) return isResult;
  const stripped = id.replace(/^\d+-/, '');
  if (stripped !== id) { const sr = resolveEquipmentBV(stripped); if (sr.resolved && sr.battleValue > 0) return sr; }
  // For MIXED units: if IS resolution failed, try Clan resolution as fallback
  // (handles Clan-exclusive weapons like ER Pulse Lasers on mixed-tech units)
  if (techBase === 'MIXED' && (!isResult.resolved || isResult.battleValue === 0)) {
    const normalizedMixed = normalizeEquipmentId(lo);
    const clanCandidates: string[] = [];
    if (!normalizedMixed.startsWith('clan-')) clanCandidates.push('clan-' + normalizedMixed);
    if (!lo.startsWith('clan-') && lo !== normalizedMixed) clanCandidates.push('clan-' + lo);
    for (const cid of clanCandidates) {
      const cr = resolveEquipmentBV(cid);
      if (cr.resolved && cr.battleValue > 0) return cr;
    }
  }
  // Fallback: check hardcoded weapon BV map for catalog gaps
  const norm = normalizeEquipmentId(lo);
  const fb = FALLBACK_WEAPON_BV[lo] || FALLBACK_WEAPON_BV[norm] || FALLBACK_WEAPON_BV[lo.replace(/^(is|cl|clan)/, '')];
  if (fb) return { battleValue: fb.bv, heat: fb.heat, resolved: true };
  return isResult;
}

// === CRIT SLOT SCANNER ===
interface CritScan {
  hasTC: boolean; hasTSM: boolean; hasMASC: boolean; hasSupercharger: boolean;
  hasECM: boolean; hasAngelECM: boolean; hasActiveProbe: boolean; hasBloodhound: boolean;
  hasPartialWing: boolean; hasNullSig: boolean; hasVoidSig: boolean; hasChameleon: boolean;
  hasImprovedJJ: boolean; hasWatchdog: boolean; detectedSmallCockpit: boolean; detectedInterfaceCockpit: boolean; detectedDroneOS: boolean; coolantPods: number; heatSinkCount: number; hasRadicalHS: boolean; critDHSCount: number; hasLargeShield: boolean;
  aesLocs: string[];
  mgaLocs: Array<{ location: string; type: 'light' | 'standard' | 'heavy' }>;
  harjelIILocs: MechLocation[]; harjelIIILocs: MechLocation[];
  caseLocs: MechLocation[]; caseIILocs: MechLocation[];
  artemisIVLocs: string[]; artemisVLocs: string[]; apollo: number; ppcCap: number;
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
}

function classifyPhysicalWeapon(slotLower: string): string | null {
  const s = slotLower.replace(/\s*\(omnipod\)/gi, '').trim();
  if (s === 'hatchet') return 'hatchet';
  if (s === 'sword') return 'sword';
  if (s === 'mace') return 'mace';
  if (s === 'is lance' || s === 'lance') return 'lance';
  if (s.startsWith('retractable blade')) return 'retractable-blade';
  if (s === 'isclaw' || s === 'clclaw' || s === 'claw' || s === 'claws') return 'claw';
  if (s === 'talons') return 'talon';
  if (s === 'is flail' || s === 'flail') return 'flail';
  if (s === 'is wrecking ball' || s === 'wrecking ball') return 'wrecking-ball';
  if (s === 'chain whip') return 'chain-whip';
  if (s === 'buzzsaw' || s === 'is buzzsaw' || s === 'clan buzzsaw' || s === 'clbuzzsaw') return 'buzzsaw';
  if (s === 'dual saw' || s === 'is dual saw') return 'dual-saw';
  if (s === 'miningdrill' || s === 'mining drill' || s === 'is mining drill') return 'mining-drill';
  if (s.includes('vibroblade') || s === 'islargevibroblade' || s === 'ismediumvibroblade' || s === 'issmallvibroblade') {
    if (s.includes('large')) return 'vibroblade-large';
    if (s.includes('small')) return 'vibroblade-small';
    return 'vibroblade-medium';
  }
  return null;
}

function calculatePhysicalWeaponBV(type: string, tonnage: number, hasTSM: boolean): number {
  const tsmMod = hasTSM ? 2 : 1;
  switch (type) {
    case 'hatchet': return Math.ceil(tonnage / 5.0) * 1.5 * tsmMod;
    case 'sword': return Math.ceil((tonnage / 10.0) + 1) * 1.725 * tsmMod;
    case 'lance': return Math.ceil(tonnage / 5.0) * tsmMod;
    case 'mace': return Math.ceil(tonnage / 4.0) * tsmMod;
    case 'retractable-blade': return Math.ceil(tonnage / 10.0) * 1.725 * tsmMod;
    case 'claw': return Math.ceil(tonnage / 7.0) * 1.275 * tsmMod;
    case 'talon': return Math.round(Math.floor(tonnage / 5.0) * 0.5) * tsmMod;
    case 'flail': return 11;
    case 'wrecking-ball': return 8;
    case 'chain-whip': return 5.175;
    case 'buzzsaw': return 67;
    case 'dual-saw': return Math.ceil(tonnage / 7.0);  // Industrial melee, no TSM bonus
    case 'mining-drill': return Math.ceil(tonnage / 5.0);  // Industrial melee, no TSM bonus
    case 'vibroblade-large': return Math.ceil(tonnage / 5.0) * 1.725 * tsmMod;
    case 'vibroblade-medium': return Math.ceil(tonnage / 7.0) * 1.725 * tsmMod;
    case 'vibroblade-small': return (Math.ceil(tonnage / 10.0) + 1) * 1.725 * tsmMod;
    default: return 0;
  }
}

let _weaponSlotCache: Map<string, number> | null = null;
function getWeaponSlotCounts(): Map<string, number> {
  if (_weaponSlotCache) return _weaponSlotCache;
  _weaponSlotCache = new Map();
  const catalogs = ['energy.json', 'ballistic.json', 'missile.json'];
  for (const cat of catalogs) {
    try {
      const d = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'public/data/equipment/official/weapons/' + cat), 'utf-8'));
      for (const item of (d.items || [])) {
        if (item.criticalSlots && item.criticalSlots > 0) {
          const norm = item.id.toLowerCase().replace(/[^a-z0-9]/g, '');
          _weaponSlotCache.set(norm, item.criticalSlots);
          const clanNorm = ('clan' + item.id).toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!_weaponSlotCache.has(clanNorm)) _weaponSlotCache.set(clanNorm, item.criticalSlots);
        }
      }
    } catch { /* ignore */ }
  }
  return _weaponSlotCache;
}

function scanCrits(unit: UnitData): CritScan {
  const r: CritScan = { hasTC: false, hasTSM: false, hasMASC: false, hasSupercharger: false, hasECM: false, hasAngelECM: false, hasActiveProbe: false, hasBloodhound: false, hasPartialWing: false, hasNullSig: false, hasVoidSig: false, hasChameleon: false, hasImprovedJJ: false, hasWatchdog: false, detectedSmallCockpit: false, detectedInterfaceCockpit: false, detectedDroneOS: false, coolantPods: 0, heatSinkCount: 0, hasRadicalHS: false, critDHSCount: 0, aesLocs: [], mgaLocs: [], harjelIILocs: [], harjelIIILocs: [], caseLocs: [], caseIILocs: [], artemisIVLocs: [], artemisVLocs: [], apollo: 0, ppcCap: 0, ammo: [], explosive: [], defEquipIds: [], detectedArmorType: null, physicalWeapons: [], rearWeaponCountByLoc: new Map(), amsAmmoBV: 0, armoredComponentBV: 0, umuMP: 0, detectedGyroType: null, modularArmorSlots: 0, hasLargeShield: false, spikeCount: 0 };
  if (!unit.criticalSlots) return r;
  const rearSlotsByLoc = new Map<string, Map<string, number>>();

  for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
    const ml = toMechLoc(loc);
    if (!Array.isArray(slots)) continue;
    let prevSlotClean: string | null = null;
    for (const slot of slots) {
      if (!slot || typeof slot !== 'string') { prevSlotClean = null; continue; }
      const clean = slot.replace(/\s*\(omnipod\)/gi, '').trim();
      const lo = clean.toLowerCase();

      // Armored components: each "(armored)" crit slot adds 5 BV (MekBVCalculator.processDefensiveEquipment)
      if (lo.includes('(armored)') || lo.includes('armored')) {
        const isArmoredComponent = lo.includes('(armored)') || (lo.endsWith('armored') && !lo.includes('armor'));
        if (isArmoredComponent) r.armoredComponentBV += 5;
      }

      // Modular Armor: each slot adds 10 armor points (MekBVCalculator uses entity.getTotalOArmor() which includes modular armor)
      if (lo.includes('modulararmor') || lo.includes('modular armor')) r.modularArmorSlots++;

      // CASE
      if (lo.includes('case ii') || lo.includes('caseii') || lo.includes('clcaseii') || lo.includes('iscaseii')) { if (ml && !r.caseIILocs.includes(ml)) r.caseIILocs.push(ml); }
      else if (lo.includes('case') && !lo.includes('case ii')) { if (ml && !r.caseLocs.includes(ml)) r.caseLocs.push(ml); }

      // Equipment flags
      if (lo.includes('targeting computer') || lo.includes('targetingcomputer')) r.hasTC = true;
      else if (lo === 'tsm' || lo.includes('triple strength') || lo.includes('triplestrength')) r.hasTSM = true;
      else if (lo.includes('masc') && !lo.includes('ammo')) r.hasMASC = true;
      else if (lo.includes('supercharger') || lo.includes('super charger')) r.hasSupercharger = true;
      else if (lo.includes('novacews') || lo.includes('nova cews')) { r.hasAngelECM = true; r.hasActiveProbe = true; r.hasWatchdog = true; }
      else if ((lo.includes('angel') && lo.includes('ecm')) || lo.includes('watchdog')) { r.hasAngelECM = true; r.hasWatchdog = true; }
      else if (lo.includes('ecm') || lo.includes('guardian')) r.hasECM = true;
      else if (lo.includes('bloodhound')) r.hasBloodhound = true;
      else if (lo.includes('beagle') || (lo.includes('active') && lo.includes('probe'))) r.hasActiveProbe = true;
      else if (lo.includes('null') && lo.includes('sig')) r.hasNullSig = true;
      else if (lo.includes('void') && lo.includes('sig')) r.hasVoidSig = true;
      else if (lo.includes('chameleon') && (lo.includes('shield') || lo.includes('polarization') || lo.includes('lps'))) r.hasChameleon = true;
      else if (lo.includes('partial') && lo.includes('wing')) r.hasPartialWing = true;
      else if (lo.includes('umu') && !lo.includes('ammo') && !lo.includes('accumul') && (lo === 'umu' || lo === 'isumu' || lo === 'clumu' || lo.startsWith('umu ') || lo.startsWith('umu(') || /\bumu\b/.test(lo))) r.umuMP++;
      else if (lo.includes('aes') && (lo.includes('actuator') || lo === 'isaes' || lo === 'claes' || lo === 'is aes' || lo === 'clan aes' || lo === 'aes')) { if (ml && !r.aesLocs.includes(loc)) r.aesLocs.push(loc); }
      else if (lo.includes('machine gun array') || /^(?:is|cl)(?:l|h)?mga$/.test(lo)) {
        const mgaType = lo.includes('light') || /^(?:is|cl)lmga$/.test(lo) ? 'light' : lo.includes('heavy') || /^(?:is|cl)hmga$/.test(lo) ? 'heavy' : 'standard';
        r.mgaLocs.push({ location: loc, type: mgaType });
      }
      else if (lo.includes('apollo')) r.apollo++;
      else if (lo.includes('ppc capacitor') || lo.includes('ppccapacitor')) r.ppcCap++;

      // Improved Jump Jets
      if (lo.includes('improved jump jet') || lo === 'isimprovedjumpjet' || lo === 'climprovedjumpjet') r.hasImprovedJJ = true;

      // Coolant Pods (count for heat efficiency bonus)
      if (lo.includes('coolant pod') || lo === 'iscoolantpod' || lo === 'clcoolantpod' || lo === 'is-coolant-pod') r.coolantPods++;

      // Radical Heat Sink System
      if (lo.includes('radical heat sink') || lo.includes('radicalheatsink')) r.hasRadicalHS = true;

      // HarJel II/III (per-location armor BV multiplier)
      if (lo.includes('harjel iii') || lo.includes('harjel3') || lo === 'harjel iii self-repair system') { if (ml && !r.harjelIIILocs.includes(ml)) r.harjelIIILocs.push(ml); }
      else if (lo.includes('harjel ii') || lo.includes('harjel2') || lo === 'harjel ii self-repair system') { if (ml && !r.harjelIILocs.includes(ml)) r.harjelIILocs.push(ml); }

      // Artemis
      if ((lo.includes('artemisv') || lo.includes('artemis v')) && !lo.includes('artemis iv') && !lo.includes('ammo') && !lo.includes('capable')) { if (ml) r.artemisVLocs.push(ml); }
      else if (lo.includes('artemis') && !lo.includes('ammo') && !lo.includes('capable') && !lo.includes('artemisv') && !lo.includes('artemis v')) { if (ml) r.artemisIVLocs.push(ml); }

      // Ammo
      if (lo.includes('ammo') && !lo.includes('ammo feed')) {
        const isNonExplosiveAmmo = lo.includes('gauss') || lo.includes('magshot') || lo.includes('plasma') || lo.includes('fluid') || lo.includes('nail') || lo.includes('rivet') || lo.includes('c3') || lo.includes('sensor') || lo.includes('rail gun');
        if (ml && !isNonExplosiveAmmo) r.explosive.push({ location: ml, slots: 1, penaltyCategory: 'standard' });
        const pr = resolveAmmoByPattern(clean, unit.techBase);
        if (pr && pr.bv > 0) { r.ammo.push({ id: clean, bv: pr.bv, weaponType: pr.weaponType, location: loc }); }
        else {
          const ar = resolveAmmoBV(clean);
          if (ar.resolved && ar.battleValue > 0) { r.ammo.push({ id: clean, bv: ar.battleValue, weaponType: normalizeWeaponKey(ar.weaponType), location: loc }); }
          else if (pr) { r.ammo.push({ id: clean, bv: pr.bv, weaponType: pr.weaponType, location: loc }); }
        }
        // AMS/APDS ammo — accumulate BV for defensive equipment (capped at AMS weapon BV)
        const isAmsAmmo = (lo.includes('ams') || lo.includes('anti-missile') || lo.includes('antimissile')) && lo.includes('ammo');
        const isApdsAmmo = lo.includes('apds') && lo.includes('ammo');
        if (isAmsAmmo || isApdsAmmo) {
          // IS AMS ammo = 11 BV, Clan AMS ammo = 22 BV, APDS ammo = 22 BV
          if (isApdsAmmo) { r.amsAmmoBV += 22; }
          else if (lo.includes('cl') || unit.techBase === 'CLAN') { r.amsAmmoBV += 22; }
          else { r.amsAmmoBV += 11; }
        }
      }

      // NARC/iNARC Pods — ammo named "Pods" not "Ammo"; treat as explosive
      if ((lo.includes('narc') || lo.includes('inarc')) && lo.endsWith('pods') && !lo.includes('ammo')) {
        if (ml) r.explosive.push({ location: ml, slots: 1, penaltyCategory: 'standard' });
      }

      // Gauss explosive
      if (lo.includes('gauss') && !lo.includes('ammo') && !lo.includes('ap gauss')) { if (ml) r.explosive.push({ location: ml, slots: 1, penaltyCategory: 'gauss' }); }

      // Improved Heavy Lasers: 1 BV per slot (reduced penalty) per MekBVCalculator
      if ((lo.includes('improvedheavylaser') || lo.includes('improved heavy laser') || lo.includes('improvedmediumheavylaser') || lo.includes('improved medium heavy') || lo.includes('improvedsmallheavylaser') || lo.includes('improved small heavy') || lo.includes('improvedlargeheavylaser') || lo.includes('improved large heavy')) && !lo.includes('ammo')) { if (ml) r.explosive.push({ location: ml, slots: 1, penaltyCategory: 'reduced' }); }

      // Defensive equip — push once per equipment instance (skip consecutive duplicate slots for multi-slot items)
      if ((lo.includes('anti-missile') || lo.includes('antimissile') || lo === 'isams' || lo === 'clams') && !lo.includes('ammo')) { if (clean !== prevSlotClean) r.defEquipIds.push(clean); }
      else if ((lo.includes('ecm') || lo.includes('guardian') || lo.includes('angel') || lo.includes('watchdog') || lo.includes('novacews') || lo.includes('nova cews')) && !lo.includes('ammo')) { if (clean !== prevSlotClean) r.defEquipIds.push(clean); }
      else if ((lo.includes('beagle') || lo.includes('bloodhound') || (lo.includes('active') && lo.includes('probe'))) && !lo.includes('ammo')) { if (clean !== prevSlotClean) r.defEquipIds.push(clean); }
      else if (lo.includes('shield') && !lo.includes('blue-shield') && !lo.includes('chameleon')) {
        if (clean !== prevSlotClean) r.defEquipIds.push(clean);
        if (lo.includes('large')) r.hasLargeShield = true;
      }
      else if ((lo.includes('b-pod') || lo === 'isbpod' || lo === 'clbpod') && !lo.includes('ammo')) r.defEquipIds.push(clean);
      // M-Pod is an offensive weapon (BV=5), NOT defensive equipment — handled via equipment list
      else if ((lo.includes('a-pod') || lo === 'isapod' || lo === 'clapod') && !lo.includes('ammo')) r.defEquipIds.push(clean);
      // Spikes: defensive equipment, BV=4 per location (MegaMek MiscType.F_CLUB + countsAsDefensiveEquipment)
      if ((lo === 'spikes' || lo === 'isspikes' || lo === 'clspikes' || lo === 'is spikes' || lo === 'clan spikes') && clean !== prevSlotClean) r.spikeCount++;

      prevSlotClean = clean;

      // Physical weapons — detect first slot only (they span multiple slots)
      const physType = classifyPhysicalWeapon(lo);
      if (physType) {
        const key = physType + '@' + loc;
        if (!r.physicalWeapons.some(pw => (pw.type + '@' + pw.location) === key)) {
          r.physicalWeapons.push({ type: physType, location: loc });
        }
      }
    }
  }

  const allSlots = Object.values(unit.criticalSlots).flat().filter((s): s is string => !!s && typeof s === 'string');
  const allSlotsLo = allSlots.map(s => s.toLowerCase());
  if (allSlotsLo.some(s => s.includes('ferro-lamellor'))) r.detectedArmorType = 'ferro-lamellor';
  else if (allSlotsLo.some(s => s.includes('ballistic-reinforced') || s.includes('ballistic reinforced'))) r.detectedArmorType = 'ballistic-reinforced';
  else if (allSlotsLo.some(s => (s.includes('reactive') && !s.includes('ferro')))) r.detectedArmorType = 'reactive';
  else if (allSlotsLo.some(s => (s.includes('reflective') || s.includes('laser-reflective')) && !s.includes('ferro'))) r.detectedArmorType = 'reflective';
  else if (allSlotsLo.some(s => s.includes('hardened armor') || s.includes('is hardened'))) r.detectedArmorType = 'hardened';
  else if (allSlotsLo.some(s => s.includes('anti-penetrative') || s.includes('ablation'))) r.detectedArmorType = 'anti-penetrative';
  else if (allSlotsLo.some(s => s.includes('heat-dissipating'))) r.detectedArmorType = 'heat-dissipating';

  // Detect gyro type from CT crit slot count: Standard/HD=4, XL=6, Compact=2, None=0
  const ctSlots = unit.criticalSlots['CENTER_TORSO'] || unit.criticalSlots['CT'] || [];
  const gyroSlotCount = (ctSlots as string[]).filter((s: string) => s && typeof s === 'string' && s.toLowerCase().includes('gyro')).length;
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
      if (!slot || typeof slot !== 'string') { flushRun(); prevRearNorm = null; runLength = 0; continue; }
      const slotClean = slot.replace(/\s*\(omnipod\)/gi, '').trim();
      const slotLo = slotClean.toLowerCase();
      if (!slotClean.includes('(R)') || slotLo.includes('ammo') || slotLo.includes('heat sink') || slotLo.includes('engine') || slotLo.includes('gyro') || slotLo.includes('case') || slotLo.includes('lift hoist')) {
        flushRun(); prevRearNorm = null; runLength = 0; continue;
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
  {
    let dhsCritSlots = 0;
    const isClanTech = unit.techBase === 'CLAN';
    for (const [, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (!s || typeof s !== 'string') continue;
        const lo = s.replace(/\s*\(omnipod\)/gi, '').trim().toLowerCase();
        if (lo.includes('double heat sink') || lo === 'isdoubleheatsink' || lo === 'cldoubleheatsink') {
          dhsCritSlots++;
        }
      }
    }
    // Clan DHS = 2 crit slots each, IS DHS = 3 crit slots each
    const slotsPerDHS = isClanTech ? 2 : 3;
    r.critDHSCount = Math.round(dhsCritSlots / slotsPerDHS);
  }

  // Clan mechs have built-in CASE in all non-head locations.
  // MIXED tech units with Clan engines (e.g. CLAN_XL) also inherit built-in Clan CASE.
  const hasClanCASE = unit.techBase === 'CLAN' ||
    (unit.techBase === 'MIXED' && (unit.engine?.type || '').toUpperCase().includes('CLAN'));
  if (hasClanCASE) {
    for (const loc of ['LT', 'RT', 'LA', 'RA'] as MechLocation[]) {
      if (!r.caseLocs.includes(loc) && !r.caseIILocs.includes(loc)) r.caseLocs.push(loc);
    }
  }

  // Small cockpit detection:
  // 1. Prefer unit.cockpit field if it says SMALL
  // 2. Crit-based: Small cockpit HEAD layout = [LS, Sensors, Cockpit, Sensors, ?, ?]
  //    (Sensors in slot 4) vs standard = [LS, Sensors, Cockpit, ?, Sensors, LS]
  //    (Sensors in slot 5, LS in slots 1 and 6)
  if (unit.cockpit && unit.cockpit.toUpperCase().includes('SMALL')) r.detectedSmallCockpit = true;
  const headSlots = unit.criticalSlots?.HEAD;
  if (!r.detectedSmallCockpit && Array.isArray(headSlots) && headSlots.length >= 4) {
    const slot4 = headSlots[3]; // 0-indexed
    const lsCount = headSlots.filter((s: string | null) => s && s.includes('Life Support')).length;
    if (slot4 && typeof slot4 === 'string' && slot4.includes('Sensors') && lsCount === 1) {
      r.detectedSmallCockpit = true;
    }
  }

  // Interface Cockpit detection: HEAD has 2 "Cockpit" entries AND no "Gyro" anywhere in crits.
  // Command Console mechs also have 2 cockpit entries in HEAD but DO have Gyro entries.
  if (Array.isArray(headSlots)) {
    let cockpitCount = 0;
    for (const hs of headSlots) {
      if (hs && typeof hs === 'string' && hs.toLowerCase().includes('cockpit')) cockpitCount++;
    }
    if (cockpitCount >= 2) {
      const hasGyroAnywhere = allSlotsLo.some(s => s.includes('gyro'));
      if (!hasGyroAnywhere) r.detectedInterfaceCockpit = true;
    }
  }

  // Drone Operating System detection: cockpit field says STANDARD but crits have ISDroneOperatingSystem
  if (allSlotsLo.some(s => s.includes('droneoperatingsystem') || s.includes('drone operating system'))) {
    r.detectedDroneOS = true;
  }

  return r;
}

// === AMMO WEAPON KEY NORMALIZATION ===
// MegaMek matches ammo to weapons by ammoType:rackSize. We normalize both
// ammo weaponType and weapon IDs to a common key for matching.
function normalizeWeaponKey(id: string): string {
  let s = id.toLowerCase().replace(/^clan-/, '').replace(/^cl(?!uster)/, '').replace(/^\d+-/, '').replace(/prototype-?/g, '');
  // Normalize common aliases to canonical forms
  const aliases: [RegExp, string][] = [
    [/^(?:is)?ultra-?ac-?(\d+)$/, 'uac-$1'], [/^(?:is)?ultraac(\d+)$/, 'uac-$1'],
    [/^(?:is)?ultra-?autocannon-?(\d+)$/, 'uac-$1'],
    [/^(?:is)?rotary-?ac-?(\d+)$/, 'rac-$1'], [/^(?:is)?rotaryac(\d+)$/, 'rac-$1'],
    [/^(?:is)?lb-?(\d+)-?x-?ac$/, 'lb-$1-x-ac'], [/^(?:is)?lbxac(\d+)$/, 'lb-$1-x-ac'], [/^(?:is)?lb(\d+)xac$/, 'lb-$1-x-ac'],
    [/^(?:is)?lb-?(\d+)-?x-?autocannon$/, 'lb-$1-x-ac'],
    [/^(?:is)?autocannon-?(\d+)$/, 'ac-$1'], [/^(?:is)?ac-?(\d+)$/, 'ac-$1'],
    [/^(?:is)?light-?ac-?(\d+)$/, 'lac-$1'], [/^(?:is)?lac-?(\d+)$/, 'lac-$1'],
    [/^(?:is)?lrm-?(\d+)$/, 'lrm-$1'], [/^(?:is)?srm-?(\d+)$/, 'srm-$1'],
    [/^(?:is)?mrm-?(\d+)$/, 'mrm-$1'], [/^(?:is)?mml-?(\d+)$/, 'mml-$1'],
    [/^(?:is)?atm-?(\d+)$/, 'atm-$1'],
    [/^(?:is)?streak-?srm-?(\d+)$/, 'streak-srm-$1'], [/^(?:is)?streaksrm(\d+)$/, 'streak-srm-$1'],
    [/^(?:is)?streak-?lrm-?(\d+)$/, 'streak-lrm-$1'], [/^(?:is)?streaklrm(\d+)$/, 'streak-lrm-$1'],
    [/^(?:is)?hag-?(\d+)$/, 'hag-$1'], [/^(?:is)?hag(\d+)$/, 'hag-$1'],
    [/^hyper-?assault-?gauss-?rifle-?(\d+)$/, 'hag-$1'],
    [/^(?:is)?hyper-?velocity-?(?:auto-?cannon|ac)-?(\d+)$/, 'hvac-$1'], [/^(?:is)?hvac-?(\d+)$/, 'hvac-$1'],
    [/^(?:is)?thunderbolt-?(\d+)$/, 'thunderbolt-$1'],
    [/^(?:is)?gauss-?rifle$/, 'gauss-rifle'], [/^gauss$/, 'gauss-rifle'],
    [/^(?:is)?light-?gauss-?rifle$/, 'light-gauss-rifle'], [/^light-?gauss$/, 'light-gauss-rifle'],
    [/^(?:is)?heavy-?gauss-?rifle$/, 'heavy-gauss-rifle'], [/^heavygauss$/, 'heavy-gauss-rifle'],
    [/^(?:is)?improved-?heavy-?gauss-?rifle$/, 'improved-heavy-gauss-rifle'], [/^improvedheavygauss$/, 'improved-heavy-gauss-rifle'],
    [/^(?:is)?ap-?gauss-?rifle$/, 'ap-gauss-rifle'], [/^apgaussrifle$/, 'ap-gauss-rifle'],
    [/^(?:is)?silver-?bullet-?gauss-?rifle$/, 'silver-bullet-gauss-rifle'], [/^silver-?bullet-?gauss$/, 'silver-bullet-gauss-rifle'],
    [/^impgauss(?:ammo)?$/, 'improved-gauss-rifle'], [/^improved-?gauss$/, 'improved-gauss-rifle'],
    [/^(?:is)?plasma-?rifle$/, 'plasma-rifle'], [/^(?:is)?plasma-?cannon$/, 'plasma-cannon'],
    [/^(?:is)?machine-?gun$/, 'machine-gun'], [/^(?:is)?light-?machine-?gun$/, 'light-machine-gun'], [/^(?:is)?heavy-?machine-?gun$/, 'heavy-machine-gun'],
    [/^(?:is)?anti-?missile-?system$/, 'ams'], [/^(?:is)?ams$/, 'ams'],
    [/^(?:is)?arrow-?iv(?:-?launcher)?$/, 'arrow-iv'], [/^arrowiv$/, 'arrow-iv'],
    [/^(?:is)?narc$/, 'narc'], [/^(?:is)?inarc$/, 'inarc'],
    [/^sniper(?:cannon)?$/, 'sniper'], [/^longtom(?:cannon)?$/, 'long-tom'], [/^thumper(?:cannon)?$/, 'thumper'],
    [/^mg$/, 'machine-gun'], [/^lightmg$/, 'light-machine-gun'], [/^heavymg$/, 'heavy-machine-gun'],
    [/^rotaryac(\d+)$/, 'rac-$1'],
    [/^(?:is)?lrt-?(\d+)$/, 'lrm-$1'], [/^(?:is)?srt-?(\d+)$/, 'srm-$1'],
    [/^(?:is)?protomech-?ac-?(\d+)$/, 'protomech-ac-$1'], [/^(?:is)?protomechac(\d+)$/, 'protomech-ac-$1'],
    [/^(?:is)?iatm-?(\d+)$/, 'iatm-$1'],
    [/^(?:is)?enhanced-?lrm-?(\d+)$/, 'enhanced-lrm-$1'], [/^(?:is)?enhancedlrm(\d+)$/, 'enhanced-lrm-$1'],
    [/^(?:is)?extended-?lrm-?(\d+)$/, 'extended-lrm-$1'],
  ];
  for (const [re, rep] of aliases) { if (re.test(s)) return s.replace(re, rep); }
  return s;
}

// === PATTERN-BASED AMMO RESOLUTION (BV from catalog, not hardcoded) ===
let ammoLookup: Map<string, { bv: number; weaponType: string }> | null = null;

function extractWeaponTypeFromAmmoId(ammoId: string): string {
  let s = ammoId.replace(/-ammo$/, '').replace(/ammo$/, '').replace(/^ammo-/, '').replace(/^clan-ammo-/, '').replace(/^clan-/, '');
  s = s.replace(/-(standard|er|he|iiw|imp|cluster|ap|precision|fragmentation|inferno|swarm|tandem-charge|thunder|explosive|ecm|haywire|nemesis|pods)$/, '');
  s = s.replace(/-half$/, '').replace(/-full$/, '');
  return normalizeWeaponKey(s);
}

function buildAmmoLookup(): Map<string, { bv: number; weaponType: string }> {
  if (ammoLookup) return ammoLookup;
  ammoLookup = new Map();

  // Data-driven: load ammunition files from index.json (supports split files)
  const basePath = path.resolve(process.cwd(), 'public/data/equipment/official');
  let ammoFiles: string[] = ['ammunition.json'];
  try {
    const indexData = JSON.parse(fs.readFileSync(path.join(basePath, 'index.json'), 'utf-8'));
    const ammoEntry = indexData?.files?.ammunition;
    if (ammoEntry && typeof ammoEntry === 'object' && !Array.isArray(ammoEntry)) {
      ammoFiles = Object.values(ammoEntry) as string[];
    }
  } catch { /* fall back to ammunition.json */ }

  for (const ammoFile of ammoFiles) {
    try {
    const d = JSON.parse(fs.readFileSync(path.join(basePath, ammoFile), 'utf-8'));
    for (const item of (d.items || []) as Array<{ id: string; battleValue: number; compatibleWeaponIds?: string[] }>) {
      const wt = item.compatibleWeaponIds?.[0]
        ? normalizeWeaponKey(item.compatibleWeaponIds[0])
        : extractWeaponTypeFromAmmoId(item.id);
      ammoLookup.set(item.id, { bv: item.battleValue, weaponType: wt });
      const canon = item.id.replace(/[^a-z0-9]/g, '');
      if (!ammoLookup.has(canon)) ammoLookup.set(canon, { bv: item.battleValue, weaponType: wt });
    }
    } catch { /* ignore individual ammo file errors */ }
  }

  const hc: Array<[string, number, string]> = [
    ['mml-3-lrm-ammo', 4, 'mml-3'], ['mml-3-srm-ammo', 4, 'mml-3'],
    ['mml-5-lrm-ammo', 6, 'mml-5'], ['mml-5-srm-ammo', 6, 'mml-5'],
    ['mml-7-lrm-ammo', 8, 'mml-7'], ['mml-7-srm-ammo', 8, 'mml-7'],
    ['mml-9-lrm-ammo', 11, 'mml-9'], ['mml-9-srm-ammo', 11, 'mml-9'],
    ['plasma-rifle-ammo', 26, 'plasma-rifle'], ['isplasmarifleammo', 26, 'plasma-rifle'],
    ['clan-plasma-cannon-ammo', 21, 'plasma-cannon'], ['clplasmacannonammo', 21, 'plasma-cannon'],
    ['streak-srm-ammo', 17, 'streak-srm-2'],
    // Clan Streak SRM (higher BV than IS)
    ['clan-streak-srm-2-ammo', 5, 'streak-srm-2'], ['clan-streak-srm-4-ammo', 10, 'streak-srm-4'], ['clan-streak-srm-6-ammo', 15, 'streak-srm-6'],
    // IS Streak SRM (lower BV than Clan)
    ['streak-srm-2-ammo', 4, 'streak-srm-2'], ['streak-srm-4-ammo', 7, 'streak-srm-4'], ['streak-srm-6-ammo', 11, 'streak-srm-6'],
    ['is-streak-srm-2-ammo', 4, 'streak-srm-2'], ['is-streak-srm-4-ammo', 7, 'streak-srm-4'], ['is-streak-srm-6-ammo', 11, 'streak-srm-6'],
    // Clan LRM per-size (higher BV than IS: 7/14/21/27 vs 6/11/17/23)
    ['clan-ammo-lrm-5', 7, 'lrm-5'], ['clan-ammo-lrm-10', 14, 'lrm-10'], ['clan-ammo-lrm-15', 21, 'lrm-15'], ['clan-ammo-lrm-20', 27, 'lrm-20'],
    // Clan SRM per-size (same BV as IS: 3/5/7)
    ['clan-ammo-srm-2', 3, 'srm-2'], ['clan-ammo-srm-4', 5, 'srm-4'], ['clan-ammo-srm-6', 7, 'srm-6'],
    // MRM per-size (7/14/21/28 per MegaMek)
    ['mrm-10-ammo', 7, 'mrm-10'], ['mrm-20-ammo', 14, 'mrm-20'], ['mrm-30-ammo', 21, 'mrm-30'], ['mrm-40-ammo', 28, 'mrm-40'],
    ['ammo-mrm-10', 7, 'mrm-10'], ['ammo-mrm-20', 14, 'mrm-20'], ['ammo-mrm-30', 21, 'mrm-30'], ['ammo-mrm-40', 28, 'mrm-40'],
    // IS UAC ammo (correct IS values - catalog has Clan values for some)
    ['is-uac-2-ammo', 7, 'uac-2'], ['is-uac-5-ammo', 14, 'uac-5'],
    // Clan UAC ammo (where different from IS)
    ['clan-uac-2-ammo', 8, 'uac-2'], ['clan-uac-5-ammo', 15, 'uac-5'], ['clan-uac-20-ammo', 42, 'uac-20'],
    // IS LB-X ammo (correct IS values)
    ['is-lb-2-x-ammo', 5, 'lb-2-x-ac'], ['is-lb-5-x-ammo', 10, 'lb-5-x-ac'],
    // Clan LB-X ammo (where different from IS)
    ['clan-lb-2-x-ammo', 6, 'lb-2-x-ac'], ['clan-lb-5-x-ammo', 12, 'lb-5-x-ac'],
    ['clan-lb-2-x-cluster-ammo', 6, 'lb-2-x-ac'], ['clan-lb-5-x-cluster-ammo', 12, 'lb-5-x-ac'],
    ['hag-20-ammo', 33, 'hag-20'], ['hag-30-ammo', 50, 'hag-30'], ['hag-40-ammo', 67, 'hag-40'],
    ['rac-2-ammo', 15, 'rac-2'], ['rac-5-ammo', 31, 'rac-5'],
    ['clan-rac-2-ammo', 20, 'rac-2'], ['clan-rac-5-ammo', 43, 'rac-5'], ['clan-rac-20-ammo', 59, 'rac-20'],
    ['clanrotaryac2', 20, 'rac-2'], ['clanrotaryac5', 43, 'rac-5'],
    ['hvac-2-ammo', 7, 'hvac-2'], ['hvac-5-ammo', 11, 'hvac-5'], ['hvac-10-ammo', 20, 'hvac-10'],
    ['thunderbolt-5-ammo', 8, 'thunderbolt-5'], ['thunderbolt-10-ammo', 16, 'thunderbolt-10'],
    ['thunderbolt-15-ammo', 29, 'thunderbolt-15'], ['thunderbolt-20-ammo', 46, 'thunderbolt-20'],
    // Clan Improved LRM uses Clan BV values
    ['clan-improved-lrm-5-ammo', 7, 'lrm-5'], ['clan-improved-lrm-10-ammo', 14, 'lrm-10'],
    ['clan-improved-lrm-15-ammo', 21, 'lrm-15'], ['clan-improved-lrm-20-ammo', 27, 'lrm-20'],
    // Fluid Gun
    ['fluid-gun-ammo', 1, 'fluid-gun'],
    // Clan Streak LRM per-size
    ['clan-streak-lrm-5-ammo', 11, 'streak-lrm-5'], ['clan-streak-lrm-10-ammo', 22, 'streak-lrm-10'],
    ['clan-streak-lrm-15-ammo', 32, 'streak-lrm-15'], ['clan-streak-lrm-20-ammo', 43, 'streak-lrm-20'],
    // Clan ProtoMech AC
    ['clan-protomech-ac-2-ammo', 4, 'protomech-ac-2'], ['clan-protomech-ac-4-ammo', 6, 'protomech-ac-4'], ['clan-protomech-ac-8-ammo', 8, 'protomech-ac-8'],
    // Long Tom Cannon
    ['longtomcannonammo', 41, 'long-tom'], ['islongtomcannonammo', 41, 'long-tom'],
    ['snipercannonammo', 10, 'sniper'], ['issnipercannonammo', 10, 'sniper'],
    ['thumpercannonammo', 5, 'thumper'], ['isthumpercannonammo', 5, 'thumper'],
    // Magshot
    ['magshotgr-ammo', 2, 'magshot'],
    // Taser
    ['taser-ammo', 5, 'mech-taser'],
    // Improved Gauss (Clan)
    ['impgaussammo', 40, 'improved-gauss-rifle'], ['climpgaussammo', 40, 'improved-gauss-rifle'],
    // LR/SR Torpedo
    ['ammo-lrtorpedo-5', 6, 'lrm-5'], ['ammo-lrtorpedo-10', 11, 'lrm-10'],
    ['ammo-lrtorpedo-15', 17, 'lrm-15'], ['ammo-lrtorpedo-20', 23, 'lrm-20'],
    ['ammo-srtorpedo-2', 3, 'srm-2'], ['ammo-srtorpedo-4', 5, 'srm-4'], ['ammo-srtorpedo-6', 7, 'srm-6'],
    ['clan-sc-mortar-1-ammo', 1, 'mech-mortar-1'], ['clan-sc-mortar-2-ammo', 2, 'mech-mortar-2'],
    ['clan-sc-mortar-4-ammo', 4, 'mech-mortar-4'], ['clan-sc-mortar-8-ammo', 8, 'mech-mortar-8'],
    ['is-sc-mortar-1-ammo', 1, 'mech-mortar-1'], ['is-sc-mortar-2-ammo', 2, 'mech-mortar-2'],
    ['is-sc-mortar-4-ammo', 4, 'mech-mortar-4'], ['is-sc-mortar-8-ammo', 8, 'mech-mortar-8'],
    ['lb-2-x-cluster-ammo', 6, 'lb-2-x-ac'], ['lb-5-x-cluster-ammo', 12, 'lb-5-x-ac'],
    ['clan-medium-chemical-laser-ammo', 5, 'medium-chemical-laser'],
    ['clan-heavy-flamer-ammo', 1, 'heavy-flamer'], ['cl-heavy-flamer-ammo', 1, 'heavy-flamer'],
    ['clan-improved-gauss-ammo', 40, 'improved-gauss-rifle'],
    ['clanimprovedlrm5ammo', 7, 'lrm-5'], ['clanimprovedlrm10ammo', 14, 'lrm-10'],
    ['clanimprovedlrm15ammo', 21, 'lrm-15'], ['clanimprovedlrm20ammo', 27, 'lrm-20'],
    ['light-machine-gun-ammo-half', 1, 'light-machine-gun'],
    ['clan-light-machine-gun-ammo-half', 1, 'light-machine-gun'],
    ['heavy-machine-gun-ammo-half', 1, 'heavy-machine-gun'],
    ['clan-heavy-machine-gun-ammo-half', 1, 'heavy-machine-gun'],
    ['machine-gun-ammo-half', 1, 'machine-gun'],
    ['clan-machine-gun-ammo-half', 1, 'machine-gun'],
    ['inarc-ammo', 6, 'improved-narc'], ['narc-ammo', 6, 'narc-beacon'],
    ['clan-narc-ammo', 6, 'narc-beacon'],
  ];
  for (const [id, bv, wt] of hc) {
    if (!ammoLookup.has(id)) ammoLookup.set(id, { bv, weaponType: wt });
    const canon = id.replace(/[^a-z0-9]/g, '');
    if (!ammoLookup.has(canon)) ammoLookup.set(canon, { bv, weaponType: wt });
  }

  return ammoLookup;
}

function resolveAmmoByPattern(name: string, _techBase: string): { bv: number; weaponType: string } | null {
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
  let e = lu.get(norm); if (e) return e;
  e = lu.get(norm + '-ammo'); if (e) return e;

  const lo = clean.toLowerCase();
  const stripped = lo
    .replace(/\s*\((?:clan|is)\)\s*/g, '')
    .replace(/\s*-\s*(?:full|half|proto)\s*$/g, '')
    .replace(/\s*\(\d+\)\s*$/g, '')
    .trim();

  type Rule = { re: RegExp; ids: (m: RegExpMatchArray) => string[] };
  const rules: Rule[] = [
    { re: /^(?:is\s*)?ammo\s+ac[/-](\d+)$/,         ids: m => [`ac-${m[1]}-ammo`] },
    { re: /^(?:is\s*)?ammo\s+ac[/-](\d+)\s+primitive$/,ids: m => [`ammo-ac-${m[1]}-primitive`] },
    { re: /^(?:is\s*)?ac(\d+)\s*ammo$/,              ids: m => [`ac-${m[1]}-ammo`] },
    { re: /^(?:is\s*)?ammo\s+lrm-(\d+)$/,            ids: m => [`ammo-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?lrm(\d+)\s*ammo$/,             ids: m => [`ammo-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+srm-(\d+)$/,            ids: m => [`ammo-srm-${m[1]}`] },
    { re: /^(?:is\s*)?srm(\d+)\s*ammo$/,             ids: m => [`ammo-srm-${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+mml-(\d+)\s+lrm$/,      ids: m => [`mml-${m[1]}-lrm-ammo`, `ammo-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+mml-(\d+)\s+srm$/,      ids: m => [`mml-${m[1]}-srm-ammo`, `ammo-srm-${m[1]}`] },
    { re: /^(?:is\s*)?mml(\d+)\s+lrm\s*ammo$/,       ids: m => [`mml-${m[1]}-lrm-ammo`, `ammo-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?mml(\d+)\s+srm\s*ammo$/,       ids: m => [`mml-${m[1]}-srm-ammo`, `ammo-srm-${m[1]}`] },
    { re: /^(?:is\s*)?mrm(\d+)\s*ammo$/,             ids: m => [`mrm-${m[1]}-ammo`, `ammo-mrm-${m[1]}`, `mrm-${m[1]}`, `mrm-ammo`] },
    { re: /^(?:is\s*)?ammo\s+mrm-(\d+)$/,            ids: m => [`mrm-${m[1]}-ammo`, `ammo-mrm-${m[1]}`, `mrm-${m[1]}`, `mrm-ammo`] },
    { re: /^(?:is\s*)?ultraac(\d+)\s*ammo$/,          ids: m => [`is-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`] },
    { re: /^(?:is\s*)?ammo\s+ultra\s*ac[/-](\d+)$/,   ids: m => [`is-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`] },
    { re: /^(?:is\s*)?ultra\s*ac[/-](\d+)\s*ammo$/,   ids: m => [`is-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`] },
    { re: /^(?:is\s*)?lbxac(\d+)\s*ammo$/,           ids: m => [`is-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`] },
    { re: /^(?:is\s*)?lbxac(\d+)\s+cl\s*ammo$/,      ids: m => [`is-lb-${m[1]}-x-cluster-ammo`, `lb-${m[1]}-x-cluster-ammo`] },
    { re: /^(?:is\s*)?lb\s*(\d+)-x\s*(?:ac\s*)?ammo$/,ids: m => [`is-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`] },
    { re: /^(?:is\s*)?lb\s*(\d+)-x\s*(?:ac\s*)?cluster\s*ammo$/,ids: m => [`is-lb-${m[1]}-x-cluster-ammo`, `lb-${m[1]}-x-cluster-ammo`] },
    { re: /^(?:is\s*)?lb\s*(\d+)-x\s*(?:ac\s*)?slug\s*ammo$/,ids: m => [`is-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`] },
    { re: /^(?:is\s*)?rotaryac(\d+)\s*ammo$/,        ids: m => [`rotaryac${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+lac[/-](\d+)$/,          ids: m => [`ammo-lac-${m[1]}`] },
    { re: /^(?:is\s*)?lac(\d+)\s*ammo$/,             ids: m => [`ammo-lac-${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+hvac[/-](\d+)$/,         ids: m => [`hvac-${m[1]}-ammo`] },
    { re: /^(?:is\s*)?ammo\s+extended\s*lrm-(\d+)$/,  ids: m => [`ammo-extended-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?enhancedlrm(\d+)\s*ammo$/,     ids: m => [`enhancedlrm${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+thunderbolt-(\d+)$/,     ids: m => [`thunderbolt-${m[1]}-ammo`, `lrm-ammo`] },
    { re: /^(?:is\s*)?thunderbolt(\d+)\s*ammo$/,      ids: m => [`thunderbolt-${m[1]}-ammo`, `lrm-ammo`] },
    { re: /^(?:is\s*)?gauss\s*ammo$/,                ids: _ => [`gauss-ammo`] },
    { re: /^(?:is\s*)?light\s*gauss\s*ammo$/,        ids: _ => [`light-gauss-ammo`] },
    { re: /^(?:is\s*)?heavy\s*gauss\s*ammo$/,        ids: _ => [`heavy-gauss-ammo`] },
    { re: /^(?:is\s*)?improvedheavygauss\s*ammo$/,   ids: _ => [`improvedheavygauss`] },
    { re: /^(?:is\s*)?sbgauss(?:rifle)?\s*ammo$/,    ids: _ => [`silver-bullet-gauss`] },
    { re: /^silver\s*bullet\s*gauss\s*ammo$/,        ids: _ => [`silver-bullet-gauss`] },
    { re: /^(?:is\s*)?plasmarifle?\s*ammo$/,          ids: _ => [`plasma-rifle-ammo`, `isplasmarifleammo`] },
    { re: /^(?:is\s*)?plasma\s*rifle\s*ammo$/,       ids: _ => [`plasma-rifle-ammo`, `isplasmarifleammo`] },
    { re: /^(?:is\s*)?fluidgun\s*ammo$/,             ids: _ => [`fluid-gun-ammo`] },
    { re: /^(?:is\s*)?(?:heavy\s*)?flamer\s*ammo$/,  ids: _ => [`mg-ammo`] },
    { re: /^(?:is\s*)?vehicle\s*flamer\s*ammo$/,     ids: _ => [`mg-ammo`] },
    { re: /^(?:is\s*)?(?:light\s*)?mg\s*ammo$/,      ids: _ => [`mg-ammo`] },
    { re: /^(?:is\s*)?ammo\s+mg$/,                   ids: _ => [`mg-ammo`, `ammo-mg-full`] },
    { re: /^(?:is\s*)?(?:light\s*)?machine\s*gun\s*ammo$/,ids: _ => [`mg-ammo`, `ammo-mg-full`] },
    { re: /^(?:is\s*)?heavy\s*machine\s*gun\s*ammo$/, ids: _ => [`heavy-mg-ammo`, `heavy-machine-gun-ammo-full`] },
    { re: /^(?:is\s*)?light\s*machine\s*gun\s*ammo$/, ids: _ => [`light-mg-ammo`, `light-machine-gun-ammo-full`] },
    { re: /^(?:is\s*)?ams\s*ammo$/,                  ids: _ => [`ams-ammo`] },
    { re: /^(?:is\s*)?ammo\s+inarc$/,                ids: _ => [`inarc-ammo`] },
    { re: /^(?:is\s*)?ammo\s+narc$/,                 ids: _ => [`narc-ammo`] },
    { re: /^(?:is\s*)?arrowiv\s*(?:cluster\s*)?ammo$/,ids: _ => [`arrowivammo`] },
    { re: /^(?:is\s*)?arrowiv\s*homing\s*ammo$/,     ids: _ => [`arrowivammo`] },
    { re: /^(?:is\s*)?ammo\s+lrtorpedo-(\d+)$/,       ids: m => [`ammo-lrtorpedo-${m[1]}`, `ammo-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+srtorpedo-(\d+)$/,       ids: m => [`ammo-srtorpedo-${m[1]}`, `ammo-srm-${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+heavy\s*rifle$/,         ids: _ => [`gauss-ammo`] },
    { re: /^(?:is\s*)?heavy\s*rifle\s*ammo$/,         ids: _ => [`gauss-ammo`] },
    { re: /^(?:is\s*)?ammo\s+nail[/-]rivet$/,         ids: _ => [`mg-ammo`] },
    { re: /^(?:is\s*)?magshotgr\s*ammo$/,            ids: _ => [`magshotgr-ammo`] },
    { re: /^(?:is\s*)?apds\s*ammo$/,                 ids: _ => [`ams-ammo`] },
    { re: /^(?:is\s*)?snipercannonammo$/,             ids: _ => [`snipercannonammo`, `issnipercannonammo`] },
    { re: /^(?:is\s*)?longtomcannonammo$/,            ids: _ => [`longtomcannonammo`, `islongtomcannonammo`] },
    { re: /^(?:is\s*)?thumpercannonammo$/,            ids: _ => [`thumpercannonammo`, `isthumpercannonammo`] },
    { re: /^(?:mek\s*)?taser\s*ammo$/,               ids: _ => [`taser-ammo`] },
    { re: /^(?:is\s*)?streaksrm(\d+)\s*ammo$/,        ids: m => [`is-streak-srm-${m[1]}-ammo`, `streak-srm-${m[1]}-ammo`, `streak-srm-ammo`] },
    { re: /^(?:is\s*)?streak\s*srm\s*(\d+)\s*ammo$/,  ids: m => [`is-streak-srm-${m[1]}-ammo`, `streak-srm-${m[1]}-ammo`, `streak-srm-ammo`] },
    { re: /^(?:is\s*)?ammo\s+streak\s*srm-(\d+)$/,    ids: m => [`is-streak-srm-${m[1]}-ammo`, `streak-srm-${m[1]}-ammo`, `streak-srm-ammo`] },
    { re: /^(?:is\s*)?lrt(\d+)\s*ammo$/,              ids: m => [`ammo-lrtorpedo-${m[1]}`, `ammo-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?srt(\d+)\s*ammo$/,              ids: m => [`ammo-srtorpedo-${m[1]}`, `ammo-srm-${m[1]}`] },
    { re: /^(?:is\s*)?lightmg\s*ammo(?:\s*\(\d+\))?$/,ids: _ => [`light-mg-ammo`, `light-machine-gun-ammo-full`] },
    { re: /^(?:is\s*)?impgauss\s*ammo$/,              ids: _ => [`impgaussammo`] },
    { re: /^(?:is\s*)?arrowiv\s+ammo$/,               ids: _ => [`arrowivammo`] },
    { re: /^(?:is\s*)?arrowiv\s+homing\s*ammo$/,      ids: _ => [`arrowivammo`] },
    { re: /^(?:is\s*)?arrowiv\s+cluster\s*ammo$/,     ids: _ => [`arrowivammo`] },
    { re: /^(?:is\s*)?sniper\s*cannon\s*ammo$/,       ids: _ => [`snipercannonammo`, `issnipercannonammo`] },
    { re: /^(?:is\s*)?long\s*tom\s*cannon\s*ammo$/,   ids: _ => [`longtomcannonammo`, `islongtomcannonammo`] },

    { re: /^cl(?:an)?\s*ammo\s+lrm-(\d+)$/,           ids: m => [`clan-ammo-lrm-${m[1]}`, `ammo-lrm-${m[1]}`] },
    { re: /^cl(?:an)?\s*lrm(\d+)\s*ammo$/,            ids: m => [`clan-ammo-lrm-${m[1]}`, `ammo-lrm-${m[1]}`] },
    { re: /^cl(?:an)?\s*ammo\s+srm-(\d+)$/,           ids: m => [`clan-ammo-srm-${m[1]}`, `ammo-srm-${m[1]}`] },
    { re: /^cl(?:an)?\s*srm(\d+)\s*ammo$/,            ids: m => [`clan-ammo-srm-${m[1]}`, `ammo-srm-${m[1]}`] },
    { re: /^cl(?:an)?\s*ammo\s+atm-(\d+)$/,           ids: m => [`clan-ammo-atm-${m[1]}`, `atm-standard-ammo`] },
    { re: /^cl(?:an)?\s*ammo\s+atm-(\d+)\s+er$/,      ids: m => [`clan-ammo-atm-${m[1]}-er`, `atm-er-ammo`] },
    { re: /^cl(?:an)?\s*ammo\s+atm-(\d+)\s+he$/,      ids: m => [`clan-ammo-atm-${m[1]}-he`, `atm-he-ammo`] },
    { re: /^cl(?:an)?\s*atm(\d+)\s*ammo$/,            ids: m => [`clan-ammo-atm-${m[1]}`, `atm-standard-ammo`] },
    { re: /^cl(?:an)?\s*atm(\d+)\s+er\s*ammo$/,       ids: m => [`clan-ammo-atm-${m[1]}-er`, `atm-er-ammo`] },
    { re: /^cl(?:an)?\s*atm(\d+)\s+he\s*ammo$/,       ids: m => [`clan-ammo-atm-${m[1]}-he`, `atm-he-ammo`] },
    { re: /^cl(?:an)?\s*ammo\s+iatm-(\d+)$/,          ids: m => [`clan-ammo-iatm-${m[1]}`] },
    { re: /^cl(?:an)?\s*ultraac(\d+)\s*ammo$/,        ids: m => [`clan-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`] },
    { re: /^cl(?:an)?\s*ultra\s*ac[/-](\d+)\s*ammo$/,  ids: m => [`clan-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`] },
    { re: /^cl(?:an)?\s*lbxac(\d+)\s*ammo$/,          ids: m => [`clan-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`] },
    { re: /^cl(?:an)?\s*lbxac(\d+)\s+cl\s*ammo$/,     ids: m => [`clan-lb-${m[1]}-x-cluster-ammo`, `lb-${m[1]}-x-cluster-ammo`] },
    { re: /^cl(?:an)?\s*lb\s*(\d+)-x\s*(?:ac\s*)?ammo$/,ids: m => [`clan-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`] },
    { re: /^cl(?:an)?\s*lb\s*(\d+)-x\s*(?:ac\s*)?cluster\s*ammo$/,ids: m => [`clan-lb-${m[1]}-x-cluster-ammo`, `lb-${m[1]}-x-cluster-ammo`] },
    { re: /^cl(?:an)?\s*rotaryac(\d+)\s*ammo$/,       ids: m => [`clanrotaryac${m[1]}`, `rac-${m[1]}-ammo`] },
    { re: /^cl(?:an)?\s*streaksrm(\d+)\s*ammo$/,      ids: m => [`clan-streak-srm-${m[1]}-ammo`, `clan-streak-srm-${m[1]}`, `streak-srm-ammo`] },
    { re: /^cl(?:an)?\s*streak\s*srm\s*(\d+)\s*ammo$/,ids: m => [`clan-streak-srm-${m[1]}-ammo`, `clan-streak-srm-${m[1]}`, `streak-srm-ammo`] },
    { re: /^cl(?:an)?\s*streaklrm(\d+)\s*ammo$/,      ids: m => [`clan-streak-lrm-${m[1]}-ammo`, `clan-streak-lrm-${m[1]}`] },
    { re: /^cl(?:an)?\s*streak\s*lrm\s*(\d+)\s*ammo$/,ids: m => [`clan-streak-lrm-${m[1]}-ammo`, `clan-streak-lrm-${m[1]}`] },
    { re: /^cl(?:an)?\s*gauss\s*ammo$/,               ids: _ => [`gauss-ammo`] },
    { re: /^cl(?:an)?\s*apgaussrifle\s*ammo$/,        ids: _ => [`ap-gauss-ammo`, `apgaussrifle`] },
    { re: /^cl(?:an)?\s*impgauss\s*ammo$/,            ids: _ => [`impgaussammo`] },
    { re: /^cl(?:an)?\s*improvedlrm(\d+)\s*ammo$/,    ids: m => [`clanimprovedlrm${m[1]}ammo`] },
    { re: /^cl(?:an)?\s*(?:heavy\s*)?machine\s*gun\s*ammo$/,ids: _ => [`mg-ammo`, `ammo-mg-full`] },
    { re: /^cl(?:an)?\s*(?:heavy\s*)?mg\s*ammo$/,     ids: _ => [`mg-ammo`, `ammo-mg-full`] },
    { re: /^cl(?:an)?\s*heavy\s*machine\s*gun\s*ammo$/,ids: _ => [`heavy-mg-ammo`, `heavy-machine-gun-ammo-full`] },
    { re: /^cl(?:an)?\s*light\s*machine\s*gun\s*ammo$/,ids: _ => [`light-mg-ammo`, `light-machine-gun-ammo-full`] },
    { re: /^cl(?:an)?\s*ams\s*ammo$/,                 ids: _ => [`clan-ams-ammo`, `ams-ammo`] },
    { re: /^cl(?:an)?\s*arrowiv\s*(?:cluster\s*|homing\s*)?ammo$/,ids: _ => [`arrowivammo`] },
    { re: /^cl(?:an)?\s*plasmacannon\s*ammo$/,        ids: _ => [`clan-plasma-cannon-ammo`, `clplasmacannonammo`] },
    { re: /^cl(?:an)?\s*plasma\s*cannon\s*ammo$/,     ids: _ => [`clan-plasma-cannon-ammo`, `clplasmacannonammo`] },
    { re: /^cl(?:an)?\s*(?:heavy\s*)?flamer\s*ammo$/,  ids: _ => [`mg-ammo`] },
    { re: /^cl(?:an)?\s*mediumchemlaser\s*ammo$/,     ids: _ => [`clan-medium-chemical-laser-ammo`] },
    { re: /^cl(?:an)?\s*protomech\s*ac[/-](\d+)\s*ammo$/,ids: m => [`clan-protomech-ac-${m[1]}`] },
    { re: /^cl(?:an)?\s*ammo\s+lrtorpedo-(\d+)$/,     ids: m => [`ammo-lrtorpedo-${m[1]}`, `ammo-lrm-${m[1]}`] },
    { re: /^cl(?:an)?\s*ammo\s+srtorpedo-(\d+)$/,     ids: m => [`ammo-srtorpedo-${m[1]}`, `ammo-srm-${m[1]}`] },
    { re: /^cl(?:an)?\s*ammo\s+sc\s*mortar-(\d+)$/,   ids: m => [`clan-sc-mortar-${m[1]}-ammo`, `is-sc-mortar-${m[1]}-ammo`] },
    { re: /^cl(?:an)?\s*imp\s*ammo\s*(?:ac|srm)(\d+)$/,ids: m => [`impammoac${m[1]}`, `impammosrm${m[1]}`, `climpammosrm${m[1]}`] },

    { re: /^hag[/-](\d+)\s*ammo$/,                    ids: m => [`hag-${m[1]}-ammo`, `gauss-ammo`] },
    { re: /^hyper-assault\s*gauss\s*rifle[/-](\d+)\s*ammo$/,ids: m => [`hag-${m[1]}-ammo`, `gauss-ammo`] },

    // Clan HAG ammo (CLHAG20 Ammo, etc.)
    { re: /^cl(?:an)?\s*hag(\d+)\s*ammo$/,            ids: m => [`hag-${m[1]}-ammo`, `gauss-ammo`] },

    // IS Sniper/Thumper (non-cannon) ammo
    { re: /^(?:is\s*)?sniperammo$/,                    ids: _ => [`snipercannonammo`, `issnipercannonammo`] },
    { re: /^(?:is\s*)?thumperammo$/,                   ids: _ => [`thumpercannonammo`, `isthumpercannonammo`] },

    // IS Arrow IV with space (ISArrowIV Ammo vs ISArrowIVAmmo)
    { re: /^(?:is\s*)?arrowiv\s+ammo$/,                ids: _ => [`arrowivammo`] },
    { re: /^(?:is\s*)?arrowiv\s+homing\s*ammo$/,       ids: _ => [`arrowivammo`] },
    { re: /^(?:is\s*)?arrowiv\s+cluster\s*ammo$/,      ids: _ => [`arrowivammo`] },

    // Clan Improved LRM ammo (ClanImprovedLRM15Ammo, etc.)
    { re: /^cl(?:an)?\s*improved\s*lrm(\d+)\s*ammo$/,  ids: m => [`clanimprovedlrm${m[1]}ammo`, `clan-improved-lrm-${m[1]}-ammo`] },

    // IS Heavy Rifle ammo
    { re: /^(?:is\s*)?heavy\s*rifle\s*ammo$/,          ids: _ => [`gauss-ammo`] },

    // IS HVAC ammo
    { re: /^(?:is\s*)?hvac[/-](\d+)\s*ammo$/,          ids: m => [`hvac-${m[1]}-ammo`] },

    // IS LB-X 5 (missing from some patterns)
    { re: /^(?:is\s*)?lbxac(\d+)\s+cl\s*ammo$/,       ids: m => [`lb-${m[1]}-x-cluster-ammo`] },

    // IS Extended LRM ammo
    { re: /^(?:is\s*)?extended\s*lrm-?(\d+)\s*ammo$/,  ids: m => [`ammo-extended-lrm-${m[1]}`] },

    // IS Enhanced LRM ammo (ISEnhancedLRM5 Ammo, etc.)
    { re: /^(?:is\s*)?enhanced\s*lrm(\d+)\s*ammo$/,    ids: m => [`enhancedlrm${m[1]}`] },

    // IS SB Gauss Rifle ammo
    { re: /^(?:is\s*)?sb\s*gauss\s*(?:rifle\s*)?ammo$/,ids: _ => [`silver-bullet-gauss`] },

    // IS Improved Heavy Gauss ammo
    { re: /^(?:is\s*)?improved\s*heavy\s*gauss\s*ammo$/,ids: _ => [`improvedheavygauss`] },

    // IS APDS ammo (Anti-Personnel Defense System)
    { re: /^(?:is\s*)?apds\s*ammo$/,                   ids: _ => [`ams-ammo`] },

    // Clan AP Gauss Rifle ammo
    { re: /^cl(?:an)?\s*ap\s*gauss\s*(?:rifle\s*)?ammo$/,ids: _ => [`ap-gauss-ammo`, `apgaussrifle`] },
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
  const nw = ['heatsink','heat-sink','endo','ferro','case','artemis','targeting-computer','targeting computer','ecm','bap','probe','c3','masc','tsm','jump-jet','jump jet','harjel','umu','shield','sword','hatchet','mace','a-pod','b-pod','apod','bpod','blue-shield','null-signature','chameleon','coolant-pod','coolantpod','supercharger','drone','improved-sensors','beagle','angel-ecm','guardian-ecm','light-active-probe','bloodhound','apollo','tag','machine-gun-array','light-machine-gun-array','heavy-machine-gun-array','mga','lmga','hmga','lift-hoist','lifthoist','retractable-blade','remote-sensor','partial-wing','partialwing','searchlight','tracks','cargo','spikes','minesweeper'];
  for (const n of nw) if (lo.includes(n)) return false;
  // Check IS resolution first, then try Clan resolution for Clan-exclusive weapons
  if (resolveWeaponForUnit(id, 'IS').resolved) return true;
  return resolveWeaponForUnit(id, 'CLAN').resolved;
}

function isDefEquip(id: string): boolean {
  const lo = id.toLowerCase();
  return lo.includes('anti-missile') || lo.includes('antimissile') || lo.includes('ams') || lo.includes('ecm') || lo.includes('guardian') || lo.includes('angel') || lo.includes('bap') || lo.includes('beagle') || lo.includes('probe') || lo.includes('bloodhound') || lo.includes('light-active-probe') || lo.includes('null-signature') || (lo.includes('shield') && !lo.includes('blue-shield'));
}

// === KNOWN HEAVY DUTY GYRO UNITS (from MegaMek mm-data MTF files) ===
// HD gyro has 4 crit slots (same as Standard), so it can't be detected by crit count.
// These units have "Gyro:Heavy Duty Gyro" in their MTF source files.
const KNOWN_HD_GYRO_UNITS = new Set([
  'albatross-alb-5u', 'albatross-alb-5w', 'albatross-alb-5w-dantalion',
  'atlas-as8-k', 'atlas-as8-ke', 'atlas-ii-as7-d-h-devlin',
  'battlemaster-blr-10s', 'battlemaster-blr-10s2', 'battlemaster-blr-k4',
  'cougar-x-3',
  'deva-c-dva-o-achilleus', 'deva-c-dva-o-invictus', 'deva-c-dva-oa-dominus',
  'deva-c-dva-ob-infernus', 'deva-c-dva-oc-comminus', 'deva-c-dva-od-luminos',
  'deva-c-dva-oe-eminus', 'deva-c-dva-os-caelestis', 'deva-c-dva-ou-exanimus',
  'grand-titan-t-it-n13m',
  'griffin-grf-4n', 'griffin-grf-5k',
  'hunchback-hbk-5ss',
  'jade-hawk-jhk-04',
  'king-crab-kgc-008', 'king-crab-kgc-008b', 'king-crab-kgc-009', 'king-crab-kgc-009c',
  'marauder-mad-9w', 'marauder-mad-9w2',
  'ostroc-osr-4k', 'ostsol-otl-9r',
  'patriot-pkm-2c', 'patriot-pkm-2d', 'patriot-pkm-2e',
  'phoenix-hawk-pxh-4w', 'phoenix-hawk-pxh-99',
  'scourge-scg-wx1', 'sentry-snt-w5', 'tai-sho-tsh-8s',
  'templar-iii-tlr2-j-arthur', 'templar-iii-tlr2-o', 'templar-iii-tlr2-oa',
  'templar-iii-tlr2-ob', 'templar-iii-tlr2-oc', 'templar-iii-tlr2-od',
  'thunderbolt-iic-2', 'thunderbolt-tdr-11s', 'thunderbolt-tdr-17s', 'thunderbolt-tdr-7s',
  'vanquisher-vqr-5v', 'vanquisher-vqr-7v', 'vanquisher-vqr-7v-pravuil',
  'victor-vtr-12d',
  'warhammer-whd-10ct', 'warhammer-whm-x7-the-lich',
  'white-flame-whf-3c', 'xanthos-xnt-4o',
]);

// === KNOWN SMALL COCKPIT UNITS (unit.cockpit mislabeled as STANDARD) ===
// These units have Small Cockpits per MegaMek/MUL but their JSON data says "STANDARD".
// The HEAD crit layout is also standard-looking (LS=2), so no heuristic can detect them.
const KNOWN_SMALL_COCKPIT_UNITS = new Set([
  'archer-arc-4m-ismail', 'atlas-as7-s-hanssen',
  'axman-axm-6t', 'axman-axm-6x',
  'black-knight-blk-nt-2y', 'black-knight-blk-nt-3b',
  'crockett-crk-5003-0-saddleford',
  'helepolis-hep-2x', 'hierofalcon-d',
  'pathfinder-pff-2t',
]);

// These units have STANDARD cockpits but LS=1 in HEAD (equipment displaced 2nd Life Support).
// The LS heuristic would falsely detect them as small cockpit; override to standard.
const KNOWN_STANDARD_COCKPIT_OVERRIDE = new Set([
  'barghest-bgs-4t',        // C3 slave in HEAD displaces 2nd LS
  'celerity-clr-02-x-d', 'celerity-clr-03-o', 'celerity-clr-03-ob',
  'celerity-clr-03-oc', 'celerity-clr-05-x',  // C3i/C3/ECM/BAP in HEAD
  'galahad-glh-3d-laodices', // C3i in HEAD
  'revenant-ubm-2r4', 'revenant-ubm-2r7', // Drone OS + Endo Steel in HEAD
  'thunder-fox-tft-l8',     // Light Ferro-Fibrous in HEAD
]);

// === MAIN BV CALCULATION ===
function calculateUnitBV(unit: UnitData, unitId?: string): { bv: number; breakdown: ValidationResult['breakdown']; issues: string[]; } {
  const issues: string[] = [];
  const engineType = mapEngineType(unit.engine.type, unit.techBase);
  const structureType = mapStructureType(unit.structure.type);
  let gyroType = mapGyroType(unit.gyro.type);
  const cockpitType = mapCockpitType(unit.cockpit || 'STANDARD');

  let engineBVOverride: number | undefined;
  if (engineType === EngineType.XXL && unit.techBase === 'CLAN') engineBVOverride = 0.5;
  // For MIXED tech XXL engines, detect Clan vs IS via side-torso engine crit count:
  // Clan XXL = 4 engine slots per ST, IS XXL = 6 engine slots per ST
  if (engineType === EngineType.XXL && unit.techBase === 'MIXED' && engineBVOverride === undefined) {
    const stLocs = ['LEFT_TORSO', 'LT', 'RIGHT_TORSO', 'RT'];
    let maxSTEngineSlots = 0;
    for (const loc of stLocs) {
      const slots = unit.criticalSlots[loc];
      if (!Array.isArray(slots)) continue;
      const engSlots = slots.filter((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('engine')).length;
      maxSTEngineSlots = Math.max(maxSTEngineSlots, engSlots);
    }
    if (maxSTEngineSlots > 0 && maxSTEngineSlots <= 4) {
      engineBVOverride = 0.5; // Clan XXL (4 ST slots)
    }
  }

  let totalArmor = calcTotalArmor(unit.armor.allocation);
  if (cockpitType === 'torso-mounted') totalArmor += 7;
  // Detect quad from armor locations if configuration field is wrong (e.g., Boreas/Notos marked as "Biped")
  const armorLocKeys = Object.keys(unit.armor?.allocation || {}).map((k: string) => k.toUpperCase());
  const hasQuadArmorLocs = armorLocKeys.some((k: string) => ['FLL','FRL','RLL','RRL','FRONT_LEFT_LEG','FRONT_RIGHT_LEG','REAR_LEFT_LEG','REAR_RIGHT_LEG'].includes(k));
  const effectiveConfig = hasQuadArmorLocs && unit.configuration?.toLowerCase() !== 'quad' ? 'Quad' : unit.configuration;
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
  const isDHS = unit.heatSinks.type.toUpperCase().includes('DOUBLE') || unit.heatSinks.type.toUpperCase().includes('LASER');
  let heatDiss = effectiveHSCount * (isDHS ? 2 : 1);

  if (cs.hasRadicalHS) heatDiss += Math.ceil(effectiveHSCount * 0.4);
  if (cs.hasPartialWing) heatDiss += 3;

  const armorType = cs.detectedArmorType || mapArmorType(unit.armor.type);

  const walkMP = unit.movement.walk;

  let bvWalk = walkMP;
  if (cs.hasTSM) bvWalk = walkMP + 1;

  let runMP = cs.hasMASC && cs.hasSupercharger ? Math.ceil(bvWalk * 2.5) : (cs.hasMASC || cs.hasSupercharger ? bvWalk * 2 : Math.ceil(bvWalk * 1.5));
  if (armorType === 'hardened') runMP = Math.max(0, runMP - 1);
  if (cs.hasLargeShield) runMP = Math.max(0, runMP - 1);
  let jumpMP = unit.movement.jump || 0;
  const partialWingJumpBonus = cs.hasPartialWing ? (unit.tonnage <= 55 ? 2 : 1) : 0;
  jumpMP += partialWingJumpBonus;
  const hasStealth = armorType === 'stealth';

  // Weapons
  type WeaponEntry = { id: string; name: string; heat: number; bv: number; rear?: boolean; hasAES?: boolean; isDirectFire?: boolean; location: string; artemisType?: 'iv' | 'v'; };
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
    const rawLoc = eq.location.split(',')[0].toUpperCase().replace(/[_(]R[)]/gi, '').replace(/_$/, '').replace(/\s*REAR\s*/i, '').trim();
    const locRearMap = cs.rearWeaponCountByLoc.get(rawLoc);
    if (!locRearMap) continue;
    const eqNorm = normalizeEquipId(eq.id);
    for (const [critName, count] of Array.from(locRearMap.entries())) {
      if (count > 0 && (critName === eqNorm || critName.includes(eqNorm) || eqNorm.includes(critName))) {
        locRearMap.set(critName, count - 1);
        break;
      }
    }
  }

  for (const eq of unit.equipment) {
    const lo = eq.id.toLowerCase();
    if (lo.includes('targeting-computer') || lo.includes('targeting computer')) { hasTC = true; continue; }
    if (lo.includes('tsm') || lo.includes('triple-strength-myomer')) continue;
    if (isDefEquip(eq.id)) continue;
    if (!isWeaponEquip(eq.id)) continue;

    const qtyMatch = eq.id.match(/^(\d+)-/);
    const qty = (qtyMatch && parseInt(qtyMatch[1], 10) > 1) ? parseInt(qtyMatch[1], 10) : 1;

    const clanDetected = unit.techBase === 'MIXED' && isClanEquipAtLocation(eq.id, eq.location, unit.criticalSlots);
    const res = resolveWeaponForUnit(eq.id, unit.techBase, clanDetected);
    if (!res.resolved || res.battleValue === 0) unresolvedWeapons.push(eq.id);

    const wid = eq.id.toLowerCase();
    const widStripped = wid.replace(/^\d+-/, '');
    const isRocketLauncher = wid.includes('rocket-launcher') || wid.includes('rl-') || /^rl\d+$/.test(wid)
      || widStripped.includes('rocketlauncher') || /^(?:is|cl)rocketlauncher\d+$/.test(widStripped) || /^rl\d+$/.test(widStripped);
    // I-OS (Improved One-Shot), OS (One-Shot), and "one-shot" suffix weapons
    const isIOS = /[- ]i-?os$/i.test(widStripped) || /[- ]os$/i.test(widStripped) || widStripped.includes('one-shot');
    const isOneShot = isRocketLauncher || isIOS;
    const effectiveHeat = isOneShot ? res.heat / 4 : res.heat;
    // IOS weapons use 1/5 of base weapon BV (aliases must point to BASE weapon entries)
    const effectiveBV = isIOS ? Math.round(res.battleValue / 5.0) : res.battleValue;

    let isRear = isRearLoc(eq.location);

    for (let i = 0; i < qty; i++) {
      let thisRear = isRear;
      if (!thisRear && unit.criticalSlots) {
        const rawLoc = eq.location.split(',')[0].toUpperCase();
        const locRearMap = cs.rearWeaponCountByLoc.get(rawLoc);
        if (locRearMap) {
          const eqNorm = normalizeEquipId(eq.id);
          const eqCanonical = normalizeEquipmentId(eq.id);
          for (const [critName, count] of Array.from(locRearMap.entries())) {
            if (count > 0 && (critName === eqNorm || critName.includes(eqNorm) || eqNorm.includes(critName) ||
                normalizeEquipmentId(critName) === eqCanonical)) {
              thisRear = true;
              locRearMap.set(critName, count - 1);
              break;
            }
          }
        }
      }
      const weaponLocUpper = eq.location.split(',')[0].toUpperCase();
      const weaponHasAES = cs.aesLocs.some(aLoc => aLoc.toUpperCase() === weaponLocUpper);
      weapons.push({
        id: normalizeWeaponKey(eq.id), name: wid, heat: effectiveHeat, bv: effectiveBV,
        rear: thisRear, hasAES: weaponHasAES,
        isDirectFire: !wid.includes('lrm') && !wid.includes('srm') && !wid.includes('mrm') && !wid.includes('atm') && !wid.includes('mml') && !wid.includes('narc') && !wid.includes('inarc'),
        location: eq.location,
      });
    }
  }
  if (unresolvedWeapons.length > 0) issues.push(`Unresolved weapons (0 BV): ${unresolvedWeapons.join(', ')}`);

  // Artemis IV/V — location-aware assignment (Artemis links to missile weapon in same location)
  if (cs.artemisIVLocs.length > 0 || cs.artemisVLocs.length > 0) {
    const ivLocs = [...cs.artemisIVLocs];
    const vLocs = [...cs.artemisVLocs];
    for (const w of weapons) {
      const isMsl = w.name.includes('lrm') || w.name.includes('srm') || w.name.includes('mml') || w.name.includes('atm');
      if (!isMsl) continue;
      const wLoc = toMechLoc(w.location.split(',')[0]);
      if (!wLoc) continue;
      const vIdx = vLocs.indexOf(wLoc);
      if (vIdx >= 0) { w.artemisType = 'v'; vLocs.splice(vIdx, 1); }
      else {
        const ivIdx = ivLocs.indexOf(wLoc);
        if (ivIdx >= 0) { w.artemisType = 'iv'; ivLocs.splice(ivIdx, 1); }
      }
    }
  }

  if (cs.apollo > 0) { let a = cs.apollo; for (const w of weapons) { if (a <= 0) break; if (w.name.includes('mrm')) { w.bv = Math.round(w.bv * 1.15); a--; } } }

  if (cs.ppcCap > 0) {
    let c = cs.ppcCap;
    for (const w of weapons) {
      if (c <= 0) break;
      if (!w.name.includes('ppc')) continue;
      const wlo = w.name.replace(/^\d+-/, '');
      let capBV = 44;
      if (wlo.includes('erppc') || wlo.includes('er-ppc')) {
        capBV = (unit.techBase === 'CLAN' || wlo.startsWith('cl') || wlo.startsWith('clan')) ? 136 : 114;
      } else if (wlo.includes('heavy') || wlo.includes('hppc')) {
        capBV = 53;
      } else if (wlo.includes('snub') || wlo.includes('snppc')) {
        capBV = 87;
      } else if (wlo.includes('light') || wlo.includes('lppc')) {
        capBV = 44;
      } else if (wlo.includes('ppc')) {
        capBV = 88;
      }
      w.bv += capBV;
      w.heat += 5;
      c--;
    }
  }

  // MGA: MegaMek sums linked MG BVs × 0.67 as a single weapon entry, replacing individual MGs.
  // Individual MGs linked to an MGA are also counted separately (MegaMek double-counts).
  // MGA weapon: heat=0, BV = sum(linked MG BVs) × 0.67
  if (cs.mgaLocs.length > 0) {
    for (const mga of cs.mgaLocs) {
      const mgaLocUpper = mga.location.toUpperCase();
      const mgType = mga.type;
      let mgBVSum = 0;
      for (const w of weapons) {
        if (w.location.split(',')[0].toUpperCase() !== mgaLocUpper) continue;
        // Strip IS/Clan prefix for matching (e.g., 'islightmg' → 'lightmg', 'clmachinegun' → 'machinegun')
        const wlo = w.name.replace(/^\d+-/, '').replace(/^(?:is|cl|clan)/, '');
        const isMG = (mgType === 'standard' && (wlo.includes('machine-gun') || wlo.includes('machinegun') || wlo === 'mg') && !wlo.includes('light') && !wlo.includes('heavy'))
          || (mgType === 'light' && (wlo.includes('light-machine-gun') || wlo.includes('lightmachine') || wlo.includes('lightmg') || wlo === 'light-mg'))
          || (mgType === 'heavy' && (wlo.includes('heavy-machine-gun') || wlo.includes('heavymachine') || wlo.includes('heavymg') || wlo === 'heavy-mg'));
        if (isMG) mgBVSum += w.bv;
      }
      // Add MGA as a weapon entry with combined BV × 0.67 (MegaMek processWeapon for F_MGA)
      if (mgBVSum > 0) {
        weapons.push({
          id: 'mga-' + mgType, name: 'mga-' + mgType, heat: 0, bv: mgBVSum * 0.67,
          rear: false, isDirectFire: true, location: mga.location,
        });
      }
    }
  }

  // determineFront — use fully-modified BV (with TC, rear ×0.5) per MegaMek
  let fBV = 0, rBV = 0;
  for (const w of weapons) {
    if (isArmLoc(w.location)) continue;
    let modBV = w.bv;
    if (w.hasAES) modBV *= 1.25;
    if (hasTC && w.isDirectFire) modBV *= 1.25;
    if (w.rear) { rBV += modBV * 0.5; } else { fBV += modBV; }
  }
  if (rBV > fBV) { for (const w of weapons) { if (!isArmLoc(w.location)) w.rear = !w.rear; } }

  const ammoForCalc = cs.ammo.map(a => ({ id: a.id, bv: a.bv, weaponType: a.weaponType }));
  if (process.env.DEBUG_AMMO && ammoForCalc.length > 0) {
    console.error(`AMMO: ${ammoForCalc.map(a => `${a.id}(bv=${a.bv},wt=${a.weaponType})`).join(', ')}`);
    console.error(`WEAPONS: ${weapons.map(w => `${w.id}(bv=${w.bv})`).join(', ')}`);
  }

  let defEquipBV = 0;
  let amsWeaponBV = 0;
  for (const did of defEquipIds) {
    // Strip "(armored)" suffix so armored variants resolve to base equipment BV
    const didClean = did.replace(/\s*\(armored\)/gi, '').trim();
    const resolvedBV = resolveEquipmentBV(didClean).battleValue;
    defEquipBV += resolvedBV;
    const dlo = did.toLowerCase();
    const isAmsWeapon = (dlo.includes('anti-missile') || dlo.includes('antimissile') || dlo === 'isams' || dlo === 'clams' || dlo.includes('apds')) && !dlo.includes('ammo');
    if (isAmsWeapon) amsWeaponBV += resolvedBV;
  }
  if (cs.amsAmmoBV > 0 && amsWeaponBV > 0) {
    defEquipBV += Math.min(amsWeaponBV, cs.amsAmmoBV);
  }
  // Spikes: 4 BV per location (defensive equipment per MegaMek)
  defEquipBV += cs.spikeCount * 4;

  const explResult = calculateExplosivePenalties({ equipment: cs.explosive, caseLocations: cs.caseLocs, caseIILocations: cs.caseIILocs, engineType, isQuad: effectiveConfig?.toLowerCase() === 'quad' });

  // HarJel II/III: per-location armor BV multiplier (1.1x / 1.2x)
  // MegaMek calculates armor BV per-location when HarJel is present
  let harjelArmorBonus = 0;
  if (cs.harjelIILocs.length > 0 || cs.harjelIIILocs.length > 0) {
    const armorMult = getArmorBVMultiplier(hasStealth ? 'standard' : armorType);
    for (const [locName, armorVal] of Object.entries(unit.armor.allocation)) {
      const ml = toMechLoc(locName);
      if (!ml) continue;
      let locArmor: number;
      if (typeof armorVal === 'number') { locArmor = armorVal; }
      else { locArmor = (armorVal.front || 0) + (armorVal.rear || 0); }
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
    if (mp <= 2) return 0; if (mp <= 4) return 1; if (mp <= 6) return 2;
    if (mp <= 9) return 3; if (mp <= 17) return 4; if (mp <= 24) return 5; return 6;
  }
  // TMM → minimum MP that produces that TMM: [0,3,5,7,10,18,25]
  const tmmToMinMP = [0, 3, 5, 7, 10, 18, 25];
  const runTMM = tmmFromMP(runMP);
  const effectiveJump = Math.max(jumpMP, cs.umuMP);
  const jumpTMM = effectiveJump > 0 ? tmmFromMP(effectiveJump) + 1 : 0;
  const correctMaxTMM = Math.max(runTMM, jumpTMM);
  // Convert to an equivalent runMP that calculateTMM will map to correctMaxTMM
  const defRunMP = correctMaxTMM <= 6 ? tmmToMinMP[correctMaxTMM] : 25;

  const defCfg: Parameters<typeof calculateDefensiveBV>[0] = {
    totalArmorPoints: totalArmor, totalStructurePoints: totalStructure, tonnage: unit.tonnage,
    runMP: defRunMP, jumpMP: 0, umuMP: 0, armorType: hasStealth ? 'standard' : armorType, structureType, gyroType, engineType,
    defensiveEquipmentBV: defEquipBV + harjelArmorBonus + cs.armoredComponentBV, explosivePenalties: explResult.totalPenalty,
    hasStealthArmor: hasStealth, hasChameleonLPS: cs.hasChameleon,
    hasNullSig: cs.hasNullSig, hasVoidSig: cs.hasVoidSig,
  };
  if (engineBVOverride !== undefined) { defCfg.engineMultiplier = engineBVOverride; defCfg.engineType = undefined; }
  const defResult = calculateDefensiveBV(defCfg);

  let physicalWeaponBV = 0;
  for (const pw of cs.physicalWeapons) {
    let bv = calculatePhysicalWeaponBV(pw.type, unit.tonnage, cs.hasTSM);
    bv = Math.round(bv * 1000.0) / 1000.0;
    const pwLocUpper = pw.location.toUpperCase();
    if (cs.aesLocs.some(aLoc => aLoc.toUpperCase() === pwLocUpper)) bv *= 1.25;
    physicalWeaponBV += bv;
  }

  const isXXLEngine = engineType === EngineType.XXL;
  let offensiveEquipBV = 0;
  // Note: Watchdog CEWS is NOT counted as offensive equipment in MegaMek
  // (the bv=7 code is unreachable due to F_BAP skip in processOffensiveEquipment)
  // AES weight bonus: arm AES (+0.1 each), leg AES (+0.2 biped, +0.4 quad)
  // per MekBVCalculator.processWeight() lines 428-441
  const armAES = cs.aesLocs.filter(loc => loc.toUpperCase().includes('ARM')).length;
  const hasLegAES = cs.aesLocs.some(loc => loc.toUpperCase().includes('LEG'));
  const isQuad = effectiveConfig?.toLowerCase() === 'quad';
  const baseJumpMP = unit.movement.jump || 0;
  const offResult = calculateOffensiveBVWithHeatTracking({
    weapons, ammo: ammoForCalc, tonnage: unit.tonnage,
    walkMP: bvWalk, runMP, jumpMP, umuMP: cs.umuMP, heatDissipation: heatDiss,
    hasTargetingComputer: hasTC, hasTSM: cs.hasTSM,
    hasStealthArmor: hasStealth, hasNullSig: cs.hasNullSig,
    hasVoidSig: cs.hasVoidSig, hasChameleonShield: cs.hasChameleon,
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
  });

  const baseBV = defResult.totalDefensiveBV + offResult.totalOffensiveBV;
  const isOverriddenStandard = unitId && KNOWN_STANDARD_COCKPIT_OVERRIDE.has(unitId);
  const effectiveCockpit = cs.detectedInterfaceCockpit && cockpitType === 'standard' ? 'interface'
    : !isOverriddenStandard && cs.detectedSmallCockpit && cockpitType === 'standard' ? 'small'
    : !isOverriddenStandard && (unitId && KNOWN_SMALL_COCKPIT_UNITS.has(unitId) && cockpitType === 'standard') ? 'small'
    : cockpitType;
  let totalBV = Math.round(baseBV * getCockpitModifier(effectiveCockpit));
  // Drone Operating System: 0.95x final BV (MegaMek MekBVCalculator.processOffensiveTypeModifier)
  if (cs.detectedDroneOS) totalBV = Math.round(totalBV * 0.95);

  const cockpitMod = getCockpitModifier(effectiveCockpit);
  const totalDefEquipBV = defEquipBV + harjelArmorBonus + cs.armoredComponentBV;
  return { bv: totalBV, breakdown: {
    // Defensive sub-components
    armorBV: defResult.armorBV, structureBV: defResult.structureBV, gyroBV: defResult.gyroBV,
    defEquipBV, amsAmmoBV: cs.amsAmmoBV, armoredComponentBV: cs.armoredComponentBV, harjelBonus: harjelArmorBonus,
    explosivePenalty: explResult.totalPenalty, defensiveFactor: defResult.defensiveFactor,
    maxTMM: correctMaxTMM,
    defensiveBV: defResult.totalDefensiveBV,
    // Offensive sub-components
    weaponBV: offResult.weaponBV, rawWeaponBV: offResult.rawWeaponBV ?? offResult.weaponBV,
    halvedWeaponBV: offResult.halvedWeaponBV ?? 0,
    ammoBV: offResult.ammoBV, weightBonus: offResult.weightBonus,
    physicalWeaponBV, offEquipBV: offensiveEquipBV,
    heatEfficiency: offResult.heatEfficiency ?? 0, heatDissipation: heatDiss,
    moveHeat: offResult.moveHeat ?? 0,
    speedFactor: offResult.speedFactor, offensiveBV: offResult.totalOffensiveBV,
    // Modifiers
    cockpitModifier: cockpitMod, cockpitType: effectiveCockpit,
    // Context
    techBase: unit.techBase, walkMP: bvWalk, runMP, jumpMP,
    weaponCount: offResult.weaponCount ?? weapons.length,
    halvedWeaponCount: offResult.halvedWeaponCount ?? 0,
    // Legacy alias
    defensiveEquipBV: totalDefEquipBV,
  }, issues };
}

// === ROOT CAUSE ANALYSIS ===
function classifyRootCause(result: ValidationResult, unit: UnitData): string {
  if (result.status === 'error' || result.calculatedBV === null) return 'calculation-error';
  if (result.status === 'exact' || result.status === 'within1') return 'none';
  const diff = result.difference!;
  const absPct = Math.abs(result.percentDiff!);
  if (result.issues.some(i => i.includes('Unresolved weapons'))) return 'unresolved-weapon';
  const hasAmmo = unit.criticalSlots && Object.values(unit.criticalSlots).some(slots => Array.isArray(slots) && slots.some(s => s && typeof s === 'string' && s.toLowerCase().includes('ammo')));
  if (diff > 0 && absPct > 5) return Math.abs(diff) > 200 ? 'possible-missing-penalty' : 'overcalculation';
  if (diff < 0 && absPct > 5) { if (hasAmmo && (result.breakdown?.ammoBV ?? 0) === 0) return 'missing-ammo-bv'; return 'undercalculation'; }
  if (absPct <= 1) return 'rounding';
  return 'minor-discrepancy';
}

// === PARETO ===
function buildPareto(results: ValidationResult[]): ParetoAnalysis {
  const fails = results.filter(r => r.status !== 'exact' && r.status !== 'within1' && r.status !== 'error');
  const cats: Record<string, { units: string[]; diffs: number[] }> = {};
  for (const r of fails) { const c = r.rootCause || 'unknown'; if (!cats[c]) cats[c] = { units: [], diffs: [] }; cats[c].units.push(`${r.chassis} ${r.model}`); cats[c].diffs.push(Math.abs(r.percentDiff || 0)); }
  return { generatedAt: new Date().toISOString(), totalFailures: fails.length, categories: Object.entries(cats).map(([n,d]) => ({ name: n, count: d.units.length, units: d.units.slice(0,10), avgAbsPercentDiff: d.diffs.reduce((a,b)=>a+b,0)/d.diffs.length })).sort((a,b)=>b.count-a.count) };
}

// === MAIN ===
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let outputPath = path.resolve(process.cwd(), './validation-output');
  let filter: string | undefined, limit: number | undefined, verbose = false;
  for (let i = 0; i < args.length; i++) { switch(args[i]) { case '--output': outputPath = path.resolve(args[++i]||'./validation-output'); break; case '--filter': filter = args[++i]; break; case '--limit': limit = parseInt(args[++i]||'0',10); break; case '--verbose': case '-v': verbose = true; break; case '--help': case '-h': console.log('Usage: npx tsx scripts/validate-bv.ts [--output path] [--filter pat] [--limit n] [--verbose]'); process.exit(0); } }

  console.log('\nBV Validation Report (Engine-based)\n====================================');

  const indexPath = path.resolve(process.cwd(), 'public/data/units/battlemechs/index.json');
  if (!fs.existsSync(indexPath)) { console.error('Index not found'); process.exit(1); }

  const indexData: IndexFile = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  let units = indexData.units;
  if (filter) { units = units.filter(u => u.chassis.toLowerCase().includes(filter!.toLowerCase()) || u.model.toLowerCase().includes(filter!.toLowerCase())); }
  if (limit && limit > 0) units = units.slice(0, limit);
  console.log(`  Total units: ${units.length}`);

  const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
  const results: ValidationResult[] = [];
  const excluded: Array<{ unit: string; reason: string }> = [];

  // Load MUL BV cache: use MUL (Master Unit List) BV as authoritative reference
  // when available, since many index BV values are outdated (BV 1.0 era or wrong)
  const mulBVMap = new Map<string, number>();
  const mulMatchTypes = new Map<string, string>();
  {
    const cachePath = path.resolve(process.cwd(), 'scripts/data-migration/mul-bv-cache.json');
    if (fs.existsSync(cachePath)) {
      const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      for (const u of indexData.units) {
        const entry = cache.entries?.[u.id];
        if (entry) mulMatchTypes.set(u.id, entry.matchType || 'unknown');
        if (entry && entry.mulBV > 0 && entry.matchType === 'exact') {
          mulBVMap.set(u.id, entry.mulBV);
        }
        // Accept fuzzy matches only when MUL name (stripped of parenthetical alt-names)
        // matches our "chassis model" exactly. This prevents wrong matches like:
        //   "Loki Mk II (Hel) Prime" ≠ "Loki Prime"
        //   "Gladiator-B (Executioner-B) A" ≠ "Gladiator A"
        //   "Man O' War (Gargoyle) Prime" model ends with "e" matching model "E"
        if (entry && entry.mulBV > 0 && entry.matchType === 'fuzzy' && entry.mulName) {
          const mulStripped = entry.mulName.toLowerCase().trim()
            .replace(/\s*\([^)]*\)\s*/g, ' ')  // strip (alternate names)
            .replace(/\s+/g, ' ').trim();
          const expected = (u.chassis + ' ' + u.model).toLowerCase().trim();
          if (mulStripped === expected) {
            mulBVMap.set(u.id, entry.mulBV);
          }
        }
      }
      console.log(`  MUL BV reference available for: ${mulBVMap.size} units`);
    }
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

  const origWarn = console.warn; console.warn = () => {};

  for (let i = 0; i < units.length; i++) {
    const iu = units[i];
    if (verbose) console.log(`  [${i+1}/${units.length}] ${iu.chassis} ${iu.model}`);
    else if (i % 200 === 0 || i === units.length-1) process.stdout.write(`\r  Processing: ${i+1}/${units.length} (${Math.floor(((i+1)/units.length)*100)}%)`);

    const unitPath = path.join(basePath, iu.path);
    if (!fs.existsSync(unitPath)) { results.push({ unitId: iu.id, chassis: iu.chassis, model: iu.model, tonnage: iu.tonnage, indexBV: iu.bv, calculatedBV: null, difference: null, percentDiff: null, status: 'error', error: 'File not found', issues: [] }); continue; }

    let ud: UnitData;
    try { ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8')); }
    catch { results.push({ unitId: iu.id, chassis: iu.chassis, model: iu.model, tonnage: iu.tonnage, indexBV: iu.bv, calculatedBV: null, difference: null, percentDiff: null, status: 'error', error: 'Parse error', issues: [] }); continue; }

    const excl = getExclusionReason(ud, iu);
    if (excl) { excluded.push({ unit: `${iu.chassis} ${iu.model}`, reason: excl }); continue; }

    // Determine reference BV: prefer MUL BV (authoritative), fall back to index BV
    const mulBV = mulBVMap.get(iu.id);
    const referenceBV = mulBV ?? iu.bv;

    // Exclude units with no reliable reference BV
    if (!mulBV && suspectBVIds.has(iu.id)) { excluded.push({ unit: `${iu.chassis} ${iu.model}`, reason: 'No MUL match + suspect index BV' }); continue; }
    // Exclude units with no MUL match at all — index BV is unreliable for verification
    const matchType = mulMatchTypes.get(iu.id);
    if (!mulBV && (matchType === 'not-found' || (matchType === 'fuzzy' && !mulBVMap.has(iu.id)))) { excluded.push({ unit: `${iu.chassis} ${iu.model}`, reason: 'No verified MUL reference BV' }); continue; }
    // MUL matched by name but returned BV=0 — reference is unreliable (common for named variants)
    if (!mulBV && matchType === 'exact') { excluded.push({ unit: `${iu.chassis} ${iu.model}`, reason: 'MUL matched but BV unavailable' }); continue; }
    if (referenceBV === 0) { excluded.push({ unit: `${iu.chassis} ${iu.model}`, reason: 'Zero reference BV' }); continue; }

    try {
      const { bv: calcBV, breakdown, issues } = calculateUnitBV(ud, iu.id);
      const diff = calcBV - referenceBV;
      const pct = referenceBV !== 0 ? (diff / referenceBV) * 100 : 0;
      const absPct = Math.abs(pct);
      const status: ValidationResult['status'] = diff === 0 ? 'exact' : absPct <= 1 ? 'within1' : absPct <= 5 ? 'within5' : absPct <= 10 ? 'within10' : 'over10';
      const r: ValidationResult = { unitId: iu.id, chassis: iu.chassis, model: iu.model, tonnage: iu.tonnage, indexBV: referenceBV, calculatedBV: calcBV, difference: diff, percentDiff: pct, status, breakdown, issues };
      r.rootCause = classifyRootCause(r, ud);
      results.push(r);
    } catch (err) { results.push({ unitId: iu.id, chassis: iu.chassis, model: iu.model, tonnage: iu.tonnage, indexBV: referenceBV, calculatedBV: null, difference: null, percentDiff: null, status: 'error', error: String(err), issues: [] }); }
  }

  console.warn = origWarn;
  if (!verbose) console.log('');

  const calc = results.filter(r => r.status !== 'error').length;
  const fail = results.filter(r => r.status === 'error').length;
  const exact = results.filter(r => r.status === 'exact').length;
  const w1 = results.filter(r => r.status === 'exact' || r.status === 'within1').length;
  const w5 = results.filter(r => ['exact','within1','within5'].includes(r.status)).length;
  const w10 = results.filter(r => ['exact','within1','within5','within10'].includes(r.status)).length;
  const o10 = results.filter(r => r.status === 'over10').length;
  const w1p = calc > 0 ? (w1/calc)*100 : 0;
  const w5p = calc > 0 ? (w5/calc)*100 : 0;
  const g1 = w1p >= 95.0, g5 = w5p >= 99.0;

  console.log(`\n=== SUMMARY ===\nTotal: ${units.length}  Excluded: ${excluded.length}  Validated: ${calc+fail}  Calculated: ${calc}  Failed: ${fail}`);
  console.log(`\nExact: ${exact} (${((exact/calc)*100).toFixed(1)}%)\nWithin 1%: ${w1} (${w1p.toFixed(1)}%)\nWithin 5%: ${w5} (${w5p.toFixed(1)}%)\nWithin 10%: ${w10} (${((w10/calc)*100).toFixed(1)}%)\nOver 10%: ${o10} (${((o10/calc)*100).toFixed(1)}%)`);
  console.log(`\n=== ACCURACY GATES ===\nWithin 1%:  ${w1p.toFixed(1)}% (target: 95.0%) ${g1?'✅ PASS':'❌ FAIL'}\nWithin 5%:  ${w5p.toFixed(1)}% (target: 99.0%) ${g5?'✅ PASS':'❌ FAIL'}`);

  if (excluded.length > 0) { console.log(`\n=== EXCLUDED (${excluded.length}) ===`); const br: Record<string,number> = {}; for (const e of excluded) { const k = e.reason.replace(/\s*\(\d+t\)/,''); br[k]=(br[k]||0)+1; } for (const [r,c] of Object.entries(br).sort((a,b)=>b[1]-a[1])) console.log(`  ${r}: ${c}`); }

  const top = results.filter(r=>r.status!=='error'&&r.percentDiff!==null).sort((a,b)=>Math.abs(b.percentDiff!)-Math.abs(a.percentDiff!)).slice(0,20);
  console.log('\n=== TOP 20 DISCREPANCIES ===\n'+'-'.repeat(102));
  for (const d of top) console.log(`${`${d.chassis} ${d.model}`.padEnd(40).slice(0,40)}${String(d.indexBV).padStart(8)}${String(d.calculatedBV).padStart(9)}${((d.difference!>=0?'+':'')+d.difference!).padStart(8)}${((d.percentDiff!>=0?'+':'')+d.percentDiff!.toFixed(1)+'%').padStart(8)}  ${d.rootCause||'unknown'}`);

  const pareto = buildPareto(results);
  console.log('\n=== PARETO ANALYSIS ===');
  for (const c of pareto.categories) console.log(`  ${c.name}: ${c.count} units (avg ${c.avgAbsPercentDiff.toFixed(1)}% off)`);

  if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath, { recursive: true });
  const report: ValidationReport = { generatedAt: new Date().toISOString(), summary: { totalUnits: units.length, excludedAllowlist: excluded.length, validatedUnits: calc+fail, calculated: calc, failedToCalculate: fail, exactMatch: exact, within1Percent: w1, within5Percent: w5, within10Percent: w10, over10Percent: o10, within1PercentPct: Math.round(w1p*10)/10, within5PercentPct: Math.round(w5p*10)/10 }, accuracyGates: { within1Percent: { target: 95.0, actual: Math.round(w1p*10)/10, passed: g1 }, within5Percent: { target: 99.0, actual: Math.round(w5p*10)/10, passed: g5 } }, topDiscrepancies: top, allResults: results };
  fs.writeFileSync(path.join(outputPath, 'bv-validation-report.json'), JSON.stringify(report, null, 2));
  // Write compact results for analysis (without breakdowns to keep file size manageable)
  const compactResults = results.map(r => ({ id: r.unitId, name: `${r.chassis} ${r.model}`, ton: r.tonnage, ref: r.indexBV, calc: r.calculatedBV, diff: r.difference, pct: r.percentDiff != null ? Math.round(r.percentDiff * 10) / 10 : null, status: r.status, cause: r.rootCause || null, defBV: r.breakdown?.defensiveBV, offBV: r.breakdown?.offensiveBV, weapBV: r.breakdown?.weaponBV, ammoBV: r.breakdown?.ammoBV, sf: r.breakdown?.speedFactor, explPen: r.breakdown?.explosivePenalty, defEqBV: r.breakdown?.defensiveEquipBV }));
  fs.writeFileSync(path.join(outputPath, 'bv-all-results.json'), JSON.stringify(compactResults));
  fs.writeFileSync(path.join(outputPath, 'bv-pareto-analysis.json'), JSON.stringify(pareto, null, 2));
  console.log(`\nReports: ${outputPath}/`);
  if (g1 && g5) console.log('\n🎉 ALL ACCURACY GATES PASSED!');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
