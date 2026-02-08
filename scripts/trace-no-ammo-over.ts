import * as fs from 'fs';
import * as path from 'path';

const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = 'public/data/units/battlemechs';
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Find overcalculated units where the issue is purely defensive
// Focus on units with NO ammo to eliminate penalty confusion
const targets = r.allResults.filter((x: any) => {
  if (x.percentDiff <= 1 || !x.breakdown) return false;
  const b = x.breakdown;
  // Check raw offensive is consistent
  const entry = index.units.find((e: any) => e.id === x.unitId);
  if (!entry?.path) return false;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    // No ammo anywhere
    const allSlots: string[] = [];
    for (const [, slots] of Object.entries(d.criticalSlots || {})) {
      for (const s of (slots as (string | null)[])) {
        if (s && typeof s === 'string') allSlots.push(s.toLowerCase());
      }
    }
    if (allSlots.some(s => s.includes('ammo'))) return false;
    return true;
  } catch { return false; }
}).sort((a: any, b: any) => b.percentDiff - a.percentDiff);

console.log(`Overcalculated units with NO ammo: ${targets.length}\n`);

for (const res of targets.slice(0, 15)) {
  const b = res.breakdown;
  const entry = index.units.find((e: any) => e.id === res.unitId);
  if (!entry?.path) continue;
  const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));

  const baseDef = (b.armorBV || 0) + (b.structureBV || 0) + (b.gyroBV || 0) + b.defensiveEquipBV - b.explosivePenalty;

  console.log(`${res.unitId}: ${d.tonnage}t ${d.techBase} ${d.engine.type} diff=+${res.difference} (${res.percentDiff.toFixed(1)}%)`);
  console.log(`  idx=${res.indexBV} calc=${res.calculatedBV}`);
  console.log(`  armorBV=${b.armorBV?.toFixed(1)} structBV=${b.structureBV?.toFixed(1)} gyroBV=${b.gyroBV?.toFixed(1)} defEquip=${b.defensiveEquipBV?.toFixed(1)} pen=${b.explosivePenalty}`);
  console.log(`  defFactor=${b.defensiveFactor?.toFixed(2)} offBV=${b.offensiveBV?.toFixed(1)} (wep=${b.weaponBV?.toFixed(1)} speed=${b.speedFactor?.toFixed(3)})`);
  console.log(`  armor=${d.armor?.type} struct=${d.structure?.type} cockpit=${d.cockpit || 'STANDARD'}`);
  console.log(`  walk=${d.movement?.walk} jump=${d.movement?.jump || 0}`);

  // Show what crits contribute to defEquipBV
  const defItems: string[] = [];
  for (const [loc, slots] of Object.entries(d.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (!s || typeof s !== 'string') continue;
      const lo = s.toLowerCase().replace(/\s*\(omnipod\)/gi, '').trim();
      if (lo.includes('ams') || lo.includes('ecm') || lo.includes('shield') || lo.includes('probe') ||
          lo.includes('bloodhound') || lo.includes('tag') || lo.includes('null') || lo.includes('void') ||
          lo.includes('chameleon') || lo.includes('watchdog') || lo.includes('armored component') ||
          lo.includes('blue shield') || lo.includes('angel')) {
        defItems.push(`${loc}: ${s}`);
      }
    }
  }
  if (defItems.length > 0) console.log(`  defEquip crits: ${defItems.join(', ')}`);
  if (d.equipment?.length) {
    const eqNames = d.equipment.map((e: any) => `${e.id}@${e.location}`).join(', ');
    console.log(`  equipment: ${eqNames}`);
  }
  console.log();
}
