/**
 * Check if "1-" prefix equipment IDs resolve correctly.
 * Compare accuracy of prefix vs non-prefix units.
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

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);

// Split into prefix and non-prefix units
const prefixUnits: any[] = [];
const nonPrefixUnits: any[] = [];

for (const u of valid) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const hasPrefix = (unit.equipment || []).some((e: any) => /^\d+-/.test(e.id));
  if (hasPrefix) prefixUnits.push(u);
  else nonPrefixUnits.push(u);
}

function stats(arr: any[]): { within1: number, within2: number, avgDiff: number, avgAbsDiff: number } {
  const w1 = arr.filter(u => Math.abs(u.percentDiff) <= 1).length;
  const w2 = arr.filter(u => Math.abs(u.percentDiff) <= 2).length;
  const avg = arr.reduce((s, u) => s + u.percentDiff, 0) / arr.length;
  const avgAbs = arr.reduce((s, u) => s + Math.abs(u.percentDiff), 0) / arr.length;
  return { within1: w1, within2: w2, avgDiff: avg, avgAbsDiff: avgAbs };
}

const pStats = stats(prefixUnits);
const nStats = stats(nonPrefixUnits);

console.log(`=== PREFIX vs NON-PREFIX ACCURACY ===`);
console.log(`Prefix units: ${prefixUnits.length}`);
console.log(`  Within 1%: ${pStats.within1} (${(pStats.within1/prefixUnits.length*100).toFixed(1)}%)`);
console.log(`  Within 2%: ${pStats.within2} (${(pStats.within2/prefixUnits.length*100).toFixed(1)}%)`);
console.log(`  Avg diff: ${pStats.avgDiff.toFixed(2)}%, avg abs: ${pStats.avgAbsDiff.toFixed(2)}%`);

console.log(`Non-prefix units: ${nonPrefixUnits.length}`);
console.log(`  Within 1%: ${nStats.within1} (${(nStats.within1/nonPrefixUnits.length*100).toFixed(1)}%)`);
console.log(`  Within 2%: ${nStats.within2} (${(nStats.within2/nonPrefixUnits.length*100).toFixed(1)}%)`);
console.log(`  Avg diff: ${nStats.avgDiff.toFixed(2)}%, avg abs: ${nStats.avgAbsDiff.toFixed(2)}%`);

// Check outlier distribution
const prefixOutliers = prefixUnits.filter(u => Math.abs(u.percentDiff) > 1);
console.log(`\nPrefix outliers (>1%): ${prefixOutliers.length} (${(prefixOutliers.length/prefixUnits.length*100).toFixed(1)}%)`);
const prefixOver = prefixOutliers.filter(u => u.percentDiff > 0);
const prefixUnder = prefixOutliers.filter(u => u.percentDiff < 0);
console.log(`  Over: ${prefixOver.length}, Under: ${prefixUnder.length}`);

// Show top prefix outliers
console.log('\nTop prefix outliers:');
for (const u of prefixOutliers.sort((a: any, b: any) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff)).slice(0, 15)) {
  const unit = loadUnit(u.unitId);
  const eqs = (unit?.equipment || []).filter((e: any) => /^\d+-/.test(e.id)).map((e: any) => e.id);
  console.log(`  ${u.unitId.padEnd(45)} ${u.percentDiff.toFixed(1).padStart(6)}%  prefixed: ${eqs.slice(0,3).join(', ')}${eqs.length > 3 ? '...' : ''}`);
}

// Check: do prefix IDs get the "1-" stripped during normalization?
// Sample some prefix weapon IDs and see if they resolve to known weapons
console.log('\n--- SAMPLE PREFIX IDS ---');
const samplePrefixIds = new Set<string>();
for (const u of prefixUnits.slice(0, 50)) {
  const unit = loadUnit(u.unitId);
  for (const e of (unit?.equipment || [])) {
    if (/^\d+-/.test(e.id)) samplePrefixIds.add(e.id);
  }
}
for (const id of [...samplePrefixIds].slice(0, 30)) {
  // Strip prefix and show
  const stripped = id.replace(/^\d+-/, '');
  console.log(`  ${id.padEnd(40)} → ${stripped}`);
}
