import * as fs from 'fs';
import * as path from 'path';
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const ie = idx.units.find((e: any) => e.id === 'phoenix-px-1kr');
if (!ie) { console.log('NOT FOUND'); process.exit(0); }
const unit = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
console.log('Equipment:', JSON.stringify(unit.equipment, null, 2));
console.log('Tonnage:', unit.tonnage);
for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
  const arr = slots as string[];
  for (const s of arr) {
    if (s && (s.toLowerCase().includes('rifle') || s.toLowerCase().includes('cannon'))) console.log('CRIT:', loc, s);
  }
}
