#!/usr/bin/env ts-node
/**
 * Add rulesLevel to existing index.json
 *
 * Reads each unit file and adds rulesLevel to the index entries.
 *
 * Usage:
 *   npx ts-node scripts/data-migration/add-rules-level-to-index.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const INDEX_PATH = 'public/data/units/battlemechs/index.json';
const UNITS_DIR = 'public/data/units/battlemechs';

interface IndexEntry {
  id: string;
  chassis: string;
  model: string;
  tonnage: number;
  techBase: string;
  year: number;
  role: string;
  rulesLevel?: string;
  path: string;
}

interface IndexFile {
  version: string;
  generatedAt: string;
  totalUnits: number;
  units: IndexEntry[];
}

async function main(): Promise<void> {
  console.log('Adding rulesLevel to index.json...\n');

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
      const unit = JSON.parse(unitContent);

      // Add rulesLevel
      if (unit.rulesLevel) {
        entry.rulesLevel = unit.rulesLevel;
        updated++;
      } else {
        console.warn(`No rulesLevel in: ${entry.path}`);
      }
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
  console.log('Index Update Complete');
  console.log('========================================');
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  console.log(`Output: ${INDEX_PATH}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
