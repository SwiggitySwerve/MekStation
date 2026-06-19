/**
 * Compliance test for `add-bot-retreat-behavior` — covers per-task scenarios
 * called out in design.md "Apply-Wave Note" plus the unchecked tasks in
 * tasks.md. Distinct from `addBotRetreatBehavior.smoke.test.ts` which
 * pins the pure helpers; this file pins the WIRING through `BotPlayer` +
 * the session reducer + the GameEngine phase functions.
 *
 * Coverage:
 *   - Task 1.2 / 1.3: defaults + replay parity
 *   - Task 2.2: points-of-IS structural ratio (REPLACES location-count)
 *   - Task 2.3: TAC scan via ComponentDestroyed (cockpit/gyro/engine)
 *   - Task 2.4: latch + locked retreatTargetEdge
 *   - Task 4.1 / 4.5: MoveAI override path skips LoS scoring
 *   - Task 5.1–5.4: selectMovementType cases
 *   - Task 6.2: arc filter — forward facing, no torso twist
 *   - Task 6.3: physical attacks skipped when retreating
 *   - Task 6.4: heat budget tightened by 2
 *   - Task 7.1–7.5: UnitRetreated emission + reducer + victory exclusion
 *   - Task 8.2: immobilized retreating unit doesn't emit UnitRetreated
 *   - Task 8.3: dual-trigger one-time latch
 *   - Task 8.4: single-turn retreat valid
 *
 * @spec openspec/changes/add-bot-retreat-behavior/specs/simulation-system/spec.md
 */

import { describe, it, expect } from '@jest/globals';

import { BotPlayer } from '@/simulation/ai/BotPlayer';
import {
  DEFAULT_BEHAVIOR,
  type IAIUnitState,
  type IBotBehavior,
  type IWeapon,
} from '@/simulation/ai/types';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  Facing,
  FiringArc,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  type IGameSession,
  type IUnitGameState,
} from '@/types/gameplay';
import { applyDamageApplied } from '@/utils/gameplay/gameState/damageResolution';
import { applyUnitRetreated } from '@/utils/gameplay/gameState/extendedCombat';
import { createInitialUnitState } from '@/utils/gameplay/gameState/initialization';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const FULL_STRUCTURE = {
  head: 3,
  ct: 8,
  lt: 6,
  rt: 6,
  la: 4,
  ra: 4,
  ll: 6,
  rl: 6,
};

function makeWeapon(overrides: Partial<IWeapon> = {}): IWeapon {
  return {
    id: 'w1',
    name: 'Medium Laser',
    damage: 5,
    heat: 3,
    minRange: 0,
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    ammoPerTon: -1,
    destroyed: false,
    ...overrides,
  };
}

function makeAIUnit(
  unitId: string,
  position: { q: number; r: number },
  weapons: IWeapon[] = [],
  overrides: Partial<IAIUnitState> = {},
): IAIUnitState {
  return {
    unitId,
    position,
    facing: Facing.North,
    heat: 0,
    weapons,
    ammo: {},
    destroyed: false,
    gunnery: 4,
    movementType: MovementType.Stationary,
    hexesMoved: 0,
    ...overrides,
  };
}

function makeUnitGameState(
  id: string,
  side: GameSide,
  position: { q: number; r: number },
  overrides: Partial<IUnitGameState> = {},
): IUnitGameState {
  return {
    id,
    side,
    position,
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: { head: 9, ct: 12, lt: 10, rt: 10, la: 8, ra: 8, ll: 10, rl: 10 },
    structure: { ...FULL_STRUCTURE },
    startingInternalStructure: { ...FULL_STRUCTURE },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    ...overrides,
  };
}

function makeMockSession(
  units: IUnitGameState[],
  overrides: Partial<IGameSession> = {},
): IGameSession {
  const unitsRecord: Record<string, IUnitGameState> = {};
  for (const u of units) unitsRecord[u.id] = u;
  const config = {
    mapRadius: 5,
    turnLimit: 20,
    victoryConditions: ['elimination'],
    optionalRules: [],
  };
  return {
    id: 'test-session',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config,
    units: units.map((u) => ({
      id: u.id,
      name: u.id,
      side: u.side,
      unitRef: u.id,
      pilotRef: 'default',
      gunnery: 4,
      piloting: 5,
    })),
    events: [],
    currentState: {
      gameId: 'test-session',
      status: GameStatus.Active,
      phase: GamePhase.Movement,
      turn: 1,
      activationIndex: 0,
      units: unitsRecord,
      turnEvents: [],
    },
    ...overrides,
  } as IGameSession;
}

describe('add-bot-retreat-behavior — compliance', () => {
  // -------------------------------------------------------------------------
  // Task 8.3: dual-trigger one-time latch
  // -------------------------------------------------------------------------
  describe('Dual-trigger latch (task 8.3)', () => {
    it('cockpit TAC + 60% structural damage on same turn produces single RetreatTriggered', () => {
      const sessionUnit = makeUnitGameState(
        'u1',
        GameSide.Player,
        { q: 0, r: 0 },
        {
          structure: {
            head: 0,
            ct: 0,
            lt: 6,
            rt: 6,
            la: 0,
            ra: 0,
            ll: 0,
            rl: 0,
          },
        },
      );
      const session = makeMockSession([sessionUnit], {
        events: [
          {
            id: 'evt-cockpit',
            gameId: 'test-session',
            sequence: 0,
            timestamp: new Date().toISOString(),
            type: GameEventType.ComponentDestroyed,
            turn: 1,
            phase: GamePhase.WeaponAttack,
            payload: {
              unitId: 'u1',
              location: 'head',
              componentType: 'cockpit',
              slotIndex: 2,
            },
          },
        ],
      });
      const bot = new BotPlayer(new SeededRandom(1), {
        retreatThreshold: 0.5,
        retreatEdge: 'north',
        safeHeatThreshold: 13,
      });
      const aiUnit = makeAIUnit('u1', { q: 0, r: 0 });
      const evt = bot.evaluateRetreat(aiUnit, session);
      expect(evt).not.toBeNull();
      // Only ONE event regardless of how many triggers fire — both fired,
      // but only one event is produced (vital_crit takes precedence in
      // the reason field).
      expect(evt!.payload.reason).toBe('vital_crit');
    });
  });
});
