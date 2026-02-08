/**
 * Check if explosive ammo penalty is being correctly applied.
 * Theory: overcalculated units might be missing explosive ammo penalties.
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

// Find units that have ammo but zero explosive penalty AND no CASE protection
let suspiciousCount = 0;
const suspicious: any[] = [];

for (const u of valid) {
  const b = u.breakdown;
  if (!b || b.ammoBV === 0) continue;
  if (b.explosivePenalty > 0) continue;

  const unit = loadUnit(u.unitId);
  if (!unit) continue;

  // Clan/Mixed units get built-in CASE (no penalty)
  const isClanOrMixed = unit.techBase === 'CLAN' || unit.techBase === 'MIXED';

  // Check for CASE in crit slots
  let hasCASE = isClanOrMixed;
  if (!hasCASE) {
    for (const [, slots] of Object.entries(unit.criticalSlots || {})) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (typeof s === 'string' && /case/i.test(s.replace(/\(omnipod\)/gi,'').trim())) {
          hasCASE = true;
        }
      }
    }
  }

  if (!hasCASE) {
    suspiciousCount++;
    suspicious.push({
      unitId: u.unitId,
      ammoBV: b.ammoBV,
      diff: u.percentDiff,
      techBase: unit.techBase,
    });
  }
}

console.log(`=== IS UNITS WITH AMMO, NO CASE, NO EXPLOSIVE PENALTY: ${suspiciousCount} ===\n`);
const overSusp = suspicious.filter(u => u.diff > 0).sort((a, b) => b.diff - a.diff);
const underSusp = suspicious.filter(u => u.diff < 0);
console.log(`Overcalculated: ${overSusp.length}`);
for (const u of overSusp.slice(0, 20)) {
  console.log(`  ${u.unitId.padEnd(45)} diff=${u.diff.toFixed(1).padStart(6)}% ammoBV=${u.ammoBV}`);
}
console.log(`Undercalculated: ${underSusp.length}`);

// Check explosive penalty distribution
console.log(`\n=== EXPLOSIVE PENALTY DISTRIBUTION (all units) ===`);
const bands: Record<string, {count: number, avgDiff: number}> = {};
for (const u of valid) {
  const pen = u.breakdown?.explosivePenalty || 0;
  const band = pen === 0 ? '0' : pen <= 15 ? '1-15' : pen <= 30 ? '16-30' : pen <= 60 ? '31-60' : pen <= 120 ? '61-120' : '121+';
  if (!bands[band]) bands[band] = {count: 0, avgDiff: 0};
  bands[band].count++;
  bands[band].avgDiff += u.percentDiff;
}
for (const [band, data] of Object.entries(bands)) {
  console.log(`  pen=${band.padEnd(8)}: ${String(data.count).padStart(5)} units, avgDiff=${(data.avgDiff/data.count).toFixed(2)}%`);
}

// For the most overcalculated units, check explosive situation
console.log(`\n=== OVERCALCULATED >5% WITH AMMO ===`);
const bigOver = valid.filter((x: any) => x.percentDiff > 5 && x.breakdown?.ammoBV > 0);
for (const u of bigOver.sort((a: any, b: any) => b.percentDiff - a.percentDiff).slice(0, 15)) {
  const b = u.breakdown;
  const unit = loadUnit(u.unitId);
  const hasCASEInCrits = (() => {
    for (const [loc, slots] of Object.entries(unit?.criticalSlots || {})) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (typeof s === 'string' && /case/i.test(s)) return `${loc}`;
      }
    }
    return 'none';
  })();
  console.log(`  ${u.unitId.padEnd(45)} diff=${u.percentDiff.toFixed(1)}% ammoBV=${b.ammoBV} expPen=${b.explosivePenalty?.toFixed(0)} CASE=${hasCASEInCrits} tech=${unit?.techBase}`);
}
