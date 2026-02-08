import * as fs from 'fs';
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

// Trace specific units
const ids = ['osteon-d', 'osteon-c', 'hierofalcon-d', 'axman-axm-6x', 'atlas-as7-s-hanssen', 'black-knight-blk-nt-3b'];
for (const id of ids) {
  const u = r.allResults.find((x: any) => x.unitId === id);
  if (!u) { console.log(`${id}: NOT FOUND`); continue; }
  console.log(`\n=== ${id} ===`);
  console.log(`  calc=${u.calculatedBV} ref=${u.referenceBV} diff=${u.difference} (${u.percentDiff?.toFixed(2)}%)`);
  if (u.breakdown) {
    const b = u.breakdown;
    console.log(`  armorBV=${b.armorBV} structBV=${b.structureBV} gyroBV=${b.gyroBV}`);
    console.log(`  defEquipBV=${b.defensiveEquipBV} explosivePen=${b.explosivePenalty}`);
    console.log(`  defensiveFactor=${b.defensiveFactor} cockpitMod=${b.cockpitModifier}`);
    console.log(`  defBV = (${b.armorBV}+${b.structureBV}+${b.gyroBV}+${b.defensiveEquipBV}-${b.explosivePenalty}) * ${b.defensiveFactor} * ${b.cockpitModifier}`);
    const rawDef = (b.armorBV + b.structureBV + b.gyroBV + b.defensiveEquipBV - b.explosivePenalty) * b.defensiveFactor * b.cockpitModifier;
    console.log(`  computed defBV=${rawDef.toFixed(1)}`);
    console.log(`  weaponBV=${b.weaponBV} ammoBV=${b.ammoBV} speedFactor=${b.speedFactor}`);
    console.log(`  offEquipBV=${b.offensiveEquipBV} weightBonus=${b.weightBonus}`);
    console.log(`  offensiveBV=${b.offensiveBV}`);
    const rawOff = b.weaponBV + b.ammoBV + (b.weightBonus || 0) + (b.offensiveEquipBV || 0);
    console.log(`  rawOff=${rawOff} * speedFactor=${b.speedFactor} = ${(rawOff * b.speedFactor).toFixed(1)}`);
    console.log(`  total = defBV + offBV = ${rawDef.toFixed(1)} + ${b.offensiveBV} = ${(rawDef + b.offensiveBV).toFixed(1)}`);
  }
  if (u.issues?.length > 0) console.log(`  ISSUES: ${u.issues.join('; ')}`);
}

// Now look at the 57 overcalculated units where missing penalty would fix
const minor = r.allResults.filter((x: any) =>
  Math.abs(x.percentDiff) > 1 && Math.abs(x.percentDiff) <= 5 && x.breakdown
);
const over = minor.filter((a: any) => a.percentDiff > 0);
const penaltyMissing = over.filter((a: any) => {
  const b = a.breakdown;
  const totalDef = a.calculatedBV - b.offensiveBV;
  return b.explosivePenalty === 0 && a.difference <= totalDef * 0.1;
});
console.log(`\n=== OVERCALCULATED WITH LIKELY MISSING PENALTY (${penaltyMissing.length}) ===`);
for (const u of penaltyMissing.sort((a: any, b: any) => b.difference - a.difference).slice(0, 15)) {
  console.log(`  ${u.unitId}: +${u.difference} (+${u.percentDiff.toFixed(1)}%) pen=${u.breakdown.explosivePenalty} defF=${u.breakdown.defensiveFactor}`);
}
