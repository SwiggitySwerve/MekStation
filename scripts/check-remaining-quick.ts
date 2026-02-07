/**
 * Quick check remaining outliers for fixable patterns.
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
const outliers = valid.filter((x: any) => Math.abs(x.percentDiff) > 1);

console.log(`Remaining outliers: ${outliers.length}`);

// Check: units with offEquipBV still > 0
const withOffEq = outliers.filter((x: any) => (x.breakdown?.offEquipBV || 0) > 0);
console.log(`\nOutliers with offEquipBV > 0: ${withOffEq.length}`);

// Break down by specific features
const features: Record<string, { total: number, outlier: number, over: number, under: number, avgDiff: number }> = {};

for (const r of valid) {
  const unit = loadUnit(r.unitId);
  if (!unit?.criticalSlots) continue;
  const b = r.breakdown;
  const isOutlier = Math.abs(r.percentDiff) > 1;
  const isOver = r.percentDiff > 1;
  const isUnder = r.percentDiff < -1;

  // Check specific features
  const critsStr = JSON.stringify(unit.criticalSlots).toLowerCase();

  const checks: Record<string, boolean> = {
    'TSEMP': critsStr.includes('tsemp'),
    'BlueShield': critsStr.includes('blue shield') || critsStr.includes('blueshield'),
    'C3i': critsStr.includes('c3i') || critsStr.includes('improved c3') || critsStr.includes('c3 computer'),
    'C3master': critsStr.includes('c3 master') || critsStr.includes('c3master'),
    'C3slave': critsStr.includes('c3 slave') || critsStr.includes('c3slave') || critsStr.includes('isc3boostedslaveunit'),
    'ArtemisIV': b?.weapons?.some?.((w: any) => w.artemisType === 'iv') || critsStr.includes('artemis iv'),
    'ArtemisV': b?.weapons?.some?.((w: any) => w.artemisType === 'v') || critsStr.includes('artemis v'),
    'Apollo': critsStr.includes('apollo'),
    'PPCCapacitor': critsStr.includes('ppc capacitor') || critsStr.includes('ppccapacitor'),
    'RotaryAC': critsStr.includes('rotary') || critsStr.includes('clrotaryac'),
    'HAG': critsStr.includes('hag'),
    'HeavyLaser': critsStr.includes('heavy laser') || critsStr.includes('heavylaser'),
    'MRM': critsStr.includes('mrm'),
    'Streak': critsStr.includes('streak'),
    'UltraAC': critsStr.includes('ultra') || critsStr.includes('ultraac'),
    'LBX': critsStr.includes('lbx') || critsStr.includes('lb '),
    'RAC': critsStr.includes('rotaryac') || critsStr.includes('rotary ac'),
  };

  for (const [feat, has] of Object.entries(checks)) {
    if (!has) continue;
    if (!features[feat]) features[feat] = { total: 0, outlier: 0, over: 0, under: 0, avgDiff: 0 };
    features[feat].total++;
    features[feat].avgDiff += r.percentDiff;
    if (isOutlier) {
      features[feat].outlier++;
      if (isOver) features[feat].over++;
      if (isUnder) features[feat].under++;
    }
  }
}

console.log('\n=== FEATURE OUTLIER RATES ===');
for (const [feat, data] of Object.entries(features).sort((a, b) => (b[1].outlier/b[1].total) - (a[1].outlier/a[1].total))) {
  if (data.total < 5) continue;
  const rate = (data.outlier / data.total * 100).toFixed(1);
  const avgDiff = (data.avgDiff / data.total).toFixed(2);
  console.log(`  ${feat.padEnd(15)} total=${data.total.toString().padStart(4)} outlier=${data.outlier.toString().padStart(3)} (${rate.padStart(5)}%) over=${data.over} under=${data.under} avgDiff=${avgDiff}%`);
}

// Check: are there units near the 1% boundary that might flip?
console.log('\n=== NEAR-BOUNDARY UNITS (0.9-1.1%) ===');
const nearBound = valid.filter((x: any) => Math.abs(x.percentDiff) >= 0.9 && Math.abs(x.percentDiff) <= 1.1);
console.log(`Units at 0.9-1.1%: ${nearBound.length}`);
const justOver = valid.filter((x: any) => Math.abs(x.percentDiff) > 1 && Math.abs(x.percentDiff) <= 1.2);
console.log(`Just over 1% (1.0-1.2%): ${justOver.length}`);

// Show what a generic 0.5% BV shift would do
console.log('\n=== SENSITIVITY ANALYSIS ===');
for (const shift of [0.3, 0.5, 0.7, 1.0]) {
  let improved = 0;
  for (const r of valid) {
    const newDiff = r.percentDiff - shift; // shift everything DOWN by X%
    if (Math.abs(r.percentDiff) > 1 && Math.abs(newDiff) <= 1) improved++;
    if (Math.abs(r.percentDiff) <= 1 && Math.abs(newDiff) > 1) improved--;
  }
  console.log(`  Shifting all BV down by ${shift}%: net ${improved} units gained`);
}

// Check: Cockpit modifier = 0.95 remaining outlier impact
const cock095Outliers = outliers.filter((x: any) => x.breakdown?.cockpitModifier === 0.95);
console.log(`\nCockpit=0.95 outliers remaining: ${cock095Outliers.length}`);
const cock095Over = cock095Outliers.filter((x: any) => x.percentDiff > 0).length;
const cock095Under = cock095Outliers.filter((x: any) => x.percentDiff < 0).length;
console.log(`  Over: ${cock095Over}, Under: ${cock095Under}`);
