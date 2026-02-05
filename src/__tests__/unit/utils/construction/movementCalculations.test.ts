import {
  calculateRunMP,
  getMaxJumpMP,
  calculateEnhancedMaxRunMP,
  getJumpJetDefinition,
  calculateJumpJetWeight,
  calculateJumpJetSlots,
  validateJumpConfiguration,
  JumpJetType,
  JUMP_JET_DEFINITIONS,
  getMovementModifiersFromEquipment,
  calculateMaxRunMPWithModifiers,
  MOVEMENT_ENHANCEMENT_MODIFIERS,
} from '@/utils/construction/movementCalculations';

describe('movementCalculations', () => {
  describe('calculateRunMP()', () => {
    it('should calculate run MP from walk MP', () => {
      expect(calculateRunMP(4)).toBe(6); // ceil(4 * 1.5) = 6
      expect(calculateRunMP(5)).toBe(8); // ceil(5 * 1.5) = 8
      expect(calculateRunMP(6)).toBe(9); // ceil(6 * 1.5) = 9
    });

    it('should return 0 for zero or negative walk MP', () => {
      expect(calculateRunMP(0)).toBe(0);
      expect(calculateRunMP(-1)).toBe(0);
    });
  });

  describe('Movement Enhancement Modifiers', () => {
    it('should define MASC with +0.5 multiplier bonus', () => {
      expect(MOVEMENT_ENHANCEMENT_MODIFIERS['masc']).toEqual({
        runMultiplierBonus: 0.5,
        flatMPBonus: 0,
      });
    });

    it('should define Supercharger with +0.5 multiplier bonus', () => {
      expect(MOVEMENT_ENHANCEMENT_MODIFIERS['supercharger']).toEqual({
        runMultiplierBonus: 0.5,
        flatMPBonus: 0,
      });
    });

    it('should define TSM with +1 flat bonus', () => {
      expect(MOVEMENT_ENHANCEMENT_MODIFIERS['tsm']).toEqual({
        runMultiplierBonus: 0,
        flatMPBonus: 1,
      });
    });
  });

  describe('getMovementModifiersFromEquipment()', () => {
    it('should return zero modifiers for empty equipment', () => {
      const modifiers = getMovementModifiersFromEquipment([]);
      expect(modifiers.runMultiplierBonus).toBe(0);
      expect(modifiers.flatMPBonus).toBe(0);
    });

    it('should sum modifiers for MASC alone', () => {
      const modifiers = getMovementModifiersFromEquipment(['MASC']);
      expect(modifiers.runMultiplierBonus).toBe(0.5);
      expect(modifiers.flatMPBonus).toBe(0);
    });

    it('should sum modifiers for MASC + Supercharger (2.5x total)', () => {
      const modifiers = getMovementModifiersFromEquipment([
        'MASC',
        'Supercharger',
      ]);
      expect(modifiers.runMultiplierBonus).toBe(1.0); // 0.5 + 0.5 = 1.0
      expect(modifiers.flatMPBonus).toBe(0);
    });

    it('should handle TSM flat bonus', () => {
      const modifiers = getMovementModifiersFromEquipment([
        'Triple Strength Myomer',
      ]);
      expect(modifiers.runMultiplierBonus).toBe(0);
      expect(modifiers.flatMPBonus).toBe(1);
    });

    it('should not double-count same enhancement', () => {
      const modifiers = getMovementModifiersFromEquipment([
        'MASC',
        'IS MASC',
        'Clan MASC',
      ]);
      expect(modifiers.runMultiplierBonus).toBe(0.5); // Only counted once
    });
  });

  describe('calculateMaxRunMPWithModifiers()', () => {
    it('should return undefined for no modifiers', () => {
      const modifiers = { runMultiplierBonus: 0, flatMPBonus: 0 };
      expect(calculateMaxRunMPWithModifiers(5, modifiers)).toBeUndefined();
    });

    it('should calculate sprint MP with MASC (2.0x)', () => {
      const modifiers = { runMultiplierBonus: 0.5, flatMPBonus: 0 };
      expect(calculateMaxRunMPWithModifiers(5, modifiers)).toBe(10); // floor(5 * 2.0) = 10
    });

    it('should calculate combined sprint MP (2.5x)', () => {
      const modifiers = { runMultiplierBonus: 1.0, flatMPBonus: 0 };
      expect(calculateMaxRunMPWithModifiers(5, modifiers)).toBe(12); // floor(5 * 2.5) = 12
    });

    it('should calculate TSM bonus (+1 flat)', () => {
      const modifiers = { runMultiplierBonus: 0, flatMPBonus: 1 };
      expect(calculateMaxRunMPWithModifiers(5, modifiers)).toBe(8); // floor(5 * 1.5) + 1 = 8
    });

    it('should return 0 for zero walk MP', () => {
      const modifiers = { runMultiplierBonus: 0.5, flatMPBonus: 0 };
      expect(calculateMaxRunMPWithModifiers(0, modifiers)).toBe(0);
    });
  });

  describe('getMaxJumpMP()', () => {
    it('should return max jump MP equal to walk MP for standard jets', () => {
      const maxJump = getMaxJumpMP(5, JumpJetType.STANDARD);
      expect(maxJump).toBe(5);
    });

    it('should return run MP for improved jets', () => {
      const maxJump = getMaxJumpMP(5, JumpJetType.IMPROVED);
      expect(maxJump).toBe(8); // ceil(5 * 1.5) = 8
    });

    it('should handle different walk MP values', () => {
      expect(getMaxJumpMP(4, JumpJetType.STANDARD)).toBe(4);
      expect(getMaxJumpMP(6, JumpJetType.STANDARD)).toBe(6);
      expect(getMaxJumpMP(4, JumpJetType.IMPROVED)).toBe(6); // ceil(4 * 1.5) = 6
    });
  });

  describe('jump jet calculations', () => {
    it('should return definitions and undefined for unknown type', () => {
      expect(getJumpJetDefinition(JumpJetType.STANDARD)?.name).toBe(
        'Standard Jump Jet',
      );
      expect(getJumpJetDefinition('Unknown' as JumpJetType)).toBeUndefined();
    });

    it('should calculate jump jet weight across all types and fallbacks', () => {
      // Standard: <= 55: 0.5, <= 85: 1.0, > 85: 2.0
      expect(calculateJumpJetWeight(50, 2, JumpJetType.STANDARD)).toBe(1.0);
      expect(calculateJumpJetWeight(75, 2, JumpJetType.STANDARD)).toBe(2.0);
      expect(calculateJumpJetWeight(90, 2, JumpJetType.STANDARD)).toBe(4); // 2 × 2.0t

      // Improved: <= 55: 1.0, <= 85: 2.0, > 85: 4.0
      expect(calculateJumpJetWeight(50, 2, JumpJetType.IMPROVED)).toBe(2.0);
      expect(calculateJumpJetWeight(75, 2, JumpJetType.IMPROVED)).toBe(4.0);
      expect(calculateJumpJetWeight(90, 3, JumpJetType.IMPROVED)).toBe(12); // 3 × 4.0t

      expect(calculateJumpJetWeight(60, 4, JumpJetType.MECHANICAL)).toBeCloseTo(
        6,
      ); // 4 × (60 × 0.025)
      expect(calculateJumpJetWeight(45, 2, 'Unknown' as JumpJetType)).toBe(1); // default 0.5t per jump
    });

    it('should calculate jump jet slots and default to jump MP for unknown types', () => {
      expect(calculateJumpJetSlots(3, JumpJetType.IMPROVED)).toBe(6);
      expect(calculateJumpJetSlots(2, 'Unknown' as JumpJetType)).toBe(2);
    });
  });

  describe('validateJumpConfiguration()', () => {
    it('should flag negative jump MP', () => {
      const result = validateJumpConfiguration(5, -1, JumpJetType.STANDARD);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Jump MP cannot be negative');
    });

    it('should flag jump MP exceeding maximum for the selected jets', () => {
      const result = validateJumpConfiguration(4, 7, JumpJetType.STANDARD);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum');
    });

    it('should be valid when jump MP is within limits', () => {
      const result = validateJumpConfiguration(5, 5, JumpJetType.STANDARD);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('calculateEnhancedMaxRunMP() [deprecated]', () => {
    it('should calculate enhanced max run MP with MASC', () => {
      const enhanced = calculateEnhancedMaxRunMP(5, 'MASC', false);
      expect(enhanced).toBe(10); // floor(5 * 2) = 10
    });

    it('should calculate enhanced max run MP with Supercharger', () => {
      const enhanced = calculateEnhancedMaxRunMP(5, 'Supercharger', false);
      expect(enhanced).toBe(10); // floor(5 * 2) = 10
    });

    it('should calculate enhanced max run MP with both MASC and Supercharger', () => {
      const enhanced = calculateEnhancedMaxRunMP(5, 'MASC', true);
      expect(enhanced).toBe(12); // floor(5 * 2.5) = 12
    });

    it('should calculate enhanced run MP with TSM', () => {
      const enhanced = calculateEnhancedMaxRunMP(5, 'TSM', false);
      expect(enhanced).toBe(8); // floor(5 * 1.5) + 1 = 8
    });

    it('should return undefined for no enhancement', () => {
      expect(calculateEnhancedMaxRunMP(5, null, false)).toBeUndefined();
      expect(calculateEnhancedMaxRunMP(5, undefined, false)).toBeUndefined();
    });

    it('should handle triple-strength myomer wording', () => {
      const enhanced = calculateEnhancedMaxRunMP(
        6,
        'Triple-Strength Myomer',
        false,
      );
      expect(enhanced).toBe(calculateRunMP(6) + 1);
    });
  });

  describe('JUMP_JET_DEFINITIONS', () => {
    it('should have jump jet definitions', () => {
      expect(JUMP_JET_DEFINITIONS.length).toBeGreaterThan(0);
    });

    it('should include standard jump jets', () => {
      const standard = JUMP_JET_DEFINITIONS.find(
        (j) => j.type === JumpJetType.STANDARD,
      );
      expect(standard).toBeDefined();
    });
  });
});
