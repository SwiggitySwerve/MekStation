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
});
