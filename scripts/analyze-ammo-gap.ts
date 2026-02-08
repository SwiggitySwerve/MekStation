#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const d = JSON.parse(fs.readFileSync('validation-output/bv-all-results.json', 'utf-8'));
const mulCache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf-8'));

// Find units that are undercalculated and have ammoBV=0
const missingAmmo = d.filter((r: any) => {
  if (r.status === 'error') return false;
  const entry = mulCache.entries?.[r.id];
  const hasMUL = entry && entry.mulBV > 0 && entry.matchType === 'exact';
  return hasMUL && r.ammoBV === 0 && r.pct < -3;
});

console.log(`Units with missing ammo BV (MUL-validated, >3% under): ${missingAmmo.length}`);

// For each, load the unit and find what ammo crit names are present
const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));

const unresolvedAmmoNames = new Map<string, number>();

for (const r of missingAmmo.slice(0, 50)) {
  const iu = indexData.units.find((u: any) => u.id === r.id);
  if (!iu) continue;
  const unitPath = path.join(basePath, iu.path);
  if (!fs.existsSync(unitPath)) continue;
  const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));

  const ammoSlots: string[] = [];
  for (const [, slots] of Object.entries(ud.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (s && typeof s === 'string' && s.toLowerCase().includes('ammo') && !s.toLowerCase().includes('ammo feed')) {
        ammoSlots.push(s);
      }
    }
  }

  if (ammoSlots.length > 0) {
    console.log(`\n${r.name} (ref=${r.ref}, calc=${r.calc}, pct=${r.pct.toFixed(1)}%)`);
    for (const a of ammoSlots) {
      console.log(`  AMMO: "${a}"`);
      unresolvedAmmoNames.set(a, (unresolvedAmmoNames.get(a) || 0) + 1);
    }
  }
}

console.log('\n=== UNRESOLVED AMMO NAMES (frequency) ===');
const sorted = [...unresolvedAmmoNames.entries()].sort((a, b) => b[1] - a[1]);
for (const [name, count] of sorted.slice(0, 30)) {
  console.log(`  ${count}x "${name}"`);
}
