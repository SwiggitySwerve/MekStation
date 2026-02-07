/**
 * Trace actual weapon BV resolution for undercalculated Clan/Mixed units.
 * Shows what resolveWeaponForUnit actually returns vs what Clan BV should be.
 */
import * as fs from 'fs';
import * as path from 'path';

const energyPath = 'public/data/equipment/official/weapons/energy.json';
const ballisticPath = 'public/data/equipment/official/weapons/ballistic.json';
const missilePath = 'public/data/equipment/official/weapons/missile.json';

const energy = JSON.parse(fs.readFileSync(energyPath, 'utf8'));
const ballistic = JSON.parse(fs.readFileSync(ballisticPath, 'utf8'));
const missile = JSON.parse(fs.readFileSync(missilePath, 'utf8'));

// Build BV lookup for IS and Clan weapons
const weaponBV: Record<string, number> = {};
for (const cat of [energy, ballistic, missile]) {
  const items = cat.items || cat.weapons || [];
  for (const w of items) {
    weaponBV[w.id.toLowerCase()] = w.battleValue;
  }
}

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Focus on undercalculated CLAN/MIXED units
const underc = report.allResults
  .filter((r: any) => r.status !== 'error' && r.percentDiff !== null && r.percentDiff < -1)
  .sort((a: any, b: any) => a.percentDiff - b.percentDiff);

let totalMissing = 0;
let missingWeapons: Record<string, number> = {};
let wrongResolve: Record<string, { isBV: number; clanBV: number; count: number }> = {};

for (const u of underc) {
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (!ie?.path) continue;
  const unit = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
  if (unit.techBase !== 'CLAN' && unit.techBase !== 'MIXED') continue;

  for (const eq of unit.equipment) {
    const lo = eq.id.toLowerCase().replace(/^\d+-/, '');
    // Skip non-weapons
    if (lo.includes('heat-sink') || lo.includes('case') || lo.includes('targeting') || lo.includes('tsm')
      || lo.includes('jump-jet') || lo.includes('ecm') || lo.includes('probe') || lo.includes('null-sig')
      || lo.includes('chameleon') || lo.includes('void-sig') || lo.includes('ams') || lo === 'supercharger'
      || lo.includes('masc') || lo.includes('c3') || lo.includes('tag') || lo.includes('narc')
      || lo.includes('beagle') || lo.includes('bap') || lo.includes('nova-cews')
      || lo.includes('watchdog') || lo.includes('light-active-probe') || lo.includes('active-probe')) continue;

    const isBV = weaponBV[lo];
    const clanId = lo.startsWith('clan-') ? lo : 'clan-' + lo;
    const clanBV = weaponBV[clanId];

    // Check: does this weapon resolve to IS when it should be Clan?
    if (isBV !== undefined && clanBV !== undefined && clanBV > isBV) {
      wrongResolve[lo] = wrongResolve[lo] || { isBV, clanBV, count: 0 };
      wrongResolve[lo].count++;
    }

    // Check: is this weapon completely missing from catalog?
    if (isBV === undefined && clanBV === undefined) {
      missingWeapons[lo] = (missingWeapons[lo] || 0) + 1;
      totalMissing++;
    }
  }
}

console.log('=== WEAPONS WITH IS/CLAN BV DIFFERENCE (on Clan/Mixed undercalculated units) ===');
const sorted = Object.entries(wrongResolve).sort((a, b) => (b[1].clanBV - b[1].isBV) * b[1].count - (a[1].clanBV - a[1].isBV) * a[1].count);
let totalImpact = 0;
for (const [wep, info] of sorted) {
  const impact = (info.clanBV - info.isBV) * info.count;
  totalImpact += impact;
  console.log(`  ${wep}: IS=${info.isBV} Clan=${info.clanBV} delta=${info.clanBV - info.isBV} × ${info.count} = ${impact} total impact`);
}
console.log(`\nTotal raw BV impact from IS→Clan resolution: ${totalImpact}`);

console.log('\n=== MISSING WEAPONS (not in any catalog, on Clan/Mixed units) ===');
const sortedMissing = Object.entries(missingWeapons).sort((a, b) => b[1] - a[1]);
for (const [wep, count] of sortedMissing) {
  console.log(`  ${wep}: ${count} occurrences`);
}
console.log(`\nTotal missing weapon occurrences: ${totalMissing}`);

// Check which missing weapons have Clan-only versions
console.log('\n=== CLAN-ONLY WEAPONS (in catalog with clan- prefix) ===');
for (const [wep, count] of sortedMissing) {
  const clanId = 'clan-' + wep;
  if (weaponBV[clanId] !== undefined) {
    console.log(`  ${wep} → clan-${wep} BV=${weaponBV[clanId]}, ${count} occurrences`);
  }
}

// Now the KEY question: for CLAN techBase units, does resolveWeaponForUnit handle this?
// The function at line 267 checks: techBase === 'CLAN' → enters Clan block
// Tries 'clan-' + normalizedIS → should find 'clan-er-large-laser' etc.
// So for pure CLAN units, the resolution SHOULD work. Let's verify.
console.log('\n=== VERIFYING: do CLAN-tech weapons with both IS/Clan entries actually resolve? ===');
// Check the breakdowns: compare weaponBV in the validation report to what Clan BV would be
for (const u of underc.slice(0, 20)) {
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (!ie?.path) continue;
  const unit = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
  if (unit.techBase !== 'CLAN' && unit.techBase !== 'MIXED') continue;

  const b = u.breakdown;
  if (!b) continue;

  // Calculate what weapon BV should be if all Clan weapons resolved correctly
  let expectedWeaponBV = 0;
  let actualWeaponBV = b.weaponBV || 0;
  let weaponDetails: string[] = [];

  for (const eq of unit.equipment) {
    const lo = eq.id.toLowerCase().replace(/^\d+-/, '');
    if (lo.includes('heat-sink') || lo.includes('case') || lo.includes('targeting') || lo.includes('tsm')
      || lo.includes('jump-jet') || lo.includes('ecm') || lo.includes('probe') || lo.includes('null-sig')
      || lo.includes('chameleon') || lo.includes('void-sig') || lo.includes('ams') || lo === 'supercharger'
      || lo.includes('masc') || lo.includes('c3') || lo.includes('tag') || lo.includes('narc')
      || lo.includes('beagle') || lo.includes('bap') || lo.includes('nova-cews')
      || lo.includes('watchdog') || lo.includes('light-active-probe') || lo.includes('active-probe')) continue;

    const isBV = weaponBV[lo] ?? 0;
    const clanId = lo.startsWith('clan-') ? lo : 'clan-' + lo;
    const clanBV = weaponBV[clanId] ?? 0;
    const bestBV = Math.max(isBV, clanBV);

    if (bestBV > 0) {
      expectedWeaponBV += bestBV;
      if (clanBV > isBV) {
        weaponDetails.push(`${lo}: IS=${isBV} Clan=${clanBV} → should be ${clanBV}`);
      }
    }
  }

  if (weaponDetails.length > 0) {
    console.log(`\n${u.unitId} (${unit.techBase}): gap=${u.difference} (${u.percentDiff?.toFixed(1)}%)`);
    console.log(`  breakdown weaponBV=${actualWeaponBV}`);
    for (const d of weaponDetails) console.log(`    ${d}`);
  }
}
