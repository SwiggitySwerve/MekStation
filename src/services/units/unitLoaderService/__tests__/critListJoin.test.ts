import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';

import { resolveEquipmentId } from '../equipmentResolution';
import { UnitLoaderService } from '../unitLoader';

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

const load = (path: string) =>
  new UnitLoaderService().mapToUnitState(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/battlemechs', `${path}.json`),
        'utf8',
      ),
    ),
    true,
  );

// FU-101 (blocked-classes.json), class B: the converter's list id and the MTF
// crit token of one mount reached different records, so the mount never took
// its crit slots and crit-only recovery would have double-counted it. Both
// sides now reach the pinned MegaMek 48fcb2f6 item (techRoutes, loader only).
it.each([
  // Autocannon/10 Primitive (ISAC10Primitive.java:69).
  ['1-age-of-war/standard/Orion ON1-H', 'autocannon-10-primitive-registry'],
  // CLHeavyFlamer.
  ['6-dark-age/advanced/Crimson Hawk 4', 'clheavyflamer-registry'],
  // CLWERPPC, Java's owner of "Enhanced PPC".
  ['3-succession-wars/experimental/Devastator DVS-2-EC', 'clwerppc-registry'],
  // ISRISCHyperLaser.
  ["6-dark-age/standard/'Battle Tripod' R-H3L-2X", 'isrischyperlaser-registry'],
  // ISSniper / ISThumper: the artillery pieces, not the cannons.
  ['1-age-of-war/experimental/Helepolis HEP-2H', 'issniper-registry'],
  // CLLBXAC20 on a mixed-tech mech: 12 t, 9 slots, not the IS 14 t.
  ['6-dark-age/experimental/Kodiak II 3', 'clan-lb-20-x-ac'],
  // CLArrowIV on a mixed-tech mech: 12 t, not the IS 15 t.
  ['6-dark-age/standard/Dragon II DRG-11R', 'clan-arrow-iv-launcher'],
])('%s mounts %s on its crit slots', (path, id) => {
  const state = load(path);
  const mounts = state.equipment.filter((item) => item.equipmentId === id);
  expect(mounts.length).toBeGreaterThan(0);
  expect(mounts.every((item) => (item.slots?.length ?? 0) > 0)).toBe(true);
  expect(
    getEquipmentSlotIssues(
      state.equipment,
      state.configuration,
      state.engineType,
      state.gyroType,
      state.armActuators,
      state.cockpitType,
    ).filter((issue) =>
      /needs \d+ distinct critical slots/.test(issue.message),
    ),
  ).toEqual([]);
});

// ISThumper's only committed Java-valid row has no JSON here (the Uni ATAE-70
// ArtilleryMech is Java-invalid on weight), so pin its crit resolution: the
// Thumper artillery piece, not the Thumper cannon.
it('resolves the ISThumper crit token to the artillery record', () => {
  expect(
    resolveEquipmentId(
      'ISThumper',
      TechBase.INNER_SPHERE,
      TechBaseMode.INNER_SPHERE,
      ['ISThumper'],
    ).equipmentDef?.id,
  ).toBe('isthumper-registry');
});
