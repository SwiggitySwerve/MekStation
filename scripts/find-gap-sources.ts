/**
 * For boundary outliers, trace the exact source of BV gap.
 * Check: unresolved weapons, unresolved ammo, physical weapon BV, weight bonus.
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null && x.breakdown);

// Check for unresolved weapons across ALL outliers
console.log('=== UNRESOLVED WEAPONS IN OUTLIERS ===');
const outliers = valid.filter((x: any) => Math.abs(x.percentDiff) > 1);
let unresolvedCount = 0;
for (const r of outliers) {
  const b = r.breakdown;
  if (b?.unresolvedWeapons?.length > 0) {
    console.log(`  ${r.unitId.padEnd(40)} ${r.percentDiff.toFixed(1).padStart(6)}% unresolved: ${b.unresolvedWeapons.join(', ')}`);
    unresolvedCount++;
  }
}
console.log(`Total outliers with unresolved weapons: ${unresolvedCount} / ${outliers.length}`);

// Check for unresolved ammo (ammo that matched no weapon)
console.log('\n=== AMMO BV ANALYSIS FOR LARGEST UNDERCALCULATED ===');
const underOutliers = valid.filter((x: any) => x.percentDiff < -2).sort((a: any, b: any) => a.percentDiff - b.percentDiff).slice(0, 15);
for (const r of underOutliers) {
  const b = r.breakdown;
  const unit = loadUnit(r.unitId);
  if (!unit) continue;

  // Count ammo crit slots
  let ammoCritSlots = 0;
  for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (typeof s === 'string' && (s.toLowerCase().includes('ammo') || s.toLowerCase().includes('pods'))) ammoCritSlots++;
    }
  }

  const weaponCount = b?.weapons?.length || 0;
  const ammoCount = b?.ammo?.length || 0;
  console.log(`  ${r.unitId.padEnd(35)} ${r.percentDiff.toFixed(1).padStart(6)}% gap=${Math.abs(r.difference).toString().padStart(4)} wBV=${b?.weaponBV?.toFixed(0)} ammoBV=${b?.ammoBV} weps=${weaponCount} ammoEntries=${ammoCount} ammoCrits=${ammoCritSlots} physBV=${b?.physicalWeaponBV?.toFixed(0)} wt=${b?.weightBonus?.toFixed(0)}`);
}

// Check: physical weapon BV for quad mechs
console.log('\n=== QUAD MECHS BV CHECK ===');
for (const r of valid) {
  const unit = loadUnit(r.unitId);
  if (!unit || unit.configuration !== 'Quad') continue;
  if (Math.abs(r.percentDiff) > 1) {
    const b = r.breakdown;
    console.log(`  ${r.unitId.padEnd(35)} ${r.percentDiff.toFixed(1).padStart(6)}% phys=${b?.physicalWeaponBV?.toFixed(0)} wt=${b?.weightBonus?.toFixed(0)} ${unit.tonnage}t`);
  }
}

// Check: weight bonus for TSM mechs (should be tonnage + TSM bonus)
console.log('\n=== TSM WEIGHT BONUS CHECK ===');
for (const r of outliers) {
  const b = r.breakdown;
  const unit = loadUnit(r.unitId);
  if (!unit) continue;
  const critsStr = JSON.stringify(unit.criticalSlots || {}).toLowerCase();
  if (!critsStr.includes('tsm') && !critsStr.includes('triple strength')) continue;
  console.log(`  ${r.unitId.padEnd(35)} ${r.percentDiff.toFixed(1).padStart(6)}% wt=${b?.weightBonus?.toFixed(0)} ${unit.tonnage}t phys=${b?.physicalWeaponBV?.toFixed(0)} hasTSM=${b?.hasTSM}`);
}

// Check: are there ammo entries that should match HAG but don't?
console.log('\n=== HAG AMMO MATCHING CHECK ===');
const hagOutliers = outliers.filter((r: any) => {
  const unit = loadUnit(r.unitId);
  if (!unit?.criticalSlots) return false;
  return JSON.stringify(unit.criticalSlots).toLowerCase().includes('hag');
});
for (const r of hagOutliers) {
  const b = r.breakdown;
  const unit = loadUnit(r.unitId);
  if (!unit) continue;

  // Count HAG ammo crits vs resolved ammo entries
  let hagAmmoCrits = 0;
  for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (typeof s === 'string' && s.toLowerCase().includes('hag') && s.toLowerCase().includes('ammo')) hagAmmoCrits++;
    }
  }

  const hagAmmo = (b?.ammo || []).filter((a: any) => (a.id||a.weaponType||'').toLowerCase().includes('hag'));
  console.log(`  ${r.unitId.padEnd(35)} ${r.percentDiff.toFixed(1).padStart(6)}% hagAmmoCrits=${hagAmmoCrits} resolvedHagAmmo=${hagAmmo.length} totalAmmo=${b?.ammoBV}`);
}
