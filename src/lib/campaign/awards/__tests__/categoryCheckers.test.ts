import {
  checkKillAwards,
  checkScenarioAwards,
  checkTimeAwards,
  checkSkillAwards,
  checkRankAwards,
  checkInjuryAwards,
  checkContractAwards,
  checkFactionHunterAwards,
  checkTheatreOfWarAwards,
  checkTrainingAwards,
  checkScenarioKillAwards,
  checkMiscAwards,
  checkCombatAwards,
  checkSurvivalAwards,
  checkServiceAwards,
  checkCampaignAwards,
  checkSpecialAwards,
  checkAwardsForCategory,
  ICheckerContext,
} from '../categoryCheckers';
import { AutoAwardCategory } from '@/types/campaign/awards/autoAwardTypes';
import { IAward, AwardCategory, AwardRarity, CriteriaType } from '@/types/award/AwardInterfaces';
import { IPerson } from '@/types/campaign/Person';
import { PersonnelStatus, CampaignPersonnelRole } from '@/types/campaign/enums';

function createMockPerson(overrides?: Partial<IPerson>): IPerson {
  return {
    id: 'person-001',
    name: 'Test Pilot',
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: 'MechWarrior',
    rankLevel: 0,
    recruitmentDate: new Date('3020-01-01'),
    missionsCompleted: 0,
    totalKills: 0,
    xp: 0,
    totalXpEarned: 0,
    xpSpent: 0,
    hits: 0,
    injuries: [],
    daysToWaitForHealing: 0,
    skills: {},
    attributes: {
      STR: 5,
      BOD: 5,
      REF: 5,
      DEX: 5,
      INT: 5,
      WIL: 5,
      CHA: 5,
      Edge: 0,
    },
    pilotSkills: {
      gunnery: 4,
      piloting: 5,
    },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function createMockAward(
  category: AutoAwardCategory,
  threshold: number,
  thresholdType: string,
  overrides?: Partial<IAward>
): IAward {
  return {
    id: `award-${category}-${threshold}`,
    name: `Test ${category} Award`,
    description: `Test award for ${category}`,
    category: AwardCategory.Combat,
    rarity: AwardRarity.Common,
    icon: 'test-icon',
    criteria: {
      type: CriteriaType.TotalKills,
      threshold,
      description: `Test criteria for ${category}`,
    },
    repeatable: false,
    sortOrder: 0,
    autoGrantCriteria: {
      category,
      threshold,
      thresholdType,
      stackable: false,
    },
    ...overrides,
  };
}

describe('categoryCheckers', () => {
  describe('checkKillAwards', () => {
    it('grants award when kills >= threshold', () => {
      const person = createMockPerson({ totalKills: 10 });
      const awards = [createMockAward(AutoAwardCategory.KILL, 5, 'kills')];

      const result = checkKillAwards(person, awards);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('award-kill-5');
    });

    it('does not grant award when kills < threshold', () => {
      const person = createMockPerson({ totalKills: 3 });
      const awards = [createMockAward(AutoAwardCategory.KILL, 5, 'kills')];

      const result = checkKillAwards(person, awards);

      expect(result).toHaveLength(0);
    });

    it('grants multiple awards at different thresholds', () => {
      const person = createMockPerson({ totalKills: 15 });
      const awards = [
        createMockAward(AutoAwardCategory.KILL, 5, 'kills'),
        createMockAward(AutoAwardCategory.KILL, 10, 'kills'),
        createMockAward(AutoAwardCategory.KILL, 20, 'kills'),
      ];

      const result = checkKillAwards(person, awards);

      expect(result).toHaveLength(2);
    });

    it('ignores awards from other categories', () => {
      const person = createMockPerson({ totalKills: 10 });
      const awards = [
        createMockAward(AutoAwardCategory.KILL, 5, 'kills'),
        createMockAward(AutoAwardCategory.SCENARIO, 5, 'missions'),
      ];

      const result = checkKillAwards(person, awards);

      expect(result).toHaveLength(1);
    });
  });

  describe('checkScenarioAwards', () => {
    it('grants award when missions >= threshold', () => {
      const person = createMockPerson({ missionsCompleted: 20 });
      const awards = [createMockAward(AutoAwardCategory.SCENARIO, 10, 'missions')];

      const result = checkScenarioAwards(person, awards);

      expect(result).toHaveLength(1);
    });

    it('does not grant award when missions < threshold', () => {
      const person = createMockPerson({ missionsCompleted: 5 });
      const awards = [createMockAward(AutoAwardCategory.SCENARIO, 10, 'missions')];

      const result = checkScenarioAwards(person, awards);

      expect(result).toHaveLength(0);
    });

    it('grants multiple scenario awards', () => {
      const person = createMockPerson({ missionsCompleted: 30 });
      const awards = [
        createMockAward(AutoAwardCategory.SCENARIO, 10, 'missions'),
        createMockAward(AutoAwardCategory.SCENARIO, 20, 'missions'),
        createMockAward(AutoAwardCategory.SCENARIO, 40, 'missions'),
      ];

      const result = checkScenarioAwards(person, awards);

      expect(result).toHaveLength(2);
    });
  });

  describe('checkTimeAwards', () => {
    it('grants award when years of service >= threshold', () => {
      const person = createMockPerson({ recruitmentDate: new Date('3020-01-01') });
      const context: ICheckerContext = { currentDate: '3025-06-15' };
      const awards = [createMockAward(AutoAwardCategory.TIME, 5, 'years')];

      const result = checkTimeAwards(person, awards, context);

      expect(result).toHaveLength(1);
    });

    it('does not grant award when service < threshold', () => {
      const person = createMockPerson({ recruitmentDate: new Date('3024-01-01') });
      const context: ICheckerContext = { currentDate: '3025-06-15' };
      const awards = [createMockAward(AutoAwardCategory.TIME, 5, 'years')];

      const result = checkTimeAwards(person, awards, context);

      expect(result).toHaveLength(0);
    });

    it('calculates years correctly with fractional years', () => {
      const person = createMockPerson({ recruitmentDate: new Date('3020-01-01') });
      const context: ICheckerContext = { currentDate: '3025-06-15' };
      const awards = [
        createMockAward(AutoAwardCategory.TIME, 5, 'years'),
        createMockAward(AutoAwardCategory.TIME, 6, 'years'),
      ];

      const result = checkTimeAwards(person, awards, context);

      expect(result).toHaveLength(1);
    });

    it('handles recruitment date as string', () => {
      const person = createMockPerson({ recruitmentDate: new Date('3020-01-01') });
      const context: ICheckerContext = { currentDate: '3025-06-15' };
      const awards = [createMockAward(AutoAwardCategory.TIME, 5, 'years')];

      const result = checkTimeAwards(person, awards, context);

      expect(result).toHaveLength(1);
    });
  });

  describe('checkSkillAwards', () => {
    it('grants gunnery award when gunnery <= threshold', () => {
      const person = createMockPerson({ pilotSkills: { gunnery: 3, piloting: 5 } });
      const awards = [
        createMockAward(AutoAwardCategory.SKILL, 4, 'skill_level', {
          autoGrantCriteria: {
            category: AutoAwardCategory.SKILL,
            threshold: 4,
            thresholdType: 'skill_level',
            stackable: false,
            skillId: 'gunnery',
          },
        }),
      ];

      const result = checkSkillAwards(person, awards);

      expect(result).toHaveLength(1);
    });

    it('does not grant gunnery award when gunnery > threshold', () => {
      const person = createMockPerson({ pilotSkills: { gunnery: 5, piloting: 5 } });
      const awards = [
        createMockAward(AutoAwardCategory.SKILL, 4, 'skill_level', {
          autoGrantCriteria: {
            category: AutoAwardCategory.SKILL,
            threshold: 4,
            thresholdType: 'skill_level',
            stackable: false,
            skillId: 'gunnery',
          },
        }),
      ];

      const result = checkSkillAwards(person, awards);

      expect(result).toHaveLength(0);
    });

    it('grants piloting award when piloting <= threshold', () => {
      const person = createMockPerson({ pilotSkills: { gunnery: 4, piloting: 3 } });
      const awards = [
        createMockAward(AutoAwardCategory.SKILL, 4, 'skill_level', {
          autoGrantCriteria: {
            category: AutoAwardCategory.SKILL,
            threshold: 4,
            thresholdType: 'skill_level',
            stackable: false,
            skillId: 'piloting',
          },
        }),
      ];

      const result = checkSkillAwards(person, awards);

      expect(result).toHaveLength(1);
    });

    it('grants generic skill award when best skill <= threshold', () => {
      const person = createMockPerson({ pilotSkills: { gunnery: 3, piloting: 5 } });
      const awards = [createMockAward(AutoAwardCategory.SKILL, 4, 'skill_level')];

      const result = checkSkillAwards(person, awards);

      expect(result).toHaveLength(1);
    });

    it('does not grant generic skill award when best skill > threshold', () => {
      const person = createMockPerson({ pilotSkills: { gunnery: 5, piloting: 6 } });
      const awards = [createMockAward(AutoAwardCategory.SKILL, 4, 'skill_level')];

      const result = checkSkillAwards(person, awards);

      expect(result).toHaveLength(0);
    });
  });

  describe('checkRankAwards', () => {
    it('grants award in inclusive mode when rankLevel >= threshold', () => {
      const person = createMockPerson({ rankLevel: 5 });
      const awards = [
        createMockAward(AutoAwardCategory.RANK, 3, 'rank_level', {
          autoGrantCriteria: {
            category: AutoAwardCategory.RANK,
            threshold: 3,
            thresholdType: 'rank_level',
            stackable: false,
            rankMode: 'inclusive',
          },
        }),
      ];

      const result = checkRankAwards(person, awards);

      expect(result).toHaveLength(1);
    });

    it('does not grant award in inclusive mode when rankLevel < threshold', () => {
      const person = createMockPerson({ rankLevel: 2 });
      const awards = [
        createMockAward(AutoAwardCategory.RANK, 3, 'rank_level', {
          autoGrantCriteria: {
            category: AutoAwardCategory.RANK,
            threshold: 3,
            thresholdType: 'rank_level',
            stackable: false,
            rankMode: 'inclusive',
          },
        }),
      ];

      const result = checkRankAwards(person, awards);

      expect(result).toHaveLength(0);
    });

    it('grants award in exclusive mode only when rankLevel > threshold', () => {
      const person = createMockPerson({ rankLevel: 4 });
      const awards = [
        createMockAward(AutoAwardCategory.RANK, 3, 'rank_level', {
          autoGrantCriteria: {
            category: AutoAwardCategory.RANK,
            threshold: 3,
            thresholdType: 'rank_level',
            stackable: false,
            rankMode: 'exclusive',
          },
        }),
      ];

      const result = checkRankAwards(person, awards);

      expect(result).toHaveLength(1);
    });

    it('does not grant award in exclusive mode when rankLevel <= threshold', () => {
      const person = createMockPerson({ rankLevel: 3 });
      const awards = [
        createMockAward(AutoAwardCategory.RANK, 3, 'rank_level', {
          autoGrantCriteria: {
            category: AutoAwardCategory.RANK,
            threshold: 3,
            thresholdType: 'rank_level',
            stackable: false,
            rankMode: 'exclusive',
          },
        }),
      ];

      const result = checkRankAwards(person, awards);

      expect(result).toHaveLength(0);
    });

    it('grants award in promotion mode only on exact match', () => {
      const person = createMockPerson({ rankLevel: 3 });
      const awards = [
        createMockAward(AutoAwardCategory.RANK, 3, 'rank_level', {
          autoGrantCriteria: {
            category: AutoAwardCategory.RANK,
            threshold: 3,
            thresholdType: 'rank_level',
            stackable: false,
            rankMode: 'promotion',
          },
        }),
      ];

      const result = checkRankAwards(person, awards);

      expect(result).toHaveLength(1);
    });

    it('does not grant award in promotion mode when rankLevel != threshold', () => {
      const person = createMockPerson({ rankLevel: 4 });
      const awards = [
        createMockAward(AutoAwardCategory.RANK, 3, 'rank_level', {
          autoGrantCriteria: {
            category: AutoAwardCategory.RANK,
            threshold: 3,
            thresholdType: 'rank_level',
            stackable: false,
            rankMode: 'promotion',
          },
        }),
      ];

      const result = checkRankAwards(person, awards);

      expect(result).toHaveLength(0);
    });

    it('defaults to inclusive mode when rankMode not specified', () => {
      const person = createMockPerson({ rankLevel: 3 });
      const awards = [
        createMockAward(AutoAwardCategory.RANK, 3, 'rank_level', {
          autoGrantCriteria: {
            category: AutoAwardCategory.RANK,
            threshold: 3,
            thresholdType: 'rank_level',
            stackable: false,
          },
        }),
      ];

      const result = checkRankAwards(person, awards);

      expect(result).toHaveLength(1);
    });

    it('handles undefined rankLevel as 0', () => {
      const person = createMockPerson({ rankLevel: undefined });
      const awards = [
        createMockAward(AutoAwardCategory.RANK, 1, 'rank_level', {
          autoGrantCriteria: {
            category: AutoAwardCategory.RANK,
            threshold: 1,
            thresholdType: 'rank_level',
            stackable: false,
            rankMode: 'inclusive',
          },
        }),
      ];

      const result = checkRankAwards(person, awards);

      expect(result).toHaveLength(0);
    });
  });

  describe('checkInjuryAwards', () => {
    it('grants award when injuries.length >= threshold', () => {
      const person = createMockPerson({
        injuries: [
          { id: 'inj-1', type: 'Broken Arm', location: 'Left Arm', severity: 2, daysToHeal: 14, permanent: false, acquired: new Date() },
          { id: 'inj-2', type: 'Burn', location: 'Torso', severity: 1, daysToHeal: 7, permanent: false, acquired: new Date() },
        ],
      });
      const awards = [createMockAward(AutoAwardCategory.INJURY, 2, 'injuries')];

      const result = checkInjuryAwards(person, awards);

      expect(result).toHaveLength(1);
    });

    it('does not grant award when injuries.length < threshold', () => {
      const person = createMockPerson({
        injuries: [
          { id: 'inj-1', type: 'Broken Arm', location: 'Left Arm', severity: 2, daysToHeal: 14, permanent: false, acquired: new Date() },
        ],
      });
      const awards = [createMockAward(AutoAwardCategory.INJURY, 2, 'injuries')];

      const result = checkInjuryAwards(person, awards);

      expect(result).toHaveLength(0);
    });

    it('grants multiple injury awards at different thresholds', () => {
      const person = createMockPerson({
        injuries: [
          { id: 'inj-1', type: 'Broken Arm', location: 'Left Arm', severity: 2, daysToHeal: 14, permanent: false, acquired: new Date() },
          { id: 'inj-2', type: 'Burn', location: 'Torso', severity: 1, daysToHeal: 7, permanent: false, acquired: new Date() },
          { id: 'inj-3', type: 'Concussion', location: 'Head', severity: 1, daysToHeal: 10, permanent: false, acquired: new Date() },
        ],
      });
      const awards = [
        createMockAward(AutoAwardCategory.INJURY, 1, 'injuries'),
        createMockAward(AutoAwardCategory.INJURY, 2, 'injuries'),
        createMockAward(AutoAwardCategory.INJURY, 4, 'injuries'),
      ];

      const result = checkInjuryAwards(person, awards);

      expect(result).toHaveLength(2);
    });
  });

  describe('stubbed categories', () => {
    const person = createMockPerson();
    const awards = [createMockAward(AutoAwardCategory.CONTRACT, 1, 'test')];

    it('checkContractAwards returns empty array', () => {
      expect(checkContractAwards(person, awards)).toEqual([]);
    });

    it('checkFactionHunterAwards returns empty array', () => {
      expect(checkFactionHunterAwards(person, awards)).toEqual([]);
    });

    it('checkTheatreOfWarAwards returns empty array', () => {
      expect(checkTheatreOfWarAwards(person, awards)).toEqual([]);
    });

    it('checkTrainingAwards returns empty array', () => {
      expect(checkTrainingAwards(person, awards)).toEqual([]);
    });

    it('checkScenarioKillAwards returns empty array', () => {
      expect(checkScenarioKillAwards(person, awards)).toEqual([]);
    });

    it('checkMiscAwards returns empty array', () => {
      expect(checkMiscAwards(person, awards)).toEqual([]);
    });

    it('checkCombatAwards returns empty array', () => {
      expect(checkCombatAwards(person, awards)).toEqual([]);
    });

    it('checkSurvivalAwards returns empty array', () => {
      expect(checkSurvivalAwards(person, awards)).toEqual([]);
    });

    it('checkServiceAwards returns empty array', () => {
      expect(checkServiceAwards(person, awards)).toEqual([]);
    });

    it('checkCampaignAwards returns empty array', () => {
      expect(checkCampaignAwards(person, awards)).toEqual([]);
    });

    it('checkSpecialAwards returns empty array', () => {
      expect(checkSpecialAwards(person, awards)).toEqual([]);
    });
  });

  describe('checkAwardsForCategory dispatcher', () => {
    it('routes KILL category to checkKillAwards', () => {
      const person = createMockPerson({ totalKills: 10 });
      const awards = [createMockAward(AutoAwardCategory.KILL, 5, 'kills')];
      const context: ICheckerContext = { currentDate: '3025-01-01' };

      const result = checkAwardsForCategory(AutoAwardCategory.KILL, person, awards, context);

      expect(result).toHaveLength(1);
    });

    it('routes SCENARIO category to checkScenarioAwards', () => {
      const person = createMockPerson({ missionsCompleted: 20 });
      const awards = [createMockAward(AutoAwardCategory.SCENARIO, 10, 'missions')];
      const context: ICheckerContext = { currentDate: '3025-01-01' };

      const result = checkAwardsForCategory(AutoAwardCategory.SCENARIO, person, awards, context);

      expect(result).toHaveLength(1);
    });

    it('routes TIME category to checkTimeAwards', () => {
      const person = createMockPerson({ recruitmentDate: new Date('3020-01-01') });
      const awards = [createMockAward(AutoAwardCategory.TIME, 5, 'years')];
      const context: ICheckerContext = { currentDate: '3025-06-15' };

      const result = checkAwardsForCategory(AutoAwardCategory.TIME, person, awards, context);

      expect(result).toHaveLength(1);
    });

    it('routes SKILL category to checkSkillAwards', () => {
      const person = createMockPerson({ pilotSkills: { gunnery: 3, piloting: 5 } });
      const awards = [createMockAward(AutoAwardCategory.SKILL, 4, 'skill_level')];
      const context: ICheckerContext = { currentDate: '3025-01-01' };

      const result = checkAwardsForCategory(AutoAwardCategory.SKILL, person, awards, context);

      expect(result).toHaveLength(1);
    });

    it('routes RANK category to checkRankAwards', () => {
      const person = createMockPerson({ rankLevel: 5 });
      const awards = [
        createMockAward(AutoAwardCategory.RANK, 3, 'rank_level', {
          autoGrantCriteria: {
            category: AutoAwardCategory.RANK,
            threshold: 3,
            thresholdType: 'rank_level',
            stackable: false,
            rankMode: 'inclusive',
          },
        }),
      ];
      const context: ICheckerContext = { currentDate: '3025-01-01' };

      const result = checkAwardsForCategory(AutoAwardCategory.RANK, person, awards, context);

      expect(result).toHaveLength(1);
    });

    it('routes INJURY category to checkInjuryAwards', () => {
      const person = createMockPerson({
        injuries: [
          { id: 'inj-1', type: 'Broken Arm', location: 'Left Arm', severity: 2, daysToHeal: 14, permanent: false, acquired: new Date() },
        ],
      });
      const awards = [createMockAward(AutoAwardCategory.INJURY, 1, 'injuries')];
      const context: ICheckerContext = { currentDate: '3025-01-01' };

      const result = checkAwardsForCategory(AutoAwardCategory.INJURY, person, awards, context);

      expect(result).toHaveLength(1);
    });

    it('routes stubbed categories to their respective functions', () => {
      const person = createMockPerson();
      const awards = [createMockAward(AutoAwardCategory.CONTRACT, 1, 'test')];
      const context: ICheckerContext = { currentDate: '3025-01-01' };

      expect(checkAwardsForCategory(AutoAwardCategory.CONTRACT, person, awards, context)).toEqual([]);
      expect(checkAwardsForCategory(AutoAwardCategory.FACTION_HUNTER, person, awards, context)).toEqual([]);
      expect(checkAwardsForCategory(AutoAwardCategory.THEATRE_OF_WAR, person, awards, context)).toEqual([]);
      expect(checkAwardsForCategory(AutoAwardCategory.TRAINING, person, awards, context)).toEqual([]);
      expect(checkAwardsForCategory(AutoAwardCategory.SCENARIO_KILL, person, awards, context)).toEqual([]);
      expect(checkAwardsForCategory(AutoAwardCategory.MISC, person, awards, context)).toEqual([]);
      expect(checkAwardsForCategory(AutoAwardCategory.COMBAT, person, awards, context)).toEqual([]);
      expect(checkAwardsForCategory(AutoAwardCategory.SURVIVAL, person, awards, context)).toEqual([]);
      expect(checkAwardsForCategory(AutoAwardCategory.SERVICE, person, awards, context)).toEqual([]);
      expect(checkAwardsForCategory(AutoAwardCategory.CAMPAIGN, person, awards, context)).toEqual([]);
      expect(checkAwardsForCategory(AutoAwardCategory.SPECIAL, person, awards, context)).toEqual([]);
    });
  });

  describe('award filtering', () => {
    it('ignores awards without autoGrantCriteria', () => {
      const person = createMockPerson({ totalKills: 10 });
      const awards = [
        {
          id: 'award-no-criteria',
          name: 'Test Award',
          description: 'Test',
          category: AwardCategory.Combat,
          rarity: AwardRarity.Common,
          icon: 'test',
          criteria: {
            type: CriteriaType.TotalKills,
            threshold: 5,
            description: 'Test',
          },
          repeatable: false,
          sortOrder: 0,
        } as IAward,
      ];

      const result = checkKillAwards(person, awards);

      expect(result).toHaveLength(0);
    });

    it('ignores awards with wrong category', () => {
      const person = createMockPerson({ totalKills: 10 });
      const awards = [createMockAward(AutoAwardCategory.SCENARIO, 5, 'missions')];

      const result = checkKillAwards(person, awards);

      expect(result).toHaveLength(0);
    });
  });
});
