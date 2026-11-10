import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TechBase } from '@/types/enums/TechBase';
import { MiscEquipmentCategory } from '@/types/equipment/MiscEquipmentTypes';

import catalog from '../../../../public/data/equipment/official/miscellaneous/jump-jets.json';
import { getEquipmentLoader } from '../EquipmentLoaderService';
import { getEquipmentLookupService } from '../EquipmentLookupService';
import { getEquipmentRegistry } from '../EquipmentRegistry';

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

// 48fcb2f64 MiscType.java:2248-2305: two native factories, not Jump Jets.
it.each([
  ['partial-wing', 'INNER_SPHERE', 8],
  ['clan-partial-wing', 'CLAN', 6],
] as const)(
  'retains native %s technology and critical demand',
  (id, techBase, criticalSlots) => {
    expect(catalog.items.find((item) => item.id === id)).toMatchObject({
      techBase,
      criticalSlots,
      category: 'Movement Enhancement',
      variableEquipmentId: 'partial-wing',
      flags: expect.arrayContaining(['SPREADABLE', 'OMNI_FIXED_ONLY']),
    });
  },
);

it.each([
  ['ISPartialWing', 'partial-wing', TechBase.INNER_SPHERE, 8],
  ['IS Partial Wing', 'partial-wing', TechBase.INNER_SPHERE, 8],
  ['PartialWing', 'partial-wing', TechBase.INNER_SPHERE, 8],
  ['CLPartialWing', 'clan-partial-wing', TechBase.CLAN, 6],
  ['Clan Partial Wing', 'clan-partial-wing', TechBase.CLAN, 6],
  ['Partial Wing (Clan)', 'clan-partial-wing', TechBase.CLAN, 6],
] as const)(
  'resolves %s to its own native definition',
  (token, id, techBase, criticalSlots) => {
    const resolved = getEquipmentRegistry().lookup(token);
    expect(resolved.found).toBe(true);
    expect(resolved.equipment).toMatchObject({
      id,
      techBase,
      criticalSlots,
      variableEquipmentId: 'partial-wing',
    });
    expect(getEquipmentLookupService().getById(id)).toMatchObject({
      id,
      techBase,
      criticalSlots,
    });
  },
);

it('corrects the catalog category instead of widening the lookup exclusion', () => {
  expect(
    getEquipmentLoader().getMiscEquipmentById('partial-wing'),
  ).toMatchObject({ category: MiscEquipmentCategory.MOVEMENT });
  expect(
    getEquipmentLookupService().getById('jump-jet-medium'),
  ).toBeUndefined();
  expect(
    getEquipmentLookupService().getById('single-heat-sink'),
  ).toBeUndefined();
});

it('uses the native Clan introduction and omits unsupported descriptive text', () => {
  // MiscType.java:2302-2303 and TechAdvancement.java:686-698,784-791
  // at 48fcb2f64: introduction uses the unapproximated 3067 prototype date.
  const clan = catalog.items.find((item) => item.id === 'clan-partial-wing');
  expect(clan).toMatchObject({ introductionYear: 3067 });
  expect(clan).not.toHaveProperty('special');
  // Existing IS metadata is deliberately left for a later cited catalog batch.
  expect(
    catalog.items.find((item) => item.id === 'partial-wing'),
  ).toMatchObject({
    introductionYear: 3085,
    special: ['+1 Jump MP', '+2 heat dissipation at altitude'],
  });
});
