/**
 * Deep trace the Turkina-Z to find the exact source of the 475 BV gap.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  calculateOffensiveBVWithHeatTracking,
  calculateDefensiveBV,
  calculateAmmoBVWithExcessiveCap,
  calculateOffensiveSpeedFactor,
} from '../src/utils/construction/battleValueCalculations';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

// Test with Turkina-Z and also a few other high-gap units
const testUnits = ['turkina-z', 'atlas-c', 'centurion-cn9-d', 'barghest-bgs-4t'];

for (const uid of testUnits) {
  const unit = loadUnit(uid);
  const result = report.allResults.find((r: any) => r.unitId === uid);
  if (!unit || !result) { console.log(`${uid}: NOT FOUND`); continue; }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`${uid} (${unit.techBase}, ${unit.tonnage}t) ref=${result.indexBV} calc=${result.calculatedBV} gap=${result.difference}`);

  const b = result.breakdown;
  console.log(`  DefBV: ${b.defensiveBV?.toFixed(0)}  OffBV: ${b.offensiveBV?.toFixed(0)}`);
  console.log(`  WeaponBV: ${b.weaponBV?.toFixed(0)}  AmmoBV: ${b.ammoBV}  WeightBonus: ${b.weightBonus?.toFixed(0)}`);
  console.log(`  SF: ${b.speedFactor}  CockpitMod: ${b.cockpitModifier}  HE: ${b.heatEfficiency}`);

  // Show equipment list
  console.log('\n  Equipment:');
  for (const eq of unit.equipment) {
    const lo = eq.id.toLowerCase();
    if (lo.includes('ammo')) continue;
    const res = resolveEquipmentBV(eq.id);
    const normKey = normalizeEquipmentId(eq.id.toLowerCase().replace(/^\d+-/, ''));
    console.log(`    ${eq.id.padEnd(30)} normKey=${normKey.padEnd(20)} bv=${res.battleValue} heat=${res.heat} ${res.resolved ? '' : 'UNRESOLVED'}`);
  }

  // Now manually compute ammo BV with weapon-ammo matching
  // Replicate the weapon/ammo key normalization
  console.log('\n  Weapon key normalization (for ammo matching):');
  const weapons: Array<{ id: string; bv: number }> = [];
  for (const eq of unit.equipment) {
    const lo = eq.id.toLowerCase();
    if (lo.includes('ammo') || lo.includes('heat') || lo.includes('case') || lo.includes('targeting') ||
        lo.includes('tsm') || lo.includes('ecm') || lo.includes('probe') || lo.includes('narc') || lo.includes('tag') ||
        lo.includes('pod') || lo.includes('jump') || lo.includes('masc') || lo.includes('null-sig') || lo.includes('void-sig') ||
        lo.includes('chameleon') || lo.includes('stealth') || lo.includes('shield') || lo.includes('ams') || lo.includes('anti-missile') ||
        lo.includes('artemis') || lo.includes('apollo') || lo.includes('c3') || lo.includes('coolant') || lo.includes('partial-wing') ||
        lo.includes('actuator') || lo.includes('aes') || lo.includes('amu')) continue;

    const res = resolveEquipmentBV(eq.id);
    const qtyMatch = eq.id.match(/^(\d+)-/);
    const qty = (qtyMatch && parseInt(qtyMatch[1], 10) > 1) ? parseInt(qtyMatch[1], 10) : 1;
    for (let i = 0; i < qty; i++) {
      // This is the key used by normalizeWeaponKey in validate-bv.ts — approximate it
      const normId = normalizeEquipmentId(eq.id.toLowerCase().replace(/^\d+-/, ''));
      weapons.push({ id: normId, bv: res.battleValue });
    }
  }

  // Show weapon IDs after normalization
  const weaponBVByType: Record<string, number> = {};
  for (const w of weapons) {
    const k = normalizeEquipmentId(w.id);
    weaponBVByType[k] = (weaponBVByType[k] ?? 0) + w.bv;
    console.log(`    weapon: id="${w.id}" normKey="${k}" bv=${w.bv}`);
  }
  console.log('  Weapon BV by type:', JSON.stringify(weaponBVByType));

  // Now list ammo from crits with their weaponType
  console.log('\n  Ammo (from scanCrits):');
  const ammoBVByType: Record<string, number> = {};
  for (const [, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (!s || typeof s !== 'string') continue;
      if (!s.toLowerCase().includes('ammo')) continue;
      if (s.toLowerCase().includes('ammo feed')) continue;
      const clean = s.replace(/\s*\(omnipod\)/gi, '').trim();
      console.log(`    "${clean}"`);
    }
  }

  // What base offensive BV is NEEDED?
  const cockpit = b.cockpitModifier ?? 1.0;
  const neededTotal = result.indexBV / cockpit;
  const neededOff = neededTotal - b.defensiveBV;
  const neededBase = neededOff / b.speedFactor;
  const currentBase = b.weaponBV + b.ammoBV + b.weightBonus + (b.physicalWeaponBV ?? 0) + (b.offEquipBV ?? 0);
  console.log(`\n  Needed base offensive: ${neededBase.toFixed(0)} (current: ${currentBase.toFixed(0)}, gap: ${(neededBase - currentBase).toFixed(0)})`);
  console.log(`  Components: weapon=${b.weaponBV?.toFixed(0)} ammo=${b.ammoBV} weight=${b.weightBonus?.toFixed(0)} phys=${b.physicalWeaponBV?.toFixed(0) ?? 0} eq=${b.offEquipBV ?? 0}`);
}

// Also check: what's in the ammunition.json catalog for iATM ammo?
console.log('\n\n=== iATM AMMO CATALOG CHECK ===');
try {
  const ammoCat = JSON.parse(fs.readFileSync('public/data/equipment/official/ammunition.json', 'utf8'));
  const iatmAmmo = ammoCat.items.filter((item: any) => item.id.toLowerCase().includes('iatm'));
  for (const item of iatmAmmo) {
    console.log(`  ${item.id}: bv=${item.battleValue} compatibleWeapons=${JSON.stringify(item.compatibleWeaponIds)}`);
  }
  if (iatmAmmo.length === 0) console.log('  NO iATM ammo entries in catalog');
} catch (e) { console.log('  Error reading catalog'); }

// Check ATM ammo entries too
console.log('\n=== ATM AMMO CATALOG CHECK ===');
try {
  const ammoCat = JSON.parse(fs.readFileSync('public/data/equipment/official/ammunition.json', 'utf8'));
  const atmAmmo = ammoCat.items.filter((item: any) => item.id.toLowerCase().includes('atm'));
  for (const item of atmAmmo) {
    console.log(`  ${item.id}: bv=${item.battleValue} compatible=${JSON.stringify(item.compatibleWeaponIds || [])}`);
  }
} catch (e) { console.log('  Error reading catalog'); }
