#!/usr/bin/env npx tsx
import { normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

// Check weapon IDs and their normalized forms
const weaponIds = [
  'isstreaksrm6', 'isstreaksrm4', 'isstreaksrm2',
  'streak-srm-6', 'streak-srm-4', 'streak-srm-2',
  'isarrowivsystem', 'arrow-iv', 'isarrowiv',
  'isplasmarifle', 'plasma-rifle',
  'clplasmacannon', 'plasma-cannon',
  'ishag20', 'hag-20', 'hag20',
];

for (const id of weaponIds) {
  const norm = normalizeEquipmentId(id);
  console.log(`"${id}" -> "${norm}"`);
}
