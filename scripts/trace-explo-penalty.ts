/**
 * Check units with ammo but zero explosive penalty.
 * These should have penalties unless they have CASE/CASE II.
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

// Find units that have ammo but zero explosive penalty AND are overcalculated
const suspects = valid.filter((x: any) => {
  const b = x.breakdown;
  return b.explosivePenalty === 0 && b.ammoBV > 5 && x.percentDiff > 1;
});

console.log(`=== OVERCALCULATED WITH AMMO BUT NO EXPLOSIVE PENALTY (${suspects.length} units) ===\n`);

let isCount = 0, clanCount = 0, mixedCount = 0;
let totalExcess = 0;

for (const u of suspects.sort((a: any, b: any) => b.percentDiff - a.percentDiff)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;

  // Check if unit has CASE
  let hasCASE = false;
  let caseLocs: string[] = [];
  let ammoLocs: string[] = [];
  const isClan = unit.techBase === 'CLAN';
  const isMixed = unit.techBase === 'MIXED';

  if (unit.criticalSlots) {
    for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      let locHasCase = false;
      let locHasAmmo = false;
      for (const s of slots as string[]) {
        if (!s) continue;
        const lo = s.toLowerCase();
        if (lo.includes('case') && !lo.includes('ammo')) { locHasCase = true; caseLocs.push(loc); }
        if (lo.includes('ammo') && !lo.includes('case') && !lo.includes('ammo feed')) {
          // Check if ammo is non-explosive (gauss, plasma, etc.)
          const isNonExplosive = lo.includes('gauss') || lo.includes('plasma') || lo.includes('fluid') || lo.includes('nail') || lo.includes('rivet');
          if (!isNonExplosive) { locHasAmmo = true; ammoLocs.push(`${loc}:${s.replace(/\s*\(omnipod\)/gi, '').trim()}`); }
        }
      }
    }
  }

  if (unit.techBase === 'INNER_SPHERE') isCount++;
  else if (unit.techBase === 'CLAN') clanCount++;
  else mixedCount++;

  totalExcess += u.difference;

  console.log(`${u.unitId.padEnd(45)} +${u.percentDiff.toFixed(1)}% diff=${u.difference} tech=${unit.techBase} ammoBV=${b.ammoBV} expPen=${b.explosivePenalty}`);
  console.log(`  CASE locs: ${caseLocs.length > 0 ? [...new Set(caseLocs)].join(', ') : 'NONE'}`);
  console.log(`  Ammo locs: ${[...new Set(ammoLocs)].join(', ')}`);
  console.log('');
}

console.log(`Total: IS=${isCount} Clan=${clanCount} Mixed=${mixedCount}`);
console.log(`Total excess BV: ${totalExcess}`);

// Also check: how many overcalculated units have CORRECT explosive penalties?
const overWithPenalty = valid.filter((x: any) => x.breakdown.explosivePenalty > 0 && x.percentDiff > 1);
console.log(`\nOvercalculated with explosive penalty > 0: ${overWithPenalty.length}`);
const overNoPenalty = valid.filter((x: any) => x.breakdown.explosivePenalty === 0 && x.percentDiff > 1 && x.breakdown.ammoBV > 5);
console.log(`Overcalculated with ammo but no penalty: ${overNoPenalty.length}`);
