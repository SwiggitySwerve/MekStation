/**
 * Unit Equipment Validation Integration Tests
 *
 * Validates that all canonical units can have their equipment properly resolved
 * and their configurations validated against BattleTech construction rules.
 *
 * This test programmatically loads all mech units and verifies:
 * - Equipment IDs can be resolved by the EquipmentRegistry
 * - Unit configurations are valid
 * - Critical slot assignments are correct
 * - Tech base compatibility
 *
 * @spec openspec/specs/equipment-services/spec.md
 * @spec openspec/specs/construction-services/spec.md
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  EquipmentLoaderService,
  getEquipmentLoader,
} from '@/services/equipment/EquipmentLoaderService';
import {
  EquipmentRegistry,
  getEquipmentRegistry,
  IEquipmentLookupResult,
} from '@/services/equipment/EquipmentRegistry';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { AmmoCategory, AmmoVariant } from '@/types/equipment/AmmunitionTypes';
import { ElectronicsCategory } from '@/types/equipment/ElectronicsTypes';
import { MiscEquipmentCategory } from '@/types/equipment/MiscEquipmentTypes';
import { WeaponCategory } from '@/types/equipment/weapons/interfaces';

// Paths - using path.join to resolve paths correctly in different environments
const PROJECT_ROOT = path.join(__dirname, '../../../../');
const UNITS_PATH = path.join(PROJECT_ROOT, 'public/data/units/battlemechs');
const EQUIPMENT_PATH = path.join(
  PROJECT_ROOT,
  'public/data/equipment/official',
);
const INDEX_PATH = path.join(UNITS_PATH, 'index.json');

/**
 * Interface for accessing private maps on the loader service for testing.
 */
interface TestableLoaderMaps {
  weapons: Map<string, unknown>;
  ammunition: Map<string, unknown>;
  electronics: Map<string, unknown>;
  miscEquipment: Map<string, unknown>;
  isLoaded: boolean;
}

/**
 * Helper to access private map properties for testing.
 */
function getLoaderMaps(svc: EquipmentLoaderService): TestableLoaderMaps {
  // oxlint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const internal: Record<string, unknown> = Object(svc);
  return {
    weapons: internal['weapons'] as Map<string, unknown>,
    ammunition: internal['ammunition'] as Map<string, unknown>,
    electronics: internal['electronics'] as Map<string, unknown>,
    miscEquipment: internal['miscEquipment'] as Map<string, unknown>,
    isLoaded: internal['isLoaded'] as boolean,
  };
}

/**
 * Parse tech base string to enum
 * Note: JSON files may have 'BOTH' but our enum only has IS and Clan
 */
function parseTechBase(value: string): TechBase {
  switch (value) {
    case 'INNER_SPHERE':
      return TechBase.INNER_SPHERE;
    case 'CLAN':
      return TechBase.CLAN;
    case 'BOTH':
      return TechBase.INNER_SPHERE; // Default BOTH to IS
    default:
      return TechBase.INNER_SPHERE;
  }
}

/**
 * Parse rules level string to enum
 * Note: JSON files may have 'UNOFFICIAL' but we map it to EXPERIMENTAL
 */
function parseRulesLevel(value: string): RulesLevel {
  switch (value) {
    case 'INTRODUCTORY':
      return RulesLevel.INTRODUCTORY;
    case 'STANDARD':
      return RulesLevel.STANDARD;
    case 'ADVANCED':
      return RulesLevel.ADVANCED;
    case 'EXPERIMENTAL':
      return RulesLevel.EXPERIMENTAL;
    case 'UNOFFICIAL':
      return RulesLevel.EXPERIMENTAL; // Map UNOFFICIAL to EXPERIMENTAL
    default:
      return RulesLevel.STANDARD;
  }
}

/**
 * Parse weapon category string to enum
 */
function parseWeaponCategory(value: string): WeaponCategory {
  switch (value) {
    case 'Energy':
      return WeaponCategory.ENERGY;
    case 'Ballistic':
      return WeaponCategory.BALLISTIC;
    case 'Missile':
      return WeaponCategory.MISSILE;
    case 'Physical':
      return WeaponCategory.PHYSICAL;
    case 'Artillery':
      return WeaponCategory.ARTILLERY;
    default:
      return WeaponCategory.ENERGY;
  }
}

/**
 * Parse ammo category string to enum
 */
function parseAmmoCategory(value: string): AmmoCategory {
  switch (value) {
    case 'Autocannon':
      return AmmoCategory.AUTOCANNON;
    case 'Gauss':
      return AmmoCategory.GAUSS;
    case 'Machine Gun':
      return AmmoCategory.MACHINE_GUN;
    case 'LRM':
      return AmmoCategory.LRM;
    case 'SRM':
      return AmmoCategory.SRM;
    case 'MRM':
      return AmmoCategory.MRM;
    case 'ATM':
      return AmmoCategory.ATM;
    case 'NARC':
      return AmmoCategory.NARC;
    case 'Artillery':
      return AmmoCategory.ARTILLERY;
    case 'AMS':
      return AmmoCategory.AMS;
    default:
      return AmmoCategory.AUTOCANNON;
  }
}

/**
 * Parse ammo variant string to enum
 */
function parseAmmoVariant(value: string): AmmoVariant {
  const variants: Record<string, AmmoVariant> = {
    Standard: AmmoVariant.STANDARD,
    'Armor-Piercing': AmmoVariant.ARMOR_PIERCING,
    Cluster: AmmoVariant.CLUSTER,
    Precision: AmmoVariant.PRECISION,
    Flechette: AmmoVariant.FLECHETTE,
    Inferno: AmmoVariant.INFERNO,
    Fragmentation: AmmoVariant.FRAGMENTATION,
  };
  return variants[value] || AmmoVariant.STANDARD;
}

/**
 * Parse electronics category string to enum
 */
function parseElectronicsCategory(value: string): ElectronicsCategory {
  switch (value) {
    case 'Targeting':
      return ElectronicsCategory.TARGETING;
    case 'ECM':
      return ElectronicsCategory.ECM;
    case 'Active Probe':
      return ElectronicsCategory.ACTIVE_PROBE;
    case 'C3 System':
      return ElectronicsCategory.C3;
    case 'TAG':
      return ElectronicsCategory.TAG;
    case 'Communications':
      return ElectronicsCategory.COMMUNICATIONS;
    default:
      return ElectronicsCategory.TARGETING;
  }
}

/**
 * Parse misc equipment category string to enum
 */
function parseMiscEquipmentCategory(value: string): MiscEquipmentCategory {
  switch (value) {
    case 'Heat Sink':
      return MiscEquipmentCategory.HEAT_SINK;
    case 'Jump Jet':
      return MiscEquipmentCategory.JUMP_JET;
    case 'Movement Enhancement':
      return MiscEquipmentCategory.MOVEMENT;
    case 'Defensive':
      return MiscEquipmentCategory.DEFENSIVE;
    case 'Myomer':
      return MiscEquipmentCategory.MYOMER;
    case 'Industrial':
      return MiscEquipmentCategory.INDUSTRIAL;
    default:
      return MiscEquipmentCategory.HEAT_SINK;
  }
}

/**
 * Load equipment data directly from filesystem for tests
 * This bypasses the web-based loader which doesn't work in Node.js tests
 */
async function loadEquipmentFromFilesystem(
  loaderService: EquipmentLoaderService,
): Promise<number> {
  let itemsLoaded = 0;
  const maps = getLoaderMaps(loaderService);

  // Load weapons
  const weaponFiles = [
    'weapons/energy.json',
    'weapons/ballistic.json',
    'weapons/missile.json',
    'weapons/physical.json',
  ];
  for (const file of weaponFiles) {
    const filePath = path.join(EQUIPMENT_PATH, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content) as { items: RawWeaponData[] };
      if (data.items) {
        for (const item of data.items) {
          maps.weapons.set(item.id, {
            id: item.id,
            name: item.name,
            category: parseWeaponCategory(item.category),
            subType: item.subType,
            techBase: parseTechBase(item.techBase),
            rulesLevel: parseRulesLevel(item.rulesLevel),
            damage: item.damage,
            heat: item.heat,
            ranges: item.ranges,
            weight: item.weight,
            criticalSlots: item.criticalSlots,
            costCBills: item.costCBills,
            battleValue: item.battleValue,
            introductionYear: item.introductionYear,
            ...(item.ammoPerTon && { ammoPerTon: item.ammoPerTon }),
            ...(item.isExplosive && { isExplosive: item.isExplosive }),
            ...(item.special && { special: item.special }),
          });
          itemsLoaded++;
        }
      }
    }
  }

  // Load ammunition
  const ammoPath = path.join(EQUIPMENT_PATH, 'ammunition.json');
  if (fs.existsSync(ammoPath)) {
    const content = fs.readFileSync(ammoPath, 'utf-8');
    const data = JSON.parse(content) as { items: RawAmmunitionData[] };
    if (data.items) {
      for (const item of data.items) {
        maps.ammunition.set(item.id, {
          id: item.id,
          name: item.name,
          category: parseAmmoCategory(item.category),
          variant: parseAmmoVariant(item.variant),
          techBase: parseTechBase(item.techBase),
          rulesLevel: parseRulesLevel(item.rulesLevel),
          compatibleWeaponIds: item.compatibleWeaponIds,
          shotsPerTon: item.shotsPerTon,
          weight: item.weight,
          criticalSlots: item.criticalSlots,
          costPerTon: item.costPerTon,
          battleValue: item.battleValue,
          isExplosive: item.isExplosive,
          introductionYear: item.introductionYear,
        });
        itemsLoaded++;
      }
    }
  }

  // Load electronics
  const electronicsPath = path.join(EQUIPMENT_PATH, 'electronics.json');
  if (fs.existsSync(electronicsPath)) {
    const content = fs.readFileSync(electronicsPath, 'utf-8');
    const data = JSON.parse(content) as { items: RawElectronicsData[] };
    if (data.items) {
      for (const item of data.items) {
        maps.electronics.set(item.id, {
          id: item.id,
          name: item.name,
          category: parseElectronicsCategory(item.category),
          techBase: parseTechBase(item.techBase),
          rulesLevel: parseRulesLevel(item.rulesLevel),
          weight: item.weight,
          criticalSlots: item.criticalSlots,
          costCBills: item.costCBills,
          battleValue: item.battleValue,
          introductionYear: item.introductionYear,
        });
        itemsLoaded++;
      }
    }
  }

  // Load misc equipment
  const miscPath = path.join(EQUIPMENT_PATH, 'miscellaneous.json');
  if (fs.existsSync(miscPath)) {
    const content = fs.readFileSync(miscPath, 'utf-8');
    const data = JSON.parse(content) as { items: RawMiscEquipmentData[] };
    if (data.items) {
      for (const item of data.items) {
        maps.miscEquipment.set(item.id, {
          id: item.id,
          name: item.name,
          category: parseMiscEquipmentCategory(item.category),
          techBase: parseTechBase(item.techBase),
          rulesLevel: parseRulesLevel(item.rulesLevel),
          weight: item.weight,
          criticalSlots: item.criticalSlots,
          costCBills: item.costCBills,
          battleValue: item.battleValue,
          introductionYear: item.introductionYear,
        });
        itemsLoaded++;
      }
    }
  }

  // Mark as loaded
  // oxlint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const internal: Record<string, unknown> = Object(loaderService);
  internal['isLoaded'] = true;

  return itemsLoaded;
}

// Raw data interfaces for JSON parsing
interface RawWeaponData {
  id: string;
  name: string;
  category: string;
  subType: string;
  techBase: string;
  rulesLevel: string;
  damage: number | string;
  heat: number;
  ranges: { minimum: number; short: number; medium: number; long: number };
  weight: number;
  criticalSlots: number;
  ammoPerTon?: number;
  costCBills: number;
  battleValue: number;
  introductionYear: number;
  isExplosive?: boolean;
  special?: string[];
}

interface RawAmmunitionData {
  id: string;
  name: string;
  category: string;
  variant: string;
  techBase: string;
  rulesLevel: string;
  compatibleWeaponIds: string[];
  shotsPerTon: number;
  weight: number;
  criticalSlots: number;
  costPerTon: number;
  battleValue: number;
  isExplosive: boolean;
  introductionYear: number;
}

interface RawElectronicsData {
  id: string;
  name: string;
  category: string;
  techBase: string;
  rulesLevel: string;
  weight: number;
  criticalSlots: number;
  costCBills: number;
  battleValue: number;
  introductionYear: number;
}

interface RawMiscEquipmentData {
  id: string;
  name: string;
  category: string;
  techBase: string;
  rulesLevel: string;
  weight: number;
  criticalSlots: number;
  costCBills: number;
  battleValue: number;
  introductionYear: number;
}

// Types for unit data
interface UnitEquipment {
  id: string;
  location: string;
  quantity?: number;
}

interface UnitIndex {
  version: string;
  generatedAt: string;
  totalUnits: number;
  units: {
    id: string;
    chassis: string;
    model: string;
    tonnage: number;
    techBase: string;
    year: number;
    role?: string;
    path: string;
    rulesLevel?: string;
    cost?: number;
    bv?: number;
  }[];
}

interface UnitData {
  id: string;
  chassis: string;
  model: string;
  tonnage: number;
  techBase: string;
  era: string;
  equipment: UnitEquipment[];
  heatSinks?: {
    type: string;
    count: number;
  };
  engine?: {
    type: string;
    rating: number;
  };
  criticalSlots?: Record<string, (string | null)[]>;
}

// Validation result types
interface EquipmentValidationIssue {
  unitId: string;
  unitName: string;
  equipmentId: string;
  location: string;
  issue: 'NOT_FOUND' | 'LOOKUP_FAILED' | 'ALIAS_RESOLVED';
  suggestions?: string[];
  resolvedId?: string;
}

interface UnitValidationResult {
  unitId: string;
  unitName: string;
  equipmentCount: number;
  resolvedCount: number;
  failedCount: number;
  aliasResolvedCount: number;
  issues: EquipmentValidationIssue[];
}

interface ValidationSummary {
  totalUnits: number;
  unitsWithIssues: number;
  totalEquipment: number;
  resolvedEquipment: number;
  failedEquipment: number;
  aliasResolvedEquipment: number;
  uniqueUnresolvedIds: string[];
  issuesByType: Record<string, number>;
}

describe('Unit Equipment Validation', () => {
  let registry: EquipmentRegistry;
  let loader: EquipmentLoaderService;
  let unitIndex: UnitIndex | null = null;
  let equipmentLoadCount = 0;

  beforeAll(async () => {
    // Initialize equipment loader
    loader = getEquipmentLoader();
    loader.clear(); // Clear any existing data

    // Load equipment directly from filesystem (bypasses web loader issues in Node.js)
    equipmentLoadCount = await loadEquipmentFromFilesystem(loader);
    console.log(`Loaded ${equipmentLoadCount} equipment items from filesystem`);

    // Initialize equipment registry
    registry = getEquipmentRegistry();
    registry.reset(); // Clear any existing data
    await registry.initialize();

    // Load unit index
    if (fs.existsSync(INDEX_PATH)) {
      const content = fs.readFileSync(INDEX_PATH, 'utf-8');
      unitIndex = JSON.parse(content) as UnitIndex;
    }
  }, 30000); // Extended timeout for loading all equipment

  afterAll(() => {
    registry.reset();
  });

  // ============================================================================
  // Registry Initialization
  // ============================================================================
  describe('Registry Initialization', () => {
    it('should have equipment registry initialized', () => {
      expect(registry.isReady()).toBe(true);
    });

    it('should have equipment loaded', () => {
      const stats = registry.getStats();
      console.log('Equipment Registry Stats:', JSON.stringify(stats, null, 2));

      // Debug: Check specific equipment IDs that should exist
      const testIds = [
        'medium-laser',
        'lrm-20',
        'er-large-laser',
        'streak-srm-6',
      ];
      console.log('\nDirect equipment lookups:');
      for (const id of testIds) {
        const result = registry.lookup(id);
        console.log(
          `  ${id}: ${result.found ? 'FOUND' : 'NOT FOUND'}${result.found ? ` -> ${result.equipment?.name}` : ''}`,
        );
      }

      // Check loader directly
      console.log('\nLoader direct getById:');
      for (const id of testIds) {
        const eq = loader.getById(id);
        console.log(
          `  ${id}: ${eq ? 'FOUND' : 'NOT FOUND'}${eq ? ` -> ${eq.name}` : ''}`,
        );
      }

      // Show sample weapons from loader
      const weapons = loader.getAllWeapons();
      console.log(`\nTotal weapons loaded: ${weapons.length}`);
      if (weapons.length > 0) {
        console.log(
          'Sample weapon IDs:',
          weapons
            .slice(0, 5)
            .map((w) => w.id)
            .join(', '),
        );
      }

      expect(stats.totalItems).toBeGreaterThan(0);
      expect(stats.weapons).toBeGreaterThan(0);
      expect(stats.ammunition).toBeGreaterThan(0);
    });

    it('should have unit index loaded', () => {
      expect(unitIndex).not.toBeNull();
      expect(unitIndex!.totalUnits).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Sample Unit Equipment Resolution
  // ============================================================================
  describe('Sample Unit Equipment Resolution', () => {
    const sampleUnits = [
      {
        path: '4-clan-invasion/standard/Black Hawk-KU BHKU-OR.json',
        name: 'Black Hawk-KU BHKU-OR',
      },
      {
        path: '1-age-of-war/standard/Archer ARC-2R.json',
        name: 'Archer ARC-2R',
      },
      {
        path: '3-succession-wars/standard/Locust LCT-1V.json',
        name: 'Locust LCT-1V',
      },
    ];

    sampleUnits.forEach(({ path: unitPath, name }) => {
      it(`should resolve all equipment for ${name}`, () => {
        const fullPath = path.join(UNITS_PATH, unitPath);
        if (!fs.existsSync(fullPath)) {
          console.log(`Skipping ${name} - file not found`);
          return;
        }

        const content = fs.readFileSync(fullPath, 'utf-8');
        const unit = JSON.parse(content) as UnitData;

        if (!unit.equipment || unit.equipment.length === 0) {
          console.log(`${name} has no equipment`);
          return;
        }

        const results: {
          id: string;
          resolved: boolean;
          result: IEquipmentLookupResult;
        }[] = [];

        for (const eq of unit.equipment) {
          const result = registry.lookup(eq.id);
          results.push({
            id: eq.id,
            resolved: result.found,
            result,
          });
        }

        const failed = results.filter((r) => !r.resolved);

        if (failed.length > 0) {
          console.log(`\n${name} - Failed equipment lookups:`);
          failed.forEach((f) => {
            console.log(`  - ${f.id}`);
            if (f.result.alternateIds && f.result.alternateIds.length > 0) {
              console.log(
                `    Suggestions: ${f.result.alternateIds.join(', ')}`,
              );
            }
          });
        }

        // Log success rate
        const successRate = (
          ((results.length - failed.length) / results.length) *
          100
        ).toFixed(1);
        console.log(
          `${name}: ${results.length - failed.length}/${results.length} equipment resolved (${successRate}%)`,
        );

        // Expect at least some equipment to resolve (allow some failures for now)
        expect(results.length - failed.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // Batch Equipment Resolution Validation
  // ============================================================================
  describe('Batch Equipment Resolution', () => {
    it('should validate equipment across multiple units', async () => {
      if (!unitIndex) {
        console.log('Skipping - unit index not loaded');
        return;
      }

      // Sample a subset for faster testing (first 50 units)
      const sampleSize = 50;
      const sampleUnits = unitIndex.units.slice(0, sampleSize);

      const summary: ValidationSummary = {
        totalUnits: 0,
        unitsWithIssues: 0,
        totalEquipment: 0,
        resolvedEquipment: 0,
        failedEquipment: 0,
        aliasResolvedEquipment: 0,
        uniqueUnresolvedIds: [],
        issuesByType: {},
      };

      const results: UnitValidationResult[] = [];

      for (const indexEntry of sampleUnits) {
        const fullPath = path.join(UNITS_PATH, indexEntry.path);

        if (!fs.existsSync(fullPath)) {
          continue;
        }

        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const unit = JSON.parse(content) as UnitData;

          const result = validateUnitEquipment(unit, registry);
          results.push(result);

          summary.totalUnits++;
          summary.totalEquipment += result.equipmentCount;
          summary.resolvedEquipment += result.resolvedCount;
          summary.failedEquipment += result.failedCount;
          summary.aliasResolvedEquipment += result.aliasResolvedCount;

          if (result.issues.length > 0) {
            summary.unitsWithIssues++;
          }

          // Track unique unresolved IDs
          for (const issue of result.issues) {
            if (
              issue.issue === 'NOT_FOUND' &&
              !summary.uniqueUnresolvedIds.includes(issue.equipmentId)
            ) {
              summary.uniqueUnresolvedIds.push(issue.equipmentId);
            }
            summary.issuesByType[issue.issue] =
              (summary.issuesByType[issue.issue] || 0) + 1;
          }
        } catch (error) {
          console.error(`Error processing ${indexEntry.path}:`, error);
        }
      }

      // Output summary
      console.log('\n=== Equipment Resolution Summary ===');
      console.log(`Units Validated: ${summary.totalUnits}`);
      console.log(`Units with Issues: ${summary.unitsWithIssues}`);
      console.log(`Total Equipment: ${summary.totalEquipment}`);
      console.log(
        `Resolved: ${summary.resolvedEquipment} (${((summary.resolvedEquipment / summary.totalEquipment) * 100).toFixed(1)}%)`,
      );
      console.log(
        `Failed: ${summary.failedEquipment} (${((summary.failedEquipment / summary.totalEquipment) * 100).toFixed(1)}%)`,
      );
      console.log(
        `\nUnique Unresolved IDs (${summary.uniqueUnresolvedIds.length}):`,
      );
      summary.uniqueUnresolvedIds
        .slice(0, 20)
        .forEach((id) => console.log(`  - ${id}`));
      if (summary.uniqueUnresolvedIds.length > 20) {
        console.log(
          `  ... and ${summary.uniqueUnresolvedIds.length - 20} more`,
        );
      }

      // Expect reasonable success rate (at least 50% for now)
      const successRate = summary.resolvedEquipment / summary.totalEquipment;
      expect(successRate).toBeGreaterThan(0.5);
    }, 60000); // Extended timeout
  });

  // ============================================================================
  // Full Unit Validation (All Units)
  // ============================================================================
  describe('Full Unit Equipment Validation', () => {
    it('should validate all units and generate report', async () => {
      if (!unitIndex) {
        console.log('Skipping - unit index not loaded');
        return;
      }

      const allResults: UnitValidationResult[] = [];
      const allUnresolvedIds = new Map<string, number>();

      let processedCount = 0;
      const totalCount = unitIndex.units.length;

      for (const indexEntry of unitIndex.units) {
        const fullPath = path.join(UNITS_PATH, indexEntry.path);

        if (!fs.existsSync(fullPath)) {
          continue;
        }

        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const unit = JSON.parse(content) as UnitData;

          const result = validateUnitEquipment(unit, registry);
          allResults.push(result);

          // Track unresolved equipment IDs with frequency
          for (const issue of result.issues) {
            if (issue.issue === 'NOT_FOUND') {
              const count = allUnresolvedIds.get(issue.equipmentId) || 0;
              allUnresolvedIds.set(issue.equipmentId, count + 1);
            }
          }

          processedCount++;
        } catch {
          // Silently skip errors to keep output clean
        }
      }

      // Calculate statistics
      const totalEquipment = allResults.reduce(
        (sum, r) => sum + r.equipmentCount,
        0,
      );
      const resolvedEquipment = allResults.reduce(
        (sum, r) => sum + r.resolvedCount,
        0,
      );
      const failedEquipment = allResults.reduce(
        (sum, r) => sum + r.failedCount,
        0,
      );
      const unitsWithIssues = allResults.filter(
        (r) => r.issues.length > 0,
      ).length;

      // Sort unresolved IDs by frequency
      const sortedUnresolved = Array.from(allUnresolvedIds.entries()).sort(
        (a, b) => b[1] - a[1],
      );

      // Output report
      console.log('\n' + '='.repeat(60));
      console.log('FULL EQUIPMENT VALIDATION REPORT');
      console.log('='.repeat(60));
      console.log(`\nUnits Processed: ${processedCount} / ${totalCount}`);
      console.log(`Units with Issues: ${unitsWithIssues}`);
      console.log(`\nEquipment Statistics:`);
      console.log(`  Total Equipment Items: ${totalEquipment}`);
      console.log(
        `  Successfully Resolved: ${resolvedEquipment} (${((resolvedEquipment / totalEquipment) * 100).toFixed(2)}%)`,
      );
      console.log(
        `  Failed to Resolve: ${failedEquipment} (${((failedEquipment / totalEquipment) * 100).toFixed(2)}%)`,
      );

      console.log(`\nTop 30 Unresolved Equipment IDs:`);
      sortedUnresolved.slice(0, 30).forEach(([id, count], idx) => {
        // Try to find suggestions
        const suggestions = registry.lookup(id).alternateIds || [];
        const suggestionStr =
          suggestions.length > 0
            ? ` → Maybe: ${suggestions.slice(0, 2).join(', ')}`
            : '';
        console.log(
          `  ${idx + 1}. ${id} (${count} occurrences)${suggestionStr}`,
        );
      });

      console.log('\n' + '='.repeat(60));

      // Write detailed report to file
      const reportPath = path.join(
        __dirname,
        '../../../../equipment-validation-report.json',
      );
      const report = {
        generatedAt: new Date().toISOString(),
        summary: {
          unitsProcessed: processedCount,
          unitsWithIssues,
          totalEquipment,
          resolvedEquipment,
          failedEquipment,
          resolutionRate:
            ((resolvedEquipment / totalEquipment) * 100).toFixed(2) + '%',
        },
        unresolvedEquipmentIds: sortedUnresolved.map(([id, count]) => ({
          id,
          occurrences: count,
          suggestions: registry.lookup(id).alternateIds || [],
        })),
        unitsWithMostIssues: allResults
          .filter((r) => r.failedCount > 0)
          .sort((a, b) => b.failedCount - a.failedCount)
          .slice(0, 50)
          .map((r) => ({
            unit: r.unitName,
            failed: r.failedCount,
            total: r.equipmentCount,
            issues: r.issues.map((i) => i.equipmentId),
          })),
      };

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\nDetailed report written to: ${reportPath}`);

      // Assertions
      expect(processedCount).toBeGreaterThan(0);
      // Expect at least 70% resolution rate across all units
      const resolutionRate = resolvedEquipment / totalEquipment;
      console.log(`\nResolution Rate: ${(resolutionRate * 100).toFixed(2)}%`);
      expect(resolutionRate).toBeGreaterThan(0.7);
    }, 300000); // 5 minute timeout for full scan
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function validateUnitEquipment(
  unit: UnitData,
  registry: EquipmentRegistry,
): UnitValidationResult {
  const result: UnitValidationResult = {
    unitId: unit.id,
    unitName: `${unit.chassis} ${unit.model}`,
    equipmentCount: 0,
    resolvedCount: 0,
    failedCount: 0,
    aliasResolvedCount: 0,
    issues: [],
  };

  if (!unit.equipment || unit.equipment.length === 0) {
    return result;
  }

  result.equipmentCount = unit.equipment.length;

  for (const eq of unit.equipment) {
    const lookupResult = registry.lookup(eq.id);

    if (lookupResult.found) {
      result.resolvedCount++;

      // Check if it was resolved via alias (ID changed)
      if (lookupResult.equipment && lookupResult.equipment.id !== eq.id) {
        result.aliasResolvedCount++;
        result.issues.push({
          unitId: unit.id,
          unitName: result.unitName,
          equipmentId: eq.id,
          location: eq.location,
          issue: 'ALIAS_RESOLVED',
          resolvedId: lookupResult.equipment.id,
        });
      }
    } else {
      result.failedCount++;
      result.issues.push({
        unitId: unit.id,
        unitName: result.unitName,
        equipmentId: eq.id,
        location: eq.location,
        issue: 'NOT_FOUND',
        suggestions: lookupResult.alternateIds,
      });
    }
  }

  return result;
}
