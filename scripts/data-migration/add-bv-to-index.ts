#!/usr/bin/env ts-node
/**
 * Add BV to existing index.json
 *
 * Calculates Battle Value for each unit using the full BV 2.0 engine
 * and adds it to the index.
 *
 * Usage:
 *   npx tsx scripts/data-migration/add-bv-to-index.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { calculateTotalBV } from '../../src/utils/construction/battleValueCalculations';
import { resolveEquipmentBV } from '../../src/utils/construction/equipmentBVResolver';

const INDEX_PATH = 'public/data/units/battlemechs/index.json';
const UNITS_DIR = 'public/data/units/battlemechs';

interface UnitData {
  id: string;
  tonnage: number;
  engine?: { type: string; rating: number };
  movement?: { walk: number; jump?: number };
  heatSinks?: { type: string; count: number };
  armor?: {
    type: string;
    allocation?: Record<string, number | { front: number; rear: number }>;
  };
  structure?: { type: string };
  gyro?: { type: string };
  cockpit?: string;
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

function getInternalStructurePoints(tonnage: number): number {
  const structureTable: Record<number, number> = {
    20: 33, 25: 42, 30: 51, 35: 60, 40: 68, 45: 77, 50: 85, 55: 94,
    60: 102, 65: 111, 70: 119, 75: 128, 80: 136, 85: 145, 90: 153, 95: 162,
    100: 170,
  };
  return structureTable[tonnage] ?? Math.round(tonnage * 1.7);
}

function normalizeEngineType(engineType?: string): string | undefined {
  if (!engineType) return undefined;
  const normalized = engineType.toUpperCase();
  const typeMap: Record<string, string> = {
    FUSION: 'FUSION',
    ICE: 'ICE',
    XL: 'XL',
    XXL: 'XXL',
    LIGHT: 'LIGHT',
    COMPACT: 'COMPACT',
    FISSION: 'FISSION',
  };
  return typeMap[normalized];
}

function normalizeArmorType(armorType?: string): string | undefined {
  if (!armorType) return 'standard';
  const normalized = armorType.toUpperCase();
  const typeMap: Record<string, string> = {
    STANDARD: 'standard',
    FERRO_FIBROUS: 'ferro-fibrous',
    LIGHT_FERRO: 'light-ferro-fibrous',
    HEAVY_FERRO: 'heavy-ferro-fibrous',
    REACTIVE: 'reactive',
    REFLECTIVE: 'reflective',
    HARDENED: 'hardened',
    STEALTH: 'stealth',
  };
  return typeMap[normalized] ?? 'standard';
}

function normalizeStructureType(structureType?: string): string | undefined {
  if (!structureType) return 'standard';
  const normalized = structureType.toUpperCase();
  const typeMap: Record<string, string> = {
    STANDARD: 'standard',
    ENDO_STEEL: 'endo-steel',
    COMPOSITE: 'composite',
    REINFORCED: 'reinforced',
  };
  return typeMap[normalized] ?? 'standard';
}

function normalizeGyroType(gyroType?: string): string | undefined {
  if (!gyroType) return 'standard';
  const normalized = gyroType.toUpperCase();
  const typeMap: Record<string, string> = {
    STANDARD: 'standard',
    HEAVY_DUTY: 'heavy-duty',
    LIGHT: 'light',
    COMPACT: 'compact',
  };
  return typeMap[normalized] ?? 'standard';
}

function normalizeCockpitType(cockpitType?: string): string | undefined {
  if (!cockpitType) return 'standard';
  const normalized = cockpitType.toUpperCase();
  const typeMap: Record<string, string> = {
    STANDARD: 'standard',
    SMALL: 'small',
    TORSO_MOUNTED: 'torso-mounted',
    COMMAND_CONSOLE: 'command-console',
    SMALL_COMMAND_CONSOLE: 'small-command-console',
    INTERFACE: 'interface',
    DRONE_OPERATING_SYSTEM: 'drone-operating-system',
  };
  return typeMap[normalized] ?? 'standard';
}

function calculateUnitBV(unit: UnitData): number {
  try {
    const walkMP = unit.movement?.walk ?? 3;
    const jumpMP = unit.movement?.jump ?? 0;
    const runMP = Math.ceil(walkMP * 1.5);

    const totalArmorPoints = calculateTotalArmorPoints(unit.armor?.allocation);
    const totalStructurePoints = getInternalStructurePoints(unit.tonnage);
    const heatSinkCount = unit.heatSinks?.count ?? 10;

    const weapons = (unit.equipment ?? []).map((eq) => ({
      id: eq.id,
    }));

    const config = {
      totalArmorPoints,
      totalStructurePoints,
      tonnage: unit.tonnage,
      heatSinkCapacity: heatSinkCount,
      walkMP,
      runMP,
      jumpMP,
      weapons,
      armorType: normalizeArmorType(unit.armor?.type),
      structureType: normalizeStructureType(unit.structure?.type),
      gyroType: normalizeGyroType(unit.gyro?.type),
      engineType: normalizeEngineType(unit.engine?.type) as any,
      cockpitType: normalizeCockpitType(unit.cockpit) as any,
    };

    return calculateTotalBV(config);
  } catch (error) {
    console.error(`Error calculating BV for unit ${unit.id}:`, error);
    return 0;
  }
}

async function main(): Promise<void> {
  console.log('Regenerating index.json with full BV 2.0 engine...\n');

  const indexContent = fs.readFileSync(INDEX_PATH, 'utf-8');
  const index: IndexFile = JSON.parse(indexContent);

  console.log(`Found ${index.units.length} units in index\n`);

  let updated = 0;
  let errors = 0;
  const samples: Array<{ chassis: string; model: string; oldBV?: number; newBV: number }> = [];

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
      unit.id = entry.id;

      const oldBV = entry.bv;
      const newBV = calculateUnitBV(unit);
      entry.bv = newBV;
      updated++;

      if (samples.length < 10) {
        samples.push({ chassis: entry.chassis, model: entry.model, oldBV, newBV });
      }
    } catch (error) {
      console.error(`Error processing ${entry.path}: ${error}`);
      errors++;
    }
  }

  index.generatedAt = new Date().toISOString();
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));

  console.log('\n========================================');
  console.log('BV Regeneration Complete');
  console.log('========================================');
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  console.log(`Output: ${INDEX_PATH}`);

  console.log('\nSample BV Changes:');
  for (const sample of samples) {
    const change = sample.oldBV ? ` (${sample.oldBV} → ${sample.newBV})` : ` (${sample.newBV})`;
    console.log(`  ${sample.chassis} ${sample.model}:${change}`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
