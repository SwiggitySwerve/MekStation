import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';

import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { createInjury } from '@/types/campaign/Person';

import {
  buildRosterRecoveryPatchesFromExternalEffects,
  projectRosterRecoveryExternalEffects,
} from '../GmRosterRecoveryProjection';

describe('GM roster recovery projection', () => {
  it('projects wounded pilot recovery as a time-cascade external effect', () => {
    const effects = projectRosterRecoveryExternalEffects({
      campaignId: 'campaign-1',
      days: 2,
      rosterEntries: [
        makeRosterEntry({
          recoveryTime: 5,
          injuries: [
            createInjury({
              id: 'injury-1',
              type: 'Concussion',
              location: 'Head',
              severity: 2,
              daysToHeal: 4,
              acquired: new Date('3025-01-01T00:00:00.000Z'),
            }),
          ],
        }),
      ],
    });

    expect(effects).toHaveLength(1);
    expect(effects[0]).toMatchObject({
      ref: 'campaign:campaign-1:roster:pilot-1:recovery',
      summary: 'Alex Mason recovery advanced 2 days: 5 -> 3 days remaining.',
      before: {
        type: 'gm.roster.recovery',
        pilotId: 'pilot-1',
        recoveryTime: 5,
        status: CampaignPilotStatus.Wounded,
      },
      after: {
        recoveryTime: 3,
        status: CampaignPilotStatus.Wounded,
        patch: {
          recoveryTime: 3,
          status: CampaignPilotStatus.Wounded,
        },
      },
    });
  });

  it('returns wounded pilots to active duty when recovery and injuries clear', () => {
    const effects = projectRosterRecoveryExternalEffects({
      campaignId: 'campaign-1',
      days: 2,
      rosterEntries: [
        makeRosterEntry({
          recoveryTime: 1,
          injuries: [
            createInjury({
              id: 'injury-1',
              type: 'Broken Rib',
              location: 'Torso',
              severity: 1,
              daysToHeal: 2,
              acquired: new Date('3025-01-01T00:00:00.000Z'),
            }),
          ],
        }),
      ],
    });

    expect(effects[0].summary).toContain('1 injury healed');
    expect(effects[0].summary).toContain('Status: wounded -> active.');
    expect(effects[0].after).toMatchObject({
      patch: {
        recoveryTime: 0,
        status: CampaignPilotStatus.Active,
        injuries: [],
      },
    });
  });

  it('skips active pilots without recovery state', () => {
    const effects = projectRosterRecoveryExternalEffects({
      campaignId: 'campaign-1',
      days: 2,
      rosterEntries: [
        makeRosterEntry({
          status: CampaignPilotStatus.Active,
          recoveryTime: 0,
          injuries: [],
        }),
      ],
    });

    expect(effects).toEqual([]);
  });

  it('builds roster patches from approved external effects', () => {
    const [effect] = projectRosterRecoveryExternalEffects({
      campaignId: 'campaign-1',
      days: 2,
      rosterEntries: [
        makeRosterEntry({
          recoveryTime: 1,
          injuries: [
            createInjury({
              id: 'injury-1',
              type: 'Burn',
              location: 'Arm',
              severity: 1,
              daysToHeal: 1,
              acquired: new Date('3025-01-01T00:00:00.000Z'),
            }),
          ],
        }),
      ],
    });

    const patches = buildRosterRecoveryPatchesFromExternalEffects([effect]);

    expect(patches.get('pilot-1')).toEqual({
      status: CampaignPilotStatus.Active,
      recoveryTime: 0,
      injuries: [],
    });
  });
});

function makeRosterEntry(
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId: 'pilot-1',
    pilotName: 'Alex Mason',
    status: CampaignPilotStatus.Wounded,
    wounds: 1,
    recoveryTime: 3,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    hireDate: new Date('3025-01-01T00:00:00.000Z'),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    injuries: [],
    ...overrides,
  };
}
