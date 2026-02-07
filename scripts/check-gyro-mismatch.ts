#!/usr/bin/env npx tsx
/**
 * Check for gyro type mismatches:
 * Compare unit JSON gyro type vs what crit slots say.
 * Also check fluff text for mentions of specific gyro types.
 */
import * as fs from 'fs';
import * as path from 'path';

const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

interface GyroCheck {
  unitId: string;
  declaredGyro: string;
  critGyro: string;
  fluffGyro: string;
  match: boolean;
  gap: number;
  tonnage: number;
}

const checks: GyroCheck[] = [];

for (const iu of index.units) {
  const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
  try {
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    const declaredGyro = (unit.gyro?.type || 'STANDARD').toUpperCase();

    // Check crit slots for gyro type
    let critGyro = 'STANDARD';
    if (unit.criticalSlots) {
      for (const [, slots] of Object.entries(unit.criticalSlots)) {
        if (!Array.isArray(slots)) continue;
        for (const s of slots) {
          if (!s || typeof s !== 'string') continue;
          const lo = (s as string).toLowerCase();
          if (lo.includes('gyro')) {
            if (lo.includes('heavy') && lo.includes('duty')) critGyro = 'HEAVY_DUTY';
            else if (lo.includes('xl') || lo.includes('extra-light')) critGyro = 'XL';
            else if (lo.includes('compact')) critGyro = 'COMPACT';
            else if (lo.includes('superheavy')) critGyro = 'SUPERHEAVY';
            break;
          }
        }
        if (critGyro !== 'STANDARD') break;
      }
    }

    // Check fluff for gyro mentions
    let fluffGyro = '';
    const fluff = unit.fluff || {};
    const allFluff = [fluff.overview, fluff.capabilities, fluff.history, fluff.deployment].filter(Boolean).join(' ').toLowerCase();
    if (allFluff.includes('heavy duty gyro') || allFluff.includes('heavy-duty gyro') || allFluff.includes('hd gyro')) {
      fluffGyro = 'HEAVY_DUTY';
    } else if (allFluff.includes('xl gyro') || allFluff.includes('extra-light gyro')) {
      fluffGyro = 'XL';
    } else if (allFluff.includes('compact gyro')) {
      fluffGyro = 'COMPACT';
    }

    const r = report.allResults.find((x: any) => x.unitId === iu.id);
    const gap = r ? (r.indexBV - r.calculatedBV) : 0;

    const match = critGyro === declaredGyro || (critGyro === 'STANDARD' && declaredGyro === 'STANDARD');

    if (!match || (fluffGyro && fluffGyro !== declaredGyro)) {
      checks.push({
        unitId: iu.id,
        declaredGyro,
        critGyro,
        fluffGyro,
        match,
        gap,
        tonnage: unit.tonnage,
      });
    }
  } catch {}
}

console.log(`=== Gyro Mismatches ===`);
console.log(`Found ${checks.length} units with potential gyro mismatch\n`);

// Separate by type
const critMismatch = checks.filter(c => !c.match);
const fluffMismatch = checks.filter(c => c.match && c.fluffGyro);

console.log(`Crit slot vs declared mismatch: ${critMismatch.length}`);
for (const c of critMismatch.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)).slice(0, 20)) {
  console.log(`  ${c.unitId.padEnd(40).slice(0, 40)} declared=${c.declaredGyro.padEnd(12)} crit=${c.critGyro.padEnd(12)} fluff=${c.fluffGyro || '-'} gap=${c.gap}`);
}

console.log(`\nFluff vs declared mismatch: ${fluffMismatch.length}`);
for (const c of fluffMismatch.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)).slice(0, 20)) {
  console.log(`  ${c.unitId.padEnd(40).slice(0, 40)} declared=${c.declaredGyro.padEnd(12)} fluff=${c.fluffGyro.padEnd(12)} gap=${c.gap}`);
}
