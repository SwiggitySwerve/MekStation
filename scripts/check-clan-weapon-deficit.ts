#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));

// Undercalculated 1-5% CLAN units
const under = report.allResults
  .filter((r: any) => r.percentDiff < -1 && r.percentDiff > -5)
  .slice(0, 30);

// For each, check if any weapons resolve differently with clan- prefix
let clanUpgradeCount = 0;
let totalUpgradeBV = 0;

for (const r of under) {
  const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === `${r.chassis} ${r.model}`);
  if (!iu) continue;
  const fp = path.resolve('public/data/units/battlemechs', iu.path);
  const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  if (ud.techBase !== 'CLAN' && ud.techBase !== 'MIXED') continue;

  let upgrades: string[] = [];
  let totalDiff = 0;
  for (const eq of ud.equipment) {
    const isRes = resolveEquipmentBV(eq.id);
    if (!isRes.resolved || isRes.battleValue === 0) continue;

    // Try clan prefix
    const norm = normalizeEquipmentId(eq.id);
    if (norm.startsWith('clan-')) continue; // Already resolving as Clan

    const clanRes = resolveEquipmentBV('clan-' + norm);
    if (clanRes.resolved && clanRes.battleValue > isRes.battleValue) {
      const diff = clanRes.battleValue - isRes.battleValue;
      upgrades.push(`${eq.id}: IS=${isRes.battleValue} → Clan=${clanRes.battleValue} (+${diff})`);
      totalDiff += diff;
    }
  }

  if (upgrades.length > 0) {
    clanUpgradeCount++;
    totalUpgradeBV += totalDiff;
    console.log(`${r.chassis} ${r.model} (${ud.techBase}) ref=${r.indexBV} calc=${r.calculatedBV} diff=${r.difference} (${r.percentDiff.toFixed(2)}%)`);
    console.log(`  Potential Clan upgrades (+${totalDiff} base BV):`);
    for (const u of upgrades) console.log(`    ${u}`);
  }
}

console.log(`\nSummary: ${clanUpgradeCount}/${under.length} units have weapons resolving as IS instead of Clan`);
console.log(`Total potential BV upgrade: ${totalUpgradeBV}`);
