#!/usr/bin/env npx tsx
/**
 * Battle Value Validation Script
 *
 * Validates BV calculations for all units in the MekStation database.
 * Compares calculated BV (using battleValueCalculations.ts) against stored index.json values.
 *
 * Usage:
 *   npx tsx scripts/validate-bv.ts [options]
 *
 * Options:
 *   --output <path>     Output directory (default: ./validation-output)
 *   --filter <pattern>  Filter units by chassis name (e.g., "Atlas")
 *   --verbose           Show detailed progress
 *   --limit <n>         Limit number of units to process
 *   --help              Show this help message
 */

import * as fs from 'fs';
import * as path from 'path';

import { EngineType } from '../src/types/construction/EngineType';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';
import {
  calculateTotalBV,
  getBVBreakdown,
  BVCalculationConfig,
} from '../src/utils/construction/battleValueCalculations';
import {
  resolveEquipmentBV,
  isResolvable,
} from '../src/utils/construction/equipmentBVResolver';

// ============================================================================
// TYPES
// ============================================================================

interface IndexUnit {
  id: string;
  chassis: string;
  model: string;
  tonnage: number;
  techBase: string;
  year: number;
  role: string;
  path: string;
  rulesLevel: string;
  cost: number;
  bv: number;
}

interface IndexFile {
  version: string;
  generatedAt: string;
  totalUnits: number;
  units: IndexUnit[];
}

interface ArmorAllocation {
  [location: string]: number | { front: number; rear: number };
}

interface Equipment {
  id: string;
  location: string;
}

interface UnitData {
  id: string;
  chassis: string;
  model: string;
  tonnage: number;
  techBase: string;
  engine: { type: string; rating: number };
  gyro: { type: string };
  structure: { type: string };
  armor: { type: string; allocation: ArmorAllocation };
  heatSinks: { type: string; count: number };
  movement: { walk: number; jump: number };
  equipment: Equipment[];
  criticalSlots?: Record<string, (string | null)[]>;
}

interface ValidationResult {
  unitId: string;
  chassis: string;
  model: string;
  tonnage: number;
  indexBV: number;
  calculatedBV: number | null;
  difference: number | null;
  percentDiff: number | null;
  status: 'exact' | 'within5' | 'within10' | 'over10' | 'error';
  error?: string;
  breakdown?: {
    defensiveBV: number;
    offensiveBV: number;
    speedFactor: number;
  };
  issues: string[];
}

interface DiscrepancyCategory {
  heatTracking: string[];
  missingAmmo: string[];
  missingEquipment: string[];
  speedFactorMismatch: string[];
  unknownWeapons: string[];
  structureIssues: string[];
  armorIssues: string[];
  other: string[];
}

interface ValidationReport {
  generatedAt: string;
  summary: {
    totalUnits: number;
    calculated: number;
    failedToCalculate: number;
    exactMatch: number;
    within5Percent: number;
    within10Percent: number;
    over10Percent: number;
  };
  topDiscrepancies: ValidationResult[];
  discrepancyCategories: DiscrepancyCategory;
  allResults: ValidationResult[];
}

interface CLIOptions {
  outputPath: string;
  filter?: string;
  verbose: boolean;
  limit?: number;
  help: boolean;
}

// ============================================================================
// WEAPON ID RESOLUTION (delegates to equipmentBVResolver)
// ============================================================================

function isWeapon(id: string): boolean {
  const lower = id.toLowerCase();

  if (lower.includes('ammo')) return false;

  const nonWeapons = [
    'heatsink',
    'heat-sink',
    'endo',
    'ferro',
    'case',
    'artemis',
    'targeting',
    'ecm',
    'bap',
    'probe',
    'narc',
    'tag',
    'c3',
    'masc',
    'tsm',
    'jump',
    'harjel',
    'umu',
    'taser',
    'flail',
    'sword',
    'hatchet',
    'mace',
    'shield',
  ];

  for (const nw of nonWeapons) {
    if (lower.includes(nw)) return false;
  }

  return isResolvable(id);
}

function getWeaponBV(id: string): number {
  return resolveEquipmentBV(id).battleValue;
}

function getWeaponHeat(id: string): number {
  return resolveEquipmentBV(id).heat;
}

// ============================================================================
// UNIT DATA PROCESSING
// ============================================================================

/**
 * Calculate total armor points from allocation
 */
function calculateTotalArmor(allocation: ArmorAllocation): number {
  let total = 0;

  for (const value of Object.values(allocation)) {
    if (typeof value === 'number') {
      total += value;
    } else if (value && typeof value === 'object') {
      total += (value.front || 0) + (value.rear || 0);
    }
  }

  return total;
}

/**
 * Calculate total structure points from tonnage
 */
function calculateTotalStructure(tonnage: number): number {
  const table = STRUCTURE_POINTS_TABLE[tonnage];
  if (!table) {
    const standardTonnages = Object.keys(STRUCTURE_POINTS_TABLE)
      .map(Number)
      .sort((a, b) => a - b);
    const lower = standardTonnages.filter((t) => t <= tonnage).pop();
    const upper = standardTonnages.find((t) => t >= tonnage);

    if (lower && upper && lower !== upper) {
      const lowerTable = STRUCTURE_POINTS_TABLE[lower];
      const upperTable = STRUCTURE_POINTS_TABLE[upper];
      const ratio = (tonnage - lower) / (upper - lower);

      return Math.round(
        (lowerTable.head +
          lowerTable.centerTorso +
          lowerTable.sideTorso * 2 +
          lowerTable.arm * 2 +
          lowerTable.leg * 2) *
          (1 - ratio) +
          (upperTable.head +
            upperTable.centerTorso +
            upperTable.sideTorso * 2 +
            upperTable.arm * 2 +
            upperTable.leg * 2) *
            ratio,
      );
    }
    if (lower) {
      const t = STRUCTURE_POINTS_TABLE[lower];
      return t.head + t.centerTorso + t.sideTorso * 2 + t.arm * 2 + t.leg * 2;
    }
    return 0;
  }

  return (
    table.head +
    table.centerTorso +
    table.sideTorso * 2 +
    table.arm * 2 +
    table.leg * 2
  );
}

/**
 * Calculate heat dissipation capacity
 */
function calculateHeatDissipation(heatSinks: {
  type: string;
  count: number;
}): number {
  const capacity = heatSinks.type.toUpperCase().includes('DOUBLE') ? 2 : 1;
  return heatSinks.count * capacity;
}

/**
 * Normalize gyro type string
 */
function normalizeGyroType(gyroType: string): string {
  const lower = gyroType.toLowerCase().replace(/[_\s-]+/g, '');
  if (lower.includes('heavy') || lower.includes('duty')) return 'heavy-duty';
  if (lower.includes('xl')) return 'xl';
  if (lower.includes('compact')) return 'compact';
  return 'standard';
}

/**
 * Normalize armor type string
 */
function normalizeArmorType(armorType: string): string {
  const lower = armorType.toLowerCase().replace(/[_\s-]+/g, '');
  if (lower.includes('hardened')) return 'hardened';
  if (lower.includes('reactive')) return 'reactive';
  if (lower.includes('reflective')) return 'reflective';
  if (lower.includes('ballisticreinforced')) return 'ballistic-reinforced';
  if (lower.includes('ferrolamellor')) return 'ferro-lamellor';
  if (lower.includes('antipenetrative')) return 'anti-penetrative';
  if (lower.includes('heatdissipating')) return 'heat-dissipating';
  return 'standard';
}

/**
 * Normalize structure type string
 */
function normalizeStructureType(structureType: string): string {
  const lower = structureType.toLowerCase().replace(/[_\s-]+/g, '');
  if (lower.includes('industrial')) return 'industrial';
  if (lower.includes('composite') && !lower.includes('endo'))
    return 'composite';
  if (lower.includes('reinforced')) return 'reinforced';
  return 'standard';
}

/**
 * Map engine type string from unit data to EngineType enum.
 * Also returns an optional BV multiplier override for Clan XXL (4 side crits → 0.5)
 * since our EngineType.XXL defaults to IS XXL (6 side crits → 0.25).
 */
function mapEngineType(engineTypeStr: string, techBase: string): { type: EngineType; bvMultiplierOverride?: number } {
  const lower = engineTypeStr.toLowerCase().replace(/[_\s-]+/g, '');
  if (lower.includes('xxl')) {
    // Clan XXL: 4 side torso crits → 0.5 (vs IS XXL: 6 → 0.25)
    if (techBase === 'CLAN') return { type: EngineType.XXL, bvMultiplierOverride: 0.5 };
    return { type: EngineType.XXL };
  }
  if (lower.includes('xl')) {
    return { type: techBase === 'CLAN' ? EngineType.XL_CLAN : EngineType.XL_IS };
  }
  if (lower.includes('light')) return { type: EngineType.LIGHT };
  if (lower.includes('compact')) return { type: EngineType.COMPACT };
  if (lower.includes('ice') || lower.includes('combustion')) return { type: EngineType.ICE };
  if (lower.includes('fuelcell') || lower.includes('fuel')) return { type: EngineType.FUEL_CELL };
  if (lower.includes('fission')) return { type: EngineType.FISSION };
  return { type: EngineType.STANDARD };
}

/**
 * Scan critical slots for MASC, Supercharger, and TSM
 */
function scanSpecialEquipment(criticalSlots?: Record<string, (string | null)[]>): {
  hasMASC: boolean;
  hasSupercharger: boolean;
  hasTSM: boolean;
} {
  const result = { hasMASC: false, hasSupercharger: false, hasTSM: false };
  if (!criticalSlots) return result;
  for (const slots of Object.values(criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const slot of slots) {
      if (!slot || typeof slot !== 'string') continue;
      const lo = slot.toLowerCase().replace(/\s+/g, '');
      if (lo.includes('masc') && !lo.includes('supercharger')) result.hasMASC = true;
      if (lo.includes('supercharger')) result.hasSupercharger = true;
      if (lo.includes('triplestrength') || lo === 'tsm' || lo.includes('tsm')) result.hasTSM = true;
    }
  }
  return result;
}

/**
 * Check if a location is rear-facing
 */
function isRearLocation(location: string): boolean {
  const lower = location.toLowerCase();
  return lower.includes('rear') || lower.includes('(r)');
}

/**
 * Map unit data to BV calculation config
 */
function mapUnitToConfig(unit: UnitData): {
  config: BVCalculationConfig;
  issues: string[];
} {
  const issues: string[] = [];

  const walkMP = unit.movement.walk;
  const special = scanSpecialEquipment(unit.criticalSlots);
  let bvWalk = walkMP;
  if (special.hasTSM) bvWalk = walkMP + 1;
  let runMP: number;
  if (special.hasMASC && special.hasSupercharger) {
    runMP = Math.ceil(bvWalk * 2.5);
  } else if (special.hasMASC || special.hasSupercharger) {
    runMP = bvWalk * 2;
  } else {
    runMP = Math.ceil(bvWalk * 1.5);
  }
  const armorType = normalizeArmorType(unit.armor.type);
  if (armorType === 'hardened') runMP = Math.max(0, runMP - 1);
  const jumpMP = unit.movement.jump || 0;

  const totalArmorPoints = calculateTotalArmor(unit.armor.allocation);
  const totalStructurePoints = calculateTotalStructure(unit.tonnage);

  if (totalArmorPoints === 0) {
    issues.push('Zero armor points calculated');
  }
  if (totalStructurePoints === 0) {
    issues.push('Zero structure points calculated');
  }

  const weapons: Array<{ id: string; rear?: boolean }> = [];
  const unknownWeapons: string[] = [];

  for (const eq of unit.equipment) {
    if (isWeapon(eq.id)) {
      const bv = getWeaponBV(eq.id);
      if (bv === 0) {
        unknownWeapons.push(eq.id);
      }
      weapons.push({
        id: eq.id,
        rear: isRearLocation(eq.location),
      });
    }
  }

  if (unknownWeapons.length > 0) {
    issues.push(`Unknown weapons: ${unknownWeapons.join(', ')}`);
  }

  const hasTargetingComputer = unit.equipment.some(
    (eq) =>
      eq.id.toLowerCase().includes('targeting') &&
      eq.id.toLowerCase().includes('computer'),
  );

  const { type: engineType, bvMultiplierOverride } = mapEngineType(unit.engine.type, unit.techBase);

  const config: BVCalculationConfig = {
    totalArmorPoints,
    totalStructurePoints,
    tonnage: unit.tonnage,
    heatSinkCapacity: calculateHeatDissipation(unit.heatSinks),
    walkMP: bvWalk,
    runMP,
    jumpMP,
    weapons,
    hasTargetingComputer,
    hasTSM: special.hasTSM,
    armorType,
    structureType: normalizeStructureType(unit.structure.type),
    gyroType: normalizeGyroType(unit.gyro.type),
    engineType,
    engineMultiplier: bvMultiplierOverride,
  };

  return { config, issues };
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate a single unit
 */
function validateUnit(
  indexUnit: IndexUnit,
  unitData: UnitData,
): ValidationResult {
  const issues: string[] = [];

  try {
    const { config, issues: mappingIssues } = mapUnitToConfig(unitData);
    issues.push(...mappingIssues);

    const calculatedBV = calculateTotalBV(config);
    const breakdown = getBVBreakdown(config);

    const difference = calculatedBV - indexUnit.bv;
    const percentDiff =
      indexUnit.bv !== 0 ? (difference / indexUnit.bv) * 100 : 0;
    const absPercentDiff = Math.abs(percentDiff);

    let status: ValidationResult['status'];
    if (difference === 0) {
      status = 'exact';
    } else if (absPercentDiff <= 5) {
      status = 'within5';
    } else if (absPercentDiff <= 10) {
      status = 'within10';
    } else {
      status = 'over10';
    }

    return {
      unitId: indexUnit.id,
      chassis: indexUnit.chassis,
      model: indexUnit.model,
      tonnage: indexUnit.tonnage,
      indexBV: indexUnit.bv,
      calculatedBV,
      difference,
      percentDiff,
      status,
      breakdown: {
        defensiveBV: breakdown.defensiveBV,
        offensiveBV: breakdown.offensiveBV,
        speedFactor: breakdown.speedFactor,
      },
      issues,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      unitId: indexUnit.id,
      chassis: indexUnit.chassis,
      model: indexUnit.model,
      tonnage: indexUnit.tonnage,
      indexBV: indexUnit.bv,
      calculatedBV: null,
      difference: null,
      percentDiff: null,
      status: 'error',
      error: errorMessage,
      issues: [...issues, `Calculation error: ${errorMessage}`],
    };
  }
}

/**
 * Categorize discrepancies based on issues
 */
function categorizeDiscrepancies(
  results: ValidationResult[],
): DiscrepancyCategory {
  const categories: DiscrepancyCategory = {
    heatTracking: [],
    missingAmmo: [],
    missingEquipment: [],
    speedFactorMismatch: [],
    unknownWeapons: [],
    structureIssues: [],
    armorIssues: [],
    other: [],
  };

  for (const result of results) {
    if (result.status === 'exact' || result.status === 'within5') continue;

    const unitLabel = `${result.chassis} ${result.model}`;

    for (const issue of result.issues) {
      if (issue.includes('Unknown weapons')) {
        categories.unknownWeapons.push(unitLabel);
      } else if (issue.includes('structure')) {
        categories.structureIssues.push(unitLabel);
      } else if (issue.includes('armor')) {
        categories.armorIssues.push(unitLabel);
      } else if (issue.includes('ammo')) {
        categories.missingAmmo.push(unitLabel);
      }
    }

    if (result.issues.length === 0) {
      if (result.difference && result.difference > 100) {
        categories.heatTracking.push(unitLabel);
      } else {
        categories.other.push(unitLabel);
      }
    }
  }

  return categories;
}

// ============================================================================
// CLI AND MAIN
// ============================================================================

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    outputPath: path.resolve(process.cwd(), './validation-output'),
    verbose: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--output':
        options.outputPath = path.resolve(args[++i] || './validation-output');
        break;
      case '--filter':
        options.filter = args[++i];
        break;
      case '--limit':
        options.limit = parseInt(args[++i] || '0', 10);
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
BV Validation Script

Validates Battle Value calculations for all units in the database.
Compares calculated BV against stored index.json values.

Usage:
  npx tsx scripts/validate-bv.ts [options]

Options:
  --output <path>     Output directory (default: ./validation-output)
  --filter <pattern>  Filter units by chassis name (e.g., "Atlas")
  --limit <n>         Limit number of units to process
  --verbose, -v       Show detailed progress
  --help, -h          Show this help message

Examples:
  # Validate all units
  npx tsx scripts/validate-bv.ts

  # Validate only Atlas variants
  npx tsx scripts/validate-bv.ts --filter Atlas

  # Validate first 100 units with verbose output
  npx tsx scripts/validate-bv.ts --limit 100 -v
`);
}

function printProgress(
  current: number,
  total: number,
  unit: string,
  verbose: boolean,
): void {
  if (verbose) {
    console.log(`  [${current}/${total}] ${unit}`);
  } else {
    const percent = Math.floor((current / total) * 100);
    process.stdout.write(`\r  Processing: ${current}/${total} (${percent}%)`);
  }
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  console.log('');
  console.log('BV Validation Report');
  console.log('====================');
  console.log('');

  // Load index
  const indexPath = path.resolve(
    process.cwd(),
    'public/data/units/battlemechs/index.json',
  );

  if (!fs.existsSync(indexPath)) {
    console.error(`Error: Index file not found at ${indexPath}`);
    process.exit(1);
  }

  const indexData: IndexFile = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  let units = indexData.units;

  // Apply filter
  if (options.filter) {
    units = units.filter(
      (u) =>
        u.chassis.toLowerCase().includes(options.filter!.toLowerCase()) ||
        u.model.toLowerCase().includes(options.filter!.toLowerCase()),
    );
    console.log(
      `  Filtered to ${units.length} units matching "${options.filter}"`,
    );
  }

  // Apply limit
  if (options.limit && options.limit > 0) {
    units = units.slice(0, options.limit);
    console.log(`  Limited to ${units.length} units`);
  }

  console.log(`  Total units to validate: ${units.length}`);
  console.log('');

  const results: ValidationResult[] = [];
  const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');

  // Process each unit
  for (let i = 0; i < units.length; i++) {
    const indexUnit = units[i];
    printProgress(
      i + 1,
      units.length,
      `${indexUnit.chassis} ${indexUnit.model}`,
      options.verbose,
    );

    const unitPath = path.join(basePath, indexUnit.path);

    if (!fs.existsSync(unitPath)) {
      results.push({
        unitId: indexUnit.id,
        chassis: indexUnit.chassis,
        model: indexUnit.model,
        tonnage: indexUnit.tonnage,
        indexBV: indexUnit.bv,
        calculatedBV: null,
        difference: null,
        percentDiff: null,
        status: 'error',
        error: `Unit file not found: ${indexUnit.path}`,
        issues: [`Unit file not found: ${indexUnit.path}`],
      });
      continue;
    }

    try {
      const unitData: UnitData = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
      const result = validateUnit(indexUnit, unitData);
      results.push(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      results.push({
        unitId: indexUnit.id,
        chassis: indexUnit.chassis,
        model: indexUnit.model,
        tonnage: indexUnit.tonnage,
        indexBV: indexUnit.bv,
        calculatedBV: null,
        difference: null,
        percentDiff: null,
        status: 'error',
        error: `Failed to parse unit: ${errorMessage}`,
        issues: [`Failed to parse unit: ${errorMessage}`],
      });
    }
  }

  if (!options.verbose) {
    console.log(''); // New line after progress bar
  }

  // Calculate summary
  const calculated = results.filter((r) => r.status !== 'error').length;
  const failed = results.filter((r) => r.status === 'error').length;
  const exact = results.filter((r) => r.status === 'exact').length;
  const within5 = results.filter(
    (r) => r.status === 'within5' || r.status === 'exact',
  ).length;
  const within10 = results.filter(
    (r) =>
      r.status === 'within10' || r.status === 'within5' || r.status === 'exact',
  ).length;
  const over10 = results.filter((r) => r.status === 'over10').length;

  // Get top discrepancies
  const topDiscrepancies = results
    .filter((r) => r.status !== 'error' && r.percentDiff !== null)
    .sort((a, b) => Math.abs(b.percentDiff!) - Math.abs(a.percentDiff!))
    .slice(0, 20);

  // Categorize discrepancies
  const discrepancyCategories = categorizeDiscrepancies(results);

  // Print summary
  console.log('');
  console.log(`Total units: ${units.length}`);
  console.log(`Calculated: ${calculated}`);
  console.log(`Failed to calculate: ${failed}`);
  console.log(
    `Exact match: ${exact} (${((exact / calculated) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Within 5%: ${within5} (${((within5 / calculated) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Within 10%: ${within10} (${((within10 / calculated) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Over 10% discrepancy: ${over10} (${((over10 / calculated) * 100).toFixed(1)}%)`,
  );

  // Print top discrepancies
  console.log('');
  console.log('Top 20 Discrepancies:');
  console.log(
    'Unit                                    Index BV    Calc BV    Diff    %',
  );
  console.log(
    '------------------------------------------------------------------------',
  );

  for (const d of topDiscrepancies) {
    const unitName = `${d.chassis} ${d.model}`.padEnd(40).slice(0, 40);
    const indexBV = String(d.indexBV).padStart(8);
    const calcBV = String(d.calculatedBV).padStart(10);
    const diff = (d.difference! >= 0 ? '+' : '') + d.difference!;
    const pct =
      (d.percentDiff! >= 0 ? '+' : '') + d.percentDiff!.toFixed(1) + '%';
    console.log(
      `${unitName}${indexBV}${calcBV}    ${diff.padStart(6)}  ${pct.padStart(7)}`,
    );
  }

  // Print category summary
  console.log('');
  console.log('Discrepancy by Category:');
  console.log(
    `- Heat tracking issues: ${discrepancyCategories.heatTracking.length} units`,
  );
  console.log(
    `- Missing ammo BV: ${discrepancyCategories.missingAmmo.length} units`,
  );
  console.log(
    `- Unknown weapons: ${discrepancyCategories.unknownWeapons.length} units`,
  );
  console.log(
    `- Structure issues: ${discrepancyCategories.structureIssues.length} units`,
  );
  console.log(
    `- Armor issues: ${discrepancyCategories.armorIssues.length} units`,
  );
  console.log(`- Other: ${discrepancyCategories.other.length} units`);

  // Write full report
  if (!fs.existsSync(options.outputPath)) {
    fs.mkdirSync(options.outputPath, { recursive: true });
  }

  const report: ValidationReport = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalUnits: units.length,
      calculated,
      failedToCalculate: failed,
      exactMatch: exact,
      within5Percent: within5,
      within10Percent: within10,
      over10Percent: over10,
    },
    topDiscrepancies,
    discrepancyCategories,
    allResults: results,
  };

  const reportPath = path.join(options.outputPath, 'bv-validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('');
  console.log(`Full report written to: ${reportPath}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
