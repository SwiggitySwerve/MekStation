import type { NextRouter } from 'next/router';

import { act, renderHook } from '@testing-library/react';

import type { IAdaptedUnit } from '@/engine/types';
import type { IWeapon } from '@/simulation/ai/types';
import type { IEncounter } from '@/types/encounter';
import type {
  ISkirmishLaunchConfig,
  ISkirmishUnitSelection,
} from '@/utils/gameplay/preBattleSessionBuilder';

const mockAdaptUnit = jest.fn();
jest.mock('@/engine/adapters/CompendiumAdapter', () => ({
  adaptUnit: (unitRef: string, options: unknown) =>
    mockAdaptUnit(unitRef, options),
}));

const mockPersistInteractiveLaunchRecoveryLog = jest.fn();
jest.mock('../usePreBattleLaunch', () => ({
  persistInteractiveLaunchRecoveryLog: (session: unknown) =>
    mockPersistInteractiveLaunchRecoveryLog(session),
}));

import {
  EncounterStatus,
  TerrainPreset,
  VictoryConditionType,
} from '@/types/encounter';
import { Facing, GameSide, LockState, MovementType } from '@/types/gameplay';

import { usePreBattleSkirmish } from '../usePreBattleSkirmish';

function makeWeapon(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    shortRange: 6,
    mediumRange: 12,
    longRange: 20,
    heat: 3,
    damage: 5,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function makeAdaptedUnit(id: string, side: GameSide): IAdaptedUnit {
  return {
    id,
    side,
    position: side === GameSide.Player ? { q: 0, r: -2 } : { q: 0, r: 2 },
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    startingInternalStructure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [makeWeapon(`${id}-medium-laser`)],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
    tonnage: 65,
  };
}

function makeSelection(unitId: string): ISkirmishUnitSelection {
  return {
    unitId,
    designation: unitId,
    tonnage: 65,
    bv: 1500,
    pilot: {
      pilotId: `${unitId}-pilot`,
      callsign: `${unitId}-pilot`,
      gunnery: 4,
      piloting: 5,
    },
  };
}

function makeConfig(): ISkirmishLaunchConfig {
  return {
    encounterId: 'enc-skirmish',
    mapRadius: 5,
    terrainPreset: TerrainPreset.Clear,
    player: { units: [makeSelection('atlas-as7-d')] },
    opponent: { units: [makeSelection('marauder-mad-3r')] },
    turnLimit: 30,
  };
}

function makeEncounter(): IEncounter {
  return {
    id: 'enc-skirmish',
    name: 'Recovery Skirmish',
    status: EncounterStatus.Ready,
    mapConfig: {
      radius: 5,
      terrain: TerrainPreset.Clear,
      playerDeploymentZone: 'south',
      opponentDeploymentZone: 'north',
    },
    victoryConditions: [{ type: VictoryConditionType.DestroyAll }],
    optionalRules: [],
    createdAt: '2026-06-21T00:00:00.000Z',
    updatedAt: '2026-06-21T00:00:00.000Z',
  };
}

describe('usePreBattleSkirmish recovery persistence', () => {
  beforeEach(() => {
    mockAdaptUnit.mockImplementation(
      async (
        unitRef: string,
        options: { side: GameSide } = { side: GameSide.Player },
      ) => makeAdaptedUnit(unitRef, options.side),
    );
    mockPersistInteractiveLaunchRecoveryLog.mockReset();
  });

  it('persists the launch recovery log before navigating to the game page', async () => {
    const calls: string[] = [];
    mockPersistInteractiveLaunchRecoveryLog.mockImplementation(async () => {
      calls.push('persist');
      return true;
    });
    const router = {
      push: jest.fn((path: string) => {
        calls.push('push');
        return Promise.resolve(path);
      }),
    } as unknown as NextRouter;
    const setInteractiveSession = jest.fn(() => calls.push('set'));
    const showToast = jest.fn();

    const { result } = renderHook(() =>
      usePreBattleSkirmish({
        encounter: makeEncounter(),
        router,
        setInteractiveSession,
        showToast,
      }),
    );

    await act(async () => {
      await result.current.launchSkirmish(makeConfig());
    });

    expect(setInteractiveSession).toHaveBeenCalledTimes(1);
    expect(mockPersistInteractiveLaunchRecoveryLog).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
      }),
    );
    expect(router.push).toHaveBeenCalledWith(
      expect.stringMatching(/^\/gameplay\/games\//),
    );
    expect(calls).toEqual(['set', 'persist', 'push']);
  });
});
