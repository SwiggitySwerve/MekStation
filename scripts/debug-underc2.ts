#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const results = JSON.parse(fs.readFileSync('validation-output/bv-all-results.json', 'utf-8'));
const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));

// Top undercalculated units with very low weapon BV
const underc = results.filter((r: any) => r.cause === 'undercalculation').sort((a: any, b: any) => a.pct - b.pct);

console.log('=== UNDERCALCULATED UNITS WITH LOW WEAPON BV ===');
for (const r of underc.filter((r: any) => r.weapBV < 100).slice(0, 15)) {
  const iu = index.units.find((u: any) => u.id === r.id);
  if (!iu) continue;
  const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
  const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));

  console.log(`\n${r.name} (${ud.techBase} ${ud.tonnage}t) ref=${r.ref} calc=${r.calc} ${r.pct}%`);
  console.log(`  weapBV=${r.weapBV} ammoBV=${r.ammoBV} sf=${r.sf}`);
  console.log(`  Equipment: ${ud.equipment.map((e: any) => `${e.id}@${e.location}`).join(', ')}`);

  // Check weapon resolution
  for (const eq of ud.equipment) {
    const res = resolveEquipmentBV(eq.id);
    if (!res.resolved || res.battleValue === 0) {
      // Try with clan prefix
      const clanRes = resolveEquipmentBV('clan-' + normalizeEquipmentId(eq.id));
      console.log(`  UNRESOLVED: ${eq.id} -> norm=${normalizeEquipmentId(eq.id)} (clan attempt: bv=${clanRes.battleValue})`);
    }
  }

  // Check criticalSlots for weapons
  if (ud.criticalSlots) {
    const weapSlots: string[] = [];
    for (const [loc, slots] of Object.entries(ud.criticalSlots)) {
      for (const s of (slots as any[])) {
        if (!s || typeof s !== 'string') continue;
        const lo = s.toLowerCase();
        if (lo.includes('ammo') || lo.includes('heat sink') || lo.includes('engine') || lo.includes('gyro') ||
            lo.includes('life support') || lo.includes('sensors') || lo.includes('cockpit') ||
            lo.includes('endo') || lo.includes('ferro') || lo.includes('case') ||
            lo.includes('actuator') || lo.includes('shoulder') || lo.includes('hip')) continue;
        weapSlots.push(`${loc}: ${s}`);
      }
    }
    if (weapSlots.length > 0) console.log(`  Crit weapons: ${weapSlots.join('; ')}`);
  }
}

// Also check the Ryoken III pattern (many undercalculated)
console.log('\n\n=== RYOKEN III PATTERN ===');
const ryokenIII = underc.filter((r: any) => r.name.includes('Ryoken III'));
for (const r of ryokenIII) {
  const iu = index.units.find((u: any) => u.id === r.id);
  if (!iu) continue;
  const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
  const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));

  console.log(`\n${r.name} (${ud.techBase} ${ud.tonnage}t) ref=${r.ref} calc=${r.calc} ${r.pct}%`);
  console.log(`  weapBV=${r.weapBV} ammoBV=${r.ammoBV} sf=${r.sf} offBV=${r.offBV} defBV=${r.defBV}`);
  console.log(`  Equipment: ${ud.equipment.map((e: any) => e.id).join(', ')}`);

  // Check unresolved weapons
  for (const eq of ud.equipment) {
    const res = resolveEquipmentBV(eq.id);
    if (!res.resolved || res.battleValue === 0) {
      console.log(`  UNRESOLVED: ${eq.id} (norm: ${normalizeEquipmentId(eq.id)})`);
    }
  }
}
