/**
 * Trace the 29 units just over the 1% boundary (1.0-1.2%).
 * Find common patterns that a small fix could push within 1%.
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
const boundary = valid.filter((x: any) => Math.abs(x.percentDiff) > 1 && Math.abs(x.percentDiff) <= 1.5);

console.log(`Boundary units (1.0-1.5%): ${boundary.length}`);
const over = boundary.filter((x: any) => x.percentDiff > 0);
const under = boundary.filter((x: any) => x.percentDiff < 0);
console.log(`  Overcalculated: ${over.length}, Undercalculated: ${under.length}`);

// Feature counts in boundary
const features: Record<string, { over: string[], under: string[] }> = {};

for (const r of boundary) {
  const unit = loadUnit(r.unitId);
  if (!unit) continue;
  const critsStr = JSON.stringify(unit.criticalSlots || {}).toLowerCase();
  const b = r.breakdown;
  const isOver = r.percentDiff > 0;

  const checks: Record<string, boolean> = {
    'cockpit=0.95': b?.cockpitModifier === 0.95,
    'isQuad': critsStr.includes('"fl_') || critsStr.includes('"rl_') || critsStr.includes('front_left') || critsStr.includes('rear_left'),
    'explosivePenalty>0': (b?.explosivePenalty || 0) > 0,
    'HAG': critsStr.includes('hag'),
    'UltraAC': critsStr.includes('ultra'),
    'LBX': critsStr.includes('lbx') || critsStr.includes('lb '),
    'Streak': critsStr.includes('streak'),
    'HeavyLaser': critsStr.includes('heavy laser') || critsStr.includes('heavylaser'),
    'RotaryAC': critsStr.includes('rotary'),
    'PPCCap': critsStr.includes('ppc capacitor'),
    'ArtemisIV': critsStr.includes('artemis iv') || critsStr.includes('artemisiv'),
    'TC': critsStr.includes('targeting computer') || critsStr.includes('istargcomp') || critsStr.includes('cltargcomp'),
    'CASE': !critsStr.includes('case ii') && critsStr.includes('case'),
    'CASEII': critsStr.includes('case ii') || critsStr.includes('caseii'),
    'XL': unit.engine?.type?.includes('XL') || false,
    'XXL': unit.engine?.type?.includes('XXL') || false,
    'Clan': unit.techBase === 'CLAN',
    'Mixed': unit.techBase === 'MIXED',
    'EndoSteel': unit.structure?.type?.includes('ENDO') || false,
    'FerroFibrous': unit.armor?.type?.includes('FERRO') || false,
    'Jump>0': (unit.movement?.jump || 0) > 0,
  };

  for (const [feat, has] of Object.entries(checks)) {
    if (!has) continue;
    if (!features[feat]) features[feat] = { over: [], under: [] };
    if (isOver) features[feat].over.push(r.unitId);
    else features[feat].under.push(r.unitId);
  }
}

console.log('\n=== FEATURES IN BOUNDARY UNITS ===');
for (const [feat, data] of Object.entries(features).sort((a, b) => (b[1].over.length + b[1].under.length) - (a[1].over.length + a[1].under.length))) {
  console.log(`  ${feat.padEnd(20)} over=${data.over.length} under=${data.under.length} total=${data.over.length + data.under.length}`);
}

// List all boundary units with key stats
console.log('\n=== OVER-CALCULATED BOUNDARY UNITS (push down to fix) ===');
for (const r of over.sort((a: any, b: any) => a.percentDiff - b.percentDiff)) {
  const unit = loadUnit(r.unitId);
  const b = r.breakdown;
  console.log(`  ${r.unitId.padEnd(40)} +${r.percentDiff.toFixed(2)}% ref=${r.indexBV} calc=${r.calculatedBV} diff=+${r.difference} ${unit?.techBase} ${unit?.tonnage}t exp=${b?.explosivePenalty?.toFixed(0)} cp=${b?.cockpitModifier}`);
}

console.log('\n=== UNDER-CALCULATED BOUNDARY UNITS (push up to fix) ===');
for (const r of under.sort((a: any, b: any) => a.percentDiff - b.percentDiff)) {
  const unit = loadUnit(r.unitId);
  const b = r.breakdown;
  const critsStr = JSON.stringify(unit?.criticalSlots || {}).toLowerCase();
  const hasTC = critsStr.includes('targeting computer') || critsStr.includes('targcomp');
  console.log(`  ${r.unitId.padEnd(40)} ${r.percentDiff.toFixed(2)}% ref=${r.indexBV} calc=${r.calculatedBV} diff=${r.difference} ${unit?.techBase} ${unit?.tonnage}t exp=${b?.explosivePenalty?.toFixed(0)} TC=${hasTC} cp=${b?.cockpitModifier}`);
}

// Specific check: are there units in the 1.0-1.2% band that would flip if we changed ONE component?
console.log('\n=== WHAT WOULD FIX OVERCALCULATED BOUNDARY? ===');
for (const r of over.filter((x: any) => x.percentDiff <= 1.2).sort((a: any, b: any) => a.percentDiff - b.percentDiff)) {
  const b = r.breakdown;
  const bvGap = r.calculatedBV - r.indexBV;
  console.log(`  ${r.unitId.padEnd(40)} gap=${bvGap} — need to subtract ${bvGap} BV`);
}

console.log('\n=== WHAT WOULD FIX UNDERCALCULATED BOUNDARY? ===');
for (const r of under.filter((x: any) => x.percentDiff >= -1.2).sort((a: any, b: any) => a.percentDiff - b.percentDiff)) {
  const b = r.breakdown;
  const bvGap = r.indexBV - r.calculatedBV;
  console.log(`  ${r.unitId.padEnd(40)} gap=${bvGap} — need to add ${bvGap} BV`);
}
