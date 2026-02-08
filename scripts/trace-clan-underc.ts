#!/usr/bin/env npx tsx
/**
 * Deep-trace the top undercalculated Clan units to find the systematic BV gap source.
 *
 * Reads validation report + unit data, prints detailed breakdown of each undercalculated
 * unit, checks equipment resolution, and attempts to attribute the missing BV.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, resolveAmmoBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';
import { getArmorBVMultiplier, getStructureBVMultiplier, getGyroBVMultiplier, getEngineBVMultiplier } from '../src/types/validation/BattleValue';

// ============================================================================
// Load data
// ============================================================================

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));

// Build lookup maps
const indexByUnitId = new Map<string, any>();
for (const u of idx.units) {
  indexByUnitId.set(u.id, u);
}

const resultByUnitId = new Map<string, any>();
for (const r of report.allResults) {
  resultByUnitId.set(r.unitId, r);
}

// ============================================================================
// Find top 10 most undercalculated non-error units
// ============================================================================

const allUnder = report.allResults
  .filter((r: any) => r.status !== 'error' && r.percentDiff !== null && r.percentDiff < 0)
  .sort((a: any, b: any) => a.percentDiff - b.percentDiff); // most negative first

const top10 = allUnder.slice(0, 10);

// Also find specific named units of interest
const namedPatterns = ['Cephalus', 'Koshi', 'Osteon', 'Uller', 'Kit Fox'];
const namedMatches = report.allResults.filter((r: any) => {
  if (r.status === 'error') return false;
  if (r.percentDiff === null || r.percentDiff >= 0) return false;
  return namedPatterns.some(p => r.chassis?.toLowerCase().includes(p.toLowerCase()));
});

// Merge: top10 + named matches, deduplicated
const seen = new Set<string>();
const traceTargets: any[] = [];
for (const r of [...top10, ...namedMatches]) {
  if (!seen.has(r.unitId)) {
    seen.add(r.unitId);
    traceTargets.push(r);
  }
}

console.log(`\n${'='.repeat(80)}`);
console.log(`CLAN UNDERCALCULATION DEEP TRACE`);
console.log(`Top 10 most undercalculated + named unit matches`);
console.log(`Total trace targets: ${traceTargets.length}`);
console.log(`${'='.repeat(80)}\n`);

// ============================================================================
// Special equipment detection patterns
// ============================================================================

const SPECIAL_EQUIP_PATTERNS: Record<string, RegExp> = {
  'CASE': /\bCLCASE\b|^case$/i,
  'CASE II': /CLCASEII|case-ii/i,
  'Targeting Computer': /targeting.?computer|CLTargeting/i,
  'AES': /actuator.?enhancement|CLAES/i,
  'Shield': /\bshield\b/i,
  'TSM': /triple.?strength.?myomer|\btsm\b|CLMyomer/i,
  'MASC': /\bmasc\b|CLMASC/i,
  'Supercharger': /supercharger/i,
  'ECM': /\becm\b|guardian|angel/i,
  'BAP': /\bbap\b|active.?probe|light.?active/i,
  'Stealth': /stealth/i,
  'Null Sig': /null.?sig/i,
  'Chameleon': /chameleon/i,
  'Modular Armor': /modular.?armor/i,
  'Laser AMS': /laser.?a.*m.*s|CLLaserAntiMissile/i,
  'Nova CEWS': /nova.*cews|NovaCEWS/i,
};

// ============================================================================
// Weapon categories for IS vs Clan detection in crit slots
// ============================================================================

function isClanWeaponCrit(critName: string): boolean {
  if (!critName) return false;
  const n = critName.toLowerCase();
  return n.startsWith('cl') || n.includes('(clan)');
}

function isISWeaponCrit(critName: string): boolean {
  if (!critName) return false;
  const n = critName.toLowerCase();
  return n.startsWith('is') || n.includes('(is)');
}

function isWeaponCrit(critName: string): boolean {
  if (!critName) return false;
  const n = critName.toLowerCase();
  // Exclude structural components
  const structural = ['shoulder', 'upper arm', 'lower arm', 'hand actuator',
    'hip', 'upper leg', 'lower leg', 'foot actuator',
    'fusion engine', 'gyro', 'life support', 'sensors', 'cockpit',
    'heat sink', 'double heat sink', 'jump jet', 'improved jump jet',
    'endo steel', 'endo-steel', 'ferro-fibrous', 'ferro-lamellor',
    'clan endo', 'clan ferro', 'is endo', 'is ferro',
    'null signature', 'chameleon', 'modular armor',
    'case', 'case ii', 'ammo'];
  if (structural.some(s => n.includes(s))) return false;
  if (n === '' || n === 'null') return false;
  // Check if looks like a weapon (has common weapon keywords)
  const weaponLike = ['laser', 'ppc', 'ac/', 'ac-', 'ac2', 'ac5', 'ac10', 'ac20',
    'lrm', 'srm', 'mrm', 'atm', 'gauss', 'flamer', 'mg ', 'machine gun',
    'streak', 'ultra', 'lb-', 'lbx', 'rac', 'hag', 'arrow', 'mml',
    'tag', 'narc', 'ams', 'antimissile', 'rocket', 'plasma'];
  return weaponLike.some(w => n.includes(w)) || n.startsWith('cl') || n.startsWith('is');
}

// ============================================================================
// TRACE EACH UNIT
// ============================================================================

// Aggregate stats for summary
const summaryData: Array<{
  name: string; tonnage: number; techBase: string; gap: number; pctDiff: number;
  unresolvedWeaponBV: number; unresolvedAmmoBV: number; unresolvedEquipBV: number;
  specialEquip: string[];
}> = [];

for (const rr of traceTargets) {
  const iu = indexByUnitId.get(rr.unitId);
  if (!iu) {
    console.log(`INDEX NOT FOUND: ${rr.unitId}`);
    continue;
  }

  const fp = path.resolve('public/data/units/battlemechs', iu.path);
  let ud: any;
  try {
    ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  } catch {
    console.log(`CANNOT READ: ${fp}`);
    continue;
  }

  const name = `${rr.chassis} ${rr.model}`;
  const gap = rr.calculatedBV - rr.indexBV;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`${name}`);
  console.log(`${'='.repeat(80)}`);

  // --- Basic info ---
  console.log(`  Tonnage:     ${ud.tonnage}t`);
  console.log(`  Tech Base:   ${ud.techBase}`);
  console.log(`  Cockpit:     ${ud.cockpit}`);
  console.log(`  Engine:      ${ud.engine.type} ${ud.engine.rating}`);
  console.log(`  Gyro:        ${ud.gyro.type}`);
  console.log(`  Structure:   ${ud.structure.type}`);
  console.log(`  Armor Type:  ${ud.armor.type}`);
  console.log(`  Heat Sinks:  ${ud.heatSinks.count} ${ud.heatSinks.type}`);
  console.log(`  Movement:    Walk ${ud.movement.walk} / Jump ${ud.movement.jump || 0}`);

  // --- BV comparison ---
  console.log(`\n  Reference BV:   ${rr.indexBV}`);
  console.log(`  Calculated BV:  ${rr.calculatedBV}`);
  console.log(`  Gap:            ${gap} (${rr.percentDiff.toFixed(2)}%)`);
  console.log(`  Root Cause:     ${rr.rootCause || 'unknown'}`);

  // --- Full breakdown ---
  const bd = rr.breakdown || {};
  console.log(`\n  --- BREAKDOWN ---`);
  console.log(`  armorBV:          ${bd.armorBV ?? '?'}`);
  console.log(`  structureBV:      ${bd.structureBV ?? '?'}`);
  console.log(`  gyroBV:           ${bd.gyroBV ?? '?'}`);
  console.log(`  defEquipBV:       ${bd.defensiveEquipBV ?? '?'}`);
  console.log(`  explosivePenalty: ${bd.explosivePenalty ?? '?'}`);
  console.log(`  defensiveFactor:  ${bd.defensiveFactor ?? '?'}`);
  console.log(`  DEFENSIVE BV:     ${bd.defensiveBV ?? '?'}`);
  console.log(`  weaponBV:         ${bd.weaponBV ?? '?'}`);
  console.log(`  ammoBV:           ${bd.ammoBV ?? '?'}`);
  console.log(`  weightBonus:      ${bd.weightBonus ?? '(not tracked)'}`);
  console.log(`  offEquipBV:       ${bd.offEquipBV ?? '(not tracked)'}`);
  console.log(`  speedFactor:      ${bd.speedFactor ?? '?'}`);
  console.log(`  OFFENSIVE BV:     ${bd.offensiveBV ?? '?'}`);
  console.log(`  cockpitModifier:  ${bd.cockpitModifier ?? '(not tracked)'}`);

  if (rr.issues && rr.issues.length > 0) {
    console.log(`  Issues: ${rr.issues.join('; ')}`);
  }

  // --- Equipment resolution ---
  console.log(`\n  --- EQUIPMENT RESOLUTION ---`);
  let unresolvedWeaponBV = 0;
  let unresolvedAmmoBV = 0;
  let unresolvedEquipBV = 0;
  const resolvedEquipList: Array<{ id: string; bv: number; heat: number; resolved: boolean; techBase: string }> = [];

  for (const eq of (ud.equipment || [])) {
    const res = resolveEquipmentBV(eq.id);
    const normId = normalizeEquipmentId(eq.id);

    // Try Clan-prefixed version if not resolved and unit is Clan
    let clanRes = { resolved: false, battleValue: 0, heat: 0 };
    if (!res.resolved && (ud.techBase === 'CLAN' || ud.techBase === 'MIXED') && !normId.startsWith('clan-')) {
      clanRes = resolveEquipmentBV('clan-' + normId);
    }

    const bestRes = clanRes.resolved && clanRes.battleValue > res.battleValue ? clanRes : res;
    const statusStr = bestRes.resolved ? 'OK' : 'UNRESOLVED';

    // Detect if it's a weapon vs ammo vs misc
    const isAmmo = eq.id.toLowerCase().includes('ammo');
    const isWeapon = !isAmmo && !['case', 'case-ii', 'targeting-computer', 'masc', 'supercharger', 'tsm',
      'ecm', 'bap', 'active-probe', 'light-active-probe', 'beagle-active-probe',
      'guardian-ecm', 'angel-ecm', 'c3-computer', 'c3-master', 'c3-slave',
      'tag', 'clan-tag', 'light-tag', 'narc', 'inarc'].includes(eq.id.toLowerCase());

    const techGuess = eq.id.toLowerCase().startsWith('clan-') ? 'CLAN' :
      (ud.techBase === 'CLAN' ? 'CLAN' : 'IS');

    console.log(`  ${statusStr.padEnd(12)} ${eq.id.padEnd(40)} loc=${(eq.location || '').padEnd(14)} BV=${bestRes.battleValue.toString().padEnd(6)} heat=${bestRes.heat || 0} norm=${normId}`);

    if (!bestRes.resolved) {
      if (isAmmo) unresolvedAmmoBV++;
      else unresolvedWeaponBV++;
    }

    resolvedEquipList.push({
      id: eq.id,
      bv: bestRes.battleValue,
      heat: bestRes.heat || 0,
      resolved: bestRes.resolved,
      techBase: techGuess,
    });
  }

  // --- Critical slots (flattened) ---
  console.log(`\n  --- CRITICAL SLOTS ---`);
  const allCrits: string[] = [];
  const clanWeaponsInCrits: string[] = [];
  const isWeaponsInCrits: string[] = [];
  const unresolvedCrits: string[] = [];

  if (ud.criticalSlots) {
    for (const [loc, slots] of Object.entries(ud.criticalSlots)) {
      const slotArr = slots as (string | null)[];
      for (const slot of slotArr) {
        if (slot && slot !== 'null') {
          allCrits.push(`${loc}: ${slot}`);
          if (isClanWeaponCrit(slot)) clanWeaponsInCrits.push(slot);
          if (isISWeaponCrit(slot)) isWeaponsInCrits.push(slot);
        }
      }
    }
    // Print grouped by location
    for (const [loc, slots] of Object.entries(ud.criticalSlots)) {
      const slotArr = (slots as (string | null)[]).filter(s => s !== null);
      console.log(`    ${loc}: ${slotArr.join(', ')}`);
    }
  }

  // --- Weapon analysis ---
  console.log(`\n  --- WEAPON ANALYSIS ---`);
  console.log(`  Clan weapons in crits: ${clanWeaponsInCrits.length}`);
  if (clanWeaponsInCrits.length > 0) {
    const uniqueClan = [...new Set(clanWeaponsInCrits)];
    for (const w of uniqueClan) {
      const count = clanWeaponsInCrits.filter(c => c === w).length;
      console.log(`    ${w} x${count}`);
    }
  }
  console.log(`  IS weapons in crits: ${isWeaponsInCrits.length}`);
  if (isWeaponsInCrits.length > 0) {
    const uniqueIS = [...new Set(isWeaponsInCrits)];
    for (const w of uniqueIS) {
      const count = isWeaponsInCrits.filter(c => c === w).length;
      console.log(`    ${w} x${count}`);
    }
  }

  // --- Check for clan crit weapons whose equipment IDs resolve to IS versions ---
  console.log(`\n  --- CLAN vs IS RESOLUTION MISMATCH ---`);
  for (const eq of (ud.equipment || [])) {
    const normId = normalizeEquipmentId(eq.id);
    const res = resolveEquipmentBV(eq.id);

    // Try resolving both IS and Clan
    const clanId = normId.startsWith('clan-') ? normId : `clan-${normId}`;
    const isId = normId.startsWith('clan-') ? normId.replace(/^clan-/, '') : normId;
    const clanRes = resolveEquipmentBV(clanId);
    const isRes = resolveEquipmentBV(isId);

    if (clanRes.resolved && isRes.resolved && clanRes.battleValue !== isRes.battleValue) {
      const usedBV = res.battleValue;
      const shouldBV = (ud.techBase === 'CLAN' || ud.techBase === 'MIXED') ? clanRes.battleValue : isRes.battleValue;
      if (usedBV !== shouldBV) {
        console.log(`    MISMATCH: ${eq.id} -> resolved BV=${usedBV}, Clan BV=${clanRes.battleValue}, IS BV=${isRes.battleValue}`);
      }
    }
  }

  // --- Special equipment detection ---
  console.log(`\n  --- SPECIAL EQUIPMENT ---`);
  const foundSpecial: string[] = [];
  const allSlotsFlat = allCrits.map(c => c.split(': ')[1] || c).join(' ');
  const allEquipIds = (ud.equipment || []).map((e: any) => e.id).join(' ');
  const searchStr = allSlotsFlat + ' ' + allEquipIds;

  for (const [name, pattern] of Object.entries(SPECIAL_EQUIP_PATTERNS)) {
    if (pattern.test(searchStr)) {
      foundSpecial.push(name);
    }
  }
  if (foundSpecial.length > 0) {
    console.log(`  Found: ${foundSpecial.join(', ')}`);
  } else {
    console.log(`  None detected`);
  }

  // --- Missing BV attribution ---
  console.log(`\n  --- MISSING BV ATTRIBUTION ---`);
  const missingBV = rr.indexBV - rr.calculatedBV; // positive = we are low
  console.log(`  Total missing BV: ${missingBV}`);

  // Check 1: Unresolved equipment
  const unresolvedEquip = (ud.equipment || []).filter((eq: any) => {
    const res = resolveEquipmentBV(eq.id);
    if (res.resolved) return false;
    // Also try clan-prefixed
    const normId = normalizeEquipmentId(eq.id);
    if (!normId.startsWith('clan-')) {
      const clanRes = resolveEquipmentBV('clan-' + normId);
      if (clanRes.resolved) return false;
    }
    return true;
  });
  if (unresolvedEquip.length > 0) {
    console.log(`  Unresolved equipment (${unresolvedEquip.length}):`);
    for (const eq of unresolvedEquip) {
      console.log(`    - ${eq.id} @ ${eq.location}`);
    }
  }

  // Check 2: Weapons resolving to IS BV when they should be Clan BV
  let clanVsIsMismatchBV = 0;
  for (const eq of (ud.equipment || [])) {
    const res = resolveEquipmentBV(eq.id);
    const normId = normalizeEquipmentId(eq.id);
    const clanId = normId.startsWith('clan-') ? normId : `clan-${normId}`;
    const clanRes = resolveEquipmentBV(clanId);
    if (clanRes.resolved && res.resolved && clanRes.battleValue > res.battleValue) {
      if (ud.techBase === 'CLAN' || ud.techBase === 'MIXED') {
        clanVsIsMismatchBV += (clanRes.battleValue - res.battleValue);
      }
    }
  }
  if (clanVsIsMismatchBV > 0) {
    console.log(`  Clan-vs-IS weapon BV mismatch total: +${clanVsIsMismatchBV} (would recover this much BV if using Clan values)`);
  }

  // Check 3: Defensive BV estimate
  // armorBV + structureBV + gyroBV + defEquipBV - explosivePenalty
  const rawDef = (bd.armorBV ?? 0) + (bd.structureBV ?? 0) + (bd.gyroBV ?? 0) + (bd.defensiveEquipBV ?? 0) - (bd.explosivePenalty ?? 0);
  const expectedDef = rawDef * (bd.defensiveFactor ?? 1);
  console.log(`  Defensive BV recalc: raw=${rawDef.toFixed(1)} * factor=${bd.defensiveFactor ?? '?'} = ${expectedDef.toFixed(1)} (reported: ${bd.defensiveBV ?? '?'})`);

  // Check 4: Offensive BV estimate
  const rawOff = (bd.weaponBV ?? 0) + (bd.ammoBV ?? 0);
  const expectedOff = rawOff * (bd.speedFactor ?? 1);
  console.log(`  Offensive BV recalc: (weaponBV=${bd.weaponBV ?? '?'} + ammoBV=${bd.ammoBV ?? '?'}) * sf=${bd.speedFactor ?? '?'} = ${expectedOff.toFixed(1)} (reported: ${bd.offensiveBV ?? '?'})`);
  if (bd.offensiveBV != null) {
    const offDelta = bd.offensiveBV - expectedOff;
    if (Math.abs(offDelta) > 0.5) {
      console.log(`    -> Offensive BV includes extra: ${offDelta.toFixed(1)} (likely weight bonus / off equip / physical weapons)`);
    }
  }

  // Check 5: What could the gap be?
  const totalCalc = (bd.defensiveBV ?? 0) + (bd.offensiveBV ?? 0);
  const cockpitMod = bd.cockpitModifier ?? 1.0;
  const adjustedCalc = Math.round(totalCalc * cockpitMod);
  console.log(`  Total = def(${(bd.defensiveBV ?? 0).toFixed(1)}) + off(${(bd.offensiveBV ?? 0).toFixed(1)}) = ${totalCalc.toFixed(1)}`);
  if (cockpitMod !== 1.0) {
    console.log(`  * cockpitMod ${cockpitMod} = ${adjustedCalc}`);
  }

  // Check if unresolved crits suggest missing BV
  if (ud.criticalSlots) {
    const omnipodCrits: string[] = [];
    for (const [loc, slots] of Object.entries(ud.criticalSlots)) {
      for (const slot of (slots as (string | null)[])) {
        if (slot && slot.includes('(omnipod)') && !slot.toLowerCase().includes('ammo') &&
            !slot.toLowerCase().includes('endo') && !slot.toLowerCase().includes('ferro') &&
            !slot.toLowerCase().includes('case') && !slot.toLowerCase().includes('heat sink') &&
            !slot.toLowerCase().includes('double heat sink') && !slot.toLowerCase().includes('engine') &&
            !slot.toLowerCase().includes('gyro') && !slot.toLowerCase().includes('jump jet')) {
          omnipodCrits.push(`${loc}: ${slot}`);
        }
      }
    }
    if (omnipodCrits.length > 0) {
      // Cross-reference: see which omnipod crits correspond to equipment that resolved vs didn't
      const equipIds = new Set((ud.equipment || []).map((e: any) => e.id.toLowerCase()));
      console.log(`  Omnipod weapon/equip crits (${omnipodCrits.length}):`);
      for (const c of omnipodCrits) {
        console.log(`    ${c}`);
      }
    }
  }

  summaryData.push({
    name,
    tonnage: ud.tonnage,
    techBase: ud.techBase,
    gap: missingBV,
    pctDiff: rr.percentDiff,
    unresolvedWeaponBV,
    unresolvedAmmoBV,
    unresolvedEquipBV,
    specialEquip: foundSpecial,
  });
}

// ============================================================================
// AGGREGATE SUMMARY
// ============================================================================

console.log(`\n${'='.repeat(80)}`);
console.log(`AGGREGATE SUMMARY`);
console.log(`${'='.repeat(80)}\n`);

console.log(`Units traced: ${summaryData.length}`);

// Group by tech base
const clanUnits = summaryData.filter(s => s.techBase === 'CLAN');
const mixedUnits = summaryData.filter(s => s.techBase === 'MIXED');
const isUnits = summaryData.filter(s => s.techBase === 'INNER_SPHERE');

console.log(`\nBy tech base:`);
console.log(`  CLAN: ${clanUnits.length} units, avg gap: ${clanUnits.length > 0 ? (clanUnits.reduce((s, u) => s + u.gap, 0) / clanUnits.length).toFixed(1) : 'n/a'}`);
console.log(`  MIXED: ${mixedUnits.length} units, avg gap: ${mixedUnits.length > 0 ? (mixedUnits.reduce((s, u) => s + u.gap, 0) / mixedUnits.length).toFixed(1) : 'n/a'}`);
console.log(`  IS: ${isUnits.length} units, avg gap: ${isUnits.length > 0 ? (isUnits.reduce((s, u) => s + u.gap, 0) / isUnits.length).toFixed(1) : 'n/a'}`);

// Common special equipment
const specialCounts: Record<string, number> = {};
for (const s of summaryData) {
  for (const eq of s.specialEquip) {
    specialCounts[eq] = (specialCounts[eq] || 0) + 1;
  }
}
console.log(`\nSpecial equipment frequency:`);
for (const [eq, count] of Object.entries(specialCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${eq}: ${count}/${summaryData.length}`);
}

// Overall pattern analysis
console.log(`\n${'='.repeat(80)}`);
console.log(`PATTERN ANALYSIS - ALL UNDERCALCULATED CLAN/MIXED UNITS`);
console.log(`${'='.repeat(80)}\n`);

// Find ALL undercalculated Clan/Mixed units (not just top 10)
const allClanUnder = report.allResults.filter((r: any) => {
  if (r.status === 'error' || r.percentDiff === null || r.percentDiff >= 0) return false;
  const iu = indexByUnitId.get(r.unitId);
  if (!iu) return false;
  return iu.techBase === 'CLAN' || iu.techBase === 'MIXED';
});

const allISUnder = report.allResults.filter((r: any) => {
  if (r.status === 'error' || r.percentDiff === null || r.percentDiff >= 0) return false;
  const iu = indexByUnitId.get(r.unitId);
  if (!iu) return false;
  return iu.techBase === 'INNER_SPHERE';
});

console.log(`Total undercalculated Clan/Mixed: ${allClanUnder.length}`);
console.log(`Total undercalculated IS: ${allISUnder.length}`);
console.log(`Avg Clan/Mixed undercalc: ${allClanUnder.length > 0 ? (allClanUnder.reduce((s: number, r: any) => s + r.percentDiff, 0) / allClanUnder.length).toFixed(2) : 'n/a'}%`);
console.log(`Avg IS undercalc: ${allISUnder.length > 0 ? (allISUnder.reduce((s: number, r: any) => s + r.percentDiff, 0) / allISUnder.length).toFixed(2) : 'n/a'}%`);

// Bucket by severity
const clanBySeverity = {
  '1-2%': allClanUnder.filter((r: any) => Math.abs(r.percentDiff) >= 1 && Math.abs(r.percentDiff) < 2).length,
  '2-5%': allClanUnder.filter((r: any) => Math.abs(r.percentDiff) >= 2 && Math.abs(r.percentDiff) < 5).length,
  '5-10%': allClanUnder.filter((r: any) => Math.abs(r.percentDiff) >= 5 && Math.abs(r.percentDiff) < 10).length,
  '10%+': allClanUnder.filter((r: any) => Math.abs(r.percentDiff) >= 10).length,
};
console.log(`\nClan/Mixed undercalc severity:`);
for (const [bucket, count] of Object.entries(clanBySeverity)) {
  console.log(`  ${bucket}: ${count}`);
}

// Check for weapon resolution issues across ALL undercalculated Clan units
console.log(`\n--- WEAPON RESOLUTION SWEEP (all Clan undercalc >1%) ---`);
const significantClanUnder = allClanUnder.filter((r: any) => Math.abs(r.percentDiff) >= 1);
let totalUnresolvedCount = 0;
let totalMismatchBV = 0;
const unresolvedWeaponFreq: Record<string, number> = {};

for (const r of significantClanUnder.slice(0, 50)) { // sample first 50
  const iu = indexByUnitId.get(r.unitId);
  if (!iu) continue;
  const fp = path.resolve('public/data/units/battlemechs', iu.path);
  let ud: any;
  try {
    ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  } catch { continue; }

  for (const eq of (ud.equipment || [])) {
    const res = resolveEquipmentBV(eq.id);
    if (!res.resolved) {
      // Try clan prefix
      const normId = normalizeEquipmentId(eq.id);
      const clanRes = normId.startsWith('clan-') ? res : resolveEquipmentBV('clan-' + normId);
      if (!clanRes.resolved) {
        totalUnresolvedCount++;
        unresolvedWeaponFreq[eq.id] = (unresolvedWeaponFreq[eq.id] || 0) + 1;
      }
    }

    // Check for IS-vs-Clan BV mismatch
    const normId = normalizeEquipmentId(eq.id);
    const clanId = normId.startsWith('clan-') ? normId : `clan-${normId}`;
    const clanRes = resolveEquipmentBV(clanId);
    if (clanRes.resolved && res.resolved && clanRes.battleValue > res.battleValue) {
      totalMismatchBV += (clanRes.battleValue - res.battleValue);
    }
  }
}

console.log(`Unresolved equipment instances (sample of 50 units): ${totalUnresolvedCount}`);
console.log(`Total Clan-vs-IS BV mismatch: ${totalMismatchBV}`);
if (Object.keys(unresolvedWeaponFreq).length > 0) {
  console.log(`Most frequent unresolved IDs:`);
  for (const [id, count] of Object.entries(unresolvedWeaponFreq).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${id}: ${count}`);
  }
}

// Final summary
console.log(`\n${'='.repeat(80)}`);
console.log(`HYPOTHESIS: What is systematically missing for Clan undercalculated units?`);
console.log(`${'='.repeat(80)}\n`);
console.log(`Trace complete. Review the per-unit breakdowns above to identify the pattern.`);
