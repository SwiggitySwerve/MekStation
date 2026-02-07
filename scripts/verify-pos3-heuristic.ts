/**
 * Verify the "position 3" heuristic for small cockpit detection.
 * Standard cockpit: HEAD[3] = "Sensors"
 * Small cockpit: HEAD[3] = something else
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null && x.breakdown);

// For ALL units (not just 0.95), check the position 3 heuristic
let pos3Small = 0, pos3Standard = 0;
let pos3SmallCorrect = 0, pos3StandardCorrect = 0;
let pos3SmallWrong = 0, pos3StandardWrong = 0;

// Group by: current cockpit modifier and new heuristic result
const changes: { unitId: string, from: number, to: number, pctDiff: number, newPctDiff: number }[] = [];

for (const r of valid) {
  const unit = loadUnit(r.unitId);
  if (!unit) continue;
  const headSlots = unit.criticalSlots?.HEAD || unit.criticalSlots?.HD || [];
  if (headSlots.length < 4) continue;

  const currentMod = r.breakdown?.cockpitModifier;
  // New heuristic: position 3 in HEAD
  const pos3 = headSlots[3];
  const pos3IsSensors = typeof pos3 === 'string' && pos3.toLowerCase().includes('sensors');

  // Drone OS check (drone OS also gets 0.95, separate from cockpit)
  const isDroneOS = headSlots.some((s: any) => typeof s === 'string' && s.toLowerCase().includes('drone'));

  // Interface cockpit check
  const isInterface = r.breakdown?.cockpitType === 'interface';

  // Determine what the new cockpit modifier would be
  let newSmallCockpit = false;
  if (!pos3IsSensors && !isDroneOS && !isInterface) {
    // Position 3 isn't sensors → small cockpit (unless drone/interface)
    newSmallCockpit = true;
  }

  // New modifier (only for the small cockpit part)
  // Note: drone OS and interface have their own modifiers
  let newMod = currentMod; // keep existing unless small cockpit changes
  if (currentMod === 0.95 && !isDroneOS) {
    // Currently 0.95 from small cockpit detection
    newMod = newSmallCockpit ? 0.95 : 1.0;
  } else if (currentMod === 1.0) {
    // Currently standard, but maybe should be small?
    newMod = newSmallCockpit ? 0.95 : 1.0;
  }

  if (newMod !== currentMod) {
    const newCalc = Math.round(r.calculatedBV / currentMod * newMod);
    const newPctDiff = (newCalc - r.indexBV) / r.indexBV * 100;
    changes.push({ unitId: r.unitId, from: currentMod, to: newMod, pctDiff: r.percentDiff, newPctDiff });
  }

  // Tracking
  if (newSmallCockpit) pos3Small++;
  else pos3Standard++;
}

console.log(`=== POS3 HEURISTIC RESULTS ===`);
console.log(`  Detected as small cockpit (pos3≠Sensors): ${pos3Small}`);
console.log(`  Detected as standard cockpit (pos3=Sensors): ${pos3Standard}`);

console.log(`\n=== CHANGES FROM POS3 HEURISTIC ===`);
console.log(`  Total units that would change: ${changes.length}`);

// How many would improve vs worsen?
let improved = 0, worsened = 0, flippedIn = 0, flippedOut = 0;
for (const c of changes) {
  const oldAbs = Math.abs(c.pctDiff);
  const newAbs = Math.abs(c.newPctDiff);
  if (newAbs < oldAbs) improved++;
  else worsened++;
  if (oldAbs > 1 && newAbs <= 1) flippedIn++;
  if (oldAbs <= 1 && newAbs > 1) flippedOut++;
}
console.log(`  Would improve: ${improved}, would worsen: ${worsened}`);
console.log(`  Would flip INTO 1%: ${flippedIn}`);
console.log(`  Would flip OUT of 1%: ${flippedOut}`);
console.log(`  Net gain: ${flippedIn - flippedOut}`);

console.log('\n=== DETAILS OF CHANGES ===');
for (const c of changes.sort((a, b) => a.pctDiff - b.pctDiff)) {
  const mark = Math.abs(c.newPctDiff) < Math.abs(c.pctDiff) ? '✓' : '✗';
  console.log(`  ${mark} ${c.unitId.padEnd(40)} ${c.from}→${c.to} was=${c.pctDiff.toFixed(1).padStart(6)}% now=${c.newPctDiff.toFixed(1).padStart(6)}%`);
}
