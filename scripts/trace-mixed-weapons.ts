import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Get worst Mixed undercalculated units
const mixed = report.allResults.filter((x: any) => {
  if (x.status === 'exact') return false;
  const entry = (index.units as any[]).find((e: any) => e.id === x.unitId);
  if (!entry?.path) return false;
  try {
    const data = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    return data.techBase === 'MIXED' && x.difference < 0;
  } catch { return false; }
}).sort((a: any, b: any) => a.percentDiff - b.percentDiff);

console.log(`Mixed undercalculated units: ${mixed.length}\n`);

for (const u of mixed.slice(0, 12)) {
  const entry = (index.units as any[]).find((e: any) => e.id === u.unitId);
  const data = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
  const b = u.breakdown;

  console.log(`\n=== ${u.unitId} (${data.tonnage}t, diff=${u.difference}, ${u.percentDiff.toFixed(1)}%) ===`);
  console.log(`  idx=${u.indexBV} calc=${u.calculatedBV} defBV=${b.defensiveBV.toFixed(1)} offBV=${b.offensiveBV.toFixed(1)} wBV=${b.weaponBV} ammoBV=${b.ammoBV} sf=${b.speedFactor}`);

  // Show equipment with IS and Clan resolved BV
  for (const eq of data.equipment) {
    const lo = eq.id.toLowerCase();
    const resBase = resolveEquipmentBV(eq.id);
    const resClan = resolveEquipmentBV('clan-' + eq.id);
    const delta = resClan.battleValue - resBase.battleValue;
    const marker = delta !== 0 ? ` [CL:bv=${resClan.battleValue}/h=${resClan.heat} delta=${delta}]` : '';
    console.log(`  ${eq.id.padEnd(35)} @${eq.location.padEnd(15)} bv=${resBase.battleValue}/h=${resBase.heat}${marker}`);
  }

  // Show Clan-prefixed crit slots
  if (data.criticalSlots) {
    const clanCrits: string[] = [];
    for (const [loc, slots] of Object.entries(data.criticalSlots)) {
      for (const s of (slots as any[])) {
        if (!s || typeof s !== 'string') continue;
        const sl = s.toLowerCase();
        // Find weapons with Clan prefix or Clan-specific naming
        if ((sl.startsWith('cl') && !sl.includes('case') && !sl.includes('double heat sink') &&
             !sl.includes('heat sink') && !sl.includes('-empty-')) ||
            sl.includes('(clan)') || sl.includes('clan ')) {
          clanCrits.push(`${loc}:${s}`);
        }
      }
    }
    if (clanCrits.length > 0) {
      console.log(`  Clan crits: ${clanCrits.join(', ')}`);
    }

    // Also show ALL weapon-like crits for comparison
    const weaponCrits: string[] = [];
    for (const [loc, slots] of Object.entries(data.criticalSlots)) {
      for (const s of (slots as any[])) {
        if (!s || typeof s !== 'string') continue;
        const sl = s.toLowerCase();
        if (sl.includes('-empty-') || sl.includes('heat sink') || sl.includes('endo') ||
            sl.includes('ferro') || sl.includes('case') || sl.includes('engine') ||
            sl.includes('gyro') || sl.includes('life support') || sl.includes('sensors') ||
            sl.includes('cockpit') || sl.includes('shoulder') || sl.includes('upper arm') ||
            sl.includes('lower arm') || sl.includes('hand') || sl.includes('hip') ||
            sl.includes('upper leg') || sl.includes('lower leg') || sl.includes('foot') ||
            sl.includes('armor') || sl.includes('structure') || sl.includes('actuator')) continue;
        weaponCrits.push(`${loc}:${s}`);
      }
    }
    if (weaponCrits.length > 0) {
      console.log(`  All non-infra crits: ${weaponCrits.join(', ')}`);
    }
  }
}
