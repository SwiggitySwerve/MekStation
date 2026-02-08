import * as fs from 'fs';
import * as path from 'path';

const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = 'public/data/units/battlemechs';
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Trace specific overcalculated units in detail
const targets = [
  'gladiator-a',        // Clan, huge gap
  'man-o-war-e',        // Clan, huge gap
  'black-knight-blk-nt-3a', // IS, no ammo, big gap
  'hatamoto-chi-htm-27t-lowenbrau', // IS Fusion, has CASE, big gap
  'wyvern-wve-5nsl',    // IS Fusion, has CASE, big gap
  'thunderbolt-tdr-5l', // IS Fusion, has CASE in RT
  'vanquisher-vqr-7v-pravuil', // IS Fusion, has CASE
  'vulture-prime',      // Clan, modest gap
];

for (const id of targets) {
  const res = r.allResults.find((x: any) => x.unitId === id);
  if (!res?.breakdown) { console.log(`${id}: NOT FOUND`); continue; }
  const b = res.breakdown;
  const entry = index.units.find((e: any) => e.id === id);
  if (!entry?.path) continue;
  const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));

  console.log(`\n${'='.repeat(70)}`);
  console.log(`${id}: ${d.tonnage}t ${d.techBase} ${d.engine.type} cockpit=${d.cockpit || 'STANDARD'}`);
  console.log(`  idx=${res.indexBV} calc=${res.calculatedBV} diff=${res.difference} (${res.percentDiff.toFixed(1)}%)`);
  console.log(`\nBreakdown:`);
  console.log(`  armorBV=${b.armorBV?.toFixed(1)} structBV=${b.structureBV?.toFixed(1)} gyroBV=${b.gyroBV?.toFixed(1)}`);
  console.log(`  defEquipBV=${b.defensiveEquipBV?.toFixed(1)} explPen=${b.explosivePenalty}`);
  console.log(`  defFactor=${b.defensiveFactor?.toFixed(3)}`);
  console.log(`  defensiveBV=${b.defensiveBV?.toFixed(1)}`);
  console.log(`  offensiveBV=${b.offensiveBV?.toFixed(1)} (weaponBV=${b.weaponBV?.toFixed(1)} ammoBV=${b.ammoBV?.toFixed(1)} speed=${b.speedFactor?.toFixed(3)})`);

  // Calculate what components make up the baseDef
  const baseDef = (b.armorBV || 0) + (b.structureBV || 0) + (b.gyroBV || 0) + b.defensiveEquipBV - b.explosivePenalty;
  console.log(`  baseDef=${baseDef.toFixed(1)} (before defFactor)`);
  console.log(`  defensiveBV recalc = baseDef * defFactor = ${baseDef.toFixed(1)} * ${b.defensiveFactor?.toFixed(3)} = ${(baseDef * (b.defensiveFactor || 1)).toFixed(1)}`);

  // What should baseDef be to match index?
  let cockpitMod = 1.0;
  const cockpit = (d.cockpit || 'STANDARD').toUpperCase();
  if (cockpit.includes('SMALL') || cockpit.includes('TORSO')) cockpitMod = 0.95;
  if (cockpit.includes('INTERFACE')) cockpitMod = 1.3;
  const neededBaseBV = res.indexBV / cockpitMod;
  const neededDefBV = neededBaseBV - b.offensiveBV;
  const neededBaseDef = neededDefBV / (b.defensiveFactor || 1);
  console.log(`\nReverse engineering:`);
  console.log(`  cockpitMod=${cockpitMod} neededBaseBV=${neededBaseBV.toFixed(1)}`);
  console.log(`  neededDefBV = ${neededBaseBV.toFixed(1)} - ${b.offensiveBV.toFixed(1)} = ${neededDefBV.toFixed(1)}`);
  console.log(`  neededBaseDef = ${neededDefBV.toFixed(1)} / ${(b.defensiveFactor || 1).toFixed(3)} = ${neededBaseDef.toFixed(1)}`);
  console.log(`  GAP = neededBaseDef - baseDef = ${neededBaseDef.toFixed(1)} - ${baseDef.toFixed(1)} = ${(neededBaseDef - baseDef).toFixed(1)}`);

  // Armor details
  console.log(`\nArmor: type=${d.armor?.type}`);
  const armorAlloc = d.armor?.allocation || {};
  let totalArmor = 0;
  for (const [loc, val] of Object.entries(armorAlloc)) {
    if (typeof val === 'number') {
      totalArmor += val;
      console.log(`  ${loc}: ${val}`);
    } else if (val && typeof val === 'object') {
      const front = (val as any).front || 0;
      const rear = (val as any).rear || 0;
      totalArmor += front + rear;
      console.log(`  ${loc}: ${front}/${rear}`);
    }
  }
  console.log(`  Total armor: ${totalArmor}`);
  console.log(`  Armor BV per point: ${(b.armorBV || 0) / Math.max(1, totalArmor)}`);

  // Structure details
  console.log(`\nStructure: type=${d.structure?.type || 'STANDARD'}`);
  console.log(`  Movement: walk=${d.movement?.walk} jump=${d.movement?.jump || 0}`);

  // Show issues if any
  if (res.issues?.length) {
    console.log(`\nIssues: ${res.issues.join(', ')}`);
  }
}
