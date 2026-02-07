/**
 * Trace the 20 overcalculated units that should have explosive penalties but don't.
 * Compare what our code detects vs what the unit data shows.
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
const over = valid.filter((x: any) => x.percentDiff > 1 && x.breakdown);

console.log('=== OVERCALCULATED WITH MISSING EXPLOSIVE PENALTY ===\n');
let count = 0;

for (const u of over) {
  const b = u.breakdown;
  const unit = loadUnit(u.unitId);
  if (!unit) continue;

  // Check for ammo in unprotected locations
  const ammoByLoc: Record<string, string[]> = {};
  const caseLocs: string[] = [];
  const caseIILocs: string[] = [];

  if (unit.criticalSlots) {
    for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (!s || typeof s !== 'string') continue;
        const lo = (s as string).replace(/\s*\(omnipod\)/gi, '').trim().toLowerCase();

        if (lo.includes('ammo') && !lo.includes('ams')) {
          // Check if it's "non-explosive" ammo
          const isNonExplosive = lo.includes('gauss') || lo.includes('plasma') || lo.includes('fluid') ||
            lo.includes('nail') || lo.includes('rivet') || lo.includes('c3') || lo.includes('sensor') || lo.includes('rail gun');
          if (!isNonExplosive) {
            if (!ammoByLoc[loc]) ammoByLoc[loc] = [];
            ammoByLoc[loc].push(s as string);
          }
        }
        if (lo.includes('case ii') || lo.includes('caseii') || lo.includes('iscaseii') || lo.includes('clcaseii')) {
          if (!caseIILocs.includes(loc)) caseIILocs.push(loc);
        } else if (lo.includes('case') && !lo.includes('case ii')) {
          if (!caseLocs.includes(loc)) caseLocs.push(loc);
        }
      }
    }
  }

  // Clan built-in CASE
  const hasClanCASE = unit.techBase === 'CLAN' ||
    (unit.techBase === 'MIXED' && (unit.engine?.type || '').toUpperCase().includes('CLAN'));
  if (hasClanCASE) {
    for (const loc of ['LEFT_TORSO', 'RIGHT_TORSO', 'LEFT_ARM', 'RIGHT_ARM', 'LT', 'RT', 'LA', 'RA']) {
      if (!caseLocs.includes(loc)) caseLocs.push(loc);
    }
  }

  // Find unprotected ammo locations
  const unprotectedLocs: string[] = [];
  for (const loc of Object.keys(ammoByLoc)) {
    const isTorsoLike = loc.toUpperCase().includes('TORSO') || ['LT', 'RT', 'CT'].includes(loc.toUpperCase());
    const isArmLike = loc.toUpperCase().includes('ARM') || ['LA', 'RA'].includes(loc.toUpperCase());
    const hasCaseII = caseIILocs.includes(loc);
    const hasCase = caseLocs.includes(loc);

    if (hasCaseII) continue; // CASE II always protects
    if (!hasCase) {
      unprotectedLocs.push(loc);
    } else if (isTorsoLike) {
      // CASE in torso only works if engine ST slots < 3
      const engineType = (unit.engine?.type || '').toUpperCase();
      const isLargeEngine = engineType.includes('XL') || engineType.includes('XXL');
      const isClanEngine = engineType.includes('CLAN');
      if (isLargeEngine && !isClanEngine) {
        // IS XL/XXL: CASE doesn't protect side torso
        unprotectedLocs.push(loc);
      }
    }
  }

  if (unprotectedLocs.length === 0) continue;
  if (b.explosivePenalty > 0) continue; // Already has penalty - skip

  count++;
  let totalAmmoSlots = 0;
  for (const loc of unprotectedLocs) {
    totalAmmoSlots += ammoByLoc[loc].length;
  }

  console.log(`${u.unitId.padEnd(45)} +${u.percentDiff.toFixed(1)}% diff=+${u.difference}`);
  console.log(`  tech=${unit.techBase} engine=${unit.engine?.type || '?'} expl=${b.explosivePenalty}`);
  console.log(`  CASE locs: ${JSON.stringify(caseLocs)}`);
  console.log(`  CASE II locs: ${JSON.stringify(caseIILocs)}`);
  console.log(`  Breakdown expl details: ${JSON.stringify(b.explosiveDetails || 'none')}`);
  for (const loc of unprotectedLocs) {
    console.log(`  UNPROTECTED [${loc}] (${ammoByLoc[loc].length} slots): ${ammoByLoc[loc].join(', ')}`);
  }
  console.log(`  Expected penalty if fixed: ~${totalAmmoSlots * 15} BV (${totalAmmoSlots} ammo slots * 15)`);
  console.log('');
}

console.log(`\nTotal overcalculated with missing penalty: ${count}`);
