/**
 * Find units that are undercalculated AND have ammoBV=0 in breakdown
 * despite having ammo-using weapons. These are the true ammo gaps.
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

// Find undercalculated units with ammoBV=0 that have ammo in crits
const ammoGaps: any[] = [];

for (const u of valid) {
  if (u.percentDiff >= -0.5) continue; // only look at undercalculated units
  const b = u.breakdown;
  if (!b || b.ammoBV > 0) continue; // skip if ammo already resolved

  const unit = loadUnit(u.unitId);
  if (!unit?.criticalSlots) continue;

  // Check for ammo entries in crits
  const ammoEntries: string[] = [];
  for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots as string[]) {
      if (s && s.toLowerCase().includes('ammo') && !s.toLowerCase().includes('ammo feed')) {
        ammoEntries.push(`${loc}:${s}`);
      }
    }
  }

  if (ammoEntries.length === 0) continue;

  ammoGaps.push({
    id: u.unitId,
    pctDiff: u.percentDiff,
    diff: u.difference,
    weaponBV: b.weaponBV,
    ammoEntries,
  });
}

console.log(`=== UNDERCALCULATED UNITS WITH ammoBV=0 BUT AMMO IN CRITS (${ammoGaps.length}) ===\n`);
ammoGaps.sort((a, b) => a.pctDiff - b.pctDiff);
for (const g of ammoGaps) {
  console.log(`${g.id} (${g.pctDiff.toFixed(1)}%, diff=${g.diff}, weapBV=${g.weaponBV?.toFixed(0)})`);
  for (const a of g.ammoEntries) console.log(`    ${a}`);
}

// Also check: units with ammoBV > 0 but still significantly undercalculated
// These might have SOME ammo resolving but not all
console.log('\n\n=== UNDERCALCULATED >2% WITH PARTIAL AMMO (ammoBV > 0 but low) ===\n');
const partialAmmo: any[] = [];
for (const u of valid) {
  if (u.percentDiff >= -2) continue;
  const b = u.breakdown;
  if (!b || b.ammoBV <= 0) continue;

  const unit = loadUnit(u.unitId);
  if (!unit?.criticalSlots) continue;

  let ammoCount = 0;
  for (const [, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots as string[]) {
      if (s && s.toLowerCase().includes('ammo') && !s.toLowerCase().includes('ammo feed')) ammoCount++;
    }
  }

  // If they have lots of ammo but relatively low ammoBV, some might not be resolving
  if (ammoCount > 0) {
    partialAmmo.push({
      id: u.unitId,
      pctDiff: u.percentDiff,
      ammoBV: b.ammoBV,
      ammoCount,
      bvPerAmmo: (b.ammoBV / ammoCount).toFixed(1),
    });
  }
}
partialAmmo.sort((a, b) => a.pctDiff - b.pctDiff);
for (const p of partialAmmo.slice(0, 30)) {
  console.log(`  ${p.id.padEnd(42)} ${p.pctDiff.toFixed(1)}% ammoBV=${p.ammoBV} ammoSlots=${p.ammoCount} bv/slot=${p.bvPerAmmo}`);
}
