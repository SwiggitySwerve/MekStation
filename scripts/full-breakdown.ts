/**
 * Show complete BV breakdown for top undercalculated units
 * to identify exactly which component has the gap.
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Get ALL units with gap > 1%
const wrong = report.allResults
  .filter((r: any) => r.status !== 'error' && r.percentDiff !== null && Math.abs(r.percentDiff) > 1)
  .sort((a: any, b: any) => a.percentDiff - b.percentDiff);

// Show complete breakdowns for top 15 undercalculated
console.log('=== TOP 15 UNDERCALCULATED - FULL BREAKDOWN ===');
for (const u of wrong.filter((x: any) => x.percentDiff < 0).slice(0, 15)) {
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (!ie?.path) continue;
  const unit = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
  const b = u.breakdown;
  if (!b) { console.log(`\n${u.unitId}: NO BREAKDOWN`); continue; }

  console.log(`\n${u.unitId} (${unit.techBase}, ${unit.tonnage}t)`);
  console.log(`  Reference BV: ${u.referenceBV}, Calculated: ${u.calculatedBV}, Gap: ${u.difference} (${u.percentDiff?.toFixed(1)}%)`);
  console.log(`  --- DEFENSIVE ---`);
  console.log(`    armorBV: ${b.armorBV}`);
  console.log(`    structureBV: ${b.structureBV}`);
  console.log(`    gyroBV: ${b.gyroBV}`);
  console.log(`    defEquipBV: ${b.defEquipBV ?? 0}`);
  console.log(`    explosivePenalty: ${b.explosivePenalty ?? 0}`);
  console.log(`    defensiveFactor: ${b.defensiveFactor}`);
  console.log(`    totalDefensiveBV: ${b.defensiveBV}`);
  console.log(`  --- OFFENSIVE ---`);
  console.log(`    weaponBV: ${b.weaponBV}`);
  console.log(`    ammoBV: ${b.ammoBV}`);
  console.log(`    weightBonus: ${b.weightBonus ?? '?'}`);
  console.log(`    offEquipBV: ${b.offEquipBV ?? 0}`);
  console.log(`    physicalWeaponBV: ${b.physicalWeaponBV ?? 0}`);
  console.log(`    speedFactor: ${b.speedFactor}`);
  console.log(`    totalOffensiveBV: ${b.offensiveBV}`);
  console.log(`  --- MODIFIERS ---`);
  console.log(`    cockpitModifier: ${b.cockpitModifier ?? 1.0}`);
  console.log(`  --- COMPUTED ---`);
  const defBV = b.defensiveBV;
  const offBV = b.offensiveBV;
  const cockpit = b.cockpitModifier ?? 1.0;
  const total = Math.round((defBV + offBV) * cockpit);
  console.log(`    (def + off) * cockpit = (${defBV} + ${offBV}) * ${cockpit} = ${total}`);
  console.log(`    Actual calculated: ${u.calculatedBV}`);
  const gapFromFormula = u.calculatedBV - total;
  if (Math.abs(gapFromFormula) > 1) console.log(`    *** FORMULA MISMATCH: ${gapFromFormula} ***`);

  // Show what the reference implies for the offensive BV
  const impliedOff = Math.round(u.referenceBV / cockpit) - defBV;
  console.log(`    Implied offensiveBV for ref match: ${impliedOff} (actual: ${offBV}, delta: ${impliedOff - offBV})`);

  // Show issues
  if (u.issues?.length > 0) {
    console.log(`  --- ISSUES ---`);
    for (const issue of u.issues) console.log(`    ${issue}`);
  }
}

// Now check: how many undercalculated units have the gap mainly in offensive vs defensive?
console.log('\n\n=== OFFENSIVE vs DEFENSIVE GAP ATTRIBUTION ===');
let offGap = 0, defGap = 0, otherGap = 0;
for (const u of wrong.filter((x: any) => x.percentDiff < 0)) {
  const b = u.breakdown;
  if (!b) continue;
  const cockpit = b.cockpitModifier ?? 1.0;
  const defBV = b.defensiveBV;
  const offBV = b.offensiveBV;
  const total = Math.round((defBV + offBV) * cockpit);
  // If calculated doesn't match our recomputation, there's a formula issue
  if (Math.abs(u.calculatedBV - total) > 2) { otherGap++; continue; }
  // The gap is u.referenceBV - u.calculatedBV (positive = undercalculated)
  const needed = u.referenceBV - u.calculatedBV; // positive = we need more BV
  // The implied offBV to match: (ref/cockpit) - defBV
  const impliedOff = Math.round(u.referenceBV / cockpit) - defBV;
  const offDelta = impliedOff - offBV;
  // If offDelta > 0, offensive is too low
  // If offDelta < 0, defensive is too low
  if (offDelta > 0 && offDelta > needed * 0.6) offGap++;
  else if (offDelta < 0) defGap++;
  else otherGap++;
}
console.log(`  Offensive BV too low: ${offGap}`);
console.log(`  Defensive BV too low: ${defGap}`);
console.log(`  Other/formula issue: ${otherGap}`);
