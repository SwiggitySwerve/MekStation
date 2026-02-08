import * as fs from 'fs';
import * as path from 'path';

const indexPath = path.resolve(process.cwd(), 'public/data/units/battlemechs/index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

for (const u of index.units) {
  if (!u.path) continue;
  const fp = path.resolve(process.cwd(), 'public/data/units/battlemechs', u.path);
  const unit = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  if (!unit.criticalSlots) continue;

  for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const slot of slots) {
      if (!slot || typeof slot !== 'string') continue;
      const lo = slot.replace(/\s*\(omnipod\)/gi, '').trim().toLowerCase();
      if (lo.includes('shield') && !lo.includes('blue-shield') && !lo.includes('chameleon')) {
        console.log(`${unit.chassis} ${unit.model || ''} | ${loc}: ${slot}`);
      }
    }
  }
}
