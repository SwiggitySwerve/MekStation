#!/usr/bin/env npx tsx
/**
 * Trace the Boreas variants in detail - same chassis, different configs.
 * Gap is ~15 BV for all variants. What's common across all variants
 * that we might be missing?
 */
import * as fs from 'fs';
import * as path from 'path';

interface IndexUnit { id: string; chassis: string; model: string; tonnage: number; techBase: string; path: string; bv: number; }
interface IndexFile { units: IndexUnit[]; }

const indexPath = path.resolve('public/data/units/battlemechs/index.json');
const indexData: IndexFile = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

// Find Boreas variants
const boreas = indexData.units.filter(u => u.chassis === 'Boreas');
console.log(`Found ${boreas.length} Boreas variants\n`);

for (const iu of boreas) {
  const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
  let unit: any;
  try { unit = JSON.parse(fs.readFileSync(unitPath, 'utf-8')); } catch { continue; }

  console.log(`--- ${iu.chassis} ${iu.model} (BV=${iu.bv}) ---`);
  console.log(`  Engine: ${unit.engine.type} (${unit.engine.rating})`);
  console.log(`  Armor: ${unit.armor.type}`);
  console.log(`  Structure: ${unit.structure.type}`);
  console.log(`  Gyro: ${unit.gyro.type}`);
  console.log(`  Cockpit: ${unit.cockpit}`);
  console.log(`  Movement: walk=${unit.movement.walk}, jump=${unit.movement.jump}`);
  console.log(`  Heat Sinks: ${unit.heatSinks.type} x${unit.heatSinks.count}`);
  console.log(`  Equipment:`);
  for (const eq of unit.equipment || []) {
    console.log(`    ${eq.id} @ ${eq.location}`);
  }

  if (unit.criticalSlots) {
    console.log(`  Critical Slots (non-standard):`);
    for (const [loc, slots] of Object.entries(unit.criticalSlots as Record<string, (string | null)[]>)) {
      const nonNull = (slots as (string | null)[]).filter(s => s !== null && s !== '');
      if (nonNull.length > 0) {
        // Only show non-standard items (not actuators, structure, engine, gyro, etc.)
        const interesting = nonNull.filter(s => {
          const lo = (s as string).toLowerCase();
          return !lo.includes('actuator') && !lo.includes('shoulder') && !lo.includes('hip') &&
            !lo.includes('engine') && !lo.includes('gyro') && !lo.includes('life support') &&
            !lo.includes('sensors') && !lo.includes('cockpit') && !lo.includes('endo') &&
            !lo.includes('ferro') && !lo.includes('heat sink') && !lo.includes('heatsink') &&
            lo !== '-empty-' && lo !== 'empty';
        });
        if (interesting.length > 0) {
          console.log(`    ${loc}: ${interesting.join(', ')}`);
        }
      }
    }
  }
  console.log('');
}

// Also check: for the Crossbow variants, what's different?
console.log('\n=== Crossbow variants ===');
const crossbow = indexData.units.filter(u => u.chassis === 'Crossbow');
for (const iu of crossbow.slice(0, 5)) {
  const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
  let unit: any;
  try { unit = JSON.parse(fs.readFileSync(unitPath, 'utf-8')); } catch { continue; }

  console.log(`--- ${iu.chassis} ${iu.model} (BV=${iu.bv}) ---`);
  console.log(`  Engine: ${unit.engine.type} (${unit.engine.rating})`);
  console.log(`  Cockpit: ${unit.cockpit}`);
  console.log(`  Heat Sinks: ${unit.heatSinks.type} x${unit.heatSinks.count}`);
  console.log(`  Equipment:`);
  for (const eq of unit.equipment || []) {
    console.log(`    ${eq.id} @ ${eq.location}`);
  }
  console.log('');
}
