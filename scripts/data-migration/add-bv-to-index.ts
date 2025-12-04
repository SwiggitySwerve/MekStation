#!/usr/bin/env ts-node
/**
 * Add BV to existing index.json
 * 
 * Calculates Battle Value for each unit and adds it to the index.
 * 
 * Usage:
 *   npx ts-node scripts/data-migration/add-bv-to-index.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const INDEX_PATH = 'public/data/units/battlemechs/index.json';
const UNITS_DIR = 'public/data/units/battlemechs';

// ============================================================================
// BV CONSTANTS
// ============================================================================

const SPEED_FACTORS: Record<number, number> = {
  0: 1.0, 1: 1.1, 2: 1.2, 3: 1.3, 4: 1.4,
  5: 1.5, 6: 1.6, 7: 1.7, 8: 1.8, 9: 1.9, 10: 2.0,
};

const WEAPON_BV: Record<string, number> = {
  // Energy weapons
  'small-laser': 9, 'medium-laser': 46, 'large-laser': 123,
  'er-small-laser': 17, 'er-medium-laser': 62, 'er-large-laser': 163,
  'ppc': 176, 'er-ppc': 229, 'snub-nose-ppc': 165,
  'small-pulse-laser': 12, 'medium-pulse-laser': 48, 'large-pulse-laser': 119,
  'er-small-pulse-laser': 36, 'er-medium-pulse-laser': 111, 'er-large-pulse-laser': 272,
  'flamer': 6, 'er-flamer': 16,
  'small-x-pulse-laser': 21, 'medium-x-pulse-laser': 71, 'large-x-pulse-laser': 178,
  
  // Ballistic weapons
  'machine-gun': 5, 'light-machine-gun': 5, 'heavy-machine-gun': 6,
  'ac-2': 37, 'ac-5': 70, 'ac-10': 123, 'ac-20': 178,
  'lb-2-x-ac': 42, 'lb-5-x-ac': 83, 'lb-10-x-ac': 148, 'lb-20-x-ac': 237,
  'ultra-ac-2': 56, 'ultra-ac-5': 112, 'ultra-ac-10': 210, 'ultra-ac-20': 281,
  'rotary-ac-2': 118, 'rotary-ac-5': 247,
  'light-ac-2': 30, 'light-ac-5': 62,
  'gauss-rifle': 320, 'light-gauss-rifle': 159, 'heavy-gauss-rifle': 346,
  'hyper-assault-gauss-20': 267, 'hyper-assault-gauss-30': 401, 'hyper-assault-gauss-40': 535,
  
  // Missile weapons
  'srm-2': 21, 'srm-4': 39, 'srm-6': 59,
  'lrm-5': 45, 'lrm-10': 90, 'lrm-15': 136, 'lrm-20': 181,
  'streak-srm-2': 30, 'streak-srm-4': 59, 'streak-srm-6': 89,
  'mrm-10': 56, 'mrm-20': 112, 'mrm-30': 168, 'mrm-40': 224,
  'atm-3': 53, 'atm-6': 105, 'atm-9': 158, 'atm-12': 212,
  'mml-3': 29, 'mml-5': 49, 'mml-7': 67, 'mml-9': 86,
  
  // Clan energy
  'er-micro-laser': 7, 'micro-pulse-laser': 12,
  'heavy-small-laser': 15, 'heavy-medium-laser': 76, 'heavy-large-laser': 244,
  
  // Support weapons
  'tag': 0, 'narc-launcher': 30, 'inarc-launcher': 75,
  'anti-missile-system': 32, 'laser-anti-missile-system': 45,
};

// Internal structure points by tonnage (standard)
const INTERNAL_STRUCTURE: Record<number, number> = {
  20: 33, 25: 42, 30: 51, 35: 60, 40: 68, 45: 77,
  50: 85, 55: 94, 60: 102, 65: 111, 70: 119, 75: 128,
  80: 136, 85: 145, 90: 153, 95: 162, 100: 170,
};

// ============================================================================
// TYPES
// ============================================================================

interface UnitData {
  tonnage: number;
  engine?: { type: string; rating: number };
  movement?: { walk: number; jump?: number };
  heatSinks?: { type: string; count: number };
  armor?: { type: string; allocation?: Record<string, number | { front: number; rear: number }> };
  equipment?: { id: string; location: string }[];
}

interface IndexEntry {
  id: string;
  chassis: string;
  model: string;
  tonnage: number;
  techBase: string;
  year: number;
  role: string;
  rulesLevel?: string;
  cost?: number;
  bv?: number;
  path: string;
}

interface IndexFile {
  version: string;
  generatedAt: string;
  totalUnits: number;
  units: IndexEntry[];
}

// ============================================================================
// BV CALCULATION
// ============================================================================

function calculateTMM(runMP: number, jumpMP: number = 0): number {
  const bestMP = Math.max(runMP, jumpMP);
  if (bestMP <= 2) return 0;
  if (bestMP <= 4) return 1;
  if (bestMP <= 6) return 2;
  if (bestMP <= 9) return 3;
  if (bestMP <= 12) return 4;
  if (bestMP <= 17) return 5;
  if (bestMP <= 24) return 6;
  return 7;
}

function calculateSpeedFactor(walkMP: number, jumpMP: number = 0): number {
  const runMP = Math.ceil(walkMP * 1.5);
  const tmm = calculateTMM(runMP, jumpMP);
  let factor = SPEED_FACTORS[tmm] ?? 1.0;
  
  if (jumpMP > walkMP) {
    factor = Math.min(2.24, factor + Math.min(0.5, (jumpMP - walkMP) * 0.1));
  }
  return factor;
}

function calculateTotalArmorPoints(allocation: Record<string, number | { front: number; rear: number }> | undefined): number {
  if (!allocation) return 0;
  let total = 0;
  for (const value of Object.values(allocation)) {
    if (typeof value === 'number') {
      total += value;
    } else if (value && typeof value === 'object' && 'front' in value) {
      total += value.front + value.rear;
    }
  }
  return total;
}

function getWeaponBV(equipmentId: string): number {
  const normalized = equipmentId.toLowerCase().replace(/[_\s]/g, '-');
  return WEAPON_BV[normalized] ?? 0;
}

function calculateUnitBV(unit: UnitData): number {
  // Get structure points
  const structurePoints = INTERNAL_STRUCTURE[unit.tonnage] ?? Math.round(unit.tonnage * 1.7);
  
  // Get armor points
  const armorPoints = calculateTotalArmorPoints(unit.armor?.allocation);
  
  // Defensive BV
  const armorFactor = armorPoints * 2.5;
  const structureFactor = structurePoints * 1.5;
  const defensiveBV = armorFactor + structureFactor;
  
  // Offensive BV from weapons
  let offensiveBV = 0;
  if (unit.equipment) {
    for (const item of unit.equipment) {
      const weaponBV = getWeaponBV(item.id);
      offensiveBV += weaponBV;
    }
  }
  
  // If no weapons found, estimate from tonnage
  if (offensiveBV === 0) {
    offensiveBV = unit.tonnage * 8; // Rough estimate
  }
  
  // Speed factor
  const walkMP = unit.movement?.walk ?? Math.floor((unit.engine?.rating ?? 200) / unit.tonnage);
  const jumpMP = unit.movement?.jump ?? 0;
  const speedFactor = calculateSpeedFactor(walkMP, jumpMP);
  
  // Total BV
  const totalBV = Math.round((defensiveBV + offensiveBV) * speedFactor);
  
  return totalBV;
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  console.log('Adding BV to index.json...\n');

  const indexContent = fs.readFileSync(INDEX_PATH, 'utf-8');
  const index: IndexFile = JSON.parse(indexContent);

  console.log(`Found ${index.units.length} units in index\n`);

  let updated = 0;
  let errors = 0;

  for (const entry of index.units) {
    try {
      const unitPath = path.join(UNITS_DIR, entry.path);
      if (!fs.existsSync(unitPath)) {
        console.error(`Unit file not found: ${unitPath}`);
        errors++;
        continue;
      }

      const unitContent = fs.readFileSync(unitPath, 'utf-8');
      const unit: UnitData = JSON.parse(unitContent);

      const bv = calculateUnitBV(unit);
      entry.bv = bv;
      updated++;
      
    } catch (error) {
      console.error(`Error processing ${entry.path}: ${error}`);
      errors++;
    }
  }

  index.generatedAt = new Date().toISOString();
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));

  console.log('\n========================================');
  console.log('BV Calculation Complete');
  console.log('========================================');
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  console.log(`Output: ${INDEX_PATH}`);
  
  console.log('\nSample BVs:');
  for (const entry of index.units.slice(0, 5)) {
    console.log(`  ${entry.chassis} ${entry.model}: ${entry.bv?.toLocaleString()} BV`);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

