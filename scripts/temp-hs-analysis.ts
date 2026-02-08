#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

interface IndexUnit { id: string; chassis: string; model: string; tonnage: number; techBase: string; bv: number; path: string; }
interface IndexFile { units: IndexUnit[]; }
interface UnitData { id: string; chassis: string; model: string; techBase: string; tonnage: number; engine: { type: string; rating: number }; heatSinks: { type: string; count: number }; criticalSlots?: Record<string, (string | null)[]>; equipment: { id: string; location: string }[]; }

const indexPath = path.resolve(process.cwd(), 'public/data/units/battlemechs/index.json');
const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData: IndexFile = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

// Load validation report to get units with minor discrepancies
const reportPath = path.resolve(process.cwd(), 'validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const discrepancyUnits = new Set<string>();
for (const r of report.allResults) {
  if (r.status !== 'exact' && r.status !== 'error' && r.percentDiff !== null) {
    discrepancyUnits.add(r.unitId);
  }
}

let totalUnits = 0;
let mismatchCount = 0;
let critHigher = 0;
let critLower = 0;
const mismatchDetails: Array<{
  name: string; techBase: string; declared: number; critCounted: number; diff: number;
  isDHS: boolean; engineRating: number; engineType: string; isOmni: boolean;
  percentBVDiff: number | null;
}> = [];

for (const iu of indexData.units) {
  const unitPath = path.join(basePath, iu.path);
  if (!fs.existsSync(unitPath)) continue;
  const ud: UnitData = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
  if (!ud.criticalSlots) continue;
  
  totalUnits++;
  const isDHS = ud.heatSinks.type.toUpperCase().includes('DOUBLE');
  const declaredCount = ud.heatSinks.count;
  
  // Count heat sinks from crit slots
  let critHSCount = 0;
  const allSlots = Object.values(ud.criticalSlots).flat().filter((s): s is string => !!s && typeof s === 'string');
  
  // DHS takes 3 crit slots (IS) or 2 crit slots (Clan), SHS takes 1 slot
  // But engine-integrated HS don't appear in crits
  // MegaMek counts from Mounted items, not crit slots directly
  
  // Count unique heat sink entries (multi-slot items repeat the same name)
  const hsSlots: string[] = [];
  let prevSlot: string | null = null;
  for (const slot of allSlots) {
    const lo = slot.toLowerCase().replace(/\s*\(omnipod\)/gi, '').trim();
    if (lo.includes('heat sink') || lo === 'isheatsink' || lo === 'clheatsink' || 
        lo === 'isdoubleheatsink' || lo === 'cldoubleheatsink' || lo === 'isdouble heat sink' || 
        lo === 'cldouble heat sink' || lo.includes('double heat sink') || lo === 'heat sink') {
      // Only count first slot of multi-slot items
      if (prevSlot !== lo) {
        hsSlots.push(lo);
      }
    }
    prevSlot = lo;
  }
  
  critHSCount = hsSlots.length;
  
  // Engine-integrated heat sinks: min(engineRating / 25, 10)
  const engineIntegrated = Math.min(Math.floor(ud.engine.rating / 25), 10);
  const totalFromCrits = critHSCount + engineIntegrated;
  
  // Check equipment list for heat sinks too
  const equipHS = ud.equipment.filter(eq => {
    const lo = eq.id.toLowerCase();
    return lo.includes('heat-sink') || lo.includes('heatsink') || lo.includes('heat sink');
  }).length;
  
  const isOmni = ud.equipment.some(eq => eq.id.toLowerCase().includes('omnipod')) || 
    allSlots.some(s => s.toLowerCase().includes('(omnipod)'));
  
  if (totalFromCrits !== declaredCount) {
    mismatchCount++;
    if (totalFromCrits > declaredCount) critHigher++;
    else critLower++;
    
    const bvResult = report.allResults.find((r: any) => r.unitId === iu.id);
    
    mismatchDetails.push({
      name: `${iu.chassis} ${iu.model}`,
      techBase: iu.techBase,
      declared: declaredCount,
      critCounted: totalFromCrits,
      diff: totalFromCrits - declaredCount,
      isDHS: isDHS,
      engineRating: ud.engine.rating,
      engineType: ud.engine.type,
      isOmni,
      percentBVDiff: bvResult?.percentDiff ?? null,
    });
  }
}

console.log(`\n=== HEAT SINK COUNT ANALYSIS ===`);
console.log(`Total units with crits: ${totalUnits}`);
console.log(`Mismatches: ${mismatchCount} (${(mismatchCount/totalUnits*100).toFixed(1)}%)`);
console.log(`  Crit count > declared: ${critHigher}`);
console.log(`  Crit count < declared: ${critLower}`);

// Group by tech base
const byTech: Record<string, typeof mismatchDetails> = {};
for (const m of mismatchDetails) {
  if (!byTech[m.techBase]) byTech[m.techBase] = [];
  byTech[m.techBase].push(m);
}
console.log(`\nBy tech base:`);
for (const [tb, items] of Object.entries(byTech)) {
  const avgDiff = items.reduce((s, i) => s + i.diff, 0) / items.length;
  const underCalc = items.filter(i => i.percentBVDiff !== null && i.percentBVDiff < -1);
  console.log(`  ${tb}: ${items.length} mismatches (avg diff: ${avgDiff.toFixed(1)} HS), ${underCalc.length} under-calculated`);
}

// Show correlation: does using crit-counted HS improve BV accuracy?
console.log(`\nCorrelation with BV accuracy (units where crit HS > declared AND under-calculated):`);
const candidates = mismatchDetails.filter(m => m.diff > 0 && m.percentBVDiff !== null && m.percentBVDiff < -1);
console.log(`  ${candidates.length} units where crit HS > declared AND BV under-calculated by >1%`);
if (candidates.length > 0) {
  const avgBVDiff = candidates.reduce((s, c) => s + c.percentBVDiff!, 0) / candidates.length;
  console.log(`  Average BV under-calculation: ${avgBVDiff.toFixed(2)}%`);
  console.log(`  Average extra HS from crits: ${(candidates.reduce((s, c) => s + c.diff, 0) / candidates.length).toFixed(1)}`);
}

// Show top examples
console.log(`\nTop 20 mismatches (crit > declared, under-calculated):`);
const sorted = candidates.sort((a, b) => a.percentBVDiff! - b.percentBVDiff!).slice(0, 20);
for (const m of sorted) {
  console.log(`  ${m.name.padEnd(40)} ${m.techBase.padEnd(6)} declared=${m.declared} crit=${m.critCounted} diff=${m.diff > 0 ? '+' : ''}${m.diff} BV%=${m.percentBVDiff!.toFixed(1)}% DHS=${m.isDHS} omni=${m.isOmni}`);
}

// Also check: units where equipment list HS count differs
console.log(`\nTop 20 mismatches (crit < declared, over-calculated):`);
const overCalc = mismatchDetails.filter(m => m.diff < 0 && m.percentBVDiff !== null && m.percentBVDiff > 1)
  .sort((a, b) => b.percentBVDiff! - a.percentBVDiff!).slice(0, 20);
for (const m of overCalc) {
  console.log(`  ${m.name.padEnd(40)} ${m.techBase.padEnd(6)} declared=${m.declared} crit=${m.critCounted} diff=${m.diff > 0 ? '+' : ''}${m.diff} BV%=${m.percentBVDiff!.toFixed(1)}% DHS=${m.isDHS} omni=${m.isOmni}`);
}
