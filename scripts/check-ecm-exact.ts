/**
 * Check how many exact-match units have ECM, and whether ECM BV is counted.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const exact = valid.filter((x: any) => x.status === 'exact');
const all = valid;

// Check which ECM crit names appear and whether they resolve
const ecmCritNames = new Map<string, { count: number; resolvedBV: number; exactCount: number; failCount: number }>();

for (const u of all) {
  const unit = loadUnit(u.unitId);
  if (!unit || !unit.criticalSlots) continue;
  const isExact = u.status === 'exact';

  for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots as string[]) {
      if (!s || typeof s !== 'string') continue;
      const lo = s.replace(/\s*\(omnipod\)/gi, '').trim().toLowerCase();
      if (lo.includes('ecm') || lo.includes('guardian') || lo.includes('angel') ||
          lo.includes('watchdog') || lo.includes('novacews') || lo.includes('nova cews') ||
          lo.includes('beagle') || lo.includes('bloodhound') || (lo.includes('active') && lo.includes('probe'))) {
        const clean = s.replace(/\s*\(omnipod\)/gi, '').trim();
        const key = clean;
        if (!ecmCritNames.has(key)) {
          const res = resolveEquipmentBV(clean);
          ecmCritNames.set(key, { count: 0, resolvedBV: res.battleValue, exactCount: 0, failCount: 0 });
        }
        const entry = ecmCritNames.get(key)!;
        entry.count++;
        if (isExact) entry.exactCount++;
        else entry.failCount++;
      }
    }
  }
}

console.log('=== ECM/PROBE CRIT NAMES AND RESOLUTION ===');
const sortedEcm = [...ecmCritNames.entries()].sort((a, b) => b[1].count - a[1].count);
for (const [name, info] of sortedEcm) {
  console.log(`  ${name.padEnd(40)} bv=${String(info.resolvedBV).padStart(3)} total=${String(info.count).padStart(4)} exact=${String(info.exactCount).padStart(4)} fail=${String(info.failCount).padStart(4)}`);
}

// Show some exact-match units that have ECM
console.log('\n=== SAMPLE EXACT-MATCH UNITS WITH ECM ===');
let ecmExactCount = 0;
for (const u of exact) {
  const unit = loadUnit(u.unitId);
  if (!unit || !unit.criticalSlots) continue;

  for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots as string[]) {
      if (!s || typeof s !== 'string') continue;
      const lo = s.toLowerCase();
      if (lo.includes('ecm') || lo.includes('guardian') || lo.includes('angel') ||
          lo.includes('watchdog') || lo.includes('novacews')) {
        ecmExactCount++;
        if (ecmExactCount <= 10) {
          const b = u.breakdown;
          console.log(`  ${u.unitId.padEnd(40)} defEq=${b?.defEquipBV} defBV=${b?.defensiveBV?.toFixed(0)} ref=${u.indexBV} calc=${u.calculatedBV}`);
        }
        break;
      }
    }
    if (ecmExactCount > 10) break;
  }
}
console.log(`Total exact-match units with ECM: ${ecmExactCount}`);

// Check if units with ECM are systematically overcalculated (which would indicate ECM BV IS being counted somehow)
console.log('\n=== ECM UNITS BY STATUS ===');
let ecmExact = 0, ecmWithin1 = 0, ecmOver = 0, ecmUnder = 0;
for (const u of all) {
  const unit = loadUnit(u.unitId);
  if (!unit || !unit.criticalSlots) continue;
  let hasECM = false;
  for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots as string[]) {
      if (!s || typeof s !== 'string') continue;
      const lo = s.toLowerCase();
      if (lo.includes('ecm') || lo.includes('guardian') || lo.includes('angel') ||
          lo.includes('watchdog') || lo.includes('novacews')) {
        hasECM = true; break;
      }
    }
    if (hasECM) break;
  }
  if (hasECM) {
    if (u.status === 'exact') ecmExact++;
    else if (Math.abs(u.percentDiff) <= 1) ecmWithin1++;
    else if (u.percentDiff > 0) ecmOver++;
    else ecmUnder++;
  }
}
console.log(`  Exact: ${ecmExact}, Within1%: ${ecmWithin1}, Over: ${ecmOver}, Under: ${ecmUnder}`);
