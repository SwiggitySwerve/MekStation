/**
 * Deep trace: for specific high-gap units, show exactly what weapons resolved to
 * and compare with expected values.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

// Replicate resolveWeaponForUnit logic from validate-bv.ts
const FALLBACK_WEAPON_BV: Record<string, { bv: number; heat: number }> = {};
// Load the actual fallback map from validate-bv.ts (simplified - just test direct resolution)

function isClanEquipAtLocation(equipId: string, location: string, critSlots?: Record<string, (string | null)[]>): boolean {
  if (!critSlots) return false;
  const normalizedLoc = location.split(',')[0].toUpperCase();
  for (const [loc, slots] of Object.entries(critSlots)) {
    if (loc.toUpperCase() !== normalizedLoc) continue;
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (!s || typeof s !== 'string') continue;
      const slo = s.toLowerCase();
      if (slo.startsWith('cl') || slo.startsWith('clan')) {
        // Check if this crit slot matches the equipment
        const equipLo = equipId.toLowerCase().replace(/^\d+-/, '');
        const sNorm = slo.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        const eNorm = equipLo.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        // Loose match
        if (sNorm.includes(eNorm) || eNorm.includes(sNorm)) return true;
      }
    }
  }
  return false;
}

function resolveWeaponForUnit(id: string, techBase: string, isClanEquip?: boolean): { battleValue: number; heat: number; resolved: boolean; source: string } {
  const lo = id.toLowerCase().replace(/^\d+-/, '');
  const normId = normalizeEquipmentId(lo);
  const isResult = resolveEquipmentBV(id);

  if (techBase === 'CLAN' || isClanEquip || (techBase === 'MIXED' && (lo.startsWith('clan-') || lo.startsWith('cl-') || lo.startsWith('cl ')))) {
    const normalizedIS = normalizeEquipmentId(lo);
    const candidates: string[] = [];
    if (!normalizedIS.startsWith('clan-')) candidates.push('clan-' + normalizedIS);
    if (!lo.startsWith('clan-') && lo !== normalizedIS) candidates.push('clan-' + lo);
    for (const cid of candidates) {
      const cr = resolveEquipmentBV(cid);
      if (cr.resolved && cr.battleValue > 0) {
        if (!isResult.resolved || cr.battleValue > isResult.battleValue) return { ...cr, source: `clan(${cid})` };
        if (isResult.battleValue === cr.battleValue) return { ...cr, source: `clan-same(${cid})` };
      }
    }
  }

  if (isResult.resolved && isResult.battleValue > 0) return { ...isResult, source: 'direct' };

  // MIXED fallback
  if (techBase === 'MIXED' && (!isResult.resolved || isResult.battleValue === 0)) {
    const normalizedMixed = normalizeEquipmentId(lo);
    const clanCandidates: string[] = [];
    if (!normalizedMixed.startsWith('clan-')) clanCandidates.push('clan-' + normalizedMixed);
    for (const cid of clanCandidates) {
      const cr = resolveEquipmentBV(cid);
      if (cr.resolved && cr.battleValue > 0) return { ...cr, source: `mixed-fallback(${cid})` };
    }
  }

  return { battleValue: 0, heat: 0, resolved: false, source: 'UNRESOLVED' };
}

// Trace these specific units
const targetUnits = [
  'turkina-z',
  'barghest-bgs-3t',
  'phoenix-hawk-pxh-99',
  'osteon-u',
  'malice-mal-yz',
  'battlemaster-c',
  'mackie-msk-5s',
  'hankyu-f',
];

for (const uid of targetUnits) {
  const unit = loadUnit(uid);
  const result = report.allResults.find((r: any) => r.unitId === uid);
  if (!unit || !result) { console.log(`\n${uid}: NOT FOUND`); continue; }

  const b = result.breakdown;
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${uid} (${unit.techBase}, ${unit.tonnage}t)`);
  console.log(`  Reference: ${result.indexBV}  Calculated: ${result.calculatedBV}  Gap: ${result.difference} (${result.percentDiff?.toFixed(1)}%)`);
  console.log(`  DefBV: ${b?.defensiveBV?.toFixed(0)}  OffBV: ${b?.offensiveBV?.toFixed(0)}  SF: ${b?.speedFactor}  CockpitMod: ${b?.cockpitModifier}`);
  console.log(`  WeaponBV: ${b?.weaponBV?.toFixed(0)} (raw=${b?.rawWeaponBV?.toFixed(0)}, halved=${b?.halvedWeaponBV?.toFixed(0)}, ${b?.halvedWeaponCount}/${b?.weaponCount} halved)`);
  console.log(`  AmmoBV: ${b?.ammoBV}  WeightBonus: ${b?.weightBonus?.toFixed(0)}  PhysBV: ${b?.physicalWeaponBV?.toFixed(0)}  OffEqBV: ${b?.offEquipBV}`);
  console.log(`  HeatEff: ${b?.heatEfficiency}  HeatDiss: ${b?.heatDissipation}  MoveHeat: ${b?.moveHeat}`);

  // List all weapons with their resolved BV
  console.log('\n  WEAPONS (from equipment list):');
  let totalEquipBV = 0;
  let totalEquipHeat = 0;
  for (const eq of unit.equipment) {
    const lo = eq.id.toLowerCase();
    if (lo.includes('ammo') || lo.includes('heat') || lo.includes('case') || lo.includes('endo') || lo.includes('ferro') ||
        lo.includes('targeting-computer') || lo.includes('tsm') || lo.includes('triple-strength') ||
        lo.includes('ecm') || lo.includes('guardian') || lo.includes('angel') || lo.includes('watchdog') ||
        lo.includes('probe') || lo.includes('beagle') || lo.includes('bloodhound') || lo.includes('ams') ||
        lo.includes('anti-missile') || lo.includes('shield') || lo.includes('b-pod') || lo.includes('m-pod') ||
        lo.includes('a-pod') || lo.includes('masc') || lo.includes('supercharger') || lo.includes('jump') ||
        lo.includes('null-sig') || lo.includes('void-sig') || lo.includes('chameleon') || lo.includes('stealth') ||
        lo.includes('artemis') || lo.includes('apollo') || lo.includes('narc') || lo.includes('tag') ||
        lo.includes('c3') || lo.includes('coolant') || lo.includes('partial-wing') || lo.includes('pod') ||
        lo.includes('lift-hoist') || lo.includes('ejection') || lo.includes('actuator') || lo.includes('amu')) continue;

    const qtyMatch = eq.id.match(/^(\d+)-/);
    const qty = (qtyMatch && parseInt(qtyMatch[1], 10) > 1) ? parseInt(qtyMatch[1], 10) : 1;

    const clanDetected = unit.techBase === 'MIXED' && isClanEquipAtLocation(eq.id, eq.location, unit.criticalSlots);
    const res = resolveWeaponForUnit(eq.id, unit.techBase, clanDetected);

    const marker = !res.resolved ? ' *** UNRESOLVED ***' : '';
    totalEquipBV += res.battleValue * qty;
    totalEquipHeat += res.heat * qty;
    console.log(`    ${eq.id} @${eq.location} x${qty} → bv=${res.battleValue} heat=${res.heat} [${res.source}]${marker}`);
  }
  console.log(`  Total from equip list: BV=${totalEquipBV} Heat=${totalEquipHeat}`);

  // Also check crit slots for weapons not in equipment list
  if (unit.criticalSlots) {
    console.log('\n  CRIT SLOTS (weapons only):');
    const critWeapons: Record<string, number> = {};
    for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      let prev = '';
      for (const s of slots) {
        if (!s || typeof s !== 'string') { prev = ''; continue; }
        const slo = s.toLowerCase();
        // Skip non-weapons
        if (slo.includes('heat sink') || slo.includes('engine') || slo.includes('gyro') || slo.includes('cockpit') ||
            slo.includes('life support') || slo.includes('sensor') || slo.includes('shoulder') || slo.includes('actuator') ||
            slo.includes('endo') || slo.includes('ferro') || slo.includes('case') || slo.includes('ammo') ||
            slo.includes('jump jet') || slo.includes('targeting') || slo.includes('masc') || slo.includes('supercharger') ||
            slo.includes('tsm') || slo.includes('ecm') || slo.includes('probe') || slo.includes('shield') ||
            slo.includes('null sig') || slo.includes('void sig') || slo.includes('chameleon') || slo.includes('stealth') ||
            slo.includes('artemis') || slo.includes('apollo') || slo.includes('coolant') || slo.includes('partial wing') ||
            slo.includes('pod') || slo.includes('lift hoist') || slo.includes('armor') || slo.includes('structure') ||
            slo.includes('command console') || slo.includes('aes') || slo.includes('c3') || slo.includes('narc') ||
            slo.includes('tag') || slo.includes('(armored)') || slo.includes('(r)')) continue;

        // Dedup multi-slot weapons
        const norm = s.replace(/\s*\(omnipod\)/gi, '').trim();
        if (norm === prev) { prev = norm; continue; }
        prev = norm;

        const key = `${norm}@${loc}`;
        critWeapons[key] = (critWeapons[key] || 0) + 1;
      }
    }
    for (const [key, count] of Object.entries(critWeapons)) {
      console.log(`    ${key} (${count})`);
    }
  }
}
