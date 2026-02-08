#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

// Check specific overcalculated units vs MegaMek
const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const mulCache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf-8'));

const targets = ['Uller U', 'Uller F', 'Thor U', 'Pack Hunter Unknown', 'Clint IIC 2L', 'Galahad 3', 'Baboon 3'];
for (const t of targets) {
  const match = index.units.find((u: any) => `${u.chassis} ${u.model}` === t);
  if (!match) { console.log(`Not found: ${t}`); continue; }
  const mulEntry = mulCache.entries?.[match.id];

  // Read unit file
  const unitPath = path.resolve('public/data/units/battlemechs', match.path);
  const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));

  console.log(`\n=== ${match.chassis} ${match.model} ===`);
  console.log(`  ID: ${match.id}`);
  console.log(`  Index BV: ${match.bv}`);
  console.log(`  MUL BV: ${mulEntry?.mulBV} (match: ${mulEntry?.matchType}, name: ${mulEntry?.mulName})`);
  console.log(`  TechBase: ${ud.techBase}`);
  console.log(`  Tonnage: ${ud.tonnage}`);
  console.log(`  Engine: ${ud.engine.type} ${ud.engine.rating}`);
  console.log(`  Walk/Jump: ${ud.movement.walk}/${ud.movement.jump}`);
  console.log(`  HeatSinks: ${ud.heatSinks.count} ${ud.heatSinks.type}`);
  console.log(`  Equipment: ${ud.equipment.map((e: any) => e.id).join(', ')}`);

  // Check if any chassis has multiple variants with same BV
  const sameChassisVariants = index.units.filter((u: any) => u.chassis === match.chassis);
  const bvCounts: Record<number, number> = {};
  for (const v of sameChassisVariants) {
    bvCounts[v.bv] = (bvCounts[v.bv] || 0) + 1;
  }
  const sharedBVCount = bvCounts[match.bv] || 0;
  console.log(`  Variants with same BV (${match.bv}): ${sharedBVCount} of ${sameChassisVariants.length} total`);
}
