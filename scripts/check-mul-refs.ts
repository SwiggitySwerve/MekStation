import * as fs from 'fs';
const mulCache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf8'));
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Check MUL cache entries for undercalculated units
const underIds = ['osteon-d', 'osteon-c', 'osteon-a', 'osteon-e', 'osteon-f', 'osteon-b',
  'mad-cat-u', 'loki-mk-ii-a', 'cougar-t', 'tiburon-2', 'pariah-septicemia-b-z',
  'thunder-fox-tft-f11', 'atlas-c', 'minsk-2'];

console.log('=== MUL CACHE REFERENCES ===');
for (const uid of underIds) {
  const entry = mulCache[uid];
  const ie = idx.units.find((u: any) => u.id === uid);
  const res = r.allResults.find((x: any) => x.unitId === uid);
  console.log(`\n${uid}:`);
  console.log(`  Index: chassis="${ie?.chassis}" model="${ie?.model}" bv=${ie?.bv}`);
  if (entry) {
    console.log(`  MUL: name="${entry.mulName}" bv=${entry.mulBV} match=${entry.matchType}`);
  } else {
    console.log(`  MUL: NOT IN CACHE`);
  }
  if (res) {
    console.log(`  Validation: calc=${res.calculatedBV} diff=${res.difference}`);
    const implied = res.calculatedBV - res.difference;
    console.log(`  Implied ref=${implied}`);
  }
}

// Now check overcalculated units with TSM
console.log('\n\n=== OVERCALCULATED TSM UNITS ===');
import * as path from 'path';
const overMinor = r.allResults.filter((x: any) =>
  x.percentDiff > 1 && x.percentDiff <= 5 && x.breakdown
);
for (const u of overMinor) {
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (!ie?.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
    const allSlots = Object.values(d.criticalSlots).flat().filter(Boolean) as string[];
    const hasTSM = allSlots.some(s => s.toLowerCase().includes('tsm') || s.toLowerCase().includes('triple strength'));
    if (hasTSM) {
      console.log(`  ${u.unitId}: +${u.difference} (+${u.percentDiff.toFixed(1)}%) ${d.tonnage}t ${d.techBase} walk=${d.movement.walk}`);
    }
  } catch {}
}
