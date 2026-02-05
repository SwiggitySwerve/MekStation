/**
 * Damage Attribution Tests
 * Tests for sourceUnitId, attackId, and killerUnitId fields in damage events.
 */

import {
  IDamageAppliedPayload,
  IUnitDestroyedPayload,
} from '../GameSessionInterfaces';

describe('Damage Attribution Fields', () => {
  describe('IDamageAppliedPayload', () => {
    it('should accept sourceUnitId field', () => {
      const payload: IDamageAppliedPayload = {
        unitId: 'unit-1',
        location: 'center_torso',
        damage: 10,
        armorRemaining: 5,
        structureRemaining: 8,
        locationDestroyed: false,
        sourceUnitId: 'unit-2',
      };

      expect(payload.sourceUnitId).toBe('unit-2');
    });

    it('should accept attackId field', () => {
      const payload: IDamageAppliedPayload = {
        unitId: 'unit-1',
        location: 'center_torso',
        damage: 10,
        armorRemaining: 5,
        structureRemaining: 8,
        locationDestroyed: false,
        attackId: 'attack-123',
      };

      expect(payload.attackId).toBe('attack-123');
    });

    it('should accept both sourceUnitId and attackId together', () => {
      const payload: IDamageAppliedPayload = {
        unitId: 'unit-1',
        location: 'center_torso',
        damage: 10,
        armorRemaining: 5,
        structureRemaining: 8,
        locationDestroyed: false,
        sourceUnitId: 'unit-2',
        attackId: 'attack-123',
      };

      expect(payload.sourceUnitId).toBe('unit-2');
      expect(payload.attackId).toBe('attack-123');
    });

    it('should allow sourceUnitId to be undefined (self-damage)', () => {
      const payload: IDamageAppliedPayload = {
        unitId: 'unit-1',
        location: 'center_torso',
        damage: 10,
        armorRemaining: 5,
        structureRemaining: 8,
        locationDestroyed: false,
        sourceUnitId: undefined,
      };

      expect(payload.sourceUnitId).toBeUndefined();
    });

    it('should allow attackId to be undefined', () => {
      const payload: IDamageAppliedPayload = {
        unitId: 'unit-1',
        location: 'center_torso',
        damage: 10,
        armorRemaining: 5,
        structureRemaining: 8,
        locationDestroyed: false,
        attackId: undefined,
      };

      expect(payload.attackId).toBeUndefined();
    });

    it('should work without sourceUnitId or attackId (backward compatible)', () => {
      const payload: IDamageAppliedPayload = {
        unitId: 'unit-1',
        location: 'center_torso',
        damage: 10,
        armorRemaining: 5,
        structureRemaining: 8,
        locationDestroyed: false,
      };

      expect(payload.sourceUnitId).toBeUndefined();
      expect(payload.attackId).toBeUndefined();
    });

    it('should preserve existing fields when adding attribution fields', () => {
      const payload: IDamageAppliedPayload = {
        unitId: 'unit-1',
        location: 'center_torso',
        damage: 10,
        armorRemaining: 5,
        structureRemaining: 8,
        locationDestroyed: false,
        criticals: ['ammo_explosion'],
        sourceUnitId: 'unit-2',
        attackId: 'attack-123',
      };

      expect(payload.unitId).toBe('unit-1');
      expect(payload.location).toBe('center_torso');
      expect(payload.damage).toBe(10);
      expect(payload.armorRemaining).toBe(5);
      expect(payload.structureRemaining).toBe(8);
      expect(payload.locationDestroyed).toBe(false);
      expect(payload.criticals).toEqual(['ammo_explosion']);
      expect(payload.sourceUnitId).toBe('unit-2');
      expect(payload.attackId).toBe('attack-123');
    });
  });

  describe('IUnitDestroyedPayload', () => {
    it('should accept killerUnitId field', () => {
      const payload: IUnitDestroyedPayload = {
        unitId: 'unit-1',
        cause: 'damage',
        killerUnitId: 'unit-2',
      };

      expect(payload.killerUnitId).toBe('unit-2');
    });

    it('should allow killerUnitId to be undefined (self-destruction)', () => {
      const payload: IUnitDestroyedPayload = {
        unitId: 'unit-1',
        cause: 'ammo_explosion',
        killerUnitId: undefined,
      };

      expect(payload.killerUnitId).toBeUndefined();
    });

    it('should work without killerUnitId (backward compatible)', () => {
      const payload: IUnitDestroyedPayload = {
        unitId: 'unit-1',
        cause: 'pilot_death',
      };

      expect(payload.killerUnitId).toBeUndefined();
    });

    it('should preserve existing fields when adding killerUnitId', () => {
      const payload: IUnitDestroyedPayload = {
        unitId: 'unit-1',
        cause: 'damage',
        killerUnitId: 'unit-2',
      };

      expect(payload.unitId).toBe('unit-1');
      expect(payload.cause).toBe('damage');
      expect(payload.killerUnitId).toBe('unit-2');
    });

    it('should support all destruction causes with killerUnitId', () => {
      const causes: Array<
        'damage' | 'ammo_explosion' | 'pilot_death' | 'shutdown'
      > = ['damage', 'ammo_explosion', 'pilot_death', 'shutdown'];

      causes.forEach((cause) => {
        const payload: IUnitDestroyedPayload = {
          unitId: 'unit-1',
          cause,
          killerUnitId: cause === 'damage' ? 'unit-2' : undefined,
        };

        expect(payload.cause).toBe(cause);
      });
    });
  });

  describe('Attribution Tracking Scenarios', () => {
    it('should track weapon attack damage attribution', () => {
      const damagePayload: IDamageAppliedPayload = {
        unitId: 'target-unit',
        location: 'right_arm',
        damage: 15,
        armorRemaining: 3,
        structureRemaining: 10,
        locationDestroyed: false,
        sourceUnitId: 'attacker-unit',
        attackId: 'attack-001',
      };

      expect(damagePayload.sourceUnitId).toBe('attacker-unit');
      expect(damagePayload.attackId).toBe('attack-001');
    });

    it('should track ammo explosion self-damage (no sourceUnitId)', () => {
      const damagePayload: IDamageAppliedPayload = {
        unitId: 'unit-1',
        location: 'right_torso',
        damage: 20,
        armorRemaining: 0,
        structureRemaining: 5,
        locationDestroyed: true,
        // sourceUnitId is undefined for self-damage
      };

      expect(damagePayload.sourceUnitId).toBeUndefined();
    });

    it('should track falling damage (no sourceUnitId)', () => {
      const damagePayload: IDamageAppliedPayload = {
        unitId: 'unit-1',
        location: 'left_leg',
        damage: 5,
        armorRemaining: 8,
        structureRemaining: 9,
        locationDestroyed: false,
        // sourceUnitId is undefined for environmental damage
      };

      expect(damagePayload.sourceUnitId).toBeUndefined();
    });

    it('should track unit destruction with killer attribution', () => {
      const destroyedPayload: IUnitDestroyedPayload = {
        unitId: 'target-unit',
        cause: 'damage',
        killerUnitId: 'attacker-unit',
      };

      expect(destroyedPayload.killerUnitId).toBe('attacker-unit');
    });

    it('should track unit destruction from ammo explosion (no killer)', () => {
      const destroyedPayload: IUnitDestroyedPayload = {
        unitId: 'unit-1',
        cause: 'ammo_explosion',
        // killerUnitId is undefined for self-destruction
      };

      expect(destroyedPayload.killerUnitId).toBeUndefined();
    });
  });
});
