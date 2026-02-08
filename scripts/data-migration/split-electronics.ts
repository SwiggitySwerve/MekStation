/**
 * Split electronics.json into smaller category-based files.
 *
 * electronics.json (40 items) → split by category:
 *   - electronics/ecm.json (ECM)
 *   - electronics/active-probe.json (Active Probe)
 *   - electronics/c3.json (C3 System + Battle Armor C3)
 *   - electronics/other.json (TAG, Targeting, Communications)
 */

import * as fs from 'fs';
import * as path from 'path';

const OFFICIAL_PATH = path.resolve(__dirname, '../../public/data/equipment/official');

interface EquipmentItem {
  id: string;
  name: string;
  category: string;
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

console.log('\n=== Splitting electronics.json ===');
const elecPath = path.join(OFFICIAL_PATH, 'electronics.json');
const raw = JSON.parse(fs.readFileSync(elecPath, 'utf-8')) as EquipmentFile;
const items = raw.items;
console.log(`  Source: ${items.length} items`);

const buckets: Record<string, EquipmentItem[]> = {
  'ecm': [],
  'active-probe': [],
  'c3': [],
  'other': [],
};

const categoryMap: Record<string, string> = {
  'ECM': 'ecm',
  'Active Probe': 'active-probe',
  'C3 System': 'c3',
  'Battle Armor Improved C3': 'c3',
};

for (const item of items) {
  const bucket = categoryMap[item.category] || 'other';
  buckets[bucket].push(item);
}

const schema = '../../_schema/electronics-schema.json';
for (const [name, bucketItems] of Object.entries(buckets)) {
  writeEquipmentFile(
    path.join(OFFICIAL_PATH, 'electronics', `${name}.json`),
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

// Update index.json
console.log('\n=== Updating index.json ===');
const indexPath = path.join(OFFICIAL_PATH, 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

index.files.electronics = {
  'ecm': 'electronics/ecm.json',
  'active-probe': 'electronics/active-probe.json',
  'c3': 'electronics/c3.json',
  'other': 'electronics/other.json',
};

index.generatedAt = new Date().toISOString();
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');
console.log('  Updated index.json');
console.log('\nDone!');
