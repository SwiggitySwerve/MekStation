#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const results = JSON.parse(fs.readFileSync('validation-output/bv-all-results.json', 'utf-8'));

// Analyze undercalculation and missing-ammo-bv patterns
const underc = results.filter((r: any) => r.cause === 'undercalculation').sort((a: any, b: any) => a.pct - b.pct);
const missingAmmo = results.filter((r: any) => r.cause === 'missing-ammo-bv').sort((a: any, b: any) => a.pct - b.pct);

console.log(`=== UNDERCALCULATION (${underc.length}) - top 20 ===`);
for (const r of underc.slice(0, 20)) {
  console.log(`  ${r.name.padEnd(40)} ref=${String(r.ref).padStart(5)} calc=${String(r.calc).padStart(5)} ${r.pct}% sf=${r.sf} weapBV=${r.weapBV} ammoBV=${r.ammoBV}`);
}

console.log(`\n=== MISSING-AMMO-BV (${missingAmmo.length}) - top 20 ===`);
for (const r of missingAmmo.slice(0, 20)) {
  console.log(`  ${r.name.padEnd(40)} ref=${String(r.ref).padStart(5)} calc=${String(r.calc).padStart(5)} ${r.pct}% sf=${r.sf} weapBV=${r.weapBV} ammoBV=${r.ammoBV}`);
}

// Check unit data for some missing-ammo-bv units
const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
console.log(`\n=== MISSING AMMO DETAILS ===`);
for (const r of missingAmmo.slice(0, 5)) {
  const iu = index.units.find((u: any) => u.id === r.id);
  if (!iu) continue;
  const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
  const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));

  console.log(`\n${r.name} (${ud.techBase} ${ud.tonnage}t):`);
  console.log(`  Equipment: ${ud.equipment.map((e: any) => e.id).join(', ')}`);

  // Find ammo in crits
  if (ud.criticalSlots) {
    const ammoSlots: string[] = [];
    for (const [loc, slots] of Object.entries(ud.criticalSlots)) {
      for (const s of (slots as any[])) {
        if (s && typeof s === 'string' && s.toLowerCase().includes('ammo')) {
          ammoSlots.push(`${loc}: ${s}`);
        }
      }
    }
    console.log(`  Ammo in crits: ${ammoSlots.join('; ')}`);
  }
}

// Also analyze overcalculation patterns
const overc = results.filter((r: any) => r.cause === 'overcalculation').sort((a: any, b: any) => b.pct - a.pct);
console.log(`\n=== OVERCALCULATION (${overc.length}) - top 15 ===`);
for (const r of overc.slice(0, 15)) {
  console.log(`  ${r.name.padEnd(40)} ref=${String(r.ref).padStart(5)} calc=${String(r.calc).padStart(5)} +${r.pct}% sf=${r.sf} weapBV=${r.weapBV} ammoBV=${r.ammoBV} defBV=${Math.round(r.defBV)}`);
}
