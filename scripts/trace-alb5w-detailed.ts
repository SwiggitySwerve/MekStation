import * as fs from 'fs';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const r = report.allResults.find((x: any) => x.unitId === 'albatross-alb-5w');
if (!r) { console.log('Not found'); process.exit(1); }

console.log('Full breakdown:');
console.log(JSON.stringify(r.breakdown, null, 2));
console.log('\nIssues:', JSON.stringify(r.issues));
console.log('\nRoot cause:', r.rootCause);

// Reverse engineer the defensive calc
const defBV = r.breakdown.defensiveBV;
const offBV = r.breakdown.offensiveBV;
const sf = r.breakdown.speedFactor;
const wBV = r.breakdown.weaponBV;
const aBV = r.breakdown.ammoBV;
const ePen = r.breakdown.explosivePenalty;
const dEq = r.breakdown.defensiveEquipBV;

console.log(`\nDefensive side:`);
console.log(`  defBV = ${defBV}`);
console.log(`  explosivePen = ${ePen}`);
console.log(`  defEquipBV = ${dEq}`);

// For a 95t IS mech with walk=4, run=6, jump=0:
// TMM = 4 for run 6, jump TMM = 0
// defensiveFactor = 1 + 4/10 = 1.4
// engine = LIGHT, mult = 1.0
// armorBV = 293 * 2.5 * 1.0 = 732.5
// structBV = 145 * 1.5 * 1.0 = 217.5
// gyroBV = 95 * 0.5 = 47.5
// preMult = (732.5 + 217.5 + 47.5 + defEquipBV - explosivePen) * 1.4 * 1.0
// 1305.3625 = (997.5 + dEq - ePen) * 1.4
// (997.5 + dEq - ePen) = 1305.3625 / 1.4 = 932.40178...
// dEq - ePen = 932.40 - 997.5 = -65.1
console.log(`\n  (armorBV + structBV + gyroBV + dEq - ePen) * 1.4 = defBV`);
console.log(`  (997.5 + ${dEq} - ${ePen}) * 1.4 = ${(997.5 + dEq - ePen) * 1.4}`);
console.log(`  Expected: ${defBV}`);
console.log(`  Delta: dEq(${dEq}) - ePen(${ePen}) = ${dEq - ePen}`);
