import { createHash } from 'node:crypto';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { computeSupportVehicleWeight } from '@/utils/construction/vehicle/supportWeight';

import { SupportVehicleUnitHandler } from '../SupportVehicleUnitHandler';
import fixtures from './fixtures/support-artillery-ammo.pinned.json';

/**48fcb2f6 TestEntity.java:716-724,753-769: weapons and ammunition are disjoint. */
const parser = new BlkParserService();
const handler = new SupportVehicleUnitHandler();
function load(content: string) {
  const doc = parser.parse(content);
  if (!doc.success) throw new Error(JSON.stringify(doc.error));
  const result = handler.parse(doc.data.document);
  if (!result.success) throw new Error(JSON.stringify(result.error));
  return result.data.unit;
}

it.each(fixtures.rows)('$path matches Java weapon mass and validity', (row) => {
  expect(createHash('sha256').update(row.content).digest('hex')).toBe(
    row.sha256,
  );
  const unit = load(row.content);
  expect(computeSupportVehicleWeight(unit)).toMatchObject(row.expected);
  expect(handler.validate(unit).isValid).toBe(row.javaValid);
});

it('an extra artillery bin changes ammunition alone', () => {
  const unit = load(fixtures.rows[0].content);
  const ammo = unit.equipment.find((mount) => /Ammo/i.test(mount.equipmentId))!;
  const before = computeSupportVehicleWeight(unit);
  const after = computeSupportVehicleWeight({
    ...unit,
    equipment: [...unit.equipment, { ...ammo, id: 'extra-ammo' }],
  });
  expect(after.weapons).toBe(before.weapons);
  expect(after.ammo).toBe(before.ammo + 1);
  expect(after.miscEquipment).toBe(before.miscEquipment);
  expect(after.heatSinks).toBe(before.heatSinks);
  expect(after.powerAmplifiers).toBe(before.powerAmplifiers);
  expect(after.total).toBe(before.total + 1);
});
