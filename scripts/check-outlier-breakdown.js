const fs = require('fs');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

const targets = [
  'prey-seeker-py-sr30', 'piranha-4', 'mauler-mal-1x-affc', 'revenant-ubm-1a',
  'great-turtle-gtr-1', 'merlin-mln-sx', 'shogun-c-2',
  'thunder-fox-tft-l8', 'atlas-c', 'great-turtle-gtr-2',
  'quickdraw-qkd-8x', 'galahad-glh-3d-laodices', 'stalker-ii-stk-9a',
  'fennec-fec-5cm', 'jade-hawk-jhk-03', 'centurion-cn11-o',
  'thunder-hawk-tdk-7z', 'balius-e', 'thug-thg-11ecx-jose', 'flamberge-c'
];

for (const id of targets) {
  const result = r.allResults.find(x => x.unitId === id);
  if (!result) { console.log('NOT FOUND:', id); continue; }
  const b = result.breakdown || {};
  console.log(`\n=== ${result.chassis} ${result.model} (${result.percentDiff.toFixed(2)}%) ref=${result.indexBV} calc=${result.calculatedBV} gap=${result.difference} ===`);
  console.log(`  OFF: wBV=${b.rawWeaponBV} halved=${b.halvedWeaponBV} aBV=${b.ammoBV} wt=${b.weightBonus} phys=${b.physicalWeaponBV} offEq=${b.offEquipBV} sf=${b.speedFactor}`);
  console.log(`  DEF: armor=${b.armorBV} struct=${b.structureBV} gyro=${b.gyroBV} defEq=${b.defEquipBV} expl=${b.explosivePenalty} df=${b.defensiveFactor}`);
  console.log(`  HEAT: eff=${b.heatEfficiency} diss=${b.heatDissipation} moveHeat=${b.moveHeat} cockpit=${b.cockpitType} tech=${b.techBase}`);
  console.log(`  MP: run=${b.runMP} jump=${b.jumpMP}`);
  if (result.issues && result.issues.length > 0) console.log(`  ISSUES:`, result.issues.join('; '));
}
