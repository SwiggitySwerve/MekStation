import {
  IAward,
  AwardCategory,
  AwardRarity,
  CriteriaType,
} from '@/types/award/AwardInterfaces';
import { AutoAwardCategory } from '@/types/campaign/awards/autoAwardTypes';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import { CampaignPersonnelRole } from '@/types/campaign/enums';
import { IPilot, PilotStatus, PilotType } from '@/types/pilot/PilotInterfaces';

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

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeEntry(
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId: 'pilot-001',
    pilotName: 'Test Pilot',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    hireDate: new Date('3020-01-01'),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    ...overrides,
  };
}

function makePilot(overrides: Partial<IPilot> = {}): IPilot {
  return {
    id: 'pilot-001',
    name: 'Test Pilot',
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    createdAt: '3000-01-01T00:00:00Z',
    updatedAt: '3025-01-01T00:00:00Z',
    ...overrides,
  };
}

function createMockAward(
  category: AutoAwardCategory,
  threshold: number,
  thresholdType: string,
  overrides?: Partial<IAward>,
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
      const entry = makeEntry({ campaignKills: 10 });
      const pilot = makePilot();
      const awards = [createMockAward(AutoAwardCategory.KILL, 5, 'kills')];

      const result = checkKillAwards(entry, pilot, awards);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('award-kill-5');
    });

    it('does not grant award when kills < threshold', () => {
      const entry = makeEntry({ campaignKills: 3 });
      const pilot = makePilot();
      const awards = [createMockAward(AutoAwardCategory.KILL, 5, 'kills')];

      const result = checkKillAwards(entry, pilot, awards);

      expect(result).toHaveLength(0);
    });

    it('grants multiple awards at different thresholds', () => {
      const entry = makeEntry({ campaignKills: 15 });
      const pilot = makePilot();
      const awards = [
        createMockAward(AutoAwardCategory.KILL, 5, 'kills'),
        createMockAward(AutoAwardCategory.KILL, 10, 'kills'),
        createMockAward(AutoAwardCategory.KILL, 20, 'kills'),
      ];

      const result = checkKillAwards(entry, pilot, awards);

      expect(result).toHaveLength(2);
    });

    it('ignores awards from other categories', () => {
      const entry = makeEntry({ campaignKills: 10 });
      const pilot = makePilot();
      const awards = [
        createMockAward(AutoAwardCategory.KILL, 5, 'kills'),
        createMockAward(AutoAwardCategory.SCENARIO, 5, 'missions'),
      ];

      const result = checkKillAwards(entry, pilot, awards);

      expect(result).toHaveLength(1);
    });

    it('returns empty when pilot is null (NPC SKIP)', () => {
      const entry = makeEntry({ campaignKills: 100 });
      const awards = [createMockAward(AutoAwardCategory.KILL, 5, 'kills')];

      const result = checkKillAwards(entry, null, awards);

      expect(result).toHaveLength(0);
    });
  });

  describe('checkScenarioAwards', () => {
    it('grants award when missions >= threshold', () => {
      const entry = makeEntry({ campaignMissions: 20 });
      const pilot = makePilot();
      const awards = [
        createMockAward(AutoAwardCategory.SCENARIO, 10, 'missions'),
      ];

      const result = checkScenarioAwards(entry, pilot, awards);

      expect(result).toHaveLength(1);
    });

    it('does not grant award when missions < threshold', () => {
      const entry = makeEntry({ campaignMissions: 5 });
      const pilot = makePilot();
      const awards = [
        createMockAward(AutoAwardCategory.SCENARIO, 10, 'missions'),
      ];

      const result = checkScenarioAwards(entry, pilot, awards);

      expect(result).toHaveLength(0);
    });

    it('grants multiple scenario awards', () => {
      const entry = makeEntry({ campaignMissions: 30 });
      const pilot = makePilot();
      const awards = [
        createMockAward(AutoAwardCategory.SCENARIO, 10, 'missions'),
        createMockAward(AutoAwardCategory.SCENARIO, 20, 'missions'),
        createMockAward(AutoAwardCategory.SCENARIO, 40, 'missions'),
      ];

      const result = checkScenarioAwards(entry, pilot, awards);

      expect(result).toHaveLength(2);
    });

    it('returns empty when pilot is null (NPC SKIP)', () => {
      const entry = makeEntry({ campaignMissions: 100 });
      const awards = [
        createMockAward(AutoAwardCategory.SCENARIO, 1, 'missions'),
      ];

      expect(checkScenarioAwards(entry, null, awards)).toHaveLength(0);
    });
  });

  describe('checkTimeAwards', () => {
    it('grants award when years of service >= threshold', () => {
      const entry = makeEntry({ hireDate: new Date('3020-01-01') });
      const pilot = makePilot();
      const context: ICheckerContext = { currentDate: '3025-06-15' };
      const awards = [createMockAward(AutoAwardCategory.TIME, 5, 'years')];

      const result = checkTimeAwards(entry, pilot, awards, context);

      expect(result).toHaveLength(1);
    });

    it('does not grant award when service < threshold', () => {
      const entry = makeEntry({ hireDate: new Date('3024-01-01') });
      const pilot = makePilot();
      const context: ICheckerContext = { currentDate: '3025-06-15' };
      const awards = [createMockAward(AutoAwardCategory.TIME, 5, 'years')];

      const result = checkTimeAwards(entry, pilot, awards, context);

      expect(result).toHaveLength(0);
    });

    it('calculates years correctly with fractional years', () => {
      const entry = makeEntry({ hireDate: new Date('3020-01-01') });
      const pilot = makePilot();
      const context: ICheckerContext = { currentDate: '3025-06-15' };
      const awards = [
        createMockAward(AutoAwardCategory.TIME, 5, 'years'),
        createMockAward(AutoAwardCategory.TIME, 6, 'years'),
      ];

      const result = checkTimeAwards(entry, pilot, awards, context);

      expect(result).toHaveLength(1);
    });

    it('handles hire date as Date object', () => {
      const entry = makeEntry({ hireDate: new Date('3020-01-01') });
      const pilot = makePilot();
      const context: ICheckerContext = { currentDate: '3025-06-15' };
      const awards = [createMockAward(AutoAwardCategory.TIME, 5, 'years')];

      const result = checkTimeAwards(entry, pilot, awards, context);

      expect(result).toHaveLength(1);
    });

    it('returns empty when pilot is null (NPC SKIP)', () => {
      const entry = makeEntry({ hireDate: new Date('3000-01-01') });
      const context: ICheckerContext = { currentDate: '3025-06-15' };
      const awards = [createMockAward(AutoAwardCategory.TIME, 1, 'years')];

      expect(checkTimeAwards(entry, null, awards, context)).toHaveLength(0);
    });
  });

  describe('checkSkillAwards', () => {
    it('grants gunnery award when gunnery <= threshold', () => {
      const entry = makeEntry();
      const pilot = makePilot({ skills: { gunnery: 3, piloting: 5 } });
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

      const result = checkSkillAwards(entry, pilot, awards);

      expect(result).toHaveLength(1);
    });

    it('does not grant gunnery award when gunnery > threshold', () => {
      const entry = makeEntry();
      const pilot = makePilot({ skills: { gunnery: 5, piloting: 5 } });
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

      const result = checkSkillAwards(entry, pilot, awards);

      expect(result).toHaveLength(0);
    });

    it('grants piloting award when piloting <= threshold', () => {
      const entry = makeEntry();
      const pilot = makePilot({ skills: { gunnery: 4, piloting: 3 } });
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

      const result = checkSkillAwards(entry, pilot, awards);

      expect(result).toHaveLength(1);
    });

    it('grants generic skill award when best skill <= threshold', () => {
      const entry = makeEntry();
      const pilot = makePilot({ skills: { gunnery: 3, piloting: 5 } });
      const awards = [
        createMockAward(AutoAwardCategory.SKILL, 4, 'skill_level'),
      ];

      const result = checkSkillAwards(entry, pilot, awards);

      expect(result).toHaveLength(1);
    });

    it('does not grant generic skill award when best skill > threshold', () => {
      const entry = makeEntry();
      const pilot = makePilot({ skills: { gunnery: 5, piloting: 6 } });
      const awards = [
        createMockAward(AutoAwardCategory.SKILL, 4, 'skill_level'),
      ];

      const result = checkSkillAwards(entry, pilot, awards);

      expect(result).toHaveLength(0);
    });

    it('returns empty when pilot is null (NPC SKIP)', () => {
      const entry = makeEntry();
      const awards = [
        createMockAward(AutoAwardCategory.SKILL, 8, 'skill_level'),
      ];

      expect(checkSkillAwards(entry, null, awards)).toHaveLength(0);
    });
  });

  describe('checkRankAwards', () => {
    it('grants award in inclusive mode when rankIndex >= threshold', () => {
      const entry = makeEntry({ rankIndex: 5 });
      const pilot = makePilot();
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

      const result = checkRankAwards(entry, pilot, awards);

      expect(result).toHaveLength(1);
    });

    it('does not grant award in inclusive mode when rankIndex < threshold', () => {
      const entry = makeEntry({ rankIndex: 2 });
      const pilot = makePilot();
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

      const result = checkRankAwards(entry, pilot, awards);

      expect(result).toHaveLength(0);
    });

    it('grants award in exclusive mode only when rankIndex > threshold', () => {
      const entry = makeEntry({ rankIndex: 4 });
      const pilot = makePilot();
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

      const result = checkRankAwards(entry, pilot, awards);

      expect(result).toHaveLength(1);
    });

    it('does not grant award in exclusive mode when rankIndex <= threshold', () => {
      const entry = makeEntry({ rankIndex: 3 });
      const pilot = makePilot();
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

      const result = checkRankAwards(entry, pilot, awards);

      expect(result).toHaveLength(0);
    });

    it('grants award in promotion mode only on exact match', () => {
      const entry = makeEntry({ rankIndex: 3 });
      const pilot = makePilot();
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

      const result = checkRankAwards(entry, pilot, awards);

      expect(result).toHaveLength(1);
    });

    it('does not grant award in promotion mode when rankIndex != threshold', () => {
      const entry = makeEntry({ rankIndex: 4 });
      const pilot = makePilot();
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

      const result = checkRankAwards(entry, pilot, awards);

      expect(result).toHaveLength(0);
    });

    it('defaults to inclusive mode when rankMode not specified', () => {
      const entry = makeEntry({ rankIndex: 3 });
      const pilot = makePilot();
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

      const result = checkRankAwards(entry, pilot, awards);

      expect(result).toHaveLength(1);
    });

    it('handles rankIndex 0 as below threshold 1', () => {
      const entry = makeEntry({ rankIndex: 0 });
      const pilot = makePilot();
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

      const result = checkRankAwards(entry, pilot, awards);

      expect(result).toHaveLength(0);
    });

    it('returns empty when pilot is null (NPC SKIP)', () => {
      const entry = makeEntry({ rankIndex: 99 });
      const awards = [createMockAward(AutoAwardCategory.RANK, 1, 'rank_level')];

      expect(checkRankAwards(entry, null, awards)).toHaveLength(0);
    });
  });

  describe('checkInjuryAwards', () => {
    it('grants award when injuries.length >= threshold', () => {
      const entry = makeEntry({
        injuries: [
          {
            id: 'inj-1',
            type: 'Broken Arm',
            location: 'Left Arm',
            severity: 2,
            daysToHeal: 14,
            permanent: false,
            acquired: new Date(),
          },
          {
            id: 'inj-2',
            type: 'Burn',
            location: 'Torso',
            severity: 1,
            daysToHeal: 7,
            permanent: false,
            acquired: new Date(),
          },
        ],
      });
      const pilot = makePilot();
      const awards = [createMockAward(AutoAwardCategory.INJURY, 2, 'injuries')];

      const result = checkInjuryAwards(entry, pilot, awards);

      expect(result).toHaveLength(1);
    });

    it('does not grant award when injuries.length < threshold', () => {
      const entry = makeEntry({
        injuries: [
          {
            id: 'inj-1',
            type: 'Broken Arm',
            location: 'Left Arm',
            severity: 2,
            daysToHeal: 14,
            permanent: false,
            acquired: new Date(),
          },
        ],
      });
      const pilot = makePilot();
      const awards = [createMockAward(AutoAwardCategory.INJURY, 2, 'injuries')];

      const result = checkInjuryAwards(entry, pilot, awards);

      expect(result).toHaveLength(0);
    });

    it('grants multiple injury awards at different thresholds', () => {
      const entry = makeEntry({
        injuries: [
          {
            id: 'inj-1',
            type: 'Broken Arm',
            location: 'Left Arm',
            severity: 2,
            daysToHeal: 14,
            permanent: false,
            acquired: new Date(),
          },
          {
            id: 'inj-2',
            type: 'Burn',
            location: 'Torso',
            severity: 1,
            daysToHeal: 7,
            permanent: false,
            acquired: new Date(),
          },
          {
            id: 'inj-3',
            type: 'Concussion',
            location: 'Head',
            severity: 1,
            daysToHeal: 10,
            permanent: false,
            acquired: new Date(),
          },
        ],
      });
      const pilot = makePilot();
      const awards = [
        createMockAward(AutoAwardCategory.INJURY, 1, 'injuries'),
        createMockAward(AutoAwardCategory.INJURY, 2, 'injuries'),
        createMockAward(AutoAwardCategory.INJURY, 4, 'injuries'),
      ];

      const result = checkInjuryAwards(entry, pilot, awards);

      expect(result).toHaveLength(2);
    });

    it('treats undefined injuries as empty array', () => {
      const entry = makeEntry({ injuries: undefined });
      const pilot = makePilot();
      const awards = [createMockAward(AutoAwardCategory.INJURY, 1, 'injuries')];

      const result = checkInjuryAwards(entry, pilot, awards);

      expect(result).toHaveLength(0);
    });

    it('returns empty when pilot is null (NPC SKIP)', () => {
      const entry = makeEntry({
        injuries: [
          {
            id: 'inj-1',
            type: 'Burn',
            location: 'Torso',
            severity: 1,
            daysToHeal: 7,
            permanent: false,
            acquired: new Date(),
          },
        ],
      });
      const awards = [createMockAward(AutoAwardCategory.INJURY, 1, 'injuries')];

      expect(checkInjuryAwards(entry, null, awards)).toHaveLength(0);
    });
  });

  describe('stubbed categories', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const awards = [createMockAward(AutoAwardCategory.CONTRACT, 1, 'test')];

    it('checkContractAwards returns empty array', () => {
      expect(checkContractAwards(entry, pilot, awards)).toEqual([]);
    });

    it('checkFactionHunterAwards returns empty array', () => {
      expect(checkFactionHunterAwards(entry, pilot, awards)).toEqual([]);
    });

    it('checkTheatreOfWarAwards returns empty array', () => {
      expect(checkTheatreOfWarAwards(entry, pilot, awards)).toEqual([]);
    });

    it('checkTrainingAwards returns empty array', () => {
      expect(checkTrainingAwards(entry, pilot, awards)).toEqual([]);
    });

    it('checkScenarioKillAwards returns empty array', () => {
      expect(checkScenarioKillAwards(entry, pilot, awards)).toEqual([]);
    });

    it('checkMiscAwards returns empty array', () => {
      expect(checkMiscAwards(entry, pilot, awards)).toEqual([]);
    });

    it('checkCombatAwards returns empty array', () => {
      expect(checkCombatAwards(entry, pilot, awards)).toEqual([]);
    });

    it('checkSurvivalAwards returns empty array', () => {
      expect(checkSurvivalAwards(entry, pilot, awards)).toEqual([]);
    });

    it('checkServiceAwards returns empty array', () => {
      expect(checkServiceAwards(entry, pilot, awards)).toEqual([]);
    });

    it('checkCampaignAwards returns empty array', () => {
      expect(checkCampaignAwards(entry, pilot, awards)).toEqual([]);
    });

    it('checkSpecialAwards returns empty array', () => {
      expect(checkSpecialAwards(entry, pilot, awards)).toEqual([]);
    });

    it('all stubs return empty when pilot is null (NPC SKIP)', () => {
      expect(checkContractAwards(entry, null, awards)).toEqual([]);
      expect(checkFactionHunterAwards(entry, null, awards)).toEqual([]);
      expect(checkTheatreOfWarAwards(entry, null, awards)).toEqual([]);
      expect(checkTrainingAwards(entry, null, awards)).toEqual([]);
      expect(checkScenarioKillAwards(entry, null, awards)).toEqual([]);
      expect(checkMiscAwards(entry, null, awards)).toEqual([]);
      expect(checkCombatAwards(entry, null, awards)).toEqual([]);
      expect(checkSurvivalAwards(entry, null, awards)).toEqual([]);
      expect(checkServiceAwards(entry, null, awards)).toEqual([]);
      expect(checkCampaignAwards(entry, null, awards)).toEqual([]);
      expect(checkSpecialAwards(entry, null, awards)).toEqual([]);
    });
  });

  describe('checkAwardsForCategory dispatcher', () => {
    it('routes KILL category to checkKillAwards', () => {
      const entry = makeEntry({ campaignKills: 10 });
      const pilot = makePilot();
      const awards = [createMockAward(AutoAwardCategory.KILL, 5, 'kills')];
      const context: ICheckerContext = { currentDate: '3025-01-01' };

      const result = checkAwardsForCategory(
        AutoAwardCategory.KILL,
        entry,
        pilot,
        awards,
        context,
      );

      expect(result).toHaveLength(1);
    });

    it('routes SCENARIO category to checkScenarioAwards', () => {
      const entry = makeEntry({ campaignMissions: 20 });
      const pilot = makePilot();
      const awards = [
        createMockAward(AutoAwardCategory.SCENARIO, 10, 'missions'),
      ];
      const context: ICheckerContext = { currentDate: '3025-01-01' };

      const result = checkAwardsForCategory(
        AutoAwardCategory.SCENARIO,
        entry,
        pilot,
        awards,
        context,
      );

      expect(result).toHaveLength(1);
    });

    it('routes TIME category to checkTimeAwards', () => {
      const entry = makeEntry({ hireDate: new Date('3020-01-01') });
      const pilot = makePilot();
      const awards = [createMockAward(AutoAwardCategory.TIME, 5, 'years')];
      const context: ICheckerContext = { currentDate: '3025-06-15' };

      const result = checkAwardsForCategory(
        AutoAwardCategory.TIME,
        entry,
        pilot,
        awards,
        context,
      );

      expect(result).toHaveLength(1);
    });

    it('routes SKILL category to checkSkillAwards', () => {
      const entry = makeEntry();
      const pilot = makePilot({ skills: { gunnery: 3, piloting: 5 } });
      const awards = [
        createMockAward(AutoAwardCategory.SKILL, 4, 'skill_level'),
      ];
      const context: ICheckerContext = { currentDate: '3025-01-01' };

      const result = checkAwardsForCategory(
        AutoAwardCategory.SKILL,
        entry,
        pilot,
        awards,
        context,
      );

      expect(result).toHaveLength(1);
    });

    it('routes RANK category to checkRankAwards', () => {
      const entry = makeEntry({ rankIndex: 5 });
      const pilot = makePilot();
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

      const result = checkAwardsForCategory(
        AutoAwardCategory.RANK,
        entry,
        pilot,
        awards,
        context,
      );

      expect(result).toHaveLength(1);
    });

    it('routes INJURY category to checkInjuryAwards', () => {
      const entry = makeEntry({
        injuries: [
          {
            id: 'inj-1',
            type: 'Broken Arm',
            location: 'Left Arm',
            severity: 2,
            daysToHeal: 14,
            permanent: false,
            acquired: new Date(),
          },
        ],
      });
      const pilot = makePilot();
      const awards = [createMockAward(AutoAwardCategory.INJURY, 1, 'injuries')];
      const context: ICheckerContext = { currentDate: '3025-01-01' };

      const result = checkAwardsForCategory(
        AutoAwardCategory.INJURY,
        entry,
        pilot,
        awards,
        context,
      );

      expect(result).toHaveLength(1);
    });

    it('routes stubbed categories to their respective functions', () => {
      const entry = makeEntry();
      const pilot = makePilot();
      const awards = [createMockAward(AutoAwardCategory.CONTRACT, 1, 'test')];
      const context: ICheckerContext = { currentDate: '3025-01-01' };

      expect(
        checkAwardsForCategory(
          AutoAwardCategory.CONTRACT,
          entry,
          pilot,
          awards,
          context,
        ),
      ).toEqual([]);
      expect(
        checkAwardsForCategory(
          AutoAwardCategory.FACTION_HUNTER,
          entry,
          pilot,
          awards,
          context,
        ),
      ).toEqual([]);
      expect(
        checkAwardsForCategory(
          AutoAwardCategory.THEATRE_OF_WAR,
          entry,
          pilot,
          awards,
          context,
        ),
      ).toEqual([]);
      expect(
        checkAwardsForCategory(
          AutoAwardCategory.TRAINING,
          entry,
          pilot,
          awards,
          context,
        ),
      ).toEqual([]);
      expect(
        checkAwardsForCategory(
          AutoAwardCategory.SCENARIO_KILL,
          entry,
          pilot,
          awards,
          context,
        ),
      ).toEqual([]);
      expect(
        checkAwardsForCategory(
          AutoAwardCategory.MISC,
          entry,
          pilot,
          awards,
          context,
        ),
      ).toEqual([]);
      expect(
        checkAwardsForCategory(
          AutoAwardCategory.COMBAT,
          entry,
          pilot,
          awards,
          context,
        ),
      ).toEqual([]);
      expect(
        checkAwardsForCategory(
          AutoAwardCategory.SURVIVAL,
          entry,
          pilot,
          awards,
          context,
        ),
      ).toEqual([]);
      expect(
        checkAwardsForCategory(
          AutoAwardCategory.SERVICE,
          entry,
          pilot,
          awards,
          context,
        ),
      ).toEqual([]);
      expect(
        checkAwardsForCategory(
          AutoAwardCategory.CAMPAIGN,
          entry,
          pilot,
          awards,
          context,
        ),
      ).toEqual([]);
      expect(
        checkAwardsForCategory(
          AutoAwardCategory.SPECIAL,
          entry,
          pilot,
          awards,
          context,
        ),
      ).toEqual([]);
    });

    it('all categories return empty when pilot is null (NPC SKIP)', () => {
      const entry = makeEntry({
        campaignKills: 100,
        campaignMissions: 100,
        rankIndex: 10,
      });
      const awards = [createMockAward(AutoAwardCategory.KILL, 1, 'kills')];
      const context: ICheckerContext = { currentDate: '3025-01-01' };

      for (const category of Object.values(AutoAwardCategory)) {
        expect(
          checkAwardsForCategory(category, entry, null, awards, context),
        ).toEqual([]);
      }
    });
  });

  describe('award filtering', () => {
    it('ignores awards without autoGrantCriteria', () => {
      const entry = makeEntry({ campaignKills: 10 });
      const pilot = makePilot();
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

      const result = checkKillAwards(entry, pilot, awards);

      expect(result).toHaveLength(0);
    });

    it('ignores awards with wrong category', () => {
      const entry = makeEntry({ campaignKills: 10 });
      const pilot = makePilot();
      const awards = [
        createMockAward(AutoAwardCategory.SCENARIO, 5, 'missions'),
      ];

      const result = checkKillAwards(entry, pilot, awards);

      expect(result).toHaveLength(0);
    });
  });
});
