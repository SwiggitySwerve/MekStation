import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Get undercalculated minor-disc units (-1% to -5%)
const underCalc = report.allResults.filter((r: any) =>
  r.percentDiff < -1.0 && r.percentDiff > -5.0
).sort((a: any, b: any) => a.percentDiff - b.percentDiff);

console.log(`Total undercalculated minor-disc: ${underCalc.length}\n`);

// For each, compute what the missing BV is and whether it's on def or off side
// MegaMek reports totalBV = round((defBV + offBV) * cockpitMod)
// Our calc: same formula
// Gap = indexBV - calcBV  (positive = we're undercalculating)
//
// To figure out def vs off, we need to understand:
// offBV = (weaponBV + ammoBV + physicalWeaponBV + weightBonus + offEquipBV) * speedFactor
// defBV = (armorBV + structBV + gyroBV + defEquipBV - explosivePen) * defensiveFactor * engineMult(struct)
//
// If gap is proportional to speedFactor, it's likely on the offensive side (weapon BV issue)
// If gap is proportional to defensiveFactor, it's likely on the defensive side

// Analyze gap distribution between def and off sides
interface GapAnalysis {
  unitId: string;
  techBase: string;
  tonnage: number;
  gap: number;
  pctDiff: number;
  defBV: number;
  offBV: number;
  weaponBV: number;
  ammoBV: number;
  speedFactor: number;
  defensiveEquipBV: number;
  explosivePen: number;
  // Computed
  gapPerSF: number; // gap / speedFactor = raw offensive gap
  offBVRaw: number; // offBV / speedFactor = raw offensive before SF
}

const analyses: GapAnalysis[] = [];

for (const r of underCalc) {
  const entry = index.units.find((u: any) => u.id === r.unitId);
  if (!entry?.path) continue;
  try {
    const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    const b = r.breakdown;
    if (!b) continue;

    const gap = r.indexBV - r.calculatedBV;
    analyses.push({
      unitId: r.unitId,
      techBase: u.techBase,
      tonnage: u.tonnage,
      gap,
      pctDiff: r.percentDiff,
      defBV: b.defensiveBV,
      offBV: b.offensiveBV,
      weaponBV: b.weaponBV,
      ammoBV: b.ammoBV,
      speedFactor: b.speedFactor,
      defensiveEquipBV: b.defensiveEquipBV,
      explosivePen: b.explosivePenalty,
      gapPerSF: gap / b.speedFactor,
      offBVRaw: b.offensiveBV / b.speedFactor,
    });
  } catch {}
}

console.log(`Analyzed ${analyses.length} units\n`);

// Check correlation: gap / speedFactor vs gap
// If gap/SF is constant, the missing BV is on the raw offensive side (before SF multiplication)
const avgGap = analyses.reduce((s, a) => s + a.gap, 0) / analyses.length;
const avgGapPerSF = analyses.reduce((s, a) => s + a.gapPerSF, 0) / analyses.length;
console.log(`Average gap: ${avgGap.toFixed(1)} BV`);
console.log(`Average gap/speedFactor: ${avgGapPerSF.toFixed(1)} BV`);
console.log(`Average speedFactor: ${(analyses.reduce((s, a) => s + a.speedFactor, 0) / analyses.length).toFixed(3)}`);

// Check: is gap proportional to tonnage (suggesting weight bonus issue)?
console.log('\n=== GAP vs TONNAGE ===');
const tonBins: Record<string, { gaps: number[]; tonnages: number[] }> = {};
for (const a of analyses) {
  const bin = a.tonnage <= 35 ? 'Light' : a.tonnage <= 55 ? 'Medium' : a.tonnage <= 75 ? 'Heavy' : 'Assault';
  if (!tonBins[bin]) tonBins[bin] = { gaps: [], tonnages: [] };
  tonBins[bin].gaps.push(a.gap);
  tonBins[bin].tonnages.push(a.tonnage);
}
for (const [bin, data] of Object.entries(tonBins).sort()) {
  const avgGap = data.gaps.reduce((s, g) => s + g, 0) / data.gaps.length;
  const avgTon = data.tonnages.reduce((s, t) => s + t, 0) / data.tonnages.length;
  console.log(`  ${bin.padEnd(10)} n=${String(data.gaps.length).padStart(3)} avgGap=${avgGap.toFixed(1).padStart(7)} avgTon=${avgTon.toFixed(0).padStart(4)}`);
}

// Check: is gap proportional to weaponBV (suggesting weapon BV resolution issue)?
console.log('\n=== GAP vs WEAPON BV ===');
const wBins = [
  { label: 'wBV<500', min: 0, max: 500 },
  { label: 'wBV 500-1000', min: 500, max: 1000 },
  { label: 'wBV 1000-1500', min: 1000, max: 1500 },
  { label: 'wBV 1500-2000', min: 1500, max: 2000 },
  { label: 'wBV>2000', min: 2000, max: 99999 },
];
for (const bin of wBins) {
  const pool = analyses.filter(a => a.weaponBV >= bin.min && a.weaponBV < bin.max);
  if (pool.length > 0) {
    const avgGap = pool.reduce((s, a) => s + a.gap, 0) / pool.length;
    const avgPct = pool.reduce((s, a) => s + a.pctDiff, 0) / pool.length;
    console.log(`  ${bin.label.padEnd(18)} n=${String(pool.length).padStart(3)} avgGap=${avgGap.toFixed(1).padStart(7)} avgPct=${avgPct.toFixed(2).padStart(7)}%`);
  }
}

// Check: gap / tonnage ratio (if constant, weight bonus might be off)
console.log('\n=== GAP / TONNAGE RATIO ===');
const gapPerTon = analyses.map(a => a.gap / a.tonnage);
const avgGapPerTon = gapPerTon.reduce((s, g) => s + g, 0) / gapPerTon.length;
const medianGapPerTon = gapPerTon.sort((a, b) => a - b)[Math.floor(gapPerTon.length / 2)];
console.log(`  Avg gap/tonnage: ${avgGapPerTon.toFixed(3)}`);
console.log(`  Median gap/tonnage: ${medianGapPerTon.toFixed(3)}`);

// gap/tonnage by speed factor
console.log('\n=== GAP/TONNAGE vs SPEED FACTOR ===');
const sfBins = [
  { label: 'SF<1.0', min: 0, max: 1.0 },
  { label: 'SF 1.0-1.2', min: 1.0, max: 1.2 },
  { label: 'SF 1.2-1.5', min: 1.2, max: 1.5 },
  { label: 'SF>1.5', min: 1.5, max: 99 },
];
for (const bin of sfBins) {
  const pool = analyses.filter(a => a.speedFactor >= bin.min && a.speedFactor < bin.max);
  if (pool.length > 0) {
    const avgRatio = pool.reduce((s, a) => s + a.gap / a.tonnage, 0) / pool.length;
    const avgGap = pool.reduce((s, a) => s + a.gap, 0) / pool.length;
    const avgSF = pool.reduce((s, a) => s + a.speedFactor, 0) / pool.length;
    console.log(`  ${bin.label.padEnd(14)} n=${String(pool.length).padStart(3)} avgGap/ton=${avgRatio.toFixed(3).padStart(7)} avgGap=${avgGap.toFixed(1).padStart(7)} avgSF=${avgSF.toFixed(3)}`);
  }
}

// Check: is the gap exactly = some fraction of defBV? (suggests missing defensive multiplier)
console.log('\n=== GAP as fraction of DEF BV ===');
const gapDefRatio = analyses.map(a => a.gap / a.defBV);
const avgGapDefRatio = gapDefRatio.reduce((s, r) => s + r, 0) / gapDefRatio.length;
console.log(`  Avg gap/defBV: ${avgGapDefRatio.toFixed(4)} (${(avgGapDefRatio * 100).toFixed(2)}%)`);

// Check: is the gap exactly = some fraction of offBV?
const gapOffRatio = analyses.map(a => a.gap / a.offBV);
const avgGapOffRatio = gapOffRatio.reduce((s, r) => s + r, 0) / gapOffRatio.length;
console.log(`  Avg gap/offBV: ${avgGapOffRatio.toFixed(4)} (${(avgGapOffRatio * 100).toFixed(2)}%)`);

// Pick 5 specific units and do full trace
console.log('\n\n=== DETAILED TRACES ===');
const traceUnits = [
  analyses[0],  // worst
  analyses[Math.floor(analyses.length * 0.25)], // 25th pctile
  analyses[Math.floor(analyses.length * 0.5)], // median
  analyses[Math.floor(analyses.length * 0.75)], // 75th pctile
  analyses[analyses.length - 1], // least gap
];

for (const a of traceUnits) {
  if (!a) continue;
  const entry = index.units.find((u: any) => u.id === a.unitId);
  if (!entry?.path) continue;
  const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${a.unitId} (${u.techBase}, ${u.tonnage}t, gap=${a.gap}, ${a.pctDiff.toFixed(2)}%)`);
  console.log(`  Engine: ${u.engine?.type} ${u.engine?.rating}`);
  console.log(`  Gyro: ${u.gyro?.type}`);
  console.log(`  Structure: ${u.structure?.type}`);
  console.log(`  Armor type: ${u.armor?.type}`);
  console.log(`  Movement: walk=${u.movement?.walk} jump=${u.movement?.jump || 0}`);
  console.log(`  HeatSinks: ${u.heatSinks?.type} ${u.heatSinks?.count}`);
  console.log(`  defBV=${a.defBV.toFixed(2)} offBV=${a.offBV.toFixed(2)}`);
  console.log(`  weaponBV=${a.weaponBV.toFixed(2)} ammoBV=${a.ammoBV.toFixed(2)}`);
  console.log(`  speedFactor=${a.speedFactor.toFixed(4)}`);
  console.log(`  defEquipBV=${a.defensiveEquipBV} explosivePen=${a.explosivePen}`);
  console.log(`  gap/tonnage=${(a.gap / a.tonnage).toFixed(3)}`);
  console.log(`  gap/SF=${a.gapPerSF.toFixed(1)}`);

  // Enumerate all crits for trace
  const allCrits: Record<string, string[]> = {};
  for (const [loc, slots] of Object.entries(u.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    const filled = (slots as any[]).filter((s: any) => s && typeof s === 'string');
    if (filled.length > 0) allCrits[loc] = filled;
  }

  // Check for defensive equipment we might be missing
  const allSlots = Object.values(allCrits).flat().map(s => s.toLowerCase());
  const defEquip = allSlots.filter(s =>
    s.includes('ams') || s.includes('ecm') || s.includes('probe') || s.includes('beagle') ||
    s.includes('bloodhound') || s.includes('c3') || s.includes('tag') || s.includes('narc') ||
    s.includes('shield') || s.includes('blue-shield') || s.includes('armored')
  );
  if (defEquip.length > 0) {
    console.log(`  Def equipment in crits: ${[...new Set(defEquip)].join(', ')}`);
  }

  // Check for offensive equipment we might be missing
  const offEquip = allSlots.filter(s =>
    s.includes('targeting computer') || s.includes('apollo') || s.includes('artemis')
  );
  if (offEquip.length > 0) {
    console.log(`  Off equipment in crits: ${[...new Set(offEquip)].join(', ')}`);
  }
}
