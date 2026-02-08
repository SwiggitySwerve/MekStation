#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.resolve(basePath, 'index.json'), 'utf-8'));
const reportPath = path.resolve(process.cwd(), 'validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

const unitName = process.argv[2] || 'Albatross ALB-5U';
const iu = indexData.units.find((u: any) => `${u.chassis} ${u.model}` === unitName);
if (!iu) { console.log(`Unit not found: ${unitName}`); process.exit(1); }

const result = report.allResults.find((r: any) => r.unitId === iu.id);
if (!result) { console.log(`No result for ${unitName}`); process.exit(1); }

const unitPath = path.join(basePath, iu.path);
const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));

console.log(`=== ${iu.chassis} ${iu.model} ===`);
console.log(`Index BV: ${iu.bv}, Calculated: ${result.calculatedBV}, Diff: ${result.difference} (${result.percentDiff?.toFixed(1)}%)`);
console.log(`Breakdown: def=${result.breakdown?.defensiveBV} off=${result.breakdown?.offensiveBV}`);
console.log(`  weaponBV=${result.breakdown?.weaponBV} ammoBV=${result.breakdown?.ammoBV} sf=${result.breakdown?.speedFactor} expl=${result.breakdown?.explosivePenalty} defEq=${result.breakdown?.defensiveEquipBV}`);

console.log(`\nWeapon BV resolution:`);
for (const eq of ud.equipment || []) {
  const lo = eq.id.toLowerCase();
  if (lo.includes('ammo') || lo.includes('heat-sink') || lo.includes('targeting') || lo.includes('tsm') || lo.includes('case') || lo.includes('endo') || lo.includes('ferro') || lo.includes('jump') || lo.includes('ecm') || lo.includes('probe') || lo.includes('ams') || lo.includes('shield')) continue;
  
  const res = resolveEquipmentBV(eq.id);
  const norm = normalizeEquipmentId(eq.id);
  console.log(`  ${eq.id.padEnd(30)} → norm=${norm.padEnd(25)} bv=${res.battleValue} heat=${res.heat} resolved=${res.resolved}`);
  
  if (ud.techBase === 'CLAN' || ud.techBase === 'MIXED') {
    const clanId = 'clan-' + norm;
    const clanRes = resolveEquipmentBV(clanId);
    if (clanRes.resolved && clanRes.battleValue !== res.battleValue) {
      console.log(`    → clan: ${clanId.padEnd(25)} bv=${clanRes.battleValue} heat=${clanRes.heat}`);
    }
  }
}

console.log(`\nAmmo resolution:`);
if (ud.criticalSlots) {
  for (const [loc, slots] of Object.entries(ud.criticalSlots)) {
    for (const s of (slots as any[])) {
      if (!s || typeof s !== 'string') continue;
      if (!s.toLowerCase().includes('ammo')) continue;
      const res = resolveEquipmentBV(s);
      console.log(`  ${s.padEnd(40)} @ ${loc.padEnd(12)} bv=${res.battleValue} resolved=${res.resolved}`);
    }
  }
}
