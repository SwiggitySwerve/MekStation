#!/usr/bin/env npx tsx
// Analyze whether the BV gap is on offensive or defensive side
// For each undercalculated unit, check if the offensive BV calculation is internally consistent
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));

const under = report.allResults.filter((r: any) =>
  r.percentDiff !== null && r.percentDiff < -0.5 && r.percentDiff > -5 && r.breakdown
);

let offGapCount = 0, defGapCount = 0, bothGapCount = 0;
let offGapSum = 0, defGapSum = 0;
let superchargerGap = 0, superchargerCount = 0;
let noSpecialGap = 0, noSpecialCount = 0;

const features: Record<string, { count: number; totalGap: number }> = {};

for (const r of under) {
  const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === `${r.chassis} ${r.model}`);
  if (!iu) continue;
  try {
    const fp = path.resolve('public/data/units/battlemechs', iu.path);
    const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));

    const bd = r.breakdown;
    const gap = r.indexBV - r.calculatedBV;

    // Our baseOff = weapBV + ammoBV + weightBonus
    // We can verify: offBV / SF = baseOff
    const impliedBaseOff = bd.offensiveBV / bd.speedFactor;
    const expectedBaseOff = bd.weaponBV + bd.ammoBV + ud.tonnage; // simplified

    // Check if offensive calculation is internally consistent
    // If offBV = baseOff * SF exactly, then gap is likely in defensive
    const offCheck = Math.abs(impliedBaseOff - expectedBaseOff);

    // Scan crits for special features
    const critItems: string[] = [];
    if (ud.criticalSlots) {
      for (const slots of Object.values(ud.criticalSlots)) {
        if (Array.isArray(slots)) for (const s of slots) if (s && typeof s === 'string') critItems.push(s.toLowerCase());
      }
    }

    const hasSupercharger = critItems.some(s => s.includes('supercharger'));
    const hasMASC = critItems.some(s => s.includes('masc') && !s.includes('ammo'));
    const hasTSM = critItems.some(s => s.includes('tsm') || s.includes('triple strength'));
    const hasStealth = critItems.some(s => s.includes('stealth'));
    const hasBloodhound = critItems.some(s => s.includes('bloodhound'));
    const hasGuardianECM = critItems.some(s => s.includes('guardian') || s.includes('ecm'));
    const hasImprovedJJ = critItems.some(s => s.includes('improved jump jet'));
    const hasC3 = critItems.some(s => s.includes('c3'));
    const hasNullSig = critItems.some(s => s.includes('null-sig') || s.includes('null signature'));
    const hasChameleon = critItems.some(s => s.includes('chameleon'));
    const hasBlueShield = critItems.some(s => s.includes('blue-shield') || s.includes('blue shield'));
    const hasNARC = critItems.some(s => s.includes('narc') && !s.includes('ammo'));
    const hasTAG = critItems.some(s => s.includes('tag') && !s.includes('targeting'));
    const hasLightPPC = critItems.some(s => s.includes('light ppc') || s.includes('lightppc'));
    const hasXL = ud.engine?.type === 'XL' || ud.engine?.type === 'CLAN_XL';
    const hasLight = ud.engine?.type === 'LIGHT';
    const hasXXL = ud.engine?.type === 'XXL';

    const featureList: string[] = [];
    if (hasSupercharger) featureList.push('Supercharger');
    if (hasMASC) featureList.push('MASC');
    if (hasTSM) featureList.push('TSM');
    if (hasStealth) featureList.push('Stealth');
    if (hasBloodhound) featureList.push('Bloodhound');
    if (hasGuardianECM) featureList.push('ECM');
    if (hasImprovedJJ) featureList.push('ImprovedJJ');
    if (hasC3) featureList.push('C3');
    if (hasNullSig) featureList.push('NullSig');
    if (hasChameleon) featureList.push('Chameleon');
    if (hasBlueShield) featureList.push('BlueShield');
    if (hasNARC) featureList.push('NARC');
    if (hasTAG) featureList.push('TAG');

    for (const f of featureList) {
      if (!features[f]) features[f] = { count: 0, totalGap: 0 };
      features[f].count++;
      features[f].totalGap += gap;
    }

    if (featureList.length === 0) {
      if (!features['none']) features['none'] = { count: 0, totalGap: 0 };
      features['none'].count++;
      features['none'].totalGap += gap;
      noSpecialCount++;
      noSpecialGap += gap;
    }

    // Track cockpit type
    const cockpit = ud.cockpit || 'STANDARD';
    const kCk = `cockpit:${cockpit}`;
    if (!features[kCk]) features[kCk] = { count: 0, totalGap: 0 };
    features[kCk].count++;
    features[kCk].totalGap += gap;

    // Track armor type
    const armorType = ud.armor?.type || 'STANDARD';
    const kAr = `armor:${armorType}`;
    if (!features[kAr]) features[kAr] = { count: 0, totalGap: 0 };
    features[kAr].count++;
    features[kAr].totalGap += gap;

    // Track engine type
    const engType = ud.engine?.type || 'STANDARD';
    const kEn = `engine:${engType}`;
    if (!features[kEn]) features[kEn] = { count: 0, totalGap: 0 };
    features[kEn].count++;
    features[kEn].totalGap += gap;

    // Track structure type
    const structType = ud.structure?.type || 'STANDARD';
    const kSt = `struct:${structType}`;
    if (!features[kSt]) features[kSt] = { count: 0, totalGap: 0 };
    features[kSt].count++;
    features[kSt].totalGap += gap;

    // Track tech base
    const kTb = `tech:${ud.techBase}`;
    if (!features[kTb]) features[kTb] = { count: 0, totalGap: 0 };
    features[kTb].count++;
    features[kTb].totalGap += gap;

  } catch {}
}

console.log(`Total undercalculated 0.5-5%: ${under.length}`);
console.log(`\nFeature analysis (sorted by avg gap):`);
const sorted = Object.entries(features)
  .filter(([, v]) => v.count >= 3)
  .sort((a, b) => (b[1].totalGap / b[1].count) - (a[1].totalGap / a[1].count));

for (const [name, { count, totalGap }] of sorted) {
  console.log(`  ${name.padEnd(35)} n=${String(count).padStart(4)} avgGap=${(totalGap / count).toFixed(1).padStart(6)} totalGap=${totalGap}`);
}
