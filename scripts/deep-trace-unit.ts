#!/usr/bin/env npx tsx
// Deep trace a specific unit's BV calculation vs MegaMek reference
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';
import { getArmorBVMultiplier, getStructureBVMultiplier, getGyroBVMultiplier, getEngineBVMultiplier } from '../src/types/validation/BattleValue';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));

// Pick undercalculated IS units
const targets = [
  'Cerberus MR-7K',        // IS, diff=-103 (-4.7%)
  'Argus AGS-5D',          // IS, diff=-81 (-3.9%)
  'Blitzkrieg BTZ-4F',     // IS, diff=-63 (-3.6%)
  'Chameleon CLN-8V',      // IS, diff=-62 (-4.3%)
  'BattleMaster BLR-10S',  // IS, diff=-60 (-3.1%)
];

for (const target of targets) {
  const [chassis, model] = target.includes(' ') ? [target.substring(0, target.lastIndexOf(' ')), target.substring(target.lastIndexOf(' ') + 1)] : [target, ''];

  const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === target);
  if (!iu) { console.log(`NOT FOUND: ${target}`); continue; }
  const fp = path.resolve('public/data/units/battlemechs', iu.path);
  const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));

  const rr = report.allResults.find((r: any) => `${r.chassis} ${r.model}` === target);
  if (!rr) { console.log(`NOT IN REPORT: ${target}`); continue; }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`${target} (${ud.tonnage}t, ${ud.techBase}) ref=${rr.indexBV} calc=${rr.calculatedBV} diff=${rr.difference} (${rr.percentDiff.toFixed(2)}%)`);
  console.log(`Engine: ${ud.engine.type} ${ud.engine.rating}`);
  console.log(`Walk/Run/Jump: ${ud.movement.walk}/${Math.ceil(ud.movement.walk * 1.5)}/${ud.movement.jump || 0}`);
  console.log(`Heat Sinks: ${ud.heatSinks.count} ${ud.heatSinks.type}`);
  console.log(`Armor: ${ud.armor.type}, Structure: ${ud.structure.type}`);
  console.log(`Cockpit: ${ud.cockpit}, Gyro: ${ud.gyro.type}`);

  if (rr.breakdown) {
    const bd = rr.breakdown;
    console.log(`Breakdown: defBV=${bd.defensiveBV.toFixed(1)} offBV=${bd.offensiveBV.toFixed(1)} weapBV=${bd.weaponBV.toFixed(1)} ammoBV=${bd.ammoBV.toFixed(1)} sf=${bd.speedFactor.toFixed(3)} explPen=${bd.explosivePenalty} defEquip=${bd.defensiveEquipBV || 0}`);
  }
  if (rr.issues && rr.issues.length > 0) console.log(`Issues: ${rr.issues.join('; ')}`);

  // List all equipment and their BV resolution
  console.log('Equipment:');
  for (const eq of ud.equipment) {
    const res = resolveEquipmentBV(eq.id);
    // Also try clan version
    const norm = normalizeEquipmentId(eq.id.toLowerCase());
    const clanRes = !norm.startsWith('clan-') ? resolveEquipmentBV('clan-' + norm) : { resolved: false, battleValue: 0 };

    const clanNote = clanRes.resolved && clanRes.battleValue > res.battleValue ? ` (CLAN: ${clanRes.battleValue})` : '';
    console.log(`  ${eq.id.padEnd(35)} loc=${eq.location.padEnd(12)} BV=${res.battleValue} heat=${res.heat || 0} resolved=${res.resolved}${clanNote}`);
  }

  // Check for MASC/Supercharger
  const eqIds = ud.equipment.map((e: any) => e.id.toLowerCase()).join(' ');
  console.log(`Has MASC: ${eqIds.includes('masc')}, Has Supercharger: ${eqIds.includes('supercharger')}, Has TSM: ${eqIds.includes('tsm')}`);
}
