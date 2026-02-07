import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// THEORY: heat efficiency calculation differs between our code and MegaMek
// Our code: heatEfficiency = 6 + heatDissipation - moveHeat
// MegaMek: heatEfficiency = 6 + entity.getHeatCapacity() - moveHeat
//
// The question: does getHeatCapacity() == heatSinkCount * (isDHS ? 2 : 1)?
// Or is there a subtlety we're missing?
//
// MegaMek's getHeatCapacity() includes:
// - Built-in engine heat sinks
// - External heat sinks
// - Bonus from partial wing (+3 for Clan, +3 for IS)
//
// If we're computing heatDissipation wrong, it would affect which weapons get halved,
// which directly affects weaponBV.
//
// For the Boreas-D (14 Laser HS, standard engine 240):
// Our calc: heatDiss = 14 * 2 = 28
// MegaMek: getHeatCapacity() should also be 28
// heatEfficiency = 6 + 28 - 2 = 32
// 2 Heavy Large Lasers: 18 heat each = 36 total
// Both get full BV (488) since threshold crossed after second
// So the gap ISN'T from heat efficiency for this unit.

// Let's look at units where heat matters (where weapons get halved)
// and see if those have larger gaps

interface UnitHeatInfo {
  id: string;
  gap: number;
  pctDiff: number;
  totalWeaponHeat: number;
  heatDiss: number;
  heatEfficiency: number;
  weaponBV: number;
  weaponsHalved: boolean; // rough estimate
  techBase: string;
  tonnage: number;
  hsType: string;
  hsCount: number;
  engineRating: number;
}

const heatInfos: UnitHeatInfo[] = [];

for (const r of report.allResults) {
  if (r.status === 'error' || !r.breakdown) continue;
  const entry = index.units.find((u: any) => u.id === r.unitId);
  if (!entry?.path) continue;
  try {
    const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));

    // Estimate heat
    const walkMP = u.movement.walk;
    const runMP = Math.ceil(walkMP * 1.5);
    const jumpMP = u.movement.jump || 0;
    const engineType = u.engine.type.toUpperCase();

    let runHeat = 2;
    if (engineType.includes('ICE') || engineType.includes('FUEL')) runHeat = 0;
    else if (engineType.includes('XXL')) runHeat = 6;

    let jumpHeat = 0;
    if (jumpMP > 0) {
      if (engineType.includes('XXL')) jumpHeat = Math.max(6, jumpMP * 2);
      else jumpHeat = Math.max(3, jumpMP);
    }
    const moveHeat = Math.max(runHeat, jumpHeat);

    const isDHS = u.heatSinks?.type?.toUpperCase()?.includes('DOUBLE') ||
                  u.heatSinks?.type?.toUpperCase()?.includes('LASER');
    const heatDiss = u.heatSinks.count * (isDHS ? 2 : 1);
    const heatEfficiency = 6 + heatDiss - moveHeat;

    // Estimate total weapon heat from crits
    // This is rough - just check if heat efficiency is tight
    const weaponsHalved = heatEfficiency < 20; // rough proxy

    heatInfos.push({
      id: r.unitId,
      gap: r.difference,
      pctDiff: r.percentDiff,
      totalWeaponHeat: 0, // unknown without weapon catalog
      heatDiss,
      heatEfficiency,
      weaponBV: r.breakdown.weaponBV,
      weaponsHalved,
      techBase: u.techBase,
      tonnage: u.tonnage,
      hsType: u.heatSinks?.type || 'unknown',
      hsCount: u.heatSinks?.count || 0,
      engineRating: u.engine.rating,
    });
  } catch {}
}

// Group by heat sink type and check gap
console.log('=== GAP BY HEAT SINK TYPE ===');
const byHSType: Record<string, { gaps: number[]; count: number }> = {};
for (const h of heatInfos) {
  const t = h.hsType.toUpperCase();
  const key = t.includes('DOUBLE') ? (t.includes('CLAN') ? 'DOUBLE_CLAN' : 'DOUBLE_IS') :
    t.includes('LASER') ? 'LASER' :
    t.includes('COMPACT') ? 'COMPACT' : 'SINGLE';
  if (!byHSType[key]) byHSType[key] = { gaps: [], count: 0 };
  byHSType[key].gaps.push(h.pctDiff);
  byHSType[key].count++;
}
for (const [type, data] of Object.entries(byHSType).sort()) {
  const avg = data.gaps.reduce((s, g) => s + g, 0) / data.count;
  const within1 = data.gaps.filter(g => Math.abs(g) <= 1).length;
  console.log(`  ${type.padEnd(15)} n=${String(data.count).padStart(5)} avgPct=${avg.toFixed(2).padStart(7)}% within1%=${String(within1).padStart(5)} (${(within1/data.count*100).toFixed(1)}%)`);
}

// Group by heat efficiency bracket
console.log('\n=== GAP BY HEAT EFFICIENCY ===');
const heBins = [
  { label: 'HE < 10', min: -999, max: 10 },
  { label: 'HE 10-20', min: 10, max: 20 },
  { label: 'HE 20-30', min: 20, max: 30 },
  { label: 'HE 30+', min: 30, max: 999 },
];
for (const bin of heBins) {
  const pool = heatInfos.filter(h => h.heatEfficiency >= bin.min && h.heatEfficiency < bin.max);
  if (pool.length > 0) {
    const avgGap = pool.reduce((s, h) => s + h.pctDiff, 0) / pool.length;
    const within1 = pool.filter(h => Math.abs(h.pctDiff) <= 1).length;
    console.log(`  ${bin.label.padEnd(12)} n=${String(pool.length).padStart(5)} avgPct=${avgGap.toFixed(2).padStart(7)}% within1%=${String(within1).padStart(5)} (${(within1/pool.length*100).toFixed(1)}%)`);
  }
}

// Check specifically: units with SHS (single heat sinks)
console.log('\n=== SINGLE HEAT SINK UNITS (minor-disc only) ===');
const shsMinorDisc = heatInfos.filter(h =>
  !h.hsType.toUpperCase().includes('DOUBLE') && !h.hsType.toUpperCase().includes('LASER') &&
  !h.hsType.toUpperCase().includes('COMPACT') &&
  Math.abs(h.pctDiff) > 1 && Math.abs(h.pctDiff) <= 5
);
console.log(`Count: ${shsMinorDisc.length}`);
for (const h of shsMinorDisc.slice(0, 15)) {
  console.log(`  ${h.id.padEnd(45)} gap=${String(h.gap).padStart(5)} (${h.pctDiff.toFixed(2).padStart(6)}%) hsCount=${h.hsCount} HE=${h.heatEfficiency} wBV=${h.weaponBV}`);
}

// Check Compact HS
console.log('\n=== COMPACT HEAT SINK UNITS ===');
const compactHS = heatInfos.filter(h => h.hsType.toUpperCase().includes('COMPACT'));
console.log(`Count: ${compactHS.length}`);
for (const h of compactHS.slice(0, 10)) {
  console.log(`  ${h.id.padEnd(45)} gap=${String(h.gap).padStart(5)} (${h.pctDiff.toFixed(2).padStart(6)}%) hsCount=${h.hsCount} HE=${h.heatEfficiency}`);
}
