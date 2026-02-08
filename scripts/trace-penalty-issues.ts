import * as fs from 'fs';
import * as path from 'path';

const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = 'public/data/units/battlemechs';
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// 1. Check overcalculated units with ammo but no penalty
console.log('=== OVERCALCULATED units with ammo but penalty=0 ===');
console.log('(These might be MISSING penalties)\n');

const overMinor = r.allResults.filter((x: any) => x.percentDiff > 1 && x.percentDiff < 5 && x.breakdown);

for (const res of overMinor) {
  const b = res.breakdown;
  if (b.explosivePenalty > 0) continue;

  const entry = index.units.find((e: any) => e.id === res.unitId);
  if (!entry?.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));

    // Check for ammo in crit slots
    const ammoByLoc: Record<string, string[]> = {};
    const caseByLoc: Record<string, string> = {};
    for (const [loc, slots] of Object.entries(d.criticalSlots || {})) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (!s || typeof s !== 'string') continue;
        const lo = s.toLowerCase();
        if (lo.includes('ammo') && !lo.includes('gauss') && !lo.includes('plasma') && !lo.includes('fluid') && !lo.includes('nail') && !lo.includes('sensor')) {
          if (!ammoByLoc[loc]) ammoByLoc[loc] = [];
          ammoByLoc[loc].push(s);
        }
        if (lo.includes('case ii') || lo.includes('caseii') || lo.includes('iscaseii') || lo.includes('clcaseii')) {
          caseByLoc[loc] = 'CASE_II';
        } else if ((lo.includes('case') || lo.includes('iscase') || lo.includes('clcase')) && !lo.includes('case ii')) {
          if (!caseByLoc[loc]) caseByLoc[loc] = 'CASE';
        }
      }
    }

    const hasAmmo = Object.keys(ammoByLoc).length > 0;
    if (!hasAmmo) continue;

    // Check if ammo is in unprotected locations
    const unprotectedAmmo: string[] = [];
    for (const [loc, ammos] of Object.entries(ammoByLoc)) {
      const hasCase = caseByLoc[loc] || (d.techBase === 'CLAN' && (loc.includes('TORSO') || loc.includes('LT') || loc.includes('RT')));
      if (!hasCase) {
        unprotectedAmmo.push(`${loc}: ${ammos.length} ammo slots (NO CASE)`);
      }
    }

    if (unprotectedAmmo.length > 0) {
      console.log(`${res.unitId}: ${d.tonnage}t ${d.techBase} ${d.engine.type} diff=+${res.difference} (${res.percentDiff.toFixed(1)}%)`);
      for (const ua of unprotectedAmmo) console.log(`  ${ua}`);
      console.log(`  CASE locs: ${JSON.stringify(caseByLoc)}`);
      console.log();
    }
  } catch {}
}

// 2. Check undercalculated units where gap ≈ penalty
console.log('\n=== UNDERCALCULATED units where gap ≈ penalty ===');
console.log('(Penalty might be over-applied due to CASE not detected)\n');

const minorUnder = r.allResults.filter((x: any) => x.percentDiff < -1 && x.percentDiff > -5 && x.breakdown);

for (const res of minorUnder) {
  const b = res.breakdown;
  if (b.explosivePenalty === 0) continue;

  const entry = index.units.find((e: any) => e.id === res.unitId);
  if (!entry?.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));

    let cockpitMod = 1.0;
    const cockpit = (d.cockpit || 'STANDARD').toUpperCase();
    if (cockpit.includes('SMALL') || cockpit.includes('TORSO')) cockpitMod = 0.95;
    if (cockpit.includes('INTERFACE')) cockpitMod = 1.3;

    const neededBaseBV = res.indexBV / cockpitMod;
    const neededDefBV = neededBaseBV - b.offensiveBV;
    const neededBaseDef = neededDefBV / b.defensiveFactor;
    const baseDef = b.armorBV + b.structureBV + b.gyroBV + b.defensiveEquipBV - b.explosivePenalty;
    const gap = neededBaseDef - baseDef;

    // Check if gap ≈ penalty (removing penalty would fix it)
    if (Math.abs(gap - b.explosivePenalty) >= 5) continue;

    // What CASE is in this unit?
    const caseByLoc: Record<string, string> = {};
    for (const [loc, slots] of Object.entries(d.criticalSlots || {})) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (!s || typeof s !== 'string') continue;
        const lo = s.toLowerCase();
        if (lo.includes('case ii') || lo.includes('caseii')) caseByLoc[loc] = 'CASE_II';
        else if (lo.includes('case') && !caseByLoc[loc]) caseByLoc[loc] = 'CASE';
      }
    }

    console.log(`${res.unitId}: ${d.tonnage}t ${d.techBase} ${d.engine.type} diff=${res.difference} (${res.percentDiff.toFixed(1)}%)`);
    console.log(`  gap=${gap.toFixed(1)} penalty=${b.explosivePenalty} (gap-penalty=${(gap - b.explosivePenalty).toFixed(1)})`);
    console.log(`  CASE in crits: ${JSON.stringify(caseByLoc)}`);
    console.log();
  } catch {}
}
