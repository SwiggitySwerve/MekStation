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
// Fifty-six Tank sources carry `<internal_type>-1</internal_type>`, MegaMek's
// T_STRUCTURE_UNKNOWN (EquipmentType.java:138). BLKTankFile.java:169-172 stores it
// verbatim, and TestTank.getStructure:87-95 maps only `1` to Endo Steel, so every
// other value, including -1, weighs through the Standard branch of
// Structure.getWeightStructure:65-103. Values are the pinned verifier's, not ours.
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

const handler = new VehicleUnitHandler();
const unknownStructure = reference.fixtures.filter((row) =>
  /<internal_type>\n-1\n<\/internal_type>/.test(row.content),
);

function parse(content: string) {
  const parsed = new BlkParserService().parse(content);
  if (!parsed.success) throw Error(JSON.stringify(parsed.error));
  return parsed.data.document;
}
function load(content: string) {
  const document = parse(content);
  const result = handler.parse(document);
  if (!result.success) throw Error(JSON.stringify(result.error));
  return { document, unit: result.data.unit };
}

it('pins six unknown-structure sources', () => {
  expect(unknownStructure).toHaveLength(6);
});

describe.each(unknownStructure)('$path', (row) => {
  it('is the pinned source', () => {
    expect(createHash('sha256').update(row.content).digest('hex')).toBe(
      row.sha256,
    );
  });

  it('weighs structure as Standard and reproduces every Java component', () => {
    const { document, unit } = load(row.content);
    const weight = computeNativeTankWeight(document, unit);
    expect(weight).toBeDefined();
    const { total, ...components } = row.expected;
    expect(weight).toMatchObject({
      ...components,
      secondaryTurret: 0,
      powerAmplifiers: 0,
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
    const result = handler.validate(unit);
    expect(result.isValid).toBe(row.javaValid);
    expect(result.errors.filter((x) => x.startsWith('Total weight'))).toEqual(
      [],
    );
  });
});

it('reports the one Java-invalid source for its own reason, not for weight', () => {
  const row = unknownStructure.find((r) => !r.javaValid);
  if (!row) throw Error('Expected one Java-invalid fixture');
  expect(handler.validate(load(row.content).unit).errors).toEqual([
    'CASE must be mounted in the body.',
  ]);
});

it('treats -1 and an absent structure tag as the same Standard structure', () => {
  const row = unknownStructure[0];
  const document = parse(row.content);
  const absent = { ...document, internalType: undefined };
  const parsed = handler.parse(absent);
  if (!parsed.success) throw Error(JSON.stringify(parsed.error));
  expect(parsed.data.unit.internalStructureType).toBe(0);
  expect(computeNativeTankWeight(absent, parsed.data.unit)).toEqual(
    computeNativeTankWeight(document, load(row.content).unit),
  );
});

// Java: the same Bellona with `internal_type` 1 is Endo Steel (TestTank.java:91-95),
// 2.5 t of structure instead of 4.5 t and a 43 t total, so it must stay unavailable.
it.each([1, 5])(
  'does not approximate structure type %d as Standard',
  (internalType) => {
    const document = { ...parse(unknownStructure[0].content), internalType };
    const result = handler.parse(document);
    if (!result.success) throw Error(JSON.stringify(result.error));
    expect(computeNativeTankWeight(document, result.data.unit)).toBeUndefined();
  },
);
