/** @spec establish-all-unit-data-parity/vehicle-unit-system */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { createSupportRegistryMass } from '@/services/units/handlers/supportRegistryMass';
import { computeNativeTankWeight } from '@/services/units/handlers/vehicleHandlerWeight';
import { VehicleUnitHandler } from '@/services/units/handlers/VehicleUnitHandler';
import { TechBase } from '@/types/enums/TechBase';

import reference from './fixtures/frozen-tank-weight-gaps.reference.json';

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
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});

// MegaMek 48fcb2f64: ISMGA.java:70-83, ISLightMGA.java:69-82 and
// ISHeavyMGA.java:70-83 are all 0.5 t, so a decorated Inner Sphere array weighs
// the same whichever of the three it is. The BV catalog matches the decorated
// source token by name to a 0.25 t stub; the weight owners resolve it through
// the guarded native token instead, and Clan arrays stay 0.25 t.
describe('combat Tank weight of a decorated Inner Sphere array', () => {
  const fixture = reference.fixtures.find((f) => f.path.includes('Myrmidon'));
  if (!fixture) throw new Error('fixture');
  const parsed = new BlkParserService().parse(fixture.content);
  if (!parsed.success) throw new Error('fixture parse');
  const result = new VehicleUnitHandler().parse(parsed.data.document);
  if (!result.success) throw new Error('handler parse');
  const unit = result.data.unit;
  const equipmentWith = (equipmentId: string) =>
    computeNativeTankWeight(parsed.data.document, {
      ...unit,
      equipment: unit.equipment.map((mount) =>
        mount.equipmentId === 'ISLMGA(ST)' ? { ...mount, equipmentId } : mount,
      ),
    })?.equipment;

  it.each([
    'ISLMGA(ST)',
    'ISMGA(ST)',
    'ISHMGA(ST)',
    'ISMGA(ST):OMNI',
    'ISHMGA(ST):OMNI',
  ])('weighs the two %s arrays and sponson as Java does (11.5 t)', (id) => {
    expect(equipmentWith(id)).toBe(11.5);
  });
  it('keeps a Clan array at 0.25 t', () => {
    expect(equipmentWith('CLMGA(ST)')).toBe(11.0);
  });
});

describe('support registry mass of a decorated array', () => {
  const inner = createSupportRegistryMass(TechBase.INNER_SPHERE);
  it.each([
    'ISMGA(ST)',
    'ISLMGA(ST)',
    'ISHMGA(ST)',
    'ISMGA(ST):OMNI',
    'ISMGA:OMNI',
    'ISHMGA:OMNI',
    'ISMGA',
  ])('answers the pinned 0.5 t for %s', (id) => {
    expect(inner(id, id)).toBe(0.5);
  });
  it('leaves a Clan array to the catalog entry', () => {
    expect(
      createSupportRegistryMass(TechBase.CLAN)('CLMGA(ST)', 'CLMGA(ST)'),
    ).toBe(undefined);
  });
});
