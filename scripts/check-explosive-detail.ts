/**
 * Deep-dive into overcalculated units with ammo but 0 explosive penalty.
 * Check if CASE/CASE II protection is correctly applied.
 */

import * as fs from 'fs';
import * as path from 'path';

const reportPath = path.resolve(__dirname, '../validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf-8'));
const unitPathMap = new Map<string, string>();
for (const u of indexData.units) {
  unitPathMap.set(u.id, path.join(unitsDir, u.path));
}

// Target units: overcalculated, have ammo, but 0 explosive penalty
const overcalcWithAmmo = report.allResults
  .filter((u: any) => u.percentDiff > 1.5 && u.percentDiff < 10 && (u.breakdown?.explosivePenalty ?? 0) === 0)
  .map((u: any) => {
    const unitPath = unitPathMap.get(u.unitId);
    if (!unitPath || !fs.existsSync(unitPath)) return null;
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
    let ammoCount = 0;
    if (unit.criticalSlots) {
      for (const slots of Object.values(unit.criticalSlots) as any[]) {
        if (!Array.isArray(slots)) continue;
        for (const slot of slots) {
          if (!slot || typeof slot !== 'string') continue;
          const lo = slot.toLowerCase();
          if (lo.includes('ammo') && !lo.includes('ammo feed')) {
            const nonExplosive = lo.includes('gauss') || lo.includes('plasma') || lo.includes('fluid') || lo.includes('nail') || lo.includes('rivet') || lo.includes('c3') || lo.includes('sensor') || lo.includes('rail gun');
            if (!nonExplosive) ammoCount++;
          }
        }
      }
    }
    return ammoCount > 0 ? { ...u, ammoCount, unit } : null;
  })
  .filter(Boolean);

console.log(`=== ${overcalcWithAmmo.length} Overcalculated Units with Ammo but 0 Penalty ===\n`);

// Analyze each unit
for (const entry of overcalcWithAmmo.slice(0, 12)) {
  const u = entry.unit;
  const techBase = u.techBase;
  const engineType = (u.engine?.type || 'FUSION').toUpperCase();

  console.log(`--- ${entry.unitId} (${u.tonnage}t, ${techBase}, engine: ${engineType}) ---`);
  console.log(`  Overcalc: +${entry.difference} (+${entry.percentDiff.toFixed(1)}%)`);

  // Collect per-location info
  const locInfo: Record<string, { ammo: string[]; case1: boolean; case2: boolean; weapons: string[] }> = {};

  if (u.criticalSlots) {
    for (const [loc, slots] of Object.entries(u.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      if (!locInfo[loc]) locInfo[loc] = { ammo: [], case1: false, case2: false, weapons: [] };

      for (const slot of slots) {
        if (!slot || typeof slot !== 'string') continue;
        const lo = slot.replace(/\s*\(omnipod\)/gi, '').trim().toLowerCase();

        if (lo.includes('ammo') && !lo.includes('ammo feed')) {
          const nonExplosive = lo.includes('gauss') || lo.includes('plasma') || lo.includes('fluid') || lo.includes('nail');
          if (!nonExplosive) locInfo[loc].ammo.push(slot.replace(/\s*\(omnipod\)/gi, '').trim());
        }
        if (lo.includes('case ii') || lo.includes('caseii') || lo.includes('clcaseii') || lo.includes('iscaseii')) {
          locInfo[loc].case2 = true;
        } else if (lo.includes('case') && !lo.includes('case ii')) {
          locInfo[loc].case1 = true;
        }
        if (lo.includes('gauss') && !lo.includes('ammo')) {
          locInfo[loc].weapons.push(slot.replace(/\s*\(omnipod\)/gi, '').trim() + ' [gauss=explosive]');
        }
      }
    }
  }

  // Clan mechs get implicit CASE in side torsos
  if (techBase === 'CLAN') {
    if (locInfo['LEFT_TORSO'] && !locInfo['LEFT_TORSO'].case2) locInfo['LEFT_TORSO'].case1 = true;
    if (locInfo['RIGHT_TORSO'] && !locInfo['RIGHT_TORSO'].case2) locInfo['RIGHT_TORSO'].case1 = true;
  }

  // Check if protection is legitimate
  for (const [loc, info] of Object.entries(locInfo)) {
    if (info.ammo.length === 0 && info.weapons.length === 0) continue;

    const isProtected = info.case2 ||
      (info.case1 && (loc === 'LEFT_TORSO' || loc === 'RIGHT_TORSO') && !['XL', 'XXL'].includes(engineType.replace(/[^A-Z]/g, ''))) ||
      (info.case1 && (loc === 'LEFT_ARM' || loc === 'RIGHT_ARM'));

    const engineSideSlots = engineType.includes('XL') && !engineType.includes('CLAN') && !engineType.includes('LIGHT') ? 3 : engineType.includes('XXL') ? (techBase === 'CLAN' ? 4 : 6) : techBase === 'CLAN' && engineType.includes('XL') ? 2 : 0;

    const reason = info.case2 ? 'CASE II' :
      info.case1 && (loc === 'LEFT_TORSO' || loc === 'RIGHT_TORSO') ? `CASE + engine ${engineSideSlots} side crits (${engineSideSlots >= 3 ? 'NOT protected' : 'protected'})` :
      info.case1 ? 'CASE in arm' : 'NO CASE';

    console.log(`  ${loc}: ${info.ammo.length} ammo${info.weapons.length > 0 ? ' + ' + info.weapons.length + ' explosive wpn' : ''} | CASE: ${info.case1 ? 'YES' : 'no'} | CASE II: ${info.case2 ? 'YES' : 'no'} | ${reason}`);

    // Show ammo detail for unprotected locations
    if (!isProtected && info.ammo.length > 0) {
      console.log(`    *** UNPROTECTED ammo should have ${info.ammo.length * 15} BV penalty! ***`);
      for (const a of info.ammo) console.log(`      ${a}`);
    }
  }
  console.log('');
}
