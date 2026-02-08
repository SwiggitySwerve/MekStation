/**
 * Split energy.json and miscellaneous.json into smaller sub-type files.
 *
 * Energy weapons (36 items) → split by subType:
 *   - energy-laser.json (all laser variants)
 *   - energy-ppc.json (PPC variants)
 *   - energy-other.json (flamer, plasma, taser, AMS, etc.)
 *
 * Miscellaneous (321 items) → split by category field:
 *   - miscellaneous/heat-sinks.json
 *   - miscellaneous/jump-jets.json
 *   - miscellaneous/movement.json
 *   - miscellaneous/myomer.json
 *   - miscellaneous/defensive.json
 *   - miscellaneous/other.json (the 298 generic "Miscellaneous" category items)
 */

import * as fs from 'fs';
import * as path from 'path';

const OFFICIAL_PATH = path.resolve(__dirname, '../../public/data/equipment/official');

interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  subType?: string;
  [key: string]: unknown;
}

interface EquipmentFile {
  $schema?: string;
  version?: string;
  generatedAt?: string;
  count: number;
  items: EquipmentItem[];
}

function writeEquipmentFile(filePath: string, items: EquipmentItem[], schema: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const data: EquipmentFile = {
    $schema: schema,
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    count: items.length,
    items,
  };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`  Wrote ${filePath} (${items.length} items)`);
}

// ============================================================================
// Split energy.json
// ============================================================================
function splitEnergy(): void {
  console.log('\n=== Splitting energy.json ===');
  const energyPath = path.join(OFFICIAL_PATH, 'weapons', 'energy.json');
  const raw = JSON.parse(fs.readFileSync(energyPath, 'utf-8')) as EquipmentFile;
  const items = raw.items;
  console.log(`  Source: ${items.length} items`);

  const laserSubTypes = [
    'Laser', 'ER Laser', 'Pulse Laser', 'ER Pulse Laser',
    'X-Pulse Laser', 'Variable Speed Pulse Laser',
    'Heavy Laser', 'Improved Heavy Laser', 'Chemical Laser',
  ];
  const ppcSubTypes = ['PPC'];

  const lasers: EquipmentItem[] = [];
  const ppcs: EquipmentItem[] = [];
  const other: EquipmentItem[] = [];

  for (const item of items) {
    const st = item.subType || '';
    if (laserSubTypes.includes(st)) {
      lasers.push(item);
    } else if (ppcSubTypes.includes(st)) {
      ppcs.push(item);
    } else {
      other.push(item);
    }
  }

  const schema = '../../_schema/weapon-schema.json';
  writeEquipmentFile(path.join(OFFICIAL_PATH, 'weapons', 'energy-laser.json'), lasers, schema);
  writeEquipmentFile(path.join(OFFICIAL_PATH, 'weapons', 'energy-ppc.json'), ppcs, schema);
  writeEquipmentFile(path.join(OFFICIAL_PATH, 'weapons', 'energy-other.json'), other, schema);

  const total = lasers.length + ppcs.length + other.length;
  console.log(`  Total: ${total} (source: ${items.length})`);
  if (total !== items.length) {
    console.error('  ERROR: Item count mismatch!');
    process.exit(1);
  }
}

// ============================================================================
// Split miscellaneous.json
// ============================================================================
function splitMiscellaneous(): void {
  console.log('\n=== Splitting miscellaneous.json ===');
  const miscPath = path.join(OFFICIAL_PATH, 'miscellaneous.json');
  const raw = JSON.parse(fs.readFileSync(miscPath, 'utf-8')) as EquipmentFile;
  const items = raw.items;
  console.log(`  Source: ${items.length} items`);

  const buckets: Record<string, EquipmentItem[]> = {
    'heat-sinks': [],
    'jump-jets': [],
    'movement': [],
    'myomer': [],
    'defensive': [],
    'other': [],
  };

  const categoryMap: Record<string, string> = {
    'Heat Sink': 'heat-sinks',
    'Jump Jet': 'jump-jets',
    'Movement Enhancement': 'movement',
    'Myomer': 'myomer',
    'Defensive': 'defensive',
  };

  for (const item of items) {
    const bucket = categoryMap[item.category] || 'other';
    buckets[bucket].push(item);
  }

  const schema = '../../_schema/misc-equipment-schema.json';
  for (const [name, bucketItems] of Object.entries(buckets)) {
    writeEquipmentFile(
      path.join(OFFICIAL_PATH, 'miscellaneous', `${name}.json`),
      bucketItems,
      schema,
    );
  }

  const total = Object.values(buckets).reduce((sum, b) => sum + b.length, 0);
  console.log(`  Total: ${total} (source: ${items.length})`);
  if (total !== items.length) {
    console.error('  ERROR: Item count mismatch!');
    process.exit(1);
  }
}

// ============================================================================
// Update index.json
// ============================================================================
function updateIndex(): void {
  console.log('\n=== Updating index.json ===');
  const indexPath = path.join(OFFICIAL_PATH, 'index.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

  // Update weapons: replace "energy" with split files
  delete index.files.weapons['energy'];
  index.files.weapons['energy-laser'] = 'weapons/energy-laser.json';
  index.files.weapons['energy-ppc'] = 'weapons/energy-ppc.json';
  index.files.weapons['energy-other'] = 'weapons/energy-other.json';

  // Update miscellaneous: replace single file with split files
  index.files.miscellaneous = {
    'heat-sinks': 'miscellaneous/heat-sinks.json',
    'jump-jets': 'miscellaneous/jump-jets.json',
    'movement': 'miscellaneous/movement.json',
    'myomer': 'miscellaneous/myomer.json',
    'defensive': 'miscellaneous/defensive.json',
    'other': 'miscellaneous/other.json',
  };

  index.generatedAt = new Date().toISOString();
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');
  console.log('  Updated index.json');
}

// ============================================================================
// Main
// ============================================================================
splitEnergy();
splitMiscellaneous();
updateIndex();
console.log('\nDone! Now delete the old files and update loader references.');
