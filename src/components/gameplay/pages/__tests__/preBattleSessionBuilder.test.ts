import type { IAdaptedUnit } from '@/engine/types';
import type { IForce } from '@/types/force';
import type { IInitiativeEquipmentProfile } from '@/types/gameplay';
import type { IPilot } from '@/types/pilot';
import type { IC3EquipmentMountState } from '@/utils/gameplay/c3Network';

import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { ForcePosition, ForceStatus, ForceType } from '@/types/force';
import { GameSide, LockState, MovementType } from '@/types/gameplay';
import { Facing } from '@/types/gameplay/HexGridInterfaces';
import { PilotStatus, PilotType } from '@/types/pilot';
import { createGameSession } from '@/utils/gameplay/gameSession';

import { buildPreparedBattleData } from '../preBattleSessionBuilder';

jest.mock('@/engine/adapters/CompendiumAdapter', () => ({
  adaptUnit: jest.fn(),
}));

const adaptUnitMock = adaptUnit as jest.MockedFunction<typeof adaptUnit>;

function makeAdaptedUnit(
  id: string,
  side: GameSide,
  heatSinks: number,
  heatSinkType: 'single' | 'double',
  initiativeEquipment?: IInitiativeEquipmentProfile,
  c3Equipment?: readonly IC3EquipmentMountState[],
): IAdaptedUnit {
  return {
    id,
    side,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    gunnery: 4,
    piloting: 5,
    heatSinks,
    heatSinkType,
    armor: { center_torso: 30 },
    structure: { center_torso: 20 },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    hasRetreated: false,
    hasEjected: false,
    weapons: [],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
    ...(initiativeEquipment ? { initiativeEquipment } : {}),
    ...(c3Equipment ? { c3Equipment } : {}),
  };
}

function makeForce(unitId: string, pilotId: string): IForce {
  return makeForceWithAssignments([{ unitId, pilotId }]);
}

function makeForceWithAssignments(
  assignments: readonly { unitId: string; pilotId: string }[],
): IForce {
  return {
    id: `${assignments[0]?.unitId ?? 'empty'}-force`,
    name: `${assignments[0]?.unitId ?? 'Empty'} Force`,
    forceType: ForceType.Lance,
    status: ForceStatus.Active,
    childIds: [],
    assignments: assignments.map(({ pilotId, unitId }, index) => ({
      id: `${unitId}-assignment`,
      pilotId,
      unitId,
      position: ForcePosition.Member,
      slot: index + 1,
    })),
    stats: {
      totalBV: 0,
      totalTonnage: 0,
      assignedPilots: assignments.length,
      assignedUnits: assignments.length,
      emptySlots: Math.max(0, 4 - assignments.length),
      averageSkill: { gunnery: 3, piloting: 4 },
    },
    createdAt: '2026-05-22T00:00:00.000Z',
    updatedAt: '2026-05-22T00:00:00.000Z',
  };
}

function makePilot(id: string, overrides: Partial<IPilot> = {}): IPilot {
  return {
    id,
    name: `${id} Pilot`,
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 3, piloting: 4 },
    wounds: 0,
    abilities: [],
    createdAt: '2026-05-22T00:00:00.000Z',
    updatedAt: '2026-05-22T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildPreparedBattleData', () => {
  beforeEach(() => {
    adaptUnitMock.mockReset();
  });

  it('threads adapted heat sink count and type into GameCreated unit seeds', async () => {
    adaptUnitMock.mockImplementation(async (unitId, options) => {
      const side = options?.side ?? GameSide.Player;
      if (unitId === 'atlas-as7-d') {
        return makeAdaptedUnit(unitId, side, 20, 'single');
      }
      return makeAdaptedUnit(unitId, side, 14, 'double');
    });

    const prepared = await buildPreparedBattleData({
      playerForce: makeForce('atlas-as7-d', 'pilot-a'),
      opponentForce: makeForce('nightstar-nsr-9j', 'pilot-b'),
      pilots: [makePilot('pilot-a'), makePilot('pilot-b')],
    });

    expect(prepared.gameUnits).toEqual([
      expect.objectContaining({
        id: 'atlas-as7-d',
        heatSinks: 20,
        heatSinkType: 'single',
      }),
      expect.objectContaining({
        id: 'nightstar-nsr-9j',
        heatSinks: 14,
        heatSinkType: 'double',
      }),
    ]);

    const session = createGameSession(
      {
        mapRadius: 7,
        turnLimit: 10,
        victoryConditions: ['elimination'],
        optionalRules: [],
      },
      prepared.gameUnits,
    );

    expect(session.currentState.units['atlas-as7-d']).toMatchObject({
      heatSinks: 20,
      heatSinkType: 'single',
    });
    expect(session.currentState.units['nightstar-nsr-9j']).toMatchObject({
      heatSinks: 14,
      heatSinkType: 'double',
    });
  });

  it('threads adapted initiative equipment into GameCreated unit seeds', async () => {
    const initiativeEquipment: IInitiativeEquipmentProfile = {
      cockpitType: 'Command Console',
      commandConsoleCrewActive: true,
      tonnage: 100,
      unitType: 'BattleMech',
      workingCommunicationsTonnage: 3,
      communicationsMode: 'Default',
    };

    adaptUnitMock.mockImplementation(async (unitId, options) =>
      makeAdaptedUnit(
        unitId,
        options?.side ?? GameSide.Player,
        20,
        'single',
        unitId === 'atlas-as7-d' ? initiativeEquipment : undefined,
      ),
    );

    const prepared = await buildPreparedBattleData({
      playerForce: makeForce('atlas-as7-d', 'pilot-a'),
      opponentForce: makeForce('nightstar-nsr-9j', 'pilot-b'),
      pilots: [makePilot('pilot-a'), makePilot('pilot-b')],
    });

    expect(prepared.gameUnits[0]).toMatchObject({ initiativeEquipment });

    const session = createGameSession(
      {
        mapRadius: 7,
        turnLimit: 10,
        victoryConditions: ['elimination'],
        optionalRules: [],
      },
      prepared.gameUnits,
    );

    expect(
      session.currentState.units['atlas-as7-d'].initiativeEquipment,
    ).toEqual(initiativeEquipment);
    expect(
      session.currentState.units['nightstar-nsr-9j'].initiativeEquipment,
    ).toBeUndefined();
  });

  it('threads adapted C3 equipment into GameCreated unit seeds and conservative session networks', async () => {
    adaptUnitMock.mockImplementation(async (unitId, options) => {
      const side = options?.side ?? GameSide.Player;
      if (unitId === 'c3-master') {
        return makeAdaptedUnit(unitId, side, 20, 'single', undefined, [
          {
            role: 'master',
            sourceEquipmentId: 'C3 Master Computer',
          },
        ]);
      }
      if (unitId === 'c3-slave') {
        return makeAdaptedUnit(unitId, side, 20, 'single', undefined, [
          {
            role: 'slave',
            sourceEquipmentId: 'C3 Slave Unit',
          },
        ]);
      }
      return makeAdaptedUnit(unitId, side, 14, 'double');
    });

    const prepared = await buildPreparedBattleData({
      playerForce: makeForceWithAssignments([
        { unitId: 'c3-master', pilotId: 'pilot-a' },
        { unitId: 'c3-slave', pilotId: 'pilot-b' },
      ]),
      opponentForce: makeForce('nightstar-nsr-9j', 'pilot-c'),
      pilots: [
        makePilot('pilot-a'),
        makePilot('pilot-b'),
        makePilot('pilot-c'),
      ],
    });

    expect(prepared.gameUnits[0]).toMatchObject({
      id: 'c3-master',
      c3Equipment: [
        {
          role: 'master',
          sourceEquipmentId: 'C3 Master Computer',
        },
      ],
    });
    expect(prepared.gameUnits[1]).toMatchObject({
      id: 'c3-slave',
      c3Equipment: [
        {
          role: 'slave',
          sourceEquipmentId: 'C3 Slave Unit',
        },
      ],
    });

    const session = createGameSession(
      {
        mapRadius: 7,
        turnLimit: 10,
        victoryConditions: ['elimination'],
        optionalRules: [],
      },
      prepared.gameUnits,
    );

    expect(session.currentState.c3Network?.networks).toEqual([
      expect.objectContaining({
        type: 'master-slave',
        teamId: GameSide.Player,
        members: [
          expect.objectContaining({
            entityId: 'c3-master',
            role: 'master',
          }),
          expect.objectContaining({
            entityId: 'c3-slave',
            role: 'slave',
          }),
        ],
      }),
    ]);
  });

  it('threads explicit assigned-pilot RPG Toughness into GameCreated unit seeds', async () => {
    adaptUnitMock.mockImplementation(async (unitId, options) =>
      makeAdaptedUnit(unitId, options?.side ?? GameSide.Player, 20, 'single'),
    );

    const prepared = await buildPreparedBattleData({
      playerForce: makeForce('atlas-as7-d', 'pilot-a'),
      opponentForce: makeForce('nightstar-nsr-9j', 'pilot-b'),
      pilots: [
        makePilot('pilot-a', { rpgToughness: 2 }),
        makePilot('pilot-b', { rpgToughness: 0 }),
      ],
    });

    expect(prepared.gameUnits).toEqual([
      expect.objectContaining({
        id: 'atlas-as7-d',
        pilotToughness: 2,
      }),
      expect.objectContaining({
        id: 'nightstar-nsr-9j',
        pilotToughness: 0,
      }),
    ]);

    const session = createGameSession(
      {
        mapRadius: 7,
        turnLimit: 10,
        victoryConditions: ['elimination'],
        optionalRules: [],
      },
      prepared.gameUnits,
    );

    expect(session.currentState.units['atlas-as7-d'].pilotToughness).toBe(2);
    expect(session.currentState.units['nightstar-nsr-9j'].pilotToughness).toBe(
      0,
    );
  });

  it('does not infer RPG Toughness from the legacy toughness ability alias', async () => {
    adaptUnitMock.mockImplementation(async (unitId, options) =>
      makeAdaptedUnit(unitId, options?.side ?? GameSide.Player, 20, 'single'),
    );

    const prepared = await buildPreparedBattleData({
      playerForce: makeForce('atlas-as7-d', 'pilot-a'),
      opponentForce: undefined,
      pilots: [
        makePilot('pilot-a', {
          abilities: [
            {
              abilityId: 'toughness',
              acquiredDate: '2026-05-22T00:00:00.000Z',
            },
          ],
        }),
      ],
    });

    expect(prepared.gameUnits[0]).toMatchObject({
      id: 'atlas-as7-d',
      gunnery: 3,
      piloting: 4,
    });
    expect(prepared.gameUnits[0].pilotToughness).toBeUndefined();

    const session = createGameSession(
      {
        mapRadius: 7,
        turnLimit: 10,
        victoryConditions: ['elimination'],
        optionalRules: [],
      },
      prepared.gameUnits,
    );

    expect(
      session.currentState.units['atlas-as7-d'].pilotToughness,
    ).toBeUndefined();
  });
});
