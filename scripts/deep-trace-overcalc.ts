/**
 * Deep trace specific overcalculated 1-2% units to find the exact component that's wrong.
 * Compare our defensive and offensive sub-components against what they should be.
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

// Pick simple overcalculated units for tracing
const targets = [
  'ostscout-ott-8j', 'dola-dol-1a1', 'kabuto-kbo-7a', 'jackal-ja-kl-1579',
  'panther-pnt-10alag', 'strider-sr1-oe', 'thunderbolt-tdr-12r', 'archer-arc-6w',
  'battlemaster-blr-6r', 'turkina-u',
];

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);

for (const uid of targets) {
  const u = valid.find((x: any) => x.unitId === uid);
  if (!u || !u.breakdown) continue;
  const unit = loadUnit(uid);
  if (!unit) continue;

  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1;
  const refBV = u.indexBV;
  const calcBV = u.calculatedBV;
  const refBase = refBV / cockpit;

  console.log(`=== ${uid} (${unit.tonnage}t ${unit.techBase}) ===`);
  console.log(`  Reference BV: ${refBV}  Calculated: ${calcBV}  Diff: +${u.difference} (+${u.percentDiff.toFixed(2)}%)`);
  console.log(`  CockpitMod: ${cockpit}  RefBase: ${refBase.toFixed(1)}`);
  console.log('');

  // Defensive breakdown
  console.log('  DEFENSIVE:');
  console.log(`    armorBV=${b.armorBV?.toFixed(1)}  structBV=${b.structureBV?.toFixed(1)}  gyroBV=${b.gyroBV?.toFixed(1)}`);
  console.log(`    defEquipBV=${b.defEquipBV}  amsAmmoBV=${b.amsAmmoBV || 0}  armoredComp=${b.armoredComponentBV || 0}  harjel=${b.harjelBonus || 0}`);
  console.log(`    explosivePenalty=${b.explosivePenalty}  defensiveFactor=${b.defensiveFactor}  TMM=${b.maxTMM}`);
  console.log(`    defensiveBV=${b.defensiveBV?.toFixed(1)}`);

  // Compute expected defensive base
  const defBase = (b.armorBV ?? 0) + (b.structureBV ?? 0) + (b.gyroBV ?? 0) +
    (b.defEquipBV ?? 0) + (b.amsAmmoBV ?? 0) + (b.armoredComponentBV ?? 0) + (b.harjelBonus ?? 0) -
    (b.explosivePenalty ?? 0);
  console.log(`    defBase (computed)=${defBase.toFixed(1)}  defBV/DF=${(b.defensiveBV / b.defensiveFactor).toFixed(1)}`);

  // Offensive breakdown
  console.log('  OFFENSIVE:');
  console.log(`    weaponBV=${b.weaponBV?.toFixed(1)}  rawWeaponBV=${b.rawWeaponBV?.toFixed(1)}  halvedBV=${b.halvedWeaponBV?.toFixed(1)}`);
  console.log(`    ammoBV=${b.ammoBV}  weightBonus=${b.weightBonus?.toFixed(1)}  physBV=${b.physicalWeaponBV?.toFixed(1)}  offEquipBV=${b.offEquipBV}`);
  console.log(`    speedFactor=${b.speedFactor}  HE=${b.heatEfficiency}  halved=${b.halvedWeaponCount}/${b.weaponCount}`);
  console.log(`    offensiveBV=${b.offensiveBV?.toFixed(1)}`);

  const baseOff = (b.weaponBV ?? 0) + (b.ammoBV ?? 0) + (b.weightBonus ?? 0) + (b.physicalWeaponBV ?? 0) + (b.offEquipBV ?? 0);
  console.log(`    baseOff (computed)=${baseOff.toFixed(1)}  offBV/SF=${(b.offensiveBV / b.speedFactor).toFixed(1)}`);

  // What would need to change to match?
  console.log('  NEEDED:');
  const neededDefBV = refBase - b.offensiveBV;
  const neededOffBV = refBase - b.defensiveBV;
  console.log(`    If off correct, def needed: ${neededDefBV.toFixed(1)} (have ${b.defensiveBV.toFixed(1)}, excess=${(b.defensiveBV - neededDefBV).toFixed(1)})`);
  console.log(`    If def correct, off needed: ${neededOffBV.toFixed(1)} (have ${b.offensiveBV.toFixed(1)}, excess=${(b.offensiveBV - neededOffBV).toFixed(1)})`);

  // What the base def should be if DF is correct
  const neededBaseDef = neededDefBV / b.defensiveFactor;
  console.log(`    If off correct + DF correct: baseDef needed=${neededBaseDef.toFixed(1)} (have ${defBase.toFixed(1)}, excess=${(defBase - neededBaseDef).toFixed(1)})`);

  // What the base off should be if SF is correct
  const neededBaseOff = neededOffBV / b.speedFactor;
  console.log(`    If def correct + SF correct: baseOff needed=${neededBaseOff.toFixed(1)} (have ${baseOff.toFixed(1)}, excess=${(baseOff - neededBaseOff).toFixed(1)})`);

  // Unit details
  console.log('  UNIT:');
  console.log(`    engine=${unit.engine?.type}  armor=${unit.armor?.type}  structure=${unit.structure?.type}`);
  console.log(`    cockpit=${unit.cockpit}  gyro=${unit.gyro || 'standard'}`);
  console.log(`    walk=${unit.movement?.walk}  jump=${unit.movement?.jump || 0}  runMP=${b.runMP}`);
  console.log(`    heatSinks=${unit.heatSinks?.count} ${unit.heatSinks?.type}`);
  console.log('');
}
