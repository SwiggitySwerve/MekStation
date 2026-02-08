#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
import { calculateTMM, calculateSpeedFactor, calculateOffensiveSpeedFactor } from '../src/utils/construction/battleValueCalculations';

// Test edge cases for TMM calculation to confirm correctness
console.log('=== TMM Edge Case Verification ===');
console.log('mpToTMM comparisons (our func vs expected MegaMek):');

function mpToTMM(mp: number): number {
  if (mp <= 2) return 0;
  if (mp <= 4) return 1;
  if (mp <= 6) return 2;
  if (mp <= 9) return 3;
  if (mp <= 17) return 4;
  if (mp <= 24) return 5;
  return 6;
}

// Verify the TMM table matches MegaMek's Compute.getTargetMovementModifier
// MegaMek: 0 hex = 0, 3-4 = +1, 5-6 = +2, 7-9 = +3, 10-17 = +4, 18-24 = +5, 25+ = +6
const testMPs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 17, 18, 24, 25, 30];
const expectedTMMs = [0, 0, 0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 6, 6];

for (let i = 0; i < testMPs.length; i++) {
  const mp = testMPs[i];
  const got = mpToTMM(mp);
  const expected = expectedTMMs[i];
  const match = got === expected ? 'OK' : `MISMATCH (got ${got}, expected ${expected})`;
  console.log(`  MP ${mp.toString().padStart(2)}: TMM ${got} ${match}`);
}

// Now test calculateTMM with various run/jump combinations
console.log('\n=== calculateTMM(runMP, jumpMP) tests ===');
const combos = [
  { run: 5, jump: 0, desc: '3/5 walk/run, no jump' },
  { run: 5, jump: 3, desc: '3/5 walk/run, 3 jump' },
  { run: 5, jump: 5, desc: '3/5 walk/run, 5 jump' },
  { run: 8, jump: 0, desc: '5/8 walk/run, no jump' },
  { run: 8, jump: 5, desc: '5/8 walk/run, 5 jump' },
  { run: 8, jump: 8, desc: '5/8 walk/run, 8 jump (= TMM 3+1 = 4)' },
  { run: 11, jump: 7, desc: '7/11 walk/run, 7 jump' },
  { run: 11, jump: 0, desc: '7/11 walk/run, no jump' },
  { run: 6, jump: 6, desc: '4/6 walk/run, 6 jump' },
];

for (const c of combos) {
  const tmm = calculateTMM(c.run, c.jump);
  const runTMM = mpToTMM(c.run);
  const jumpTMM = c.jump > 0 ? mpToTMM(c.jump) + 1 : 0;
  const df = 1 + tmm / 10.0;
  console.log(`  run=${c.run}, jump=${c.jump}: runTMM=${runTMM}, jumpTMM=${jumpTMM}, max=${tmm}, DF=${df.toFixed(1)} | ${c.desc}`);
}

// Special: verify that 1-2 hex movement gets TMM 0 (not -1 or anything else)
// In MegaMek's getTargetMovementModifier, distance 0 = 0, distance 1-2 = 0
// (there's no negative TMM for moving slowly)
console.log('\n=== Verify slow movers get TMM 0 ===');
for (const mp of [0, 1, 2]) {
  const tmm = calculateTMM(mp, 0);
  console.log(`  runMP=${mp}: TMM=${tmm}, DF=${1 + tmm / 10.0}`);
}

// Check: is there a difference between distance=0 (stationary) and distance=1-2?
// In MegaMek: getTargetMovementModifier(0, ...) returns 0
// But in combat, a stationary target gets NO TMM, while one that moved 1-2 hexes gets +0
// For BV: runMP=0 means the mech can't move - getRunningTMM returns 0
// Our code: calculateTMM(0, 0) = mpToTMM(0) = 0 (mp <= 2 => 0) - CORRECT
console.log(`\n  TMM for stationary (runMP=0): ${calculateTMM(0, 0)} - should be 0`);
