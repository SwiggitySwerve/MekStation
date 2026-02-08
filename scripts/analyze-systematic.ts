/**
 * Systematic analysis: find the root cause patterns for all undercalculated units.
 * Focus on what's DIFFERENT between undercalculated and exact-match units.
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const exact = valid.filter((x: any) => Math.abs(x.percentDiff) <= 1);
const under = valid.filter((x: any) => x.percentDiff < -1);
const over = valid.filter((x: any) => x.percentDiff > 1);

// Load unit data for deeper analysis
function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

// ANALYSIS 1: Engine type distribution
console.log('=== ENGINE TYPE DISTRIBUTION ===');
const engineStats: Record<string, { exact: number; under: number; over: number }> = {};
for (const u of valid) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const eng = (unit.engine?.type || 'UNKNOWN').toUpperCase();
  if (!engineStats[eng]) engineStats[eng] = { exact: 0, under: 0, over: 0 };
  if (Math.abs(u.percentDiff) <= 1) engineStats[eng].exact++;
  else if (u.percentDiff < 0) engineStats[eng].under++;
  else engineStats[eng].over++;
}
for (const [eng, s] of Object.entries(engineStats).sort((a, b) => (b[1].under + b[1].over) - (a[1].under + a[1].over))) {
  const total = s.exact + s.under + s.over;
  const errPct = ((s.under + s.over) / total * 100).toFixed(1);
  console.log(`  ${eng.padEnd(18)} ${s.exact} exact, ${s.under} under, ${s.over} over (${errPct}% wrong of ${total})`);
}

// ANALYSIS 2: Heat sink type
console.log('\n=== HEAT SINK TYPE ===');
const hsStats: Record<string, { exact: number; under: number; over: number }> = {};
for (const u of valid) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const hs = (unit.heatSinks?.type || 'UNKNOWN').toUpperCase();
  if (!hsStats[hs]) hsStats[hs] = { exact: 0, under: 0, over: 0 };
  if (Math.abs(u.percentDiff) <= 1) hsStats[hs].exact++;
  else if (u.percentDiff < 0) hsStats[hs].under++;
  else hsStats[hs].over++;
}
for (const [hs, s] of Object.entries(hsStats).sort((a, b) => (b[1].under + b[1].over) - (a[1].under + a[1].over))) {
  const total = s.exact + s.under + s.over;
  const errPct = ((s.under + s.over) / total * 100).toFixed(1);
  console.log(`  ${hs.padEnd(18)} ${s.exact} exact, ${s.under} under, ${s.over} over (${errPct}% wrong of ${total})`);
}

// ANALYSIS 3: Tonnage distribution
console.log('\n=== TONNAGE vs ERROR ===');
const tonBuckets: Record<string, { exact: number; under: number; over: number; underGap: number; overGap: number }> = {};
for (const u of valid) {
  const t = u.tonnage || 0;
  const b = t <= 35 ? 'Light(20-35)' : t <= 55 ? 'Medium(40-55)' : t <= 75 ? 'Heavy(60-75)' : 'Assault(80+)';
  if (!tonBuckets[b]) tonBuckets[b] = { exact: 0, under: 0, over: 0, underGap: 0, overGap: 0 };
  if (Math.abs(u.percentDiff) <= 1) tonBuckets[b].exact++;
  else if (u.percentDiff < 0) { tonBuckets[b].under++; tonBuckets[b].underGap += Math.abs(u.difference); }
  else { tonBuckets[b].over++; tonBuckets[b].overGap += u.difference; }
}
for (const [b, s] of Object.entries(tonBuckets).sort()) {
  const total = s.exact + s.under + s.over;
  console.log(`  ${b.padEnd(18)} ${s.exact} exact, ${s.under} under(avg ${(s.underGap/Math.max(1,s.under)).toFixed(0)}BV), ${s.over} over(avg ${(s.overGap/Math.max(1,s.over)).toFixed(0)}BV) (${((s.under+s.over)/total*100).toFixed(1)}% wrong)`);
}

// ANALYSIS 4: Cockpit type
console.log('\n=== COCKPIT TYPE ===');
const cpStats: Record<string, { exact: number; under: number; over: number }> = {};
for (const u of valid) {
  const b = u.breakdown;
  const cp = b?.cockpitType || 'unknown';
  if (!cpStats[cp]) cpStats[cp] = { exact: 0, under: 0, over: 0 };
  if (Math.abs(u.percentDiff) <= 1) cpStats[cp].exact++;
  else if (u.percentDiff < 0) cpStats[cp].under++;
  else cpStats[cp].over++;
}
for (const [cp, s] of Object.entries(cpStats).sort((a, b) => (b[1].under + b[1].over) - (a[1].under + a[1].over))) {
  const total = s.exact + s.under + s.over;
  console.log(`  ${cp.padEnd(18)} ${s.exact} exact, ${s.under} under, ${s.over} over (${((s.under+s.over)/total*100).toFixed(1)}% wrong of ${total})`);
}

// ANALYSIS 5: Gap attribution
console.log('\n=== GAP COMPONENT ATTRIBUTION (all undercalculated) ===');
let offBVLow = 0, defBVLow = 0, bothLow = 0, unknown = 0;
for (const u of under) {
  const b = u.breakdown;
  if (!b) { unknown++; continue; }
  const cockpit = b.cockpitModifier ?? 1.0;
  const needed = Math.abs(u.difference);
  const impliedOff = Math.round(u.indexBV / cockpit) - b.defensiveBV;
  const offDelta = impliedOff - b.offensiveBV;
  if (offDelta > needed * 0.5) offBVLow++;
  else if (offDelta < needed * -0.5) defBVLow++;
  else bothLow++;
}
console.log(`  Offensive BV too low: ${offBVLow}/${under.length}`);
console.log(`  Defensive BV too low: ${defBVLow}/${under.length}`);
console.log(`  Both/ambiguous: ${bothLow}/${under.length}`);

// ANALYSIS 6: Explosive penalty correlation
console.log('\n=== EXPLOSIVE PENALTY CORRELATION ===');
const epBuckets: Record<string, { exact: number; under: number; over: number }> = {};
for (const u of valid) {
  const ep = u.breakdown?.explosivePenalty ?? 0;
  const b = ep === 0 ? '0' : ep <= 10 ? '1-10' : ep <= 20 ? '11-20' : ep <= 40 ? '21-40' : '41+';
  if (!epBuckets[b]) epBuckets[b] = { exact: 0, under: 0, over: 0 };
  if (Math.abs(u.percentDiff) <= 1) epBuckets[b].exact++;
  else if (u.percentDiff < 0) epBuckets[b].under++;
  else epBuckets[b].over++;
}
for (const [b, s] of Object.entries(epBuckets).sort()) {
  const total = s.exact + s.under + s.over;
  console.log(`  penalty=${b.padEnd(6)} ${s.exact} exact, ${s.under} under, ${s.over} over (${((s.under+s.over)/total*100).toFixed(1)}% wrong of ${total})`);
}

// ANALYSIS 7: Unresolved equipment
console.log('\n=== UNRESOLVED EQUIPMENT IN UNDERCALCULATED ===');
const unresolvedPatterns: Record<string, number> = {};
for (const u of under) {
  for (const issue of u.issues || []) {
    if (issue.includes('Unresolved')) {
      const match = issue.match(/Unresolved\s+\w+\s*[:=]?\s*(.*)/);
      const key = match ? match[1].substring(0, 40) : issue.substring(0, 50);
      unresolvedPatterns[key] = (unresolvedPatterns[key] || 0) + 1;
    }
  }
}
const sorted = Object.entries(unresolvedPatterns).sort((a, b) => b[1] - a[1]);
if (sorted.length === 0) console.log('  (none)');
else for (const [k, v] of sorted.slice(0, 15)) console.log(`  ${v}x ${k}`);

// ANALYSIS 8: Overcalculated drivers
console.log('\n=== OVERCALCULATED ANALYSIS ===');
let overOffHigh = 0, overDefHigh = 0, overBoth = 0;
for (const u of over) {
  const b = u.breakdown;
  if (!b) continue;
  const cockpit = b.cockpitModifier ?? 1.0;
  const impliedOff = Math.round(u.indexBV / cockpit) - b.defensiveBV;
  const offDelta = impliedOff - b.offensiveBV;
  if (offDelta < -Math.abs(u.difference) * 0.5) overOffHigh++;
  else if (offDelta > Math.abs(u.difference) * 0.5) overDefHigh++;
  else overBoth++;
}
console.log(`  Offensive BV too high: ${overOffHigh}/${over.length}`);
console.log(`  Defensive BV too high: ${overDefHigh}/${over.length}`);
console.log(`  Both/ambiguous: ${overBoth}/${over.length}`);

// ANALYSIS 9: Issue patterns
console.log('\n=== ISSUE PATTERN SUMMARY (top 20) ===');
const allIssues: Record<string, number> = {};
for (const u of [...under, ...over]) {
  for (const issue of u.issues || []) {
    const key = issue.substring(0, 60);
    allIssues[key] = (allIssues[key] || 0) + 1;
  }
}
for (const [k, v] of Object.entries(allIssues).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log(`  ${v}x ${k}`);
}

// ANALYSIS 10: HS count from unit data vs effective count
console.log('\n=== HS COUNT ANALYSIS (undercalculated) ===');
let hsCountMismatch = 0;
for (const u of under.slice(0, 50)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;
  if (!b) continue;
  const unitHS = unit.heatSinks?.count || 0;
  const effHS = b.heatSinkCount;
  if (effHS && effHS !== unitHS) {
    hsCountMismatch++;
    if (hsCountMismatch <= 5) {
      console.log(`  ${u.unitId}: unit.hs=${unitHS} eff=${effHS} type=${unit.heatSinks?.type} diss=${b.heatDissipation}`);
    }
  }
}
console.log(`  HS count mismatch: ${hsCountMismatch}/50 checked`);
