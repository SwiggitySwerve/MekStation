import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';

import { computeNativeTankWeight } from '../vehicleHandlerWeight';
import { VehicleUnitHandler } from '../VehicleUnitHandler';
import reference from './fixtures/native-tank-unavailable-totals.reference.json';

/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
// MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587 / mm-data 50f7efef0c9f775b0258f8283525ed4f906e1985.
// Mortar Carrier mounts three `IS Mech Mortar-8` (ISMekMortar8.java: 10 t). The
// native name used to normalize to "is mech mortar" and resolve to nothing, which
// left its complete total unavailable. Values are the pinned verifier's.
jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
beforeAll(async () => {
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
});

const row = reference.fixtures.find((r) =>
  r.path.endsWith('Mortar Carrier.blk'),
);
if (!row) throw Error('Mortar Carrier fixture missing');
const handler = new VehicleUnitHandler();
function load(content: string) {
  const parsed = new BlkParserService().parse(content);
  if (!parsed.success) throw Error(JSON.stringify(parsed.error));
  const result = handler.parse(parsed.data.document);
  if (!result.success) throw Error(JSON.stringify(result.error));
  return { document: parsed.data.document, unit: result.data.unit };
}

it('is the pinned source', () => {
  expect(createHash('sha256').update(row.content).digest('hex')).toBe(
    row.sha256,
  );
});

it('mounts the three mortars at Java’s 10 t each and reproduces every Java component', () => {
  const { document, unit } = load(row.content);
  expect(
    unit.equipment.filter((m) => m.name === 'IS Mech Mortar-8'),
  ).toHaveLength(3);
  const weight = computeNativeTankWeight(document, unit);
  expect(weight).toBeDefined();
  const { total, ...components } = row.expected;
  expect(weight).toMatchObject({
    ...components,
    secondaryTurret: 0,
    powerAmplifiers: 0,
    unresolvedMountIds: [],
    isComplete: true,
  });
  expect(weight?.remaining).toBeCloseTo(unit.tonnage - total, 9);
});

it('publishes Java’s complete total without changing validity', () => {
  const { unit } = load(row.content);
  expect(unit.totalWeight).toBe(row.expected.total);
  expect(unit.remainingTonnage).toBeCloseTo(
    unit.tonnage - row.expected.total,
    9,
  );
  expect(handler.validate(unit).isValid).toBe(row.javaValid);
});
