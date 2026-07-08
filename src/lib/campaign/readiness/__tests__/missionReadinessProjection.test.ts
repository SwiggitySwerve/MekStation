import type { IRepairBayItem } from '@/types/campaign/CampaignInventory';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import { buildMissionReadinessProjection } from '@/lib/campaign/readiness/missionReadinessProjection';
import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { createMission } from '@/types/campaign/Mission';

function makeUnit(
  overrides: Partial<IRosterUnitProjection> = {},
): IRosterUnitProjection {
  return {
    unitId: 'unit-ready',
    unitName: 'Atlas',
    chassisVariant: 'AS7-D',
    pilotId: 'pilot-ready',
    unitRef: 'atlas-as7-d',
    readiness: 'Ready',
    ...overrides,
  };
}

function makePilot(
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId: 'pilot-ready',
    pilotName: 'Ari Valen',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    hireDate: new Date('3025-01-01T00:00:00.000Z'),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    ...overrides,
  };
}

function makeRepairTicket(
  overrides: Partial<IRepairBayItem> = {},
): IRepairBayItem {
  return {
    ticketId: 'ticket-1',
    unitId: 'unit-ready',
    kind: 'armor',
    location: 'CT',
    expectedHours: 4,
    partsReady: true,
    status: 'queued',
    ...overrides,
  };
}

const mission = createMission({
  id: 'mission-alpha',
  name: 'Border Probe',
  status: MissionStatus.ACTIVE,
});

describe('buildMissionReadinessProjection', () => {
  it('selects a default deployable roster and explains launch consequences', () => {
    const projection = buildMissionReadinessProjection({
      campaignId: 'campaign-1',
      mission,
      units: [
        makeUnit(),
        makeUnit({
          unitId: 'unit-damaged',
          unitName: 'Centurion',
          pilotId: undefined,
          readiness: 'Damaged',
        }),
        makeUnit({
          unitId: 'unit-destroyed',
          unitName: 'Locust',
          pilotId: undefined,
          readiness: 'Destroyed',
        }),
      ],
      pilots: [makePilot()],
      baseCampaignHref: '/gameplay/campaigns/campaign-1',
    });

    expect(projection.canLaunch).toBe(true);
    expect(projection.selectedRosterUnitIds).toEqual([
      'unit-ready',
      'unit-damaged',
    ]);
    expect(projection.blockedUnitIds).toEqual(['unit-destroyed']);
    expect(projection.warnings.map((reason) => reason.code)).toEqual([
      'unit_damaged',
      'pilot_unassigned',
    ]);
    expect(projection.launchConsequences).toContain('Deploy 2 selected units');
    expect(projection.launchConsequences).toContain('Ready to launch');
    expect(projection.warnings[1]).toMatchObject({
      actionLabel: 'Assign pilot',
      actionHref:
        '/gameplay/campaigns/campaign-1/personnel?intent=assign-pilot&unit=unit-damaged',
    });
  });

  it('blocks launch when the selected unit is destroyed or under blocking repair', () => {
    const projection = buildMissionReadinessProjection({
      campaignId: 'campaign-1',
      mission,
      units: [
        makeUnit({
          unitId: 'unit-destroyed',
          pilotId: undefined,
          readiness: 'Destroyed',
        }),
        makeUnit({ unitId: 'unit-ready' }),
      ],
      pilots: [makePilot()],
      repairBay: [
        makeRepairTicket({
          unitId: 'unit-ready',
          status: 'parts-needed',
          partsReady: false,
        }),
      ],
      selectedRosterUnitIds: ['unit-destroyed', 'unit-ready'],
      baseCampaignHref: '/gameplay/campaigns/campaign-1',
    });

    expect(projection.canLaunch).toBe(false);
    expect(projection.unresolvedBlockers.map((reason) => reason.code)).toEqual([
      'unit_destroyed',
      'repair_blocking',
    ]);
    expect(projection.units[0]?.reasons[0]?.actionHref).toBe(
      '/gameplay/campaigns/campaign-1/repair-bay?unit=unit-destroyed',
    );
  });

  it('blocks missing roster ids and unavailable pilots before materialization', () => {
    const projection = buildMissionReadinessProjection({
      campaignId: 'campaign-1',
      mission,
      units: [makeUnit()],
      pilots: [
        makePilot({
          status: CampaignPilotStatus.Critical,
        }),
      ],
      selectedRosterUnitIds: ['unit-ready', 'unit-missing'],
    });

    expect(projection.canLaunch).toBe(false);
    expect(projection.unresolvedBlockers.map((reason) => reason.code)).toEqual([
      'selected_unit_missing',
      'pilot_unavailable',
    ]);
  });

  it('blocks launch when a selected unit has no canonical unitRef', () => {
    const projection = buildMissionReadinessProjection({
      campaignId: 'campaign-1',
      mission,
      units: [
        {
          unitId: 'unit-legacy',
          unitName: 'Legacy Shadow Hawk',
          chassisVariant: 'SHD-2H',
          pilotId: 'pilot-ready',
          readiness: 'Ready',
        },
      ],
      pilots: [makePilot()],
      selectedRosterUnitIds: ['unit-legacy'],
    });

    expect(projection.canLaunch).toBe(false);
    expect(projection.blockedUnitIds).toEqual(['unit-legacy']);
    expect(projection.unresolvedBlockers).toEqual([
      expect.objectContaining({
        code: 'unit_ref_unresolved',
        severity: 'blocker',
        subjectId: 'unit-legacy',
        message:
          'Legacy Shadow Hawk has no canonical record; recreate the campaign or edit the unit in Mech Bay before launch.',
      }),
    ]);
  });
});
