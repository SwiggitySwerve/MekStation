#!/usr/bin/env npx tsx

function offensiveSpeedFactor(runMP: number, jumpMP: number): number {
  const mp = runMP + Math.round(Math.max(jumpMP, 0) / 2.0);
  return Math.round(Math.pow(1 + (mp - 5) / 10.0, 1.2) * 100.0) / 100.0;
}

console.log('Speed factor verification:');
for (let run = 1; run <= 12; run++) {
  for (let jump = 0; jump <= 8; jump += 4) {
    const sf = offensiveSpeedFactor(run, jump);
    console.log(`  run=${run} jump=${jump} → mp=${run + Math.round(Math.max(jump, 0) / 2.0)} → sf=${sf}`);
  }
}

console.log('\nMegaMek formula: Math.round(Math.pow(1 + ((mp - 5) / 10.0), 1.2) * 100.0) / 100.0');
console.log('Our formula:     Math.round(Math.pow(1 + (mp - 5) / 10.0, 1.2) * 100.0) / 100.0');
console.log('These are identical.');

console.log('\nChecking offensiveSpeedFactorMP:');
console.log('MegaMek: runMP + (int)(Math.round(Math.max(jumpMP, umuMP) / 2.0))');
console.log('Ours:    runMP + Math.round(Math.max(jumpMP, umuMP) / 2.0)');
console.log('These are identical (JS Math.round returns integer for .0 and .5 inputs).');
