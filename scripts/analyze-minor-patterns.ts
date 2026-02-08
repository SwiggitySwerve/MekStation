import * as fs from 'fs';
import * as path from 'path';

const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = 'public/data/units/battlemechs';
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Analyze the 362 wrong units
const wrong = r.allResults.filter((x: any) => Math.abs(x.percentDiff) > 1 && x.breakdown);

console.log(`Total wrong units: ${wrong.length}`);
console.log(`  Overcalculated (>1%): ${wrong.filter((x: any) => x.percentDiff > 1).length}`);
console.log(`  Undercalculated (<-1%): ${wrong.filter((x: any) => x.percentDiff < -1).length}`);

// Distribution by percentage band
const bands = [
  { min: 1, max: 2, label: '1-2%' },
  { min: 2, max: 3, label: '2-3%' },
  { min: 3, max: 5, label: '3-5%' },
  { min: 5, max: 10, label: '5-10%' },
  { min: 10, max: 100, label: '10%+' },
];

console.log('\nDistribution by abs % diff:');
for (const band of bands) {
  const over = wrong.filter((x: any) => x.percentDiff > 0 && Math.abs(x.percentDiff) >= band.min && Math.abs(x.percentDiff) < band.max).length;
  const under = wrong.filter((x: any) => x.percentDiff < 0 && Math.abs(x.percentDiff) >= band.min && Math.abs(x.percentDiff) < band.max).length;
  console.log(`  ${band.label}: ${over + under} (over: ${over}, under: ${under})`);
}

// Analyze by tech base
const byTechBase: Record<string, { over: number; under: number; total: number }> = {};
for (const res of wrong) {
  const entry = index.units.find((e: any) => e.id === res.unitId);
  if (!entry?.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    const tb = d.techBase || 'UNKNOWN';
    if (!byTechBase[tb]) byTechBase[tb] = { over: 0, under: 0, total: 0 };
    byTechBase[tb].total++;
    if (res.percentDiff > 0) byTechBase[tb].over++;
    else byTechBase[tb].under++;
  } catch {}
}
console.log('\nBy tech base:');
for (const [tb, counts] of Object.entries(byTechBase)) {
  // Also get the total validated units of this tech base
  const totalTB = r.allResults.filter((x: any) => {
    const e = index.units.find((u: any) => u.id === x.unitId);
    if (!e?.path) return false;
    try { const d = JSON.parse(fs.readFileSync(path.join(unitsDir, e.path), 'utf8')); return d.techBase === tb; } catch { return false; }
  }).length;
  const correctTB = totalTB - counts.total;
  console.log(`  ${tb}: ${counts.total} wrong (${counts.over} over, ${counts.under} under) out of ~${totalTB} = ${(correctTB/totalTB*100).toFixed(1)}% accuracy`);
}

// Check if units with issues (unresolved weapons) are disproportionately wrong
const withIssues = wrong.filter((x: any) => x.issues && x.issues.length > 0);
console.log(`\nUnits with issues: ${withIssues.length}/${wrong.length}`);
const issueTypes: Record<string, number> = {};
for (const res of withIssues) {
  for (const issue of res.issues) {
    const type = issue.split(':')[0].trim();
    issueTypes[type] = (issueTypes[type] || 0) + 1;
  }
}
for (const [type, count] of Object.entries(issueTypes).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type}: ${count}`);
}

// For minor discrepancies (1-5%), what's the defensive vs offensive gap?
const minor = wrong.filter((x: any) => Math.abs(x.percentDiff) > 1 && Math.abs(x.percentDiff) <= 5 && x.breakdown);
console.log(`\nMinor discrepancy analysis (${minor.length} units, 1-5% off):`);

let defGapCount = 0;
let offGapCount = 0;
let bothGapCount = 0;

for (const res of minor) {
  const b = res.breakdown;
  const entry = index.units.find((e: any) => e.id === res.unitId);
  if (!entry?.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    // Can't directly separate def vs off gap without recomputing...
    // But we can check if the unit has characteristics that might cause issues
  } catch {}
}

// Check for common equipment among the wrong 1-5% units
const equipCounts: Record<string, { wrong: number; total: number }> = {};

function checkEquip(unitId: string): string[] {
  const entry = index.units.find((e: any) => e.id === unitId);
  if (!entry?.path) return [];
  try {
    const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    const flags: string[] = [];
    flags.push(`techBase=${d.techBase}`);
    flags.push(`engine=${d.engine?.type}`);
    flags.push(`hs=${d.heatSinks?.type}`);
    const allSlots: string[] = [];
    for (const [, slots] of Object.entries(d.criticalSlots || {})) {
      for (const s of (slots as (string|null)[])) {
        if (s && typeof s === 'string') allSlots.push(s.toLowerCase().replace(/\s*\(omnipod\)/gi, ''));
      }
    }
    if (allSlots.some(s => s.includes('targeting computer'))) flags.push('has-TC');
    if (allSlots.some(s => s.includes('artemis'))) flags.push('has-Artemis');
    if (allSlots.some(s => s.includes('streak'))) flags.push('has-Streak');
    if (allSlots.some(s => s.includes('ultra') || s.includes('uac'))) flags.push('has-UAC');
    if (allSlots.some(s => s.includes('lb') && s.includes('-x'))) flags.push('has-LBX');
    if (allSlots.some(s => s.includes('gauss') && !s.includes('ammo'))) flags.push('has-Gauss');
    if (allSlots.some(s => s.includes('er ppc') || s.includes('erppc'))) flags.push('has-ERPPC');
    if (allSlots.some(s => s.includes('er large') || s.includes('erlargelaser'))) flags.push('has-ERLL');
    if (allSlots.some(s => s.includes('masc'))) flags.push('has-MASC');
    if (allSlots.some(s => s.includes('partial wing'))) flags.push('has-PartialWing');
    if (allSlots.some(s => s.includes('shield'))) flags.push('has-Shield');
    if (d.movement?.jump > 0) flags.push('has-JJ');
    if ((d.armor?.type || '').toUpperCase().includes('FERRO')) flags.push('has-FerroArmor');
    if ((d.structure?.type || '').toUpperCase().includes('ENDO')) flags.push('has-EndoSteel');
    return flags;
  } catch { return []; }
}

// Count equipment prevalence among wrong vs all units
for (const res of wrong) {
  const flags = checkEquip(res.unitId);
  for (const f of flags) {
    if (!equipCounts[f]) equipCounts[f] = { wrong: 0, total: 0 };
    equipCounts[f].wrong++;
  }
}
for (const res of r.allResults) {
  const flags = checkEquip(res.unitId);
  for (const f of flags) {
    if (!equipCounts[f]) equipCounts[f] = { wrong: 0, total: 0 };
    equipCounts[f].total++;
  }
}

console.log('\nEquipment enrichment in wrong units (wrong% vs total%):');
const totalCount = r.allResults.length;
for (const [flag, counts] of Object.entries(equipCounts).sort((a, b) => {
  const aRatio = a[1].total > 0 ? a[1].wrong / a[1].total : 0;
  const bRatio = b[1].total > 0 ? b[1].wrong / b[1].total : 0;
  return bRatio - aRatio;
})) {
  const wrongPct = wrong.length > 0 ? (counts.wrong / wrong.length * 100).toFixed(1) : '0';
  const totalPct = totalCount > 0 ? (counts.total / totalCount * 100).toFixed(1) : '0';
  const enrichment = counts.total > 0 ? (counts.wrong / counts.total) / (wrong.length / totalCount) : 0;
  if (counts.total >= 10 && enrichment > 1.2) {
    console.log(`  ${flag}: ${counts.wrong}/${counts.total} wrong (${wrongPct}% of wrong, ${totalPct}% of total, ${enrichment.toFixed(2)}x enriched)`);
  }
}
