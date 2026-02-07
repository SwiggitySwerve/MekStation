import * as fs from 'fs';
import * as path from 'path';

const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = 'public/data/units/battlemechs';
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Check heat dissipation for overcalculated units
const targets = [
  'thunderbolt-tdr-5l', 'hatamoto-chi-htm-27t-lowenbrau', 'wyvern-wve-5nsl',
  'vulture-prime', 'man-o-war-e', 'gladiator-a',
  'jenner-jr7-d-webster', 'battle-cobra-btl-c-2oc',
];

for (const id of targets) {
  const entry = index.units.find((e: any) => e.id === id);
  if (!entry?.path) continue;
  const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
  const res = r.allResults.find((x: any) => x.unitId === id);
  const b = res?.breakdown;

  const engineRating = d.engine.rating;
  const engineIntegrated = Math.min(10, Math.floor(engineRating / 25));
  const hsType = d.heatSinks.type;
  const hsCount = d.heatSinks.count;
  const isDHS = hsType.toUpperCase().includes('DOUBLE') || hsType.toUpperCase().includes('LASER');

  // Count DHS in crits
  let dhsCritSlots = 0;
  let shsCritSlots = 0;
  const isClanTech = d.techBase === 'CLAN';
  for (const [, slots] of Object.entries(d.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (!s || typeof s !== 'string') continue;
      const lo = s.replace(/\s*\(omnipod\)/gi, '').trim().toLowerCase();
      if (lo.includes('double heat sink') || lo === 'isdoubleheatsink' || lo === 'cldoubleheatsink') {
        dhsCritSlots++;
      } else if (lo === 'heat sink' || lo === 'isheatsink' || lo === 'clheatsink') {
        shsCritSlots++;
      }
    }
  }
  const slotsPerDHS = isClanTech ? 2 : 3;
  const critDHS = Math.round(dhsCritSlots / slotsPerDHS);
  const critSHS = shsCritSlots; // 1 slot each

  const critTotal = engineIntegrated + critDHS + critSHS;
  const effectiveCount = Math.max(hsCount, critTotal);
  const diss = effectiveCount * (isDHS ? 2 : 1);

  // Compute weapon heat
  let totalWeaponHeat = 0;
  for (const eq of d.equipment || []) {
    // simplified heat lookup... just show the data
  }

  console.log(`${id}: ${d.tonnage}t ${d.techBase} engine=${d.engine.type}`);
  console.log(`  HS type=${hsType} count=${hsCount} isDHS=${isDHS}`);
  console.log(`  Engine rating=${engineRating} integrated=${engineIntegrated}`);
  console.log(`  Crit DHS slots=${dhsCritSlots} (${critDHS} DHS), Crit SHS slots=${shsCritSlots}`);
  console.log(`  critTotal=${critTotal} effectiveCount=${effectiveCount}`);
  console.log(`  dissipation=${diss}`);
  if (b) {
    const walk = d.movement.walk;
    const run = Math.ceil(walk * 1.5);
    const jump = d.movement.jump || 0;
    const moveHeat = Math.max(2, jump > 0 ? Math.max(3, jump) : 2);
    const heatEff = 6 + diss - moveHeat;
    console.log(`  heatEfficiency=${heatEff} (6 + ${diss} - ${moveHeat})`);
    console.log(`  weaponBV=${b.weaponBV} offBV=${b.offensiveBV} speed=${b.speedFactor}`);
    console.log(`  diff=${res.difference} (${res.percentDiff?.toFixed(1)}%)`);
  }
  console.log();
}
