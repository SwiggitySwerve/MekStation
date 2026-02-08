#!/usr/bin/env npx tsx
// Trace why Clan weapons resolve to IS BV in calculateUnitBV
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));

// Load Archer C 2 - known undercalculated CLAN unit
const target = 'Archer C 2';
const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === target);
if (!iu) { console.log('NOT FOUND'); process.exit(1); }
const fp = path.resolve('public/data/units/battlemechs', iu.path);
const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));

console.log(`Unit: ${target}, techBase: ${ud.techBase}`);
console.log(`Equipment:`);
for (const eq of ud.equipment) {
  console.log(`  id: "${eq.id}" location: ${eq.location}`);
}

// Now simulate resolveWeaponForUnit exactly as in validate-bv.ts
function resolveWeaponForUnit(id: string, techBase: string, isClanEquip?: boolean) {
  const lo = id.toLowerCase().replace(/^\d+-/, '');
  const isResult = resolveEquipmentBV(id);

  console.log(`  resolveWeaponForUnit("${id}", "${techBase}", ${isClanEquip})`);
  console.log(`    lo="${lo}", isResult: resolved=${isResult.resolved} BV=${isResult.battleValue}`);

  const enterClan = techBase === 'CLAN' || isClanEquip || (techBase === 'MIXED' && (lo.startsWith('clan-') || lo.startsWith('cl-') || lo.startsWith('cl ')));
  console.log(`    enterClanBranch=${enterClan} (techBase==='CLAN': ${techBase === 'CLAN'}, isClanEquip: ${!!isClanEquip})`);

  if (enterClan) {
    const normalizedIS = normalizeEquipmentId(lo);
    const candidates: string[] = [];
    if (!normalizedIS.startsWith('clan-')) candidates.push('clan-' + normalizedIS);
    if (!lo.startsWith('clan-') && lo !== normalizedIS) candidates.push('clan-' + lo);
    console.log(`    normalizedIS="${normalizedIS}", candidates=${JSON.stringify(candidates)}`);

    for (const cid of candidates) {
      const cr = resolveEquipmentBV(cid);
      console.log(`    candidate "${cid}": resolved=${cr.resolved} BV=${cr.battleValue}`);
      if (cr.resolved && cr.battleValue > 0) {
        if (!isResult.resolved || cr.battleValue > isResult.battleValue) {
          console.log(`    => RETURNING Clan BV=${cr.battleValue}`);
          return cr;
        }
        if (isResult.battleValue === cr.battleValue) {
          console.log(`    => RETURNING Clan BV=${cr.battleValue} (equal)`);
          return cr;
        }
        console.log(`    => NOT returning: cr.bv(${cr.battleValue}) <= isResult.bv(${isResult.battleValue})`);
      }
    }
  }

  if (isResult.resolved && isResult.battleValue > 0) {
    console.log(`    => RETURNING IS BV=${isResult.battleValue}`);
    return isResult;
  }
  console.log(`    => UNRESOLVED`);
  return isResult;
}

console.log('\n--- Weapon resolution trace ---');
for (const eq of ud.equipment) {
  const lo = eq.id.toLowerCase();
  // Skip non-weapons (simplified)
  if (lo.includes('ammo') || lo.includes('heatsink') || lo.includes('heat-sink') || lo.includes('endo') || lo.includes('ferro') || lo.includes('case') || lo.includes('artemis') || lo.includes('targeting') || lo.includes('ecm') || lo.includes('bap') || lo.includes('probe') || lo.includes('c3') || lo.includes('masc') || lo.includes('tsm') || lo.includes('jump')) continue;

  console.log(`\nWeapon: ${eq.id}`);
  resolveWeaponForUnit(eq.id, ud.techBase);
}
