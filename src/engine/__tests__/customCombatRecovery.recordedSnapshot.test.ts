/**
 * Recorded custom construction through InteractiveSession setup/recovery.
 *
 * Launch copies a detached strict snapshot onto GameCreated. Recovery
 * prefers that snapshot, validates identity against unitRef (not the
 * game-instance id), and never live-looks-up a present invalid payload.
 *
 * @spec openspec/changes/enable-saved-custom-unit-combat/specs/custom-unit-combat/spec.md
 */

import { parseCustomCombatDefinition } from '@/services/units/customCombatDefinition';
import {
  GameSide,
  LockState,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';

import type { IAdaptedUnit } from '../types';

import atlas from '../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';
import { InteractiveSession } from '../InteractiveSession';
import {
  requireRecordedCustomCombatSnapshot,
  type ReadCustomCombatDefinition,
} from '../InteractiveSession.recovery';
import { gameUnitsWithAdaptedCombatSeeds } from '../InteractiveSession.setup';

const SOURCE_ID = 'custom-recorded-atlas';
const INSTANCE_ID = 'player-1-custom-recorded-atlas';

function recordedSnapshot() {
  const snapshot = parseCustomCombatDefinition(
    { ...atlas, id: SOURCE_ID },
    SOURCE_ID,
  );
  if (!snapshot || snapshot.unitType !== 'BattleMech') {
    throw new Error('expected Atlas construction to project to a snapshot');
  }
  return snapshot;
}

function customGameUnit(
  snapshot = recordedSnapshot(),
  overrides: Partial<IGameUnit> = {},
): IGameUnit {
  return {
    id: INSTANCE_ID,
    name: 'Custom Atlas',
    side: GameSide.Player,
    unitRef: SOURCE_ID,
    pilotRef: 'pilot-custom',
    gunnery: 4,
    piloting: 5,
    customUnitDefinition: snapshot,
    ...overrides,
  };
}

function adaptedShell(id: string, side: GameSide): IAdaptedUnit {
  return {
    id,
    side,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: { left_arm: 34 },
    structure: { left_arm: 17 },
    startingInternalStructure: { left_arm: 17 },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [],
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
  };
}

function sessionWith(units: readonly IGameUnit[]) {
  return startGame(
    createGameSession(
      {
        mapRadius: 7,
        turnLimit: 30,
        victoryConditions: ['elimination'],
        optionalRules: [],
      },
      units,
    ),
    GameSide.Player,
  );
}

describe('custom combat recorded construction', () => {
  it('copies a detached snapshot onto GameCreated units and keeps instance id distinct from unitRef', () => {
    const snapshot = recordedSnapshot();
    const [unit] = gameUnitsWithAdaptedCombatSeeds(
      [customGameUnit(snapshot, { customUnitDefinition: undefined })],
      [
        {
          ...adaptedShell(INSTANCE_ID, GameSide.Player),
          customUnitDefinition: snapshot,
        },
      ],
      [],
    );

    expect(unit.id).toBe(INSTANCE_ID);
    expect(unit.unitRef).toBe(SOURCE_ID);
    expect(unit.customUnitDefinition).toEqual(snapshot);
    expect(unit.customUnitDefinition).not.toBe(snapshot);
  });

  it('refuses a present recorded snapshot with unknown nested construction keys', () => {
    const snapshot = recordedSnapshot();
    const corrupt = {
      ...snapshot,
      engine: { ...snapshot.engine, extra: true },
    };

    expect(() =>
      requireRecordedCustomCombatSnapshot(corrupt, SOURCE_ID),
    ).toThrow(/invalid/);

    expect(() =>
      gameUnitsWithAdaptedCombatSeeds(
        [customGameUnit(snapshot, { customUnitDefinition: undefined })],
        [
          {
            ...adaptedShell(INSTANCE_ID, GameSide.Player),
            customUnitDefinition: corrupt as typeof snapshot,
          },
        ],
        [],
      ),
    ).toThrow(/invalid/);
  });

  it('recovers from the recorded snapshot and does not consult live authority', async () => {
    const snapshot = recordedSnapshot();
    const live: ReadCustomCombatDefinition = jest.fn(() => ({
      ...snapshot,
      armor: {
        ...snapshot.armor,
        allocation: { ...snapshot.armor.allocation, LEFT_ARM: 10 },
      },
    }));

    const recovered = await InteractiveSession.fromSessionAsync(
      sessionWith([customGameUnit(snapshot)]),
      live,
    );

    expect(live).not.toHaveBeenCalled();
    const recoveredUnit = recovered
      .getSession()
      .units.find((unit) => unit.id === INSTANCE_ID);
    if (recoveredUnit?.customUnitDefinition?.unitType !== 'BattleMech')
      throw new Error('Expected recorded Mech construction');
    expect(recoveredUnit?.unitRef).toBe(SOURCE_ID);
    expect(recoveredUnit?.customUnitDefinition).toEqual(snapshot);
    expect(recoveredUnit?.customUnitDefinition?.armor.allocation.LEFT_ARM).toBe(
      34,
    );
    expect(recovered.getMovementCapability(INSTANCE_ID)?.walkMP).toBe(3);
    expect(recovered.getMovementCapability(SOURCE_ID)).toBeNull();
  });

  it('refuses a present invalid snapshot without live lookup fallback', async () => {
    const snapshot = recordedSnapshot();
    const live: ReadCustomCombatDefinition = jest.fn(() => snapshot);
    const session = sessionWith([
      customGameUnit({
        ...snapshot,
        engine: { ...snapshot.engine, extra: true },
      } as typeof snapshot),
    ]);

    await expect(
      InteractiveSession.fromSessionAsync(session, live),
    ).rejects.toThrow(/invalid/);
    expect(live).not.toHaveBeenCalled();
  });

  it('refuses a present snapshot whose identity is not the source unitRef', async () => {
    const snapshot = recordedSnapshot();
    const live: ReadCustomCombatDefinition = jest.fn(() => snapshot);

    await expect(
      InteractiveSession.fromSessionAsync(
        sessionWith([customGameUnit({ ...snapshot, id: 'custom-other-id' })]),
        live,
      ),
    ).rejects.toThrow(/identity mismatch/);
    expect(live).not.toHaveBeenCalled();
  });

  it('refuses a construction snapshot attached to a canonical unit reference', async () => {
    const snapshot = { ...recordedSnapshot(), id: 'atlas-as7-d' };
    expect(() =>
      requireRecordedCustomCombatSnapshot(snapshot, snapshot.id),
    ).toThrow(/custom unit reference/);
    const live: ReadCustomCombatDefinition = jest.fn(() => snapshot);

    await expect(
      InteractiveSession.fromSessionAsync(
        sessionWith([customGameUnit(snapshot, { unitRef: 'atlas-as7-d' })]),
        live,
      ),
    ).rejects.toThrow(/custom unit reference/);
    expect(live).not.toHaveBeenCalled();
  });

  it('never silently skips a custom unit missing both snapshot and definition', async () => {
    const live: ReadCustomCombatDefinition = jest.fn(() => null);

    await expect(
      InteractiveSession.fromSessionAsync(
        sessionWith([
          customGameUnit(recordedSnapshot(), {
            customUnitDefinition: undefined,
          }),
        ]),
        live,
      ),
    ).rejects.toThrow(/custom|saved|authoritative/i);
  });
});
