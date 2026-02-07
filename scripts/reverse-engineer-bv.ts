/**
 * Reverse-engineer: for each undercalculated unit, compute what weapon BV would
 * need to be to match the reference. If a unit has only one weapon type,
 * we can compute the exact per-weapon BV needed.
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
const under = valid.filter((x: any) => x.percentDiff < -1 && x.breakdown);

// For each undercalculated unit, check if the gap can be explained by
// weapon BV values being too low for specific tech-base-sensitive weapons
console.log('=== WEAPON BV NEEDED vs ACTUAL ===');

// Group by weapon type: compute what BV would be needed
type WeaponGap = { unitId: string; weaponId: string; currentBV: number; neededBV: number; techBase: string; isClan: boolean };
const weaponGaps: WeaponGap[] = [];

for (const u of under) {
  const unit = loadUnit(u.unitId);
  if (!unit?.equipment) continue;
  const b = u.breakdown;

  const cockpit = b.cockpitModifier ?? 1.0;
  const neededOff = (u.indexBV / cockpit) - b.defensiveBV;
  const neededBase = neededOff / b.speedFactor;
  const currentBase = b.weaponBV + b.ammoBV + b.weightBonus + (b.physicalWeaponBV ?? 0) + (b.offEquipBV ?? 0);
  const baseGap = neededBase - currentBase;
  if (baseGap <= 0) continue;

  // Count weapons (not ammo/equipment)
  const weaponTypes: Record<string, { count: number; bv: number; ids: string[] }> = {};
  for (const eq of unit.equipment) {
    const lo = eq.id.toLowerCase().replace(/^\d+-/, '');
    if (lo.includes('ammo') || lo.includes('heat') || lo.includes('case') || lo.includes('targeting') ||
        lo.includes('tsm') || lo.includes('ecm') || lo.includes('probe') || lo.includes('narc') || lo.includes('tag') ||
        lo.includes('pod') || lo.includes('jump') || lo.includes('masc') || lo.includes('null-sig') || lo.includes('void-sig') ||
        lo.includes('chameleon') || lo.includes('stealth') || lo.includes('shield') || lo.includes('ams') || lo.includes('anti-missile') ||
        lo.includes('artemis') || lo.includes('apollo') || lo.includes('c3') || lo.includes('coolant') || lo.includes('partial-wing') ||
        lo.includes('actuator') || lo.includes('aes')) continue;

    const res = resolveEquipmentBV(eq.id);
    if (!res.resolved || res.battleValue === 0) continue;

    const qtyMatch = eq.id.match(/^(\d+)-/);
    const qty = (qtyMatch && parseInt(qtyMatch[1], 10) > 1) ? parseInt(qtyMatch[1], 10) : 1;
    const key = lo;
    if (!weaponTypes[key]) weaponTypes[key] = { count: 0, bv: res.battleValue, ids: [] };
    weaponTypes[key].count += qty;
    weaponTypes[key].ids.push(eq.id);
  }

  const types = Object.entries(weaponTypes);
  if (types.length === 1) {
    // Single weapon type — exact computation
    const [key, info] = types[0];
    const neededPerWeapon = (neededBase - b.ammoBV - b.weightBonus - (b.physicalWeaponBV ?? 0) - (b.offEquipBV ?? 0)) / info.count;
    // Check if this is a Clan weapon by checking crit slots
    let isClan = unit.techBase === 'CLAN';
    if (!isClan && unit.criticalSlots) {
      for (const [, slots] of Object.entries(unit.criticalSlots)) {
        if (!Array.isArray(slots)) continue;
        for (const s of slots) {
          if (s && typeof s === 'string' && (s.toLowerCase().startsWith('cl') || s.toLowerCase().startsWith('clan'))) {
            const sNorm = s.toLowerCase().replace(/[^a-z0-9]/g, '');
            const eNorm = key.replace(/[^a-z0-9]/g, '');
            if (sNorm.includes(eNorm) || eNorm.includes(sNorm)) { isClan = true; break; }
          }
        }
        if (isClan) break;
      }
    }
    if (Math.abs(neededPerWeapon - info.bv) > 2) {
      weaponGaps.push({ unitId: u.unitId, weaponId: key, currentBV: info.bv, neededBV: Math.round(neededPerWeapon), techBase: unit.techBase, isClan });
    }
  }
}

// Group by weapon type and show the pattern
const byWeapon: Record<string, WeaponGap[]> = {};
for (const g of weaponGaps) {
  const key = g.weaponId;
  if (!byWeapon[key]) byWeapon[key] = [];
  byWeapon[key].push(g);
}

const sorted = Object.entries(byWeapon).sort((a, b) => b[1].length - a[1].length);
for (const [weaponId, gaps] of sorted.slice(0, 25)) {
  const avgCurrent = gaps.reduce((s, g) => s + g.currentBV, 0) / gaps.length;
  const avgNeeded = gaps.reduce((s, g) => s + g.neededBV, 0) / gaps.length;
  const ratio = avgNeeded / avgCurrent;
  const techBases = [...new Set(gaps.map(g => g.techBase))].join('/');
  const clanCount = gaps.filter(g => g.isClan).length;
  console.log(`  ${weaponId.padEnd(35)} ${gaps.length} units: current=${avgCurrent.toFixed(0)} needed=${avgNeeded.toFixed(0)} ratio=${ratio.toFixed(3)} tech=${techBases} clan=${clanCount}/${gaps.length}`);
  // Show individual samples
  for (const g of gaps.slice(0, 3)) {
    console.log(`    ${g.unitId}: ${g.currentBV} → ${g.neededBV} (${g.techBase}${g.isClan ? ' [CLAN]' : ''})`);
  }
}

// SPECIAL CHECK: For Clan units, check if weapons that should resolve to Clan BV are resolving to IS BV
console.log('\n=== CLAN/MIXED WEAPON RESOLUTION CHECK ===');
let clanResolvedAsIS = 0;
const clanISExamples: string[] = [];

for (const u of under) {
  const unit = loadUnit(u.unitId);
  if (!unit?.equipment) continue;
  if (unit.techBase !== 'CLAN' && unit.techBase !== 'MIXED') continue;

  for (const eq of unit.equipment) {
    const lo = eq.id.toLowerCase().replace(/^\d+-/, '');
    if (lo.includes('ammo') || lo.includes('heat') || lo.includes('case')) continue;

    // Try both IS and Clan resolution
    const isRes = resolveEquipmentBV(eq.id);
    const clanId = 'clan-' + lo;
    const clanRes = resolveEquipmentBV(clanId);

    if (isRes.resolved && clanRes.resolved && clanRes.battleValue > isRes.battleValue) {
      // This weapon has different IS and Clan BV, and we're using the IS value
      clanResolvedAsIS++;
      if (clanISExamples.length < 15) {
        clanISExamples.push(`${u.unitId}: ${eq.id} IS_bv=${isRes.battleValue} Clan_bv=${clanRes.battleValue} diff=${clanRes.battleValue - isRes.battleValue}`);
      }
    }
  }
}
console.log(`Clan/Mixed weapons with IS < Clan BV: ${clanResolvedAsIS} instances`);
for (const e of clanISExamples) console.log(`  ${e}`);
