/**
 * Trace offensive BV gap for 1-2% undercalculated units.
 * Since defensive BV is correct and no weapons are halved,
 * the gap must be in weapon BV resolution, ammo BV, or weight bonus.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const under1to2 = valid.filter((x: any) => x.percentDiff >= -2 && x.percentDiff < -1 && x.breakdown);

// Pick the top 10 by gap size, show full weapon trace
const sorted = [...under1to2].sort((a: any, b: any) => a.difference - b.difference);

console.log(`=== OFFENSIVE GAP TRACE FOR TOP 15 UNITS ===\n`);

for (const u of sorted.slice(0, 15)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;

  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;
  const offGap = (refBase - b.defensiveBV) - b.offensiveBV;
  const baseOffGap = offGap / b.speedFactor;

  console.log(`${'='.repeat(70)}`);
  console.log(`${u.unitId} (${unit.techBase}, ${unit.tonnage}t) ref=${u.indexBV} calc=${u.calculatedBV} diff=${u.difference}`);
  console.log(`  offBV=${b.offensiveBV?.toFixed(0)} SF=${b.speedFactor} offGap=${offGap.toFixed(1)} baseGap=${baseOffGap.toFixed(1)}`);
  console.log(`  weapBV=${b.weaponBV?.toFixed(0)} ammoBV=${b.ammoBV} weightBonus=${b.weightBonus?.toFixed(0)} physBV=${b.physicalWeaponBV?.toFixed(0) || 0} offEquip=${b.offEquipBV || 0}`);
  console.log(`  HE=${b.heatEfficiency} heatDiss=${b.heatDissipation} moveHeat=${b.moveHeat}`);

  // Resolve each weapon independently and show
  console.log(`  WEAPONS (from equipment):`);
  let totalResolvedBV = 0;
  if (unit.equipment) {
    for (const eq of unit.equipment) {
      const res = resolveEquipmentBV(eq.id);
      const isWeapon = res.type === 'weapon' || res.subType?.includes('weapon') ||
        (res.battleValue > 0 && !eq.id.toLowerCase().includes('ammo') && !eq.id.toLowerCase().includes('case') &&
         !eq.id.toLowerCase().includes('heat-sink') && !eq.id.toLowerCase().includes('ams') &&
         !eq.id.toLowerCase().includes('ecm') && !eq.id.toLowerCase().includes('bap') &&
         !eq.id.toLowerCase().includes('c3'));
      if (isWeapon && res.battleValue > 0) {
        totalResolvedBV += res.battleValue;
        console.log(`    ${eq.id.padEnd(35)} @${eq.location.padEnd(6)} bv=${res.battleValue} heat=${res.heat} norm=${normalizeEquipmentId(eq.id)}`);
      }
    }
  }
  console.log(`  Sum of resolved weapon BVs: ${totalResolvedBV}`);

  // Check for Clan weapon resolution: what does prepending "clan-" do?
  if (unit.techBase === 'CLAN' || unit.techBase === 'MIXED') {
    console.log(`  CLAN RESOLUTION CHECK:`);
    for (const eq of unit.equipment || []) {
      const baseRes = resolveEquipmentBV(eq.id);
      const normalized = normalizeEquipmentId(eq.id);
      const clanId = 'clan-' + normalized;
      const clanRes = resolveEquipmentBV(clanId);

      if (clanRes.battleValue > baseRes.battleValue) {
        console.log(`    ${eq.id.padEnd(35)} base=${baseRes.battleValue} clan=${clanRes.battleValue} UPGRADE +${clanRes.battleValue - baseRes.battleValue}`);
      }
    }
  }

  // Crit slot weapons that might not be in equipment list
  if (unit.criticalSlots) {
    const critWeapons: string[] = [];
    for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (!s || typeof s !== 'string') continue;
        const lo = (s as string).toLowerCase();
        if (lo.includes('ammo') || lo.includes('heat sink') || lo.includes('endo') ||
            lo.includes('ferro') || lo.includes('engine') || lo.includes('gyro') ||
            lo.includes('actuator') || lo.includes('life support') || lo.includes('sensor') ||
            lo.includes('cockpit') || lo.includes('case') || lo.includes('-') && lo.length < 5 ||
            lo === 'ams' || lo === 'ecm') continue;
        // Check if this is a weapon we're not finding
        const res = resolveEquipmentBV(s as string);
        if (res.battleValue > 0 && (res.type === 'weapon' || res.heat > 0)) {
          // Check if it's already in equipment list
          const inEquip = unit.equipment?.some((eq: any) => {
            const enorm = normalizeEquipmentId(eq.id);
            const snorm = normalizeEquipmentId(s as string);
            return enorm === snorm;
          });
          if (!inEquip) {
            critWeapons.push(`[${loc}] ${s} bv=${res.battleValue}`);
          }
        }
      }
    }
    if (critWeapons.length > 0) {
      console.log(`  CRIT-ONLY WEAPONS (not in equipment list):`);
      for (const cw of critWeapons) console.log(`    ${cw}`);
    }
  }

  // Ammo trace
  if (unit.criticalSlots) {
    const ammoItems: string[] = [];
    for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (!s || typeof s !== 'string') continue;
        if ((s as string).toLowerCase().includes('ammo')) {
          ammoItems.push(`[${loc}] ${s}`);
        }
      }
    }
    if (ammoItems.length > 0) {
      console.log(`  AMMO in crits:`);
      for (const a of ammoItems) console.log(`    ${a}`);
    }
  }

  console.log('');
}

// Summary: check how many of the 59 units are CLAN or MIXED
console.log('\n=== TECH BASE SUMMARY ===');
const techCounts: Record<string, number> = {};
for (const u of under1to2) {
  const unit = loadUnit(u.unitId);
  const tb = unit?.techBase || 'UNKNOWN';
  techCounts[tb] = (techCounts[tb] || 0) + 1;
}
for (const [tb, count] of Object.entries(techCounts)) {
  console.log(`  ${tb}: ${count}`);
}

// Check: what's the average base offensive gap by tech base?
console.log('\n=== AVG BASE OFF GAP BY TECH ===');
const gapsByTech: Record<string, number[]> = {};
for (const u of under1to2) {
  const unit = loadUnit(u.unitId);
  const tb = unit?.techBase || 'UNKNOWN';
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;
  const offGap = (refBase - b.defensiveBV) - b.offensiveBV;
  const baseGap = offGap / b.speedFactor;
  if (!gapsByTech[tb]) gapsByTech[tb] = [];
  gapsByTech[tb].push(baseGap);
}
for (const [tb, gaps] of Object.entries(gapsByTech)) {
  const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  console.log(`  ${tb}: avg base gap = ${avg.toFixed(1)} (${gaps.length} units)`);
}
