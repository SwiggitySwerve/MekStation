#!/usr/bin/env npx tsx
/**
 * Check crit slot names for ALL gyro slots across all units.
 * Map the actual crit slot names to determine true gyro type.
 * Standard gyro = "Gyro" × 4
 * Heavy Duty = "Heavy Duty Gyro" × 4
 * Compact = "Compact Gyro" × 2
 * XL = "Extra-Light Gyro" × 6
 */
import * as fs from 'fs';
import * as path from 'path';

const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

// Collect all unique gyro slot names
const gyroSlotNames = new Map<string, number>();
const mismatches: { id: string; declared: string; detected: string; gap: number; gyroSlots: string[] }[] = [];

for (const iu of index.units) {
  const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
  try {
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    const declaredGyro = (unit.gyro?.type || 'STANDARD').toUpperCase();

    if (!unit.criticalSlots) continue;

    // Look at CENTER_TORSO crit slots (gyro is always in CT)
    const ctSlots = unit.criticalSlots.CENTER_TORSO;
    if (!Array.isArray(ctSlots)) continue;

    const gyroSlots = ctSlots.filter((s: any) => s && typeof s === 'string' && (s as string).toLowerCase().includes('gyro'));

    for (const gs of gyroSlots) {
      const n = (gs as string).trim();
      gyroSlotNames.set(n, (gyroSlotNames.get(n) || 0) + 1);
    }

    // Detect gyro type from crit slots
    let detectedGyro = 'STANDARD';
    const gyroLo = gyroSlots.map((s: any) => (s as string).toLowerCase());
    if (gyroLo.some((s: string) => s.includes('heavy') && s.includes('duty'))) {
      detectedGyro = 'HEAVY_DUTY';
    } else if (gyroLo.some((s: string) => s.includes('xl') || s.includes('extra-light') || s.includes('extra light'))) {
      detectedGyro = 'XL';
    } else if (gyroLo.some((s: string) => s.includes('compact'))) {
      detectedGyro = 'COMPACT';
    } else if (gyroLo.some((s: string) => s.includes('superheavy'))) {
      detectedGyro = 'SUPERHEAVY';
    }

    // Also detect by slot count
    if (detectedGyro === 'STANDARD') {
      if (gyroSlots.length === 2) detectedGyro = 'COMPACT';
      else if (gyroSlots.length === 6) detectedGyro = 'XL';
      // Heavy Duty is still 4 slots, same as standard
    }

    if (detectedGyro !== declaredGyro) {
      const r = report.allResults.find((x: any) => x.unitId === iu.id);
      const gap = r ? r.indexBV - r.calculatedBV : 0;
      mismatches.push({
        id: iu.id,
        declared: declaredGyro,
        detected: detectedGyro,
        gap,
        gyroSlots: gyroSlots as string[],
      });
    }
  } catch {}
}

console.log(`=== All Gyro Crit Slot Names ===`);
for (const [name, count] of [...gyroSlotNames.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(5)}x  "${name}"`);
}

console.log(`\n=== Crit-Detected Gyro Mismatches (${mismatches.length}) ===`);
for (const m of mismatches.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)).slice(0, 40)) {
  console.log(`  ${m.id.padEnd(40).slice(0, 40)} declared=${m.declared.padEnd(12)} detected=${m.detected.padEnd(12)} gap=${String(m.gap).padStart(5)}  slots=[${m.gyroSlots.join(', ')}]`);
}
