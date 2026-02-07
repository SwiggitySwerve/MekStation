/**
 * Check LS=1 heuristic false positives that are UNDERCALCULATED.
 * These would benefit from removing the 0.95 modifier.
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

const KNOWN_SMALL_COCKPIT_UNITS = new Set([
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
]);

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null && x.breakdown);

// Find units with cockpit=0.95 that are undercalculated, NOT in the known list
console.log('=== UNDERCALCULATED units with cockpit=0.95, NOT in known list ===');
const underSmall = valid.filter((x: any) =>
  x.breakdown?.cockpitModifier === 0.95 && x.percentDiff < -1 &&
  !KNOWN_SMALL_COCKPIT_UNITS.has(x.unitId)
);

for (const r of underSmall.sort((a: any, b: any) => a.percentDiff - b.percentDiff)) {
  const unit = loadUnit(r.unitId);
  const headSlots = unit?.criticalSlots?.HEAD || unit?.criticalSlots?.HD || [];
  const lsCount = headSlots.filter((s: any) => typeof s === 'string' && s.toLowerCase().includes('life support')).length;
  const with10 = Math.round(r.calculatedBV / 0.95);
  const newPct = ((with10 - r.indexBV) / r.indexBV * 100);
  const improved = Math.abs(newPct) < Math.abs(r.percentDiff);
  console.log(`  ${r.unitId.padEnd(40)} ${r.percentDiff.toFixed(1).padStart(6)}% LS=${lsCount} cockpit=${unit?.cockpit||'?'} with1.0→${newPct.toFixed(1).padStart(6)}% ${improved ? '✓BETTER' : '✗WORSE'}`);
}

// Count all units with cockpit=0.95
const all095 = valid.filter((x: any) => x.breakdown?.cockpitModifier === 0.95);
console.log(`\nTotal units with cockpit=0.95: ${all095.length}`);
console.log(`  In KNOWN list: ${all095.filter((x: any) => KNOWN_SMALL_COCKPIT_UNITS.has(x.unitId)).length}`);
console.log(`  LS=1 heuristic: ${all095.filter((x: any) => {
  const unit = loadUnit(x.unitId);
  const hs = unit?.criticalSlots?.HEAD || unit?.criticalSlots?.HD || [];
  return hs.filter((s: any) => typeof s === 'string' && s.toLowerCase().includes('life support')).length === 1;
}).length}`);

// Check: what cockpit detection source is each 0.95 unit using?
// (Drone OS also gives 0.95)
console.log('\n=== BREAKDOWN BY COCKPIT DETECTION SOURCE ===');
let droneOS = 0, ls1 = 0, knownList = 0, other = 0;
for (const r of all095) {
  const unit = loadUnit(r.unitId);
  if (!unit) continue;
  const headSlots = unit?.criticalSlots?.HEAD || unit?.criticalSlots?.HD || [];
  const lsCount = headSlots.filter((s: any) => typeof s === 'string' && s.toLowerCase().includes('life support')).length;
  const isDroneOS = r.breakdown?.cockpitType === 'drone' ||
    headSlots.some((s: any) => typeof s === 'string' && s.toLowerCase().includes('drone'));
  const inKnown = KNOWN_SMALL_COCKPIT_UNITS.has(r.unitId);

  if (isDroneOS) droneOS++;
  else if (inKnown && lsCount === 2) knownList++;
  else if (lsCount === 1) ls1++;
  else other++;
}
console.log(`  Drone OS: ${droneOS}`);
console.log(`  KNOWN list (LS=2): ${knownList}`);
console.log(`  LS=1 heuristic: ${ls1}`);
console.log(`  Other: ${other}`);
