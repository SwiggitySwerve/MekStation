#!/usr/bin/env npx tsx
/**
 * Trace the exact defensive BV gap for units by comparing our calculation
 * against expected values, component by component.
 */
import * as fs from 'fs';
import * as path from 'path';

import { EngineType } from '../src/types/construction/EngineType';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';
import {
  calculateDefensiveBV,
  calculateExplosivePenalties,
  type MechLocation,
  type ExplosiveEquipmentEntry,
} from '../src/utils/construction/battleValueCalculations';
import {
  resolveEquipmentBV,
  normalizeEquipmentId,
} from '../src/utils/construction/equipmentBVResolver';
import {
  getArmorBVMultiplier,
  getEngineBVMultiplier,
  getStructureBVMultiplier,
  getGyroBVMultiplier,
} from '../src/types/validation/BattleValue';

interface IndexUnit { id: string; chassis: string; model: string; tonnage: number; techBase: string; path: string; bv: number; }
interface IndexFile { units: IndexUnit[]; }
interface ArmorAllocation { [location: string]: number | { front: number; rear: number }; }
interface Equipment { id: string; location: string; }
interface UnitData {
  id: string; chassis: string; model: string; configuration: string; techBase: string; tonnage: number;
  engine: { type: string; rating: number }; gyro: { type: string }; cockpit: string;
  structure: { type: string }; armor: { type: string; allocation: ArmorAllocation };
  heatSinks: { type: string; count: number }; movement: { walk: number; jump: number };
  equipment: Equipment[]; criticalSlots?: Record<string, (string | null)[]>;
}

function mapEngineType(s: string, tb: string): EngineType {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u === 'XL' || u === 'XLENGINE') return tb === 'CLAN' ? EngineType.XL_CLAN : EngineType.XL_IS;
  if (u === 'CLANXL' || u === 'CLAN_XL' || u === 'XLCLAN') return EngineType.XL_CLAN;
  if (u === 'LIGHT' || u === 'LIGHTENGINE') return EngineType.LIGHT;
  if (u === 'XXL' || u === 'XXLENGINE') return EngineType.XXL;
  if (u === 'COMPACT' || u === 'COMPACTENGINE') return EngineType.COMPACT;
  if (u === 'ICE') return EngineType.ICE;
  if (u === 'FUELCELL') return EngineType.FUEL_CELL;
  if (u === 'FISSION') return EngineType.FISSION;
  return EngineType.STANDARD;
}

function mapArmorType(s: string): string {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('HARDENED')) return 'hardened';
  if (u.includes('REACTIVE')) return 'reactive';
  if (u.includes('REFLECTIVE') || u.includes('LASERREFLECTIVE')) return 'reflective';
  if (u.includes('BALLISTICREINFORCED')) return 'ballistic-reinforced';
  if (u.includes('FERROLAMELLOR')) return 'ferro-lamellor';
  if (u.includes('STEALTH')) return 'stealth';
  if (u.includes('ANTIPENETRATIVE') || u.includes('ABLATION')) return 'anti-penetrative';
  if (u.includes('HEATDISSIPATING')) return 'heat-dissipating';
  return 'standard';
}

function mapStructureType(s: string): string {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('INDUSTRIAL')) return 'industrial';
  if (u === 'COMPOSITE') return 'composite';
  if (u.includes('REINFORCED')) return 'reinforced';
  return 'standard';
}

function mapGyroType(s: string): string {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('HEAVYDUTY') || u.includes('HEAVY')) return 'heavy-duty';
  if (u.includes('XL')) return 'xl';
  if (u.includes('COMPACT')) return 'compact';
  return 'standard';
}

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

function calcTotalStructure(ton: number): number {
  const t = STRUCTURE_POINTS_TABLE[ton];
  if (!t) {
    const k = Object.keys(STRUCTURE_POINTS_TABLE).map(Number).sort((a, b) => a - b).filter(x => x <= ton).pop();
    if (k) { const t2 = STRUCTURE_POINTS_TABLE[k]; return t2.head + t2.centerTorso + t2.sideTorso * 2 + t2.arm * 2 + t2.leg * 2; }
    return 0;
  }
  return t.head + t.centerTorso + t.sideTorso * 2 + t.arm * 2 + t.leg * 2;
}

function calcTotalArmor(a: ArmorAllocation): number {
  let t = 0;
  for (const v of Object.values(a)) {
    if (typeof v === 'number') t += v;
    else if (v && typeof v === 'object') t += (v.front || 0) + (v.rear || 0);
  }
  return t;
}

// Load data
const indexPath = path.resolve('public/data/units/battlemechs/index.json');
const indexData: IndexFile = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

// Pick units: prefer standard config, standard armor, standard engine
// to minimize confounding variables. We want to see the systematic gap.
const targetUnits = indexData.units
  .filter(u => u.bv > 0 && u.tonnage <= 100)
  .slice(0, 500);

let totalGap = 0;
let totalUnits = 0;
const results: Array<{
  name: string; tonnage: number; indexBV: number;
  armorBV: number; structureBV: number; gyroBV: number;
  defEquipBV: number; explPenalty: number; preFactor: number;
  defFactor: number; defBV: number;
  engineType: string; armorType: string; structureType: string;
}> = [];

for (const iu of targetUnits) {
  const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
  let unit: UnitData;
  try { unit = JSON.parse(fs.readFileSync(unitPath, 'utf-8')); } catch { continue; }
  if (!unit.armor?.allocation || !unit.engine || !unit.structure) continue;
  if (unit.configuration === 'LAM' || unit.configuration === 'Tripod' || unit.configuration === 'QuadVee') continue;
  if (unit.tonnage > 100) continue;

  const engineType = mapEngineType(unit.engine.type, unit.techBase);
  const armorType = mapArmorType(unit.armor.type);
  const structureType = mapStructureType(unit.structure.type);
  const gyroType = mapGyroType(unit.gyro.type);

  // Skip special armor types to focus on standard cases
  if (armorType !== 'standard' && armorType !== 'stealth') continue;

  const totalArmor = calcTotalArmor(unit.armor.allocation);
  const totalStructure = calcTotalStructure(unit.tonnage);

  const armorMult = getArmorBVMultiplier(armorType === 'stealth' ? 'standard' : armorType);
  const structMult = getStructureBVMultiplier(structureType);
  const engineMult = getEngineBVMultiplier(engineType);
  const gyroMult = getGyroBVMultiplier(gyroType);

  const armorBV = totalArmor * 2.5 * armorMult;
  const structureBV = totalStructure * 1.5 * structMult * engineMult;
  const gyroBV = unit.tonnage * gyroMult;

  // Basic defensive equipment scan (just count what we have)
  // We'll compute defEquipBV = 0 for now to isolate the base formula
  const preFactor = armorBV + structureBV + gyroBV;

  results.push({
    name: `${iu.chassis} ${iu.model}`,
    tonnage: unit.tonnage,
    indexBV: iu.bv,
    armorBV,
    structureBV,
    gyroBV,
    defEquipBV: 0,
    explPenalty: 0,
    preFactor,
    defFactor: 0,
    defBV: 0,
    engineType: unit.engine.type,
    armorType: unit.armor.type,
    structureType: unit.structure.type,
  });
  totalUnits++;
}

// Sort by tonnage for clear patterns
results.sort((a, b) => a.tonnage - b.tonnage || a.indexBV - b.indexBV);

// Print header
console.log('=== Defensive BV Component Breakdown (Standard Armor Only) ===');
console.log(`Units analyzed: ${totalUnits}\n`);

// Group by tonnage to show pattern
const byTonnage = new Map<number, typeof results>();
for (const r of results) {
  if (!byTonnage.has(r.tonnage)) byTonnage.set(r.tonnage, []);
  byTonnage.get(r.tonnage)!.push(r);
}

console.log('Tonnage | ArmorBV avg | StructBV avg | GyroBV | PreFactor avg | EngineType sample');
console.log('--------|-------------|--------------|--------|---------------|------------------');
for (const [ton, group] of Array.from(byTonnage.entries()).sort((a, b) => a[0] - b[0])) {
  if (group.length < 2) continue;
  const avgArmor = group.reduce((s, r) => s + r.armorBV, 0) / group.length;
  const avgStruct = group.reduce((s, r) => s + r.structureBV, 0) / group.length;
  const avgPre = group.reduce((s, r) => s + r.preFactor, 0) / group.length;
  const engTypes = [...new Set(group.map(r => r.engineType))].join(', ');
  console.log(`${String(ton).padStart(4)}t   | ${avgArmor.toFixed(1).padStart(11)} | ${avgStruct.toFixed(1).padStart(12)} | ${group[0].gyroBV.toFixed(1).padStart(6)} | ${avgPre.toFixed(1).padStart(13)} | ${engTypes}`);
}

// Now check: what % of total BV does the defensive pre-factor represent?
// If the systematic gap is ~60 BV on 100t mechs, what's that as a fraction?
console.log('\n=== Gap Analysis ===');
console.log('If the gap is in defensive BV, ~60 BV on a 100-ton mech:');
const ton100 = results.filter(r => r.tonnage === 100);
if (ton100.length > 0) {
  const avgPre100 = ton100.reduce((s, r) => s + r.preFactor, 0) / ton100.length;
  console.log(`  Average pre-factor defensive BV for 100t: ${avgPre100.toFixed(1)}`);
  console.log(`  60 BV gap is ${(60 / avgPre100 * 100).toFixed(1)}% of pre-factor`);
  console.log(`  With defensive factor ~1.2, the pre-factor gap would be ~${(60 / 1.2).toFixed(1)} BV`);
  console.log(`  ${(50 / avgPre100 * 100).toFixed(1)}% of pre-factor => could be a missing component`);
}

// What equipment BV could be missing? Let's check a few sample units
console.log('\n=== Sample Unit Deep Traces ===');
const sampleNames = ['Atlas AS7-D', 'Hunchback HBK-4G', 'Wolverine WVR-6R', 'Marauder MAD-3R', 'Warhammer WHM-6R'];

for (const iu of indexData.units) {
  const fullName = `${iu.chassis} ${iu.model}`;
  if (!sampleNames.includes(fullName)) continue;

  const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
  let unit: UnitData;
  try { unit = JSON.parse(fs.readFileSync(unitPath, 'utf-8')); } catch { continue; }

  const engineType = mapEngineType(unit.engine.type, unit.techBase);
  const armorType = mapArmorType(unit.armor.type);
  const structureType = mapStructureType(unit.structure.type);
  const gyroType = mapGyroType(unit.gyro.type);

  const totalArmor = calcTotalArmor(unit.armor.allocation);
  const totalStructure = calcTotalStructure(unit.tonnage);

  const armorMult = getArmorBVMultiplier(armorType === 'stealth' ? 'standard' : armorType);
  const structMult = getStructureBVMultiplier(structureType);
  const engineMult = getEngineBVMultiplier(engineType);
  const gyroMult = getGyroBVMultiplier(gyroType);

  const armorBV = totalArmor * 2.5 * armorMult;
  const structureBV = totalStructure * 1.5 * structMult * engineMult;
  const gyroBV = unit.tonnage * gyroMult;

  console.log(`\n--- ${fullName} (${unit.tonnage}t, BV=${iu.bv}) ---`);
  console.log(`  Engine: ${unit.engine.type} (${engineType}), engineMult: ${engineMult}`);
  console.log(`  Armor: ${unit.armor.type}, total points: ${totalArmor}`);
  console.log(`  Structure: ${unit.structure.type}, total points: ${totalStructure}`);
  console.log(`  Gyro: ${unit.gyro.type}`);
  console.log(`  ArmorBV = ${totalArmor} × 2.5 × ${armorMult} = ${armorBV.toFixed(1)}`);
  console.log(`  StructBV = ${totalStructure} × 1.5 × ${structMult} × ${engineMult} = ${structureBV.toFixed(1)}`);
  console.log(`  GyroBV = ${unit.tonnage} × ${gyroMult} = ${gyroBV.toFixed(1)}`);
  console.log(`  Pre-factor total = ${(armorBV + structureBV + gyroBV).toFixed(1)}`);

  // List ALL crit slots that might be defensive equipment
  if (unit.criticalSlots) {
    const defItems: string[] = [];
    for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      let prevClean: string | null = null;
      for (const slot of slots) {
        if (!slot) { prevClean = null; continue; }
        const clean = slot.replace(/\s*\(omnipod\)/gi, '').trim();
        if (clean === prevClean) continue; // skip duplicate consecutive slots
        prevClean = clean;
        const lo = clean.toLowerCase();
        // Check if it matches MegaMek's countsAsDefensiveEquipment
        if (lo.includes('anti-missile') || lo.includes('antimissile') || lo === 'isams' || lo === 'clams') {
          defItems.push(`${loc}: ${clean} (AMS)`);
        } else if (lo.includes('ecm') || lo.includes('guardian') || lo.includes('angel') || lo.includes('watchdog') || lo.includes('novacews')) {
          defItems.push(`${loc}: ${clean} (ECM)`);
        } else if (lo.includes('beagle') || lo.includes('bloodhound') || (lo.includes('active') && lo.includes('probe'))) {
          defItems.push(`${loc}: ${clean} (BAP)`);
        } else if (lo.includes('b-pod') || lo === 'isbpod' || lo === 'clbpod') {
          defItems.push(`${loc}: ${clean} (B-Pod)`);
        } else if (lo.includes('m-pod') || lo === 'ismpod' || lo === 'clmpod') {
          defItems.push(`${loc}: ${clean} (M-Pod)`);
        } else if (lo.includes('a-pod') || lo === 'isapod' || lo === 'clapod') {
          defItems.push(`${loc}: ${clean} (A-Pod)`);
        } else if (lo.includes('shield') && !lo.includes('blue-shield') && !lo.includes('chameleon')) {
          defItems.push(`${loc}: ${clean} (Shield)`);
        } else if (lo.includes('spike')) {
          defItems.push(`${loc}: ${clean} (Spikes - MISSING from our defEquip!)`);
        } else if (lo.includes('minesweep')) {
          defItems.push(`${loc}: ${clean} (Minesweeper - MISSING from our defEquip!)`);
        }
      }
    }
    if (defItems.length > 0) {
      console.log(`  Defensive equipment found in crits:`);
      for (const d of defItems) console.log(`    ${d}`);
    } else {
      console.log(`  No defensive equipment in crits`);
    }
  }
}
