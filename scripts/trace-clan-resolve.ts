#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));

// Find a CLAN unit that's undercalculated
const under = report.allResults
  .filter((r: any) => r.percentDiff < -1 && r.percentDiff > -5)
  .slice(0, 50);

for (const r of under) {
  const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === `${r.chassis} ${r.model}`);
  if (!iu) continue;
  const fp = path.resolve('public/data/units/battlemechs', iu.path);
  const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  if (ud.techBase !== 'CLAN') continue;

  console.log(`\n=== ${r.chassis} ${r.model} (${ud.techBase}) ref=${r.indexBV} calc=${r.calculatedBV} diff=${r.difference} (${r.percentDiff.toFixed(2)}%) ===`);

  // Trace weapon resolution exactly as validate-bv.ts does it
  for (const eq of ud.equipment) {
    const lo = eq.id.toLowerCase().replace(/^\d+-/, '');
    const isResult = resolveEquipmentBV(eq.id);

    // Simulate the Clan resolution branch
    const normalizedIS = normalizeEquipmentId(lo);
    const candidates: string[] = [];
    if (!normalizedIS.startsWith('clan-')) candidates.push('clan-' + normalizedIS);
    if (!lo.startsWith('clan-') && lo !== normalizedIS) candidates.push('clan-' + lo);

    let clanBV = 0;
    let clanResolved = false;
    for (const cid of candidates) {
      const cr = resolveEquipmentBV(cid);
      if (cr.resolved && cr.battleValue > 0) {
        if (!isResult.resolved || cr.battleValue > isResult.battleValue) {
          clanBV = cr.battleValue;
          clanResolved = true;
          break;
        }
        if (isResult.battleValue === cr.battleValue) {
          clanBV = cr.battleValue;
          clanResolved = true;
          break;
        }
      }
    }

    if (clanResolved && clanBV !== isResult.battleValue) {
      console.log(`  ${eq.id.padEnd(30)} IS_BV=${isResult.battleValue} Clan_BV=${clanBV} candidates=${JSON.stringify(candidates)} norm=${normalizedIS}`);
    }
  }

  // Only show first 3
  break;
}

// Now trace what the ACTUAL validate-bv resolveWeaponForUnit does for a specific weapon
console.log('\n\n=== Direct resolution tests ===');
const tests = ['medium-pulse-laser', 'er-large-laser', 'lrm-20', 'streak-srm-4'];
for (const id of tests) {
  const lo = id.toLowerCase().replace(/^\d+-/, '');
  const isResult = resolveEquipmentBV(id);
  const normalizedIS = normalizeEquipmentId(lo);
  const candidates: string[] = [];
  if (!normalizedIS.startsWith('clan-')) candidates.push('clan-' + normalizedIS);
  if (!lo.startsWith('clan-') && lo !== normalizedIS) candidates.push('clan-' + lo);

  console.log(`${id}: IS resolved=${isResult.resolved} IS_BV=${isResult.battleValue}`);
  for (const cid of candidates) {
    const cr = resolveEquipmentBV(cid);
    console.log(`  candidate '${cid}': resolved=${cr.resolved} BV=${cr.battleValue}`);
    if (cr.resolved && cr.battleValue > 0) {
      console.log(`  CONDITION: cr.bv(${cr.battleValue}) > isResult.bv(${isResult.battleValue}) = ${cr.battleValue > isResult.battleValue}`);
      console.log(`  Would return Clan: ${(!isResult.resolved || cr.battleValue > isResult.battleValue)}`);
    }
  }
}
