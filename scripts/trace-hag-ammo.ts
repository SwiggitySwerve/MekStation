/**
 * Trace HAG ammo BV values to find undercalculation source.
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

// Find all HAG units
const hagUnits: any[] = [];
for (const r of valid) {
  const unit = loadUnit(r.unitId);
  if (!unit?.criticalSlots) continue;
  const critsStr = JSON.stringify(unit.criticalSlots).toLowerCase();
  if (critsStr.includes('hag')) hagUnits.push({ ...r, unit });
}

const outliers = hagUnits.filter((x: any) => Math.abs(x.percentDiff) > 1);
console.log(`HAG units: ${hagUnits.length}, outliers: ${outliers.length}`);

for (const r of outliers.sort((a: any, b: any) => a.percentDiff - b.percentDiff)) {
  const unit = r.unit;
  const b = r.breakdown;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${r.unitId} — ref=${r.indexBV} calc=${r.calculatedBV} diff=${r.difference} (${r.percentDiff?.toFixed(1)}%)`);
  console.log(`  ${unit.tonnage}t ${unit.techBase} walk=${unit.movement?.walk} jump=${unit.movement?.jump||0}`);
  console.log(`  DEF: armor=${b?.armorBV?.toFixed(0)} struct=${b?.structureBV?.toFixed(0)} gyro=${b?.gyroBV?.toFixed(0)} defEq=${b?.defEquipBV?.toFixed(0)} exp=${b?.explosivePenalty?.toFixed(0)} DF=${b?.defensiveFactor} → ${b?.defensiveBV?.toFixed(0)}`);
  console.log(`  OFF: wBV=${b?.weaponBV?.toFixed(0)} raw=${b?.rawWeaponBV?.toFixed(0)} halved=${b?.halvedWeaponBV?.toFixed(0)} ammo=${b?.ammoBV} phys=${b?.physicalWeaponBV?.toFixed(0)} wt=${b?.weightBonus?.toFixed(0)} offEq=${b?.offEquipBV?.toFixed(0)} HE=${b?.heatEfficiency} SF=${b?.speedFactor} → ${b?.offensiveBV?.toFixed(0)}`);
  console.log(`  cockpit=${b?.cockpitModifier}`);

  // Show ammo in breakdown
  if (b?.ammo?.length) {
    console.log('  --- Ammo BV ---');
    for (const a of b.ammo) {
      console.log(`    ${(a.name||a.id||'?').padEnd(30)} bv=${a.bv} tons=${a.tons || '?'}`);
    }
  }

  // Count HAG ammo in crits
  let hagAmmoTons = 0;
  const ammoSlots: string[] = [];
  for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (typeof s !== 'string') continue;
      const lo = s.toLowerCase();
      if (lo.includes('hag') && lo.includes('ammo')) {
        hagAmmoTons++;
        ammoSlots.push(`${loc}: "${s}"`);
      }
    }
  }
  console.log(`  HAG ammo crit slots: ${hagAmmoTons} (= ${hagAmmoTons} tons)`);
  for (const s of ammoSlots.slice(0, 5)) console.log(`    ${s}`);

  // Calculate expected BV gap
  const totalBV = (b?.defensiveBV || 0) + (b?.offensiveBV || 0);
  console.log(`  Expected total = DEF + OFF = ${b?.defensiveBV?.toFixed(0)} + ${b?.offensiveBV?.toFixed(0)} = ${totalBV.toFixed(0)}`);
  console.log(`  After cockpit (${b?.cockpitModifier}): ${Math.round(totalBV * (b?.cockpitModifier || 1))}`);
}

// Check HAG ammo BV per ton from catalog
console.log('\n=== HAG AMMO IN WEAPON CATALOGS ===');
const balisticCat = JSON.parse(fs.readFileSync('public/data/equipment/official/weapons/ballistic.json', 'utf8'));
for (const w of balisticCat) {
  if (w.id?.toLowerCase().includes('hag') || w.name?.toLowerCase().includes('hag')) {
    console.log(`  ${w.id}: BV=${w.battleValue}, heat=${w.heat}`);
    if (w.ammo) {
      for (const a of w.ammo) {
        console.log(`    ammo: ${a.id || a.name} BV=${a.battleValue} perTon=${a.shotsPerTon || '?'}`);
      }
    }
  }
}

// Also check ammo catalog
try {
  const ammoCat = JSON.parse(fs.readFileSync('public/data/equipment/official/ammunition.json', 'utf8'));
  for (const a of ammoCat) {
    if (a.id?.toLowerCase().includes('hag') || a.name?.toLowerCase().includes('hag')) {
      console.log(`  Ammo catalog: ${a.id} BV=${a.battleValue}`);
    }
  }
} catch { /* no ammo catalog */ }

// Check if the issue is the raw weapon BV (before heat tracking)
console.log('\n=== RAW vs HEAT-TRACKED WEAPON BV ===');
for (const r of outliers.sort((a: any, b: any) => a.percentDiff - b.percentDiff).slice(0, 5)) {
  const b = r.breakdown;
  const halvedPct = b?.halvedWeaponBV > 0 ? (b.halvedWeaponBV / b.rawWeaponBV * 100).toFixed(1) : '0';
  console.log(`  ${r.unitId.padEnd(35)} raw=${b?.rawWeaponBV?.toFixed(0)} after=${b?.weaponBV?.toFixed(0)} halved=${b?.halvedWeaponBV?.toFixed(0)} (${halvedPct}%)`);
}
