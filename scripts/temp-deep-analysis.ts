#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const reportPath = path.resolve(process.cwd(), 'validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.resolve(basePath, 'index.json'), 'utf-8'));
const indexMap = new Map<string, any>();
for (const u of indexData.units) indexMap.set(u.id, u);

interface Result { unitId: string; chassis: string; model: string; tonnage: number; indexBV: number; calculatedBV: number; difference: number; percentDiff: number; status: string; breakdown?: { defensiveBV: number; offensiveBV: number; weaponBV: number; ammoBV: number; speedFactor: number; explosivePenalty: number; defensiveEquipBV: number }; rootCause?: string; }

const within1to5under = report.allResults.filter((r: Result) => 
  r.status !== 'error' && r.percentDiff !== null && r.percentDiff < -1 && r.percentDiff > -5
);

console.log(`Units under-calculated by 1-5%: ${within1to5under.length}`);

const features: Record<string, number> = {};
const featureAvgDiff: Record<string, number[]> = {};

function addFeature(name: string, diff: number) {
  features[name] = (features[name] || 0) + 1;
  if (!featureAvgDiff[name]) featureAvgDiff[name] = [];
  featureAvgDiff[name].push(diff);
}

for (const r of within1to5under) {
  const iu = indexMap.get(r.unitId);
  if (!iu) continue;
  const unitPath = path.join(basePath, iu.path);
  if (!fs.existsSync(unitPath)) continue;
  const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
  
  addFeature(`techBase:${iu.techBase}`, r.percentDiff);
  
  const hasAmmo = ud.criticalSlots && Object.values(ud.criticalSlots).some((slots: any) => 
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('ammo'))
  );
  if (hasAmmo) addFeature('hasAmmo', r.percentDiff);
  
  const isDHS = ud.heatSinks?.type?.toUpperCase()?.includes('DOUBLE');
  if (isDHS) addFeature('isDHS', r.percentDiff);
  else addFeature('isSHS', r.percentDiff);
  
  const hasJJ = (ud.movement?.jump || 0) > 0;
  if (hasJJ) addFeature('hasJumpJets', r.percentDiff);
  
  const engineType = ud.engine?.type?.toUpperCase() || '';
  addFeature(`engine:${engineType}`, r.percentDiff);
  
  if (ud.tonnage <= 35) addFeature('weight:light', r.percentDiff);
  else if (ud.tonnage <= 55) addFeature('weight:medium', r.percentDiff);
  else if (ud.tonnage <= 75) addFeature('weight:heavy', r.percentDiff);
  else addFeature('weight:assault', r.percentDiff);
  
  const armorType = ud.armor?.type?.toUpperCase() || '';
  if (armorType !== 'STANDARD' && armorType !== '') addFeature(`armor:${armorType}`, r.percentDiff);
  
  const hasCoolantPod = ud.criticalSlots && Object.values(ud.criticalSlots).some((slots: any) => 
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('coolant pod'))
  );
  if (hasCoolantPod) addFeature('hasCoolantPod', r.percentDiff);
  
  const hasStreakSRM = ud.equipment?.some((eq: any) => eq.id.toLowerCase().includes('streak'));
  if (hasStreakSRM) addFeature('hasStreak', r.percentDiff);
  
  const hasLRM = ud.equipment?.some((eq: any) => eq.id.toLowerCase().includes('lrm'));
  if (hasLRM) addFeature('hasLRM', r.percentDiff);
  
  const hasUAC = ud.equipment?.some((eq: any) => {
    const lo = eq.id.toLowerCase();
    return lo.includes('ultra') || lo.includes('uac');
  });
  if (hasUAC) addFeature('hasUAC', r.percentDiff);
  
  const hasRAC = ud.equipment?.some((eq: any) => {
    const lo = eq.id.toLowerCase();
    return lo.includes('rotary') || lo.includes('rac');
  });
  if (hasRAC) addFeature('hasRAC', r.percentDiff);
  
  const hasATM = ud.equipment?.some((eq: any) => eq.id.toLowerCase().includes('atm'));
  if (hasATM) addFeature('hasATM', r.percentDiff);
  
  const hasGauss = ud.equipment?.some((eq: any) => eq.id.toLowerCase().includes('gauss'));
  if (hasGauss) addFeature('hasGauss', r.percentDiff);
  
  const hasPPC = ud.equipment?.some((eq: any) => eq.id.toLowerCase().includes('ppc'));
  if (hasPPC) addFeature('hasPPC', r.percentDiff);
  
  const hasERLaser = ud.equipment?.some((eq: any) => {
    const lo = eq.id.toLowerCase();
    return lo.includes('er-') && lo.includes('laser');
  });
  if (hasERLaser) addFeature('hasERLaser', r.percentDiff);
  
  const hasPulseLaser = ud.equipment?.some((eq: any) => eq.id.toLowerCase().includes('pulse'));
  if (hasPulseLaser) addFeature('hasPulseLaser', r.percentDiff);
  
  const isOmni = ud.criticalSlots && Object.values(ud.criticalSlots).some((slots: any) => 
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('(omnipod)'))
  );
  if (isOmni) addFeature('isOmniMech', r.percentDiff);
  
  if (r.breakdown) {
    if (r.breakdown.ammoBV === 0 && hasAmmo) addFeature('zeroAmmoBV_withAmmo', r.percentDiff);
    if (r.breakdown.explosivePenalty === 0 && hasAmmo) addFeature('zeroExplosivePenalty_withAmmo', r.percentDiff);
  }
}

console.log(`\nFeature analysis (sorted by count):`);
const sorted = Object.entries(features).sort((a, b) => b[1] - a[1]);
for (const [name, count] of sorted) {
  const avg = featureAvgDiff[name].reduce((s, v) => s + v, 0) / featureAvgDiff[name].length;
  console.log(`  ${name.padEnd(35)} ${String(count).padStart(4)} units  avg=${avg.toFixed(2)}%`);
}

console.log(`\n=== Specific BV difference analysis ===`);
const exactDiffs: Record<number, number> = {};
for (const r of within1to5under) {
  const diff = r.difference;
  exactDiffs[diff] = (exactDiffs[diff] || 0) + 1;
}
const topDiffs = Object.entries(exactDiffs).sort((a, b) => b[1] - a[1]).slice(0, 20);
console.log(`Top 20 most common exact BV differences:`);
for (const [diff, count] of topDiffs) {
  console.log(`  diff=${diff.padStart(6)}: ${count} units`);
}

console.log(`\n=== Breakdown comparison (under by 1-5%) ===`);
let totalDefDiff = 0, totalOffDiff = 0, countWithBreakdown = 0;
for (const r of within1to5under) {
  if (!r.breakdown) continue;
  countWithBreakdown++;
  const expectedTotal = r.indexBV;
  const calcDef = r.breakdown.defensiveBV;
  const calcOff = r.breakdown.offensiveBV;
}
