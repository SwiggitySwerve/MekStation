/**
 * Check iNARC/NARC pods crit slot details to understand naming patterns.
 */
import * as fs from 'fs';
import * as path from 'path';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

// Sample units
const ids = ['raven-rvn-5l', 'kintaro-kto-19', 'archer-arc-5w', 'owens-ow-1d', 'battle-cobra-btl-c-2oc', 'stalker-stk-5m'];
for (const unitId of ids) {
  const unit = loadUnit(unitId);
  if (!unit) { console.log(`${unitId}: not found`); continue; }
  console.log(`\n${unitId} (${unit.techBase})`);

  // Show all crit slots that contain narc/inarc/pods
  for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (typeof s !== 'string') continue;
      const lo = s.toLowerCase();
      if (lo.includes('narc') || lo.includes('inarc') || lo.includes('pod')) {
        console.log(`  ${loc}: "${s}"`);
      }
    }
  }

  // Also check CASE
  let hasCASE = false;
  for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (typeof s !== 'string') continue;
      const lo = s.toLowerCase().replace(/\s*\(omnipod\)/gi, '');
      if (lo.includes('case') && !lo.includes('ammo')) {
        hasCASE = true;
        console.log(`  ${loc}: "${s}" [CASE]`);
      }
    }
  }
  if (!hasCASE) console.log('  NO CASE found');

  // Equipment entries with narc
  for (const eq of (unit.equipment || [])) {
    if (eq.id.toLowerCase().includes('narc') || eq.id.toLowerCase().includes('inarc')) {
      console.log(`  equipment: id="${eq.id}" loc="${eq.location}"`);
    }
  }
}

// Count all unique narc/inarc pod crit slot names across ALL units
console.log('\n=== ALL UNIQUE NARC/INARC POD CRIT SLOT NAMES ===');
const podNames = new Map<string, number>();
for (const ie of idx.units) {
  const unit = loadUnit(ie.id);
  if (!unit?.criticalSlots) continue;
  for (const slots of Object.values(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (typeof s !== 'string') continue;
      const lo = s.toLowerCase().replace(/\s*\(omnipod\)/gi, '').trim();
      if ((lo.includes('narc') || lo.includes('inarc')) && lo.includes('pod')) {
        podNames.set(lo, (podNames.get(lo) || 0) + 1);
      }
    }
  }
}
for (const [name, count] of [...podNames.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  "${name}": ${count} slots`);
}
