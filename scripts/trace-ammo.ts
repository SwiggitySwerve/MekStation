#!/usr/bin/env npx tsx
// Trace ammo resolution for a specific unit
import * as fs from 'fs';
import * as path from 'path';

const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const target = process.argv[2] || 'Catapult CPLT-C6';
const iu = indexData.units.find((u: any) => `${u.chassis} ${u.model}` === target);
if (!iu) {
  console.log('Not found:', target);
  // Try partial match
  const partial = indexData.units.find((u: any) => `${u.chassis} ${u.model}`.includes(target));
  if (partial) console.log('Did you mean:', partial.chassis, partial.model);
  process.exit(1);
}

const unitPath = path.join('public/data/units/battlemechs', iu.path);
const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));

console.log(`=== ${iu.chassis} ${iu.model} ===`);
console.log(`Index BV: ${iu.bv}`);

// Find all ammo slots
for (const [loc, slots] of Object.entries(ud.criticalSlots || {})) {
  if (!Array.isArray(slots)) continue;
  for (const slot of slots) {
    if (!slot || typeof slot !== 'string') continue;
    if (!slot.toLowerCase().includes('ammo')) continue;
    if (slot.toLowerCase().includes('ammo feed')) continue;

    const clean = slot.replace(/\s*\(omnipod\)/gi, '').trim();
    console.log(`\nSlot: "${slot}"`);
    console.log(`Clean: "${clean}"`);

    // Now set env to trace
    process.env.DEBUG_AMMO_TRACE = clean;
  }
}

// Now run the actual BV calculation to see if ammo resolves
// We can't easily import from validate-bv.ts (it's a script), so let's just invoke it
console.log('\nRun with: DEBUG_AMMO=1 npx tsx scripts/validate-bv.ts --filter "' + target.split(' ')[0] + '" --verbose');
