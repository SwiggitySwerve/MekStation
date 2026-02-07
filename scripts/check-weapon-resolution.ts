import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// For each undercalculated minor-disc unit, collect all crit slot weapon names
// and see which weapons correlate with larger gaps
const underCalc = report.allResults.filter((r: any) =>
  r.percentDiff < -1.0 && r.percentDiff > -5.0
);

// Also get "good" units (within 1%) for comparison
const goodUnits = report.allResults.filter((r: any) =>
  Math.abs(r.percentDiff) <= 1.0
);

// Count weapon occurrences in bad vs good units
const badWeaponCounts: Record<string, { count: number; totalGap: number }> = {};
const goodWeaponCounts: Record<string, number> = {};

function getUniqueWeapons(unitId: string): string[] {
  const entry = index.units.find((u: any) => u.id === unitId);
  if (!entry?.path) return [];
  try {
    const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    const weapons = new Set<string>();
    for (const [loc, slots] of Object.entries(u.criticalSlots || {})) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (!s || typeof s !== 'string') continue;
        const lo = s.toLowerCase();
        if (lo.includes('ammo') || lo.includes('endo') || lo.includes('ferro') ||
            lo.includes('actuator') || lo.includes('shoulder') || lo.includes('hip') ||
            lo.includes('engine') || lo.includes('gyro') || lo.includes('cockpit') ||
            lo.includes('life support') || lo.includes('sensor') || lo.includes('heat sink') ||
            lo.includes('jump jet') || lo.includes('case') || lo.includes('targeting') ||
            lo.includes('ecm') || lo.includes('probe') || lo.includes('tsm') ||
            lo.includes('masc') || lo.includes('supercharger') || lo.includes('myomer') ||
            lo.includes('command console') || lo.includes('c3') || lo.includes('tag') ||
            lo.includes('narc') || lo.includes('partial wing') || lo.includes('null sig') ||
            lo.includes('void sig') || lo.includes('chameleon') || lo.includes('watchdog') ||
            lo.includes('coolant') || lo.includes('angel') || lo.includes('bloodhound') ||
            lo.includes('artemis') || lo.includes('apollo') || lo.includes('shield') ||
            lo.includes('armored') || lo.includes('-empty-') || lo.includes('double heat sink'))
          continue;
        weapons.add(lo);
      }
    }
    return [...weapons];
  } catch { return []; }
}

// Process bad units
for (const r of underCalc) {
  const weapons = getUniqueWeapons(r.unitId);
  const gap = r.indexBV - r.calculatedBV;
  for (const w of weapons) {
    if (!badWeaponCounts[w]) badWeaponCounts[w] = { count: 0, totalGap: 0 };
    badWeaponCounts[w].count++;
    badWeaponCounts[w].totalGap += gap;
  }
}

// Process good units (sample of 300)
for (const r of goodUnits.slice(0, 300)) {
  const weapons = getUniqueWeapons(r.unitId);
  for (const w of weapons) {
    goodWeaponCounts[w] = (goodWeaponCounts[w] || 0) + 1;
  }
}

// Find weapons that appear disproportionately in bad units
console.log('=== WEAPONS DISPROPORTIONALLY IN UNDERCALCULATED UNITS ===');
console.log('(weapons appearing more in bad units relative to good units)\n');

const enriched: Array<{ weapon: string; badCount: number; goodCount: number; ratio: number; avgGap: number }> = [];
for (const [w, data] of Object.entries(badWeaponCounts)) {
  if (data.count < 3) continue; // Minimum occurrence
  const goodCount = goodWeaponCounts[w] || 0;
  const badRate = data.count / underCalc.length;
  const goodRate = goodCount / Math.min(goodUnits.length, 300);
  const ratio = badRate / (goodRate + 0.001); // avoid div by 0
  enriched.push({
    weapon: w,
    badCount: data.count,
    goodCount,
    ratio,
    avgGap: data.totalGap / data.count,
  });
}

enriched.sort((a, b) => b.ratio - a.ratio);
console.log('Weapon'.padEnd(50) + 'Bad  Good  Ratio  AvgGap');
for (const e of enriched.slice(0, 30)) {
  console.log(`${e.weapon.padEnd(50)} ${String(e.badCount).padStart(4)} ${String(e.goodCount).padStart(5)}  ${e.ratio.toFixed(2).padStart(5)}  ${e.avgGap.toFixed(1).padStart(6)}`);
}

// Check for unresolved weapons in undercalculated units
console.log('\n\n=== UNRESOLVED WEAPONS IN UNDERCALCULATED UNITS ===');
let unresolvedCount = 0;
for (const r of underCalc) {
  if (r.issues && r.issues.some((i: string) => i.includes('Unresolved'))) {
    unresolvedCount++;
    if (unresolvedCount <= 10) {
      console.log(`  ${r.unitId}: ${r.issues.filter((i: string) => i.includes('Unresolved')).join('; ')}`);
    }
  }
}
console.log(`Total with unresolved: ${unresolvedCount} / ${underCalc.length}`);

// Check: among units WITHOUT unresolved weapons, what's the gap?
const resolved = underCalc.filter((r: any) => !r.issues?.some((i: string) => i.includes('Unresolved')));
const avgGapResolved = resolved.reduce((s: number, r: any) => s + (r.indexBV - r.calculatedBV), 0) / resolved.length;
const avgPctResolved = resolved.reduce((s: number, r: any) => s + r.percentDiff, 0) / resolved.length;
console.log(`\nUnits without unresolved weapons: ${resolved.length}`);
console.log(`  Average gap: ${avgGapResolved.toFixed(1)} BV (${avgPctResolved.toFixed(2)}%)`);

const unresolved = underCalc.filter((r: any) => r.issues?.some((i: string) => i.includes('Unresolved')));
if (unresolved.length > 0) {
  const avgGapUnresolved = unresolved.reduce((s: number, r: any) => s + (r.indexBV - r.calculatedBV), 0) / unresolved.length;
  const avgPctUnresolved = unresolved.reduce((s: number, r: any) => s + r.percentDiff, 0) / unresolved.length;
  console.log(`Units with unresolved weapons: ${unresolved.length}`);
  console.log(`  Average gap: ${avgGapUnresolved.toFixed(1)} BV (${avgPctUnresolved.toFixed(2)}%)`);
}
