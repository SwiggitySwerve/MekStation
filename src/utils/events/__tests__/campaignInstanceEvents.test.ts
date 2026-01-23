/**
 * Campaign Instance Events Tests
 */

import {
  emitUnitInstanceCreated,
  emitUnitInstanceDamageApplied,
  emitUnitInstanceStatusChanged,
  emitUnitInstancePilotAssigned,
  emitUnitInstanceDestroyed,
  emitPilotInstanceCreated,
  emitPilotInstanceXPGained,
  emitPilotInstanceWounded,
  emitPilotInstanceKillRecorded,
  emitPilotInstanceMissionCompleted,
  emitPilotInstanceDeceased,
} from '../campaignInstanceEvents';
import { resetSequence } from '../eventFactory';
import { CampaignInstanceEventTypes, EventCategory } from '@/types/events';
import { CampaignUnitStatus, CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces';
import { createEmptyDamageState } from '@/types/campaign/CampaignInstanceInterfaces';

// Reset sequence before each test
beforeEach(() => {
  resetSequence(0);
});

// =============================================================================
// Unit Instance Events
// =============================================================================

describe('Unit Instance Events', () => {
  describe('emitUnitInstanceCreated', () => {
    it('should create a unit_instance_created event', () => {
      const event = emitUnitInstanceCreated(
        {
          instanceId: 'unit-inst-1',
          campaignId: 'campaign-1',
          vaultUnitId: 'vault-unit-1',
          vaultUnitVersion: 1,
          unitName: 'Atlas AS7-D',
          unitChassis: 'Atlas',
          unitVariant: 'AS7-D',
          status: CampaignUnitStatus.Operational,
          forceId: 'force-1',
          forceSlot: 2,
        },
        false // Don't actually emit to store
      );

      expect(event.category).toBe(EventCategory.Campaign);
      expect(event.type).toBe(CampaignInstanceEventTypes.UNIT_INSTANCE_CREATED);
      expect(event.context.campaignId).toBe('campaign-1');
      expect(event.context.unitId).toBe('unit-inst-1');
      expect(event.payload.instanceId).toBe('unit-inst-1');
      expect(event.payload.unitName).toBe('Atlas AS7-D');
      expect(event.payload.forceId).toBe('force-1');
    });
  });

  describe('emitUnitInstanceDamageApplied', () => {
    it('should create a damage_applied event with causedBy', () => {
      const prevState = createEmptyDamageState();
      const newState = { ...prevState, engineHits: 1 };

      const event = emitUnitInstanceDamageApplied(
        {
          instanceId: 'unit-inst-1',
          campaignId: 'campaign-1',
          previousDamageState: prevState,
          newDamageState: newState,
          damagePercentageChange: 15,
          damageSource: 'AC/20',
          attackerUnitId: 'enemy-1',
          gameId: 'game-1',
        },
        { eventId: 'attack-event-1', relationship: 'triggered' },
        false
      );

      expect(event.type).toBe(CampaignInstanceEventTypes.UNIT_INSTANCE_DAMAGE_APPLIED);
      expect(event.payload.damagePercentageChange).toBe(15);
      expect(event.payload.damageSource).toBe('AC/20');
      expect(event.context.gameId).toBe('game-1');
      expect(event.causedBy?.eventId).toBe('attack-event-1');
      expect(event.causedBy?.relationship).toBe('triggered');
    });
  });

  describe('emitUnitInstanceStatusChanged', () => {
    it('should create a status_changed event', () => {
      const event = emitUnitInstanceStatusChanged(
        {
          instanceId: 'unit-inst-1',
          campaignId: 'campaign-1',
          previousStatus: CampaignUnitStatus.Operational,
          newStatus: CampaignUnitStatus.Damaged,
          reason: 'Combat damage',
        },
        undefined,
        false
      );

      expect(event.type).toBe(CampaignInstanceEventTypes.UNIT_INSTANCE_STATUS_CHANGED);
      expect(event.payload.previousStatus).toBe(CampaignUnitStatus.Operational);
      expect(event.payload.newStatus).toBe(CampaignUnitStatus.Damaged);
      expect(event.payload.reason).toBe('Combat damage');
    });
  });

  describe('emitUnitInstancePilotAssigned', () => {
    it('should create a pilot_assigned event', () => {
      const event = emitUnitInstancePilotAssigned(
        {
          unitInstanceId: 'unit-inst-1',
          pilotInstanceId: 'pilot-inst-1',
          pilotName: 'John Doe',
          campaignId: 'campaign-1',
          previousPilotInstanceId: 'old-pilot-inst',
        },
        false
      );

      expect(event.type).toBe(CampaignInstanceEventTypes.UNIT_INSTANCE_PILOT_ASSIGNED);
      expect(event.payload.unitInstanceId).toBe('unit-inst-1');
      expect(event.payload.pilotInstanceId).toBe('pilot-inst-1');
      expect(event.payload.previousPilotInstanceId).toBe('old-pilot-inst');
      expect(event.context.unitId).toBe('unit-inst-1');
      expect(event.context.pilotId).toBe('pilot-inst-1');
    });
  });

  describe('emitUnitInstanceDestroyed', () => {
    it('should create a destroyed event with pilot fate', () => {
      const event = emitUnitInstanceDestroyed(
        {
          instanceId: 'unit-inst-1',
          campaignId: 'campaign-1',
          unitName: 'Atlas AS7-D',
          cause: 'Ammo explosion',
          pilotInstanceId: 'pilot-inst-1',
          pilotFate: 'survived',
          gameId: 'game-1',
        },
        { eventId: 'damage-event', relationship: 'triggered' },
        false
      );

      expect(event.type).toBe(CampaignInstanceEventTypes.UNIT_INSTANCE_DESTROYED);
      expect(event.payload.cause).toBe('Ammo explosion');
      expect(event.payload.pilotFate).toBe('survived');
      expect(event.causedBy?.eventId).toBe('damage-event');
    });
  });
});

// =============================================================================
// Pilot Instance Events
// =============================================================================

describe('Pilot Instance Events', () => {
  describe('emitPilotInstanceCreated', () => {
    it('should create a pilot_instance_created event from vault', () => {
      const event = emitPilotInstanceCreated(
        {
          instanceId: 'pilot-inst-1',
          campaignId: 'campaign-1',
          vaultPilotId: 'vault-pilot-1',
          pilotName: 'Jane Smith',
          pilotCallsign: 'Viper',
          skills: { gunnery: 3, piloting: 4 },
        },
        false
      );

      expect(event.type).toBe(CampaignInstanceEventTypes.PILOT_INSTANCE_CREATED);
      expect(event.payload.vaultPilotId).toBe('vault-pilot-1');
      expect(event.payload.isStatblock).toBe(false);
      expect(event.payload.pilotName).toBe('Jane Smith');
      expect(event.payload.skills).toEqual({ gunnery: 3, piloting: 4 });
    });

    it('should create a pilot_instance_created event from statblock', () => {
      const event = emitPilotInstanceCreated(
        {
          instanceId: 'pilot-inst-2',
          campaignId: 'campaign-1',
          vaultPilotId: null,
          pilotName: 'NPC Pilot',
          skills: { gunnery: 4, piloting: 5 },
        },
        false
      );

      expect(event.payload.vaultPilotId).toBeNull();
      expect(event.payload.isStatblock).toBe(true);
    });
  });

  describe('emitPilotInstanceXPGained', () => {
    it('should create an xp_gained event', () => {
      const event = emitPilotInstanceXPGained(
        {
          instanceId: 'pilot-inst-1',
          campaignId: 'campaign-1',
          xpGained: 5,
          totalXP: 25,
          source: 'kill',
          details: 'Destroyed enemy Marauder',
          gameId: 'game-1',
        },
        { eventId: 'kill-event', relationship: 'derived' },
        false
      );

      expect(event.type).toBe(CampaignInstanceEventTypes.PILOT_INSTANCE_XP_GAINED);
      expect(event.payload.xpGained).toBe(5);
      expect(event.payload.totalXP).toBe(25);
      expect(event.payload.source).toBe('kill');
      expect(event.causedBy?.relationship).toBe('derived');
    });
  });

  describe('emitPilotInstanceWounded', () => {
    it('should create a wounded event', () => {
      const event = emitPilotInstanceWounded(
        {
          instanceId: 'pilot-inst-1',
          campaignId: 'campaign-1',
          woundsReceived: 2,
          totalWounds: 3,
          cause: 'Head hit',
          recoveryTime: 14,
          gameId: 'game-1',
        },
        undefined,
        false
      );

      expect(event.type).toBe(CampaignInstanceEventTypes.PILOT_INSTANCE_WOUNDED);
      expect(event.payload.woundsReceived).toBe(2);
      expect(event.payload.totalWounds).toBe(3);
      expect(event.payload.recoveryTime).toBe(14);
    });
  });

  describe('emitPilotInstanceKillRecorded', () => {
    it('should create a kill_recorded event', () => {
      const event = emitPilotInstanceKillRecorded(
        {
          instanceId: 'pilot-inst-1',
          campaignId: 'campaign-1',
          targetName: 'Hunchback HBK-4G',
          targetUnitId: 'enemy-unit-1',
          weaponUsed: 'PPC',
          totalKills: 7,
          gameId: 'game-1',
        },
        undefined,
        false
      );

      expect(event.type).toBe(CampaignInstanceEventTypes.PILOT_INSTANCE_KILL_RECORDED);
      expect(event.payload.targetName).toBe('Hunchback HBK-4G');
      expect(event.payload.weaponUsed).toBe('PPC');
      expect(event.payload.totalKills).toBe(7);
    });
  });

  describe('emitPilotInstanceMissionCompleted', () => {
    it('should create a mission_completed event', () => {
      const event = emitPilotInstanceMissionCompleted(
        {
          instanceId: 'pilot-inst-1',
          campaignId: 'campaign-1',
          missionId: 'mission-3',
          missionName: 'Base Assault',
          outcome: 'victory',
          kills: 2,
          xpEarned: 8,
          totalMissions: 5,
        },
        false
      );

      expect(event.type).toBe(CampaignInstanceEventTypes.PILOT_INSTANCE_MISSION_COMPLETED);
      expect(event.payload.missionName).toBe('Base Assault');
      expect(event.payload.outcome).toBe('victory');
      expect(event.payload.kills).toBe(2);
      expect(event.context.missionId).toBe('mission-3');
    });
  });

  describe('emitPilotInstanceDeceased', () => {
    it('should create a deceased event', () => {
      const event = emitPilotInstanceDeceased(
        {
          instanceId: 'pilot-inst-1',
          campaignId: 'campaign-1',
          pilotName: 'John Doe',
          cause: 'Cockpit destroyed',
          unitInstanceId: 'unit-inst-1',
          unitName: 'Atlas AS7-D',
          totalKills: 15,
          totalMissions: 12,
          gameId: 'game-5',
        },
        { eventId: 'unit-destroyed-event', relationship: 'triggered' },
        false
      );

      expect(event.type).toBe(CampaignInstanceEventTypes.PILOT_INSTANCE_DECEASED);
      expect(event.payload.pilotName).toBe('John Doe');
      expect(event.payload.cause).toBe('Cockpit destroyed');
      expect(event.payload.unitName).toBe('Atlas AS7-D');
      expect(event.payload.totalKills).toBe(15);
      expect(event.causedBy?.eventId).toBe('unit-destroyed-event');
    });
  });
});

// =============================================================================
// Event Properties
// =============================================================================

describe('Event Properties', () => {
  it('should generate unique IDs for each event', () => {
    const event1 = emitUnitInstanceCreated(
      {
        instanceId: 'u1',
        campaignId: 'c1',
        vaultUnitId: 'v1',
        vaultUnitVersion: 1,
        unitName: 'Unit 1',
        unitChassis: 'Test',
        unitVariant: 'T-1',
        status: CampaignUnitStatus.Operational,
      },
      false
    );

    const event2 = emitUnitInstanceCreated(
      {
        instanceId: 'u2',
        campaignId: 'c1',
        vaultUnitId: 'v2',
        vaultUnitVersion: 1,
        unitName: 'Unit 2',
        unitChassis: 'Test',
        unitVariant: 'T-2',
        status: CampaignUnitStatus.Operational,
      },
      false
    );

    expect(event1.id).not.toBe(event2.id);
  });

  it('should increment sequence numbers', () => {
    const event1 = emitPilotInstanceCreated(
      {
        instanceId: 'p1',
        campaignId: 'c1',
        vaultPilotId: 'v1',
        pilotName: 'Pilot 1',
        skills: { gunnery: 4, piloting: 5 },
      },
      false
    );

    const event2 = emitPilotInstanceCreated(
      {
        instanceId: 'p2',
        campaignId: 'c1',
        vaultPilotId: 'v2',
        pilotName: 'Pilot 2',
        skills: { gunnery: 4, piloting: 5 },
      },
      false
    );

    expect(event2.sequence).toBe(event1.sequence + 1);
  });

  it('should include ISO timestamp', () => {
    const event = emitUnitInstanceCreated(
      {
        instanceId: 'u1',
        campaignId: 'c1',
        vaultUnitId: 'v1',
        vaultUnitVersion: 1,
        unitName: 'Test',
        unitChassis: 'Test',
        unitVariant: 'T',
        status: CampaignUnitStatus.Operational,
      },
      false
    );

    expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
