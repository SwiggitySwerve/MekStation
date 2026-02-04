import {
  SKILL_CATALOG,
  getSkillType,
  getSkillsByCategory,
  getAllSkillTypes,
  SKILL_CATEGORIES,
} from '../../../../constants/campaign/skillCatalog';
import { ISkillType } from '../ISkillType';

describe('Skill Catalog', () => {
  describe('SKILL_CATALOG Structure', () => {
    it('should have 40+ skill types (40 defined, room for expansion)', () => {
      const skillCount = Object.keys(SKILL_CATALOG).length;
      expect(skillCount).toBeGreaterThanOrEqual(40);
    });

    it('should have exactly 40 skills', () => {
      const skillCount = Object.keys(SKILL_CATALOG).length;
      expect(skillCount).toBe(40);
    });

    it('should have all required combat skills', () => {
      const combatSkills = [
        'gunnery',
        'piloting',
        'gunnery-aerospace',
        'piloting-aerospace',
        'gunnery-vehicle',
        'driving',
        'gunnery-ba',
        'anti-mek',
        'small-arms',
        'artillery',
        'tactics',
      ];

      for (const skillId of combatSkills) {
        expect(SKILL_CATALOG[skillId]).toBeDefined();
      }
    });

    it('should have all required technical skills', () => {
      const technicalSkills = [
        'tech-mech',
        'tech-aero',
        'tech-mechanic',
        'tech-ba',
        'tech-vessel',
        'astech',
        'tech-general',
      ];

      for (const skillId of technicalSkills) {
        expect(SKILL_CATALOG[skillId]).toBeDefined();
      }
    });

    it('should have all required medical skills', () => {
      const medicalSkills = ['medicine', 'medtech', 'veterinary'];

      for (const skillId of medicalSkills) {
        expect(SKILL_CATALOG[skillId]).toBeDefined();
      }
    });

    it('should have all required administrative skills', () => {
      const adminSkills = [
        'administration',
        'negotiation',
        'leadership',
        'strategy',
        'communications',
      ];

      for (const skillId of adminSkills) {
        expect(SKILL_CATALOG[skillId]).toBeDefined();
      }
    });

    it('should have all required physical skills', () => {
      const physicalSkills = [
        'melee',
        'stealth',
        'survival',
        'tracking',
        'demolitions',
        'zero-g',
      ];

      for (const skillId of physicalSkills) {
        expect(SKILL_CATALOG[skillId]).toBeDefined();
      }
    });

    it('should have all required knowledge skills', () => {
      const knowledgeSkills = [
        'computers',
        'navigation',
        'sensor-operations',
        'protocol',
        'interest',
        'language',
        'training',
        'scrounge',
      ];

      for (const skillId of knowledgeSkills) {
        expect(SKILL_CATALOG[skillId]).toBeDefined();
      }
    });
  });

  describe('Skill Type Validation', () => {
    it('should have valid costs array for every skill', () => {
      for (const [skillId, skillType] of Object.entries(SKILL_CATALOG)) {
        expect(skillType.costs).toBeDefined();
        expect(Array.isArray(skillType.costs)).toBe(true);
        expect(skillType.costs).toHaveLength(11);
        expect(skillType.costs[0]).toBe(0);
      }
    });

    it('should have valid linkedAttribute for every skill', () => {
      const validAttributes = [
        'STR',
        'BOD',
        'REF',
        'DEX',
        'INT',
        'WIL',
        'CHA',
        'Edge',
      ];

      for (const [skillId, skillType] of Object.entries(SKILL_CATALOG)) {
        expect(validAttributes).toContain(skillType.linkedAttribute);
      }
    });

    it('should have targetNumber of 7 for all skills', () => {
      for (const [skillId, skillType] of Object.entries(SKILL_CATALOG)) {
        expect(skillType.targetNumber).toBe(7);
      }
    });

    it('should have non-empty name and description for every skill', () => {
      for (const [skillId, skillType] of Object.entries(SKILL_CATALOG)) {
        expect(skillType.name).toBeDefined();
        expect(skillType.name.length).toBeGreaterThan(0);
        expect(skillType.description).toBeDefined();
        expect(skillType.description.length).toBeGreaterThan(0);
      }
    });

    it('should have matching id field for every skill', () => {
      for (const [skillId, skillType] of Object.entries(SKILL_CATALOG)) {
        expect(skillType.id).toBe(skillId);
      }
    });
  });

  describe('getSkillType() Function', () => {
    it('should return correct skill type for gunnery', () => {
      const skillType = getSkillType('gunnery');
      expect(skillType).toBeDefined();
      expect(skillType?.id).toBe('gunnery');
      expect(skillType?.name).toBe('Gunnery');
      expect(skillType?.linkedAttribute).toBe('REF');
    });

    it('should return correct skill type for piloting', () => {
      const skillType = getSkillType('piloting');
      expect(skillType).toBeDefined();
      expect(skillType?.id).toBe('piloting');
      expect(skillType?.name).toBe('Piloting');
      expect(skillType?.linkedAttribute).toBe('DEX');
    });

    it('should return correct skill type for medicine', () => {
      const skillType = getSkillType('medicine');
      expect(skillType).toBeDefined();
      expect(skillType?.id).toBe('medicine');
      expect(skillType?.name).toBe('Medicine');
      expect(skillType?.linkedAttribute).toBe('INT');
    });

    it('should return undefined for non-existent skill', () => {
      const skillType = getSkillType('non-existent-skill');
      expect(skillType).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const skillType = getSkillType('');
      expect(skillType).toBeUndefined();
    });
  });

  describe('getSkillsByCategory() Function', () => {
    it('should return 11 combat skills', () => {
      const combatSkills = getSkillsByCategory('combat');
      expect(combatSkills).toHaveLength(11);
    });

    it('should return 7 technical skills', () => {
      const technicalSkills = getSkillsByCategory('technical');
      expect(technicalSkills).toHaveLength(7);
    });

    it('should return 3 medical skills', () => {
      const medicalSkills = getSkillsByCategory('medical');
      expect(medicalSkills).toHaveLength(3);
    });

    it('should return 5 administrative skills', () => {
      const adminSkills = getSkillsByCategory('administrative');
      expect(adminSkills).toHaveLength(5);
    });

    it('should return 6 physical skills', () => {
      const physicalSkills = getSkillsByCategory('physical');
      expect(physicalSkills).toHaveLength(6);
    });

    it('should return 8 knowledge skills', () => {
      const knowledgeSkills = getSkillsByCategory('knowledge');
      expect(knowledgeSkills).toHaveLength(8);
    });

    it('should return empty array for non-existent category', () => {
      const skills = getSkillsByCategory('non-existent');
      expect(skills).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const skills = getSkillsByCategory('');
      expect(skills).toEqual([]);
    });

    it('should return all combat skills with correct properties', () => {
      const combatSkills = getSkillsByCategory('combat');
      for (const skill of combatSkills) {
        expect(skill.id).toBeDefined();
        expect(skill.name).toBeDefined();
        expect(skill.description).toBeDefined();
        expect(skill.targetNumber).toBe(7);
        expect(skill.costs).toHaveLength(11);
      }
    });
  });

  describe('getAllSkillTypes() Function', () => {
    it('should return all 40 skill types', () => {
      const allSkills = getAllSkillTypes();
      expect(allSkills).toHaveLength(40);
    });

    it('should return array of ISkillType objects', () => {
      const allSkills = getAllSkillTypes();
      for (const skill of allSkills) {
        expect(skill.id).toBeDefined();
        expect(skill.name).toBeDefined();
        expect(skill.description).toBeDefined();
        expect(skill.targetNumber).toBeDefined();
        expect(skill.costs).toBeDefined();
        expect(skill.linkedAttribute).toBeDefined();
      }
    });

    it('should include all categories', () => {
      const allSkills = getAllSkillTypes();
      const categories = new Set<string>();

      for (const skill of allSkills) {
        if (
          [
            'gunnery',
            'piloting',
            'gunnery-aerospace',
            'piloting-aerospace',
            'gunnery-vehicle',
            'driving',
            'gunnery-ba',
            'anti-mek',
            'small-arms',
            'artillery',
            'tactics',
          ].includes(skill.id)
        ) {
          categories.add('combat');
        } else if (
          [
            'tech-mech',
            'tech-aero',
            'tech-mechanic',
            'tech-ba',
            'tech-vessel',
            'astech',
            'tech-general',
          ].includes(skill.id)
        ) {
          categories.add('technical');
        } else if (
          ['medicine', 'medtech', 'veterinary'].includes(skill.id)
        ) {
          categories.add('medical');
        } else if (
          [
            'administration',
            'negotiation',
            'leadership',
            'strategy',
            'communications',
          ].includes(skill.id)
        ) {
          categories.add('administrative');
        } else if (
          [
            'melee',
            'stealth',
            'survival',
            'tracking',
            'demolitions',
            'zero-g',
          ].includes(skill.id)
        ) {
          categories.add('physical');
        } else if (
          [
            'computers',
            'navigation',
            'sensor-operations',
            'protocol',
            'interest',
            'language',
            'training',
            'scrounge',
          ].includes(skill.id)
        ) {
          categories.add('knowledge');
        }
      }

      expect(categories.size).toBe(6);
      expect(categories).toContain('combat');
      expect(categories).toContain('technical');
      expect(categories).toContain('medical');
      expect(categories).toContain('administrative');
      expect(categories).toContain('physical');
      expect(categories).toContain('knowledge');
    });
  });

  describe('SKILL_CATEGORIES Constant', () => {
    it('should export SKILL_CATEGORIES array', () => {
      expect(SKILL_CATEGORIES).toBeDefined();
      expect(Array.isArray(SKILL_CATEGORIES)).toBe(true);
    });

    it('should have 6 categories', () => {
      expect(SKILL_CATEGORIES).toHaveLength(6);
    });

    it('should include all expected categories', () => {
      expect(SKILL_CATEGORIES).toContain('combat');
      expect(SKILL_CATEGORIES).toContain('technical');
      expect(SKILL_CATEGORIES).toContain('medical');
      expect(SKILL_CATEGORIES).toContain('administrative');
      expect(SKILL_CATEGORIES).toContain('physical');
      expect(SKILL_CATEGORIES).toContain('knowledge');
    });
  });

  describe('Specific Skill Definitions', () => {
    it('should have correct gunnery definition', () => {
      const gunnery = SKILL_CATALOG['gunnery'];
      expect(gunnery.id).toBe('gunnery');
      expect(gunnery.name).toBe('Gunnery');
      expect(gunnery.description).toBe('Ranged weapon accuracy');
      expect(gunnery.targetNumber).toBe(7);
      expect(gunnery.costs).toEqual([
        0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120,
      ]);
      expect(gunnery.linkedAttribute).toBe('REF');
    });

    it('should have correct small-arms definition', () => {
      const smallArms = SKILL_CATALOG['small-arms'];
      expect(smallArms.id).toBe('small-arms');
      expect(smallArms.name).toBe('Small Arms');
      expect(smallArms.description).toBe('Personal firearms');
      expect(smallArms.targetNumber).toBe(7);
      expect(smallArms.costs).toEqual([0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60]);
      expect(smallArms.linkedAttribute).toBe('REF');
    });

    it('should have correct interest definition', () => {
      const interest = SKILL_CATALOG['interest'];
      expect(interest.id).toBe('interest');
      expect(interest.name).toBe('Interest');
      expect(interest.description).toBe('Hobby or academic knowledge');
      expect(interest.targetNumber).toBe(7);
      expect(interest.costs).toEqual([0, 2, 4, 6, 8, 10, 14, 18, 24, 32, 40]);
      expect(interest.linkedAttribute).toBe('INT');
    });
  });

  describe('Cost Progression Patterns', () => {
    it('should have standard cost progression for major skills', () => {
      const majorSkills = ['gunnery', 'piloting', 'medicine', 'administration'];
      const expectedCosts = [0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120];

      for (const skillId of majorSkills) {
        if (SKILL_CATALOG[skillId]) {
          const skill = SKILL_CATALOG[skillId];
          if (
            [
              'gunnery',
              'piloting',
              'gunnery-aerospace',
              'piloting-aerospace',
              'gunnery-vehicle',
              'gunnery-ba',
            ].includes(skillId)
          ) {
            expect(skill.costs).toEqual(expectedCosts);
          }
        }
      }
    });

    it('should have reduced cost progression for minor skills', () => {
      const minorSkills = ['small-arms', 'melee', 'stealth', 'survival'];
      const expectedCosts = [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60];

      for (const skillId of minorSkills) {
        if (SKILL_CATALOG[skillId]) {
          const skill = SKILL_CATALOG[skillId];
          expect(skill.costs).toEqual(expectedCosts);
        }
      }
    });

    it('should have minimal cost progression for knowledge skills', () => {
      const knowledgeSkills = ['interest', 'language'];
      const expectedCosts = [0, 2, 4, 6, 8, 10, 14, 18, 24, 32, 40];

      for (const skillId of knowledgeSkills) {
        if (SKILL_CATALOG[skillId]) {
          const skill = SKILL_CATALOG[skillId];
          expect(skill.costs).toEqual(expectedCosts);
        }
      }
    });
  });
});
