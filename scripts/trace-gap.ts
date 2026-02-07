#!/usr/bin/env npx tsx
// Deep trace a few undercalculated IS units to find the exact BV gap source
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));

// Find IS units that are minor-discrepancy (undercalculated 1-3%) with breakdowns
const under = report.allResults.filter((r: any) =>
  r.percentDiff !== null && r.percentDiff < -0.5 && r.percentDiff > -4 &&
  r.breakdown && r.breakdown.weaponBV > 0
);

console.log(`Total 0.5-4% undercalculated with weapon BV: ${under.length}`);

// Pick specific targets
const targets = [
  'Locust LCT-7V',
  'Cicada CDA-4A',
  'Grasshopper GHR-7P',
  'Flea FLE-21',
  'Blitzkrieg BTZ-4F',
  'Shadow Hawk SHD-5M',
  'Phoenix Hawk PXH-3M',
  'Guillotine GLT-8D',
].map(name => {
  const rr = report.allResults.find((r: any) => `${r.chassis} ${r.model}` === name);
  return rr ? { name, result: rr } : null;
}).filter(Boolean);

for (const t of targets) {
  if (!t) continue;
  const { name, result: rr } = t;
  const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === name);
  if (!iu) { console.log(`NOT FOUND: ${name}`); continue; }
  const fp = path.resolve('public/data/units/battlemechs', iu.path);
  const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${name} (${ud.techBase}, ${ud.tonnage}t)`);
  console.log(`  Ref BV: ${rr.indexBV}, Calc: ${rr.calculatedBV}, Diff: ${rr.difference} (${rr.percentDiff.toFixed(2)}%)`);

  const bd = rr.breakdown;
  console.log(`  Breakdown: def=${bd.defensiveBV.toFixed(1)} off=${bd.offensiveBV.toFixed(1)}`);
  console.log(`  WeapBV=${bd.weaponBV.toFixed(1)} AmmoBV=${bd.ammoBV.toFixed(1)} SF=${bd.speedFactor.toFixed(4)}`);

  // Manually sum equipment weapon BV
  let manualWeapBV = 0;
  const weapons: { id: string; bv: number; heat: number; resolved: boolean }[] = [];
  for (const eq of ud.equipment) {
    const res = resolveEquipmentBV(eq.id);
    weapons.push({ id: eq.id, bv: res.battleValue, heat: res.heat, resolved: res.resolved });
    if (res.resolved && res.battleValue > 0) {
      // Check if it's a "weapon" (not ammo, not equipment)
      const lo = eq.id.toLowerCase();
      const isAmmo = lo.includes('ammo');
      const isNonWeapon = lo.includes('heatsink') || lo.includes('heat-sink') || lo.includes('endo') || lo.includes('ferro') || lo.includes('case') || lo.includes('artemis') || lo.includes('targeting') || lo.includes('ecm') || lo.includes('bap') || lo.includes('probe') || lo.includes('c3') || lo.includes('masc') || lo.includes('tsm') || lo.includes('jump') || lo.includes('shield') || lo.includes('a-pod') || lo.includes('b-pod') || lo.includes('m-pod');
      if (!isAmmo && !isNonWeapon) {
        manualWeapBV += res.battleValue;
      }
    }
  }
  console.log(`  Manual weapon BV from equipment: ${manualWeapBV}`);
  console.log(`  Calc weapon BV: ${bd.weaponBV.toFixed(1)}`);

  // What's the gap in total?
  const missingTotal = rr.indexBV - rr.calculatedBV;
  // What portion is from the offensive side? Assume defensive is correct.
  // missing = missingOff only → missingBaseOff = missingOff / SF
  const missingBase = missingTotal / bd.speedFactor;
  console.log(`  Missing total: ${missingTotal}, missing base (÷SF): ${missingBase.toFixed(1)}`);
  console.log(`  Weight bonus (ton): ${ud.tonnage}`);

  // Check: are there rear-facing weapons?
  const rearWeaps = ud.equipment.filter((e: any) => e.rear === true);
  if (rearWeaps.length > 0) {
    console.log(`  ** Rear weapons: ${rearWeaps.map((e: any) => e.id).join(', ')}`);
  }

  // Check crit slots for anything interesting
  if (ud.criticalSlots) {
    const critItems: string[] = [];
    for (const slots of Object.values(ud.criticalSlots)) {
      if (Array.isArray(slots)) for (const s of slots) if (s && typeof s === 'string') critItems.push(s);
    }
    const interesting = critItems.filter(s => {
      const lo = s.toLowerCase();
      return lo.includes('tsm') || lo.includes('ecm') || lo.includes('ppc cap') || lo.includes('tag') ||
        lo.includes('c3') || lo.includes('narc') || lo.includes('apollo') || lo.includes('supercharger') ||
        lo.includes('masc') || lo.includes('stealth') || lo.includes('null-sig') || lo.includes('void-sig') ||
        lo.includes('chameleon') || lo.includes('flail') || lo.includes('hatchet') || lo.includes('sword') ||
        lo.includes('mace') || lo.includes('retractable') || lo.includes('claw') || lo.includes('talon') ||
        lo.includes('vibroblade') || lo.includes('lance') || lo.includes('blue-shield') || lo.includes('watchdog');
    });
    if (interesting.length > 0) {
      console.log(`  ** Interesting crits: ${[...new Set(interesting)].join(', ')}`);
    }

    // Check for TAG
    const hasTAG = critItems.some(s => {
      const lo = s.toLowerCase();
      return (lo.includes('tag') && !lo.includes('targeting') && !lo.includes('vintage'));
    });
    if (hasTAG) console.log('  ** Has TAG in crits');

    // Check for C3
    const hasC3 = critItems.some(s => s.toLowerCase().includes('c3'));
    if (hasC3) console.log('  ** Has C3 in crits');
  }

  // List all equipment
  console.log('  Equipment:');
  for (const eq of ud.equipment) {
    const res = resolveEquipmentBV(eq.id);
    console.log(`    ${eq.id.padEnd(35)} BV=${String(res.battleValue).padStart(4)} heat=${res.heat} loc=${eq.location}${eq.rear ? ' [REAR]' : ''}`);
  }
}
