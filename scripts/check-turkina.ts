import * as fs from 'fs';
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const targets = ['turkina-z', 'koshi-z', 'osteon-prime', 'osteon-d', 'osteon-u'];
for (const uid of targets) {
  const r = report.allResults.find((x: any) => x.unitId === uid);
  if (r) {
    console.log(`${uid}: calc=${r.calculatedBV} ref=${r.indexBV} diff=${r.difference} pct=${r.percentDiff?.toFixed(1)}%`);
    if (r.breakdown) {
      console.log(`  weaponBV=${r.breakdown.weaponBV} ammoBV=${r.breakdown.ammoBV} sf=${r.breakdown.speedFactor} he=${r.breakdown.heatEfficiency}`);
    }
  } else {
    console.log(`${uid}: NOT FOUND`);
  }
}

// Overall stats
const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const within1 = valid.filter((x: any) => Math.abs(x.percentDiff) <= 1);
const within5 = valid.filter((x: any) => Math.abs(x.percentDiff) <= 5);
console.log(`\nOverall: ${within1.length}/${valid.length} within 1% (${(within1.length/valid.length*100).toFixed(1)}%)`);
console.log(`         ${within5.length}/${valid.length} within 5% (${(within5.length/valid.length*100).toFixed(1)}%)`);
