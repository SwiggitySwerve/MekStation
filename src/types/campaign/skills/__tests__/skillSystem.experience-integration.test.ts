import {
  IAttributes,
  ISkillType,
  ISkill,
  getSkillValue,
  SkillExperienceLevel,
  getExperienceLevel,
  EXPERIENCE_THRESHOLDS,
} from '../index';

describe('Skill System Integration', () => {
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
