import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { TechBase } from '@/types/enums/TechBase';

import {
  linkLaserInsulatorWeapons,
  linkPPCCapacitorWeapons,
} from '../../equipmentBV/weaponLinks';
import { computeVehicleMountedWeightFigures } from '../mountedWeight';
import { computeVehicleWeightBreakdown } from '../weightComposition';

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
const load = (name: string) =>
  mapToVehicleState(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/vehicles', `${name}.json`),
        'utf8',
      ),
    ),
  );
const weights = (name: string) =>
  computeVehicleWeightBreakdown(load(name), (id, isAmmo) =>
    getEquipmentLookupService().getMountedById(id, isAmmo === true),
  );

// MegaMek 48fcb2f64a1b / mm-data 50f7efef; UL-16b exact weight terms.
// MekFileParser.java:360-388,472-495; TestEntity.java:945-966.
it('applies Pandion insulators before the engine allowance (20 t Java)', () => {
  const state = load('Pandion Combat WiGE (3140 Upgrade)');
  expect(weights('Pandion Combat WiGE (3140 Upgrade)')).toMatchObject({
    heatSinks: 0,
    remaining: state.tonnage - 20,
  });
});
it('charges Schrek II-X three linked capacitors (+15 raw heat)', () => {
  expect(weights('Schrek II-X PPC Carrier')).toMatchObject({ heatSinks: 35 });
});
// UL-16b: 6 t reactive armor + 20.5 t equipment, including 1 t Clan TC.
// The old 7 t armor and missing TC cancel. Both corrections must land together.
it('keeps Hadur LRM at Java 50 t with computer mass and reactive density coupled', () => {
  expect(weights('Hadur Fast Support Vehicle (LRM)')).toMatchObject({
    armor: 6,
    equipment: 20.5,
    remaining: 0,
  });
});
// MiscType.java:614-616 at 48fcb2f64: Clan /5, IS /4, next whole ton.
// Keep the native Clan catalog sentinel; this load requires a 5 t computer.
it('charges Gulltoppr A its native Clan computer without replacing the zero sentinel', () => {
  const lookup = getEquipmentLookupService();
  expect(lookup.getById('clan-targeting-computer')).toMatchObject({
    techBase: TechBase.CLAN,
    weight: 0,
  });
  expect(load('Gulltoppr OmniMonitor (A)').equipment).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        equipmentId: 'clan-targeting-computer',
        sourceIdentity: expect.objectContaining({
          sourceId: 'cltargeting-computer:omni',
        }),
      }),
    ]),
  );
  expect(weights('Gulltoppr OmniMonitor (A)')).toMatchObject({
    equipment: 62,
    structure: 38,
    remaining: 0,
  });
  expect(lookup.getById('clan-targeting-computer')?.weight).toBe(0);
});
it('prefers the immediate predecessor, then falls back to the first unlinked laser', () => {
  const laser = (order: number, location = 'front') => ({
    id: 'medium-laser',
    order,
    location,
    laser: true,
    linked: false,
    insulated: false,
  });
  const guns = [laser(0), laser(1), laser(3, 'rear')];
  linkLaserInsulatorWeapons(guns, [
    { order: 2, location: 'front', kind: 'insulator' },
  ]);
  expect(guns.map((g) => g.insulated)).toEqual([false, true, false]);
  linkLaserInsulatorWeapons(guns, [
    { order: 4, location: 'front', kind: 'insulator' },
    { order: 5, location: 'front', kind: 'insulator' },
  ]);
  expect(guns.map((g) => g.insulated)).toEqual([true, true, false]);
});
it.each([3100, 3101])('reuses the PPC owner year gate in %s', (year) => {
  const guns = [{ id: 'clan-er-ppc', location: 'front', linked: false }];
  linkPPCCapacitorWeapons(
    guns,
    [{ location: 'front' }, { location: 'rear' }],
    year,
    (g) => !g.linked,
    (g) => {
      g.linked = true;
    },
  );
  expect(guns[0].linked).toBe(year === 3101);
});
it('preserves Java running-total minimum for insulated one-heat lasers', () => {
  const state = load('Pandion Combat WiGE (3140 Upgrade)');
  const template = state.equipment[0];
  state.equipment = [
    'small-laser',
    'laserinsulator',
    'small-laser',
    'laserinsulator',
  ].map((equipmentId, i) => ({ ...template, id: String(i), equipmentId }));
  expect(
    computeVehicleMountedWeightFigures(state, (id) =>
      getEquipmentLookupService().getById(id),
    ).rawWeaponHeat,
  ).toBe(1);
});
