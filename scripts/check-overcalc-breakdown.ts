import * as fs from 'fs';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const targets = ['thunderbolt-tdr-5l', 'griffin-grf-2n2', 'wyvern-wve-5nsl', 'battle-cobra-btl-c-2oc', 'hatamoto-chi-htm-27t', 'jenner-jr7-d-webster', 'black-knight-blk-nt-3a', 'sasquatch-sqt-2'];
for (const id of targets) {
  const r = report.allResults.find((x: any) => x.unitId === id);
  if (!r) { console.log(id + ': NOT FOUND'); continue; }
  const b = r.breakdown;
  console.log(`${id} ref=${r.indexBV} calc=${r.calculatedBV} diff=${r.difference} pct=${r.percentDiff?.toFixed(1)}%`);
  console.log(`  DEF: armor=${b?.armorBV?.toFixed(0)} struct=${b?.structureBV?.toFixed(0)} gyro=${b?.gyroBV?.toFixed(0)} defEq=${b?.defEquipBV} expPen=${b?.explosivePenalty} DF=${b?.defensiveFactor} -> defBV=${b?.defensiveBV?.toFixed(0)}`);
  console.log(`  OFF: weap=${b?.weaponBV?.toFixed(0)} ammo=${b?.ammoBV} wt=${b?.weightBonus?.toFixed(0)} phys=${b?.physicalWeaponBV?.toFixed(0)} offEq=${b?.offEquipBV} SF=${b?.speedFactor} HE=${b?.heatEfficiency} halved=${b?.halvedWeaponCount}/${b?.weaponCount} -> offBV=${b?.offensiveBV?.toFixed(0)}`);
  console.log(`  cockpit=${b?.cockpitModifier} run=${b?.runMP} jump=${b?.jumpMP}`);
  console.log('');
}
