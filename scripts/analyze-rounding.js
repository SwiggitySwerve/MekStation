const r = JSON.parse(require('fs').readFileSync('validation-output/bv-validation-report.json', 'utf8'));

// All diff=+1 units
const plus1 = r.allResults.filter(u => u.difference === 1);
console.log('Units with diff=+1:', plus1.length);

// Analyze: if we floor the final BV instead of round, how many become exact?
let floorFixes = 0;
let floorBreaks = 0;
for (const u of plus1) {
  const b = u.breakdown || {};
  const def = b.defensiveBV || 0;
  const off = b.offensiveBV || 0;
  const cockpitMod = b.cockpitModifier || 1;
  const baseBV = def + off;
  const flooredBV = Math.floor(baseBV * cockpitMod);
  if (flooredBV === u.indexBV) floorFixes++;
}
console.log('Floor fixes +1:', floorFixes + '/' + plus1.length);

// Check: what fraction of baseBV is > X.5?
let above5 = 0;
let fracDistribution = {};
for (const u of plus1) {
  const b = u.breakdown || {};
  const baseBV = (b.defensiveBV || 0) + (b.offensiveBV || 0);
  const cockpitMod = b.cockpitModifier || 1;
  const raw = baseBV * cockpitMod;
  const frac = raw - Math.floor(raw);
  if (frac > 0.5) above5++;
  const bucket = Math.floor(frac * 10) / 10;
  fracDistribution[bucket.toFixed(1)] = (fracDistribution[bucket.toFixed(1)] || 0) + 1;
}
console.log('\nFractional distribution for diff=+1:');
for (const [bucket, count] of Object.entries(fracDistribution).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))) {
  console.log(`  ${bucket}: ${count}`);
}
console.log('Above 0.5 (rounds up):', above5, '/', plus1.length);

// KEY TEST: What if MegaMek rounds def and off separately before summing?
// MegaMek: totalBV = round(round(defensiveBV) + round(offensiveBV)) * cockpitMod
let roundSepFixes = 0;
for (const u of plus1) {
  const b = u.breakdown || {};
  const def = b.defensiveBV || 0;
  const off = b.offensiveBV || 0;
  const cockpitMod = b.cockpitModifier || 1;
  const sepBV = Math.round((Math.round(def) + Math.round(off)) * cockpitMod);
  if (sepBV === u.indexBV) roundSepFixes++;
}
console.log('\nRound def+off separately:', roundSepFixes + '/' + plus1.length);

// What about: truncate def and off (floor), then round final?
let truncFixes = 0;
for (const u of plus1) {
  const b = u.breakdown || {};
  const def = b.defensiveBV || 0;
  const off = b.offensiveBV || 0;
  const cockpitMod = b.cockpitModifier || 1;
  const truncBV = Math.round((Math.floor(def) + Math.floor(off)) * cockpitMod);
  if (truncBV === u.indexBV) truncFixes++;
}
console.log('Truncate def+off, round final:', truncFixes + '/' + plus1.length);

// What about: truncate baseBV (floor def+off sum), then round with cockpit?
let truncSumFixes = 0;
for (const u of plus1) {
  const b = u.breakdown || {};
  const def = b.defensiveBV || 0;
  const off = b.offensiveBV || 0;
  const cockpitMod = b.cockpitModifier || 1;
  const truncBV = Math.round(Math.floor(def + off) * cockpitMod);
  if (truncBV === u.indexBV) truncSumFixes++;
}
console.log('Floor sum, round final:', truncSumFixes + '/' + plus1.length);

// What about rounding down the offensive BV × speedFactor step?
// offBV = Math.floor((weaponBV + ammoBV + weightBonus) * speedFactor)
// We don't have the individual components to recalculate this easily

// Check: does MegaMek use int arithmetic? If so, floor might be applied at various steps
// Let's try: floor(def) + floor(off) with floor final
let floorAllFixes = 0;
for (const u of plus1) {
  const b = u.breakdown || {};
  const def = b.defensiveBV || 0;
  const off = b.offensiveBV || 0;
  const cockpitMod = b.cockpitModifier || 1;
  const floorBV = Math.floor((Math.floor(def) + Math.floor(off)) * cockpitMod);
  if (floorBV === u.indexBV) floorAllFixes++;
}
console.log('Floor all:', floorAllFixes + '/' + plus1.length);

// Try: round((int)(def + off) * cockpit) where int is Java casting (truncate towards zero)
let intCastFixes = 0;
for (const u of plus1) {
  const b = u.breakdown || {};
  const def = b.defensiveBV || 0;
  const off = b.offensiveBV || 0;
  const cockpitMod = b.cockpitModifier || 1;
  const base = Math.trunc(def + off);
  const bv = Math.round(base * cockpitMod);
  if (bv === u.indexBV) intCastFixes++;
}
console.log('trunc(def+off), round final:', intCastFixes + '/' + plus1.length);

// Check the -1 units too to make sure we don't break them
const minus1 = r.allResults.filter(u => u.difference === -1);
console.log('\n\nUnits with diff=-1:', minus1.length);

let truncBreaks = 0;
let truncMinus1Fixes = 0;
for (const u of minus1) {
  const b = u.breakdown || {};
  const def = b.defensiveBV || 0;
  const off = b.offensiveBV || 0;
  const cockpitMod = b.cockpitModifier || 1;
  const truncBV = Math.round(Math.floor(def + off) * cockpitMod);
  if (truncBV === u.indexBV) truncMinus1Fixes++;
  if (truncBV < u.indexBV && u.calculatedBV === u.indexBV + 1) truncBreaks++;
}
console.log('Floor sum would fix -1:', truncMinus1Fixes + '/' + minus1.length);
console.log('Floor sum would break -1 to -2:', truncBreaks);

// Net effect: for ALL units
let totalExactBefore = 0;
let totalExactAfterFloorSum = 0;
let totalExactAfterTrunc = 0;
for (const u of r.allResults) {
  const b = u.breakdown || {};
  const def = b.defensiveBV || 0;
  const off = b.offensiveBV || 0;
  const cockpitMod = b.cockpitModifier || 1;

  if (u.difference === 0) totalExactBefore++;

  const floorSumBV = Math.round(Math.floor(def + off) * cockpitMod);
  if (floorSumBV === u.indexBV) totalExactAfterFloorSum++;

  const truncBV = Math.round(Math.trunc(def + off) * cockpitMod);
  if (truncBV === u.indexBV) totalExactAfterTrunc++;
}
console.log('\n=== NET EFFECT ===');
console.log('Exact before:', totalExactBefore);
console.log('Exact with floor(def+off):', totalExactAfterFloorSum);
console.log('Exact with trunc(def+off):', totalExactAfterTrunc);
