/**
 * Integration test — player withdrawal through `InteractiveSession`.
 *
 * Exercises the player-facing `declareWithdrawal` action end-to-end:
 * the engine emits a `WithdrawalDeclared` event, latches the unit's
 * `isWithdrawing` flag, and the unit exits via the existing
 * `UnitRetreated` machinery when it reaches its edge during a phase
 * advance.
 *
 * @spec openspec/changes/add-combat-morale-and-withdrawal/spec.md
 *   — Requirement: Player Withdrawal Declaration
 * @spec openspec/changes/add-combat-morale-and-withdrawal/tasks.md § 2
 */

import { describe, it, expect } from '@jest/globals';

import type { IWeapon } from '@/simulation/ai/types';

import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  Facing,
  GameEventType,
  GameSide,
  LockState,
  MovementType,
  type IGameUnit,
} from '@/types/gameplay';

import type { IAdaptedUnit } from '../types';

import { createMinimalGrid } from '../GameEngine.helpers';
import { InteractiveSession } from '../InteractiveSession';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// `createGameSession` deploys player units on row r = +5
// (`PLAYER_DEPLOY_ROW`). Using a map radius of 5 makes that deploy row
// the north edge, so a unit declaring withdrawal toward 'north' is
// already on its target edge and exits on the next phase advance.
const MAP_RADIUS = 5;

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
    // Player units deploy on the north edge (r = +mapRadius); place
    // them right there so a withdrawal toward 'north' exits at once.
    position:
      side === GameSide.Player
        ? { q: 0, r: MAP_RADIUS }
        : { q: 0, r: -MAP_RADIUS },
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
    MAP_RADIUS,
    30,
    new SeededRandom(42),
    createMinimalGrid(MAP_RADIUS),
    [makeAdaptedUnit('unit-player', GameSide.Player)],
    [makeAdaptedUnit('unit-opponent', GameSide.Opponent)],
    makeGameUnits(),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InteractiveSession.declareWithdrawal', () => {
  it('emits a player WithdrawalDeclared event and flags the unit', () => {
    const session = makeSession();
    session.declareWithdrawal('unit-player', 'north');

    const events = session.getSession().events;
    const declared = events.find(
      (e) => e.type === GameEventType.WithdrawalDeclared,
    );
    expect(declared).toBeDefined();
    expect((declared!.payload as { edge: string }).edge).toBe('north');
    expect((declared!.payload as { declaredBy: string }).declaredBy).toBe(
      'player',
    );

    const unit = session.getState().units['unit-player'];
    expect(unit.isWithdrawing).toBe(true);
    expect(unit.retreatTargetEdge).toBe('north');
  });

  it('routes the withdrawing unit off the map via UnitRetreated', () => {
    const session = makeSession();
    session.declareWithdrawal('unit-player', 'north');

    // Advance through the Movement phase — the engine's end-of-phase
    // morale/withdrawal pass runs the edge-exit check. The player unit
    // is already on the north edge, so it exits immediately.
    // Initiative → Movement.
    session.advancePhase();
    // Movement → WeaponAttack (runs the morale + withdrawal pass).
    session.advancePhase();

    const events = session.getSession().events;
    const retreated = events.find(
      (e) =>
        e.type === GameEventType.UnitRetreated &&
        (e.payload as { unitId: string }).unitId === 'unit-player',
    );
    expect(retreated).toBeDefined();
    expect(session.getState().units['unit-player'].hasRetreated).toBe(true);
  });

  it('is sticky — the withdrawal cannot be cancelled or re-aimed', () => {
    const session = makeSession();
    session.declareWithdrawal('unit-player', 'north');
    const countAfterFirst = session.getSession().events.length;

    // A second declaration toward a different edge is a no-op.
    session.declareWithdrawal('unit-player', 'south');
    expect(session.getSession().events.length).toBe(countAfterFirst);
    expect(session.getState().units['unit-player'].retreatTargetEdge).toBe(
      'north',
    );
  });
});
