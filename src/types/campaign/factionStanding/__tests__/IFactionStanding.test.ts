import {
  FactionStandingLevel,
  STANDING_LEVEL_THRESHOLDS,
  REGARD_DELTAS,
  getStandingLevel,
} from '../IFactionStanding';

describe('FactionStandingLevel', () => {
  it('should have 9 levels from LEVEL_0 to LEVEL_8', () => {
    expect(FactionStandingLevel.LEVEL_0).toBe(0);
    expect(FactionStandingLevel.LEVEL_1).toBe(1);
    expect(FactionStandingLevel.LEVEL_2).toBe(2);
    expect(FactionStandingLevel.LEVEL_3).toBe(3);
    expect(FactionStandingLevel.LEVEL_4).toBe(4);
    expect(FactionStandingLevel.LEVEL_5).toBe(5);
    expect(FactionStandingLevel.LEVEL_6).toBe(6);
    expect(FactionStandingLevel.LEVEL_7).toBe(7);
    expect(FactionStandingLevel.LEVEL_8).toBe(8);
  });
});

describe('STANDING_LEVEL_THRESHOLDS', () => {
  it('should define thresholds for all 9 levels', () => {
    expect(Object.keys(STANDING_LEVEL_THRESHOLDS)).toHaveLength(9);
  });

  it('should have correct thresholds for LEVEL_0 (Outlawed)', () => {
    const threshold = STANDING_LEVEL_THRESHOLDS[FactionStandingLevel.LEVEL_0];
    expect(threshold.min).toBe(-60);
    expect(threshold.max).toBe(-50);
  });

  it('should have correct thresholds for LEVEL_1 (Hostile)', () => {
    const threshold = STANDING_LEVEL_THRESHOLDS[FactionStandingLevel.LEVEL_1];
    expect(threshold.min).toBe(-50);
    expect(threshold.max).toBe(-40);
  });

  it('should have correct thresholds for LEVEL_2 (Unfriendly)', () => {
    const threshold = STANDING_LEVEL_THRESHOLDS[FactionStandingLevel.LEVEL_2];
    expect(threshold.min).toBe(-40);
    expect(threshold.max).toBe(-25);
  });

  it('should have correct thresholds for LEVEL_3 (Cool)', () => {
    const threshold = STANDING_LEVEL_THRESHOLDS[FactionStandingLevel.LEVEL_3];
    expect(threshold.min).toBe(-25);
    expect(threshold.max).toBe(-10);
  });

  it('should have correct thresholds for LEVEL_4 (Neutral)', () => {
    const threshold = STANDING_LEVEL_THRESHOLDS[FactionStandingLevel.LEVEL_4];
    expect(threshold.min).toBe(-10);
    expect(threshold.max).toBe(10);
  });

  it('should have correct thresholds for LEVEL_5 (Warm)', () => {
    const threshold = STANDING_LEVEL_THRESHOLDS[FactionStandingLevel.LEVEL_5];
    expect(threshold.min).toBe(10);
    expect(threshold.max).toBe(25);
  });

  it('should have correct thresholds for LEVEL_6 (Friendly)', () => {
    const threshold = STANDING_LEVEL_THRESHOLDS[FactionStandingLevel.LEVEL_6];
    expect(threshold.min).toBe(25);
    expect(threshold.max).toBe(40);
  });

  it('should have correct thresholds for LEVEL_7 (Allied)', () => {
    const threshold = STANDING_LEVEL_THRESHOLDS[FactionStandingLevel.LEVEL_7];
    expect(threshold.min).toBe(40);
    expect(threshold.max).toBe(50);
  });

  it('should have correct thresholds for LEVEL_8 (Honored)', () => {
    const threshold = STANDING_LEVEL_THRESHOLDS[FactionStandingLevel.LEVEL_8];
    expect(threshold.min).toBe(50);
    expect(threshold.max).toBe(60);
  });
});

describe('REGARD_DELTAS', () => {
  it('should define all required regard deltas', () => {
    expect(REGARD_DELTAS.CONTRACT_SUCCESS).toBe(1.875);
    expect(REGARD_DELTAS.CONTRACT_PARTIAL).toBe(0.625);
    expect(REGARD_DELTAS.CONTRACT_FAILURE).toBe(-1.875);
    expect(REGARD_DELTAS.CONTRACT_BREACH).toBe(-5.156);
    expect(REGARD_DELTAS.ACCEPT_ENEMY_CONTRACT).toBe(-1.875);
    expect(REGARD_DELTAS.REFUSE_BATCHALL).toBe(-10.3125);
    expect(REGARD_DELTAS.DAILY_DECAY).toBe(0.375);
  });
});

describe('getStandingLevel()', () => {
  describe('LEVEL_0 (Outlawed)', () => {
    it('should map regard -60 to LEVEL_0', () => {
      expect(getStandingLevel(-60)).toBe(FactionStandingLevel.LEVEL_0);
    });

    it('should map regard -55 to LEVEL_0', () => {
      expect(getStandingLevel(-55)).toBe(FactionStandingLevel.LEVEL_0);
    });

    it('should map regard -50 to LEVEL_0', () => {
      expect(getStandingLevel(-50)).toBe(FactionStandingLevel.LEVEL_0);
    });
  });

  describe('LEVEL_1 (Hostile)', () => {
    it('should map regard -49 to LEVEL_1', () => {
      expect(getStandingLevel(-49)).toBe(FactionStandingLevel.LEVEL_1);
    });

    it('should map regard -45 to LEVEL_1', () => {
      expect(getStandingLevel(-45)).toBe(FactionStandingLevel.LEVEL_1);
    });

    it('should map regard -40 to LEVEL_1', () => {
      expect(getStandingLevel(-40)).toBe(FactionStandingLevel.LEVEL_1);
    });
  });

  describe('LEVEL_2 (Unfriendly)', () => {
    it('should map regard -39 to LEVEL_2', () => {
      expect(getStandingLevel(-39)).toBe(FactionStandingLevel.LEVEL_2);
    });

    it('should map regard -32 to LEVEL_2', () => {
      expect(getStandingLevel(-32)).toBe(FactionStandingLevel.LEVEL_2);
    });

    it('should map regard -25 to LEVEL_2', () => {
      expect(getStandingLevel(-25)).toBe(FactionStandingLevel.LEVEL_2);
    });
  });

  describe('LEVEL_3 (Cool)', () => {
    it('should map regard -24 to LEVEL_3', () => {
      expect(getStandingLevel(-24)).toBe(FactionStandingLevel.LEVEL_3);
    });

    it('should map regard -17 to LEVEL_3', () => {
      expect(getStandingLevel(-17)).toBe(FactionStandingLevel.LEVEL_3);
    });

    it('should map regard -10 to LEVEL_3', () => {
      expect(getStandingLevel(-10)).toBe(FactionStandingLevel.LEVEL_3);
    });
  });

  describe('LEVEL_4 (Neutral)', () => {
    it('should map regard -9 to LEVEL_4', () => {
      expect(getStandingLevel(-9)).toBe(FactionStandingLevel.LEVEL_4);
    });

    it('should map regard 0 to LEVEL_4', () => {
      expect(getStandingLevel(0)).toBe(FactionStandingLevel.LEVEL_4);
    });

    it('should map regard 10 to LEVEL_4', () => {
      expect(getStandingLevel(10)).toBe(FactionStandingLevel.LEVEL_4);
    });
  });

  describe('LEVEL_5 (Warm)', () => {
    it('should map regard 11 to LEVEL_5', () => {
      expect(getStandingLevel(11)).toBe(FactionStandingLevel.LEVEL_5);
    });

    it('should map regard 17 to LEVEL_5', () => {
      expect(getStandingLevel(17)).toBe(FactionStandingLevel.LEVEL_5);
    });

    it('should map regard 25 to LEVEL_5', () => {
      expect(getStandingLevel(25)).toBe(FactionStandingLevel.LEVEL_5);
    });
  });

  describe('LEVEL_6 (Friendly)', () => {
    it('should map regard 26 to LEVEL_6', () => {
      expect(getStandingLevel(26)).toBe(FactionStandingLevel.LEVEL_6);
    });

    it('should map regard 32 to LEVEL_6', () => {
      expect(getStandingLevel(32)).toBe(FactionStandingLevel.LEVEL_6);
    });

    it('should map regard 40 to LEVEL_6', () => {
      expect(getStandingLevel(40)).toBe(FactionStandingLevel.LEVEL_6);
    });
  });

  describe('LEVEL_7 (Allied)', () => {
    it('should map regard 41 to LEVEL_7', () => {
      expect(getStandingLevel(41)).toBe(FactionStandingLevel.LEVEL_7);
    });

    it('should map regard 45 to LEVEL_7', () => {
      expect(getStandingLevel(45)).toBe(FactionStandingLevel.LEVEL_7);
    });

    it('should map regard 50 to LEVEL_7', () => {
      expect(getStandingLevel(50)).toBe(FactionStandingLevel.LEVEL_7);
    });
  });

  describe('LEVEL_8 (Honored)', () => {
    it('should map regard 51 to LEVEL_8', () => {
      expect(getStandingLevel(51)).toBe(FactionStandingLevel.LEVEL_8);
    });

    it('should map regard 55 to LEVEL_8', () => {
      expect(getStandingLevel(55)).toBe(FactionStandingLevel.LEVEL_8);
    });

    it('should map regard 60 to LEVEL_8', () => {
      expect(getStandingLevel(60)).toBe(FactionStandingLevel.LEVEL_8);
    });
  });

  describe('Clamping', () => {
    it('should clamp regard below -60 to LEVEL_0', () => {
      expect(getStandingLevel(-100)).toBe(FactionStandingLevel.LEVEL_0);
      expect(getStandingLevel(-1000)).toBe(FactionStandingLevel.LEVEL_0);
    });

    it('should clamp regard above +60 to LEVEL_8', () => {
      expect(getStandingLevel(100)).toBe(FactionStandingLevel.LEVEL_8);
      expect(getStandingLevel(1000)).toBe(FactionStandingLevel.LEVEL_8);
    });
  });

  describe('Acceptance criteria', () => {
    it('should map regard -55 to LEVEL_0 (Outlawed)', () => {
      expect(getStandingLevel(-55)).toBe(FactionStandingLevel.LEVEL_0);
    });

    it('should map regard 0 to LEVEL_4 (Neutral)', () => {
      expect(getStandingLevel(0)).toBe(FactionStandingLevel.LEVEL_4);
    });

    it('should map regard +45 to LEVEL_7 (Allied)', () => {
      expect(getStandingLevel(45)).toBe(FactionStandingLevel.LEVEL_7);
    });

    it('should clamp regard to -60/+60 range', () => {
      expect(getStandingLevel(-100)).toBe(getStandingLevel(-60));
      expect(getStandingLevel(100)).toBe(getStandingLevel(60));
    });
  });
});
