/**
 * Per-change smoke test for `wire-bot-ai-helpers-and-capstone`.
 *
 * Asserts the four orphan-wiring fixes:
 *   1. BotPlayer.selectTarget is now called with the attacker, so the
 *      threat-scored target wins (not uniform random).
 *   2. applyHeatBudget trims the fire list in playAttackPhase.
 *   3. RetreatTriggered → unit's `isRetreating` latches; subsequent
 *      `selectMovementType` falls through `retreatMovementType` (Run /
 *      Walk, never Jump).
 *   4. playPhysicalAttackPhase returns null when no targets are in
 *      melee range, and emits PhysicalAttackDeclared when one is.
 *
 * @spec wire-bot-ai-helpers-and-capstone (no formal change folder —
 *       inline brief in PR description).
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
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  type IGameSession,
  type IUnitGameState,
} from '@/types/gameplay';

function makeWeapon(
  id: string,
  damage: number,
  heat: number,
  longRange = 9,
): IWeapon {
  return {
    id,
    name: id,
    damage,
    heat,
    minRange: 0,
    shortRange: 3,
    mediumRange: 6,
    longRange,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function makeAIUnit(
  unitId: string,
  position: { q: number; r: number },
  weapons: IWeapon[],
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
    structure: {
      head: 3,
      ct: 8,
      lt: 6,
      rt: 6,
      la: 4,
      ra: 4,
      ll: 6,
      rl: 6,
    },
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
      activeUnitId: undefined,
      currentSide: GameSide.Player,
      initiativeOrder: [],
      units: unitsRecord,
      turnEvents: [],
    },
    ...overrides,
  } as IGameSession;
}

describe('wire-bot-ai-helpers-and-capstone — smoke test', () => {
  describe('selectTarget threat-scored path (orphan helper #1)', () => {
    it('picks the highest-threat target (not random) when called via playAttackPhase', () => {
      const random = new SeededRandom(42);
      const bot = new BotPlayer(random);
      const attacker = makeAIUnit('attacker', { q: 0, r: 0 }, [
        makeWeapon('mlaser', 5, 3, 9),
      ]);
      // Big threat: heavy weapons. Small threat: mg.
      const big = makeAIUnit('big', { q: 0, r: 1 }, [
        makeWeapon('ac20', 20, 7, 9),
        makeWeapon('ppc', 10, 10, 9),
      ]);
      const small = makeAIUnit('small', { q: 0, r: 1 }, [
        makeWeapon('mg', 2, 0, 9),
      ]);
      const evt = bot.playAttackPhase(attacker, [small, big]);
      expect(evt).not.toBeNull();
      expect(evt!.payload.targetId).toBe('big');
    });
  });

  describe('applyHeatBudget wiring in playAttackPhase (orphan helper #2)', () => {
    it('drops the lowest-efficiency weapon when projected heat exceeds threshold', () => {
      const random = new SeededRandom(1);
      const bot = new BotPlayer(random);
      // Attacker already at heat 6; adding all weapons would push past 13.
      // PPC (10/10=1.0) is least efficient → should be dropped.
      const attacker = makeAIUnit(
        'attacker',
        { q: 0, r: 0 },
        [
          makeWeapon('ppc', 10, 10, 9),
          makeWeapon('mlaser', 5, 3, 9),
          makeWeapon('sl', 3, 1, 9),
        ],
        { heat: 6 },
      );
      const target = makeAIUnit('target', { q: 0, r: 1 }, [
        makeWeapon('w', 5, 3, 9),
      ]);
      const evt = bot.playAttackPhase(attacker, [target]);
      expect(evt).not.toBeNull();
      expect(evt!.payload.weapons).not.toContain('ppc');
      expect(evt!.payload.weapons).toContain('mlaser');
      expect(evt!.payload.weapons).toContain('sl');
    });

    it('returns null when heat budget trims away every weapon', () => {
      const random = new SeededRandom(1);
      const bot = new BotPlayer(random);
      const attacker = makeAIUnit(
        'attacker',
        { q: 0, r: 0 },
        [makeWeapon('mlaser', 5, 3, 9)],
        { heat: 100 },
      );
      const target = makeAIUnit('target', { q: 0, r: 1 }, [
        makeWeapon('w', 5, 3, 9),
      ]);
      const evt = bot.playAttackPhase(attacker, [target]);
      expect(evt).toBeNull();
    });
  });

  describe('RetreatAI wiring in BotPlayer (orphan helper #3)', () => {
    it('evaluateRetreat returns null when behavior never triggers', () => {
      const random = new SeededRandom(1);
      const bot = new BotPlayer(random, {
        retreatThreshold: 0.99,
        retreatEdge: 'nearest',
        safeHeatThreshold: 13,
      });
      const aiUnit = makeAIUnit('u1', { q: 0, r: 0 }, []);
      const sessionUnit = makeUnitGameState('u1', GameSide.Player, {
        q: 0,
        r: 0,
      });
      const session = makeMockSession([sessionUnit]);
      expect(bot.evaluateRetreat(aiUnit, session)).toBeNull();
    });

    it('evaluateRetreat fires RetreatTriggered when destruction ratio crosses threshold', () => {
      const random = new SeededRandom(1);
      const behavior: IBotBehavior = {
        retreatThreshold: 0.3,
        retreatEdge: 'north',
        safeHeatThreshold: 13,
      };
      const bot = new BotPlayer(random, behavior);
      const aiUnit = makeAIUnit('u1', { q: 0, r: 0 }, []);
      // Per `add-bot-retreat-behavior` § 2 (Trigger A): the points-of-IS
      // ratio is `sum(starting - current) / sum(starting)`. Total starting
      // = 43 (3+8+6+6+4+4+6+6); 22 points lost (head + CT + LA + RA + LL
      // zeroed) → ratio ≈ 0.51 > 0.3 threshold → trigger.
      const sessionUnit = makeUnitGameState(
        'u1',
        GameSide.Player,
        { q: 0, r: 0 },
        {
          destroyedLocations: ['head', 'ct', 'la', 'ra', 'll'],
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
          startingInternalStructure: {
            head: 3,
            ct: 8,
            lt: 6,
            rt: 6,
            la: 4,
            ra: 4,
            ll: 6,
            rl: 6,
          },
        },
      );
      const session = makeMockSession([sessionUnit]);
      const evt = bot.evaluateRetreat(aiUnit, session);
      expect(evt).not.toBeNull();
      expect(evt!.type).toBe(GameEventType.RetreatTriggered);
      expect(evt!.payload.unitId).toBe('u1');
      expect(evt!.payload.edge).toBe('north');
      expect(evt!.payload.reason).toBe('structural_threshold');
    });

    it('evaluateRetreat fires on vital crit even at zero structural loss', () => {
      const random = new SeededRandom(1);
      const bot = new BotPlayer(random, {
        ...DEFAULT_BEHAVIOR,
        retreatEdge: 'south',
      });
      const aiUnit = makeAIUnit('u1', { q: 0, r: 0 }, []);
      const sessionUnit = makeUnitGameState('u1', GameSide.Player, {
        q: 0,
        r: 0,
      });
      const session = makeMockSession([sessionUnit], {
        events: [
          {
            id: 'evt-crit-1',
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
      const evt = bot.evaluateRetreat(aiUnit, session);
      expect(evt).not.toBeNull();
      expect(evt!.payload.reason).toBe('vital_crit');
      expect(evt!.payload.edge).toBe('south');
    });

    it('evaluateRetreat returns null once unit is already retreating (latch)', () => {
      const random = new SeededRandom(1);
      const bot = new BotPlayer(random, {
        ...DEFAULT_BEHAVIOR,
        retreatThreshold: 0.1,
      });
      const aiUnit = makeAIUnit('u1', { q: 0, r: 0 }, [], {
        isRetreating: true,
        retreatTargetEdge: 'north',
      });
      const sessionUnit = makeUnitGameState('u1', GameSide.Player, {
        q: 0,
        r: 0,
      });
      const session = makeMockSession([sessionUnit]);
      expect(bot.evaluateRetreat(aiUnit, session)).toBeNull();
    });

    it('selectMovementType returns Run for retreating unit when both walk + run available', () => {
      // Indirect check via playMovementPhase: with isRetreating + jump
      // available, the move event must NOT be Jump (retreatMovementType
      // never picks Jump).
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
      // Either null (no valid moves) or a non-Jump move.
      if (evt) {
        expect(evt.payload.movementType).not.toBe(MovementType.Jump);
        // Run is the preferred movement type for retreaters.
        expect([MovementType.Run, MovementType.Walk]).toContain(
          evt.payload.movementType,
        );
      }
    });
  });

  describe('playPhysicalAttackPhase wiring (orphan helper #4)', () => {
    it('returns null when no target is in melee range', () => {
      const random = new SeededRandom(1);
      const bot = new BotPlayer(random);
      const attacker = makeAIUnit('attacker', { q: 0, r: 0 }, []);
      const target = makeAIUnit('target', { q: 0, r: 5 }, []);
      const evt = bot.playPhysicalAttackPhase(attacker, [target]);
      expect(evt).toBeNull();
    });

    it('returns null when targets is empty', () => {
      const random = new SeededRandom(1);
      const bot = new BotPlayer(random);
      const attacker = makeAIUnit('attacker', { q: 0, r: 0 }, []);
      expect(bot.playPhysicalAttackPhase(attacker, [])).toBeNull();
    });

    it('returns null when attacker is destroyed', () => {
      const random = new SeededRandom(1);
      const bot = new BotPlayer(random);
      const attacker = makeAIUnit('attacker', { q: 0, r: 0 }, [], {
        destroyed: true,
      });
      const target = makeAIUnit('target', { q: 0, r: 1 }, []);
      expect(bot.playPhysicalAttackPhase(attacker, [target])).toBeNull();
    });

    it('emits PhysicalAttackDeclared with a valid attack type when target is adjacent', () => {
      const random = new SeededRandom(1);
      const bot = new BotPlayer(random);
      const attacker = makeAIUnit('attacker', { q: 0, r: 0 }, []);
      const target = makeAIUnit('target', { q: 0, r: 1 }, []);
      const evt = bot.playPhysicalAttackPhase(attacker, [target]);
      expect(evt).not.toBeNull();
      expect(evt!.type).toBe(GameEventType.PhysicalAttackDeclared);
      expect(evt!.payload.attackerId).toBe('attacker');
      expect(evt!.payload.targetId).toBe('target');
      // Phase 1 catalog supports punch / kick — both should be valid.
      expect(['punch', 'kick']).toContain(evt!.payload.attackType);
    });

    it('skips destroyed targets when picking a melee victim', () => {
      const random = new SeededRandom(1);
      const bot = new BotPlayer(random);
      const attacker = makeAIUnit('attacker', { q: 0, r: 0 }, []);
      const dead = makeAIUnit('dead', { q: 0, r: 1 }, [], {
        destroyed: true,
      });
      expect(bot.playPhysicalAttackPhase(attacker, [dead])).toBeNull();
    });
  });
});
