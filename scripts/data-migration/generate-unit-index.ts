#!/usr/bin/env ts-node
/**
 * Unit Index Generation Script
 *
 * Generates a search index from converted unit files.
 * Can be run standalone or after conversion to update the index.
 *
 * Usage:
 *   npx ts-node scripts/data-migration/generate-unit-index.ts [options]
 *
 * Options:
 *   --source <path>   Source directory (default: public/data/units)
 *   --output <path>   Output file (default: public/data/units/index.json)
 *   --verbose         Show detailed output
 *
 * @spec unit-json.plan.md
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface IndexConfig {
  sourceDir: string;
  outputFile: string;
  verbose: boolean;
}

const DEFAULT_CONFIG: IndexConfig = {
  sourceDir: 'public/data/units',
  outputFile: 'public/data/units/index.json',
  verbose: false,
};

// ============================================================================
// TYPES
// ============================================================================

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
  armor: { type: string };
  heatSinks: { type: string; count: number };
  movement: { walk: number; jump: number };
  quirks?: string[];
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
  role?: string;
  rulesLevel: string;
  filePath: string;
}

// ============================================================================
// UTILITIES
// ============================================================================

function parseArgs(): IndexConfig {
  const config = { ...DEFAULT_CONFIG };
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--source':
        config.sourceDir = args[++i];
        break;
      case '--output':
        config.outputFile = args[++i];
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
Unit Index Generation Script

Usage:
  npx ts-node scripts/data-migration/generate-unit-index.ts [options]

Options:
  --source <path>   Source directory (default: public/data/units)
  --output <path>   Output file (default: public/data/units/index.json)
  --verbose         Show detailed output
  --help            Show this help message
`);
}

function log(config: IndexConfig, message: string): void {
  if (config.verbose) {
    console.log(message);
  }
}

function findJsonFiles(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findJsonFiles(fullPath, files);
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.json') &&
      entry.name !== 'index.json'
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

function getWeightClass(tonnage: number): string {
  if (tonnage < 20) return 'Ultralight';
  if (tonnage <= 35) return 'Light';
  if (tonnage <= 55) return 'Medium';
  if (tonnage <= 75) return 'Heavy';
  if (tonnage <= 100) return 'Assault';
  return 'Super Heavy';
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  const config = parseArgs();

  console.log('========================================');
  console.log('Unit Index Generation Script');
  console.log('========================================');
  console.log(`Source: ${config.sourceDir}`);
  console.log(`Output: ${config.outputFile}`);
  console.log('');

  if (!fs.existsSync(config.sourceDir)) {
    console.error(`Source directory not found: ${config.sourceDir}`);
    process.exit(1);
  }

  const jsonFiles = findJsonFiles(config.sourceDir);
  console.log(`Found ${jsonFiles.length} unit files\n`);

  const indexEntries: IndexEntry[] = [];
  let errors = 0;

  for (const filePath of jsonFiles) {
    try {
      log(config, `Processing: ${path.basename(filePath)}`);

      const content = fs.readFileSync(filePath, 'utf-8');
      const unit: ConvertedUnit = JSON.parse(content);

      // Calculate relative path from source dir
      const relativePath = path
        .relative(config.sourceDir, filePath)
        .replace(/\\/g, '/');

      const entry: IndexEntry = {
        id: unit.id,
        name: `${unit.chassis} ${unit.model}`,
        chassis: unit.chassis,
        variant: unit.model,
        tonnage: unit.tonnage,
        techBase: unit.techBase,
        era: unit.era,
        weightClass: getWeightClass(unit.tonnage),
        unitType: unit.unitType,
        rulesLevel: unit.rulesLevel,
        filePath: relativePath,
      };

      indexEntries.push(entry);
    } catch (error) {
      errors++;
      console.error(`Error processing ${filePath}: ${error}`);
    }
  }

  // Sort by chassis, then model
  indexEntries.sort((a, b) => {
    const chassisCompare = a.chassis.localeCompare(b.chassis);
    if (chassisCompare !== 0) return chassisCompare;
    return a.variant.localeCompare(b.variant);
  });

  // Write index file
  const outputDir = path.dirname(config.outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(config.outputFile, JSON.stringify(indexEntries, null, 2));

  // Print summary
  console.log('========================================');
  console.log('Index Generation Complete');
  console.log('========================================');
  console.log(`Units indexed: ${indexEntries.length}`);
  console.log(`Errors: ${errors}`);
  console.log(`Output: ${config.outputFile}`);

  // Print stats by weight class
  const byWeightClass: Record<string, number> = {};
  for (const entry of indexEntries) {
    byWeightClass[entry.weightClass] =
      (byWeightClass[entry.weightClass] || 0) + 1;
  }

  console.log('\nBy Weight Class:');
  for (const [weightClass, count] of Object.entries(byWeightClass)) {
    console.log(`  ${weightClass}: ${count}`);
  }

  // Print stats by tech base
  const byTechBase: Record<string, number> = {};
  for (const entry of indexEntries) {
    byTechBase[entry.techBase] = (byTechBase[entry.techBase] || 0) + 1;
  }

  console.log('\nBy Tech Base:');
  for (const [techBase, count] of Object.entries(byTechBase)) {
    console.log(`  ${techBase}: ${count}`);
  }

  // Print stats by era
  const byEra: Record<string, number> = {};
  for (const entry of indexEntries) {
    byEra[entry.era] = (byEra[entry.era] || 0) + 1;
  }

  console.log('\nBy Era:');
  for (const [era, count] of Object.entries(byEra)) {
    console.log(`  ${era}: ${count}`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
