#!/usr/bin/env ts-node
/**
 * Add cost to existing index.json
 *
 * Calculates C-Bill cost for each unit and adds it to the index.
 *
 * Usage:
 *   npx ts-node scripts/data-migration/add-cost-to-index.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const INDEX_PATH = 'public/data/units/battlemechs/index.json';
const UNITS_DIR = 'public/data/units/battlemechs';

// ============================================================================
// COST CONSTANTS (from TechManual)
// ============================================================================

const ENGINE_COST_MULTIPLIERS: Record<string, number> = {
  FUSION: 1.0,
  'Standard Fusion': 1.0,
  XL: 2.0,
  'XL Engine (IS)': 2.0,
  'XL Engine (Clan)': 2.0,
  LIGHT: 1.5,
  'Light Engine': 1.5,
  XXL: 3.0,
  'XXL Engine': 3.0,
  COMPACT: 1.5,
  'Compact Engine': 1.5,
  ICE: 0.3,
  'Internal Combustion': 0.3,
  FUEL_CELL: 0.35,
  'Fuel Cell': 0.35,
  FISSION: 0.75,
  Fission: 0.75,
};

const GYRO_COST_MULTIPLIERS: Record<string, number> = {
  STANDARD: 1.0,
  'Standard Gyro': 1.0,
  XL: 0.5,
  'XL Gyro': 0.5,
  COMPACT: 1.5,
  'Compact Gyro': 1.5,
  HEAVY_DUTY: 2.0,
  'Heavy-Duty Gyro': 2.0,
};

const STRUCTURE_COST_PER_TON: Record<string, number> = {
  STANDARD: 400,
  Standard: 400,
  ENDO_STEEL: 1600,
  'Endo Steel': 1600,
  'Endo Steel (IS)': 1600,
  'Endo Steel (Clan)': 1600,
  ENDO_COMPOSITE: 1600,
  'Endo-Composite': 1600,
  REINFORCED: 6400,
  Reinforced: 6400,
  COMPOSITE: 1600,
  Composite: 1600,
  INDUSTRIAL: 300,
  Industrial: 300,
};

const ARMOR_COST_MULTIPLIERS: Record<string, number> = {
  STANDARD: 1.0,
  Standard: 1.0,
  FERRO_FIBROUS: 1.5,
  'Ferro-Fibrous': 1.5,
  'Ferro-Fibrous (IS)': 1.5,
  'Ferro-Fibrous (Clan)': 1.5,
  LIGHT_FERRO: 1.25,
  'Light Ferro-Fibrous': 1.25,
  HEAVY_FERRO: 1.75,
  'Heavy Ferro-Fibrous': 1.75,
  STEALTH: 3.0,
  Stealth: 3.0,
  REACTIVE: 2.0,
  Reactive: 2.0,
  HARDENED: 2.0,
  Hardened: 2.0,
};

const COCKPIT_COSTS: Record<string, number> = {
  STANDARD: 200000,
  Standard: 200000,
  SMALL: 175000,
  Small: 175000,
  COMMAND_CONSOLE: 500000,
  'Command Console': 500000,
  TORSO_MOUNTED: 750000,
  'Torso-Mounted': 750000,
  INDUSTRIAL: 100000,
  Industrial: 100000,
  PRIMITIVE: 100000,
  Primitive: 100000,
};

const HEAT_SINK_COSTS: Record<string, number> = {
  SINGLE: 2000,
  Single: 2000,
  DOUBLE: 6000,
  'Double (IS)': 6000,
  'Double (Clan)': 6000,
  COMPACT: 3000,
  Compact: 3000,
};

// Base cost per armor point (standard armor)
const ARMOR_BASE_COST_PER_POINT = 625; // 10000 C-Bills per ton / 16 points per ton

// ============================================================================
// TYPES
// ============================================================================

interface UnitData {
  tonnage: number;
  engine?: { type: string; rating: number };
  gyro?: { type: string };
  cockpit?: string;
  structure?: { type: string };
  armor?: {
    type: string;
    allocation?: Record<string, number | { front: number; rear: number }>;
  };
  heatSinks?: { type: string; count: number };
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
  path: string;
}

interface IndexFile {
  version: string;
  generatedAt: string;
  totalUnits: number;
  units: IndexEntry[];
}

// ============================================================================
// COST CALCULATION
// ============================================================================

function calculateTotalArmorPoints(
  allocation:
    | Record<string, number | { front: number; rear: number }>
    | undefined,
): number {
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

/**
 * Engine weight lookup table (simplified)
 * Maps rating to weight in tons for standard fusion engine
 */
function getEngineWeight(rating: number): number {
  // Simplified table - actual table has more granularity
  if (rating <= 100) return Math.ceil(rating / 20) + 1;
  if (rating <= 200) return Math.ceil(rating / 15);
  if (rating <= 300) return Math.ceil(rating / 12);
  if (rating <= 400) return Math.ceil(rating / 10);
  return Math.ceil(rating / 8);
}

function calculateUnitCost(unit: UnitData): number {
  // Base chassis cost: tonnage × 10,000
  const chassisCost = unit.tonnage * 10000;

  // Engine cost: 5000 × engine_weight × multiplier
  // (The actual formula uses engine weight from rating table)
  let engineCost = 0;
  if (unit.engine) {
    const multiplier = ENGINE_COST_MULTIPLIERS[unit.engine.type] ?? 1.0;
    const baseEngineWeight = getEngineWeight(unit.engine.rating);
    engineCost =
      (5000 * baseEngineWeight * multiplier * unit.engine.rating) / 10;
  }

  // Gyro cost: gyro_weight × 300,000 × multiplier
  // Gyro weight = ceil(engine_rating / 100)
  let gyroCost = 0;
  if (unit.engine && unit.gyro) {
    const multiplier = GYRO_COST_MULTIPLIERS[unit.gyro.type] ?? 1.0;
    const gyroWeight = Math.ceil(unit.engine.rating / 100);
    gyroCost = gyroWeight * 300000 * multiplier;
  }

  // Cockpit cost
  const cockpitCost = COCKPIT_COSTS[unit.cockpit ?? 'STANDARD'] ?? 200000;

  // Structure cost: structure_weight × cost_per_ton
  let structureCost = 0;
  const structureWeight = unit.tonnage * 0.1; // 10% of tonnage
  if (unit.structure) {
    const costPerTon = STRUCTURE_COST_PER_TON[unit.structure.type] ?? 400;
    structureCost = structureWeight * costPerTon;
  } else {
    structureCost = structureWeight * 400;
  }

  // Armor cost: total_points × cost_per_point × multiplier
  let armorCost = 0;
  if (unit.armor) {
    const totalPoints = calculateTotalArmorPoints(unit.armor.allocation);
    const multiplier = ARMOR_COST_MULTIPLIERS[unit.armor.type] ?? 1.0;
    armorCost = totalPoints * ARMOR_BASE_COST_PER_POINT * multiplier;
  }

  // Heat sink cost (external only - 10 integral are in engine for free)
  let heatSinkCost = 0;
  if (unit.heatSinks) {
    // Integral heat sinks = min(10, floor(engine_rating / 25))
    const integral = unit.engine
      ? Math.min(10, Math.floor(unit.engine.rating / 25))
      : 0;
    const external = Math.max(0, unit.heatSinks.count - integral);
    const costEach = HEAT_SINK_COSTS[unit.heatSinks.type] ?? 2000;
    heatSinkCost = external * costEach;
  }

  // Equipment cost: estimate ~30,000 per equipment item
  const equipmentCount = unit.equipment?.length ?? 0;
  const equipmentCost = equipmentCount * 30000;

  return Math.round(
    chassisCost +
      engineCost +
      gyroCost +
      cockpitCost +
      structureCost +
      armorCost +
      heatSinkCost +
      equipmentCost,
  );
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  console.log('Adding cost to index.json...\n');

  // Read existing index
  const indexContent = fs.readFileSync(INDEX_PATH, 'utf-8');
  const index: IndexFile = JSON.parse(indexContent);

  console.log(`Found ${index.units.length} units in index\n`);

  let updated = 0;
  let errors = 0;

  for (const entry of index.units) {
    try {
      // Read the unit file
      const unitPath = path.join(UNITS_DIR, entry.path);
      if (!fs.existsSync(unitPath)) {
        console.error(`Unit file not found: ${unitPath}`);
        errors++;
        continue;
      }

      const unitContent = fs.readFileSync(unitPath, 'utf-8');
      const unit: UnitData = JSON.parse(unitContent);

      // Calculate cost
      const cost = calculateUnitCost(unit);
      entry.cost = cost;
      updated++;
    } catch (error) {
      console.error(`Error processing ${entry.path}: ${error}`);
      errors++;
    }
  }

  // Update timestamp
  index.generatedAt = new Date().toISOString();

  // Write updated index
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));

  console.log('\n========================================');
  console.log('Cost Calculation Complete');
  console.log('========================================');
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  console.log(`Output: ${INDEX_PATH}`);

  // Show some sample costs
  console.log('\nSample costs:');
  for (const entry of index.units.slice(0, 5)) {
    console.log(
      `  ${entry.chassis} ${entry.model}: ${entry.cost?.toLocaleString()} C-Bills`,
    );
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
