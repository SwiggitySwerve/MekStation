import * as fs from 'fs';
import * as path from 'path';

const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = 'public/data/units/battlemechs';
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Trace: overcalculated units where our explosive penalty is 0 but should be > 0
const targets = [
  'thunderbolt-tdr-5l', 'hatamoto-chi-htm-27t-lowenbrau', 'wyvern-wve-5nsl',
  'vanquisher-vqr-7v-pravuil', 'vulture-prime', 'man-o-war-e',
  'mauler-mal-3k', 'seraph-c-srp-oe-eminus',
];

for (const id of targets) {
  const res = r.allResults.find((x: any) => x.unitId === id);
  if (!res?.breakdown) { console.log(`${id}: NOT FOUND`); continue; }
  const b = res.breakdown;
  const entry = index.units.find((e: any) => e.id === id);
  if (!entry?.path) continue;
  const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${id}: ${d.tonnage}t ${d.techBase} ${d.engine.type}`);
  console.log(`  idx=${res.indexBV} calc=${res.calculatedBV} diff=${res.difference} (${res.percentDiff.toFixed(1)}%)`);
  console.log(`  pen=${b.explosivePenalty}`);

  // Show ALL crit slots with ammo and CASE
  for (const [loc, slots] of Object.entries(d.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    const ammo: string[] = [];
    const caseItems: string[] = [];
    const explosive: string[] = [];
    for (const s of slots) {
      if (!s || typeof s !== 'string') continue;
      const lo = s.toLowerCase().replace(/\s*\(omnipod\)/gi, '').trim();
      if (lo.includes('ammo')) ammo.push(s);
      if (lo.includes('case')) caseItems.push(s);
      // Check for explosive equipment
      if (lo.includes('gauss') && !lo.includes('ammo')) explosive.push(`GAUSS:${s}`);
    }
    if (ammo.length > 0 || caseItems.length > 0 || explosive.length > 0) {
      console.log(`  ${loc}:`);
      for (const a of ammo) console.log(`    AMMO: ${a}`);
      for (const c of caseItems) console.log(`    CASE: ${c}`);
      for (const e of explosive) console.log(`    EXPLOSIVE: ${e}`);
    }
  }

  // What SHOULD the penalty be?
  let cockpitMod = 1.0;
  const cockpit = (d.cockpit || 'STANDARD').toUpperCase();
  if (cockpit.includes('SMALL') || cockpit.includes('TORSO')) cockpitMod = 0.95;
  if (cockpit.includes('INTERFACE')) cockpitMod = 1.3;
  const neededBaseBV = res.indexBV / cockpitMod;
  const neededDefBV = neededBaseBV - b.offensiveBV;
  const baseDef = (b.armorBV || 0) + (b.structureBV || 0) + (b.gyroBV || 0) + b.defensiveEquipBV;
  const neededBaseDef = neededDefBV / (b.defensiveFactor || 1);
  const neededPenalty = baseDef - neededBaseDef;
  console.log(`  neededPenalty=${neededPenalty.toFixed(0)} (baseDef=${baseDef.toFixed(0)} neededBaseDef=${neededBaseDef.toFixed(0)})`);
}
