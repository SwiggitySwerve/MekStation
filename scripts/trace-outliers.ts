import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));

// Focus on units outside 5%
const outside5 = report.allResults.filter((r: any) => Math.abs(r.percentDiff) > 5);

// For each, load unit data and compare crits vs equipment
for (const r of outside5.sort((a: any, b: any) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff)).slice(0, 15)) {
  const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
  const entry = idx.units.find((u: any) => u.id === r.unitId);
  if (!entry?.path) continue;
  const unit = JSON.parse(fs.readFileSync(path.resolve('public/data/units/battlemechs', entry.path), 'utf-8'));

  const equipIds = new Set((unit.equipment || []).map((e: any) => e.id));

  // Find equipment-like items in crits that aren't in equipment array
  const critOnlyItems: string[] = [];
  const allSlots = Object.entries(unit.criticalSlots || {});
  for (const [loc, slots] of allSlots) {
    if (!Array.isArray(slots)) continue;
    let prev = '';
    for (const s of slots) {
      if (!s || typeof s !== 'string') { prev = ''; continue; }
      const lo = s.replace(/\s*\(omnipod\)/gi, '').replace(/\s*\(ARMORED\)/gi, '').trim().toLowerCase();
      // Skip structural items
      if (lo.includes('shoulder') || lo.includes('actuator') || lo.includes('hip') ||
          lo.includes('engine') || lo.includes('gyro') || lo.includes('heat sink') || lo.includes('heatsink') ||
          lo.includes('jump jet') || lo.includes('endo') || lo.includes('ferro') ||
          lo.includes('life support') || lo.includes('sensors') || lo.includes('cockpit') ||
          lo === prev || lo.includes('ammo') || lo.includes('case') ||
          lo.includes('tsm') || lo.includes('masc') || lo.includes('supercharger') ||
          lo.includes('stealth') || lo.includes('null sig') || lo.includes('void sig') ||
          lo.includes('chameleon') || lo.includes('radical') || lo.includes('targeting computer') ||
          lo.includes('artemis') || lo.includes('apollo') || lo.includes('ppc capacitor') ||
          lo.includes('coolant') || lo.includes('harjel') || lo.includes('mechanic')) {
        prev = lo;
        continue;
      }
      // This is a non-structural crit item - check if it's a weapon or equipment
      prev = lo;
      critOnlyItems.push(`${loc}: ${s}`);
    }
  }

  const dir = r.percentDiff > 0 ? 'OVER' : 'UNDER';
  const bd = r.breakdown;
  console.log(`\n${r.chassis} ${r.model} (${r.tonnage}t ${unit.techBase}): ref=${r.indexBV} calc=${r.calculatedBV} (${r.percentDiff > 0 ? '+' : ''}${r.percentDiff.toFixed(1)}%) ${dir}`);
  console.log(`  cockpit=${bd.cockpitType} sf=${bd.speedFactor} defBV=${bd.defensiveBV?.toFixed(0)} offBV=${bd.offensiveBV?.toFixed(0)}`);
  console.log(`  weapBV=${bd.weaponBV?.toFixed(0)} rawWeapBV=${bd.rawWeaponBV?.toFixed(0)} halved=${bd.halvedWeaponBV?.toFixed(0)} ammoBV=${bd.ammoBV?.toFixed(0)} explPen=${bd.explosivePenalty}`);
  console.log(`  Equipment IDs: ${[...equipIds].join(', ')}`);
  console.log(`  Crit-only items (${critOnlyItems.length}):`);
  for (const item of critOnlyItems.slice(0, 15)) {
    console.log(`    ${item}`);
  }
}
