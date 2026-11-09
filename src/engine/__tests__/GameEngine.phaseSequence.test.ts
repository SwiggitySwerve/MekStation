/**
 * Wave 4 C3 PR1 — `runToCompletion` drives the phase loop with six
 * hard-coded `advancePhase` calls. This pins that its PhaseChanged stream
 * is exactly the shared GamePhase table, turn after turn, so the loop and
 * the table cannot drift apart.
 */

import type { IWeapon } from '@/simulation/ai/types';
import type { IPhaseChangedPayload } from '@/types/gameplay';

import {
  GameEventType,
  GamePhase,
  GameSide,
  LockState,
} from '@/types/gameplay';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';
import {
  GAME_PHASE_ORDER,
  isLegalPhaseTransition,
} from '@/utils/gameplay/gamePhaseTransitions';

import type { IAdaptedUnit } from '../types';

import { GameEngine } from '../GameEngine';

const WEAPON: IWeapon = {
  id: 'ml',
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

function unit(
  id: string,
  side: GameSide,
  position: { q: number; r: number },
): IAdaptedUnit {
  return {
    id,
    side,
    position,
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
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [{ ...WEAPON, id: `${id}-ml` }],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

function gameUnit(id: string, side: GameSide) {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: 'default',
    gunnery: 4,
    piloting: 5,
  };
}

describe('GameEngine.runToCompletion phase sequence', () => {
  it('emits PhaseChanged edges that are exactly the GamePhase table, every turn', () => {
    const session = new GameEngine({ seed: 42, turnLimit: 2 }).runToCompletion(
      [unit('player-1', GameSide.Player, { q: 0, r: -4 })],
      [unit('opponent-1', GameSide.Opponent, { q: 0, r: 4 })],
      [
        gameUnit('player-1', GameSide.Player),
        gameUnit('opponent-1', GameSide.Opponent),
      ],
    );

    const changes = session.events
      .filter((event) => event.type === GameEventType.PhaseChanged)
      .map((event) => ({
        turn: event.turn,
        ...(event.payload as IPhaseChangedPayload),
      }));

    // Turn 1 runs the full cycle (six edges, ending End -> Initiative). The
    // final turn stops at the turn limit before that closing advance, so it
    // has five edges: 6 + 5.
    expect(changes.length).toBe(GAME_PHASE_ORDER.length * 2 - 1);

    changes.forEach((change, index) => {
      expect(isLegalPhaseTransition(change.fromPhase, change.toPhase)).toBe(
        true,
      );
      expect(change.fromPhase).toBe(GAME_PHASE_ORDER[index % 6]);
      if (index > 0) {
        expect(change.fromPhase).toBe(changes[index - 1].toPhase);
      }
    });

    // Turn number bumps exactly on the End -> Initiative edge.
    const turns = changes.map((change) => change.turn);
    expect(turns).toEqual([1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2]);
    expect(changes[5].toPhase).toBe(GamePhase.Initiative);
  });
});
