import type { IWeapon } from '@/simulation/ai/types';

import {
  _resetCombatOutcomeBus,
  subscribeToCombatOutcome,
} from '@/engine/combatOutcomeBus';
import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InteractiveSession } from '@/engine/InteractiveSession';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  type IGameUnit,
} from '@/types/gameplay';
import { logger } from '@/utils/logger';

import type { IAdaptedUnit } from '../types';

function makeWeapon(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
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
    armor: { center_torso: 31 },
    structure: { center_torso: 21 },
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
  };
}

function makeGameUnits(): IGameUnit[] {
  return [
    {
      id: 'unit-player',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-player',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'unit-opponent',
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'marauder-mad-3r',
      pilotRef: 'pilot-opponent',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function makeSession(): InteractiveSession {
  return new InteractiveSession(
    7,
    30,
    new SeededRandom(42),
    createMinimalGrid(7),
    [makeAdaptedUnit('unit-player', GameSide.Player)],
    [makeAdaptedUnit('unit-opponent', GameSide.Opponent)],
    makeGameUnits(),
  );
}

describe('InteractiveSession outcome bus hardening', () => {
  afterEach(() => {
    _resetCombatOutcomeBus();
    jest.restoreAllMocks();
  });

  it('does not latch the publish guard when every outcome listener throws', () => {
    const session = makeSession();
    const listenerError = new Error('localStorage quota exceeded');
    const loggerSpy = jest
      .spyOn(logger, 'error')
      .mockImplementation(() => undefined);
    subscribeToCombatOutcome(() => {
      throw listenerError;
    });

    expect(() => session.concede(GameSide.Player)).not.toThrow();

    expect(session.hasPublishedOutcome()).toBe(false);
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('CombatOutcomeReady'),
      listenerError,
    );
  });
});
