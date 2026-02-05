import type {
  IHexCoordinate,
  IMovementCapability,
  IHex,
  IHexGrid,
} from '@/types/gameplay';

import { Facing, MovementType, GameEventType } from '@/types/gameplay';

import { BotPlayer } from '../ai/BotPlayer';
import { type IAIUnitState, type IWeapon } from '../ai/types';
import { SeededRandom } from '../core/SeededRandom';

function createMockGrid(
  radius: number = 5,
  occupiedHexes: IHexCoordinate[] = [],
): IHexGrid {
  const hexes = new Map<string, IHex>();
  const occupiedSet = new Set(occupiedHexes.map((c) => `${c.q},${c.r}`));

  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) {
        const key = `${q},${r}`;
        hexes.set(key, {
          coord: { q, r },
          occupantId: occupiedSet.has(key) ? 'occupied' : null,
          terrain: 'clear',
          elevation: 0,
        });
      }
    }
  }

  return {
    config: { radius },
    hexes,
  };
}

function createMockWeapon(overrides: Partial<IWeapon> = {}): IWeapon {
  return {
    id: 'weapon-1',
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
    ...overrides,
  };
}

function createMockUnit(overrides: Partial<IAIUnitState> = {}): IAIUnitState {
  return {
    unitId: 'unit-1',
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    weapons: [createMockWeapon()],
    ammo: {},
    destroyed: false,
    gunnery: 4,
    movementType: MovementType.Stationary,
    hexesMoved: 0,
    ...overrides,
  };
}

function createMovementCapability(
  walkMP: number = 4,
  jumpMP: number = 0,
): IMovementCapability {
  return {
    walkMP,
    runMP: Math.ceil(walkMP * 1.5),
    jumpMP,
  };
}

describe('BotPlayer', () => {
  describe('constructor', () => {
    it('should create with default behavior', () => {
      const random = new SeededRandom(12345);
      const bot = new BotPlayer(random);

      expect(bot).toBeDefined();
    });

    it('should create with custom behavior', () => {
      const random = new SeededRandom(12345);
      const behavior = { retreatThreshold: 0.5, retreatEdge: 'north' as const };
      const bot = new BotPlayer(random, behavior);

      expect(bot).toBeDefined();
    });
  });

  describe('playMovementPhase', () => {
    it('should generate movement event when valid moves exist', () => {
      const random = new SeededRandom(12345);
      const bot = new BotPlayer(random);
      const grid = createMockGrid(10);
      const unit = createMockUnit({ position: { q: 0, r: 0 } });
      const capability = createMovementCapability(4);

      const event = bot.playMovementPhase(unit, grid, capability);

      expect(event).not.toBeNull();
      expect(event?.type).toBe(GameEventType.MovementDeclared);
      expect(event?.payload).toBeDefined();
    });

    it('should return null when unit has no valid moves', () => {
      const random = new SeededRandom(12345);
      const bot = new BotPlayer(random);
      const grid = createMockGrid(1, [
        { q: 0, r: -1 },
        { q: 1, r: -1 },
        { q: 1, r: 0 },
        { q: 0, r: 1 },
        { q: -1, r: 1 },
        { q: -1, r: 0 },
      ]);
      const unit = createMockUnit({ position: { q: 0, r: 0 } });
      const capability = createMovementCapability(1);

      const event = bot.playMovementPhase(unit, grid, capability);

      expect(event).toBeNull();
    });

    it('should be deterministic with same seed', () => {
      const grid = createMockGrid(10);
      const unit = createMockUnit({ position: { q: 0, r: 0 } });
      const capability = createMovementCapability(4);

      const random1 = new SeededRandom(54321);
      const bot1 = new BotPlayer(random1);
      const event1 = bot1.playMovementPhase(unit, grid, capability);

      const random2 = new SeededRandom(54321);
      const bot2 = new BotPlayer(random2);
      const event2 = bot2.playMovementPhase(unit, grid, capability);

      expect(event1?.payload).toEqual(event2?.payload);
    });

    it('should handle destroyed unit gracefully', () => {
      const random = new SeededRandom(12345);
      const bot = new BotPlayer(random);
      const grid = createMockGrid(10);
      const unit = createMockUnit({ destroyed: true });
      const capability = createMovementCapability(4);

      const event = bot.playMovementPhase(unit, grid, capability);

      expect(event).toBeNull();
    });
  });

  describe('playAttackPhase', () => {
    it('should generate attack event when valid targets exist', () => {
      const random = new SeededRandom(12345);
      const bot = new BotPlayer(random);
      const attacker = createMockUnit({
        unitId: 'attacker',
        position: { q: 0, r: 0 },
        weapons: [createMockWeapon({ longRange: 9 })],
      });
      const targets = [
        createMockUnit({ unitId: 'target', position: { q: 5, r: 0 } }),
      ];

      const event = bot.playAttackPhase(attacker, targets);

      expect(event).not.toBeNull();
      expect(event?.type).toBe(GameEventType.AttackDeclared);
      expect(event?.payload).toBeDefined();
    });

    it('should return null when no valid targets', () => {
      const random = new SeededRandom(12345);
      const bot = new BotPlayer(random);
      const attacker = createMockUnit({
        unitId: 'attacker',
        position: { q: 0, r: 0 },
        weapons: [createMockWeapon({ longRange: 3 })],
      });
      const targets = [
        createMockUnit({ unitId: 'target', position: { q: 20, r: 0 } }),
      ];

      const event = bot.playAttackPhase(attacker, targets);

      expect(event).toBeNull();
    });

    it('should return null when attacker has no weapons', () => {
      const random = new SeededRandom(12345);
      const bot = new BotPlayer(random);
      const attacker = createMockUnit({
        unitId: 'attacker',
        position: { q: 0, r: 0 },
        weapons: [],
      });
      const targets = [
        createMockUnit({ unitId: 'target', position: { q: 5, r: 0 } }),
      ];

      const event = bot.playAttackPhase(attacker, targets);

      expect(event).toBeNull();
    });

    it('should be deterministic with same seed', () => {
      const attacker = createMockUnit({
        unitId: 'attacker',
        position: { q: 0, r: 0 },
        weapons: [createMockWeapon({ longRange: 9 })],
      });
      const targets = [
        createMockUnit({ unitId: 'target-1', position: { q: 3, r: 0 } }),
        createMockUnit({ unitId: 'target-2', position: { q: 5, r: 0 } }),
        createMockUnit({ unitId: 'target-3', position: { q: 7, r: 0 } }),
      ];

      const random1 = new SeededRandom(54321);
      const bot1 = new BotPlayer(random1);
      const event1 = bot1.playAttackPhase(attacker, targets);

      const random2 = new SeededRandom(54321);
      const bot2 = new BotPlayer(random2);
      const event2 = bot2.playAttackPhase(attacker, targets);

      expect(event1?.payload).toEqual(event2?.payload);
    });

    it('should handle destroyed attacker gracefully', () => {
      const random = new SeededRandom(12345);
      const bot = new BotPlayer(random);
      const attacker = createMockUnit({
        unitId: 'attacker',
        destroyed: true,
      });
      const targets = [
        createMockUnit({ unitId: 'target', position: { q: 5, r: 0 } }),
      ];

      const event = bot.playAttackPhase(attacker, targets);

      expect(event).toBeNull();
    });

    it('should select weapons that can reach the target', () => {
      const random = new SeededRandom(12345);
      const bot = new BotPlayer(random);
      const attacker = createMockUnit({
        unitId: 'attacker',
        position: { q: 0, r: 0 },
        weapons: [
          createMockWeapon({ id: 'short', longRange: 3 }),
          createMockWeapon({ id: 'long', longRange: 15 }),
        ],
      });
      const targets = [
        createMockUnit({ unitId: 'target', position: { q: 10, r: 0 } }),
      ];

      const event = bot.playAttackPhase(attacker, targets);

      expect(event).not.toBeNull();
      const payload = event?.payload as { weapons: readonly string[] };
      expect(payload.weapons).toContain('long');
      expect(payload.weapons).not.toContain('short');
    });
  });

  describe('edge cases', () => {
    it('should handle empty target list gracefully', () => {
      const random = new SeededRandom(12345);
      const bot = new BotPlayer(random);
      const attacker = createMockUnit();

      const event = bot.playAttackPhase(attacker, []);

      expect(event).toBeNull();
    });

    it('should not target self', () => {
      const random = new SeededRandom(12345);
      const bot = new BotPlayer(random);
      const attacker = createMockUnit({
        unitId: 'self',
        position: { q: 0, r: 0 },
      });
      const targets = [
        createMockUnit({ unitId: 'self', position: { q: 0, r: 0 } }),
      ];

      const event = bot.playAttackPhase(attacker, targets);

      expect(event).toBeNull();
    });

    it('should not attack destroyed targets', () => {
      const random = new SeededRandom(12345);
      const bot = new BotPlayer(random);
      const attacker = createMockUnit({
        unitId: 'attacker',
        position: { q: 0, r: 0 },
      });
      const targets = [
        createMockUnit({
          unitId: 'target',
          position: { q: 5, r: 0 },
          destroyed: true,
        }),
      ];

      const event = bot.playAttackPhase(attacker, targets);

      expect(event).toBeNull();
    });
  });
});
