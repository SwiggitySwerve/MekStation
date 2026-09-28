import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import { projectCampaignActivityForViewer } from '@/lib/campaign/activity/campaignActivityProjection';
import { projectCampaignStreamForGrant } from '@/lib/campaign/delivery/projectCampaignStreamForGrant';
import { applyCampaignEvent } from '@/lib/campaign/sync/applyCampaignEvent';
import {
  CAMPAIGN_ENTITY_TYPES,
  campaignEventEntityRefs,
} from '@/lib/campaign/sync/campaignEventEntityRefs';
import { resolveCampaignEventScope } from '@/lib/campaign/sync/campaignEventScope';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import {
  EVENT_TS,
  PARTICIPANT_PLAYER,
  appendCampaignEvent,
  closeCampaignDeliveryHarness,
  issueTestGrant,
  mintGrantPrincipal,
  openCampaignDeliveryHarness,
} from './grantProjectionHarness';

const CAMPAIGN_ID = 'campaign-mission-launch-contract';
const LAUNCH_PAYLOAD = Object.freeze({
  missionId: 'mission-1',
  missionMatchId: 'match-mission-1',
  acceptedHead: Object.freeze({
    branchId: 'root',
    revision: 4,
    effectiveGeneration: 2,
  }),
  deployingPlayerIds: Object.freeze(['player-1', 'player-2']),
});

function launchEvent(sequence = 0): ICampaignEvent {
  return {
    type: 'CampaignMissionLaunched',
    sequence,
    campaignId: CAMPAIGN_ID,
    ts: EVENT_TS,
    authorPlayerId: 'pid-host',
    scope: 'campaign',
    payload: LAUNCH_PAYLOAD,
  } as unknown as ICampaignEvent;
}

function privateSnapshot(sequence: number): ICampaignEvent {
  const state: ICampaignAuthoritativeState = {
    ...createEmptyCampaignState(CAMPAIGN_ID),
    pilots: {
      private: { pilotId: 'private-pilot', name: 'PRIVATE PILOT' },
    },
  };
  return {
    type: 'CampaignSnapshotPublished',
    sequence,
    campaignId: CAMPAIGN_ID,
    ts: EVENT_TS,
    authorPlayerId: 'pid-host',
    scope: 'campaign',
    payload: { state },
  };
}

describe('CampaignMissionLaunched contract', () => {
  it('is a state-preserving campaign fact with mission and match refs', () => {
    const state = createEmptyCampaignState(CAMPAIGN_ID);
    const event = launchEvent();

    expect(applyCampaignEvent(state, event)).toBe(state);
    expect(resolveCampaignEventScope(event.type)).toBe('campaign');
    expect(campaignEventEntityRefs(CAMPAIGN_ID, event)).toEqual([
      {
        entityType: CAMPAIGN_ENTITY_TYPES.campaign,
        entityId: CAMPAIGN_ID,
        role: 'subject',
      },
      {
        entityType: CAMPAIGN_ENTITY_TYPES.mission,
        entityId: LAUNCH_PAYLOAD.missionId,
        role: 'launched',
      },
      {
        entityType: CAMPAIGN_ENTITY_TYPES.match,
        entityId: LAUNCH_PAYLOAD.missionMatchId,
        role: 'mission-match',
      },
    ]);
  });

  it('projects one roster-free battle activity row', () => {
    const [entry] = projectCampaignActivityForViewer(
      CAMPAIGN_ID,
      [launchEvent()],
      { admits: (scope) => scope === 'campaign', seesGmPrivateDetail: false },
    );

    expect(entry).toEqual(
      expect.objectContaining({
        category: 'battle',
        actorPlayerId: 'pid-host',
      }),
    );
    expect(entry).toBeDefined();
    for (const privateKey of ['pilot', 'roster', 'owner', 'unitBootstrap']) {
      expect(entry).not.toHaveProperty(privateKey);
    }
  });
});

describe('CampaignMissionLaunched grant projection', () => {
  let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;

  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
  });

  afterEach(async () => {
    await closeCampaignDeliveryHarness(harness);
  });

  async function project(scopes: readonly string[]) {
    const grant = issueTestGrant(harness, {
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_PLAYER,
      scopes,
    });
    const result = await projectCampaignStreamForGrant(harness.deps, {
      principal: mintGrantPrincipal(PARTICIPANT_PLAYER),
      grantId: grant.grantId,
      cursor: null,
    });
    if (result.kind !== 'page') throw new Error(result.kind);
    return result;
  }

  it('projects the payload unchanged without the source authority sequence', async () => {
    await appendCampaignEvent(harness, launchEvent());

    const page = await project(['campaign']);

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.event).toEqual({
      type: 'CampaignMissionLaunched',
      campaignId: CAMPAIGN_ID,
      ts: EVENT_TS,
      authorPlayerId: 'pid-host',
      scope: 'campaign',
      payload: LAUNCH_PAYLOAD,
    });
    expect(page.items[0]?.event).not.toHaveProperty('sequence');
  });

  it('keeps the privacy latch set while projecting the later visible launch', async () => {
    await appendCampaignEvent(harness, {
      ...launchEvent(0),
      type: 'ParticipantRemoved',
      scope: 'gm',
      payload: { participantId: 'private-player', reason: 'PRIVATE REASON' },
    } as ICampaignEvent);
    await appendCampaignEvent(harness, launchEvent(1));
    await appendCampaignEvent(harness, privateSnapshot(2));

    const page = await project(['campaign']);

    expect(page.items.map((item) => item.event.type)).toEqual([
      'CampaignMissionLaunched',
    ]);
    expect(JSON.stringify(page)).not.toContain('PRIVATE');
  });

  it('does not project the launch to a grant without campaign scope', async () => {
    await appendCampaignEvent(harness, launchEvent());

    const page = await project(['team:alpha']);

    expect(page.items).toEqual([]);
  });
});
