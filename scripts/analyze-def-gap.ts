import * as fs from 'fs';
import * as path from 'path';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

function calcTotalArmor(a: any): number {
  let t = 0;
  for (const v of Object.values(a)) {
    if (typeof v === 'number') t += v;
    else if (v && typeof v === 'object') t += ((v as any).front || 0) + ((v as any).rear || 0);
  }
  return t;
}

// For each unit that's NOT exact, compute expected baseDef and find the gap
// Also note features of the unit

interface UnitAnalysis {
  unitId: string;
  tonnage: number;
  techBase: string;
  engineType: string;
  armorType: string;
  structureType: string;
  hasIJJ: boolean;
  hasAmmo: boolean;
  hsType: string;
  walk: number;
  jump: number;
  diff: number;
  pct: number;
  defGap: number;  // expectedDefBV - reportedDefBV
  offGap: number;  // expectedOffBV - reportedOffBV
}

const analyses: UnitAnalysis[] = [];

for (const r of report.allResults) {
  if (!r.breakdown) continue;
  const entry = (index.units as any[]).find((e: any) => e.id === r.unitId);
  if (!entry?.path) continue;

  try {
    const data = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    const b = r.breakdown;

    // Check for IJJ in crit slots
    let hasIJJ = false;
    if (data.criticalSlots) {
      for (const [loc, slots] of Object.entries(data.criticalSlots)) {
        if (!Array.isArray(slots)) continue;
        for (const s of slots as any[]) {
          if (s && typeof s === 'string' && s.toLowerCase().includes('improved jump jet')) {
            hasIJJ = true;
            break;
          }
        }
        if (hasIJJ) break;
      }
    }

    const hasAmmo = data.equipment.some((e: any) => e.id.toLowerCase().includes('ammo'));

    analyses.push({
      unitId: r.unitId,
      tonnage: data.tonnage,
      techBase: data.techBase,
      engineType: data.engine.type,
      armorType: data.armor.type,
      structureType: data.structure.type,
      hasIJJ,
      hasAmmo,
      hsType: data.heatSinks.type,
      walk: data.movement.walk,
      jump: data.movement.jump || 0,
      diff: r.difference,
      pct: r.percentDiff,
      defGap: (r.indexBV - b.offensiveBV) - b.defensiveBV,
      offGap: (r.indexBV - b.defensiveBV) - b.offensiveBV,
    });
  } catch {}
}

// Classify units by exact/undercalc/overcalc
const exact = analyses.filter(a => Math.abs(a.diff) <= 1);
const undercalc = analyses.filter(a => a.diff < -1);
const overcalc = analyses.filter(a => a.diff > 1);

console.log(`Total: ${analyses.length} (exact: ${exact.length}, undercalc: ${undercalc.length}, overcalc: ${overcalc.length})`);

// For each feature, check how it correlates with accuracy
function analyzeFeature(name: string, testFn: (a: UnitAnalysis) => boolean) {
  const withFeature = analyses.filter(testFn);
  const withoutFeature = analyses.filter(a => !testFn(a));

  const exactWith = withFeature.filter(a => Math.abs(a.diff) <= 1).length;
  const exactWithout = withoutFeature.filter(a => Math.abs(a.diff) <= 1).length;

  const pctWith = withFeature.length > 0 ? (exactWith / withFeature.length * 100).toFixed(1) : 'N/A';
  const pctWithout = withoutFeature.length > 0 ? (exactWithout / withoutFeature.length * 100).toFixed(1) : 'N/A';

  const avgDefGapWith = withFeature.length > 0 ? (withFeature.reduce((s, a) => s + a.defGap, 0) / withFeature.length).toFixed(1) : 'N/A';
  const avgDefGapWithout = withoutFeature.length > 0 ? (withoutFeature.reduce((s, a) => s + a.defGap, 0) / withoutFeature.length).toFixed(1) : 'N/A';

  console.log(`\n${name}: with=${withFeature.length} (${pctWith}% exact, avgDefGap=${avgDefGapWith}) without=${withoutFeature.length} (${pctWithout}% exact, avgDefGap=${avgDefGapWithout})`);
}

analyzeFeature('IJJ (Improved Jump Jets)', a => a.hasIJJ);
analyzeFeature('LIGHT engine', a => a.engineType.toUpperCase() === 'LIGHT');
analyzeFeature('XL engine', a => a.engineType.toUpperCase() === 'XL');
analyzeFeature('XXL engine', a => a.engineType.toUpperCase() === 'XXL');
analyzeFeature('Non-standard engine (XL/LIGHT/XXL/COMPACT)', a => !['FUSION', 'STANDARD'].includes(a.engineType.toUpperCase()));
analyzeFeature('Endo Steel', a => a.structureType.toUpperCase().includes('ENDO'));
analyzeFeature('Non-standard structure', a => !a.structureType.toUpperCase().includes('STANDARD'));
analyzeFeature('Non-standard armor', a => !a.armorType.toUpperCase().includes('STANDARD'));
analyzeFeature('CLAN techBase', a => a.techBase === 'CLAN');
analyzeFeature('MIXED techBase', a => a.techBase === 'MIXED');
analyzeFeature('Jump > 0', a => a.jump > 0);
analyzeFeature('Laser HS', a => a.hsType.toUpperCase().includes('LASER'));
analyzeFeature('Double HS', a => a.hsType.toUpperCase().includes('DOUBLE'));
analyzeFeature('Has ammo', a => a.hasAmmo);

// Now look at defGap vs offGap for undercalculated units
console.log('\n=== Undercalculated units: defGap vs offGap ===');
console.log('Count where |defGap| > |offGap|: ' + undercalc.filter(a => Math.abs(a.defGap) > Math.abs(a.offGap)).length);
console.log('Count where |offGap| > |defGap|: ' + undercalc.filter(a => Math.abs(a.offGap) > Math.abs(a.defGap)).length);
console.log('Avg defGap: ' + (undercalc.reduce((s, a) => s + a.defGap, 0) / undercalc.length).toFixed(1));
console.log('Avg offGap: ' + (undercalc.reduce((s, a) => s + a.offGap, 0) / undercalc.length).toFixed(1));

// Show best and worst exact-rate features
console.log('\n=== Undercalculated units by engine type ===');
for (const eng of ['FUSION', 'LIGHT', 'XL', 'XXL', 'COMPACT']) {
  const units = undercalc.filter(a => a.engineType.toUpperCase() === eng);
  if (units.length === 0) continue;
  const avgGap = (units.reduce((s, a) => s + a.diff, 0) / units.length).toFixed(1);
  const avgDefGap = (units.reduce((s, a) => s + a.defGap, 0) / units.length).toFixed(1);
  console.log(`  ${eng}: n=${units.length} avgDiff=${avgGap} avgDefGap=${avgDefGap}`);
}

// For exact-match units, show which features are most common
console.log('\n=== Features of EXACT match units ===');
const exactFeatures = {
  fusionEngine: exact.filter(a => a.engineType.toUpperCase() === 'FUSION').length,
  xlEngine: exact.filter(a => a.engineType.toUpperCase() === 'XL').length,
  lightEngine: exact.filter(a => a.engineType.toUpperCase() === 'LIGHT').length,
  standardStruct: exact.filter(a => a.structureType.toUpperCase().includes('STANDARD')).length,
  endoSteel: exact.filter(a => a.structureType.toUpperCase().includes('ENDO')).length,
  standardArmor: exact.filter(a => a.armorType.toUpperCase().includes('STANDARD')).length,
  hasJump: exact.filter(a => a.jump > 0).length,
  hasIJJ: exact.filter(a => a.hasIJJ).length,
  clan: exact.filter(a => a.techBase === 'CLAN').length,
  mixed: exact.filter(a => a.techBase === 'MIXED').length,
};
for (const [k, v] of Object.entries(exactFeatures)) {
  console.log(`  ${k}: ${v} / ${exact.length} (${(v / exact.length * 100).toFixed(1)}%)`);
}
