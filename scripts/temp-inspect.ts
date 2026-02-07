#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.join(basePath, 'index.json'), 'utf-8'));

const targets = ['Dasher G', 'Koshi Z', 'Cephalus A', 'Balius E', 'Cephalus Prime'];

for (const iu of indexData.units) {
  const name = `${iu.chassis} ${iu.model}`;
  if (!targets.includes(name)) continue;

  const ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8'));

  console.log(`\n=== ${name} (BV=${iu.bv}, tech=${ud.techBase}) ===`);
  console.log('EQUIPMENT:');
  for (const eq of (ud.equipment || [])) console.log(`  ${eq.id} @ ${eq.location}`);
  console.log('KEY CRITS:');
  for (const [loc, slots] of Object.entries(ud.criticalSlots || {})) {
    for (const slot of (slots as (string | null)[])) {
      if (!slot) continue;
      if (/endo|ferro|engine|gyro|cockpit|life support|sensors|shoulder|upper arm|lower arm|hand|hip|upper leg|lower leg|foot|actuator|heat sink|jump jet|^case$/i.test(slot)) continue;
      console.log(`  [${loc}] ${slot}`);
    }
  }
}
