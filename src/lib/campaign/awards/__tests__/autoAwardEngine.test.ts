import { describe, it, expect, beforeEach } from '@jest/globals';
import { ICampaign, createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { IPerson } from '@/types/campaign/Person';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import {
  AutoAwardCategory,
  createDefaultAutoAwardConfig,
} from '@/types/campaign/awards/autoAwardTypes';
import { Money } from '@/types/campaign/Money';
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
      const config = { ...createDefaultAutoAwardConfig(), enableAutoAwards: false };
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

    it('grants kill award when person has enough kills', () => {
      const person = createTestPerson({ totalKills: 10 });
      campaign.personnel.set(person.id, person);

      const events = processAutoAwards(campaign, 'manual');

      const killEvents = events.filter(e => e.category === AutoAwardCategory.KILL);
      expect(killEvents.length).toBeGreaterThan(0);
      expect(killEvents.some(e => e.awardId === 'double-ace')).toBe(true);
    });

    it('does NOT grant kill award when kills below threshold', () => {
      const person = createTestPerson({ totalKills: 2 });
      campaign.personnel.set(person.id, person);

      const events = processAutoAwards(campaign, 'manual');

      const killEvents = events.filter(e => e.category === AutoAwardCategory.KILL);
      expect(killEvents.some(e => e.awardId === 'double-ace')).toBe(false);
    });

    it('only checks enabled categories', () => {
      const baseConfig = createDefaultAutoAwardConfig();
      const config = {
        ...baseConfig,
        enabledCategories: { ...baseConfig.enabledCategories, [AutoAwardCategory.KILL]: false },
      };
      const campaignWithConfig = createTestCampaign({
        options: { ...campaign.options, autoAwardConfig: config },
      });

      const person = createTestPerson({ totalKills: 10 });
      campaignWithConfig.personnel.set(person.id, person);

      const events = processAutoAwards(campaignWithConfig, 'manual');

      const killEvents = events.filter(e => e.category === AutoAwardCategory.KILL);
      expect(killEvents).toEqual([]);
    });

    it('bestAwardOnly=true returns only highest threshold award', () => {
      const config = { ...createDefaultAutoAwardConfig(), bestAwardOnly: true };
      const campaignWithConfig = createTestCampaign({
        options: { ...campaign.options, autoAwardConfig: config },
      });

      const person = createTestPerson({ totalKills: 25 });
      campaignWithConfig.personnel.set(person.id, person);

      const events = processAutoAwards(campaignWithConfig, 'manual');

      const killEvents = events.filter(e => e.category === AutoAwardCategory.KILL);
      expect(killEvents.length).toBe(1);
      expect(killEvents[0].awardId).toBe('legend');
    });

    it('bestAwardOnly=false returns all qualifying awards', () => {
      const config = { ...createDefaultAutoAwardConfig(), bestAwardOnly: false };
      const campaignWithConfig = createTestCampaign({
        options: { ...campaign.options, autoAwardConfig: config },
      });

      const person = createTestPerson({ totalKills: 25 });
      campaignWithConfig.personnel.set(person.id, person);

      const events = processAutoAwards(campaignWithConfig, 'manual');

      const killEvents = events.filter(e => e.category === AutoAwardCategory.KILL);
      expect(killEvents.length).toBeGreaterThan(1);
      expect(killEvents.map(e => e.awardId)).toContain('first-blood');
      expect(killEvents.map(e => e.awardId)).toContain('legend');
    });

    it('non-stackable awards NOT re-granted', () => {
      const config = createDefaultAutoAwardConfig();
      const campaignWithConfig = createTestCampaign({
        options: { ...campaign.options, autoAwardConfig: config },
      });

      const person = createTestPerson({
        totalKills: 10,
        awards: ['double-ace'],
      });
      campaignWithConfig.personnel.set(person.id, person);

      const events = processAutoAwards(campaignWithConfig, 'manual');

      const doubleAceEvents = events.filter(e => e.awardId === 'double-ace');
      expect(doubleAceEvents).toEqual([]);
    });

    it('stackable awards CAN be re-granted', () => {
      const config = createDefaultAutoAwardConfig();
      const campaignWithConfig = createTestCampaign({
        options: { ...campaign.options, autoAwardConfig: config },
      });

      const person = createTestPerson({
        totalKills: 10,
        awards: [],
      });
      campaignWithConfig.personnel.set(person.id, person);

      const events = processAutoAwards(campaignWithConfig, 'manual');

      const killEvents = events.filter(e => e.category === AutoAwardCategory.KILL);
      expect(killEvents.length).toBeGreaterThan(0);
    });

    it('dead personnel excluded when enablePosthumous=false', () => {
      const config = { ...createDefaultAutoAwardConfig(), enablePosthumous: false };
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

    it('dead personnel included when enablePosthumous=true', () => {
      const config = { ...createDefaultAutoAwardConfig(), enablePosthumous: true };
      const campaignWithConfig = createTestCampaign({
        options: { ...campaign.options, autoAwardConfig: config },
      });

      const person = createTestPerson({
        status: PersonnelStatus.KIA,
        totalKills: 10,
      });
      campaignWithConfig.personnel.set(person.id, person);

      const events = processAutoAwards(campaignWithConfig, 'manual');

      expect(events.length).toBeGreaterThan(0);
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

    it('multiple personnel processed', () => {
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

      const events = processAutoAwards(campaign, 'manual');

      const person1Events = events.filter(e => e.personId === 'person-1');
      const person2Events = events.filter(e => e.personId === 'person-2');

      expect(person1Events.length).toBeGreaterThan(0);
      expect(person2Events.length).toBeGreaterThan(0);
    });

    it('includes trigger type in grant events', () => {
      const person = createTestPerson({ totalKills: 10 });
      campaign.personnel.set(person.id, person);

      const events = processAutoAwards(campaign, 'post_mission');

      expect(events.length).toBeGreaterThan(0);
      expect(events.every(e => e.trigger === 'post_mission')).toBe(true);
    });

    it('includes timestamp in grant events', () => {
      const person = createTestPerson({ totalKills: 10 });
      campaign.personnel.set(person.id, person);

      const events = processAutoAwards(campaign, 'manual');

      expect(events.length).toBeGreaterThan(0);
      expect(events.every(e => typeof e.timestamp === 'string')).toBe(true);
      expect(events.every(e => e.timestamp.length > 0)).toBe(true);
    });

    it('includes award name in grant events', () => {
      const person = createTestPerson({ totalKills: 10 });
      campaign.personnel.set(person.id, person);

      const events = processAutoAwards(campaign, 'manual');

      expect(events.length).toBeGreaterThan(0);
      expect(events.every(e => typeof e.awardName === 'string')).toBe(true);
      expect(events.every(e => e.awardName.length > 0)).toBe(true);
    });

    it('grants scenario awards for missions completed', () => {
      const person = createTestPerson({ missionsCompleted: 10 });
      campaign.personnel.set(person.id, person);

      const events = processAutoAwards(campaign, 'manual');

      const scenarioEvents = events.filter(e => e.category === AutoAwardCategory.SCENARIO);
      expect(scenarioEvents.length).toBeGreaterThan(0);
    });

    it('grants time awards based on recruitment date', () => {
      const person = createTestPerson({
        recruitmentDate: new Date('3020-01-01'),
      });
      campaign.personnel.set(person.id, person);

      const events = processAutoAwards(campaign, 'manual');

      const timeEvents = events.filter(e => e.category === AutoAwardCategory.TIME);
      expect(timeEvents.length).toBeGreaterThan(0);
    });

    it('grants injury awards based on injury count', () => {
      const person = createTestPerson({
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
            type: 'Concussion',
            location: 'Head',
            severity: 1,
            daysToHeal: 7,
            permanent: false,
            acquired: new Date(),
          },
          {
            id: 'inj-3',
            type: 'Burn',
            location: 'Torso',
            severity: 2,
            daysToHeal: 21,
            permanent: false,
            acquired: new Date(),
          },
        ],
      });
      campaign.personnel.set(person.id, person);

      const events = processAutoAwards(campaign, 'manual');

      const injuryEvents = events.filter(e => e.category === AutoAwardCategory.INJURY);
      expect(injuryEvents.length).toBeGreaterThan(0);
    });

    it('grants skill awards based on pilot skills', () => {
      const person = createTestPerson({
        pilotSkills: { gunnery: 2, piloting: 3 },
      });
      campaign.personnel.set(person.id, person);

      const events = processAutoAwards(campaign, 'manual');

      const skillEvents = events.filter(e => e.category === AutoAwardCategory.SKILL);
      expect(skillEvents.length).toBeGreaterThan(0);
    });

    it('grants rank awards based on rank level', () => {
      const person = createTestPerson({
        rank: 'Captain',
        rankLevel: 3,
      });
      campaign.personnel.set(person.id, person);

      const events = processAutoAwards(campaign, 'manual');

      const rankEvents = events.filter(e => e.category === AutoAwardCategory.RANK);
      expect(rankEvents.length).toBeGreaterThan(0);
    });

    it('handles multiple triggers correctly', () => {
      const person = createTestPerson({ totalKills: 10 });
      campaign.personnel.set(person.id, person);

      const manualEvents = processAutoAwards(campaign, 'manual');
      const monthlyEvents = processAutoAwards(campaign, 'monthly');
      const postMissionEvents = processAutoAwards(campaign, 'post_mission');

      expect(manualEvents.every(e => e.trigger === 'manual')).toBe(true);
      expect(monthlyEvents.every(e => e.trigger === 'monthly')).toBe(true);
      expect(postMissionEvents.every(e => e.trigger === 'post_mission')).toBe(true);
    });

    it('handles currentDate as Date object', () => {
      const campaignWithDate = createTestCampaign({
        currentDate: new Date('3025-06-15'),
      });
      const person = createTestPerson({ totalKills: 10 });
      campaignWithDate.personnel.set(person.id, person);

      const events = processAutoAwards(campaignWithDate, 'manual');

      expect(events.length).toBeGreaterThan(0);
      expect(events.every(e => typeof e.timestamp === 'string')).toBe(true);
    });

    it('handles currentDate as Date object', () => {
      const campaignWithDate = createTestCampaign({
        currentDate: new Date('3025-06-15'),
      });
      const person = createTestPerson({ totalKills: 10 });
      campaignWithDate.personnel.set(person.id, person);

      const events = processAutoAwards(campaignWithDate, 'manual');

      expect(events.length).toBeGreaterThan(0);
      expect(events.every(e => typeof e.timestamp === 'string')).toBe(true);
    });

    it('grants awards to support roles (they are not civilians)', () => {
      const testCampaign = createTestCampaign();
      const person = createTestPerson({
        primaryRole: CampaignPersonnelRole.TECH,
        totalKills: 10,
      });
      testCampaign.personnel.set(person.id, person);

      const eligible = getEligiblePersonnel(testCampaign, testCampaign.options.autoAwardConfig!);

      expect(eligible.map(p => p.id)).toContain(person.id);
    });

    it('grants awards to combat roles', () => {
      const testCampaign = createTestCampaign();
      const person = createTestPerson({
        primaryRole: CampaignPersonnelRole.PILOT,
        totalKills: 10,
      });
      testCampaign.personnel.set(person.id, person);

      const events = processAutoAwards(testCampaign, 'manual');

      expect(events.length).toBeGreaterThan(0);
    });

    it('grants awards to aerospace pilots', () => {
      const testCampaign = createTestCampaign();
      const person = createTestPerson({
        primaryRole: CampaignPersonnelRole.AEROSPACE_PILOT,
        totalKills: 10,
      });
      testCampaign.personnel.set(person.id, person);

      const events = processAutoAwards(testCampaign, 'manual');

      expect(events.length).toBeGreaterThan(0);
    });

    it('grants awards to vehicle drivers', () => {
      const testCampaign = createTestCampaign();
      const person = createTestPerson({
        primaryRole: CampaignPersonnelRole.VEHICLE_DRIVER,
        totalKills: 10,
      });
      testCampaign.personnel.set(person.id, person);

      const events = processAutoAwards(testCampaign, 'manual');

      expect(events.length).toBeGreaterThan(0);
    });

    it('grants awards to doctors (they are not civilians)', () => {
      const testCampaign = createTestCampaign();
      const person = createTestPerson({
        primaryRole: CampaignPersonnelRole.DOCTOR,
        totalKills: 10,
      });
      testCampaign.personnel.set(person.id, person);

      const eligible = getEligiblePersonnel(testCampaign, testCampaign.options.autoAwardConfig!);

      expect(eligible.map(p => p.id)).toContain(person.id);
    });

    it('grants awards to admin staff (they are not civilians)', () => {
      const testCampaign = createTestCampaign();
      const person = createTestPerson({
        primaryRole: CampaignPersonnelRole.ADMIN_COMMAND,
        totalKills: 10,
      });
      testCampaign.personnel.set(person.id, person);

      const eligible = getEligiblePersonnel(testCampaign, testCampaign.options.autoAwardConfig!);

      expect(eligible.map(p => p.id)).toContain(person.id);
    });
  });

  describe('getEligiblePersonnel', () => {
    it('filters correctly', () => {
      const config = { ...createDefaultAutoAwardConfig(), enablePosthumous: false };

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

      expect(eligible.map(p => p.id)).toContain('active-pilot');
      expect(eligible.map(p => p.id)).not.toContain('civilian');
      expect(eligible.map(p => p.id)).not.toContain('kia-pilot');
    });

    it('includes dead personnel when enablePosthumous=true', () => {
      const config = { ...createDefaultAutoAwardConfig(), enablePosthumous: true };

      const kiaPilot = createTestPerson({
        id: 'kia-pilot',
        status: PersonnelStatus.KIA,
        primaryRole: CampaignPersonnelRole.PILOT,
      });

      campaign.personnel.set(kiaPilot.id, kiaPilot);

      const eligible = getEligiblePersonnel(campaign, config);

      expect(eligible.map(p => p.id)).toContain('kia-pilot');
    });

    it('excludes dead personnel when enablePosthumous=false', () => {
      const config = { ...createDefaultAutoAwardConfig(), enablePosthumous: false };

      const kiaPilot = createTestPerson({
        id: 'kia-pilot',
        status: PersonnelStatus.KIA,
        primaryRole: CampaignPersonnelRole.PILOT,
      });

      campaign.personnel.set(kiaPilot.id, kiaPilot);

      const eligible = getEligiblePersonnel(campaign, config);

      expect(eligible.map(p => p.id)).not.toContain('kia-pilot');
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
  });
});
