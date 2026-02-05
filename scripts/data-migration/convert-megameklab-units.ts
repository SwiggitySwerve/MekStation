#!/usr/bin/env ts-node
/**
 * MegaMekLab Unit Conversion Script
 *
 * Converts all MegaMekLab JSON files to the internal serialized format.
 * Generates converted unit files and a search index.
 *
 * Usage:
 *   npx ts-node scripts/data-migration/convert-megameklab-units.ts [options]
 *
 * Options:
 *   --source <path>   Source directory (default: data/megameklab_converted_output/mekfiles)
 *   --output <path>   Output directory (default: public/data/units)
 *   --type <type>     Unit type to convert (meks, vehicles, etc.) (default: all)
 *   --limit <n>       Limit number of files to process (for testing)
 *   --dry-run         Don't write output files
 *   --verbose         Show detailed output
 *
 * @spec unit-json.plan.md
 */

import * as fs from 'fs';
import * as path from 'path';

// Type imports (relative path since we're in scripts/)
type TechBase =
  | 'Inner Sphere'
  | 'Clan'
  | 'Mixed'
  | 'Mixed (IS Chassis)'
  | 'Mixed (Clan Chassis)';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface ConversionConfig {
  sourceDir: string;
  outputDir: string;
  unitTypes: string[];
  limit?: number;
  dryRun: boolean;
  verbose: boolean;
}

const DEFAULT_CONFIG: ConversionConfig = {
  sourceDir: 'data/megameklab_converted_output/mekfiles',
  outputDir: 'public/data/units',
  unitTypes: ['meks'], // Start with BattleMechs only
  limit: undefined,
  dryRun: false,
  verbose: false,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function parseArgs(): ConversionConfig {
  const config = { ...DEFAULT_CONFIG };
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--source':
        config.sourceDir = args[++i];
        break;
      case '--output':
        config.outputDir = args[++i];
        break;
      case '--type':
        config.unitTypes = [args[++i]];
        break;
      case '--all-types':
        config.unitTypes = [
          'meks',
          'vehicles',
          'battlearmor',
          'infantry',
          'fighters',
          'protomeks',
        ];
        break;
      case '--limit':
        config.limit = parseInt(args[++i], 10);
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
    }
  }

  return config;
}

function printHelp(): void {
  console.log(`
MegaMekLab Unit Conversion Script

Usage:
  npx ts-node scripts/data-migration/convert-megameklab-units.ts [options]

Options:
  --source <path>   Source directory (default: data/megameklab_converted_output/mekfiles)
  --output <path>   Output directory (default: public/data/units)
  --type <type>     Unit type to convert: meks, vehicles, battlearmor, etc.
  --all-types       Convert all unit types
  --limit <n>       Limit number of files to process (for testing)
  --dry-run         Don't write output files
  --verbose         Show detailed output
  --help            Show this help message

Examples:
  # Convert all mechs
  npx ts-node scripts/data-migration/convert-megameklab-units.ts

  # Convert with limit for testing
  npx ts-node scripts/data-migration/convert-megameklab-units.ts --limit 10 --verbose

  # Dry run to check for errors
  npx ts-node scripts/data-migration/convert-megameklab-units.ts --dry-run --verbose
`);
}

function log(config: ConversionConfig, message: string): void {
  if (config.verbose) {
    console.log(message);
  }
}

function findJsonFiles(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      findJsonFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ============================================================================
// SIMPLIFIED INLINE CONVERTER (avoids module resolution issues in scripts)
// ============================================================================

interface SourceUnit {
  chassis: string;
  model: string;
  mul_id: string | number;
  config: string;
  tech_base: string;
  era: string | number;
  source: string;
  rules_level: string | number;
  role?: string;
  mass: number;
  engine: { type: string; rating: number };
  structure: { type: string };
  heat_sinks: { type: string; count: number };
  walk_mp: string | number;
  jump_mp: string | number;
  armor: {
    type: string;
    locations: Array<{ location: string; armor_points: number }>;
  };
  weapons_and_equipment: Array<{
    item_name: string;
    location: string;
    item_type: string;
    tech_base: string;
  }>;
  criticals: Array<{ location: string; slots: string[] }>;
  quirks?: string[];
  is_omnimech?: boolean;
  omnimech_configuration?: string;
  clanname?: string;
  fluff_text?: {
    overview?: string;
    capabilities?: string;
    history?: string;
    deployment?: string;
  };
}

interface ConvertedUnit {
  id: string;
  chassis: string;
  model: string;
  variant?: string;
  unitType: string;
  configuration: string;
  techBase: string;
  rulesLevel: string;
  era: string;
  year: number;
  tonnage: number;
  engine: { type: string; rating: number };
  structure: { type: string };
  armor: { type: string; allocation: Record<string, unknown> };
  heatSinks: { type: string; count: number };
  movement: { walk: number; jump: number };
  equipment: Array<{ id: string; location: string }>;
  criticalSlots: Record<string, (string | null)[]>;
  quirks?: string[];
  fluff?: Record<string, unknown>;
}

interface IndexEntry {
  id: string;
  name: string;
  chassis: string;
  variant: string;
  tonnage: number;
  techBase: string;
  era: string;
  weightClass: string;
  unitType: string;
  filePath: string;
}

// Simplified mappings
const TECH_BASE_MAP: Record<string, string> = {
  'Inner Sphere': 'Inner Sphere',
  IS: 'Inner Sphere',
  Clan: 'Clan',
  Mixed: 'Mixed',
  'Mixed (IS Chassis)': 'Mixed (IS Chassis)',
  'Mixed (Clan Chassis)': 'Mixed (Clan Chassis)',
};

const RULES_LEVEL_MAP: Record<string, string> = {
  '1': 'Introductory',
  '2': 'Standard',
  '3': 'Advanced',
  '4': 'Experimental',
};

function getEraForYear(year: number): string {
  if (year < 2005) return 'Early Spaceflight';
  if (year <= 2570) return 'Age of War';
  if (year <= 2780) return 'Star League';
  if (year <= 3049) return 'Succession Wars';
  if (year <= 3067) return 'Clan Invasion';
  if (year <= 3080) return 'Civil War';
  if (year <= 3151) return 'Dark Age';
  return 'ilClan';
}

function getWeightClass(tonnage: number): string {
  if (tonnage < 20) return 'Ultralight';
  if (tonnage <= 35) return 'Light';
  if (tonnage <= 55) return 'Medium';
  if (tonnage <= 75) return 'Heavy';
  if (tonnage <= 100) return 'Assault';
  return 'Super Heavy';
}

function mapConfiguration(config: string): string {
  const lower = config.toLowerCase();
  if (lower.includes('quad') && lower.includes('vee')) return 'QuadVee';
  if (lower.includes('quad')) return 'Quad';
  if (lower.includes('tripod')) return 'Tripod';
  if (lower.includes('lam')) return 'LAM';
  return 'Biped';
}

function normalizeLocation(loc: string): string {
  const map: Record<string, string> = {
    Head: 'Head',
    HD: 'Head',
    H: 'Head',
    'Center Torso': 'Center Torso',
    CT: 'Center Torso',
    'Left Torso': 'Left Torso',
    LT: 'Left Torso',
    'Right Torso': 'Right Torso',
    RT: 'Right Torso',
    'Left Arm': 'Left Arm',
    LA: 'Left Arm',
    'Right Arm': 'Right Arm',
    RA: 'Right Arm',
    'Left Leg': 'Left Leg',
    LL: 'Left Leg',
    'Right Leg': 'Right Leg',
    RL: 'Right Leg',
  };
  return map[loc] || loc;
}

// Critical slot counts per location for biped mechs
const SLOT_COUNTS: Record<string, number> = {
  Head: 6,
  'Center Torso': 12,
  'Left Torso': 12,
  'Right Torso': 12,
  'Left Arm': 12,
  'Right Arm': 12,
  'Left Leg': 6,
  'Right Leg': 6,
};

// Order of locations in MegaMekLab's combined criticals array
// Each location is padded to 12 slots regardless of actual capacity
const LOCATION_ORDER = [
  'Head',
  'Left Leg',
  'Right Leg',
  'Left Arm',
  'Right Arm',
  'Left Torso',
  'Right Torso',
  'Center Torso',
];

const PADDED_SLOT_COUNT = 12;

/**
 * Parse and split critical slots from MegaMekLab's combined format
 * The converter outputs all slots concatenated into a single "Head" entry
 * with each location padded to 12 slots
 */
function parseCriticalSlots(
  criticals: Array<{ location: string; slots: string[] }>,
): Record<string, (string | null)[]> {
  const result: Record<string, (string | null)[]> = {};

  // Check if we have properly separated location entries (8 locations for biped)
  if (criticals.length >= 8) {
    for (const crit of criticals) {
      const loc = normalizeLocation(crit.location);
      const slotCount = SLOT_COUNTS[loc] || 12;
      result[loc] = crit.slots
        .slice(0, slotCount)
        .map((s) => (s === '-Empty-' ? null : s));
    }
    return result;
  }

  // Handle combined format - all slots concatenated into one entry
  if (criticals.length === 1 && criticals[0].slots.length > 12) {
    const allSlots = criticals[0].slots;
    let offset = 0;

    for (const location of LOCATION_ORDER) {
      const actualSlotCount = SLOT_COUNTS[location];
      const locationSlots = allSlots.slice(offset, offset + actualSlotCount);

      if (locationSlots.length > 0) {
        result[location] = locationSlots.map((s) =>
          s === '-Empty-' ? null : s,
        );
      }

      // Advance by padded amount (12) not actual count
      offset += PADDED_SLOT_COUNT;
    }

    return result;
  }

  // Fallback: process as-is
  for (const crit of criticals) {
    const loc = normalizeLocation(crit.location);
    result[loc] = crit.slots.map((s) => (s === '-Empty-' ? null : s));
  }

  return result;
}

function generateEquipmentId(itemType: string, itemName: string): string {
  // Simple kebab-case conversion
  return itemType
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/--+/g, '-');
}

function convertUnit(source: SourceUnit): ConvertedUnit {
  const id = source.mul_id
    ? `mul-${source.mul_id}`
    : `${source.chassis}-${source.model}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');

  const techBase = TECH_BASE_MAP[source.tech_base] || 'Inner Sphere';
  const year =
    typeof source.era === 'number'
      ? source.era
      : parseInt(String(source.era), 10) || 3025;
  const era = getEraForYear(year);
  const rulesLevel = RULES_LEVEL_MAP[String(source.rules_level)] || 'Standard';
  const isOmni =
    source.is_omnimech || source.config.toLowerCase().includes('omni');

  // Convert armor locations
  const armorAllocation: Record<string, unknown> = {};
  for (const loc of source.armor.locations) {
    const normalized = normalizeLocation(loc.location);
    if (normalized.includes('Rear')) {
      // Handle rear armor
      const base = normalized.replace(' (Rear)', '');
      const key = base.replace(/ /g, '').replace('Torso', 'Torso');
      armorAllocation[key.charAt(0).toLowerCase() + key.slice(1) + 'Rear'] =
        loc.armor_points;
    } else {
      const key = normalized.replace(/ /g, '');
      armorAllocation[key.charAt(0).toLowerCase() + key.slice(1)] =
        loc.armor_points;
    }
  }

  // Convert equipment
  const equipment: Array<{ id: string; location: string }> = [];
  for (const item of source.weapons_and_equipment) {
    equipment.push({
      id: generateEquipmentId(item.item_type, item.item_name),
      location: normalizeLocation(item.location),
    });
  }

  // Convert criticals using the parser that handles combined format
  const criticalSlots = parseCriticalSlots(source.criticals);

  return {
    id,
    chassis: source.chassis,
    model: source.model,
    variant: source.clanname || source.omnimech_configuration,
    unitType: isOmni ? 'OmniMech' : 'BattleMech',
    configuration: mapConfiguration(source.config),
    techBase,
    rulesLevel,
    era,
    year,
    tonnage: source.mass,
    engine: {
      type: source.engine.type,
      rating: source.engine.rating,
    },
    structure: {
      type: source.structure.type,
    },
    armor: {
      type: source.armor.type,
      allocation: armorAllocation,
    },
    heatSinks: {
      type: source.heat_sinks.type,
      count: source.heat_sinks.count,
    },
    movement: {
      walk: parseInt(String(source.walk_mp), 10) || 0,
      jump: parseInt(String(source.jump_mp), 10) || 0,
    },
    equipment,
    criticalSlots,
    quirks: source.quirks,
    fluff: source.fluff_text ? { ...source.fluff_text } : undefined,
  };
}

// ============================================================================
// MAIN CONVERSION LOGIC
// ============================================================================

interface ConversionStats {
  total: number;
  successful: number;
  failed: number;
  warnings: number;
  validationErrors: number;
  errors: string[];
}

async function main(): Promise<void> {
  const config = parseArgs();

  console.log('========================================');
  console.log('MegaMekLab Unit Conversion Script');
  console.log('========================================');
  console.log(`Source: ${config.sourceDir}`);
  console.log(`Output: ${config.outputDir}`);
  console.log(`Types: ${config.unitTypes.join(', ')}`);
  if (config.limit) console.log(`Limit: ${config.limit}`);
  if (config.dryRun) console.log('Mode: DRY RUN');
  console.log('');

  const stats: ConversionStats = {
    total: 0,
    successful: 0,
    failed: 0,
    warnings: 0,
    validationErrors: 0,
    errors: [],
  };

  const indexEntries: IndexEntry[] = [];

  for (const unitType of config.unitTypes) {
    const typeDir = path.join(config.sourceDir, unitType);

    if (!fs.existsSync(typeDir)) {
      console.log(`Skipping ${unitType}: directory not found`);
      continue;
    }

    console.log(`Processing ${unitType}...`);

    const jsonFiles = findJsonFiles(typeDir);
    let filesToProcess = jsonFiles;

    if (config.limit) {
      filesToProcess = jsonFiles.slice(0, config.limit);
    }

    console.log(
      `  Found ${jsonFiles.length} files, processing ${filesToProcess.length}`,
    );

    for (const filePath of filesToProcess) {
      stats.total++;

      try {
        log(config, `  Converting: ${path.basename(filePath)}`);

        const content = fs.readFileSync(filePath, 'utf-8');
        const source: SourceUnit = JSON.parse(content);

        const converted = convertUnit(source);

        // Generate output path
        const relativePath = path.relative(config.sourceDir, filePath);
        const outputPath = path.join(config.outputDir, relativePath);
        const outputDir = path.dirname(outputPath);

        // Create index entry
        const indexEntry: IndexEntry = {
          id: converted.id,
          name: `${converted.chassis} ${converted.model}`,
          chassis: converted.chassis,
          variant: converted.model,
          tonnage: converted.tonnage,
          techBase: converted.techBase,
          era: converted.era,
          weightClass: getWeightClass(converted.tonnage),
          unitType: converted.unitType,
          filePath: relativePath.replace(/\\/g, '/'),
        };
        indexEntries.push(indexEntry);

        if (!config.dryRun) {
          ensureDir(outputDir);
          fs.writeFileSync(outputPath, JSON.stringify(converted, null, 2));
        }

        stats.successful++;
      } catch (error) {
        stats.failed++;
        const errorMsg = `${path.basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`;
        stats.errors.push(errorMsg);

        if (config.verbose) {
          console.error(`  ERROR: ${errorMsg}`);
        }
      }
    }
  }

  // Write index file
  if (!config.dryRun && indexEntries.length > 0) {
    ensureDir(config.outputDir);
    const indexPath = path.join(config.outputDir, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(indexEntries, null, 2));
    console.log(`\nWrote index file: ${indexPath}`);
  }

  // Print summary
  console.log('\n========================================');
  console.log('Conversion Complete');
  console.log('========================================');
  console.log(`Total files: ${stats.total}`);
  console.log(`Successful: ${stats.successful}`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Validation issues: ${stats.validationErrors}`);

  if (stats.errors.length > 0) {
    console.log('\nErrors:');
    for (const error of stats.errors.slice(0, 10)) {
      console.log(`  - ${error}`);
    }
    if (stats.errors.length > 10) {
      console.log(`  ... and ${stats.errors.length - 10} more`);
    }
  }

  // Exit with error code if there were failures
  if (stats.failed > 0) {
    process.exit(1);
  }
}

// Run main
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
