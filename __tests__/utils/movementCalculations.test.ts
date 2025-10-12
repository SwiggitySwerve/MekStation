/**
 * Movement Calculations Test Suite
 * Tests for the movement calculation utilities used across the customizer
 */

import {
  calculateEnhancedMovement,
  formatEngineMovementInfo,
  getMovementValues,
  formatCondensedMovement,
  MovementDisplay,
  UnitConfiguration,
  getFullMovementSummary,
  getAvailableMovementEnhancements
} from '../../utils/movementCalculations';

describe('Movement Calculations', () => {
  describe('calculateEnhancedMovement', () => {
    test('should calculate base movement without enhancements', () => {
      const config = {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        enhancements: []
      };

      const result = calculateEnhancedMovement(config);

      expect(result.walkDisplay).toBe('4');
      expect(result.runDisplay).toBe('6');
      expect(result.jumpDisplay).toBe('0');
      expect(result.combinedDisplay).toBe('4 / 6 / 0');
      expect(result.walkValue).toBe(4);
      expect(result.runValue).toBe(6);
      expect(result.jumpValue).toBe(0);
    });

    test('should calculate movement with TSM enhancement', () => {
      const config = {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        enhancements: [{ type: 'Triple Strength Myomer' }]
      };

      const result = calculateEnhancedMovement(config);

      // TSM: walk 4 + 1 = 5, run ceil(5 * 1.5) = 8
      expect(result.walkDisplay).toBe('4 [5]');
      expect(result.runDisplay).toBe('6 [8]');
      expect(result.jumpDisplay).toBe('0');
      expect(result.combinedDisplay).toBe('4 [5] / 6 [8] / 0');
      expect(result.walkValue).toBe(5);
      expect(result.runValue).toBe(8);
      expect(result.jumpValue).toBe(0);
    });

    test('should calculate movement with MASC enhancement', () => {
      const config = {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        enhancements: [{ type: 'MASC' }]
      };

      const result = calculateEnhancedMovement(config);

      expect(result.walkDisplay).toBe('4');
      expect(result.runDisplay).toBe('6 [8]');
      expect(result.jumpDisplay).toBe('0');
      expect(result.combinedDisplay).toBe('4 / 6 [8] / 0');
      expect(result.walkValue).toBe(4);
      expect(result.runValue).toBe(8); // MASC provides 2× multiplier: 4 × 2 = 8
      expect(result.jumpValue).toBe(0);
    });

    test('should calculate movement with multiple enhancements (TSM + MASC) - TSM takes precedence', () => {
      const config = {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        enhancements: [
          { type: 'Triple Strength Myomer' },
          { type: 'MASC' }
        ]
      };

      const result = calculateEnhancedMovement(config);

      // TSM takes precedence due to mutual exclusion - MASC is filtered out
      // TSM: walk 4 + 1 = 5, run ceil(5 * 1.5) = 8
      expect(result.walkDisplay).toBe('4 [5]');
      expect(result.runDisplay).toBe('6 [8]');
      expect(result.jumpDisplay).toBe('0');
      expect(result.combinedDisplay).toBe('4 [5] / 6 [8] / 0');
      expect(result.walkValue).toBe(5);
      expect(result.runValue).toBe(8);
      expect(result.jumpValue).toBe(0);
    });

    test('should calculate movement with TSM + Supercharger combination', () => {
      const config = {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        enhancements: [
          { type: 'Triple Strength Myomer' },
          { type: 'Supercharger' }
        ]
      };

      const result = calculateEnhancedMovement(config);

      // TSM: walk 4 + 1 = 5, Supercharger: run = 5 * 2 = 10
      expect(result.walkDisplay).toBe('4 [5]');
      expect(result.runDisplay).toBe('6 [10]');
      expect(result.jumpDisplay).toBe('0');
      expect(result.combinedDisplay).toBe('4 [5] / 6 [10] / 0');
      expect(result.walkValue).toBe(5);
      expect(result.runValue).toBe(10);
      expect(result.jumpValue).toBe(0);
    });

    test('should calculate movement with all three enhancements (TSM + Supercharger + MASC) - TSM and Supercharger only', () => {
      const config = {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        enhancements: [
          { type: 'Triple Strength Myomer' },
          { type: 'Supercharger' },
          { type: 'MASC' }
        ]
      };

      const result = calculateEnhancedMovement(config);

      // TSM and Supercharger apply, MASC is filtered out due to mutual exclusion
      // TSM: walk 4 + 1 = 5, Supercharger: run = 5 * 2 = 10
      expect(result.walkDisplay).toBe('4 [5]');
      expect(result.runDisplay).toBe('6 [10]');
      expect(result.jumpDisplay).toBe('0');
      expect(result.combinedDisplay).toBe('4 [5] / 6 [10] / 0');
      expect(result.walkValue).toBe(5);
      expect(result.runValue).toBe(10);
      expect(result.jumpValue).toBe(0);
    });

    test('should calculate movement with Supercharger + MASC combination (2.5× multiplier)', () => {
      const config = {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        enhancements: [
          { type: 'Supercharger' },
          { type: 'MASC' }
        ]
      };

      const result = calculateEnhancedMovement(config);

      // Supercharger + MASC: 2.5× multiplier to run speed
      expect(result.walkDisplay).toBe('4');
      expect(result.runDisplay).toBe('6 [10]'); // 4 × 2.5 = 10
      expect(result.jumpDisplay).toBe('0');
      expect(result.combinedDisplay).toBe('4 / 6 [10] / 0');
      expect(result.walkValue).toBe(4);
      expect(result.runValue).toBe(10); // Enhanced run value should be 10, not 6
      expect(result.jumpValue).toBe(0);
    });

    test('should calculate movement with Supercharger only (2× multiplier)', () => {
      const config = {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        enhancements: [{ type: 'Supercharger' }]
      };

      const result = calculateEnhancedMovement(config);

      // Supercharger: 2× multiplier to run speed
      expect(result.walkDisplay).toBe('4');
      expect(result.runDisplay).toBe('6 [8]'); // 4 × 2 = 8
      expect(result.jumpDisplay).toBe('0');
      expect(result.combinedDisplay).toBe('4 / 6 [8] / 0');
      expect(result.walkValue).toBe(4);
      expect(result.runValue).toBe(8); // Enhanced run value should be 8
      expect(result.jumpValue).toBe(0);
    });

    test('should handle TSM + Supercharger + MASC correctly (TSM and Supercharger only)', () => {
      const config = {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        enhancements: [
          { type: 'Triple Strength Myomer' },
          { type: 'Supercharger' },
          { type: 'MASC' }
        ]
      };

      const result = calculateEnhancedMovement(config);

      // TSM and Supercharger apply, MASC is filtered out due to mutual exclusion
      // TSM: walk 4 + 1 = 5, Supercharger: run = 5 * 2 = 10
      expect(result.walkDisplay).toBe('4 [5]');
      expect(result.runDisplay).toBe('6 [10]');
      expect(result.jumpDisplay).toBe('0');
      expect(result.combinedDisplay).toBe('4 [5] / 6 [10] / 0');
      expect(result.walkValue).toBe(5);
      expect(result.runValue).toBe(10);
      expect(result.jumpValue).toBe(0);
    });

    test('should handle edge case with odd walk MP and Supercharger + MASC', () => {
      const config = {
        walkMP: 5,
        runMP: 7,
        jumpMP: 0,
        enhancements: [
          { type: 'Supercharger' },
          { type: 'MASC' }
        ]
      };

      const result = calculateEnhancedMovement(config);

      // Supercharger + MASC: 2.5× multiplier to run speed
      // 5 × 2.5 = 12.5, Math.floor(12.5) = 12
      expect(result.walkDisplay).toBe('5');
      expect(result.runDisplay).toBe('7 [12]');
      expect(result.combinedDisplay).toBe('5 / 7 [12] / 0');
      expect(result.walkValue).toBe(5);
      expect(result.runValue).toBe(12);
      expect(result.jumpValue).toBe(0);
    });

    it('should handle unknown enhancement types gracefully', () => {
      const config = {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        enhancements: [{ type: 'Unknown Enhancement' }]
      };

      const result = calculateEnhancedMovement(config);

      expect(result.walkDisplay).toBe('4');
      expect(result.runDisplay).toBe('6');
      expect(result.jumpDisplay).toBe('0');
      expect(result.combinedDisplay).toBe('4 / 6 / 0');
      expect(result.walkValue).toBe(4);
      expect(result.runValue).toBe(6);
      expect(result.jumpValue).toBe(0);
    });
  });

  describe('formatEngineMovementInfo', () => {
    test('formats engine movement info correctly', () => {
      const result = formatEngineMovementInfo(4, 6, 8);
      expect(result).toBe('Walk: 4 MP | Run: 6 MP | Max: 8 MP');
    });

    test('formats with single digit values', () => {
      const result = formatEngineMovementInfo(3, 5, 7);
      expect(result).toBe('Walk: 3 MP | Run: 5 MP | Max: 7 MP');
    });

    test('formats with maximum walk MP equal to current', () => {
      const result = formatEngineMovementInfo(6, 9, 6);
      expect(result).toBe('Walk: 6 MP | Run: 9 MP | Max: 6 MP');
    });

    test('formats with zero values', () => {
      const result = formatEngineMovementInfo(0, 0, 5);
      expect(result).toBe('Walk: 0 MP | Run: 0 MP | Max: 5 MP');
    });
  });

  describe('getMovementValues', () => {
    test('returns correct values for standard movement', () => {
      const config: UnitConfiguration = {
        walkMP: 4,
        runMP: 6,
        jumpMP: 2
      };

      const result = getMovementValues(config);

      expect(result.base).toEqual({
        walk: 4,
        run: 6,
        jump: 2
      });
      expect(result.enhanced).toEqual({
        walk: 4,
        run: 6,
        jump: 2
      });
      expect(result.display.combinedDisplay).toBe('4 / 6 / 2');
    });

    test('returns correct enhanced values for TSM', () => {
      const config: UnitConfiguration = {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        enhancements: [{ type: 'Triple Strength Myomer' }]
      };

      const result = getMovementValues(config);

      expect(result.base).toEqual({
        walk: 4,
        run: 6,
        jump: 0
      });
      expect(result.enhanced).toEqual({
        walk: 5, // 4 + 1
        run: 8,  // ceil(5 × 1.5) = 8
        jump: 0
      });
    });

    test('returns correct enhanced values for MASC', () => {
      const config: UnitConfiguration = {
        walkMP: 5,
        runMP: 7,
        jumpMP: 3,
        enhancements: [{ type: 'MASC' }]
      };

      const result = getMovementValues(config);

      expect(result.base).toEqual({
        walk: 5,
        run: 7,
        jump: 3
      });
      expect(result.enhanced).toEqual({
        walk: 5,  // No change to walk
        run: 10,  // MASC provides 2× multiplier: 5 × 2 = 10
        jump: 3
      });
    });
  });

  describe('formatCondensedMovement', () => {
    describe('Standard Movement', () => {
      test('formats condensed movement for light mech', () => {
        const config: UnitConfiguration = {
          walkMP: 5,
          runMP: 8,
          jumpMP: 3
        };
        const tonnage = 25; // Max walk = floor(400/25) = 16

        const result = formatCondensedMovement(config, tonnage);
        expect(result).toBe('5 / 8 [16] / 3');
      });

      test('formats condensed movement for assault mech', () => {
        const config: UnitConfiguration = {
          walkMP: 3,
          runMP: 5,
          jumpMP: 0
        };
        const tonnage = 100; // Max walk = floor(400/100) = 4

        const result = formatCondensedMovement(config, tonnage);
        expect(result).toBe('3 / 5 [4] / 0');
      });

      test('formats condensed movement without jump MP', () => {
        const config: UnitConfiguration = {
          walkMP: 4,
          runMP: 6
          // jumpMP not specified
        };
        const tonnage = 55; // Max walk = floor(400/55) = 7

        const result = formatCondensedMovement(config, tonnage);
        expect(result).toBe('4 / 6 [7] / 0');
      });
    });

    describe('TSM Enhancement', () => {
      test('formats TSM condensed movement', () => {
        const config = {
          walkMP: 4,
          runMP: 6,
          jumpMP: 2,
          enhancements: [{ type: 'Triple Strength Myomer' }]
        };
        const tonnage = 50;

        const result = formatCondensedMovement(config, tonnage);
        
        // Enhanced walk: 4 + 1 = 5
        // Enhanced run: ceil(5 × 1.5) = 8
        expect(result).toBe('4 [5] / 6 [8] / 2');
      });

      test('formats TSM with zero jump', () => {
        const config = {
          walkMP: 3,
          runMP: 4,
          jumpMP: 0,
          enhancements: [{ type: 'Triple Strength Myomer' }]
        };
        const tonnage = 60;

        const result = formatCondensedMovement(config, tonnage);
        expect(result).toBe('3 [4] / 4 [6] / 0');
      });
    });

    describe('MASC Enhancement', () => {
      test('formats MASC condensed movement', () => {
        const config = {
          walkMP: 5,
          runMP: 7,
          jumpMP: 4,
          enhancements: [{ type: 'MASC' }]
        };
        const tonnage = 40;

        const result = formatCondensedMovement(config, tonnage);
        
        // MASC format: "walk / run [enhanced] / jump"
        // Enhanced run: 5 × 2 = 10
        expect(result).toBe('5 / 7 [10] / 4');
      });

      test('formats MASC with high walk MP', () => {
        const config = {
          walkMP: 6,
          runMP: 9,
          jumpMP: 0,
          enhancements: [{ type: 'MASC' }]
        };
        const tonnage = 35;

        const result = formatCondensedMovement(config, tonnage);
        expect(result).toBe('6 / 9 [12] / 0');
      });
    });

    describe('Edge Cases', () => {
      test('handles minimum tonnage (20 tons)', () => {
        const config: UnitConfiguration = {
          walkMP: 8,
          runMP: 12,
          jumpMP: 0
        };
        const tonnage = 20; // Max walk = floor(400/20) = 20

        const result = formatCondensedMovement(config, tonnage);
        expect(result).toBe('8 / 12 [20] / 0');
      });

      test('handles maximum tonnage (100 tons)', () => {
        const config: UnitConfiguration = {
          walkMP: 2,
          runMP: 3,
          jumpMP: 0
        };
        const tonnage = 100; // Max walk = floor(400/100) = 4

        const result = formatCondensedMovement(config, tonnage);
        expect(result).toBe('2 / 3 [4] / 0');
      });

      test('handles zero movement values', () => {
        const config: UnitConfiguration = {
          walkMP: 0,
          runMP: 0,
          jumpMP: 0
        };
        const tonnage = 50;

        const result = formatCondensedMovement(config, tonnage);
        expect(result).toBe('0 / 0 [8] / 0');
      });
    });
  });

  describe('Data Model Consistency', () => {
    test('walkValue and runValue reflect enhanced values correctly', () => {
      const configTSM: UnitConfiguration = {
        walkMP: 4,
        runMP: 6,
        jumpMP: 2,
        enhancements: [{ type: 'Triple Strength Myomer' }]
      };

      const configMASC: UnitConfiguration = {
        walkMP: 4,
        runMP: 6,
        jumpMP: 2,
        enhancements: [{ type: 'MASC' }]
      };

      const tsmResult = calculateEnhancedMovement(configTSM);
      const mascResult = calculateEnhancedMovement(configMASC);

      // TSM: walk 4 + 1 = 5, run ceil(5 * 1.5) = 8
      expect(tsmResult.walkValue).toBe(5);
      expect(tsmResult.runValue).toBe(8);
      
      // MASC: walk 4, run 4 * 1.5 = 6 (base), MASC run shown in display brackets
      expect(mascResult.walkValue).toBe(4);
      expect(mascResult.runValue).toBe(8);
    });
  });

  describe('Display Formatting', () => {
    test('includes proper spacing in combined display', () => {
      const config: UnitConfiguration = {
        walkMP: 4,
        runMP: 6,
        jumpMP: 2
      };

      const result = calculateEnhancedMovement(config);
      
      // Should have spaces around the slash delimiters
      expect(result.combinedDisplay).toBe('4 / 6 / 2');
      expect(result.combinedDisplay).toMatch(/^\d+(\s\[\d+\])?\s\/\s\d+(\s\[\d+\])?\s\/\s\d+$/);
    });

    test('enhancement brackets are properly formatted', () => {
      const configTSM: UnitConfiguration = {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        enhancements: [{ type: 'Triple Strength Myomer' }]
      };

      const result = calculateEnhancedMovement(configTSM);
      
      expect(result.walkDisplay).toMatch(/^\d+\s\[\d+\]$/); // "4 [5]"
      expect(result.runDisplay).toMatch(/^\d+\s\[\d+\]$/);  // "6 [7]"
    });
  });
});

describe('getFullMovementSummary', () => {
  it('should return summary with enhancement notes', () => {
    const config = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      enhancements: [
        { type: 'Triple Strength Myomer' },
        { type: 'MASC' }
      ]
    };

    const result = getFullMovementSummary(config, 50);

    // TSM takes precedence due to mutual exclusion - MASC is filtered out
    expect(result).toBe('4 [5] / 6 [8] / 0 (TSM+1)');
  });

  it('should return summary with TSM + Supercharger combination', () => {
    const config = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      enhancements: [
        { type: 'Triple Strength Myomer' },
        { type: 'Supercharger' }
      ]
    };

    const result = getFullMovementSummary(config, 50);

    // TSM: walk 4 + 1 = 5, Supercharger: run = 5 * 2 = 10
    expect(result).toBe('4 [5] / 6 [10] / 0 (TSM+1, Supercharger+2)');
  });

  it('should return summary without notes when no enhancements', () => {
    const config = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      enhancements: []
    };

    const result = getFullMovementSummary(config, 50);

    expect(result).toBe('4 / 6 / 0');
  });
});

describe('MOVEMENT_ENHANCEMENTS registry', () => {
  it('should have all expected enhancement types', () => {
    const enhancements = getAvailableMovementEnhancements();
    const types = enhancements.map(e => e);
    
    expect(types).toContain('Triple Strength Myomer');
    expect(types).toContain('MASC');
    expect(types).toContain('Supercharger');
  });

  it('should have correct priorities', () => {
    const enhancements = getAvailableMovementEnhancements();
    const tsm = enhancements.find(e => e === 'Triple Strength Myomer');
    const supercharger = enhancements.find(e => e === 'Supercharger');
    const masc = enhancements.find(e => e === 'MASC');
    
    expect(tsm?.priority).toBe(1);
    expect(supercharger?.priority).toBe(2);
    expect(masc?.priority).toBe(3);
  });
});
