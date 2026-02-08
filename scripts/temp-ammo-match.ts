#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const reportPath = path.resolve(process.cwd(), 'validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.resolve(basePath, 'index.json'), 'utf-8'));
const indexMap = new Map<string, any>();
for (const u of indexData.units) indexMap.set(u.id, u);

interface Result { unitId: string; chassis: string; model: string; tonnage: number; indexBV: number; calculatedBV: number; difference: number; percentDiff: number; status: string; breakdown?: { defensiveBV: number; offensiveBV: number; weaponBV: number; ammoBV: number; speedFactor: number; explosivePenalty: number; defensiveEquipBV: number }; }

const under1to3 = report.allResults.filter((r: Result) => 
  r.status !== 'error' && r.percentDiff !== null && r.percentDiff < -1 && r.percentDiff > -3 && r.breakdown
);

let zeroAmmoWithAmmo = 0;
let lowAmmoRatio = 0;

for (const r of under1to3) {
  const iu = indexMap.get(r.unitId);
  if (!iu) continue;
  const unitPath = path.join(basePath, iu.path);
  if (!fs.existsSync(unitPath)) continue;
  const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
  
  const hasAmmo = ud.criticalSlots && Object.values(ud.criticalSlots).some((slots: any) => 
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('ammo') && !s.toLowerCase().includes('ammo feed'))
  );
  
  if (hasAmmo && r.breakdown!.ammoBV === 0) {
    zeroAmmoWithAmmo++;
    if (zeroAmmoWithAmmo <= 10) {
      const ammoSlots: string[] = [];
      for (const [loc, slots] of Object.entries(ud.criticalSlots || {})) {
        for (const s of (slots as any[])) {
          if (s && typeof s === 'string' && s.toLowerCase().includes('ammo') && !s.toLowerCase().includes('ammo feed')) {
            ammoSlots.push(`${s}@${loc}`);
          }
        }
      }
      console.log(`ZERO AMMO: ${r.chassis} ${r.model} (${r.percentDiff.toFixed(1)}%) ammo=[${ammoSlots.join('; ')}]`);
    }
  }
  
  if (hasAmmo && r.breakdown!.ammoBV > 0 && r.breakdown!.weaponBV > 0) {
    const ratio = r.breakdown!.ammoBV / r.breakdown!.weaponBV;
    if (ratio < 0.05) {
      lowAmmoRatio++;
      if (lowAmmoRatio <= 5) {
        console.log(`LOW AMMO RATIO: ${r.chassis} ${r.model} ammo=${r.breakdown!.ammoBV} weapon=${r.breakdown!.weaponBV} ratio=${ratio.toFixed(3)}`);
      }
    }
  }
}

console.log(`\nZero ammo BV with ammo present: ${zeroAmmoWithAmmo}`);
console.log(`Low ammo ratio (<5%): ${lowAmmoRatio}`);

console.log(`\n=== Checking if explosive penalty is being applied correctly ===`);
let noExplosiveWithAmmo = 0;
let hasExplosive = 0;
for (const r of under1to3) {
  if (!r.breakdown) continue;
  const iu = indexMap.get(r.unitId);
  if (!iu) continue;
  const unitPath = path.join(basePath, iu.path);
  if (!fs.existsSync(unitPath)) continue;
  const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
  
  const hasAmmo = ud.criticalSlots && Object.values(ud.criticalSlots).some((slots: any) => 
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('ammo') && !s.toLowerCase().includes('ammo feed'))
  );
  
  if (hasAmmo) {
    if (r.breakdown.explosivePenalty > 0) hasExplosive++;
    else noExplosiveWithAmmo++;
  }
}
console.log(`Units with ammo and explosive penalty: ${hasExplosive}`);
console.log(`Units with ammo but NO explosive penalty: ${noExplosiveWithAmmo}`);
