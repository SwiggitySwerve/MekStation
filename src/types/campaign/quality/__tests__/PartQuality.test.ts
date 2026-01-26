/**
 * PartQuality enum and helper function tests
 * TDD approach: A=worst (TN +3), F=best (TN -2)
 * Matches MekHQ PartQuality.java (ordinal 0=A through 5=F)
 */

import {
  PartQuality,
  QUALITY_TN_MODIFIER,
  QUALITY_ORDER,
  degradeQuality,
  improveQuality,
  getQualityDisplayName,
  getQualityColor,
} from '../PartQuality';

import {
  IUnitQuality,
  IMaintenanceRecord,
  MAINTENANCE_THRESHOLDS,
} from '../IUnitQuality';

describe('PartQuality Enum', () => {
  describe('Enum Values', () => {
    it('should have exactly 6 quality grades', () => {
      const values = Object.values(PartQuality);
      expect(values).toHaveLength(6);
    });

    it('should define grades A through F', () => {
      expect(PartQuality.A).toBe('A');
      expect(PartQuality.B).toBe('B');
      expect(PartQuality.C).toBe('C');
      expect(PartQuality.D).toBe('D');
      expect(PartQuality.E).toBe('E');
      expect(PartQuality.F).toBe('F');
    });
  });

  describe('QUALITY_TN_MODIFIER', () => {
    it('should map PartQuality.A (worst) to TN +3', () => {
      expect(QUALITY_TN_MODIFIER[PartQuality.A]).toBe(3);
    });

    it('should map PartQuality.B to TN +2', () => {
      expect(QUALITY_TN_MODIFIER[PartQuality.B]).toBe(2);
    });

    it('should map PartQuality.C to TN +1', () => {
      expect(QUALITY_TN_MODIFIER[PartQuality.C]).toBe(1);
    });

    it('should map PartQuality.D (standard) to TN 0', () => {
      expect(QUALITY_TN_MODIFIER[PartQuality.D]).toBe(0);
    });

    it('should map PartQuality.E to TN -1', () => {
      expect(QUALITY_TN_MODIFIER[PartQuality.E]).toBe(-1);
    });

    it('should map PartQuality.F (best) to TN -2', () => {
      expect(QUALITY_TN_MODIFIER[PartQuality.F]).toBe(-2);
    });

    it('should have a mapping for every quality grade', () => {
      const allQualities = Object.values(PartQuality);
      allQualities.forEach((quality) => {
        expect(QUALITY_TN_MODIFIER[quality]).toBeDefined();
        expect(typeof QUALITY_TN_MODIFIER[quality]).toBe('number');
      });
    });

    it('should have modifiers that decrease from A to F (worst to best)', () => {
      expect(QUALITY_TN_MODIFIER[PartQuality.A]).toBeGreaterThan(QUALITY_TN_MODIFIER[PartQuality.B]);
      expect(QUALITY_TN_MODIFIER[PartQuality.B]).toBeGreaterThan(QUALITY_TN_MODIFIER[PartQuality.C]);
      expect(QUALITY_TN_MODIFIER[PartQuality.C]).toBeGreaterThan(QUALITY_TN_MODIFIER[PartQuality.D]);
      expect(QUALITY_TN_MODIFIER[PartQuality.D]).toBeGreaterThan(QUALITY_TN_MODIFIER[PartQuality.E]);
      expect(QUALITY_TN_MODIFIER[PartQuality.E]).toBeGreaterThan(QUALITY_TN_MODIFIER[PartQuality.F]);
    });
  });

  describe('QUALITY_ORDER', () => {
    it('should contain all 6 quality grades in order A through F', () => {
      expect(QUALITY_ORDER).toEqual([
        PartQuality.A,
        PartQuality.B,
        PartQuality.C,
        PartQuality.D,
        PartQuality.E,
        PartQuality.F,
      ]);
    });

    it('should be readonly (frozen)', () => {
      expect(Object.isFrozen(QUALITY_ORDER)).toBe(true);
    });
  });

  describe('degradeQuality()', () => {
    it('should move D toward A (worse) — returns C', () => {
      expect(degradeQuality(PartQuality.D)).toBe(PartQuality.C);
    });

    it('should move F toward A (worse) — returns E', () => {
      expect(degradeQuality(PartQuality.F)).toBe(PartQuality.E);
    });

    it('should move B toward A (worse) — returns A', () => {
      expect(degradeQuality(PartQuality.B)).toBe(PartQuality.A);
    });

    it('should floor at A (already worst) — returns A', () => {
      expect(degradeQuality(PartQuality.A)).toBe(PartQuality.A);
    });

    it('should move E toward A (worse) — returns D', () => {
      expect(degradeQuality(PartQuality.E)).toBe(PartQuality.D);
    });

    it('should move C toward A (worse) — returns B', () => {
      expect(degradeQuality(PartQuality.C)).toBe(PartQuality.B);
    });
  });

  describe('improveQuality()', () => {
    it('should move D toward F (better) — returns E', () => {
      expect(improveQuality(PartQuality.D)).toBe(PartQuality.E);
    });

    it('should move A toward F (better) — returns B', () => {
      expect(improveQuality(PartQuality.A)).toBe(PartQuality.B);
    });

    it('should move E toward F (better) — returns F', () => {
      expect(improveQuality(PartQuality.E)).toBe(PartQuality.F);
    });

    it('should ceiling at F (already best) — returns F', () => {
      expect(improveQuality(PartQuality.F)).toBe(PartQuality.F);
    });

    it('should move B toward F (better) — returns C', () => {
      expect(improveQuality(PartQuality.B)).toBe(PartQuality.C);
    });

    it('should move C toward F (better) — returns D', () => {
      expect(improveQuality(PartQuality.C)).toBe(PartQuality.D);
    });
  });

  describe('getQualityDisplayName()', () => {
    it('should return descriptive name for A (worst)', () => {
      expect(getQualityDisplayName(PartQuality.A)).toBe('A (Worst)');
    });

    it('should return descriptive name for D (standard)', () => {
      expect(getQualityDisplayName(PartQuality.D)).toBe('D (Standard)');
    });

    it('should return descriptive name for F (best)', () => {
      expect(getQualityDisplayName(PartQuality.F)).toBe('F (Best)');
    });

    it('should return descriptive names for all grades', () => {
      const allQualities = Object.values(PartQuality);
      allQualities.forEach((quality) => {
        const name = getQualityDisplayName(quality);
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
        expect(name).toContain(quality);
      });
    });
  });

  describe('getQualityColor()', () => {
    it('should return a color string for each quality grade', () => {
      const allQualities = Object.values(PartQuality);
      allQualities.forEach((quality) => {
        const color = getQualityColor(quality);
        expect(typeof color).toBe('string');
        expect(color.length).toBeGreaterThan(0);
      });
    });

    it('should return different colors for worst (A) and best (F)', () => {
      expect(getQualityColor(PartQuality.A)).not.toBe(getQualityColor(PartQuality.F));
    });
  });
});

describe('IUnitQuality Interface', () => {
  it('should allow creating a valid IUnitQuality object', () => {
    const unitQuality: IUnitQuality = {
      unitId: 'unit-001',
      quality: PartQuality.D,
      maintenanceHistory: [],
    };

    expect(unitQuality.unitId).toBe('unit-001');
    expect(unitQuality.quality).toBe(PartQuality.D);
    expect(unitQuality.maintenanceHistory).toEqual([]);
    expect(unitQuality.lastMaintenanceDate).toBeUndefined();
  });

  it('should allow creating IUnitQuality with optional lastMaintenanceDate', () => {
    const date = new Date('3025-06-15');
    const unitQuality: IUnitQuality = {
      unitId: 'unit-002',
      quality: PartQuality.E,
      lastMaintenanceDate: date,
      maintenanceHistory: [],
    };

    expect(unitQuality.lastMaintenanceDate).toEqual(date);
  });
});

describe('IMaintenanceRecord Interface', () => {
  it('should allow creating a valid maintenance record', () => {
    const record: IMaintenanceRecord = {
      date: new Date('3025-06-15'),
      techId: 'tech-001',
      roll: 8,
      targetNumber: 6,
      margin: 2,
      outcome: 'success',
      qualityBefore: PartQuality.D,
      qualityAfter: PartQuality.D,
    };

    expect(record.outcome).toBe('success');
    expect(record.margin).toBe(2);
    expect(record.qualityBefore).toBe(PartQuality.D);
    expect(record.qualityAfter).toBe(PartQuality.D);
  });

  it('should allow creating a record without optional techId', () => {
    const record: IMaintenanceRecord = {
      date: new Date('3025-06-15'),
      roll: 3,
      targetNumber: 6,
      margin: -3,
      outcome: 'failure',
      qualityBefore: PartQuality.D,
      qualityAfter: PartQuality.C,
    };

    expect(record.techId).toBeUndefined();
    expect(record.outcome).toBe('failure');
  });

  it('should support all outcome types', () => {
    const outcomes: IMaintenanceRecord['outcome'][] = [
      'success',
      'failure',
      'critical_success',
      'critical_failure',
    ];

    outcomes.forEach((outcome) => {
      const record: IMaintenanceRecord = {
        date: new Date(),
        roll: 7,
        targetNumber: 6,
        margin: 1,
        outcome,
        qualityBefore: PartQuality.D,
        qualityAfter: PartQuality.D,
      };
      expect(record.outcome).toBe(outcome);
    });
  });
});

describe('MAINTENANCE_THRESHOLDS', () => {
  it('should define QUALITY_IMPROVE_MARGIN as 4', () => {
    expect(MAINTENANCE_THRESHOLDS.QUALITY_IMPROVE_MARGIN).toBe(4);
  });

  it('should define QUALITY_DEGRADE_MARGIN as -3', () => {
    expect(MAINTENANCE_THRESHOLDS.QUALITY_DEGRADE_MARGIN).toBe(-3);
  });

  it('should define CRITICAL_FAILURE_MARGIN as -6', () => {
    expect(MAINTENANCE_THRESHOLDS.CRITICAL_FAILURE_MARGIN).toBe(-6);
  });

  it('should have improve margin > 0 (positive = good)', () => {
    expect(MAINTENANCE_THRESHOLDS.QUALITY_IMPROVE_MARGIN).toBeGreaterThan(0);
  });

  it('should have degrade margin < 0 (negative = bad)', () => {
    expect(MAINTENANCE_THRESHOLDS.QUALITY_DEGRADE_MARGIN).toBeLessThan(0);
  });

  it('should have critical failure margin more negative than degrade margin', () => {
    expect(MAINTENANCE_THRESHOLDS.CRITICAL_FAILURE_MARGIN).toBeLessThan(
      MAINTENANCE_THRESHOLDS.QUALITY_DEGRADE_MARGIN
    );
  });
});
