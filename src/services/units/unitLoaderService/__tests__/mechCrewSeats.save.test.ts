/**
 * Authored Tripod/QuadVee crew seats survive the real save path: serializer,
 * unit contract, SQLite custom_units row and the production loader.
 */
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { UnitRepository } from '@/services/units/UnitRepository';
import { getUnitLibraryFingerprint } from '@/stores/unit/unitEditSnapshot';
import { createDefaultUnitState, type UnitState } from '@/stores/unitState';
import { UnitContract } from '@/types/contracts';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/temporal/Era';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import { parseUnit } from '../unitContractAdapter';
import { UnitLoaderService } from '../unitLoader';

jest.mock('@/services/units/CustomUnitApiService', () => ({
  customUnitApiService: { getById: jest.fn() },
}));

const seats = [
  { slotIndex: 0, name: 'Pilot Pat', gunnery: 3, piloting: 4 },
  { slotIndex: 2, name: 'Tech Tess', gunnery: 5, piloting: 6 },
] as const;

function stateFor(
  configuration: MechConfiguration,
  tonnage: number,
  crewSeats?: UnitState['crewSeats'],
): UnitState {
  return {
    ...createDefaultUnitState({
      id: '0b9d8e6a-39a1-4cc6-84a4-1d7a6f8a7c10',
      name: 'Crew Fixture',
      tonnage,
      techBase: TechBase.INNER_SPHERE,
    }),
    configuration,
    ...(crewSeats ? { crewSeats } : {}),
  };
}
const identity = (state: UnitState) => ({
  id: state.id,
  chassis: 'Crew Fixture',
  variant: 'CF-1',
  era: Era.RENAISSANCE,
});
const save = (state: UnitState) =>
  serializeCustomUnitState(state, identity(state));

describe('crew seats in the saved unit record', () => {
  it('serializes seats for a Tripod and the contract accepts them', () => {
    const saved = save(stateFor(MechConfiguration.TRIPOD, 105, seats));
    expect(saved.crewSeats).toEqual(seats);
    expect(UnitContract.safeParse(saved).success).toBe(true);
  });

  it('omits the field for a unit without authored seats, so older records are unchanged', () => {
    const saved = save(stateFor(MechConfiguration.TRIPOD, 105));
    expect(saved).not.toHaveProperty('crewSeats');
  });

  it('does not save seats on a configuration that has none', () => {
    const saved = save(stateFor(MechConfiguration.BIPED, 50, seats));
    expect(saved).not.toHaveProperty('crewSeats');
  });

  it.each([
    ['skill above the pinned maximum', { gunnery: 9 }],
    ['negative skill', { piloting: -1 }],
    ['slot beyond the native seats', { slotIndex: 3 }],
    ['empty name', { name: '' }],
    ['per-seat Edge', { edge: 1 }],
  ])('rejects a %s', (_label, patch) => {
    const saved = save(stateFor(MechConfiguration.TRIPOD, 105, seats));
    expect(
      UnitContract.safeParse({
        ...saved,
        crewSeats: [{ ...seats[0], ...patch }],
      }).success,
    ).toBe(false);
  });

  it('reopens the seats through the loader, and a record without them reopens blank', () => {
    const loader = new UnitLoaderService();
    const reopened = loader.mapToUnitState(
      parseUnit(save(stateFor(MechConfiguration.TRIPOD, 105, seats))),
      false,
    );
    expect(reopened.crewSeats).toEqual(seats);
    const legacy = loader.mapToUnitState(
      parseUnit(save(stateFor(MechConfiguration.TRIPOD, 105))),
      false,
    );
    expect(legacy).not.toHaveProperty('crewSeats');
  });

  it('changes the library fingerprint when a seat changes', () => {
    const base = stateFor(MechConfiguration.QUADVEE, 30, [seats[0]]);
    const renamed = stateFor(MechConfiguration.QUADVEE, 30, [
      { ...seats[0], name: 'Someone Else' },
    ]);
    expect(getUnitLibraryFingerprint(base)).not.toBe(
      getUnitLibraryFingerprint(renamed),
    );
  });

  it.each([
    [MechConfiguration.TRIPOD, 105],
    [MechConfiguration.QUADVEE, 30],
  ])(
    'persists %s seats in SQLite and reopens them through the production loader',
    async (configuration, tonnage) => {
      getSQLiteService({ path: ':memory:' }).initialize();
      try {
        const crewSeats =
          configuration === MechConfiguration.QUADVEE
            ? [
                seats[0],
                { slotIndex: 1, name: 'Gunner Gil', gunnery: 2, piloting: 7 },
              ]
            : [...seats];
        const state = stateFor(configuration, tonnage, crewSeats);
        const repository = new UnitRepository();
        const created = repository.create({
          chassis: 'Crew Fixture',
          variant: 'CF-1',
          data: { ...save(state) },
        });
        if (!created.success) throw new Error(created.error.message);
        jest
          .mocked(customUnitApiService.getById)
          .mockResolvedValue(
            JSON.parse(repository.getById(created.data.id)!.data),
          );
        const loaded = await new UnitLoaderService().loadCustomUnit(
          created.data.id,
        );
        if (!loaded.success || !loaded.state)
          throw new Error(JSON.stringify(loaded));
        expect(loaded.state.crewSeats).toEqual(crewSeats);
        expect(loaded.state.configuration).toBe(configuration);
      } finally {
        resetSQLiteService();
      }
    },
  );
});
