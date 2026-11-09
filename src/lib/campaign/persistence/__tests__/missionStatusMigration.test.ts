/**
 * Old saves must keep loading after the mission-status machine drops the
 * never-written CANCELLED / ABORTED values.
 *
 * `fixtures/missionStatusesPreMachine.json` is the unmodified output of
 * origin/main's `serializeCampaign` (commit 35bd476b7, before the machine)
 * over a campaign holding one contract per status the old enum allowed.
 * Do not regenerate it: it is the "old shape" this test pins.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import type { SerializedCampaignBody } from '@/types/campaign/SerializedCampaign';

import {
  isTerminalMissionStatus,
  MissionStatus,
  missionPayoutOutcome,
} from '@/types/campaign/enums';
import { isContract } from '@/types/campaign/Mission';
import { logger } from '@/utils/logger';

import {
  rehydrateCampaignMission,
  rehydrateContractMarket,
  rehydrateMissionMap,
} from '../missionSerialization';
import { deserializeCampaignBody } from '../serializeCampaign';

const fixture = JSON.parse(
  readFileSync(
    join(__dirname, 'fixtures', 'missionStatusesPreMachine.json'),
    'utf8',
  ),
) as SerializedCampaignBody;

function statusesOf(missions: ReadonlyMap<string, { status: string }>) {
  return Object.fromEntries(
    [...missions].map(([id, mission]) => [id, mission.status]),
  );
}

describe('pre-machine campaign save', () => {
  it('stores the retired statuses as plain strings in the fixture', () => {
    const stored = Object.fromEntries(
      fixture.missions.map(([id, mission]) => [id, mission.status]),
    );

    expect(stored).toMatchObject({
      'contract-cancelled': 'Cancelled',
      'contract-aborted': 'Aborted',
      'contract-breach': 'Breach',
    });
  });

  it('loads through deserializeCampaignBody with every live status intact', () => {
    const campaign = deserializeCampaignBody(fixture);

    expect(statusesOf(campaign.missions)).toEqual({
      'contract-active': MissionStatus.ACTIVE,
      'contract-success': MissionStatus.SUCCESS,
      'contract-partial': MissionStatus.PARTIAL,
      'contract-failed': MissionStatus.FAILED,
      'contract-breach': MissionStatus.BREACH,
      'contract-cancelled': MissionStatus.FAILED,
      'contract-aborted': MissionStatus.FAILED,
      'contract-pending': MissionStatus.PENDING,
      'mission-plain-pending': MissionStatus.PENDING,
    });
  });

  it.each(['contract-cancelled', 'contract-aborted'])(
    'keeps %s settled with its old failure payout',
    (id) => {
      const mission = deserializeCampaignBody(fixture).missions.get(id);

      expect(mission && isContract(mission)).toBe(true);
      expect(isTerminalMissionStatus(mission!.status)).toBe(true);
      expect(missionPayoutOutcome(mission!.status)).toBe('failure');
    },
  );

  it('loads the same statuses through the missions-store path', () => {
    const missions = rehydrateMissionMap(fixture.missions);

    expect(missions.get('contract-cancelled')?.status).toBe(
      MissionStatus.FAILED,
    );
    expect(missions.get('contract-aborted')?.status).toBe(MissionStatus.FAILED);
    expect(missions.get('contract-active')?.status).toBe(MissionStatus.ACTIVE);
  });

  it('keeps market offers pending', () => {
    const market = rehydrateContractMarket(
      fixture.contractMarket as Parameters<typeof rehydrateContractMarket>[0],
    );

    expect(market?.offers.map((offer) => offer.status)).toEqual([
      MissionStatus.PENDING,
      MissionStatus.PENDING,
    ]);
  });
});

describe('a status the union does not know', () => {
  it('loads as inert PENDING and warns once, instead of staying an untyped string', () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    try {
      const stored = fixture.missions.find(
        ([id]) => id === 'contract-active',
      )![1];

      const loaded = rehydrateCampaignMission({
        ...stored,
        status: 'Mothballed' as never,
      });

      expect(loaded.status).toBe(MissionStatus.PENDING);
      expect(isTerminalMissionStatus(loaded.status)).toBe(false);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain('Mothballed');
    } finally {
      warn.mockRestore();
    }
  });

  it('does not warn for a legacy value it maps on purpose', () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    try {
      rehydrateMissionMap(fixture.missions);

      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
