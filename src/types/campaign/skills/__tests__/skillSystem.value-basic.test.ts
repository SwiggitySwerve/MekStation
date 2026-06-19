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
  });
});
