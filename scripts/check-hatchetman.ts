import * as fs from 'fs';
import * as path from 'path';
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const ie = idx.units.find((e: any) => e.id === 'hatchetman-hct-3f-austin');
if (!ie) { console.log('NOT FOUND'); process.exit(0); }
const unit = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
console.log('Equipment:', JSON.stringify(unit.equipment, null, 2));
for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
  const arr = slots as string[];
  for (const s of arr) {
    if (s && s.toLowerCase().includes('ammo')) console.log('AMMO CRIT:', loc, s);
  }
}
