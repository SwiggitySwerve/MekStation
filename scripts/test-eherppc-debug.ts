import * as fs from 'fs';
import * as path from 'path';

// Load name-mappings directly
const nm = JSON.parse(fs.readFileSync(path.resolve('public/data/equipment/name-mappings.json'), 'utf-8'));
console.log('Direct lookup ISEHERPPC:', nm['ISEHERPPC']);
console.log('Direct lookup iseherppc:', nm['iseherppc']);

// Build lowercase index
const lower = new Map<string, string>();
for (const [key, value] of Object.entries(nm)) {
  lower.set(key.toLowerCase(), value as string);
}
console.log('Lower map iseherppc:', lower.get('iseherppc'));

// Now test via the actual resolver
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';
const norm = normalizeEquipmentId('iseherppc');
console.log('normalizeEquipmentId("iseherppc"):', norm);
const r = resolveEquipmentBV('iseherppc');
console.log('resolveEquipmentBV("iseherppc"):', r);
