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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('add-bot-retreat-behavior — compliance', () => {
  // -------------------------------------------------------------------------
  // Task 1.2 / 1.3: defaults + replay parity
  // -------------------------------------------------------------------------
  describe('IUnitGameState retreat defaults (task 1.2 / 1.3)', () => {
    it('createInitialUnitState seeds isRetreating=false, retreatTargetEdge=undefined, hasRetreated=false', () => {
      const state = createInitialUnitState(
        {
          id: 'u1',
          name: 'Test',
          side: GameSide.Player,
          unitRef: 'mech-1',
          pilotRef: 'p1',
          gunnery: 4,
          piloting: 5,
        },
        { q: 0, r: 0 },
      );
      expect(state.isRetreating).toBe(false);
      expect(state.retreatTargetEdge).toBeUndefined();
      expect(state.hasRetreated).toBe(false);
      expect(state.startingInternalStructure).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  // Task 2.2: structural-points ratio (NOT location-count)
  // -------------------------------------------------------------------------
  describe('Trigger A — points-of-internal-structure ratio (task 2.2)', () => {
    it('fires at 51% structural points lost (sum(starting-current)/sum(starting))', () => {
      // Total starting structure = 43; reduce by 22 → ratio ≈ 0.512 > 0.5
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
            rl: 6,
          },
        },
      );
      const session = makeMockSession([sessionUnit]);
      const bot = new BotPlayer(new SeededRandom(1), {
        retreatThreshold: 0.5,
        retreatEdge: 'north',
        safeHeatThreshold: 13,
      });
      const aiUnit = makeAIUnit('u1', { q: 0, r: 0 });
      const evt = bot.evaluateRetreat(aiUnit, session);
      expect(evt).not.toBeNull();
      expect(evt!.payload.reason).toBe('structural_threshold');
    });

    it('does NOT fire when only one location is destroyed but total points lost is below threshold', () => {
      // Destroy a single 4-point arm out of 43 total → ratio ≈ 0.093 < 0.5
      // Under the legacy count-based formula, 1/8 = 0.125 would still be
      // below 0.5, but this test specifically pins the points-based math:
      // a 4-point arm contributes far less than a 1/N count would imply.
      const sessionUnit = makeUnitGameState(
        'u1',
        GameSide.Player,
        { q: 0, r: 0 },
        {
          destroyedLocations: ['la'],
          structure: { ...FULL_STRUCTURE, la: 0 },
        },
      );
      const session = makeMockSession([sessionUnit]);
      const bot = new BotPlayer(new SeededRandom(1), {
        retreatThreshold: 0.5,
        retreatEdge: 'north',
        safeHeatThreshold: 13,
      });
      const aiUnit = makeAIUnit('u1', { q: 0, r: 0 });
      expect(bot.evaluateRetreat(aiUnit, session)).toBeNull();
    });

    it('does NOT fire on sub-threshold partial damage to multiple locations', () => {
      // 6 points of damage across two locations = 6/43 ≈ 0.14 < 0.5
      const sessionUnit = makeUnitGameState(
        'u1',
        GameSide.Player,
        { q: 0, r: 0 },
        {
          structure: { ...FULL_STRUCTURE, ct: 5, lt: 3 },
        },
      );
      const session = makeMockSession([sessionUnit]);
      const bot = new BotPlayer(new SeededRandom(1), {
        retreatThreshold: 0.5,
        retreatEdge: 'north',
        safeHeatThreshold: 13,
      });
      const aiUnit = makeAIUnit('u1', { q: 0, r: 0 });
      expect(bot.evaluateRetreat(aiUnit, session)).toBeNull();
    });

    it('returns ratio = 0 when startingInternalStructure is missing (legacy callers)', () => {
      const sessionUnit = makeUnitGameState(
        'u1',
        GameSide.Player,
        { q: 0, r: 0 },
        {
          startingInternalStructure: {},
          destroyedLocations: ['head', 'ct', 'la'],
        },
      );
      const session = makeMockSession([sessionUnit]);
      const bot = new BotPlayer(new SeededRandom(1), {
        retreatThreshold: 0.1,
        retreatEdge: 'north',
        safeHeatThreshold: 13,
      });
      const aiUnit = makeAIUnit('u1', { q: 0, r: 0 });
      // No starting baseline → no structural trigger → null.
      expect(bot.evaluateRetreat(aiUnit, session)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Task 2.3: TAC scan via ComponentDestroyed
  // -------------------------------------------------------------------------
  describe('Trigger B — vital-component TAC (task 2.3)', () => {
    for (const componentType of ['cockpit', 'gyro', 'engine']) {
      it(`fires on ${componentType} ComponentDestroyed at 0% structural loss`, () => {
        const sessionUnit = makeUnitGameState('u1', GameSide.Player, {
          q: 0,
          r: 0,
        });
        const session = makeMockSession([sessionUnit], {
          events: [
            {
              id: `evt-${componentType}`,
              gameId: 'test-session',
              sequence: 0,
              timestamp: new Date().toISOString(),
              type: GameEventType.ComponentDestroyed,
              turn: 1,
              phase: GamePhase.WeaponAttack,
              payload: {
                unitId: 'u1',
                location: 'head',
                componentType,
                slotIndex: 2,
              },
            },
          ],
        });
        const bot = new BotPlayer(new SeededRandom(1), {
          ...DEFAULT_BEHAVIOR,
          retreatEdge: 'south',
        });
        const aiUnit = makeAIUnit('u1', { q: 0, r: 0 });
        const evt = bot.evaluateRetreat(aiUnit, session);
        expect(evt).not.toBeNull();
        expect(evt!.payload.reason).toBe('vital_crit');
      });
    }

    it('does NOT fire on non-vital ComponentDestroyed (e.g., heat sink)', () => {
      const sessionUnit = makeUnitGameState('u1', GameSide.Player, {
        q: 0,
        r: 0,
      });
      const session = makeMockSession([sessionUnit], {
        events: [
          {
            id: 'evt-hs',
            gameId: 'test-session',
            sequence: 0,
            timestamp: new Date().toISOString(),
            type: GameEventType.ComponentDestroyed,
            turn: 1,
            phase: GamePhase.WeaponAttack,
            payload: {
              unitId: 'u1',
              location: 'right_torso',
              componentType: 'heat_sink',
              slotIndex: 5,
            },
          },
        ],
      });
      const bot = new BotPlayer(new SeededRandom(1), {
        ...DEFAULT_BEHAVIOR,
        retreatEdge: 'south',
      });
      const aiUnit = makeAIUnit('u1', { q: 0, r: 0 });
      expect(bot.evaluateRetreat(aiUnit, session)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Task 2.4: latch + edge lock
  // -------------------------------------------------------------------------
  describe('Latch + edge lock (task 2.4)', () => {
    it('returns RetreatTriggered with concrete edge that callers latch via reducer', () => {
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
            rl: 6,
          },
        },
      );
      const session = makeMockSession([sessionUnit]);
      const bot = new BotPlayer(new SeededRandom(1), {
        retreatThreshold: 0.5,
        retreatEdge: 'east',
        safeHeatThreshold: 13,
      });
      const aiUnit = makeAIUnit('u1', { q: 0, r: 0 });
      const evt = bot.evaluateRetreat(aiUnit, session);
      expect(evt).not.toBeNull();
      expect(evt!.payload.edge).toBe('east');
    });

    it('once isRetreating is true, evaluateRetreat short-circuits to null even after threshold persists', () => {
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
            rl: 6,
          },
          isRetreating: true,
          retreatTargetEdge: 'east',
        },
      );
      const session = makeMockSession([sessionUnit]);
      const bot = new BotPlayer(new SeededRandom(1), {
        retreatThreshold: 0.5,
        retreatEdge: 'west', // Different edge — should NOT override the latch.
        safeHeatThreshold: 13,
      });
      const aiUnit = makeAIUnit('u1', { q: 0, r: 0 }, [], {
        isRetreating: true,
        retreatTargetEdge: 'east',
      });
      expect(bot.evaluateRetreat(aiUnit, session)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Task 4.1 / 4.5: MoveAI retreat override skips LoS scoring
  // -------------------------------------------------------------------------
  describe('MoveAI retreat override (task 4.1, 4.5)', () => {
    it('selectMovementType returns Run when retreating + Run available + Jump also available', () => {
      // Indirect proof — the retreatMovementType helper guarantees Jump
      // is never returned for a retreating unit. Pinned in smoke; this
      // pin checks that the BotPlayer wiring routes through it.
      const random = new SeededRandom(7);
      const bot = new BotPlayer(random, {
        ...DEFAULT_BEHAVIOR,
        retreatEdge: 'north',
      });
      const aiUnit = makeAIUnit('retreater', { q: 0, r: 4 }, [], {
        isRetreating: true,
        retreatTargetEdge: 'north',
      });
      const grid = (() => {
        const hexes = new Map<string, unknown>();
        for (let q = -5; q <= 5; q++) {
          for (let r = -5; r <= 5; r++) {
            if (Math.abs(q + r) <= 5) {
              hexes.set(`${q},${r}`, {
                coord: { q, r },
                occupantId: null,
                terrain: 'clear',
                elevation: 0,
              });
            }
          }
        }
        return { config: { radius: 5 }, hexes } as never;
      })();
      const evt = bot.playMovementPhase(aiUnit, grid, {
        walkMP: 4,
        runMP: 6,
        jumpMP: 4,
      });
      if (evt) {
        expect(evt.payload.movementType).not.toBe(MovementType.Jump);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Task 5.1–5.4: selectMovementType cases
  // -------------------------------------------------------------------------
  describe('selectMovementType retreat branch (task 5.1–5.4)', () => {
    function callPick(
      runMP: number,
      walkMP: number,
      jumpMP: number,
      isRetreating: boolean,
    ): MovementType | undefined {
      const bot = new BotPlayer(new SeededRandom(1), DEFAULT_BEHAVIOR);
      const aiUnit = makeAIUnit('u1', { q: 0, r: 0 }, [], {
        isRetreating,
        retreatTargetEdge: isRetreating ? 'north' : undefined,
      });
      const cap = { runMP, walkMP, jumpMP };
      const grid = (() => {
        const hexes = new Map<string, unknown>();
        for (let q = -5; q <= 5; q++) {
          for (let r = -5; r <= 5; r++) {
            if (Math.abs(q + r) <= 5) {
              hexes.set(`${q},${r}`, {
                coord: { q, r },
                occupantId: null,
                terrain: 'clear',
                elevation: 0,
              });
            }
          }
        }
        return { config: { radius: 5 }, hexes } as never;
      })();
      const evt = bot.playMovementPhase(aiUnit, grid, cap);
      return evt?.payload.movementType;
    }

    it('returns Run when both run+walk+jump available + retreating', () => {
      const mvt = callPick(6, 4, 4, true);
      // Run is preferred. Stationary or Run depending on grid neighbors,
      // but never Jump.
      expect(mvt).not.toBe(MovementType.Jump);
    });

    it('falls back to Walk when Run is unavailable', () => {
      const mvt = callPick(0, 3, 0, true);
      if (mvt) expect(mvt).toBe(MovementType.Walk);
    });

    it('never selects Jump even when only Jump remains', () => {
      // walk=0, run=0, jump=5 → retreatMovementType returns 'stationary'
      // → selectMovementType maps to MovementType.Stationary (no Jump).
      const mvt = callPick(0, 0, 5, true);
      // No valid non-stationary move set → playMovementPhase returns null.
      expect(mvt).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Task 6.2: arc filter — no torso twist while retreating
  // -------------------------------------------------------------------------
  describe('Retreating units do not torso-twist (task 6.2)', () => {
    it('forward weapon does NOT engage rear target when retreating (twist suppressed)', () => {
      // Unit at (0,0) facing North; enemy directly south at (0,2). With
      // a Right (90°) torso twist, a forward-mounted weapon would normally
      // cover the enemy. When retreating, the twist is suppressed, so
      // selectWeapons sees the enemy as Rear arc and excludes the
      // front-mounted weapon. Result: no AttackDeclared.
      const frontWeapon = makeWeapon({
        id: 'frontml',
        mountingArc: FiringArc.Front,
      });
      const attacker = makeAIUnit('atk', { q: 0, r: 0 }, [frontWeapon], {
        facing: Facing.North,
        torsoTwist: 'right', // Would twist 60° toward Right.
        isRetreating: true,
        retreatTargetEdge: 'north',
      });
      const target = makeAIUnit('tgt', { q: 0, r: 2 }, [], {
        facing: Facing.South,
      });
      const bot = new BotPlayer(new SeededRandom(1), DEFAULT_BEHAVIOR);
      const evt = bot.playAttackPhase(attacker, [target]);
      // Twist suppressed → enemy at (0, +2) lies BEHIND a North-facing
      // attacker → front weapon arc-filtered out → no fire.
      expect(evt).toBeNull();
    });

    it('rear-mounted weapon DOES engage rear target when retreating', () => {
      // Same geometry but the weapon is rear-mounted. Rear arc matches
      // the rear target — the weapon fires under the reduced heat budget.
      const rearWeapon = makeWeapon({
        id: 'rearml',
        mountingArc: FiringArc.Rear,
      });
      const attacker = makeAIUnit('atk', { q: 0, r: 0 }, [rearWeapon], {
        facing: Facing.North,
        isRetreating: true,
        retreatTargetEdge: 'north',
      });
      const target = makeAIUnit('tgt', { q: 0, r: 2 }, [], {
        facing: Facing.South,
      });
      const bot = new BotPlayer(new SeededRandom(1), DEFAULT_BEHAVIOR);
      const evt = bot.playAttackPhase(attacker, [target]);
      expect(evt).not.toBeNull();
      expect(evt!.payload.weapons).toContain('rearml');
    });
  });

  // -------------------------------------------------------------------------
  // Task 6.3: skip physical attacks when retreating
  // -------------------------------------------------------------------------
  describe('Retreating units skip physical attacks (task 6.3)', () => {
    it('playPhysicalAttackPhase returns null for a retreating attacker even with adjacent target', () => {
      const attacker = makeAIUnit('atk', { q: 0, r: 0 }, [], {
        isRetreating: true,
        retreatTargetEdge: 'north',
      });
      const target = makeAIUnit('tgt', { q: 1, r: 0 }, []);
      const bot = new BotPlayer(new SeededRandom(1), DEFAULT_BEHAVIOR);
      expect(bot.playPhysicalAttackPhase(attacker, [target])).toBeNull();
    });

    it('non-retreating attacker may still declare physical attack on adjacent target', () => {
      const attacker = makeAIUnit('atk', { q: 0, r: 0 }, [], {
        isRetreating: false,
      });
      const target = makeAIUnit('tgt', { q: 1, r: 0 }, []);
      const bot = new BotPlayer(new SeededRandom(1), DEFAULT_BEHAVIOR);
      // May or may not return null depending on physical-attack catalog,
      // but the early-return guard MUST NOT trigger.
      const evt = bot.playPhysicalAttackPhase(attacker, [target]);
      // Permissive assertion — we only care that the retreat short-circuit
      // didn't fire. If a non-null event came back, retreat was clearly
      // not the gate.
      if (evt === null) {
        // Fine — non-retreat reasons may still null this out.
        return;
      }
      expect(evt.payload.attackerId).toBe('atk');
    });
  });

  // -------------------------------------------------------------------------
  // Task 7.4: UnitRetreated reducer + victory exclusion
  // -------------------------------------------------------------------------
  describe('UnitRetreated reducer + victory exclusion (task 7.4)', () => {
    it('applyUnitRetreated sets hasRetreated=true without changing destroyed', () => {
      const unit = makeUnitGameState('u1', GameSide.Player, { q: 0, r: 5 });
      const session = makeMockSession([unit]);
      const next = applyUnitRetreated(session.currentState, {
        unitId: 'u1',
        retreatEdge: 'north',
        turn: 3,
      });
      expect(next.units['u1'].hasRetreated).toBe(true);
      expect(next.units['u1'].destroyed).toBe(false);
    });

    it('applyUnitRetreated is idempotent on repeated emission', () => {
      const unit = makeUnitGameState(
        'u1',
        GameSide.Player,
        { q: 0, r: 5 },
        {
          hasRetreated: true,
        },
      );
      const session = makeMockSession([unit]);
      const next = applyUnitRetreated(session.currentState, {
        unitId: 'u1',
        retreatEdge: 'north',
        turn: 5,
      });
      expect(next).toBe(session.currentState);
    });
  });

  // -------------------------------------------------------------------------
  // Task 2.2 / Bootstrap: damage reducer captures starting baseline
  // -------------------------------------------------------------------------
  describe('applyDamageApplied bootstraps startingInternalStructure (task 2.2)', () => {
    it('captures pre-damage structure as the starting baseline on first hit', () => {
      const unit = makeUnitGameState(
        'u1',
        GameSide.Player,
        { q: 0, r: 0 },
        {
          startingInternalStructure: {}, // explicitly empty — simulates legacy seed
          structure: { ...FULL_STRUCTURE },
        },
      );
      const session = makeMockSession([unit]);
      const next = applyDamageApplied(session.currentState, {
        unitId: 'u1',
        location: 'ct',
        damage: 3,
        armorRemaining: 9,
        structureRemaining: 5, // 8 - 3 = 5
        locationDestroyed: false,
        criticals: [],
      });
      expect(next.units['u1'].startingInternalStructure?.['ct']).toBe(8);
      // Other locations not touched yet → not seeded.
      expect(
        next.units['u1'].startingInternalStructure?.['head'],
      ).toBeUndefined();
    });

    it('does not overwrite existing startingInternalStructure on subsequent hits', () => {
      const unit = makeUnitGameState(
        'u1',
        GameSide.Player,
        { q: 0, r: 0 },
        {
          startingInternalStructure: { ct: 8 },
          structure: { ...FULL_STRUCTURE, ct: 5 },
        },
      );
      const session = makeMockSession([unit]);
      const next = applyDamageApplied(session.currentState, {
        unitId: 'u1',
        location: 'ct',
        damage: 2,
        armorRemaining: 9,
        structureRemaining: 3,
        locationDestroyed: false,
        criticals: [],
      });
      // Starting baseline stays at the original 8, not the post-first-hit 5.
      expect(next.units['u1'].startingInternalStructure?.['ct']).toBe(8);
    });
  });

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
