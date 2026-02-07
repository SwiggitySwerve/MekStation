import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Check HEAD slot patterns for overcalculated units
// Small cockpit HEAD pattern: [LS, Sensors, Cockpit, Sensors, ?, ?]
// Standard cockpit HEAD pattern: [LS, Sensors, Cockpit, ?, Sensors, LS]

interface HeadInfo {
  id: string;
  slots: (string | null)[];
  pattern: string;
  pctDiff: number;
  lsCount: number;
  sensorAt4: boolean; // Sensors in slot 4 (0-indexed slot 3)
}

const units: HeadInfo[] = [];
for (const entry of index.units) {
  if (!entry.path) continue;
  const r = report.allResults.find((x: any) => x.unitId === entry.id);
  if (!r) continue;
  try {
    const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    const head = u.criticalSlots?.HEAD;
    if (!Array.isArray(head)) continue;
    const slots = head.map((s: any) => s || null);
    const lsCount = slots.filter((s: any) => s && s.includes('Life Support')).length;
    const sensorAt4 = slots[3] && slots[3].includes('Sensors');
    const pattern = slots.map((s: any) => {
      if (!s) return 'empty';
      if (s.includes('Life Support')) return 'LS';
      if (s.includes('Sensors')) return 'SEN';
      if (s.includes('Cockpit')) return 'CP';
      return 'EQ';
    }).join(',');

    units.push({ id: entry.id, slots, pattern, pctDiff: r.percentDiff, lsCount, sensorAt4 });
  } catch {}
}

// Pattern analysis
const patternStats: Record<string, { count: number; overcalc5: number; within1: number; avgPct: number }> = {};
for (const u of units) {
  if (!patternStats[u.pattern]) patternStats[u.pattern] = { count: 0, overcalc5: 0, within1: 0, avgPct: 0 };
  patternStats[u.pattern].count++;
  patternStats[u.pattern].avgPct += u.pctDiff;
  if (u.pctDiff > 3 && u.pctDiff < 7) patternStats[u.pattern].overcalc5++;
  if (Math.abs(u.pctDiff) <= 1) patternStats[u.pattern].within1++;
}

console.log('=== HEAD SLOT PATTERNS (simplified) ===');
for (const [pat, stats] of Object.entries(patternStats).sort((a, b) => b[1].count - a[1].count).slice(0, 15)) {
  const avg = (stats.avgPct / stats.count).toFixed(2);
  console.log(`  [${String(stats.count).padStart(4)}x] ${pat.padEnd(35)} avgPct=${avg.padStart(7)}% overcalc5=${stats.overcalc5} within1=${stats.within1}`);
}

// Small cockpit pattern: LS,SEN,CP,SEN followed by anything
// Standard cockpit pattern: LS,SEN,CP,?,SEN,LS or LS,SEN,CP,EQ,SEN,LS
const smallCockpitLike = units.filter(u => u.sensorAt4 && u.lsCount === 1);
const standardCockpitLike = units.filter(u => !u.sensorAt4 || u.lsCount === 2);

console.log(`\n=== HEURISTIC: Sensors in slot 4 + LS=1 ===`);
console.log(`Small-cockpit-like (SEN@4 + LS=1): ${smallCockpitLike.length}`);
console.log(`  Overcalc 3-7%: ${smallCockpitLike.filter(u => u.pctDiff > 3 && u.pctDiff < 7).length}`);
console.log(`  Within 1%: ${smallCockpitLike.filter(u => Math.abs(u.pctDiff) <= 1).length}`);
console.log(`  Would break if 0.95x applied: ${smallCockpitLike.filter(u => Math.abs(u.pctDiff) <= 1).length}`);

console.log(`\nStandard-cockpit-like: ${standardCockpitLike.length}`);
console.log(`  Overcalc 3-7%: ${standardCockpitLike.filter(u => u.pctDiff > 3 && u.pctDiff < 7).length}`);
console.log(`  Within 1%: ${standardCockpitLike.filter(u => Math.abs(u.pctDiff) <= 1).length}`);

// Check the LS=1 but NOT SEN@4 units
const ls1_noSen4 = units.filter(u => u.lsCount === 1 && !u.sensorAt4);
console.log(`\n=== LS=1 but Sensors NOT at slot 4 (standard cockpit + replaced LS) ===`);
console.log(`Count: ${ls1_noSen4.length}`);
for (const u of ls1_noSen4.slice(0, 10)) {
  console.log(`  ${u.id.padEnd(40)} pct=${u.pctDiff.toFixed(2)}% pattern=${u.pattern}`);
}
