#!/usr/bin/env npx tsx
// Find simple IS units that are undercalculated 1-5% with NO ammo and few weapons
// These should be easiest to trace
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));

const under = report.allResults.filter((r: any) =>
  r.percentDiff !== null && r.percentDiff < -1 && r.percentDiff > -5 &&
  r.breakdown && r.breakdown.ammoBV === 0
);

console.log(`Undercalculated 1-5% with 0 ammo: ${under.length} units`);

for (const r of under.slice(0, 30)) {
  const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === `${r.chassis} ${r.model}`);
  if (!iu) continue;
  try {
    const fp = path.resolve('public/data/units/battlemechs', iu.path);
    const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    if (ud.techBase !== 'INNER_SPHERE') continue;

    const numWeapons = ud.equipment.filter((e: any) => {
      const lo = e.id.toLowerCase();
      return !lo.includes('ammo') && !lo.includes('heatsink') && !lo.includes('heat-sink') &&
        !lo.includes('endo') && !lo.includes('ferro') && !lo.includes('case') &&
        !lo.includes('targeting') && !lo.includes('ecm') && !lo.includes('c3') &&
        !lo.includes('tsm') && !lo.includes('masc') && !lo.includes('jump') &&
        !lo.includes('artemis') && !lo.includes('probe') && !lo.includes('bap');
    }).length;

    const bd = r.breakdown;
    const missingBV = -r.difference;
    const baseOff = bd.weaponBV + bd.ammoBV + ud.tonnage;
    const missingBase = missingBV / bd.speedFactor;

    // Does this unit have a TC in crit slots?
    let hasTC = false;
    if (ud.criticalSlots) {
      for (const slots of Object.values(ud.criticalSlots)) {
        if (Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('targeting computer'))) {
          hasTC = true;
          break;
        }
      }
    }

    // Does equipment list include TC?
    const eqHasTC = ud.equipment.some((e: any) => e.id.toLowerCase().includes('targeting'));

    console.log(`${(r.chassis + ' ' + r.model).padEnd(35)} ${numWeapons}wpn diff=${r.difference} (${r.percentDiff.toFixed(1)}%) weapBV=${bd.weaponBV.toFixed(0)} off=${bd.offensiveBV.toFixed(0)} def=${bd.defBV?.toFixed(0) || bd.defensiveBV.toFixed(0)} sf=${bd.speedFactor} missingBase=${missingBase.toFixed(1)} ton=${ud.tonnage} critTC=${hasTC} eqTC=${eqHasTC}`);
  } catch {}
}
