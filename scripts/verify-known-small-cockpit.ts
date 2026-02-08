/**
 * Verify every unit in KNOWN_SMALL_COCKPIT_UNITS — check if 0.95 modifier
 * is correct by comparing calc/0.95 vs reference BV.
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const KNOWN_SMALL_COCKPIT_UNITS = [
  'archer-arc-4m-ismail', 'atlas-as7-s-hanssen',
  'axman-axm-6t', 'axman-axm-6x',
  'black-knight-blk-nt-2y', 'black-knight-blk-nt-3b',
  'crockett-crk-5003-0-saddleford',
  'helepolis-hep-2x', 'hermes-ii-her-5c', 'hierofalcon-d',
  'pathfinder-pff-2t',
  'phoenix-hawk-pxh-1bc', 'phoenix-hawk-pxh-7cs',
  'raven-rvn-3l', 'raven-rvn-3m', 'raven-rvn-4l', 'raven-rvn-4lc',
  'scorpion-scp-12c',
  'tessen-tsn-1cr', 'tessen-tsn-c3',
];

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);

console.log('=== VERIFICATION OF KNOWN_SMALL_COCKPIT_UNITS ===');
console.log('For each: check if BV/0.95 matches reference better than BV as-is.\n');

let wrongCount = 0;
const wrongUnits: string[] = [];

for (const unitId of KNOWN_SMALL_COCKPIT_UNITS) {
  const r = valid.find((x: any) => x.unitId === unitId);
  const unit = loadUnit(unitId);
  if (!r || !unit) { console.log(`${unitId}: NOT FOUND`); continue; }

  const calc = r.calculatedBV;
  const ref = r.indexBV;
  const cockpitMod = r.breakdown?.cockpitModifier ?? '?';

  // Current diff with 0.95
  const currentDiff = calc - ref;
  const currentPct = (currentDiff / ref * 100);

  // What would BV be with 1.0 instead of 0.95?
  // BV = round((def + off) * cockpitMod)
  // If cockpitMod is 0.95, then base = calc / 0.95, newCalc = round(base * 1.0) = round(calc / 0.95)
  const withStandard = Math.round(calc / 0.95);
  const stdDiff = withStandard - ref;
  const stdPct = (stdDiff / ref * 100);

  // Check HEAD Life Support count
  const headSlots = unit.criticalSlots?.HEAD || unit.criticalSlots?.HD || [];
  const lsCount = headSlots.filter((s: any) => typeof s === 'string' && s.toLowerCase().includes('life support')).length;

  const correct = Math.abs(currentPct) < Math.abs(stdPct);
  const verdict = correct ? 'CORRECT (0.95)' : `WRONG → should be 1.0 (diff ${stdPct.toFixed(1)}% vs ${currentPct.toFixed(1)}%)`;

  if (!correct) { wrongCount++; wrongUnits.push(unitId); }

  console.log(`${unitId.padEnd(40)} ref=${ref} calc=${calc} with1.0=${withStandard} LS=${lsCount} cockpit=${unit.cockpit||'?'} ${verdict}`);
}

console.log(`\nWrong entries: ${wrongCount} / ${KNOWN_SMALL_COCKPIT_UNITS.length}`);
if (wrongUnits.length > 0) console.log(`  Remove: ${wrongUnits.join(', ')}`);

// Also check: are there units detected as small cockpit by LS heuristic that are NOT in this list?
// and are overcalculated (suggesting false positive)?
console.log('\n=== LS=1 HEURISTIC FALSE POSITIVES (overcalculated, cockpit=0.95) ===');
const overCalcSmall = valid.filter((x: any) =>
  x.breakdown?.cockpitModifier === 0.95 && x.percentDiff > 1 &&
  !KNOWN_SMALL_COCKPIT_UNITS.includes(x.unitId)
);
for (const r of overCalcSmall.sort((a: any, b: any) => b.percentDiff - a.percentDiff).slice(0, 20)) {
  const unit = loadUnit(r.unitId);
  const headSlots = unit?.criticalSlots?.HEAD || unit?.criticalSlots?.HD || [];
  const lsCount = headSlots.filter((s: any) => typeof s === 'string' && s.toLowerCase().includes('life support')).length;
  // What would BV be with 1.0?
  const with10 = Math.round(r.calculatedBV / 0.95);
  const newDiff = ((with10 - r.indexBV) / r.indexBV * 100);
  console.log(`  ${r.unitId.padEnd(40)} ${r.percentDiff.toFixed(1).padStart(5)}% LS=${lsCount} cockpit=${unit?.cockpit||'?'} with1.0→${newDiff.toFixed(1)}%`);
}
