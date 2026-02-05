import {
  IAttributes,
  getAttributeModifier,
  ISkillType,
  ISkill,
  getSkillValue,
  SkillExperienceLevel,
  getExperienceLevel,
  EXPERIENCE_THRESHOLDS,
} from '../index';

describe('Skill System Integration', () => {
  /**
   * Test suite for ISkill interface structure and constraints
   */
  describe('ISkill Interface', () => {
    it('should have all 4 required fields', () => {
      const skill: ISkill = {
        level: 5,
        bonus: 1,
        xpProgress: 250,
        typeId: 'gunnery',
      };

      expect(skill.level).toBe(5);
      expect(skill.bonus).toBe(1);
      expect(skill.xpProgress).toBe(250);
      expect(skill.typeId).toBe('gunnery');
    });

    it('should support level range 0-10', () => {
      const skillLevel0: ISkill = {
        level: 0,
        bonus: 0,
        xpProgress: 0,
        typeId: 'test',
      };
      const skillLevel10: ISkill = {
        level: 10,
        bonus: 0,
        xpProgress: 0,
        typeId: 'test',
      };

      expect(skillLevel0.level).toBe(0);
      expect(skillLevel10.level).toBe(10);
    });

    it('should support positive and negative bonuses', () => {
      const skillPositive: ISkill = {
        level: 5,
        bonus: 3,
        xpProgress: 0,
        typeId: 'test',
      };
      const skillNegative: ISkill = {
        level: 5,
        bonus: -2,
        xpProgress: 0,
        typeId: 'test',
      };

      expect(skillPositive.bonus).toBe(3);
      expect(skillNegative.bonus).toBe(-2);
    });

    it('should support zero XP progress', () => {
      const skill: ISkill = {
        level: 5,
        bonus: 0,
        xpProgress: 0,
        typeId: 'test',
      };

      expect(skill.xpProgress).toBe(0);
    });

    it('should support large XP progress values', () => {
      const skill: ISkill = {
        level: 5,
        bonus: 0,
        xpProgress: 9999,
        typeId: 'test',
      };

      expect(skill.xpProgress).toBe(9999);
    });
  });

  /**
   * Test suite for ISkillType interface structure and validation
   */
  describe('ISkillType Interface', () => {
    it('should have all 6 required fields', () => {
      const skillType: ISkillType = {
        id: 'gunnery',
        name: 'Gunnery',
        description: 'Ability to aim and fire ballistic weapons',
        targetNumber: 4,
        costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        linkedAttribute: 'DEX',
      };

      expect(skillType.id).toBe('gunnery');
      expect(skillType.name).toBe('Gunnery');
      expect(skillType.description).toBeDefined();
      expect(skillType.targetNumber).toBe(4);
      expect(skillType.costs).toHaveLength(10);
      expect(skillType.linkedAttribute).toBe('DEX');
    });

    it('should support all valid linked attributes', () => {
      const attributes: (keyof IAttributes)[] = [
        'STR',
        'BOD',
        'REF',
        'DEX',
        'INT',
        'WIL',
        'CHA',
        'Edge',
      ];

      for (const attr of attributes) {
        const skillType: ISkillType = {
          id: 'test',
          name: 'Test',
          description: 'Test skill',
          targetNumber: 4,
          costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          linkedAttribute: attr,
        };

        expect(skillType.linkedAttribute).toBe(attr);
      }
    });

    it('should have exactly 10 cost elements', () => {
      const skillType: ISkillType = {
        id: 'test',
        name: 'Test',
        description: 'Test skill',
        targetNumber: 4,
        costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        linkedAttribute: 'DEX',
      };

      expect(skillType.costs).toHaveLength(10);
    });

    it('should support varying target numbers', () => {
      const easySkill: ISkillType = {
        id: 'easy',
        name: 'Easy',
        description: 'Easy skill',
        targetNumber: 2,
        costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        linkedAttribute: 'DEX',
      };

      const hardSkill: ISkillType = {
        id: 'hard',
        name: 'Hard',
        description: 'Hard skill',
        targetNumber: 6,
        costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        linkedAttribute: 'INT',
      };

      expect(easySkill.targetNumber).toBe(2);
      expect(hardSkill.targetNumber).toBe(6);
    });

    it('should support varying cost progressions', () => {
      const linearCosts: ISkillType = {
        id: 'linear',
        name: 'Linear',
        description: 'Linear cost progression',
        targetNumber: 4,
        costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        linkedAttribute: 'DEX',
      };

      const exponentialCosts: ISkillType = {
        id: 'exponential',
        name: 'Exponential',
        description: 'Exponential cost progression',
        targetNumber: 4,
        costs: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
        linkedAttribute: 'INT',
      };

      expect(linearCosts.costs[0]).toBe(10);
      expect(linearCosts.costs[9]).toBe(100);
      expect(exponentialCosts.costs[0]).toBe(5);
      expect(exponentialCosts.costs[9]).toBe(50);
    });
  });

  /**
   * Test suite for getSkillValue() calculation function
   */
  describe('getSkillValue() Function', () => {
    const defaultAttributes: IAttributes = {
      STR: 5,
      BOD: 5,
      REF: 5,
      DEX: 5,
      INT: 5,
      WIL: 5,
      CHA: 5,
      Edge: 5,
    };

    const gunnerySkillType: ISkillType = {
      id: 'gunnery',
      name: 'Gunnery',
      description: 'Ability to aim and fire ballistic weapons',
      targetNumber: 4,
      costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      linkedAttribute: 'DEX',
    };

    describe('Basic Calculation', () => {
      it('should calculate skill value as level + bonus + attributeModifier', () => {
        const skill: ISkill = {
          level: 5,
          bonus: 1,
          xpProgress: 0,
          typeId: 'gunnery',
        };

        const skillValue = getSkillValue(
          skill,
          gunnerySkillType,
          defaultAttributes,
        );
        // 5 (level) + 1 (bonus) + 0 (DEX modifier: 5-5) = 6
        expect(skillValue).toBe(6);
      });

      it('should handle zero bonus', () => {
        const skill: ISkill = {
          level: 5,
          bonus: 0,
          xpProgress: 0,
          typeId: 'gunnery',
        };

        const skillValue = getSkillValue(
          skill,
          gunnerySkillType,
          defaultAttributes,
        );
        // 5 (level) + 0 (bonus) + 0 (modifier) = 5
        expect(skillValue).toBe(5);
      });

      it('should handle positive bonus', () => {
        const skill: ISkill = {
          level: 5,
          bonus: 3,
          xpProgress: 0,
          typeId: 'gunnery',
        };

        const skillValue = getSkillValue(
          skill,
          gunnerySkillType,
          defaultAttributes,
        );
        // 5 (level) + 3 (bonus) + 0 (modifier) = 8
        expect(skillValue).toBe(8);
      });

      it('should handle negative bonus', () => {
        const skill: ISkill = {
          level: 5,
          bonus: -2,
          xpProgress: 0,
          typeId: 'gunnery',
        };

        const skillValue = getSkillValue(
          skill,
          gunnerySkillType,
          defaultAttributes,
        );
        // 5 (level) + (-2) (bonus) + 0 (modifier) = 3
        expect(skillValue).toBe(3);
      });
    });

    describe('Attribute Modifier Integration', () => {
      it('should apply positive attribute modifier', () => {
        const skill: ISkill = {
          level: 5,
          bonus: 0,
          xpProgress: 0,
          typeId: 'gunnery',
        };

        const attributes: IAttributes = {
          STR: 5,
          BOD: 5,
          REF: 5,
          DEX: 8, // +3 modifier
          INT: 5,
          WIL: 5,
          CHA: 5,
          Edge: 5,
        };

        const skillValue = getSkillValue(skill, gunnerySkillType, attributes);
        // 5 (level) + 0 (bonus) + 3 (DEX modifier: 8-5) = 8
        expect(skillValue).toBe(8);
      });

      it('should apply negative attribute modifier', () => {
        const skill: ISkill = {
          level: 5,
          bonus: 0,
          xpProgress: 0,
          typeId: 'gunnery',
        };

        const attributes: IAttributes = {
          STR: 5,
          BOD: 5,
          REF: 5,
          DEX: 2, // -3 modifier
          INT: 5,
          WIL: 5,
          CHA: 5,
          Edge: 5,
        };

        const skillValue = getSkillValue(skill, gunnerySkillType, attributes);
        // 5 (level) + 0 (bonus) + (-3) (DEX modifier: 2-5) = 2
        expect(skillValue).toBe(2);
      });

      it('should apply maximum positive attribute modifier', () => {
        const skill: ISkill = {
          level: 5,
          bonus: 0,
          xpProgress: 0,
          typeId: 'gunnery',
        };

        const attributes: IAttributes = {
          STR: 5,
          BOD: 5,
          REF: 5,
          DEX: 10, // +5 modifier
          INT: 5,
          WIL: 5,
          CHA: 5,
          Edge: 5,
        };

        const skillValue = getSkillValue(skill, gunnerySkillType, attributes);
        // 5 (level) + 0 (bonus) + 5 (DEX modifier: 10-5) = 10
        expect(skillValue).toBe(10);
      });

      it('should apply maximum negative attribute modifier', () => {
        const skill: ISkill = {
          level: 5,
          bonus: 0,
          xpProgress: 0,
          typeId: 'gunnery',
        };

        const attributes: IAttributes = {
          STR: 5,
          BOD: 5,
          REF: 5,
          DEX: 1, // -4 modifier
          INT: 5,
          WIL: 5,
          CHA: 5,
          Edge: 5,
        };

        const skillValue = getSkillValue(skill, gunnerySkillType, attributes);
        // 5 (level) + 0 (bonus) + (-4) (DEX modifier: 1-5) = 1
        expect(skillValue).toBe(1);
      });
    });

    describe('All Linked Attributes', () => {
      it('should work with STR linked attribute', () => {
        const skill: ISkill = {
          level: 3,
          bonus: 0,
          xpProgress: 0,
          typeId: 'test',
        };

        const skillType: ISkillType = {
          id: 'test',
          name: 'Test',
          description: 'Test',
          targetNumber: 4,
          costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          linkedAttribute: 'STR',
        };

        const attributes: IAttributes = {
          STR: 7,
          BOD: 5,
          REF: 5,
          DEX: 5,
          INT: 5,
          WIL: 5,
          CHA: 5,
          Edge: 5,
        };

        const skillValue = getSkillValue(skill, skillType, attributes);
        // 3 (level) + 0 (bonus) + 2 (STR modifier: 7-5) = 5
        expect(skillValue).toBe(5);
      });

      it('should work with INT linked attribute', () => {
        const skill: ISkill = {
          level: 4,
          bonus: 1,
          xpProgress: 0,
          typeId: 'test',
        };

        const skillType: ISkillType = {
          id: 'test',
          name: 'Test',
          description: 'Test',
          targetNumber: 4,
          costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          linkedAttribute: 'INT',
        };

        const attributes: IAttributes = {
          STR: 5,
          BOD: 5,
          REF: 5,
          DEX: 5,
          INT: 9,
          WIL: 5,
          CHA: 5,
          Edge: 5,
        };

        const skillValue = getSkillValue(skill, skillType, attributes);
        // 4 (level) + 1 (bonus) + 4 (INT modifier: 9-5) = 9
        expect(skillValue).toBe(9);
      });

      it('should work with CHA linked attribute', () => {
        const skill: ISkill = {
          level: 6,
          bonus: -1,
          xpProgress: 0,
          typeId: 'test',
        };

        const skillType: ISkillType = {
          id: 'test',
          name: 'Test',
          description: 'Test',
          targetNumber: 4,
          costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          linkedAttribute: 'CHA',
        };

        const attributes: IAttributes = {
          STR: 5,
          BOD: 5,
          REF: 5,
          DEX: 5,
          INT: 5,
          WIL: 5,
          CHA: 3,
          Edge: 5,
        };

        const skillValue = getSkillValue(skill, skillType, attributes);
        // 6 (level) + (-1) (bonus) + (-2) (CHA modifier: 3-5) = 3
        expect(skillValue).toBe(3);
      });

      it('should work with Edge linked attribute', () => {
        const skill: ISkill = {
          level: 2,
          bonus: 2,
          xpProgress: 0,
          typeId: 'test',
        };

        const skillType: ISkillType = {
          id: 'test',
          name: 'Test',
          description: 'Test',
          targetNumber: 4,
          costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          linkedAttribute: 'Edge',
        };

        const attributes: IAttributes = {
          STR: 5,
          BOD: 5,
          REF: 5,
          DEX: 5,
          INT: 5,
          WIL: 5,
          CHA: 5,
          Edge: 8,
        };

        const skillValue = getSkillValue(skill, skillType, attributes);
        // 2 (level) + 2 (bonus) + 3 (Edge modifier: 8-5) = 7
        expect(skillValue).toBe(7);
      });
    });

    describe('Edge Cases', () => {
      it('should handle level 0 (untrained)', () => {
        const skill: ISkill = {
          level: 0,
          bonus: 0,
          xpProgress: 0,
          typeId: 'gunnery',
        };

        const skillValue = getSkillValue(
          skill,
          gunnerySkillType,
          defaultAttributes,
        );
        // 0 (level) + 0 (bonus) + 0 (modifier) = 0
        expect(skillValue).toBe(0);
      });

      it('should handle level 10 (master)', () => {
        const skill: ISkill = {
          level: 10,
          bonus: 0,
          xpProgress: 0,
          typeId: 'gunnery',
        };

        const skillValue = getSkillValue(
          skill,
          gunnerySkillType,
          defaultAttributes,
        );
        // 10 (level) + 0 (bonus) + 0 (modifier) = 10
        expect(skillValue).toBe(10);
      });

      it('should handle maximum positive combination', () => {
        const skill: ISkill = {
          level: 10,
          bonus: 5,
          xpProgress: 0,
          typeId: 'gunnery',
        };

        const attributes: IAttributes = {
          STR: 5,
          BOD: 5,
          REF: 5,
          DEX: 10, // +5 modifier
          INT: 5,
          WIL: 5,
          CHA: 5,
          Edge: 5,
        };

        const skillValue = getSkillValue(skill, gunnerySkillType, attributes);
        // 10 (level) + 5 (bonus) + 5 (modifier) = 20
        expect(skillValue).toBe(20);
      });

      it('should handle maximum negative combination', () => {
        const skill: ISkill = {
          level: 0,
          bonus: -5,
          xpProgress: 0,
          typeId: 'gunnery',
        };

        const attributes: IAttributes = {
          STR: 5,
          BOD: 5,
          REF: 5,
          DEX: 1, // -4 modifier
          INT: 5,
          WIL: 5,
          CHA: 5,
          Edge: 5,
        };

        const skillValue = getSkillValue(skill, gunnerySkillType, attributes);
        // 0 (level) + (-5) (bonus) + (-4) (modifier) = -9
        expect(skillValue).toBe(-9);
      });
    });

    describe('Validation and Error Handling', () => {
      it('should throw error for skill level below 0', () => {
        const skill: ISkill = {
          level: -1,
          bonus: 0,
          xpProgress: 0,
          typeId: 'gunnery',
        };

        expect(() =>
          getSkillValue(skill, gunnerySkillType, defaultAttributes),
        ).toThrow('Invalid skill level: -1');
      });

      it('should throw error for skill level above 10', () => {
        const skill: ISkill = {
          level: 11,
          bonus: 0,
          xpProgress: 0,
          typeId: 'gunnery',
        };

        expect(() =>
          getSkillValue(skill, gunnerySkillType, defaultAttributes),
        ).toThrow('Invalid skill level: 11');
      });

      it('should throw error for invalid linked attribute', () => {
        const skill: ISkill = {
          level: 5,
          bonus: 0,
          xpProgress: 0,
          typeId: 'test',
        };

        const skillType: ISkillType = {
          id: 'test',
          name: 'Test',
          description: 'Test',
          targetNumber: 4,
          costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          linkedAttribute: 'INVALID' as keyof IAttributes,
        };

        expect(() =>
          getSkillValue(skill, skillType, defaultAttributes),
        ).toThrow('Invalid linked attribute');
      });
    });
  });

  /**
   * Test suite for experience level thresholds and progression
   */
  describe('Experience Levels', () => {
    describe('SkillExperienceLevel Enum', () => {
      it('should have all 4 experience levels', () => {
        expect(SkillExperienceLevel.Green).toBe('Green');
        expect(SkillExperienceLevel.Regular).toBe('Regular');
        expect(SkillExperienceLevel.Veteran).toBe('Veteran');
        expect(SkillExperienceLevel.Elite).toBe('Elite');
      });
    });

    describe('EXPERIENCE_THRESHOLDS', () => {
      it('should define Green threshold (0-999)', () => {
        const threshold = EXPERIENCE_THRESHOLDS[SkillExperienceLevel.Green];
        expect(threshold.min).toBe(0);
        expect(threshold.max).toBe(999);
      });

      it('should define Regular threshold (1000-4999)', () => {
        const threshold = EXPERIENCE_THRESHOLDS[SkillExperienceLevel.Regular];
        expect(threshold.min).toBe(1000);
        expect(threshold.max).toBe(4999);
      });

      it('should define Veteran threshold (5000-11999)', () => {
        const threshold = EXPERIENCE_THRESHOLDS[SkillExperienceLevel.Veteran];
        expect(threshold.min).toBe(5000);
        expect(threshold.max).toBe(11999);
      });

      it('should define Elite threshold (12000+)', () => {
        const threshold = EXPERIENCE_THRESHOLDS[SkillExperienceLevel.Elite];
        expect(threshold.min).toBe(12000);
        expect(threshold.max).toBeNull();
      });
    });

    describe('getExperienceLevel() Function', () => {
      it('should return Green for 0 XP', () => {
        expect(getExperienceLevel(0)).toBe(SkillExperienceLevel.Green);
      });

      it('should return Green for 500 XP', () => {
        expect(getExperienceLevel(500)).toBe(SkillExperienceLevel.Green);
      });

      it('should return Green for 999 XP', () => {
        expect(getExperienceLevel(999)).toBe(SkillExperienceLevel.Green);
      });

      it('should return Regular for 1000 XP', () => {
        expect(getExperienceLevel(1000)).toBe(SkillExperienceLevel.Regular);
      });

      it('should return Regular for 2500 XP', () => {
        expect(getExperienceLevel(2500)).toBe(SkillExperienceLevel.Regular);
      });

      it('should return Regular for 4999 XP', () => {
        expect(getExperienceLevel(4999)).toBe(SkillExperienceLevel.Regular);
      });

      it('should return Veteran for 5000 XP', () => {
        expect(getExperienceLevel(5000)).toBe(SkillExperienceLevel.Veteran);
      });

      it('should return Veteran for 8000 XP', () => {
        expect(getExperienceLevel(8000)).toBe(SkillExperienceLevel.Veteran);
      });

      it('should return Veteran for 11999 XP', () => {
        expect(getExperienceLevel(11999)).toBe(SkillExperienceLevel.Veteran);
      });

      it('should return Elite for 12000 XP', () => {
        expect(getExperienceLevel(12000)).toBe(SkillExperienceLevel.Elite);
      });

      it('should return Elite for 15000 XP', () => {
        expect(getExperienceLevel(15000)).toBe(SkillExperienceLevel.Elite);
      });

      it('should return Elite for very high XP', () => {
        expect(getExperienceLevel(999999)).toBe(SkillExperienceLevel.Elite);
      });

      it('should throw error for negative XP', () => {
        expect(() => getExperienceLevel(-1)).toThrow(
          'Total XP cannot be negative',
        );
      });

      it('should throw error for very negative XP', () => {
        expect(() => getExperienceLevel(-1000)).toThrow(
          'Total XP cannot be negative',
        );
      });
    });

    describe('Threshold Boundaries', () => {
      it('should correctly identify boundary at 999/1000', () => {
        expect(getExperienceLevel(999)).toBe(SkillExperienceLevel.Green);
        expect(getExperienceLevel(1000)).toBe(SkillExperienceLevel.Regular);
      });

      it('should correctly identify boundary at 4999/5000', () => {
        expect(getExperienceLevel(4999)).toBe(SkillExperienceLevel.Regular);
        expect(getExperienceLevel(5000)).toBe(SkillExperienceLevel.Veteran);
      });

      it('should correctly identify boundary at 11999/12000', () => {
        expect(getExperienceLevel(11999)).toBe(SkillExperienceLevel.Veteran);
        expect(getExperienceLevel(12000)).toBe(SkillExperienceLevel.Elite);
      });
    });
  });

  /**
   * Integration tests combining multiple skill system components
   */
  describe('Integration Tests', () => {
    it('should calculate complete skill check workflow', () => {
      // Setup: Character with Gunnery skill
      const attributes: IAttributes = {
        STR: 5,
        BOD: 5,
        REF: 5,
        DEX: 7, // +2 modifier
        INT: 5,
        WIL: 5,
        CHA: 5,
        Edge: 5,
      };

      const gunnerySkillType: ISkillType = {
        id: 'gunnery',
        name: 'Gunnery',
        description: 'Ability to aim and fire ballistic weapons',
        targetNumber: 4,
        costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        linkedAttribute: 'DEX',
      };

      const gunnerySkill: ISkill = {
        level: 5,
        bonus: 1,
        xpProgress: 250,
        typeId: 'gunnery',
      };

      // Calculate skill value
      const skillValue = getSkillValue(
        gunnerySkill,
        gunnerySkillType,
        attributes,
      );

      // Verify: 5 (level) + 1 (bonus) + 2 (DEX modifier) = 8
      expect(skillValue).toBe(8);

      // Verify skill check would succeed (8 >= 4 target number)
      expect(skillValue).toBeGreaterThanOrEqual(gunnerySkillType.targetNumber);
    });

    it('should handle multiple skills with different attributes', () => {
      const attributes: IAttributes = {
        STR: 6,
        BOD: 5,
        REF: 5,
        DEX: 7,
        INT: 8,
        WIL: 5,
        CHA: 4,
        Edge: 5,
      };

      // Gunnery (DEX-based)
      const gunnerySkillType: ISkillType = {
        id: 'gunnery',
        name: 'Gunnery',
        description: 'Ballistic weapons',
        targetNumber: 4,
        costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        linkedAttribute: 'DEX',
      };

      const gunnerySkill: ISkill = {
        level: 4,
        bonus: 0,
        xpProgress: 0,
        typeId: 'gunnery',
      };

      // Hacking (INT-based)
      const hackingSkillType: ISkillType = {
        id: 'hacking',
        name: 'Hacking',
        description: 'Computer systems',
        targetNumber: 5,
        costs: [15, 25, 35, 45, 55, 65, 75, 85, 95, 105],
        linkedAttribute: 'INT',
      };

      const hackingSkill: ISkill = {
        level: 3,
        bonus: 1,
        xpProgress: 100,
        typeId: 'hacking',
      };

      // Calculate both skill values
      const gunneryValue = getSkillValue(
        gunnerySkill,
        gunnerySkillType,
        attributes,
      );
      const hackingValue = getSkillValue(
        hackingSkill,
        hackingSkillType,
        attributes,
      );

      // Gunnery: 4 (level) + 0 (bonus) + 2 (DEX: 7-5) = 6
      expect(gunneryValue).toBe(6);

      // Hacking: 3 (level) + 1 (bonus) + 3 (INT: 8-5) = 7
      expect(hackingValue).toBe(7);
    });

    it('should track experience progression through levels', () => {
      // Character starts as Green
      expect(getExperienceLevel(500)).toBe(SkillExperienceLevel.Green);

      // Gains experience and becomes Regular
      expect(getExperienceLevel(2000)).toBe(SkillExperienceLevel.Regular);

      // Continues gaining experience and becomes Veteran
      expect(getExperienceLevel(8000)).toBe(SkillExperienceLevel.Veteran);

      // Reaches Elite status
      expect(getExperienceLevel(15000)).toBe(SkillExperienceLevel.Elite);
    });

    it('should handle skill with negative bonus and low attribute', () => {
      const attributes: IAttributes = {
        STR: 5,
        BOD: 5,
        REF: 5,
        DEX: 2, // -3 modifier
        INT: 5,
        WIL: 5,
        CHA: 5,
        Edge: 5,
      };

      const skillType: ISkillType = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        targetNumber: 4,
        costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        linkedAttribute: 'DEX',
      };

      const skill: ISkill = {
        level: 2,
        bonus: -1,
        xpProgress: 0,
        typeId: 'test',
      };

      const skillValue = getSkillValue(skill, skillType, attributes);
      // 2 (level) + (-1) (bonus) + (-3) (modifier) = -2
      expect(skillValue).toBe(-2);
    });

    it('should handle skill with high bonus and high attribute', () => {
      const attributes: IAttributes = {
        STR: 5,
        BOD: 5,
        REF: 5,
        DEX: 5,
        INT: 10, // +5 modifier
        WIL: 5,
        CHA: 5,
        Edge: 5,
      };

      const skillType: ISkillType = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        targetNumber: 4,
        costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        linkedAttribute: 'INT',
      };

      const skill: ISkill = {
        level: 8,
        bonus: 4,
        xpProgress: 0,
        typeId: 'test',
      };

      const skillValue = getSkillValue(skill, skillType, attributes);
      // 8 (level) + 4 (bonus) + 5 (modifier) = 17
      expect(skillValue).toBe(17);
    });
  });
});
