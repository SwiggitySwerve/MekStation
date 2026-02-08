import * as fs from 'fs';
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

// Check specific units
const targets = ['flashman-fls-c', 'goliath-gol-7k', 'thanatos-tns-6s', 'commando-com-9s', 'enforcer-iii-enf-7d', 'hachiwara-hca-3t'];
for (const uid of targets) {
  const r = report.allResults.find((x: any) => x.unitId === uid);
  if (r) {
    const b = r.breakdown;
    console.log(`${uid}: calc=${r.calculatedBV} ref=${r.indexBV} diff=${r.difference} pct=${r.percentDiff?.toFixed(1)}% weapBV=${b?.weaponBV?.toFixed(1)} halved=${b?.halvedWeaponCount}/${b?.weaponCount}`);
  }
}

// Get distribution of remaining outside-1%
const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const within1 = valid.filter((x: any) => Math.abs(x.percentDiff) <= 1);
const outside1 = valid.filter((x: any) => Math.abs(x.percentDiff) > 1);
console.log(`\nWithin 1%: ${within1.length}/${valid.length} (${(within1.length/valid.length*100).toFixed(1)}%)`);

// Bucket the outside-1% units
const under = outside1.filter((x: any) => x.percentDiff < -1);
const over = outside1.filter((x: any) => x.percentDiff > 1);
console.log(`Under: ${under.length}, Over: ${over.length}`);

// Sub-buckets
for (const [label, min, max] of [['1-2%', 1, 2], ['2-3%', 2, 3], ['3-5%', 3, 5], ['5-10%', 5, 10], ['10%+', 10, 100]] as [string, number, number][]) {
  const uc = under.filter((x: any) => Math.abs(x.percentDiff) >= min && Math.abs(x.percentDiff) < max).length;
  const oc = over.filter((x: any) => Math.abs(x.percentDiff) >= min && Math.abs(x.percentDiff) < max).length;
  console.log(`  ${label}: under=${uc} over=${oc} total=${uc+oc}`);
}

// Check small cockpit false positives across all outside-1%
let smallCockpitOver = 0;
let smallCockpitUnder = 0;
for (const u of outside1) {
  const cm = u.breakdown?.cockpitModifier;
  if (cm && cm < 1) {
    if (u.percentDiff > 0) smallCockpitOver++;
    else smallCockpitUnder++;
  }
}
console.log(`\nSmall cockpit detected (mod<1): over=${smallCockpitOver} under=${smallCockpitUnder}`);

// Check: what if we remove ALL small cockpit detection (set to 1.0)?
let fixedByNoSmallCockpit = 0;
for (const u of outside1) {
  const b = u.breakdown;
  if (!b || !b.cockpitModifier || b.cockpitModifier >= 1) continue;
  const recalcBV = Math.round((b.defensiveBV + b.offensiveBV) * 1.0);
  const recalcPct = ((recalcBV - u.indexBV) / u.indexBV) * 100;
  if (Math.abs(recalcPct) <= 1) fixedByNoSmallCockpit++;
}
console.log(`Fixed by removing all small cockpit detection: ${fixedByNoSmallCockpit}`);

// Check: what about setting cockpit to 0.95 for currently-1.0 units?
let fixedByCockpit095 = 0;
for (const u of outside1) {
  const b = u.breakdown;
  if (!b || b.cockpitModifier !== 1.0) continue;
  if (u.percentDiff < 1) continue; // only overcalculated
  const recalcBV = Math.round((b.defensiveBV + b.offensiveBV) * 0.95);
  const recalcPct = ((recalcBV - u.indexBV) / u.indexBV) * 100;
  if (Math.abs(recalcPct) <= 1) fixedByCockpit095++;
}
console.log(`Overcalculated fixed by applying 0.95 cockpit: ${fixedByCockpit095}`);
