import { describe, it, expect, beforeEach } from '@jest/globals';

import {
  AutoAwardCategory,
  createDefaultAutoAwardConfig,
} from '@/types/campaign/awards/autoAwardTypes';
import {
  ICampaign,
  createDefaultCampaignOptions,
} from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { Money } from '@/types/campaign/Money';
import { IPerson } from '@/types/campaign/Person';

import { processAutoAwards, getEligiblePersonnel } from '../autoAwardEngine';

function createTestCampaign(overrides?: Partial<ICampaign>): ICampaign {
  const options = {
    ...createDefaultCampaignOptions(),
    autoAwardConfig: createDefaultAutoAwardConfig(),
  };

  return {
    id: 'campaign-test',
    name: 'Test Campaign',
    currentDate: new Date('3025-06-15'),
    factionId: 'mercenary',
    personnel: new Map(),
    forces: new Map(),
    rootForceId: 'root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(0) },
    factionStandings: {},
    options,
    campaignType: CampaignType.MERCENARY,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
    // Per canonicalize-unit-combat-state PR-A: required ICampaign field.
    unitCombatStates: overrides?.unitCombatStates ?? {},
  };
}

function createTestPerson(overrides?: Partial<IPerson>): IPerson {
  return {
    id: 'person-test',
    name: 'Test Pilot',
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: 'MechWarrior',
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
    pilotSkills: { gunnery: 4, piloting: 5 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('autoAwardEngine', () => {
  let campaign: ICampaign;

  beforeEach(() => {
    campaign = createTestCampaign();
  });

  describe('processAutoAwards', () => {
    it('returns empty array when autoAwardConfig is undefined', () => {
      const campaignNoConfig = createTestCampaign({
        options: { ...campaign.options, autoAwardConfig: undefined },
      });
      const person = createTestPerson({ totalKills: 10 });
      campaignNoConfig.personnel.set(person.id, person);

      const events = processAutoAwards(campaignNoConfig, 'manual');

      expect(events).toEqual([]);
    });

    it('returns empty array when enableAutoAwards is false', () => {
      const config = {
        ...createDefaultAutoAwardConfig(),
        enableAutoAwards: false,
      };
      const campaignWithConfig = createTestCampaign({
        options: { ...campaign.options, autoAwardConfig: config },
      });

      const person = createTestPerson({ totalKills: 10 });
      campaignWithConfig.personnel.set(person.id, person);

      const events = processAutoAwards(campaignWithConfig, 'manual');

      expect(events).toEqual([]);
    });

    it('returns empty array when personnel map is empty', () => {
      const events = processAutoAwards(campaign, 'manual');

      expect(events).toEqual([]);
    });

    // PR2 transitional note: pilot===null for all personnel (no vault join yet).
    // Category checkers return [] for null pilot (NPC skip per Council #2).
    // Kill/scenario/time/injury awards fire via entry fields not pilot fields.
    // Skill/rank/contract etc. require non-null pilot and return [] in PR2.
    it('returns empty array for all categories in PR2 (pilot===null NPC skip)', () => {
      const person = createTestPerson({ totalKills: 10 });
      campaign.personnel.set(person.id, person);

      const events = processAutoAwards(campaign, 'manual');

      // In PR2 all pilots are null → all category checkers return [] → no events
      expect(events).toEqual([]);
    });

    it('returns empty array even when kills are high (pilot===null)', () => {
      const person = createTestPerson({ totalKills: 25 });
      campaign.personnel.set(person.id, person);

      const events = processAutoAwards(campaign, 'manual');

      expect(events).toEqual([]);
    });

    it('only checks enabled categories', () => {
      const baseConfig = createDefaultAutoAwardConfig();
      const config = {
        ...baseConfig,
        enabledCategories: {
          ...baseConfig.enabledCategories,
          [AutoAwardCategory.KILL]: false,
        },
      };
      const campaignWithConfig = createTestCampaign({
        options: { ...campaign.options, autoAwardConfig: config },
      });

      const person = createTestPerson({ totalKills: 10 });
      campaignWithConfig.personnel.set(person.id, person);

      const events = processAutoAwards(campaignWithConfig, 'manual');

      const killEvents = events.filter(
        (e) => e.category === AutoAwardCategory.KILL,
      );
      expect(killEvents).toEqual([]);
    });

    it('dead personnel excluded when enablePosthumous=false', () => {
      const config = {
        ...createDefaultAutoAwardConfig(),
        enablePosthumous: false,
      };
      const campaignWithConfig = createTestCampaign({
        options: { ...campaign.options, autoAwardConfig: config },
      });

      const person = createTestPerson({
        status: PersonnelStatus.KIA,
        totalKills: 10,
      });
      campaignWithConfig.personnel.set(person.id, person);

      const events = processAutoAwards(campaignWithConfig, 'manual');

      expect(events).toEqual([]);
    });

    it('dead personnel included when enablePosthumous=true — still no events (pilot===null)', () => {
      const config = {
        ...createDefaultAutoAwardConfig(),
        enablePosthumous: true,
      };
      const campaignWithConfig = createTestCampaign({
        options: { ...campaign.options, autoAwardConfig: config },
      });

      const person = createTestPerson({
        status: PersonnelStatus.KIA,
        totalKills: 10,
      });
      campaignWithConfig.personnel.set(person.id, person);

      // PR2: pilot===null → all checkers return [] → no events even for posthumous
      const events = processAutoAwards(campaignWithConfig, 'manual');
      expect(events).toEqual([]);
    });

    it('civilians excluded', () => {
      const person = createTestPerson({
        primaryRole: CampaignPersonnelRole.DEPENDENT,
        totalKills: 10,
      });
      campaign.personnel.set(person.id, person);

      const events = processAutoAwards(campaign, 'manual');

      expect(events).toEqual([]);
    });

    it('multiple personnel processed — no events in PR2 (pilot===null)', () => {
      const person1 = createTestPerson({
        id: 'person-1',
        totalKills: 10,
      });
      const person2 = createTestPerson({
        id: 'person-2',
        totalKills: 5,
      });
      campaign.personnel.set(person1.id, person1);
      campaign.personnel.set(person2.id, person2);

      // PR2: pilot===null → no events; but both persons are eligible (entry pairs produced)
      const events = processAutoAwards(campaign, 'manual');
      expect(events).toEqual([]);
    });

    it('handles multiple triggers correctly — trigger field set even with empty results', () => {
      const person = createTestPerson({ totalKills: 10 });
      campaign.personnel.set(person.id, person);

      const manualEvents = processAutoAwards(campaign, 'manual');
      const monthlyEvents = processAutoAwards(campaign, 'monthly');
      const postMissionEvents = processAutoAwards(campaign, 'post_mission');

      // PR2: no events produced, but trigger handling is correct (no throw)
      expect(manualEvents).toEqual([]);
      expect(monthlyEvents).toEqual([]);
      expect(postMissionEvents).toEqual([]);
    });

    it('handles currentDate as Date object without throwing', () => {
      const campaignWithDate = createTestCampaign({
        currentDate: new Date('3025-06-15'),
      });
      const person = createTestPerson({ totalKills: 10 });
      campaignWithDate.personnel.set(person.id, person);

      expect(() => processAutoAwards(campaignWithDate, 'manual')).not.toThrow();
    });

    it('grants awards to support roles (they are not civilians)', () => {
      const testCampaign = createTestCampaign();
      const person = createTestPerson({
        primaryRole: CampaignPersonnelRole.TECH,
        totalKills: 10,
      });
      testCampaign.personnel.set(person.id, person);

      const eligible = getEligiblePersonnel(
        testCampaign,
        testCampaign.options.autoAwardConfig!,
      );

      // PR2: return type is { entry, pilot }[]; extract pilotId to identify person
      expect(eligible.map(({ entry }) => entry.pilotId)).toContain(person.id);
    });

    it('grants awards to combat roles', () => {
      const testCampaign = createTestCampaign();
      const person = createTestPerson({
        primaryRole: CampaignPersonnelRole.PILOT,
        totalKills: 10,
      });
      testCampaign.personnel.set(person.id, person);

      const eligible = getEligiblePersonnel(
        testCampaign,
        testCampaign.options.autoAwardConfig!,
      );

      expect(eligible.map(({ entry }) => entry.pilotId)).toContain(person.id);
    });

    it('grants awards to aerospace pilots', () => {
      const testCampaign = createTestCampaign();
      const person = createTestPerson({
        primaryRole: CampaignPersonnelRole.AEROSPACE_PILOT,
        totalKills: 10,
      });
      testCampaign.personnel.set(person.id, person);

      const eligible = getEligiblePersonnel(
        testCampaign,
        testCampaign.options.autoAwardConfig!,
      );

      expect(eligible.map(({ entry }) => entry.pilotId)).toContain(person.id);
    });

    it('grants awards to vehicle drivers', () => {
      const testCampaign = createTestCampaign();
      const person = createTestPerson({
        primaryRole: CampaignPersonnelRole.VEHICLE_DRIVER,
        totalKills: 10,
      });
      testCampaign.personnel.set(person.id, person);

      const eligible = getEligiblePersonnel(
        testCampaign,
        testCampaign.options.autoAwardConfig!,
      );

      expect(eligible.map(({ entry }) => entry.pilotId)).toContain(person.id);
    });

    it('grants awards to doctors (they are not civilians)', () => {
      const testCampaign = createTestCampaign();
      const person = createTestPerson({
        primaryRole: CampaignPersonnelRole.DOCTOR,
        totalKills: 10,
      });
      testCampaign.personnel.set(person.id, person);

      const eligible = getEligiblePersonnel(
        testCampaign,
        testCampaign.options.autoAwardConfig!,
      );

      expect(eligible.map(({ entry }) => entry.pilotId)).toContain(person.id);
    });

    it('grants awards to admin staff (they are not civilians)', () => {
      const testCampaign = createTestCampaign();
      const person = createTestPerson({
        primaryRole: CampaignPersonnelRole.ADMIN_COMMAND,
        totalKills: 10,
      });
      testCampaign.personnel.set(person.id, person);

      const eligible = getEligiblePersonnel(
        testCampaign,
        testCampaign.options.autoAwardConfig!,
      );

      expect(eligible.map(({ entry }) => entry.pilotId)).toContain(person.id);
    });
  });

  describe('getEligiblePersonnel', () => {
    it('filters correctly — returns { entry, pilot } pairs', () => {
      const config = {
        ...createDefaultAutoAwardConfig(),
        enablePosthumous: false,
      };

      const activePilot = createTestPerson({
        id: 'active-pilot',
        status: PersonnelStatus.ACTIVE,
        primaryRole: CampaignPersonnelRole.PILOT,
      });
      const kiaPilot = createTestPerson({
        id: 'kia-pilot',
        status: PersonnelStatus.KIA,
        primaryRole: CampaignPersonnelRole.PILOT,
      });
      const civilian = createTestPerson({
        id: 'civilian',
        status: PersonnelStatus.ACTIVE,
        primaryRole: CampaignPersonnelRole.DEPENDENT,
      });

      campaign.personnel.set(activePilot.id, activePilot);
      campaign.personnel.set(kiaPilot.id, kiaPilot);
      campaign.personnel.set(civilian.id, civilian);

      const eligible = getEligiblePersonnel(campaign, config);

      // Return type is { entry, pilot }[] — extract pilotId to identify
      const eligibleIds = eligible.map(({ entry }) => entry.pilotId);
      expect(eligibleIds).toContain('active-pilot');
      expect(eligibleIds).not.toContain('civilian');
      expect(eligibleIds).not.toContain('kia-pilot');
    });

    it('pilot field is null for all entries in PR2 (no vault join yet)', () => {
      const config = createDefaultAutoAwardConfig();

      const person = createTestPerson({
        id: 'some-pilot',
        status: PersonnelStatus.ACTIVE,
        primaryRole: CampaignPersonnelRole.PILOT,
      });
      campaign.personnel.set(person.id, person);

      const eligible = getEligiblePersonnel(campaign, config);

      expect(eligible.length).toBe(1);
      // PR2 transitional: vault join not yet wired — pilot always null
      expect(eligible[0].pilot).toBeNull();
    });

    it('includes dead personnel when enablePosthumous=true', () => {
      const config = {
        ...createDefaultAutoAwardConfig(),
        enablePosthumous: true,
      };

      const kiaPilot = createTestPerson({
        id: 'kia-pilot',
        status: PersonnelStatus.KIA,
        primaryRole: CampaignPersonnelRole.PILOT,
      });

      campaign.personnel.set(kiaPilot.id, kiaPilot);

      const eligible = getEligiblePersonnel(campaign, config);

      expect(eligible.map(({ entry }) => entry.pilotId)).toContain('kia-pilot');
    });

    it('excludes dead personnel when enablePosthumous=false', () => {
      const config = {
        ...createDefaultAutoAwardConfig(),
        enablePosthumous: false,
      };

      const kiaPilot = createTestPerson({
        id: 'kia-pilot',
        status: PersonnelStatus.KIA,
        primaryRole: CampaignPersonnelRole.PILOT,
      });

      campaign.personnel.set(kiaPilot.id, kiaPilot);

      const eligible = getEligiblePersonnel(campaign, config);

      expect(eligible.map(({ entry }) => entry.pilotId)).not.toContain(
        'kia-pilot',
      );
    });

    it('excludes all civilian roles', () => {
      const config = createDefaultAutoAwardConfig();

      const civilianRoles = [
        CampaignPersonnelRole.DEPENDENT,
        CampaignPersonnelRole.CIVILIAN_OTHER,
        CampaignPersonnelRole.MERCHANT,
        CampaignPersonnelRole.TEACHER,
      ];

      civilianRoles.forEach((role, index) => {
        const person = createTestPerson({
          id: `civilian-${index}`,
          primaryRole: role,
        });
        campaign.personnel.set(person.id, person);
      });

      const eligible = getEligiblePersonnel(campaign, config);

      expect(eligible).toEqual([]);
    });

    it('includes all combat roles', () => {
      const config = createDefaultAutoAwardConfig();

      const combatRoles = [
        CampaignPersonnelRole.PILOT,
        CampaignPersonnelRole.AEROSPACE_PILOT,
        CampaignPersonnelRole.VEHICLE_DRIVER,
        CampaignPersonnelRole.SOLDIER,
      ];

      combatRoles.forEach((role, index) => {
        const person = createTestPerson({
          id: `combat-${index}`,
          primaryRole: role,
        });
        campaign.personnel.set(person.id, person);
      });

      const eligible = getEligiblePersonnel(campaign, config);

      expect(eligible.length).toBe(combatRoles.length);
    });

    it('includes all support roles (they are not civilians)', () => {
      const testCampaign = createTestCampaign();
      const config = createDefaultAutoAwardConfig();

      const supportRoles = [
        CampaignPersonnelRole.TECH,
        CampaignPersonnelRole.DOCTOR,
        CampaignPersonnelRole.MEDIC,
        CampaignPersonnelRole.ADMIN_COMMAND,
      ];

      supportRoles.forEach((role, index) => {
        const person = createTestPerson({
          id: `support-${index}`,
          primaryRole: role,
        });
        testCampaign.personnel.set(person.id, person);
      });

      const eligible = getEligiblePersonnel(testCampaign, config);

      expect(eligible.length).toBe(supportRoles.length);
    });

    it('excludes non-active personnel', () => {
      const config = createDefaultAutoAwardConfig();

      const statuses = [
        PersonnelStatus.WOUNDED,
        PersonnelStatus.ON_LEAVE,
        PersonnelStatus.RETIRED,
      ];

      statuses.forEach((status, index) => {
        const person = createTestPerson({
          id: `person-${index}`,
          status,
          primaryRole: CampaignPersonnelRole.PILOT,
        });
        campaign.personnel.set(person.id, person);
      });

      const eligible = getEligiblePersonnel(campaign, config);

      expect(eligible).toEqual([]);
    });

    it('synthesizes entry from IPerson with correct field mapping', () => {
      const config = createDefaultAutoAwardConfig();

      const person = createTestPerson({
        id: 'map-test',
        totalKills: 7,
        missionsCompleted: 12,
        recruitmentDate: new Date('3018-03-01'),
        rankIndex: 2,
      });
      campaign.personnel.set(person.id, person);

      const eligible = getEligiblePersonnel(campaign, config);

      expect(eligible.length).toBe(1);
      const { entry } = eligible[0];
      expect(entry.pilotId).toBe('map-test');
      expect(entry.campaignKills).toBe(7);
      expect(entry.campaignMissions).toBe(12);
      expect(entry.rankIndex).toBe(2);
    });
  });
});
