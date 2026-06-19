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
});
