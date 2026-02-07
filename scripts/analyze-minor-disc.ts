import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

const minorDisc = report.allResults.filter((x: any) => x.rootCause === 'minor-discrepancy');

// Categorize by tech base AND direction
const buckets: Record<string, any[]> = {};

for (const u of minorDisc) {
  const entry = (index.units as any[]).find(e => e.id === u.unitId);
  if (!entry || !entry.path) continue;
  try {
    const data = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    const dir = u.difference < 0 ? 'under' : 'over';
    const key = `${data.techBase}-${dir}`;
    if (!buckets[key]) buckets[key] = [];
    const b = u.breakdown;
    const rawGap = (u.indexBV - b.defensiveBV) / b.speedFactor - b.offensiveBV / b.speedFactor;
    buckets[key].push({
      ...u, rawGap, techBase: data.techBase,
      hsType: data.heatSinks.type,
      hsCount: data.heatSinks.count,
      equipment: data.equipment,
      criticalSlots: data.criticalSlots,
      tonnageVal: data.tonnage,
      engineType: data.engine.type,
      engineRating: data.engine.rating,
      config: data.configuration,
    });
  } catch {}
}

console.log('=== Minor-disc by tech base and direction ===');
for (const [key, units] of Object.entries(buckets).sort()) {
  console.log(`${key}: ${units.length}`);
}

// Now show worst undercalculated for each tech base
for (const tech of ['IS', 'CLAN', 'MIXED']) {
  const key = `${tech}-under`;
  const units = buckets[key];
  if (!units || units.length === 0) {
    console.log(`\n--- ${tech} undercalculated: NONE ---`);
    continue;
  }
  units.sort((a: any, b: any) => a.percentDiff - b.percentDiff);
  console.log(`\n--- ${tech} undercalculated (${units.length}) ---`);
  console.log('Unit'.padEnd(40) + ' diff    pct%  rawGap  ammoBV  ton  equip');
  for (const u of units.slice(0, 15)) {
    const b = u.breakdown;
    const eqList = u.equipment.map((e: any) => e.id).join(',').substring(0, 55);
    console.log(
      `${u.unitId.padEnd(40)} ${String(u.difference).padStart(5)} ${u.percentDiff.toFixed(1).padStart(6)}% ${u.rawGap.toFixed(1).padStart(7)} ${String(b.ammoBV).padStart(7)} ${String(u.tonnageVal).padStart(4)}t ${eqList}`
    );
  }
}

// Physical weapons in minor-disc crits
let physCount = 0;
const physTypes: Record<string, { count: number; sumGap: number }> = {};
for (const units of Object.values(buckets)) {
  for (const u of units as any[]) {
    if (!u.criticalSlots) continue;
    let hasPhys = false;
    for (const [loc, slots] of Object.entries(u.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots as string[]) {
        if (!s || typeof s !== 'string') continue;
        const sl = s.toLowerCase();
        if (sl.includes('hatchet') || sl.includes('sword') || sl.includes('claw') ||
            sl.includes('mace') || sl.includes('talon') || sl.includes('retractable blade') ||
            sl.includes('lance') || sl.includes('spike') || sl.includes('vibroblade')) {
          hasPhys = true;
          if (!physTypes[sl]) physTypes[sl] = { count: 0, sumGap: 0 };
          physTypes[sl].count++;
          physTypes[sl].sumGap += u.difference;
        }
      }
    }
    if (hasPhys) physCount++;
  }
}
console.log('\n=== Physical weapons in minor-disc units: ' + physCount + ' ===');
for (const [k, v] of Object.entries(physTypes).sort((a, b) => b[1].count - a[1].count)) {
  console.log('  ' + k.padEnd(40) + ' n=' + String(v.count).padStart(3) + ' sumDiff=' + v.sumGap);
}

// Targeting Computer analysis
let tcCount = 0;
let tcGapSum = 0;
let noTcCount = 0;
let noTcGapSum = 0;
for (const units of Object.values(buckets)) {
  for (const u of units as any[]) {
    const hasTC = u.equipment.some((e: any) => {
      const lo = e.id.toLowerCase();
      return lo.includes('targeting-computer') || lo.includes('targeting computer');
    });
    if (hasTC) { tcCount++; tcGapSum += u.difference; }
    else { noTcCount++; noTcGapSum += u.difference; }
  }
}
console.log('\n=== Targeting Computer impact ===');
console.log('  With TC: n=' + tcCount + ' avgDiff=' + (tcGapSum / tcCount).toFixed(1));
console.log('  No TC: n=' + noTcCount + ' avgDiff=' + (noTcGapSum / noTcCount).toFixed(1));
