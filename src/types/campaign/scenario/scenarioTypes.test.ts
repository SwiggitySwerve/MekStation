import {
  CombatRole,
  AtBMoraleLevel,
  AtBScenarioType,
  MORALE_VALUES,
  isCombatRole,
  isMoraleLevel,
  isScenarioType,
} from './scenarioTypes';

describe('CombatRole', () => {
  it('should have exactly 7 values', () => {
    const roles = Object.values(CombatRole);
    expect(roles).toHaveLength(7);
  });

  it('should have all required roles', () => {
    expect(CombatRole.MANEUVER).toBe('maneuver');
    expect(CombatRole.FRONTLINE).toBe('frontline');
    expect(CombatRole.PATROL).toBe('patrol');
    expect(CombatRole.TRAINING).toBe('training');
    expect(CombatRole.CADRE).toBe('cadre');
    expect(CombatRole.AUXILIARY).toBe('auxiliary');
    expect(CombatRole.RESERVE).toBe('reserve');
  });
});

describe('AtBMoraleLevel', () => {
  it('should have exactly 7 values', () => {
    const levels = Object.values(AtBMoraleLevel);
    expect(levels).toHaveLength(7);
  });

  it('should have all required morale levels', () => {
    expect(AtBMoraleLevel.ROUTED).toBe('routed');
    expect(AtBMoraleLevel.CRITICAL).toBe('critical');
    expect(AtBMoraleLevel.WEAKENED).toBe('weakened');
    expect(AtBMoraleLevel.STALEMATE).toBe('stalemate');
    expect(AtBMoraleLevel.ADVANCING).toBe('advancing');
    expect(AtBMoraleLevel.DOMINATING).toBe('dominating');
    expect(AtBMoraleLevel.OVERWHELMING).toBe('overwhelming');
  });

  it('should have correct numeric mapping', () => {
    expect(MORALE_VALUES[AtBMoraleLevel.ROUTED]).toBe(-3);
    expect(MORALE_VALUES[AtBMoraleLevel.CRITICAL]).toBe(-2);
    expect(MORALE_VALUES[AtBMoraleLevel.WEAKENED]).toBe(-1);
    expect(MORALE_VALUES[AtBMoraleLevel.STALEMATE]).toBe(0);
    expect(MORALE_VALUES[AtBMoraleLevel.ADVANCING]).toBe(1);
    expect(MORALE_VALUES[AtBMoraleLevel.DOMINATING]).toBe(2);
    expect(MORALE_VALUES[AtBMoraleLevel.OVERWHELMING]).toBe(3);
  });

  it('should have all levels in MORALE_VALUES', () => {
    const levels = Object.values(AtBMoraleLevel);
    levels.forEach((level) => {
      expect(MORALE_VALUES[level]).toBeDefined();
    });
  });
});

describe('AtBScenarioType', () => {
  it('should have at least 9 values', () => {
    const types = Object.values(AtBScenarioType);
    expect(types.length).toBeGreaterThanOrEqual(9);
  });

  it('should have all required scenario types', () => {
    expect(AtBScenarioType.BASE_ATTACK).toBe('base_attack');
    expect(AtBScenarioType.BREAKTHROUGH).toBe('breakthrough');
    expect(AtBScenarioType.STANDUP).toBe('standup');
    expect(AtBScenarioType.CHASE).toBe('chase');
    expect(AtBScenarioType.HOLD_THE_LINE).toBe('hold_the_line');
    expect(AtBScenarioType.HIDE_AND_SEEK).toBe('hide_and_seek');
    expect(AtBScenarioType.PROBE).toBe('probe');
    expect(AtBScenarioType.EXTRACTION).toBe('extraction');
    expect(AtBScenarioType.RECON_RAID).toBe('recon_raid');
  });
});

describe('Type Guards', () => {
  describe('isCombatRole', () => {
    it('should return true for valid combat roles', () => {
      expect(isCombatRole(CombatRole.MANEUVER)).toBe(true);
      expect(isCombatRole(CombatRole.PATROL)).toBe(true);
      expect(isCombatRole('maneuver')).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isCombatRole('invalid')).toBe(false);
      expect(isCombatRole(null)).toBe(false);
      expect(isCombatRole(undefined)).toBe(false);
      expect(isCombatRole(123)).toBe(false);
    });
  });

  describe('isMoraleLevel', () => {
    it('should return true for valid morale levels', () => {
      expect(isMoraleLevel(AtBMoraleLevel.STALEMATE)).toBe(true);
      expect(isMoraleLevel(AtBMoraleLevel.ROUTED)).toBe(true);
      expect(isMoraleLevel('stalemate')).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isMoraleLevel('invalid')).toBe(false);
      expect(isMoraleLevel(null)).toBe(false);
      expect(isMoraleLevel(undefined)).toBe(false);
      expect(isMoraleLevel(0)).toBe(false);
    });
  });

  describe('isScenarioType', () => {
    it('should return true for valid scenario types', () => {
      expect(isScenarioType(AtBScenarioType.STANDUP)).toBe(true);
      expect(isScenarioType(AtBScenarioType.BASE_ATTACK)).toBe(true);
      expect(isScenarioType('standup')).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isScenarioType('invalid')).toBe(false);
      expect(isScenarioType(null)).toBe(false);
      expect(isScenarioType(undefined)).toBe(false);
      expect(isScenarioType({})).toBe(false);
    });
  });
});
