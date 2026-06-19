import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { usePilotStore } from '@/stores/usePilotStore';
import {
  AutoAwardCategory,
  createDefaultAutoAwardConfig,
} from '@/types/campaign/awards/autoAwardTypes';
import {
  ICampaign,
  createDefaultCampaignOptions,
} from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignType } from '@/types/campaign/CampaignType';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { Money } from '@/types/campaign/Money';
import { PilotStatus, PilotType } from '@/types/pilot/PilotInterfaces';

import { processAutoAwards, getEligiblePersonnel } from '../autoAwardEngine';

// =============================================================================
// Fixture helpers
// =============================================================================

/**
 * Builds a minimal ICampaignRosterEntry for store population.
 * status defaults to Active; override for KIA/MIA/Wounded tests.
 */
function makeEntry(
  id: string,
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId: id,
    pilotName: overrides.pilotName ?? 'Test Pilot',
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

/**
 * Builds a minimal IPilot vault entry for the store.
 */
function makeVaultPilot(id: string): IPilot {
  return {
    id,
    name: 'Test Pilot',
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    awards: [],
    createdAt: '3000-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
  };
}

function clearStores(): void {
  useCampaignRosterStore.setState({
    pilots: [],
    units: [],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
    campaignId: null,
  });
  usePilotStore.setState({ pilots: [] });
}

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

// =============================================================================
// Tests
// =============================================================================

describe('autoAwardEngine', () => {
  let campaign: ICampaign;

  beforeEach(() => {
    campaign = createTestCampaign();
  });

  afterEach(() => {
    clearStores();
  });

  describe('processAutoAwards', () => {
    it('returns empty array when autoAwardConfig is undefined', () => {
      const campaignNoConfig = createTestCampaign({
        options: { ...campaign.options, autoAwardConfig: undefined },
      });
      // Store empty — no entries needed; config guard fires first.
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
      // Store empty — enableAutoAwards guard fires before store read.
      const events = processAutoAwards(campaignWithConfig, 'manual');
      expect(events).toEqual([]);
    });

    it('returns empty array when roster store is empty', () => {
      // Stores cleared by afterEach; no setState needed here.
      const events = processAutoAwards(campaign, 'manual');
      expect(events).toEqual([]);
    });

    // PR2 transitional note: pilot===null for all personnel (no vault join yet).
    // Category checkers return [] for null pilot (NPC skip per Council #2).
    // Kill/scenario/time/injury awards fire via entry fields not pilot fields.
    // Skill/rank/contract etc. require non-null pilot and return [] in PR2.
    it('returns empty array for all categories in PR2 (pilot===null NPC skip)', () => {
      // Populate store; vault store stays empty so pilot resolves to null.
      useCampaignRosterStore.setState({
        pilots: [makeEntry('person-test', { campaignKills: 10 })],
        units: [],
        missions: [],
        activeMissionId: null,
        missionCount: 0,
        campaignId: 'campaign-test',
      });
      // usePilotStore stays empty → pilot===null → NPC skip.

      const events = processAutoAwards(campaign, 'manual');
      // In PR2 all pilots are null → all category checkers return [] → no events
      expect(events).toEqual([]);
    });

    it('returns empty array even when kills are high (pilot===null)', () => {
      useCampaignRosterStore.setState({
        pilots: [makeEntry('person-test', { campaignKills: 25 })],
        units: [],
        missions: [],
        activeMissionId: null,
        missionCount: 0,
        campaignId: 'campaign-test',
      });

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

      useCampaignRosterStore.setState({
        pilots: [makeEntry('person-test', { campaignKills: 10 })],
        units: [],
        missions: [],
        activeMissionId: null,
        missionCount: 0,
        campaignId: 'campaign-test',
      });

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

      useCampaignRosterStore.setState({
        pilots: [
          makeEntry('person-test', {
            status: CampaignPilotStatus.KIA,
            campaignKills: 10,
          }),
        ],
        units: [],
        missions: [],
        activeMissionId: null,
        missionCount: 0,
        campaignId: 'campaign-test',
      });

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

      useCampaignRosterStore.setState({
        pilots: [
          makeEntry('person-test', {
            status: CampaignPilotStatus.KIA,
            campaignKills: 10,
          }),
        ],
        units: [],
        missions: [],
        activeMissionId: null,
        missionCount: 0,
        campaignId: 'campaign-test',
      });
      // vault stays empty → pilot===null → checkers skip.

      // PR2: pilot===null → all checkers return [] → no events even for posthumous
      const events = processAutoAwards(campaignWithConfig, 'manual');
      expect(events).toEqual([]);
    });

    it('civilians excluded', () => {
      useCampaignRosterStore.setState({
        pilots: [
          makeEntry('person-test', {
            primaryRole: CampaignPersonnelRole.DEPENDENT,
            campaignKills: 10,
          }),
        ],
        units: [],
        missions: [],
        activeMissionId: null,
        missionCount: 0,
        campaignId: 'campaign-test',
      });

      const events = processAutoAwards(campaign, 'manual');
      expect(events).toEqual([]);
    });

    it('multiple personnel processed — no events in PR2 (pilot===null)', () => {
      useCampaignRosterStore.setState({
        pilots: [
          makeEntry('person-1', { campaignKills: 10 }),
          makeEntry('person-2', { campaignKills: 5 }),
        ],
        units: [],
        missions: [],
        activeMissionId: null,
        missionCount: 0,
        campaignId: 'campaign-test',
      });

      // PR2: pilot===null → no events; but both persons are eligible (entry pairs produced)
      const events = processAutoAwards(campaign, 'manual');
      expect(events).toEqual([]);
    });

    it('handles multiple triggers correctly — trigger field set even with empty results', () => {
      useCampaignRosterStore.setState({
        pilots: [makeEntry('person-test', { campaignKills: 10 })],
        units: [],
        missions: [],
        activeMissionId: null,
        missionCount: 0,
        campaignId: 'campaign-test',
      });

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

      useCampaignRosterStore.setState({
        pilots: [makeEntry('person-test', { campaignKills: 10 })],
        units: [],
        missions: [],
        activeMissionId: null,
        missionCount: 0,
        campaignId: 'campaign-test',
      });

      expect(() => processAutoAwards(campaignWithDate, 'manual')).not.toThrow();
    });

    it('grants awards to support roles (they are not civilians)', () => {
      // Directly call getEligiblePersonnel with an explicit entry — no stores needed.
      const config = createDefaultAutoAwardConfig();
      const entry = makeEntry('person-tech', {
        primaryRole: CampaignPersonnelRole.TECH,
        campaignKills: 10,
      });
      const pilotsByPilotId = new Map<string, IPilot>();

      const eligible = getEligiblePersonnel([entry], pilotsByPilotId, config);

      expect(eligible.map(({ entry: e }) => e.pilotId)).toContain(
        'person-tech',
      );
    });

    it('grants awards to combat roles', () => {
      const config = createDefaultAutoAwardConfig();
      const entry = makeEntry('person-pilot', {
        primaryRole: CampaignPersonnelRole.PILOT,
        campaignKills: 10,
      });
      const pilotsByPilotId = new Map<string, IPilot>();

      const eligible = getEligiblePersonnel([entry], pilotsByPilotId, config);

      expect(eligible.map(({ entry: e }) => e.pilotId)).toContain(
        'person-pilot',
      );
    });

    it('grants awards to aerospace pilots', () => {
      const config = createDefaultAutoAwardConfig();
      const entry = makeEntry('person-aero', {
        primaryRole: CampaignPersonnelRole.AEROSPACE_PILOT,
        campaignKills: 10,
      });
      const pilotsByPilotId = new Map<string, IPilot>();

      const eligible = getEligiblePersonnel([entry], pilotsByPilotId, config);

      expect(eligible.map(({ entry: e }) => e.pilotId)).toContain(
        'person-aero',
      );
    });

    it('grants awards to vehicle drivers', () => {
      const config = createDefaultAutoAwardConfig();
      const entry = makeEntry('person-veh', {
        primaryRole: CampaignPersonnelRole.VEHICLE_DRIVER,
        campaignKills: 10,
      });
      const pilotsByPilotId = new Map<string, IPilot>();

      const eligible = getEligiblePersonnel([entry], pilotsByPilotId, config);

      expect(eligible.map(({ entry: e }) => e.pilotId)).toContain('person-veh');
    });

    it('grants awards to doctors (they are not civilians)', () => {
      const config = createDefaultAutoAwardConfig();
      const entry = makeEntry('person-doc', {
        primaryRole: CampaignPersonnelRole.DOCTOR,
        campaignKills: 10,
      });
      const pilotsByPilotId = new Map<string, IPilot>();

      const eligible = getEligiblePersonnel([entry], pilotsByPilotId, config);

      expect(eligible.map(({ entry: e }) => e.pilotId)).toContain('person-doc');
    });

    it('grants awards to admin staff (they are not civilians)', () => {
      const config = createDefaultAutoAwardConfig();
      const entry = makeEntry('person-admin', {
        primaryRole: CampaignPersonnelRole.ADMIN_COMMAND,
        campaignKills: 10,
      });
      const pilotsByPilotId = new Map<string, IPilot>();

      const eligible = getEligiblePersonnel([entry], pilotsByPilotId, config);

      expect(eligible.map(({ entry: e }) => e.pilotId)).toContain(
        'person-admin',
      );
    });
  });

  describe('getEligiblePersonnel', () => {
    it('filters correctly — returns { entry, pilot } pairs', () => {
      const config = {
        ...createDefaultAutoAwardConfig(),
        enablePosthumous: false,
      };

      const entries: ICampaignRosterEntry[] = [
        makeEntry('active-pilot', {
          status: CampaignPilotStatus.Active,
          primaryRole: CampaignPersonnelRole.PILOT,
        }),
        makeEntry('kia-pilot', {
          status: CampaignPilotStatus.KIA,
          primaryRole: CampaignPersonnelRole.PILOT,
        }),
        makeEntry('civilian', {
          status: CampaignPilotStatus.Active,
          primaryRole: CampaignPersonnelRole.DEPENDENT,
        }),
      ];
      const pilotsByPilotId = new Map<string, IPilot>();

      const eligible = getEligiblePersonnel(entries, pilotsByPilotId, config);

      // Return type is { entry, pilot }[] — extract pilotId to identify
      const eligibleIds = eligible.map(({ entry }) => entry.pilotId);
      expect(eligibleIds).toContain('active-pilot');
      expect(eligibleIds).not.toContain('civilian');
      expect(eligibleIds).not.toContain('kia-pilot');
    });

    it('pilot field is null for all entries in PR2 (no vault join yet)', () => {
      const config = createDefaultAutoAwardConfig();

      const entries: ICampaignRosterEntry[] = [
        makeEntry('some-pilot', {
          status: CampaignPilotStatus.Active,
          primaryRole: CampaignPersonnelRole.PILOT,
        }),
      ];
      // Empty map → pilot resolves to null for all entries.
      const pilotsByPilotId = new Map<string, IPilot>();

      const eligible = getEligiblePersonnel(entries, pilotsByPilotId, config);

      expect(eligible.length).toBe(1);
      // PR2 transitional: vault join not yet wired — pilot always null
      expect(eligible[0].pilot).toBeNull();
    });

    it('includes dead personnel when enablePosthumous=true', () => {
      const config = {
        ...createDefaultAutoAwardConfig(),
        enablePosthumous: true,
      };

      const entries: ICampaignRosterEntry[] = [
        makeEntry('kia-pilot', {
          status: CampaignPilotStatus.KIA,
          primaryRole: CampaignPersonnelRole.PILOT,
        }),
      ];
      const pilotsByPilotId = new Map<string, IPilot>();

      const eligible = getEligiblePersonnel(entries, pilotsByPilotId, config);

      expect(eligible.map(({ entry }) => entry.pilotId)).toContain('kia-pilot');
    });

    it('excludes dead personnel when enablePosthumous=false', () => {
      const config = {
        ...createDefaultAutoAwardConfig(),
        enablePosthumous: false,
      };

      const entries: ICampaignRosterEntry[] = [
        makeEntry('kia-pilot', {
          status: CampaignPilotStatus.KIA,
          primaryRole: CampaignPersonnelRole.PILOT,
        }),
      ];
      const pilotsByPilotId = new Map<string, IPilot>();

      const eligible = getEligiblePersonnel(entries, pilotsByPilotId, config);

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

      const entries: ICampaignRosterEntry[] = civilianRoles.map((role, index) =>
        makeEntry(`civilian-${index}`, {
          status: CampaignPilotStatus.Active,
          primaryRole: role,
        }),
      );
      const pilotsByPilotId = new Map<string, IPilot>();

      const eligible = getEligiblePersonnel(entries, pilotsByPilotId, config);

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

      const entries: ICampaignRosterEntry[] = combatRoles.map((role, index) =>
        makeEntry(`combat-${index}`, {
          status: CampaignPilotStatus.Active,
          primaryRole: role,
        }),
      );
      const pilotsByPilotId = new Map<string, IPilot>();

      const eligible = getEligiblePersonnel(entries, pilotsByPilotId, config);

      expect(eligible.length).toBe(combatRoles.length);
    });

    it('includes all support roles (they are not civilians)', () => {
      const config = createDefaultAutoAwardConfig();

      const supportRoles = [
        CampaignPersonnelRole.TECH,
        CampaignPersonnelRole.DOCTOR,
        CampaignPersonnelRole.MEDIC,
        CampaignPersonnelRole.ADMIN_COMMAND,
      ];

      const entries: ICampaignRosterEntry[] = supportRoles.map((role, index) =>
        makeEntry(`support-${index}`, {
          status: CampaignPilotStatus.Active,
          primaryRole: role,
        }),
      );
      const pilotsByPilotId = new Map<string, IPilot>();

      const eligible = getEligiblePersonnel(entries, pilotsByPilotId, config);

      expect(eligible.length).toBe(supportRoles.length);
    });

    it('excludes non-active personnel', () => {
      const config = createDefaultAutoAwardConfig();

      // Use non-Active CampaignPilotStatus values (Wounded, MIA — no ON_LEAVE/RETIRED
      // in CampaignPilotStatus; both map to non-Active for this check).
      const entries: ICampaignRosterEntry[] = [
        makeEntry('person-0', {
          status: CampaignPilotStatus.Wounded,
          primaryRole: CampaignPersonnelRole.PILOT,
        }),
        makeEntry('person-1', {
          status: CampaignPilotStatus.MIA,
          primaryRole: CampaignPersonnelRole.PILOT,
        }),
        makeEntry('person-2', {
          status: CampaignPilotStatus.Critical,
          primaryRole: CampaignPersonnelRole.PILOT,
        }),
      ];
      const pilotsByPilotId = new Map<string, IPilot>();

      const eligible = getEligiblePersonnel(entries, pilotsByPilotId, config);

      expect(eligible).toEqual([]);
    });

    it('maps roster entry fields correctly into eligibility result', () => {
      const config = createDefaultAutoAwardConfig();

      // Build entry directly with the same field values the legacy person had.
      const entry = makeEntry('map-test', {
        campaignKills: 7,
        campaignMissions: 12,
        hireDate: new Date('3018-03-01'),
        rankIndex: 2,
      });
      const pilotsByPilotId = new Map<string, IPilot>();

      const eligible = getEligiblePersonnel([entry], pilotsByPilotId, config);

      expect(eligible.length).toBe(1);
      const { entry: resultEntry } = eligible[0];
      expect(resultEntry.pilotId).toBe('map-test');
      expect(resultEntry.campaignKills).toBe(7);
      expect(resultEntry.campaignMissions).toBe(12);
      expect(resultEntry.rankIndex).toBe(2);
    });
  });
});
