/**
 * Quick debug: check if TC detection works for specific units.
 */
import * as fs from 'fs';
import * as path from 'path';

// Import the scanCrits output format from validate-bv
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const targets = ['great-turtle-gtr-1', 'stalker-ii-stk-9a', 'osteon-c', 'thunder-fox-tft-f11'];

for (const uid of targets) {
  const unit = loadUnit(uid);
  if (!unit) { console.log(`${uid}: NOT FOUND`); continue; }

  console.log(`\n${uid}:`);

  // Simulate crit scan for TC
  let hasTC = false;
  if (unit.criticalSlots) {
    for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const slot of slots) {
        if (!slot || typeof slot !== 'string') continue;
        const clean = (slot as string).replace(/\s*\(omnipod\)/gi, '').trim();
        const lo = clean.toLowerCase();
        if (lo.includes('targeting computer') || lo.includes('targetingcomputer')) {
          console.log(`  CRIT TC DETECTED: [${loc}] "${slot}" -> clean="${clean}" lo="${lo}"`);
          hasTC = true;
        }
      }
    }
  }
  console.log(`  cs.hasTC = ${hasTC}`);

  // Check equipment list
  let eqHasTC = false;
  for (const eq of unit.equipment || []) {
    const lo = eq.id.toLowerCase();
    if (lo.includes('targeting-computer') || lo.includes('targeting computer')) {
      console.log(`  EQUIP TC DETECTED: "${eq.id}"`);
      eqHasTC = true;
    }
  }
  console.log(`  equipment hasTC = ${eqHasTC}`);
  console.log(`  FINAL hasTC = ${hasTC || eqHasTC}`);

  // Check HEAD crit pattern
  const headSlots = unit.criticalSlots?.HEAD;
  if (headSlots) {
    const lsCount = headSlots.filter((s: string | null) => s && s.includes('Life Support')).length;
    console.log(`  HEAD: [${headSlots.join(', ')}] LS=${lsCount}`);
  }
}
