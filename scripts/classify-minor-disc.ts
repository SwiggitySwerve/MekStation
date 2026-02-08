import * as fs from 'fs';
import * as path from 'path';

const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = 'public/data/units/battlemechs';
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Focus on minor discrepancies (1-5%) that are undercalculated
const minor = r.allResults.filter((x: any) => x.percentDiff < -1 && x.percentDiff > -5 && x.breakdown);

console.log(`Minor undercalculated units: ${minor.length}\n`);

// For each, classify the likely source of the gap
let explainedByExplosive = 0;
let explainedByWeapon = 0;
let unexplained = 0;
const unexplainedUnits: any[] = [];

for (const res of minor) {
  const b = res.breakdown;
  const entry = index.units.find((e: any) => e.id === res.unitId);
  if (!entry?.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));

    // Check offensive gap
    const rawOff = b.offensiveBV / b.speedFactor;
    const expectedRawOff = b.weaponBV + b.ammoBV + d.tonnage;
    const offGapPct = Math.abs(rawOff - expectedRawOff) / Math.max(1, expectedRawOff);

    // Check if gap ≈ explosive penalty
    let cockpitMod = 1.0;
    const cockpit = (d.cockpit || 'STANDARD').toUpperCase();
    if (cockpit.includes('SMALL') || cockpit.includes('TORSO')) cockpitMod = 0.95;
    if (cockpit.includes('INTERFACE')) cockpitMod = 1.3;

    const neededBaseBV = res.indexBV / cockpitMod;
    const neededDefBV = neededBaseBV - b.offensiveBV;
    const neededBaseDef = neededDefBV / b.defensiveFactor;
    const baseDef = b.armorBV + b.structureBV + b.gyroBV + b.defensiveEquipBV - b.explosivePenalty;
    const gap = neededBaseDef - baseDef;

    if (offGapPct >= 0.02) {
      explainedByWeapon++;
    } else if (b.explosivePenalty > 0 && Math.abs(gap - b.explosivePenalty) < 5) {
      explainedByExplosive++;
    } else {
      unexplained++;
      unexplainedUnits.push({
        unitId: res.unitId,
        tonnage: d.tonnage,
        techBase: d.techBase,
        engine: d.engine.type,
        diff: res.difference,
        pct: res.percentDiff,
        gap,
        penalty: b.explosivePenalty,
      });
    }
  } catch {}
}

console.log(`Classified:`);
console.log(`  Weapon resolution gap: ${explainedByWeapon}`);
console.log(`  Explosive penalty explains gap: ${explainedByExplosive}`);
console.log(`  Unexplained: ${unexplained}`);

// Analyze the unexplained units
console.log(`\nUnexplained units by techBase:`);
const byTech: Record<string, number> = {};
for (const u of unexplainedUnits) {
  byTech[u.techBase] = (byTech[u.techBase] || 0) + 1;
}
for (const [t, n] of Object.entries(byTech).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${t}: ${n}`);
}

// Show 15 sample unexplained units
console.log(`\nSample unexplained units:`);
for (const u of unexplainedUnits.slice(0, 15)) {
  console.log(`  ${u.unitId}: ${u.tonnage}t ${u.techBase} ${u.engine} diff=${u.diff} (${u.pct.toFixed(1)}%) gap=${u.gap.toFixed(1)} pen=${u.penalty}`);
}

// Now do the same for minor OVER-calculated units
const overMinor = r.allResults.filter((x: any) => x.percentDiff > 1 && x.percentDiff < 5 && x.breakdown);
console.log(`\n\nMinor overcalculated units: ${overMinor.length}`);

let overExplPenalty = 0;
let overExplWeapon = 0;
let overUnexplained = 0;
const overUnits: any[] = [];

for (const res of overMinor) {
  const b = res.breakdown;
  const entry = index.units.find((e: any) => e.id === res.unitId);
  if (!entry?.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));

    // Overcalculated: our BV is too HIGH.
    // Possible causes: extra penalty being applied when it shouldn't (would LOWER our BV → no)
    // Actually: overcalculation means calc > index, so our BV is too high.
    // This means defensive + offensive is too high.
    // If penalty is wrongly applied, defBV is LOWER → calc is LOWER → undercalculation, not over.
    // So overcalculation is NOT from penalties.

    // Overcalculation sources:
    // - Weapon BV resolved too high
    // - Defensive equipment BV too high
    // - Wrong speed factor (too high)
    // - Ammo BV too high
    // - Wrong cockpit modifier (should be >1.0 but using 1.0)

    // Check if it has penalties that SHOULDN'T be there (which would mean our calc is LOWER, so removing them would make it HIGHER → more overcalculated. That's opposite of what we want.)

    // Actually, for overcalculated units, we want to check if we're MISSING penalties.
    // If we should have penalties but don't, our defBV would be too high → overcalculation.

    const allSlots: string[] = [];
    for (const [, slots] of Object.entries(d.criticalSlots || {})) {
      for (const s of (slots as (string | null)[])) {
        if (s && typeof s === 'string') allSlots.push(s.toLowerCase());
      }
    }

    // Check for ammo in locations without CASE
    const hasUncasedAmmo = allSlots.some(s => s.includes('ammo') && !s.includes('gauss'));

    overUnits.push({
      unitId: res.unitId,
      tonnage: d.tonnage,
      techBase: d.techBase,
      engine: d.engine.type,
      diff: res.difference,
      pct: res.percentDiff,
      penalty: b.explosivePenalty,
      defEquip: b.defensiveEquipBV,
      hasAmmo: hasUncasedAmmo,
    });
    overUnexplained++;
  } catch {}
}

console.log(`\nOvercalculated by techBase:`);
const overByTech: Record<string, number> = {};
for (const u of overUnits) {
  overByTech[u.techBase] = (overByTech[u.techBase] || 0) + 1;
}
for (const [t, n] of Object.entries(overByTech).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${t}: ${n}`);
}

// Check: how many overcalculated units have explPenalty=0 AND hasAmmo? (might need penalty)
const needsPenalty = overUnits.filter(u => u.penalty === 0 && u.hasAmmo);
console.log(`\nOvercalculated with penalty=0 but has ammo: ${needsPenalty.length}`);
for (const u of needsPenalty.slice(0, 10)) {
  console.log(`  ${u.unitId}: ${u.techBase} diff=+${u.diff} (${u.pct.toFixed(1)}%)`);
}
