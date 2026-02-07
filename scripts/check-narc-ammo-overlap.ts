/**
 * Check if units with NARC/iNARC pods ALSO have separate "Ammo" entries for NARC.
 */
import * as fs from 'fs';
import * as path from 'path';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

// Check sample units
const ids = ['raven-rvn-3l', 'raven-rvn-5l', 'archer-arc-5w', 'kintaro-kto-19', 'stalker-stk-5m', 'battle-cobra-btl-c-2oc', 'arctic-wolf-2', 'owens-ow-1d'];
for (const unitId of ids) {
  const unit = loadUnit(unitId);
  if (!unit) continue;
  console.log(`\n${unitId}:`);

  // All NARC-related crit entries
  let podCount = 0, ammoCount = 0;
  for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (typeof s !== 'string') continue;
      const lo = s.toLowerCase().replace(/\s*\(omnipod\)/gi, '');
      if (lo.includes('narc') || lo.includes('inarc')) {
        const isPod = lo.includes('pod');
        const isAmmo = lo.includes('ammo');
        const isWeapon = !isPod && !isAmmo;
        if (isPod) podCount++;
        if (isAmmo) ammoCount++;
        console.log(`  CRIT ${loc}: "${s}" → ${isPod ? 'POD' : isAmmo ? 'AMMO' : 'WEAPON'}`);
      }
    }
  }
  console.log(`  → ${podCount} pod slots, ${ammoCount} ammo slots`);
}
