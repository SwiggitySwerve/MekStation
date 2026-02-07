import * as fs from 'fs';
import { resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
console.log('Units:', idx.units.length);

const bv0 = new Map<string, number>();
for (const u of idx.units) {
  try {
    const d = JSON.parse(fs.readFileSync('public/data/units/battlemechs/' + u.path, 'utf-8'));
    for (const eq of d.equipment) {
      const r = resolveEquipmentBV(eq.id);
      if (!r.resolved || r.battleValue === 0) {
        bv0.set(eq.id, (bv0.get(eq.id) || 0) + 1);
      }
    }
  } catch {}
}

console.log('Unresolved/zero-BV equipment IDs:', bv0.size);
const sorted = [...bv0.entries()].sort((a, b) => b[1] - a[1]);
for (const [id, cnt] of sorted.slice(0, 40)) {
  console.log(String(cnt).padStart(4), id);
}
