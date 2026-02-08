/**
 * Trace ammo resolution for undercalculated units.
 * Check exactly which ammo slots resolve and which don't.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, resolveAmmoBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const under = valid.filter((x: any) => x.percentDiff < -1 && x.breakdown);

// resolveAmmoByPattern replica from validate-bv.ts
function normalizeWeaponKey(id: string): string {
  let s = id.toLowerCase().replace(/^clan-/, '').replace(/^cl(?!uster)/, '').replace(/^\d+-/, '').replace(/prototype-?/g, '');
  const aliases: [RegExp, string][] = [
    [/^(?:is)?ultra-?ac-?(\d+)$/, 'uac-$1'], [/^(?:is)?ultraac(\d+)$/, 'uac-$1'],
    [/^(?:is)?lb-?(\d+)-?x-?ac$/, 'lb-$1-x-ac'], [/^(?:is)?lbxac(\d+)$/, 'lb-$1-x-ac'],
    [/^(?:is)?autocannon-?(\d+)$/, 'ac-$1'], [/^(?:is)?ac-?(\d+)$/, 'ac-$1'],
    [/^(?:is)?lrm-?(\d+)$/, 'lrm-$1'], [/^(?:is)?srm-?(\d+)$/, 'srm-$1'],
    [/^(?:is)?mrm-?(\d+)$/, 'mrm-$1'], [/^(?:is)?mml-?(\d+)$/, 'mml-$1'],
    [/^(?:is)?atm-?(\d+)$/, 'atm-$1'],
    [/^(?:is)?streak-?srm-?(\d+)$/, 'streak-srm-$1'],
    [/^(?:is)?hag-?(\d+)$/, 'hag-$1'],
    [/^(?:is)?gauss-?rifle$/, 'gauss-rifle'],
    [/^(?:is)?iatm-?(\d+)$/, 'iatm-$1'],
    [/^(?:is)?rac-?(\d+)$/, 'rac-$1'],
  ];
  for (const [re, rep] of aliases) { if (re.test(s)) return s.replace(re, rep); }
  return s;
}

// Trace specific units
const traceUnits = [
  'atlas-c', 'battlemaster-c', 'amarok-3', 'centurion-cn9-d',
  'hatchetman-hct-3f-austin', 'enfield-end-6j-ec',
  'banshee-bnc-11x', 'cataphract-ctf-0x',
  'turkina-z', 'barghest-bgs-4t',
];

for (const uid of traceUnits) {
  const unit = loadUnit(uid);
  const result = under.find((r: any) => r.unitId === uid) || valid.find((r: any) => r.unitId === uid);
  if (!unit || !result) { console.log(`\n${uid}: NOT FOUND`); continue; }

  const b = result.breakdown;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${uid} (${unit.techBase}, ${unit.tonnage}t) gap=${result.difference} (${result.percentDiff?.toFixed(1)}%)`);
  console.log(`  ammoBV=${b?.ammoBV ?? 'N/A'} weaponBV=${b?.weaponBV?.toFixed(0) ?? 'N/A'}`);

  // List all ammo from equipment
  const equipAmmo = unit.equipment.filter((eq: any) => eq.id.toLowerCase().includes('ammo'));
  if (equipAmmo.length > 0) {
    console.log('  EQUIPMENT ammo:');
    for (const eq of equipAmmo) {
      const res = resolveAmmoBV(eq.id);
      console.log(`    ${eq.id} @${eq.location} → bv=${res.battleValue} wt=${res.weaponType} ${res.resolved ? 'OK' : 'UNRESOLVED'}`);
    }
  } else {
    console.log('  EQUIPMENT ammo: NONE');
  }

  // List all ammo from crit slots
  if (unit.criticalSlots) {
    console.log('  CRIT SLOT ammo:');
    let totalCritAmmo = 0;
    for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (!s || typeof s !== 'string') continue;
        if (!s.toLowerCase().includes('ammo')) continue;
        const clean = (s as string).replace(/\s*\(omnipod\)/gi, '').replace(/\s*\(OMNIPOD\)/gi, '').trim();
        const norm = normalizeEquipmentId(clean.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
        const res = resolveAmmoBV(clean);
        const marker = res.resolved ? 'OK' : 'UNRESOLVED';
        console.log(`    [${loc}] "${clean}" → norm="${norm}" bv=${res.battleValue} wt=${res.weaponType} ${marker}`);
        totalCritAmmo++;
      }
    }
    console.log(`  Total crit ammo slots: ${totalCritAmmo}`);
  }
}

// Summary: count how many ammo slots resolve vs fail across all undercalculated units
console.log('\n' + '='.repeat(60));
console.log('=== AMMO RESOLUTION SUMMARY (all undercalculated units) ===');
let totalResolved = 0;
let totalFailed = 0;
const failedTypes: Record<string, number> = {};

for (const u of under) {
  const unit = loadUnit(u.unitId);
  if (!unit?.criticalSlots) continue;

  for (const [, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (!s || typeof s !== 'string') continue;
      if (!s.toLowerCase().includes('ammo')) continue;
      if (s.toLowerCase().includes('ammo feed')) continue;
      const clean = s.replace(/\s*\(omnipod\)/gi, '').replace(/\s*\(OMNIPOD\)/gi, '').trim();
      const res = resolveAmmoBV(clean);
      if (res.resolved && res.battleValue > 0) {
        totalResolved++;
      } else {
        totalFailed++;
        failedTypes[clean] = (failedTypes[clean] || 0) + 1;
      }
    }
  }
}

console.log(`Resolved: ${totalResolved}, Failed: ${totalFailed} (${(totalFailed/(totalResolved+totalFailed)*100).toFixed(1)}%)`);
console.log('\nTop failed ammo types:');
const sortedFails = Object.entries(failedTypes).sort((a, b) => b[1] - a[1]);
for (const [type, count] of sortedFails.slice(0, 30)) {
  console.log(`  ${count}x "${type}"`);
}
