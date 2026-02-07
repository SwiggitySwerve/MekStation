/**
 * Check HEAD crit slot naming for small cockpit vs standard cockpit.
 * Does the crit slot say "Small Cockpit" vs "Cockpit"?
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

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null && x.breakdown);
const with095 = valid.filter((x: any) => x.breakdown?.cockpitModifier === 0.95);

// For all units with cockpit=0.95, check HEAD crit names
const cockpitNames = new Map<string, number>();
const smallCockpitUnits: string[] = [];
const standardCockpitUnits: string[] = [];

for (const r of with095) {
  const unit = loadUnit(r.unitId);
  if (!unit) continue;
  const headSlots = unit.criticalSlots?.HEAD || unit.criticalSlots?.HD || [];
  for (const s of headSlots) {
    if (typeof s !== 'string') continue;
    const lo = s.toLowerCase();
    if (lo.includes('cockpit') || lo.includes('command console')) {
      cockpitNames.set(s, (cockpitNames.get(s) || 0) + 1);
      if (lo.includes('small')) smallCockpitUnits.push(r.unitId);
      else standardCockpitUnits.push(r.unitId);
    }
  }
}

console.log('=== COCKPIT CRIT SLOT NAMES (in 0.95 modifier units) ===');
for (const [name, count] of [...cockpitNames.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  "${name}": ${count}`);
}

// Check LS=1 false positives — what's in their HEAD?
console.log('\n=== HEAD LAYOUT OF LS=1 FALSE POSITIVE CANDIDATES ===');
const falsePosIds = [
  'barghest-bgs-4t', 'celerity-clr-02-x-d', 'celerity-clr-03-o',
  'celerity-clr-03-ob', 'celerity-clr-03-oc', 'celerity-clr-05-x',
  'revenant-ubm-2r4', 'revenant-ubm-2r7', 'thunder-fox-tft-l8',
  'galahad-glh-3d-laodices'
];

for (const unitId of falsePosIds) {
  const unit = loadUnit(unitId);
  if (!unit) continue;
  const headSlots = unit.criticalSlots?.HEAD || unit.criticalSlots?.HD || [];
  console.log(`\n  ${unitId}:`);
  console.log(`    cockpit field: "${unit.cockpit || '?'}"`);
  console.log(`    HEAD: ${JSON.stringify(headSlots)}`);
}

// And a confirmed small cockpit unit for comparison
console.log('\n=== CONFIRMED SMALL COCKPIT UNITS HEAD LAYOUT ===');
const confirmedSmall = ['axman-axm-6t', 'black-knight-blk-nt-2y', 'hierofalcon-d'];
for (const unitId of confirmedSmall) {
  const unit = loadUnit(unitId);
  if (!unit) continue;
  const headSlots = unit.criticalSlots?.HEAD || unit.criticalSlots?.HD || [];
  console.log(`\n  ${unitId}:`);
  console.log(`    cockpit field: "${unit.cockpit || '?'}"`);
  console.log(`    HEAD: ${JSON.stringify(headSlots)}`);
}
