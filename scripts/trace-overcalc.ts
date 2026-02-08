/**
 * Deep trace overcalculated units near the 1% threshold.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver.ts';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

// Check equipment BV resolution
console.log('=== Equipment BV Resolution ===');
const eqIds = [
  'ISAngelECMSuite', 'BloodhoundActiveProbe', 'CLECMSuite',
  'guardian-ecm', 'angel-ecm', 'bloodhound-active-probe', 'clan-ecm',
  'CLTargetingComputer',
];
for (const id of eqIds) {
  const r = resolveEquipmentBV(id);
  console.log(`  ${id.padEnd(30)} -> norm="${normalizeEquipmentId(id)}" bv=${r.battleValue} resolved=${r.resolved}`);
}

// Check ammo normalization
console.log('\n=== Ammo Name Normalization ===');
const ammoNames = [
  'IS Streak SRM 4 Ammo', 'IS Streak SRM 6 Ammo', 'IS Streak SRM 2 Ammo',
  'Clan Streak SRM 4 Ammo', 'Clan Streak SRM 2 Ammo', 'Clan Streak SRM 6 Ammo',
  'IS Ultra AC/10 Ammo', 'IS Ammo MML-5 LRM', 'IS Ammo MML-5 SRM',
  'IS Streak SRM 6 Ammo',
];
for (const id of ammoNames) {
  console.log(`  "${id}" -> "${normalizeEquipmentId(id)}"`);
}

const ids = [
  'valkyrie-vlk-qt2', 'doloire-dlr-od', 'goshawk-ii-2', 'kabuto-kbo-7a',
  'beowulf-beo-x-7a', 'seraph-c-srp-o-invictus', 'cudgel-cdg-2a', 'starslayer-sty-2c-ec',
];

for (const unitId of ids) {
  const result = report.allResults.find((x: any) => x.unitId === unitId);
  const unit = loadUnit(unitId);
  if (!result || !unit) { console.log(`${unitId}: not found`); continue; }
  const b = result.breakdown || {};

  console.log(`\n${'='.repeat(70)}`);
  console.log(`${unitId} — ref=${result.indexBV} calc=${result.calculatedBV} diff=${result.difference > 0 ? '+' : ''}${result.difference} (${result.percentDiff?.toFixed(2)}%)`);
  console.log(`  ${unit.tonnage}t ${unit.techBase} engine=${unit.engine?.type}/${unit.engine?.rating} walk=${unit.movement?.walk} jump=${unit.movement?.jump||0}`);
  console.log(`  armor=${unit.armor?.type} struct=${unit.structure?.type||'STANDARD'} cockpit=${unit.cockpit||'(none)'} gyro=${unit.gyro?.type||'STANDARD'}`);
  console.log(`  HS: ${unit.heatSinks?.count}x ${unit.heatSinks?.type}`);

  // HEAD analysis
  const headSlots = unit.criticalSlots?.HEAD;
  if (Array.isArray(headSlots)) {
    const lsCount = headSlots.filter((s: string | null) => s && s.includes('Life Support')).length;
    const slot4 = headSlots[3];
    console.log(`  HEAD: [${headSlots.join(', ')}]`);
    console.log(`  HEAD analysis: LS count=${lsCount}, slot4="${slot4}", isSensors=${slot4?.includes?.('Sensors')}`);
    if (slot4?.includes?.('Sensors') && lsCount === 1) {
      console.log(`  ** SMALL COCKPIT HEURISTIC TRIGGERED (LS=1, slot4=Sensors) **`);
    }
  }

  // Ammo entries from crits
  console.log(`  --- Ammo in Crits ---`);
  for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (typeof s === 'string' && s.toLowerCase().includes('ammo')) {
        const clean = s.replace(/\s*\(omnipod\)/gi, '').replace(/\s*\(OMNIPOD\)/gi, '').trim();
        const norm = normalizeEquipmentId(clean);
        console.log(`    ${loc}: "${clean}" -> norm="${norm}"`);
      }
    }
  }

  // BV details
  console.log(`  --- BV Breakdown ---`);
  console.log(`  DEF: armor=${b.armorBV?.toFixed(1)} struct=${b.structureBV?.toFixed(3)} gyro=${b.gyroBV?.toFixed(1)} defEq=${b.defEquipBV?.toFixed(0)} armoredComp=${b.armoredComponentBV} harjel=${b.harjelBonus} exp=-${b.explosivePenalty?.toFixed(0)}`);
  console.log(`       DF=${b.defensiveFactor} maxTMM=${b.maxTMM} → defBV=${b.defensiveBV?.toFixed(1)}`);
  console.log(`  OFF: weap=${b.weaponBV?.toFixed(1)} (raw=${b.rawWeaponBV?.toFixed(1)}, halved=${b.halvedWeaponBV?.toFixed(1)}) ammo=${b.ammoBV} phys=${b.physicalWeaponBV?.toFixed(1)} wt=${b.weightBonus?.toFixed(1)} offEq=${b.offEquipBV?.toFixed(0)}`);
  console.log(`       HE=${b.heatEfficiency} HD=${b.heatDissipation} MH=${b.moveHeat} SF=${b.speedFactor}`);
  console.log(`       walk=${b.walkMP} run=${b.runMP} jump=${b.jumpMP}`);
  console.log(`       → offBV=${b.offensiveBV?.toFixed(1)}`);
  console.log(`  cockpit=${b.cockpitType} mod=${b.cockpitModifier}`);
  console.log(`  base=(${b.defensiveBV?.toFixed(1)} + ${b.offensiveBV?.toFixed(1)}) = ${((b.defensiveBV||0) + (b.offensiveBV||0)).toFixed(1)}`);
  console.log(`  final=round(${((b.defensiveBV||0) + (b.offensiveBV||0)).toFixed(1)} * ${b.cockpitModifier}) = ${result.calculatedBV}`);

  // Physical weapon analysis
  if (b.physicalWeaponBV > 0) {
    console.log(`  --- Physical Weapons ---`);
    for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (typeof s === 'string') {
          const lo = s.toLowerCase().replace(/\s*\(omnipod\)/gi, '');
          if (['mace', 'hatchet', 'sword', 'claw', 'isclaw', 'retractable blade', 'vibroblade', 'islargevibroblade', 'ismediumvibroblade', 'issmallvibroblade', 'lance', 'flail', 'talon'].some(w => lo.includes(w))) {
            console.log(`    ${loc}: "${s}"`);
          }
        }
      }
    }
  }

  // Equipment list
  console.log(`  --- Equipment ---`);
  for (const eq of (unit.equipment || [])) {
    console.log(`    ${eq.location}: ${eq.id}`);
  }
}
