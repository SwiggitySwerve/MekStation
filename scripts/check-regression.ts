import * as fs from 'fs';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));

// Count cockpit types and analyze non-standard ones
const cockpitCounts: Record<string, number> = {};
const nonStdDetails: any[] = [];

for (const r of report.allResults) {
  const cockpit = r.breakdown?.cockpitType || 'unknown';
  cockpitCounts[cockpit] = (cockpitCounts[cockpit] || 0) + 1;

  if (cockpit !== 'standard' && r.indexBV > 0) {
    const absPct = Math.abs(r.percentDiff);
    nonStdDetails.push({
      name: `${r.chassis} ${r.model}`,
      cockpit,
      ref: r.indexBV,
      calc: r.calculatedBV,
      diff: r.difference,
      pct: r.percentDiff.toFixed(1),
      absPct,
    });
  }
}

console.log('=== COCKPIT TYPE DISTRIBUTION ===');
for (const [k, v] of Object.entries(cockpitCounts).sort((a, b) => (b[1] as number) - (a[1] as number))) {
  console.log(`  ${k}: ${v}`);
}

// Group by cockpit type
for (const ct of ['small', 'torso-mounted', 'interface', 'command-console']) {
  const units = nonStdDetails.filter(u => u.cockpit === ct);
  if (units.length === 0) continue;

  const exact = units.filter(u => u.absPct === 0).length;
  const within1 = units.filter(u => u.absPct <= 1).length;
  const within5 = units.filter(u => u.absPct <= 5).length;
  const over5 = units.filter(u => u.absPct > 5);

  console.log(`\n=== ${ct.toUpperCase()} COCKPITS: ${units.length} units ===`);
  console.log(`  Exact: ${exact} | Within 1%: ${within1} | Within 5%: ${within5}`);

  if (over5.length > 0) {
    console.log(`  Over 5% (${over5.length}):`);
    for (const u of over5.sort((a, b) => b.absPct - a.absPct).slice(0, 10)) {
      console.log(`    ${u.name}: ref=${u.ref} calc=${u.calc} (${u.pct}%)`);
    }
  }

  // Show units where removing the cockpit modifier would improve accuracy
  const wouldImproveWithout = units.filter(u => {
    const mod = ct === 'interface' ? 1.3 : ct === 'small' || ct === 'torso-mounted' ? 0.95 : 1.0;
    if (mod === 1.0) return false;
    const baseBV = u.calc / mod;
    const withStandard = Math.round(baseBV);
    return Math.abs(withStandard - u.ref) < Math.abs(u.calc - u.ref);
  });

  if (wouldImproveWithout.length > 0) {
    console.log(`  Would be MORE accurate with standard modifier: ${wouldImproveWithout.length}`);
    for (const u of wouldImproveWithout.slice(0, 5)) {
      const mod = ct === 'interface' ? 1.3 : 0.95;
      const baseBV = u.calc / mod;
      console.log(`    ${u.name}: ref=${u.ref} calc=${u.calc} withStd=${Math.round(baseBV)}`);
    }
  }
}
