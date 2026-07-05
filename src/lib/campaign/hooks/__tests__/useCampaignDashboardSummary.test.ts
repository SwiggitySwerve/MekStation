import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import { extractForceSnapshot } from '@/lib/campaign/hooks/useCampaignDashboardSummary';
import { createCampaign } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';

function makeUnit(
  overrides: Partial<IRosterUnitProjection> = {},
): IRosterUnitProjection {
  return {
    unitId: 'unit-light',
    unitName: 'Light Mech',
    chassisVariant: 'Light Mech',
    readiness: 'Ready',
    ...overrides,
  };
}

function makePilot(
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId: 'pilot-one',
    pilotName: 'MechWarrior 1',
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

describe('dashboard force snapshot roster counts', () => {
  it('reports wizard roster units and pilots from the roster store projection', () => {
    const campaign = createCampaign('Roster Persistence Co.', 'mercenary');
    const snapshot = extractForceSnapshot(
      campaign,
      [makeUnit()],
      [makePilot()],
    );

    expect(snapshot.mechCount).toBe(1);
    expect(snapshot.pilotCount).toBe(1);
  });
});
