import * as fs from 'fs';
import * as path from 'path';

// Read the validation report
const reportPath = path.resolve(__dirname, '../validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// Find Archer C 2
const archer = report.allResults.find((r: any) => r.unitId === 'archer-c-2');
if (archer) {
  console.log('=== Archer C 2 BV Analysis ===');
  console.log(`Index BV: ${archer.indexBV}`);
  console.log(`Calc BV:  ${archer.calculatedBV}`);
  console.log(`Gap:      ${archer.difference} (${archer.percentDiff.toFixed(2)}%)`);
  console.log(`Breakdown:`);
  console.log(`  DefensiveBV:   ${archer.breakdown.defensiveBV}`);
  console.log(`  OffensiveBV:   ${archer.breakdown.offensiveBV}`);
  console.log(`  WeaponBV:      ${archer.breakdown.weaponBV}`);
  console.log(`  AmmoBV:        ${archer.breakdown.ammoBV}`);
  console.log(`  SpeedFactor:   ${archer.breakdown.speedFactor}`);
  console.log(`  ExplosivePen:  ${archer.breakdown.explosivePenalty}`);
  console.log(`  DefEquipBV:    ${archer.breakdown.defensiveEquipBV}`);

  // Reverse-engineer components
  const sf = archer.breakdown.speedFactor;
  const preSF = archer.breakdown.offensiveBV / sf;
  console.log(`\nOffensive pre-SF: ${preSF.toFixed(2)}`);
  console.log(`  WeaponBV:   ${archer.breakdown.weaponBV}`);
  console.log(`  AmmoBV:     ${archer.breakdown.ammoBV}`);
  console.log(`  Remainder:  ${(preSF - archer.breakdown.weaponBV - archer.breakdown.ammoBV).toFixed(2)} (should be weightBonus + physicalBV + offEquipBV)`);
}

// Also check 5 more simple units
const simpleUnits = report.allResults
  .filter((r: any) => r.rootCause === 'minor-discrepancy' && r.difference < 0)
  .sort((a: any, b: any) => a.difference - b.difference)
  .slice(-10); // least bad ones

console.log('\n=== Least-bad minor-discrepancy units ===');
for (const u of simpleUnits) {
  const sf = u.breakdown.speedFactor;
  const preSF = u.breakdown.offensiveBV / sf;
  const remainder = preSF - u.breakdown.weaponBV - u.breakdown.ammoBV;
  console.log(`${u.unitId.padEnd(40)} idx=${u.indexBV} calc=${u.calculatedBV} gap=${u.difference} (${u.percentDiff.toFixed(2)}%) ton=${u.tonnage} SF=${sf} wBV=${u.breakdown.weaponBV} aBV=${u.breakdown.ammoBV} remain=${remainder.toFixed(1)}`);
}
