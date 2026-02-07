import * as fs from 'fs';
import * as path from 'path';
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

const wrong = r.allResults.filter((x: any) =>
  x.status !== 'error' && x.percentDiff !== null && Math.abs(x.percentDiff) > 1
);

console.log(`Total wrong: ${wrong.length}`);
console.log(`  Over: ${wrong.filter((x: any) => x.percentDiff > 0).length}`);
console.log(`  Under: ${wrong.filter((x: any) => x.percentDiff < 0).length}`);

// For each wrong unit, compute which BV component is likely responsible
// Strategy: compare our def/off ratio against the reference
// If our def is too high relative to off, the error is in defensive
const analysis: any[] = [];
for (const w of wrong) {
  const b = w.breakdown;
  if (!b) continue;
  const ie = idx.units.find((e: any) => e.id === w.unitId);
  if (!ie?.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
    const totalCalc = b.defensiveBV + b.offensiveBV;
    const defShare = b.defensiveBV / totalCalc;
    const gap = w.difference; // positive = overcalc, negative = undercalc

    // Check for specific patterns
    const hasTC = false; // Already detected in crit scan
    const hasTSM = (d.criticalSlots ? Object.values(d.criticalSlots).flat().filter(Boolean) as string[] : [])
      .some(s => s.toLowerCase().includes('tsm') || s.toLowerCase().includes('triple strength'));
    const hasShield = d.equipment.some((e: any) => e.id.toLowerCase().includes('shield'));

    // Count unresolved weapons
    const issues = w.issues || [];
    const unresolvedWeapons = issues.filter((i: string) => i.includes('Unresolved weapons'));

    analysis.push({
      id: w.unitId, gap, pct: w.percentDiff, techBase: d.techBase,
      armorType: d.armor?.type, tonnage: d.tonnage,
      defShare, defBV: b.defensiveBV, offBV: b.offensiveBV,
      weaponBV: b.weaponBV, ammoBV: b.ammoBV, speedFactor: b.speedFactor,
      defFactor: b.defensiveFactor, pen: b.explosivePenalty,
      hasTSM, hasShield, unresolvedWeapons: unresolvedWeapons.length > 0,
      engineType: d.engine?.type, structType: d.structure?.type,
    });
  } catch {}
}

// Group by error pattern
console.log('\n=== BY ISSUE TYPE ===');
const withUnresolved = analysis.filter(a => a.unresolvedWeapons);
console.log(`Units with unresolved weapons: ${withUnresolved.length}`);

// Check TSM pattern
const tsmUnits = analysis.filter(a => a.hasTSM);
console.log(`\nTSM units: ${tsmUnits.length}`);
console.log(`  Over: ${tsmUnits.filter(a => a.pct > 0).length} avg +${(tsmUnits.filter(a=>a.pct>0).reduce((s: number, a: any) => s + a.gap, 0) / Math.max(1, tsmUnits.filter(a=>a.pct>0).length)).toFixed(0)}`);
console.log(`  Under: ${tsmUnits.filter(a => a.pct < 0).length}`);

// Check shield pattern
const shieldUnits = analysis.filter(a => a.hasShield);
console.log(`\nShield units: ${shieldUnits.length}`);
console.log(`  Over: ${shieldUnits.filter(a => a.pct > 0).length}`);
console.log(`  Under: ${shieldUnits.filter(a => a.pct < 0).length}`);

// Check defensive factor distribution
console.log('\n=== BY DEFENSIVE FACTOR ===');
const byDefF: Record<string, { over: number; under: number; avgGap: number; count: number }> = {};
for (const a of analysis) {
  const key = a.defFactor?.toFixed(1) || '?';
  if (!byDefF[key]) byDefF[key] = { over: 0, under: 0, avgGap: 0, count: 0 };
  if (a.pct > 0) byDefF[key].over++;
  else byDefF[key].under++;
  byDefF[key].avgGap += a.gap;
  byDefF[key].count++;
}
for (const [df, stats] of Object.entries(byDefF).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))) {
  console.log(`  defF=${df}: ${stats.over} over, ${stats.under} under, avg gap=${(stats.avgGap / stats.count).toFixed(0)}`);
}

// Check speed factor distribution
console.log('\n=== BY SPEED FACTOR RANGE ===');
const bySF: Record<string, { over: number; under: number; count: number }> = {};
for (const a of analysis) {
  const sf = a.speedFactor;
  const key = sf < 1 ? '<1.0' : sf < 1.2 ? '1.0-1.2' : sf < 1.5 ? '1.2-1.5' : sf < 2.0 ? '1.5-2.0' : '2.0+';
  if (!bySF[key]) bySF[key] = { over: 0, under: 0, count: 0 };
  if (a.pct > 0) bySF[key].over++;
  else bySF[key].under++;
  bySF[key].count++;
}
for (const [sf, stats] of Object.entries(bySF)) {
  console.log(`  sf ${sf}: ${stats.over} over, ${stats.under} under (${stats.count} total)`);
}

// Show the top 15 overcalculated units with their patterns
console.log('\n=== TOP OVERCALCULATED ===');
for (const a of analysis.filter(x => x.pct > 0).sort((x: any, y: any) => y.pct - x.pct).slice(0, 15)) {
  const flags = [a.hasTSM ? 'TSM' : '', a.hasShield ? 'SHIELD' : '', a.unresolvedWeapons ? 'UNRESOLVED' : ''].filter(Boolean).join(',');
  console.log(`  ${a.id}: +${a.gap} (+${a.pct.toFixed(1)}%) ${a.techBase} ${a.engineType} sf=${a.speedFactor} defF=${a.defFactor} ${flags}`);
}

// Show the top 15 undercalculated with their patterns
console.log('\n=== TOP UNDERCALCULATED ===');
for (const a of analysis.filter(x => x.pct < 0).sort((x: any, y: any) => x.pct - y.pct).slice(0, 15)) {
  const flags = [a.hasTSM ? 'TSM' : '', a.hasShield ? 'SHIELD' : '', a.unresolvedWeapons ? 'UNRESOLVED' : ''].filter(Boolean).join(',');
  console.log(`  ${a.id}: ${a.gap} (${a.pct.toFixed(1)}%) ${a.techBase} ${a.armorType} ${flags}`);
}

// Check if unresolved weapons is a major driver
console.log('\n=== UNRESOLVED WEAPON UNITS ===');
for (const u of withUnresolved.sort((a: any, b: any) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 15)) {
  const res = r.allResults.find((x: any) => x.unitId === u.id);
  const issues = res?.issues?.filter((i: string) => i.includes('Unresolved')) || [];
  console.log(`  ${u.id}: ${u.gap > 0 ? '+' : ''}${u.gap} (${u.pct.toFixed(1)}%) — ${issues.join('; ')}`);
}
