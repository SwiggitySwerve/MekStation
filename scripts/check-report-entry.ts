import * as fs from 'fs';
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json','utf8'));
const units = ['hatchetman-hct-3f-austin','enfield-end-6j-ec','black-hawk-t','fenris-j','white-flame-whf-3b'];
for (const uid of units) {
  const u = r.allResults.find((x: any) => x.unitId === uid);
  if (!u) { console.log(uid + ': NOT FOUND'); continue; }
  const b = u.breakdown || {};
  console.log(`${uid}: diff=${u.percentDiff?.toFixed(1)}% calc=${u.calculatedBV} ref=${u.indexBV} ammoBV=${b.ammoBV} weapBV=${b.weaponBV?.toFixed(0)} defBV=${b.defensiveBV?.toFixed(0)} offBV=${b.offensiveBV?.toFixed(0)} SF=${b.speedFactor}`);
}
