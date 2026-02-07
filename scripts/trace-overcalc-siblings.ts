import * as fs from 'fs';
import * as path from 'path';

const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = 'public/data/units/battlemechs';
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Find overcalculated units where most siblings are correct
// Compare equipment lists between correct and overcalculated variants of same chassis
const over = r.allResults.filter((x: any) => x.percentDiff > 2 && x.breakdown);

// Group by chassis
const byChassis: Record<string, any[]> = {};
for (const res of r.allResults) {
  const entry = index.units.find((e: any) => e.id === res.unitId);
  if (!entry) continue;
  const ch = entry.chassis;
  if (!byChassis[ch]) byChassis[ch] = [];
  byChassis[ch].push({ ...res, entry });
}

// Find overcalculated units whose chassis has mostly correct variants
const interesting = over.filter((res: any) => {
  const entry = index.units.find((e: any) => e.id === res.unitId);
  if (!entry) return false;
  const siblings = byChassis[entry.chassis];
  if (!siblings || siblings.length < 3) return false;
  const correctCount = siblings.filter((s: any) => Math.abs(s.percentDiff) <= 1).length;
  return correctCount / siblings.length > 0.6; // at least 60% correct
}).sort((a: any, b: any) => b.difference - a.difference);

console.log(`Found ${interesting.length} overcalculated units with mostly-correct siblings\n`);

// For each, compare weapon lists with a correct sibling
for (const res of interesting.slice(0, 15)) {
  const entry = index.units.find((e: any) => e.id === res.unitId);
  if (!entry?.path) continue;
  const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
  const b = res.breakdown;

  // Find a correct sibling
  const siblings = byChassis[entry.chassis];
  const correctSibling = siblings?.find((s: any) => Math.abs(s.percentDiff) <= 1 && s.unitId !== res.unitId);

  console.log(`${'='.repeat(70)}`);
  console.log(`${res.unitId}: ${d.tonnage}t ${d.techBase} diff=+${res.difference} (${res.percentDiff.toFixed(1)}%)`);
  console.log(`  idx=${res.indexBV} calc=${res.calculatedBV}`);
  console.log(`  offBV=${b.offensiveBV?.toFixed(1)} (wep=${b.weaponBV?.toFixed(1)} ammo=${b.ammoBV?.toFixed(1)} speed=${b.speedFactor?.toFixed(3)})`);
  console.log(`  defBV=${(res.calculatedBV - b.offensiveBV).toFixed(1)} (armor=${b.armorBV?.toFixed(1)} struct=${b.structureBV?.toFixed(1)} gyro=${b.gyroBV?.toFixed(1)} defEq=${b.defensiveEquipBV?.toFixed(1)} pen=${b.explosivePenalty} defF=${b.defensiveFactor?.toFixed(2)})`);
  console.log(`  heatDiss=${b.heatDissipation} heatEff=${b.heatEfficiency} moveHeat=${b.moveHeat}`);

  // Show all weapons
  const weapons: string[] = [];
  for (const [loc, slots] of Object.entries(d.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (!s || typeof s !== 'string') continue;
      const lo = s.toLowerCase().replace(/\s*\(omnipod\)/gi, '').trim();
      // Skip structural items
      if (lo.includes('engine') || lo.includes('gyro') || lo.includes('life support') ||
          lo.includes('sensors') || lo.includes('cockpit') || lo.includes('actuator') ||
          lo.includes('heat sink') || lo === '-empty-' || lo.includes('endo') ||
          lo.includes('ferro') || lo.includes('reactive') || lo.includes('reflective') ||
          lo.includes('stealth') || lo.includes('hardened') || lo.includes('light ferro') ||
          lo.includes('heavy ferro') || lo.includes('structure') || lo.includes('armor')) continue;
      // Skip ammo
      if (lo.includes('ammo')) continue;
      // Skip CASE
      if (lo === 'case' || lo === 'case ii' || lo === 'iscaseii' || lo === 'clcaseii') continue;
      // Include everything else (weapons, equipment)
      weapons.push(`${loc}:${s}`);
    }
  }
  console.log(`  equip: ${weapons.join(', ')}`);

  // Check for hatchets, swords, claws, maces
  const physicals = weapons.filter(w => {
    const lo = w.toLowerCase();
    return lo.includes('hatchet') || lo.includes('sword') || lo.includes('claw') ||
           lo.includes('mace') || lo.includes('talons') || lo.includes('retractable blade') ||
           lo.includes('lance') || lo.includes('vibroblade') || lo.includes('chain whip') ||
           lo.includes('battle claw') || lo.includes('backhoe');
  });
  if (physicals.length > 0) console.log(`  PHYSICAL WEAPONS: ${physicals.join(', ')}`);

  // Check what correct sibling looks like
  if (correctSibling) {
    const cs = correctSibling;
    const cb = cs.breakdown;
    if (cb) {
      console.log(`  --- Correct sibling: ${cs.unitId} diff=${cs.difference} (${cs.percentDiff?.toFixed(1)}%)`);
      console.log(`      offBV=${cb.offensiveBV?.toFixed(1)} (wep=${cb.weaponBV?.toFixed(1)} ammo=${cb.ammoBV?.toFixed(1)} speed=${cb.speedFactor?.toFixed(3)})`);
      console.log(`      defBV=${(cs.calculatedBV - cb.offensiveBV).toFixed(1)} defF=${cb.defensiveFactor?.toFixed(2)}`);
    }
  }
  console.log();
}
