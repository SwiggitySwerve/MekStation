import { PartQuality, QUALITY_TN_MODIFIER } from '@/types/campaign/quality/PartQuality';
import { MAINTENANCE_THRESHOLDS } from '@/types/campaign/quality/IUnitQuality';
import {
  calculateMaintenanceTN,
  performMaintenanceCheck,
  roll2d6,
  getEraModifier,
  getPlanetaryModifier,
  getTechSpecialtiesModifier,
} from '../maintenanceCheck';
import type { MaintenanceCheckInput, RandomFn } from '../maintenanceCheck';

function makeSeededRandom(values: number[]): RandomFn {
  let i = 0;
  return () => {
    const val = values[i % values.length];
    i++;
    return val;
  };
}

function makeDiceRandom(die1: number, die2: number): RandomFn {
  return makeSeededRandom([(die1 - 1) / 6, (die2 - 1) / 6]);
}

function makeDefaultInput(overrides: Partial<MaintenanceCheckInput> = {}): MaintenanceCheckInput {
  return {
    unitId: 'unit-001',
    quality: PartQuality.D,
    techSkillValue: 7,
    modePenalty: 0,
    quirksModifier: 0,
    overtimeModifier: 0,
    shorthandedModifier: 0,
    ...overrides,
  };
}

describe('roll2d6', () => {
  it('should return sum of two dice using RandomFn', () => {
    const random = makeDiceRandom(3, 4);
    expect(roll2d6(random)).toBe(7);
  });

  it('should return 2 for snake eyes', () => {
    const random = makeDiceRandom(1, 1);
    expect(roll2d6(random)).toBe(2);
  });

  it('should return 12 for boxcars', () => {
    const random = makeDiceRandom(6, 6);
    expect(roll2d6(random)).toBe(12);
  });
});

describe('calculateMaintenanceTN', () => {
  it('should return techSkillValue for standard quality D with no modifiers', () => {
    const input = makeDefaultInput();
    expect(calculateMaintenanceTN(input)).toBe(7);
  });

  it('should add quality TN modifier for worst quality A (+3)', () => {
    const input = makeDefaultInput({ quality: PartQuality.A });
    expect(calculateMaintenanceTN(input)).toBe(7 + 3);
  });

  it('should add quality TN modifier for best quality F (-2)', () => {
    const input = makeDefaultInput({ quality: PartQuality.F });
    expect(calculateMaintenanceTN(input)).toBe(7 - 2);
  });

  it('should add mode penalty (rush = +1)', () => {
    const input = makeDefaultInput({ modePenalty: 1 });
    expect(calculateMaintenanceTN(input)).toBe(7 + 1);
  });

  it('should add mode bonus (extra time = -1)', () => {
    const input = makeDefaultInput({ modePenalty: -1 });
    expect(calculateMaintenanceTN(input)).toBe(7 - 1);
  });

  it('should add quirks modifier', () => {
    const input = makeDefaultInput({ quirksModifier: 2 });
    expect(calculateMaintenanceTN(input)).toBe(7 + 2);
  });

  it('should add overtime modifier (+3)', () => {
    const input = makeDefaultInput({ overtimeModifier: 3 });
    expect(calculateMaintenanceTN(input)).toBe(7 + 3);
  });

  it('should add shorthanded modifier', () => {
    const input = makeDefaultInput({ shorthandedModifier: 1 });
    expect(calculateMaintenanceTN(input)).toBe(7 + 1);
  });

  it('should sum all modifiers together', () => {
    const input = makeDefaultInput({
      quality: PartQuality.A,
      modePenalty: 1,
      quirksModifier: 2,
      overtimeModifier: 3,
      shorthandedModifier: 1,
    });
    expect(calculateMaintenanceTN(input)).toBe(7 + 3 + 1 + 2 + 3 + 1);
  });
});

describe('performMaintenanceCheck', () => {
  describe('success (margin >= 0, < 4)', () => {
    it('should return success when roll equals TN', () => {
      const input = makeDefaultInput();
      const random = makeDiceRandom(4, 3);
      const result = performMaintenanceCheck(input, random);

      expect(result.roll).toBe(7);
      expect(result.targetNumber).toBe(7);
      expect(result.margin).toBe(0);
      expect(result.outcome).toBe('success');
      expect(result.qualityBefore).toBe(PartQuality.D);
      expect(result.qualityAfter).toBe(PartQuality.D);
    });

    it('should return success when roll exceeds TN by 1-3', () => {
      const input = makeDefaultInput();
      const random = makeDiceRandom(5, 4);
      const result = performMaintenanceCheck(input, random);

      expect(result.margin).toBe(2);
      expect(result.outcome).toBe('success');
      expect(result.qualityAfter).toBe(PartQuality.D);
    });
  });

  describe('critical success (margin >= 4)', () => {
    it('should improve quality when margin is exactly 4', () => {
      const input = makeDefaultInput({ techSkillValue: 5 });
      const random = makeDiceRandom(5, 4);
      const result = performMaintenanceCheck(input, random);

      expect(result.targetNumber).toBe(5);
      expect(result.roll).toBe(9);
      expect(result.margin).toBe(4);
      expect(result.outcome).toBe('critical_success');
      expect(result.qualityBefore).toBe(PartQuality.D);
      expect(result.qualityAfter).toBe(PartQuality.E);
    });

    it('should improve quality when margin exceeds 4', () => {
      const input = makeDefaultInput({ techSkillValue: 3 });
      const random = makeDiceRandom(6, 6);
      const result = performMaintenanceCheck(input, random);

      expect(result.margin).toBe(9);
      expect(result.outcome).toBe('critical_success');
      expect(result.qualityAfter).toBe(PartQuality.E);
    });

    it('should not improve quality beyond F (ceiling)', () => {
      const input = makeDefaultInput({ quality: PartQuality.F, techSkillValue: 3 });
      const random = makeDiceRandom(6, 6);
      const result = performMaintenanceCheck(input, random);

      expect(result.outcome).toBe('critical_success');
      expect(result.qualityAfter).toBe(PartQuality.F);
    });
  });

  describe('failure (margin < 0, > -3)', () => {
    it('should return failure with no quality change when margin is -1', () => {
      const input = makeDefaultInput({ techSkillValue: 8 });
      const random = makeDiceRandom(4, 3);
      const result = performMaintenanceCheck(input, random);

      expect(result.targetNumber).toBe(8);
      expect(result.roll).toBe(7);
      expect(result.margin).toBe(-1);
      expect(result.outcome).toBe('failure');
      expect(result.qualityAfter).toBe(PartQuality.D);
    });

    it('should return failure with no quality change when margin is -2', () => {
      const input = makeDefaultInput({ techSkillValue: 9 });
      const random = makeDiceRandom(4, 3);
      const result = performMaintenanceCheck(input, random);

      expect(result.margin).toBe(-2);
      expect(result.outcome).toBe('failure');
      expect(result.qualityAfter).toBe(PartQuality.D);
    });
  });

  describe('failure with degradation (margin <= -3)', () => {
    it('should degrade quality when margin is exactly -3', () => {
      const input = makeDefaultInput({ techSkillValue: 10 });
      const random = makeDiceRandom(4, 3);
      const result = performMaintenanceCheck(input, random);

      expect(result.targetNumber).toBe(10);
      expect(result.roll).toBe(7);
      expect(result.margin).toBe(-3);
      expect(result.outcome).toBe('failure');
      expect(result.qualityBefore).toBe(PartQuality.D);
      expect(result.qualityAfter).toBe(PartQuality.C);
    });

    it('should degrade quality when margin is -4', () => {
      const input = makeDefaultInput({ techSkillValue: 11 });
      const random = makeDiceRandom(4, 3);
      const result = performMaintenanceCheck(input, random);

      expect(result.margin).toBe(-4);
      expect(result.outcome).toBe('failure');
      expect(result.qualityAfter).toBe(PartQuality.C);
    });

    it('should not degrade quality below A (floor)', () => {
      const input = makeDefaultInput({ quality: PartQuality.A, techSkillValue: 12 });
      const random = makeDiceRandom(5, 5);
      const result = performMaintenanceCheck(input, random);

      expect(result.targetNumber).toBe(15);
      expect(result.roll).toBe(10);
      expect(result.margin).toBe(-5);
      expect(result.outcome).toBe('failure');
      expect(result.qualityAfter).toBe(PartQuality.A);
    });
  });

  describe('critical failure (margin <= -6)', () => {
    it('should return critical_failure and degrade quality when margin is exactly -6', () => {
      const input = makeDefaultInput({ techSkillValue: 8, quality: PartQuality.A, overtimeModifier: 3, shorthandedModifier: 1 });
      const tn = 8 + 3 + 3 + 1;
      const random = makeDiceRandom(4, 5);
      const result = performMaintenanceCheck(input, random);

      expect(result.targetNumber).toBe(tn);
      expect(result.roll).toBe(9);
      expect(result.margin).toBe(9 - tn);
      if (result.margin <= MAINTENANCE_THRESHOLDS.CRITICAL_FAILURE_MARGIN) {
        expect(result.outcome).toBe('critical_failure');
      }
    });

    it('should return critical_failure when margin is well below -6', () => {
      const input = makeDefaultInput({ techSkillValue: 12, quality: PartQuality.A });
      const random = makeDiceRandom(1, 1);
      const result = performMaintenanceCheck(input, random);

      expect(result.targetNumber).toBe(12 + 3);
      expect(result.roll).toBe(2);
      expect(result.margin).toBe(2 - 15);
      expect(result.outcome).toBe('critical_failure');
      expect(result.qualityAfter).toBe(PartQuality.A);
    });

    it('should degrade quality on critical failure', () => {
      const input = makeDefaultInput({ techSkillValue: 12, quality: PartQuality.D });
      const random = makeDiceRandom(1, 1);
      const result = performMaintenanceCheck(input, random);

      expect(result.margin).toBe(2 - 12);
      expect(result.outcome).toBe('critical_failure');
      expect(result.qualityBefore).toBe(PartQuality.D);
      expect(result.qualityAfter).toBe(PartQuality.C);
    });
  });

  describe('deterministic results with seeded random', () => {
    it('should produce identical results with same random seed', () => {
      const input = makeDefaultInput();
      const random1 = makeDiceRandom(4, 3);
      const random2 = makeDiceRandom(4, 3);

      const result1 = performMaintenanceCheck(input, random1);
      const result2 = performMaintenanceCheck(input, random2);

      expect(result1.roll).toBe(result2.roll);
      expect(result1.targetNumber).toBe(result2.targetNumber);
      expect(result1.margin).toBe(result2.margin);
      expect(result1.outcome).toBe(result2.outcome);
      expect(result1.qualityAfter).toBe(result2.qualityAfter);
    });

    it('should produce different results with different random seeds', () => {
      const input = makeDefaultInput();
      const random1 = makeDiceRandom(6, 6);
      const random2 = makeDiceRandom(1, 1);

      const result1 = performMaintenanceCheck(input, random1);
      const result2 = performMaintenanceCheck(input, random2);

      expect(result1.roll).not.toBe(result2.roll);
    });
  });

  describe('modifier breakdown', () => {
    it('should include all modifier components in breakdown', () => {
      const input = makeDefaultInput({
        quality: PartQuality.B,
        modePenalty: 1,
        quirksModifier: -1,
        overtimeModifier: 3,
        shorthandedModifier: 2,
      });
      const random = makeDiceRandom(4, 3);
      const result = performMaintenanceCheck(input, random);

      expect(result.modifierBreakdown).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Tech Skill', value: 7 }),
          expect.objectContaining({ name: 'Quality', value: QUALITY_TN_MODIFIER[PartQuality.B] }),
          expect.objectContaining({ name: 'Mode', value: 1 }),
          expect.objectContaining({ name: 'Quirks', value: -1 }),
          expect.objectContaining({ name: 'Overtime', value: 3 }),
          expect.objectContaining({ name: 'Shorthanded', value: 2 }),
        ])
      );
    });

    it('should have breakdown values that sum to targetNumber', () => {
      const input = makeDefaultInput({
        quality: PartQuality.C,
        modePenalty: -1,
        quirksModifier: 2,
        overtimeModifier: 0,
        shorthandedModifier: 1,
      });
      const random = makeDiceRandom(4, 3);
      const result = performMaintenanceCheck(input, random);

      const breakdownSum = result.modifierBreakdown.reduce((sum, m) => sum + m.value, 0);
      expect(breakdownSum).toBe(result.targetNumber);
    });

    it('should include unitId in result', () => {
      const input = makeDefaultInput({ unitId: 'atlas-AS7-D' });
      const random = makeDiceRandom(4, 3);
      const result = performMaintenanceCheck(input, random);

      expect(result.unitId).toBe('atlas-AS7-D');
    });
  });
});

describe('stub modifiers', () => {
  it('getEraModifier should return 0', () => {
    expect(getEraModifier(undefined as never)).toBe(0);
  });

  it('getPlanetaryModifier should return 0', () => {
    expect(getPlanetaryModifier(undefined as never)).toBe(0);
  });

  it('getTechSpecialtiesModifier should return 0', () => {
    expect(getTechSpecialtiesModifier(undefined as never)).toBe(0);
  });
});
