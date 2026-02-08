import * as fs from 'fs';
import * as path from 'path';

const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = 'public/data/units/battlemechs';
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Filter to defensive-gap undercalculated units (offBV correct but defBV too low)
const defGapUnits = r.allResults.filter((res: any) => {
  if (res.percentDiff >= -1 || !res.breakdown) return false;
  const b = res.breakdown;
  const rawOff = b.offensiveBV / b.speedFactor;
  const expectedRawOff = b.weaponBV + b.ammoBV + res.tonnage;
  return Math.abs(rawOff - expectedRawOff) / Math.max(1, expectedRawOff) < 0.02;
});

console.log(`Analyzing ${defGapUnits.length} defensive-gap undercalculated units\n`);

// For each, compute: neededBaseDef - baseDef, and correlate with components
interface GapAnalysis {
  unitId: string;
  tonnage: number;
  techBase: string;
  engineType: string;
  armorType: string;
  baseDefGap: number;
  armorBV: number;
  structBV: number;
  gyroBV: number;
  defEquip: number;
  explPen: number;
  defFactor: number;
  totalArmor: number;
  hasClanFF: boolean;
  hasEndo: boolean;
  hasXL: boolean;
  hasXXL: boolean;
  cockpit: string;
}

function calcTotalArmor(a: any): number {
  let t = 0;
  for (const v of Object.values(a)) {
    if (typeof v === 'number') t += v;
    else if (v && typeof v === 'object') t += ((v as any).front || 0) + ((v as any).rear || 0);
  }
  return t;
}

const analyses: GapAnalysis[] = [];

for (const res of defGapUnits) {
  const b = res.breakdown;
  const entry = index.units.find((e: any) => e.id === res.unitId);
  if (!entry?.path || !b.defensiveFactor) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));

    let cockpitMod = 1.0;
    const cockpit = (d.cockpit || 'STANDARD').toUpperCase();
    if (cockpit.includes('SMALL') || cockpit.includes('TORSO')) cockpitMod = 0.95;
    if (cockpit.includes('INTERFACE')) cockpitMod = 1.3;

    const neededBaseBV = res.indexBV / cockpitMod;
    const neededDefBV = neededBaseBV - b.offensiveBV;
    const neededBaseDef = neededDefBV / b.defensiveFactor;

    const baseDef = b.armorBV + b.structureBV + b.gyroBV + b.defensiveEquipBV - b.explosivePenalty;
    const baseDefGap = neededBaseDef - baseDef;

    analyses.push({
      unitId: res.unitId,
      tonnage: d.tonnage,
      techBase: d.techBase,
      engineType: d.engine.type,
      armorType: d.armor.type.toUpperCase(),
      baseDefGap,
      armorBV: b.armorBV,
      structBV: b.structureBV,
      gyroBV: b.gyroBV,
      defEquip: b.defensiveEquipBV,
      explPen: b.explosivePenalty,
      defFactor: b.defensiveFactor,
      totalArmor: calcTotalArmor(d.armor.allocation),
      hasClanFF: d.armor.type.toUpperCase().includes('CLAN'),
      hasEndo: d.structure.type.toUpperCase().includes('ENDO'),
      hasXL: d.engine.type.toUpperCase().includes('XL') && !d.engine.type.toUpperCase().includes('XXL'),
      hasXXL: d.engine.type.toUpperCase().includes('XXL'),
      cockpit: cockpit,
    });
  } catch {}
}

console.log(`Analyzed ${analyses.length} units\n`);

// Check: does gap correlate with tonnage?
const corr = analyses.map(a => ({ x: a.tonnage, y: a.baseDefGap }));
const avgX = corr.reduce((s, c) => s + c.x, 0) / corr.length;
const avgY = corr.reduce((s, c) => s + c.y, 0) / corr.length;
let num = 0, denX = 0, denY = 0;
for (const c of corr) { num += (c.x - avgX) * (c.y - avgY); denX += (c.x - avgX) ** 2; denY += (c.y - avgY) ** 2; }
const pearson = num / Math.sqrt(denX * denY);
console.log(`Correlation gap~tonnage: r=${pearson.toFixed(3)}`);
console.log(`Average baseDefGap: ${avgY.toFixed(1)}`);
console.log(`Average gap/tonnage: ${(analyses.reduce((s, a) => s + a.baseDefGap / a.tonnage, 0) / analyses.length).toFixed(2)}`);

// Check if the gap is proportional to specific components
console.log(`\nAvg gap/armorBV: ${(analyses.reduce((s, a) => s + a.baseDefGap / Math.max(1, a.armorBV), 0) / analyses.length).toFixed(3)}`);
console.log(`Avg gap/structBV: ${(analyses.reduce((s, a) => s + a.baseDefGap / Math.max(1, a.structBV), 0) / analyses.length).toFixed(3)}`);

// Break down by armor type
const byArmor: Record<string, { count: number; totalGap: number; }> = {};
for (const a of analyses) {
  const at = a.armorType;
  if (!byArmor[at]) byArmor[at] = { count: 0, totalGap: 0 };
  byArmor[at].count++;
  byArmor[at].totalGap += a.baseDefGap;
}
console.log('\n=== By Armor Type ===');
for (const [at, v] of Object.entries(byArmor).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`  ${at}: n=${v.count} avgGap=${(v.totalGap / v.count).toFixed(1)}`);
}

// Break down by engine type
const byEngine: Record<string, { count: number; totalGap: number; }> = {};
for (const a of analyses) {
  if (!byEngine[a.engineType]) byEngine[a.engineType] = { count: 0, totalGap: 0 };
  byEngine[a.engineType].count++;
  byEngine[a.engineType].totalGap += a.baseDefGap;
}
console.log('\n=== By Engine Type ===');
for (const [et, v] of Object.entries(byEngine).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`  ${et}: n=${v.count} avgGap=${(v.totalGap / v.count).toFixed(1)}`);
}

// Break down by tech base
const byTech: Record<string, { count: number; totalGap: number; }> = {};
for (const a of analyses) {
  if (!byTech[a.techBase]) byTech[a.techBase] = { count: 0, totalGap: 0 };
  byTech[a.techBase].count++;
  byTech[a.techBase].totalGap += a.baseDefGap;
}
console.log('\n=== By Tech Base ===');
for (const [tb, v] of Object.entries(byTech).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`  ${tb}: n=${v.count} avgGap=${(v.totalGap / v.count).toFixed(1)}`);
}

// Check if defEquip=0 vs defEquip>0 differs
const noDefEquip = analyses.filter(a => a.defEquip === 0);
const hasDefEquip = analyses.filter(a => a.defEquip > 0);
console.log(`\n=== DefEquip presence ===`);
console.log(`  No defEquip: n=${noDefEquip.length} avgGap=${noDefEquip.length ? (noDefEquip.reduce((s, a) => s + a.baseDefGap, 0) / noDefEquip.length).toFixed(1) : 'N/A'}`);
console.log(`  Has defEquip: n=${hasDefEquip.length} avgGap=${hasDefEquip.length ? (hasDefEquip.reduce((s, a) => s + a.baseDefGap, 0) / hasDefEquip.length).toFixed(1) : 'N/A'}`);

// Check if gap is related to explosive penalty
const noExpl = analyses.filter(a => a.explPen === 0);
const hasExpl = analyses.filter(a => a.explPen > 0);
console.log(`\n=== Explosive penalty ===`);
console.log(`  No penalty: n=${noExpl.length} avgGap=${noExpl.length ? (noExpl.reduce((s, a) => s + a.baseDefGap, 0) / noExpl.length).toFixed(1) : 'N/A'}`);
console.log(`  Has penalty: n=${hasExpl.length} avgGap=${hasExpl.length ? (hasExpl.reduce((s, a) => s + a.baseDefGap, 0) / hasExpl.length).toFixed(1) : 'N/A'} avgPenalty=${hasExpl.length ? (hasExpl.reduce((s, a) => s + a.explPen, 0) / hasExpl.length).toFixed(1) : 'N/A'}`);

// Show the 15 units with the largest gap RELATIVE to baseDef
console.log(`\n=== Top 15 units by gap/baseDef ratio ===`);
const byRatio = analyses.filter(a => a.baseDefGap > 0).sort((a, b) => {
  const bD_a = a.armorBV + a.structBV + a.gyroBV + a.defEquip - a.explPen;
  const bD_b = b.armorBV + b.structBV + b.gyroBV + b.defEquip - b.explPen;
  return (b.baseDefGap / Math.max(1, bD_b)) - (a.baseDefGap / Math.max(1, bD_a));
});
for (const a of byRatio.slice(0, 15)) {
  const baseDef = a.armorBV + a.structBV + a.gyroBV + a.defEquip - a.explPen;
  const ratio = a.baseDefGap / Math.max(1, baseDef);
  console.log(`  ${a.unitId}: gap=${a.baseDefGap.toFixed(1)} baseDef=${baseDef.toFixed(1)} ratio=${ratio.toFixed(3)} (${a.techBase} ${a.engineType} armor=${a.armorType})`);
}
