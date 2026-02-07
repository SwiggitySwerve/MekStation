import * as fs from 'fs';
import * as path from 'path';

const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = 'public/data/units/battlemechs';
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Focus on the 234 minor discrepancy units (1-5% off)
const minor = r.allResults.filter((x: any) =>
  Math.abs(x.percentDiff) > 1 && Math.abs(x.percentDiff) <= 5 && x.breakdown
);

console.log(`Minor discrepancy units: ${minor.length}`);
console.log(`  Over: ${minor.filter((x: any) => x.percentDiff > 0).length}`);
console.log(`  Under: ${minor.filter((x: any) => x.percentDiff < 0).length}`);

// For each unit, compute the defensive-only vs offensive-only gap
const analysis: any[] = [];
for (const res of minor) {
  const b = res.breakdown;
  const entry = index.units.find((e: any) => e.id === res.unitId);
  if (!entry?.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    // If the offensive is correct, what defensive would produce the right total?
    // expected = idx, actual = calc
    // defBV = calc - offBV
    // expectedDefBV = idx - offBV
    // defGap = actualDefBV - expectedDefBV = calc - idx = diff
    // But this doesn't tell us if the gap is in def or off.

    // Instead, look at the RATIO of the gap to defensive vs offensive
    const totalDef = res.calculatedBV - b.offensiveBV;
    const defShare = totalDef / res.calculatedBV;
    const offShare = b.offensiveBV / res.calculatedBV;

    analysis.push({
      id: res.unitId,
      diff: res.difference,
      pct: res.percentDiff,
      techBase: d.techBase,
      tonnage: d.tonnage,
      engineType: d.engine?.type,
      armorType: d.armor?.type,
      structType: d.structure?.type,
      hsType: d.heatSinks?.type,
      hasJump: (d.movement?.jump || 0) > 0,
      defShare,
      offShare,
      defBV: totalDef,
      offBV: b.offensiveBV,
      weaponBV: b.weaponBV,
      ammoBV: b.ammoBV,
      speedFactor: b.speedFactor,
      explosivePenalty: b.explosivePenalty,
      defensiveEquipBV: b.defensiveEquipBV,
      defensiveFactor: b.defensiveFactor,
    });
  } catch {}
}

// Aggregate: what percentage of the gap is attributable to different factors?
// Group by sign
const over = analysis.filter(a => a.pct > 0);
const under = analysis.filter(a => a.pct < 0);

// For overcalculated: our value is too high.
// Check: do they have explosive penalties? (overcalc often means missing penalties)
console.log('\n=== OVERCALCULATED minor (1-5%) ===');
const overWithPenalty = over.filter(a => a.explosivePenalty > 0).length;
const overNoPenalty = over.filter(a => a.explosivePenalty === 0).length;
console.log(`  With explosive penalty: ${overWithPenalty}`);
console.log(`  No explosive penalty: ${overNoPenalty}`);

// Check overcalculated by how much penalty would fix them
let penaltyWouldFix = 0;
for (const a of over) {
  // If adding more explosive penalty would bring within 1%
  if (a.explosivePenalty === 0 && a.diff <= a.defBV * 0.1) penaltyWouldFix++;
}
console.log(`  Missing penalty would fix: ${penaltyWouldFix}`);

// Check tech base distribution
console.log('\n=== BY TECH BASE ===');
const byTB: Record<string, { over: number; under: number }> = {};
for (const a of analysis) {
  const tb = a.techBase;
  if (!byTB[tb]) byTB[tb] = { over: 0, under: 0 };
  if (a.pct > 0) byTB[tb].over++;
  else byTB[tb].under++;
}
for (const [tb, counts] of Object.entries(byTB)) {
  console.log(`  ${tb}: ${counts.over} over, ${counts.under} under (${counts.over + counts.under} total)`);
}

// Check by engine type
console.log('\n=== BY ENGINE TYPE ===');
const byEngine: Record<string, { over: number; under: number }> = {};
for (const a of analysis) {
  const et = a.engineType || 'UNKNOWN';
  if (!byEngine[et]) byEngine[et] = { over: 0, under: 0 };
  if (a.pct > 0) byEngine[et].over++;
  else byEngine[et].under++;
}
for (const [et, counts] of Object.entries(byEngine)) {
  console.log(`  ${et}: ${counts.over} over, ${counts.under} under (${counts.over + counts.under} total)`);
}

// Check by armor type
console.log('\n=== BY ARMOR TYPE ===');
const byArmor: Record<string, { over: number; under: number }> = {};
for (const a of analysis) {
  const at = a.armorType || 'UNKNOWN';
  if (!byArmor[at]) byArmor[at] = { over: 0, under: 0 };
  if (a.pct > 0) byArmor[at].over++;
  else byArmor[at].under++;
}
for (const [at, counts] of Object.entries(byArmor).sort((a,b) => (b[1].over+b[1].under)-(a[1].over+a[1].under))) {
  if (counts.over + counts.under >= 3) {
    console.log(`  ${at}: ${counts.over} over, ${counts.under} under (${counts.over + counts.under} total)`);
  }
}

// Average absolute BV difference by direction
const overAvg = over.reduce((s, a) => s + a.diff, 0) / over.length;
const underAvg = under.reduce((s, a) => s + Math.abs(a.diff), 0) / under.length;
console.log(`\nAvg BV diff: over=+${overAvg.toFixed(0)}, under=-${underAvg.toFixed(0)}`);

// Show sample units from each group
console.log('\n=== SAMPLE OVERCALCULATED ===');
for (const a of over.sort((x: any, y: any) => y.diff - x.diff).slice(0, 10)) {
  console.log(`  ${a.id}: +${a.diff} (+${a.pct.toFixed(1)}%) ${a.techBase} ${a.engineType} defF=${a.defensiveFactor?.toFixed(2)} pen=${a.explosivePenalty}`);
}

console.log('\n=== SAMPLE UNDERCALCULATED ===');
for (const a of under.sort((x: any, y: any) => x.diff - y.diff).slice(0, 10)) {
  console.log(`  ${a.id}: ${a.diff} (${a.pct.toFixed(1)}%) ${a.techBase} ${a.engineType} defF=${a.defensiveFactor?.toFixed(2)} pen=${a.explosivePenalty}`);
}
