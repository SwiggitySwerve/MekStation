import { Facing, MovementType } from '@/types/gameplay';

import type { IAIUnitState, IWeapon } from '../ai/types';

import { AttackAI } from '../ai/AttackAI';
import { SeededRandom } from '../core/SeededRandom';

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

describe('AttackAI', () => {
  describe('getValidTargets', () => {
    it('should return targets within weapon range', () => {
      const attackAI = new AttackAI();
      const attacker = createMockUnit({
        position: { q: 0, r: 0 },
        weapons: [createMockWeapon({ longRange: 9 })],
      });
      const targets: IAIUnitState[] = [
        createMockUnit({ unitId: 'target-1', position: { q: 3, r: 0 } }),
        createMockUnit({ unitId: 'target-2', position: { q: 6, r: 0 } }),
        createMockUnit({ unitId: 'target-3', position: { q: 9, r: 0 } }),
      ];

      const validTargets = attackAI.getValidTargets(attacker, targets);

      expect(validTargets.length).toBe(3);
    });

    it('should filter out targets beyond weapon range', () => {
      const attackAI = new AttackAI();
      const attacker = createMockUnit({
        position: { q: 0, r: 0 },
        weapons: [createMockWeapon({ longRange: 5 })],
      });
      const targets: IAIUnitState[] = [
        createMockUnit({ unitId: 'target-1', position: { q: 3, r: 0 } }),
        createMockUnit({ unitId: 'target-2', position: { q: 10, r: 0 } }),
      ];

      const validTargets = attackAI.getValidTargets(attacker, targets);

      expect(validTargets.length).toBe(1);
      expect(validTargets[0].unitId).toBe('target-1');
    });

    it('should filter out destroyed targets', () => {
      const attackAI = new AttackAI();
      const attacker = createMockUnit({ position: { q: 0, r: 0 } });
      const targets: IAIUnitState[] = [
        createMockUnit({
          unitId: 'alive',
          position: { q: 3, r: 0 },
          destroyed: false,
        }),
        createMockUnit({
          unitId: 'dead',
          position: { q: 3, r: 0 },
          destroyed: true,
        }),
      ];

      const validTargets = attackAI.getValidTargets(attacker, targets);

      expect(validTargets.length).toBe(1);
      expect(validTargets[0].unitId).toBe('alive');
    });

    it('should return empty array when no weapons can reach any target', () => {
      const attackAI = new AttackAI();
      const attacker = createMockUnit({
        position: { q: 0, r: 0 },
        weapons: [createMockWeapon({ longRange: 2 })],
      });
      const targets: IAIUnitState[] = [
        createMockUnit({ unitId: 'target-1', position: { q: 10, r: 0 } }),
      ];

      const validTargets = attackAI.getValidTargets(attacker, targets);

      expect(validTargets.length).toBe(0);
    });

    it('should return empty array when attacker has no weapons', () => {
      const attackAI = new AttackAI();
      const attacker = createMockUnit({
        position: { q: 0, r: 0 },
        weapons: [],
      });
      const targets: IAIUnitState[] = [
        createMockUnit({ unitId: 'target-1', position: { q: 3, r: 0 } }),
      ];

      const validTargets = attackAI.getValidTargets(attacker, targets);

      expect(validTargets.length).toBe(0);
    });

    it('should filter out self from targets', () => {
      const attackAI = new AttackAI();
      const attacker = createMockUnit({
        unitId: 'self',
        position: { q: 0, r: 0 },
      });
      const targets: IAIUnitState[] = [
        createMockUnit({ unitId: 'self', position: { q: 0, r: 0 } }),
        createMockUnit({ unitId: 'other', position: { q: 3, r: 0 } }),
      ];

      const validTargets = attackAI.getValidTargets(attacker, targets);

      expect(validTargets.length).toBe(1);
      expect(validTargets[0].unitId).toBe('other');
    });
  });

  describe('selectTarget', () => {
    it('should return a target from the provided list', () => {
      const attackAI = new AttackAI();
      const random = new SeededRandom(12345);
      const targets: IAIUnitState[] = [
        createMockUnit({ unitId: 'target-1' }),
        createMockUnit({ unitId: 'target-2' }),
        createMockUnit({ unitId: 'target-3' }),
      ];

      const selected = attackAI.selectTarget(targets, random);

      expect(selected).not.toBeNull();
      expect(targets.map((t) => t.unitId)).toContain(selected?.unitId);
    });

    it('should return null when no targets available', () => {
      const attackAI = new AttackAI();
      const random = new SeededRandom(12345);

      const selected = attackAI.selectTarget([], random);

      expect(selected).toBeNull();
    });

    it('should be deterministic with same seed', () => {
      const attackAI = new AttackAI();
      const targets: IAIUnitState[] = [
        createMockUnit({ unitId: 'target-1' }),
        createMockUnit({ unitId: 'target-2' }),
        createMockUnit({ unitId: 'target-3' }),
        createMockUnit({ unitId: 'target-4' }),
        createMockUnit({ unitId: 'target-5' }),
      ];

      const random1 = new SeededRandom(54321);
      const random2 = new SeededRandom(54321);

      const selected1 = attackAI.selectTarget(targets, random1);
      const selected2 = attackAI.selectTarget(targets, random2);

      expect(selected1?.unitId).toBe(selected2?.unitId);
    });

    it('should produce different results with different seeds', () => {
      const attackAI = new AttackAI();
      const targets: IAIUnitState[] = Array.from({ length: 20 }, (_, i) =>
        createMockUnit({ unitId: `target-${i}` }),
      );

      const results = new Set<string>();
      for (let seed = 0; seed < 100; seed++) {
        const random = new SeededRandom(seed);
        const selected = attackAI.selectTarget(targets, random);
        if (selected) {
          results.add(selected.unitId);
        }
      }

      expect(results.size).toBeGreaterThan(5);
    });
  });

  describe('selectWeapons', () => {
    it('should return all weapons in range', () => {
      const attackAI = new AttackAI();
      const attacker = createMockUnit({
        position: { q: 0, r: 0 },
        weapons: [
          createMockWeapon({ id: 'w1', longRange: 9 }),
          createMockWeapon({ id: 'w2', longRange: 9 }),
        ],
      });
      const target = createMockUnit({ position: { q: 5, r: 0 } });

      const weapons = attackAI.selectWeapons(attacker, target);

      expect(weapons.length).toBe(2);
    });

    it('should exclude weapons out of range', () => {
      const attackAI = new AttackAI();
      const attacker = createMockUnit({
        position: { q: 0, r: 0 },
        weapons: [
          createMockWeapon({ id: 'short', longRange: 3 }),
          createMockWeapon({ id: 'long', longRange: 15 }),
        ],
      });
      const target = createMockUnit({ position: { q: 10, r: 0 } });

      const weapons = attackAI.selectWeapons(attacker, target);

      expect(weapons.length).toBe(1);
      expect(weapons[0].id).toBe('long');
    });

    it('should exclude destroyed weapons', () => {
      const attackAI = new AttackAI();
      const attacker = createMockUnit({
        position: { q: 0, r: 0 },
        weapons: [
          createMockWeapon({ id: 'working', destroyed: false }),
          createMockWeapon({ id: 'broken', destroyed: true }),
        ],
      });
      const target = createMockUnit({ position: { q: 3, r: 0 } });

      const weapons = attackAI.selectWeapons(attacker, target);

      expect(weapons.length).toBe(1);
      expect(weapons[0].id).toBe('working');
    });

    it('should exclude weapons without ammo', () => {
      const attackAI = new AttackAI();
      const attacker = createMockUnit({
        position: { q: 0, r: 0 },
        weapons: [
          createMockWeapon({ id: 'laser', ammoPerTon: -1 }),
          createMockWeapon({ id: 'ac10', ammoPerTon: 10 }),
        ],
        ammo: { laser: -1, ac10: 0 },
      });
      const target = createMockUnit({ position: { q: 3, r: 0 } });

      const weapons = attackAI.selectWeapons(attacker, target);

      expect(weapons.length).toBe(1);
      expect(weapons[0].id).toBe('laser');
    });

    it('should include energy weapons regardless of ammo tracking', () => {
      const attackAI = new AttackAI();
      const attacker = createMockUnit({
        position: { q: 0, r: 0 },
        weapons: [createMockWeapon({ id: 'laser', ammoPerTon: -1 })],
        ammo: {},
      });
      const target = createMockUnit({ position: { q: 3, r: 0 } });

      const weapons = attackAI.selectWeapons(attacker, target);

      expect(weapons.length).toBe(1);
      expect(weapons[0].id).toBe('laser');
    });

    it('should include ballistic weapons with remaining ammo', () => {
      const attackAI = new AttackAI();
      const attacker = createMockUnit({
        position: { q: 0, r: 0 },
        weapons: [createMockWeapon({ id: 'ac10', ammoPerTon: 10 })],
        ammo: { ac10: 5 },
      });
      const target = createMockUnit({ position: { q: 3, r: 0 } });

      const weapons = attackAI.selectWeapons(attacker, target);

      expect(weapons.length).toBe(1);
      expect(weapons[0].id).toBe('ac10');
    });

    it('should return empty array when target is out of all weapon ranges', () => {
      const attackAI = new AttackAI();
      const attacker = createMockUnit({
        position: { q: 0, r: 0 },
        weapons: [createMockWeapon({ id: 'short', longRange: 3 })],
      });
      const target = createMockUnit({ position: { q: 20, r: 0 } });

      const weapons = attackAI.selectWeapons(attacker, target);

      expect(weapons.length).toBe(0);
    });
  });
});
