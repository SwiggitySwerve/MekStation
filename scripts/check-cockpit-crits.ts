import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Check if there's a constant offset per unit that correlates with something
// Try: for all within-1% units, compute what raw offensive BV should be
// rawOff = weaponBV + ammoBV + physicalBV + weightBonus + offEquipBV
// Our rawOff = offBV / SF
// Need to find if there's a systematic additive offset

// Look at a set of CLEAN units (no special equipment, no ammo, no explosives)
// where we can cleanly compute the expected offensive BV

const cleanUnits: any[] = [];

for (const r of report.allResults) {
  const b = r.breakdown;
  if (!b || r.status === 'error') continue;

  const entry = index.units.find((u: any) => u.id === r.unitId);
  if (!entry?.path) continue;

  try {
    const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));

    // Filter for clean units: standard engine, no TSM, no MASC, no ammo
    if (u.engine.type !== 'FUSION' && u.engine.type !== 'CLAN_XL' && u.engine.type !== 'XL' && u.engine.type !== 'LIGHT') continue;
    if (b.ammoBV !== 0) continue;
    if (b.explosivePenalty > 0) continue;
    if (b.defensiveEquipBV > 0) continue;
    if (Math.abs(r.percentDiff) > 5) continue;

    // Compute raw offensive
    const rawOff = b.offensiveBV / b.speedFactor;
    // Expected raw: weaponBV + tonnage (weight bonus, no TSM)
    const expectedRaw = b.weaponBV + u.tonnage;
    const delta = rawOff - expectedRaw;

    // What MegaMek expects
    const neededOff = r.indexBV - b.defensiveBV;
    const neededRaw = neededOff / b.speedFactor;
    const neededDelta = neededRaw - expectedRaw;

    if (Math.abs(r.percentDiff) < 3) {
      cleanUnits.push({
        id: r.unitId,
        tonnage: u.tonnage,
        techBase: u.techBase,
        engine: u.engine.type,
        weaponBV: b.weaponBV,
        rawOff,
        expectedRaw,
        ourDelta: delta,
        neededRaw,
        megamekDelta: neededDelta,
        gap: r.difference,
        pctDiff: r.percentDiff,
        sf: b.speedFactor,
      });
    }
  } catch {}
}

console.log(`Clean units (no ammo, no defEquip, no explosive): ${cleanUnits.length}`);

// Show the delta (raw offensive - (weaponBV + tonnage))
// If our delta is ~0 and MegaMek's delta is positive, we're missing something
console.log('\n=== OUR DELTA vs MEGAMEK DELTA ===');
console.log('Our delta = rawOff - (weaponBV + tonnage) -- should be ~0 if no physical/offEquip');
console.log('MegaMek delta = neededRaw - (weaponBV + tonnage) -- what MegaMek adds extra\n');

// Sort by MegaMek delta
cleanUnits.sort((a, b) => b.megamekDelta - a.megamekDelta);

console.log('Unit'.padEnd(45) + ' Ton  TB      Engine    wBV   ourΔ   mmΔ    gap  pct%');
for (const u of cleanUnits.slice(0, 30)) {
  console.log(
    `${u.id.padEnd(45)} ${String(u.tonnage).padStart(3)}  ${u.techBase.padEnd(7)} ${u.engine.padEnd(9)} ${String(u.weaponBV).padStart(5)} ${u.ourDelta.toFixed(1).padStart(6)} ${u.megamekDelta.toFixed(1).padStart(6)} ${String(u.gap).padStart(6)} ${u.pctDiff.toFixed(2).padStart(6)}%`
  );
}

// Average MegaMek delta
const avgMmDelta = cleanUnits.reduce((s, u) => s + u.megamekDelta, 0) / cleanUnits.length;
const avgOurDelta = cleanUnits.reduce((s, u) => s + u.ourDelta, 0) / cleanUnits.length;
console.log(`\nAvg our delta: ${avgOurDelta.toFixed(2)}`);
console.log(`Avg MegaMek delta: ${avgMmDelta.toFixed(2)}`);
console.log(`Difference: ${(avgMmDelta - avgOurDelta).toFixed(2)}`);

// Check if MegaMek delta correlates with tonnage
console.log('\n=== MEGAMEK DELTA by TONNAGE ===');
const byTon: Record<number, number[]> = {};
for (const u of cleanUnits) {
  if (!byTon[u.tonnage]) byTon[u.tonnage] = [];
  byTon[u.tonnage].push(u.megamekDelta);
}
for (const [ton, deltas] of Object.entries(byTon).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  const avg = deltas.reduce((s, d) => s + d, 0) / deltas.length;
  if (deltas.length >= 2) {
    console.log(`  ${ton}t: n=${String(deltas.length).padStart(3)} avgΔ=${avg.toFixed(1).padStart(6)}`);
  }
}
