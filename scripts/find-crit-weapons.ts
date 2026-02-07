#!/usr/bin/env npx tsx
// Check if units have weapons in crit slots that aren't in equipment list
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));

// Check a few specific undercalculated units
const targets = [
  'Locust LCT-7V',       // 3wpn, diff=-20
  'Aquagladius AQS-3',   // 1wpn, diff=-24
  'Grasshopper GHR-7P',  // 5wpn, diff=-45
  'Albatross ALB-5W',    // 8wpn, diff=-57
  'Cicada CDA-4A',       // 3wpn, diff=-47
  'Flea FLE-21',         // 3wpn, diff=-27
];

for (const target of targets) {
  const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === target);
  if (!iu) { console.log(`NOT FOUND: ${target}`); continue; }
  const fp = path.resolve('public/data/units/battlemechs', iu.path);
  const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  const rr = report.allResults.find((r: any) => `${r.chassis} ${r.model}` === target);

  console.log(`\n=== ${target} (diff=${rr?.difference}, ${rr?.percentDiff?.toFixed(1)}%) ===`);

  // Equipment list weapons
  const eqWeapons = ud.equipment.map((e: any) => e.id.toLowerCase());
  console.log(`Equipment: ${eqWeapons.join(', ')}`);

  // Crit slot weapons
  if (ud.criticalSlots) {
    const critItems = new Set<string>();
    for (const [loc, slots] of Object.entries(ud.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (s && typeof s === 'string') critItems.add(s);
      }
    }

    // Try to resolve each crit item as a weapon
    const weaponCrits: string[] = [];
    const nonWeaponCrits: string[] = [];
    const structuralCrits = ['shoulder', 'upper arm', 'lower arm', 'hand actuator', 'hip', 'upper leg', 'lower leg', 'foot actuator', 'life support', 'sensors', 'cockpit', 'gyro', 'fusion engine', 'engine', 'endo steel', 'endo-steel', 'ferro-fibrous', 'ferro fibrous', 'light ferro', 'heavy ferro', 'endo composite', 'heat sink', 'double heat sink', 'jump jet', 'improved jump jet', 'case', 'case ii', 'targeting computer'];

    for (const crit of critItems) {
      const lo = crit.toLowerCase();
      if (structuralCrits.some(s => lo.includes(s))) continue;
      if (lo.includes('ammo')) continue;
      if (lo.includes('-empty-') || lo === '' || lo === '-empty-') continue;

      // Try resolving as weapon
      const res = resolveEquipmentBV(crit);
      if (res.resolved && res.battleValue > 0) {
        weaponCrits.push(`${crit} (BV=${res.battleValue})`);
      } else {
        nonWeaponCrits.push(crit);
      }
    }

    if (weaponCrits.length > 0) {
      console.log(`Weapon crits: ${weaponCrits.join(', ')}`);
    }
    if (nonWeaponCrits.length > 0) {
      console.log(`Non-weapon crits: ${nonWeaponCrits.join(', ')}`);
    }

    // Check: are there weapons in crits NOT in equipment list?
    for (const crit of critItems) {
      const lo = crit.toLowerCase();
      if (structuralCrits.some(s => lo.includes(s))) continue;
      if (lo.includes('ammo')) continue;
      if (lo === '' || lo.includes('-empty-')) continue;

      // Normalize the crit name
      const normCrit = normalizeEquipmentId(lo.replace(/^(is|cl|clan)/, ''));
      const inEquip = eqWeapons.some(ew => {
        const normEq = normalizeEquipmentId(ew.replace(/^(\d+-)?/, '').replace(/^(is|cl|clan)/, ''));
        return normEq === normCrit || ew.includes(normCrit) || normCrit.includes(normalizeEquipmentId(ew.replace(/^(\d+-)?/, '')));
      });

      if (!inEquip) {
        const res = resolveEquipmentBV(crit);
        if (res.resolved && res.battleValue > 0) {
          console.log(`  ** MISSING FROM EQUIPMENT: ${crit} (BV=${res.battleValue})`);
        }
      }
    }
  }
}
