import { parseCustomCombatDefinition } from '@/services/units/customCombatDefinition';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { customCombatSnapshotSchema } from '@/types/contracts/CustomCombatSnapshot';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import atlas from '../../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';
import { adaptUnit } from '../CompendiumAdapter';

jest.mock('@/services/units/CanonicalUnitService', () => ({
  getCanonicalUnitService: () => ({
    getById: jest.fn().mockResolvedValue(null),
  }),
}));
jest.mock('@/services/units/CustomUnitApiService', () => ({
  customUnitApiService: { getById: jest.fn() },
}));

const saved = {
  ...atlas,
  id: 'custom-workbench-atlas',
  variant: 'Workbench',
  armor: {
    ...atlas.armor,
    allocation: { ...atlas.armor.allocation, LEFT_ARM: 30 },
  },
  equipment: [...atlas.equipment, { id: 'medium-laser', location: 'HEAD' }],
};

beforeEach(() => jest.mocked(customUnitApiService.getById).mockReset());

it('uses the saved construction and exact custom identity instead of a stock fallback', async () => {
  jest.mocked(customUnitApiService.getById).mockResolvedValue(saved as never);
  const adapted = await adaptUnit(saved.id, { side: GameSide.Player });
  expect(adapted).toMatchObject({
    id: saved.id,
    armor: { left_arm: 30 },
    heatSinks: 20,
    walkMP: 3,
    runMP: 5,
  });
  expect(adapted?.weapons.length).toBeGreaterThan(atlas.equipment.length);
  expect(Object.keys(adapted?.ammo ?? {}).length).toBeGreaterThan(0);
  expect(adapted?.customUnitDefinition).toMatchObject({
    id: saved.id,
    unitType: 'BattleMech',
    configuration: 'Biped',
  });
  expect(adapted?.customUnitDefinition).not.toHaveProperty('fluff');
  expect(customUnitApiService.getById).toHaveBeenCalledWith(saved.id);
});

it.each([
  null,
  { ...saved, movement: undefined },
  { ...saved, configuration: 'Quad' },
  { ...saved, unitType: 'OmniMech' },
  { ...saved, id: 'custom-other-id' },
])(
  'refuses missing or unsupported saved combat construction',
  async (definition) => {
    jest
      .mocked(customUnitApiService.getById)
      .mockResolvedValue(definition as never);
    await expect(adaptUnit(saved.id)).rejects.toThrow(/custom|saved/i);
  },
);

it('refuses the vehicle-only engine types on the recorded snapshot', () => {
  // The shared generated engine enum also serves vehicles (BLKFile.java:88,90:
  // NONE = 8, STEAM = 10). A BattleMech snapshot must still refuse them.
  const projected = parseCustomCombatDefinition(saved, saved.id);
  if (!projected) {
    throw new Error('expected a valid custom combat snapshot');
  }
  for (const type of ['NONE', 'STEAM']) {
    const engine = { ...projected.engine, type };
    expect(
      customCombatSnapshotSchema.safeParse({ ...projected, engine }).success,
    ).toBe(false);
    expect(
      parseCustomCombatDefinition({ ...saved, engine }, saved.id),
    ).toBeNull();
  }
});

it('rejects unknown nested construction keys on the recorded snapshot', () => {
  const projected = parseCustomCombatDefinition(saved, saved.id);
  if (!projected) {
    throw new Error('expected a valid custom combat snapshot');
  }
  expect(
    customCombatSnapshotSchema.safeParse({
      ...projected,
      engine: { ...projected.engine, extra: true },
    }).success,
  ).toBe(false);
  expect(
    customCombatSnapshotSchema.safeParse({
      ...projected,
      structure: { type: 'STANDARD', extra: true },
    }).success,
  ).toBe(false);
  expect(
    customCombatSnapshotSchema.safeParse({
      ...projected,
      heatSinks: { type: 'SINGLE', count: 20, extra: true },
    }).success,
  ).toBe(false);
  expect(
    customCombatSnapshotSchema.safeParse({
      ...projected,
      movement: { walk: 3, jump: 0, unrecorded: true },
    }).success,
  ).toBe(false);
  expect(
    customCombatSnapshotSchema.safeParse({
      ...projected,
      armor: {
        type: 'STANDARD',
        allocation: { LEFT_ARM: { front: 30, rear: 0, unrecorded: true } },
      },
    }).success,
  ).toBe(false);
  expect(
    customCombatSnapshotSchema.safeParse({
      ...projected,
      equipment: [{ id: 'medium-laser', location: 'LEFT_ARM', extra: true }],
    }).success,
  ).toBe(false);
});
