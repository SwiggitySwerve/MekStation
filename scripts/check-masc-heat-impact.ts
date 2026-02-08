/**
 * Check how MASC/SC heat change affects BV accuracy.
 * Compare units with MASC/SC in the validation report.
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

// Find all units where the breakdown shows MASC or SC
let mascCount = 0;
let scCount = 0;
let mascWithin1 = 0;
let mascOutside1 = 0;
let mascOvercalc = 0;
let mascUndercalc = 0;

for (const u of valid) {
  const b = u.breakdown;
  if (!b) continue;
  const unit = loadUnit(u.unitId);
  if (!unit) continue;

  // Check crits for MASC/SC
  let hasMASC = false;
  let hasSC = false;
  if (unit.criticalSlots) {
    for (const slots of Object.values(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (!s || typeof s !== 'string') continue;
        const lo = (s as string).replace(/\s*\(omnipod\)/gi, '').trim().toLowerCase();
        if (lo.includes('masc') && !lo.includes('ammo')) hasMASC = true;
        if (lo.includes('supercharger') || lo.includes('super charger')) hasSC = true;
      }
    }
  }

  if (!hasMASC && !hasSC) continue;

  if (hasMASC) mascCount++;
  if (hasSC) scCount++;

  const pct = Math.abs(u.percentDiff);
  if (pct <= 1) mascWithin1++;
  else mascOutside1++;

  if (u.percentDiff > 1) mascOvercalc++;
  else if (u.percentDiff < -1) mascUndercalc++;

  // Show detailed breakdown for MASC/SC units outside 1%
  if (pct > 1) {
    const walk = unit.movement?.walk || 0;
    const normalRun = Math.ceil(walk * 1.5);
    console.log(`${u.unitId.padEnd(45)} ${u.percentDiff > 0 ? '+' : ''}${u.percentDiff.toFixed(1)}% walk=${walk} run=${b.runMP} normalRun=${normalRun} MASC=${hasMASC} SC=${hasSC} HE=${b.heatEfficiency} SF=${b.speedFactor}`);
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Units with MASC: ${mascCount}`);
console.log(`Units with SC: ${scCount}`);
console.log(`Within 1%: ${mascWithin1}`);
console.log(`Outside 1%: ${mascOutside1}`);
console.log(`  Overcalculated: ${mascOvercalc}`);
console.log(`  Undercalculated: ${mascUndercalc}`);
