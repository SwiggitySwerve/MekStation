import {
  SKILL_CATALOG,
  getSkillType,
  getSkillsByCategory,
  getAllSkillTypes,
  SKILL_CATEGORIES,
} from '@/constants/campaign/skillCatalog';

const EXPECTED_SKILLS_BY_CATEGORY = {
  combat: [
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
  ],
  technical: [
    'tech-mech',
    'tech-aero',
    'tech-mechanic',
    'tech-ba',
    'tech-vessel',
    'astech',
    'tech-general',
  ],
  medical: ['medicine', 'medtech', 'veterinary'],
  administrative: [
    'administration',
    'negotiation',
    'leadership',
    'strategy',
    'communications',
  ],
  physical: [
    'melee',
    'stealth',
    'survival',
    'tracking',
    'demolitions',
    'zero-g',
  ],
  knowledge: [
    'computers',
    'navigation',
    'sensor-operations',
    'protocol',
    'interest',
    'language',
    'training',
    'scrounge',
  ],
} as const satisfies Record<
  (typeof SKILL_CATEGORIES)[number],
  readonly string[]
>;

const EXPECTED_CATEGORIES = Object.keys(EXPECTED_SKILLS_BY_CATEGORY) as Array<
  keyof typeof EXPECTED_SKILLS_BY_CATEGORY
>;

const EXPECTED_CATEGORY_COUNTS = EXPECTED_CATEGORIES.map(
  (category) =>
    [category, EXPECTED_SKILLS_BY_CATEGORY[category].length] as const,
);

const EXPECTED_SKILL_CATEGORY_BY_ID = new Map<
  string,
  keyof typeof EXPECTED_SKILLS_BY_CATEGORY
>(
  EXPECTED_CATEGORIES.flatMap((category) =>
    EXPECTED_SKILLS_BY_CATEGORY[category].map(
      (skillId) => [skillId, category] as const,
    ),
  ),
);

describe('SKILL_CATALOG Structure', () => {
  it('should have 40+ skill types (40 defined, room for expansion)', () => {
    const skillCount = Object.keys(SKILL_CATALOG).length;
    expect(skillCount).toBeGreaterThanOrEqual(40);
  });

  it('should have exactly 40 skills', () => {
    const skillCount = Object.keys(SKILL_CATALOG).length;
    expect(skillCount).toBe(40);
  });

  it.each(EXPECTED_CATEGORIES)(
    'should have all required %s skills',
    (category) => {
      for (const skillId of EXPECTED_SKILLS_BY_CATEGORY[category]) {
        expect(SKILL_CATALOG[skillId]).toBeDefined();
      }
    },
  );
});

describe('Skill Type Validation', () => {
  it('should have valid costs array for every skill', () => {
    for (const [_skillId, skillType] of Object.entries(SKILL_CATALOG)) {
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

    for (const [_skillId, skillType] of Object.entries(SKILL_CATALOG)) {
      expect(validAttributes).toContain(skillType.linkedAttribute);
    }
  });

  it('should have targetNumber of 7 for all skills', () => {
    for (const [_skillId, skillType] of Object.entries(SKILL_CATALOG)) {
      expect(skillType.targetNumber).toBe(7);
    }
  });

  it('should have non-empty name and description for every skill', () => {
    for (const [_skillId, skillType] of Object.entries(SKILL_CATALOG)) {
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
  it.each(EXPECTED_CATEGORY_COUNTS)(
    'should return expected %s skills',
    (category, count) => {
      const skills = getSkillsByCategory(category);
      expect(skills).toHaveLength(count);
    },
  );

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
    const categories = new Set(
      allSkills.map((skill) => EXPECTED_SKILL_CATEGORY_BY_ID.get(skill.id)),
    );

    expect(categories).not.toContain(undefined);
    expect(categories).toEqual(new Set(SKILL_CATEGORIES));
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
    expect(new Set(SKILL_CATEGORIES)).toEqual(new Set(EXPECTED_CATEGORIES));
  });
});

describe('Specific Skill Definitions', () => {
  it('should have correct gunnery definition', () => {
    const gunnery = SKILL_CATALOG['gunnery'];
    expect(gunnery.id).toBe('gunnery');
    expect(gunnery.name).toBe('Gunnery');
    expect(gunnery.description).toBe('Ranged weapon accuracy');
    expect(gunnery.targetNumber).toBe(7);
    expect(gunnery.costs).toEqual([0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120]);
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
  it('should have standard cost progression for standard combat skills', () => {
    const standardCombatSkills = ['gunnery', 'piloting'];
    const expectedCosts = [0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120];

    for (const skillId of standardCombatSkills) {
      expect(SKILL_CATALOG[skillId]?.costs).toEqual(expectedCosts);
    }
  });

  it('should have reduced cost progression for minor skills', () => {
    const minorSkills = ['small-arms', 'melee', 'stealth', 'survival'];
    const expectedCosts = [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60];

    for (const skillId of minorSkills) {
      expect(SKILL_CATALOG[skillId]?.costs).toEqual(expectedCosts);
    }
  });

  it('should have minimal cost progression for knowledge skills', () => {
    const knowledgeSkills = ['interest', 'language'];
    const expectedCosts = [0, 2, 4, 6, 8, 10, 14, 18, 24, 32, 40];

    for (const skillId of knowledgeSkills) {
      expect(SKILL_CATALOG[skillId]?.costs).toEqual(expectedCosts);
    }
  });
});
