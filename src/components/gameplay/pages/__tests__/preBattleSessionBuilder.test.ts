import type { IAdaptedUnit } from '@/engine/types';
import type { IForce } from '@/types/force';
import type { IPilot } from '@/types/pilot';

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
  };
}

function makeForce(unitId: string, pilotId: string): IForce {
  return {
    id: `${unitId}-force`,
    name: `${unitId} Force`,
    forceType: ForceType.Lance,
    status: ForceStatus.Active,
    childIds: [],
    assignments: [
      {
        id: `${unitId}-assignment`,
        pilotId,
        unitId,
        position: ForcePosition.Member,
        slot: 1,
      },
    ],
    stats: {
      totalBV: 0,
      totalTonnage: 0,
      assignedPilots: 1,
      assignedUnits: 1,
      emptySlots: 0,
      averageSkill: { gunnery: 3, piloting: 4 },
    },
    createdAt: '2026-05-22T00:00:00.000Z',
    updatedAt: '2026-05-22T00:00:00.000Z',
  };
}

function makePilot(id: string): IPilot {
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
});
