#!/usr/bin/env npx tsx
/**
 * Find units where defEquipBV=0, explosivePenalty=0, standard everything,
 * and there's still a gap. This isolates the gap to the core formula.
 */
import * as fs from 'fs';
import * as path from 'path';

const reportPath = path.resolve('validation-output/bv-validation-report.json');
let report: any;
try { report = JSON.parse(fs.readFileSync(reportPath, 'utf-8')); } catch { process.exit(1); }

interface Result {
  unitId: string; chassis: string; model: string; tonnage: number;
  indexBV: number; calculatedBV: number | null; difference: number | null; percentDiff: number | null;
  breakdown?: { defensiveBV: number; offensiveBV: number; weaponBV: number; ammoBV: number; speedFactor: number; explosivePenalty: number; defensiveEquipBV: number; };
}

const results: Result[] = report.allResults || [];

// Find units with clean defensive formula: no defEquip, no explosives
const cleanUnderCalc = results.filter((r: Result) =>
  r.calculatedBV !== null &&
  r.difference !== null &&
  r.difference < -5 &&
  r.breakdown &&
  r.breakdown.defensiveEquipBV === 0 &&
  r.breakdown.explosivePenalty === 0 &&
  Math.abs(r.percentDiff || 0) < 10
);

console.log(`=== Clean Units (defEquipBV=0, explPenalty=0, undercalc>5) ===`);
console.log(`Count: ${cleanUnderCalc.length}\n`);

// Load unit data for each to check engine/armor/structure types
interface IndexUnit { id: string; chassis: string; model: string; tonnage: number; techBase: string; path: string; bv: number; }
interface IndexFile { units: IndexUnit[]; }
const indexPath = path.resolve('public/data/units/battlemechs/index.json');
const indexData: IndexFile = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
const indexMap = new Map(indexData.units.map(u => [u.id, u]));

interface UnitData {
  id: string; chassis: string; model: string; configuration: string; techBase: string; tonnage: number;
  engine: { type: string; rating: number }; gyro: { type: string }; cockpit: string;
  structure: { type: string }; armor: { type: string; allocation: any };
  heatSinks: { type: string; count: number }; movement: { walk: number; jump: number };
  equipment: any[]; criticalSlots?: Record<string, (string | null)[]>;
}

console.log('Name                           | Ton | Gap | %Diff | DefBV  | OffBV  | SF   | Engine    | Armor     | Structure');
console.log('-------------------------------|-----|-----|-------|--------|--------|------|-----------|-----------|-----------');

for (const r of cleanUnderCalc.sort((a, b) => Math.abs(b.difference!) - Math.abs(a.difference!)).slice(0, 40)) {
  if (!r.breakdown) continue;
  const gap = r.indexBV - r.calculatedBV!;
  const iu = indexMap.get(r.unitId);
  let engine = '?', armor = '?', structure = '?';
  if (iu) {
    try {
      const unit: UnitData = JSON.parse(fs.readFileSync(path.resolve('public/data/units/battlemechs', iu.path), 'utf-8'));
      engine = unit.engine.type;
      armor = unit.armor.type;
      structure = unit.structure.type;
    } catch {}
  }
  const name = `${r.chassis} ${r.model}`.substring(0, 30).padEnd(30);
  console.log(`${name} | ${String(r.tonnage).padStart(3)} | ${String(gap).padStart(3)} | ${(r.percentDiff || 0).toFixed(1).padStart(5)}% | ${r.breakdown.defensiveBV.toFixed(0).padStart(6)} | ${r.breakdown.offensiveBV.toFixed(0).padStart(6)} | ${r.breakdown.speedFactor.toFixed(2).padStart(4)} | ${engine.substring(0, 9).padEnd(9)} | ${armor.substring(0, 9).padEnd(9)} | ${structure.substring(0, 9)}`);
}

// Now check: are ALL of these units with the same engine/armor/structure?
console.log('\n=== Distribution of engine/armor/structure in clean undercalculating units ===');
const engineCounts: Record<string, number> = {};
const armorCounts: Record<string, number> = {};
const structCounts: Record<string, number> = {};

for (const r of cleanUnderCalc) {
  const iu = indexMap.get(r.unitId);
  if (!iu) continue;
  try {
    const unit: UnitData = JSON.parse(fs.readFileSync(path.resolve('public/data/units/battlemechs', iu.path), 'utf-8'));
    engineCounts[unit.engine.type] = (engineCounts[unit.engine.type] || 0) + 1;
    armorCounts[unit.armor.type] = (armorCounts[unit.armor.type] || 0) + 1;
    structCounts[unit.structure.type] = (structCounts[unit.structure.type] || 0) + 1;
  } catch {}
}

console.log('Engine types:', JSON.stringify(engineCounts));
console.log('Armor types:', JSON.stringify(armorCounts));
console.log('Structure types:', JSON.stringify(structCounts));

// For completely clean standard units, what is the gap?
console.log('\n=== Ultra-Clean: STD engine, STD armor, STD structure, defEq=0, expl=0 ===');
let stdCount = 0;
let stdGapTotal = 0;
let stdGapSqTotal = 0;
const stdGapByTon: Record<number, number[]> = {};

for (const r of cleanUnderCalc) {
  const iu = indexMap.get(r.unitId);
  if (!iu) continue;
  try {
    const unit: UnitData = JSON.parse(fs.readFileSync(path.resolve('public/data/units/battlemechs', iu.path), 'utf-8'));
    const engUp = unit.engine.type.toUpperCase();
    const armUp = unit.armor.type.toUpperCase();
    const strUp = unit.structure.type.toUpperCase();
    if ((engUp === 'FUSION' || engUp === 'STANDARD') &&
        !armUp.includes('FERRO') && !armUp.includes('REACTIVE') && !armUp.includes('REFLECTIVE') &&
        !armUp.includes('HARDENED') && !armUp.includes('STEALTH') && !armUp.includes('LAMELLOR') &&
        (strUp === 'STANDARD' || strUp === '')) {
      const gap = r.indexBV - r.calculatedBV!;
      stdCount++;
      stdGapTotal += gap;
      stdGapSqTotal += gap * gap;
      if (!stdGapByTon[r.tonnage]) stdGapByTon[r.tonnage] = [];
      stdGapByTon[r.tonnage].push(gap);
    }
  } catch {}
}

if (stdCount > 0) {
  const avgGap = stdGapTotal / stdCount;
  const variance = stdGapSqTotal / stdCount - avgGap * avgGap;
  console.log(`Count: ${stdCount}`);
  console.log(`Average gap: ${avgGap.toFixed(1)} BV`);
  console.log(`Std dev: ${Math.sqrt(variance).toFixed(1)} BV`);
  console.log('By tonnage:');
  for (const [ton, gaps] of Object.entries(stdGapByTon).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    console.log(`  ${ton}t: avg gap ${avg.toFixed(1)} BV (n=${gaps.length})`);
  }
}
