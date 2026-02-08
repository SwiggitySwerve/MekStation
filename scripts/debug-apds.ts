import * as fs from 'fs';
import * as path from 'path';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const entry = idx.units.find((u: any) => u.id === 'jackalope-jlp-kb');
if (!entry) { console.log('Not found'); process.exit(1); }
const unit = JSON.parse(fs.readFileSync(path.resolve('public/data/units/battlemechs', entry.path), 'utf-8'));

console.log('Equipment:');
for (const eq of unit.equipment) {
  const lo = eq.id.toLowerCase();
  const isAPDS = lo.includes('apds') || lo.includes('advanced-point-defense') || lo.includes('point-defense-system');
  console.log(`  ${eq.id} → isAPDS=${isAPDS}`);
}

console.log('\nCrit slots with APDS:');
for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
  if (!Array.isArray(slots)) continue;
  for (const s of slots) {
    if (s && typeof s === 'string' && (s.toLowerCase().includes('apds') || s.toLowerCase().includes('point defense'))) {
      console.log(`  ${loc}: ${s}`);
    }
  }
}
