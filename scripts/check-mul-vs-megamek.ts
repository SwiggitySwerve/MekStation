#!/usr/bin/env npx tsx
/**
 * Compare MUL BV against our calculation for the most common/simple units.
 * Focus on units with NO special equipment, NO ammo, standard everything.
 * If even the simplest energy-only units show a 2% gap, the issue is
 * in the core formula or the MUL reference values themselves.
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Find undercalculated units that are energy-only (no ammo) with minimal equipment
interface SimpleUnit {
  id: string;
  tonnage: number;
  gap: number;
  gapPct: number;
  defBV: number;
  offBV: number;
  weaponBV: number;
  speedFactor: number;
  walk: number;
  jump: number;
  engine: string;
  engineRating: number;
  armor: string;
  structure: string;
  gyro: string;
  cockpit: string;
  hs: string;
  hsCount: number;
  equipment: string[];
  indexBV: number;
  calcBV: number;
}

const simpleUnits: SimpleUnit[] = [];

const undercalc = report.allResults.filter((r: any) => {
  const pct = Math.abs(r.percentDiff);
  return pct > 1 && pct <= 5 && r.difference < 0;
});

for (const r of undercalc) {
  const b = r.breakdown;
  if (!b) continue;
  if (b.ammoBV > 0) continue; // Skip units with ammo

  const iu = index.units.find((u: any) => u.id === r.unitId);
  if (!iu) continue;

  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));

    // Check if unit has ammo in crits (even if ammoBV=0)
    let hasAmmo = false;
    if (unit.criticalSlots) {
      for (const [, slots] of Object.entries(unit.criticalSlots)) {
        if (!Array.isArray(slots)) continue;
        for (const s of slots) {
          if (s && typeof s === 'string' && (s as string).toLowerCase().includes('ammo') && !(s as string).toLowerCase().includes('ammo feed')) {
            hasAmmo = true;
          }
        }
      }
    }
    if (hasAmmo) continue; // Skip even if ammoBV=0 but has ammo crits

    const gap = r.indexBV - r.calculatedBV;
    simpleUnits.push({
      id: r.unitId,
      tonnage: unit.tonnage,
      gap,
      gapPct: gap / r.calculatedBV * 100,
      defBV: b.defensiveBV,
      offBV: b.offensiveBV,
      weaponBV: b.weaponBV,
      speedFactor: b.speedFactor,
      walk: unit.movement.walk,
      jump: unit.movement.jump || 0,
      engine: unit.engine.type,
      engineRating: unit.engine.rating,
      armor: unit.armor.type,
      structure: unit.structure.type,
      gyro: unit.gyro?.type || 'standard',
      cockpit: unit.cockpit || 'standard',
      hs: unit.heatSinks?.type || 'single',
      hsCount: unit.heatSinks?.count || 10,
      equipment: unit.equipment.map((e: any) => e.id),
      indexBV: r.indexBV,
      calcBV: r.calculatedBV,
    });
  } catch {}
}

console.log(`Found ${simpleUnits.length} undercalculated energy-only units (no ammo)\n`);

// Sort by simplicity (fewer equipment = simpler)
simpleUnits.sort((a, b) => a.equipment.length - b.equipment.length);

for (const u of simpleUnits.slice(0, 30)) {
  console.log(`=== ${u.id} (${u.tonnage}t) ===`);
  console.log(`  MUL BV=${u.indexBV}  Calc=${u.calcBV}  Gap=${u.gap} (${u.gapPct.toFixed(1)}%)`);
  console.log(`  DefBV=${u.defBV.toFixed(1)}  OffBV=${u.offBV.toFixed(1)}  WeaponBV=${u.weaponBV}  SF=${u.speedFactor.toFixed(2)}`);
  console.log(`  Walk=${u.walk} Jump=${u.jump} Engine=${u.engine}/${u.engineRating}`);
  console.log(`  Armor=${u.armor} Structure=${u.structure} Gyro=${u.gyro} Cockpit=${u.cockpit}`);
  console.log(`  HS=${u.hsCount}x${u.hs}`);
  console.log(`  Equipment: [${u.equipment.join(', ')}]`);
  console.log('');
}
