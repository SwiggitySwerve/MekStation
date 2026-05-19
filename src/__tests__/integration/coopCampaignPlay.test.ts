/**
 * Co-op campaign play — end-to-end integration tests (CO2, task 9).
 *
 * These wire a real `CampaignMatchHost` + `CampaignSyncSession` + a real
 * guest `useCampaignMirrorStore` to the CO2 `CampaignGmArbiter` and
 * `composeCoopEncounter` / `reconcileCoopBattle` layers, and assert the
 * four spec-level co-op scenarios:
 *
 *   9.1 a co-op mission with both players deploying composes both
 *       rosters on the shared side;
 *   9.2 a co-op mission with one player in command-hq keeps the HQ
 *       player's campaign mirror current with the post-battle events;
 *   9.3 in host-review mode a guest HirePilot proposal is approved and
 *       both campaign views converge; a second proposal is vetoed and
 *       commits nothing;
 *   9.4 in auto-approve mode a valid guest proposal commits with no host
 *       step; an over-balance proposal is still rejected.
 *
 * @spec openspec/changes/add-coop-campaign-play/specs/coop-campaign-sync/spec.md
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';
import type { IForce } from '@/types/campaign/Force';
import type { IEncounter } from '@/types/encounter';

import { composeCoopEncounter } from '@/lib/campaign/coop/composeCoopEncounter';
import { reconcileCoopBattle } from '@/lib/campaign/coop/reconcileCoopBattle';
import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { CampaignGmArbiter } from '@/lib/multiplayer/server/CampaignGmArbiter';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import { CampaignSyncSession } from '@/lib/multiplayer/server/CampaignSyncSession';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { ForceRole, FormationLevel } from '@/types/campaign/enums';
import { EncounterStatus, TerrainPreset } from '@/types/encounter';

const CAMPAIGN_ID = 'campaign-coop-e2e';
const HOST_ID = 'host-player';
const GUEST_ID = 'guest-player';
const HOST_PEER = 'host-peer';
const GUEST_PEER = 'guest-peer';

function makeForce(id: string, unitIds: string[]): IForce {
  return {
    id,
    name: `Force ${id}`,
    subForceIds: [],
    unitIds,
    forceType: ForceRole.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '2026-05-19T00:00:00.000Z',
    updatedAt: '2026-05-19T00:00:00.000Z',
  };
}

const BASE_ENCOUNTER: IEncounter = {
  id: 'enc-coop-e2e',
  name: 'Co-op Standup',
  status: EncounterStatus.Ready,
  mapConfig: {
    radius: 8,
    terrain: TerrainPreset.Clear,
    playerDeploymentZone: 'south',
    opponentDeploymentZone: 'north',
  },
  victoryConditions: [],
  optionalRules: [],
  createdAt: '2026-05-19T00:00:00.000Z',
  updatedAt: '2026-05-19T00:00:00.000Z',
  campaignMeta: {
    campaignId: CAMPAIGN_ID,
    contractId: 'contract-1',
    scenarioId: 'scenario-1',
  },
};

interface IHarness {
  host: CampaignMatchHost;
  session: CampaignSyncSession;
  arbiter: CampaignGmArbiter;
  deliverToGuest: (event: ICampaignEvent) => void;
}

function harness(
  mode: 'auto-approve' | 'host-review',
  balance: number,
): IHarness {
  const host = new CampaignMatchHost({
    campaignId: CAMPAIGN_ID,
    hostPlayerId: HOST_ID,
    eventStore: new InMemoryCampaignEventStore(),
    initialState: { ...createEmptyCampaignState(CAMPAIGN_ID), balance },
  });
  const session = new CampaignSyncSession(host);
  const arbiter = new CampaignGmArbiter(host, mode);
  const deliverToGuest = (event: ICampaignEvent): void => {
    const store = useCampaignMirrorStore.getState();
    if (event.type === 'CampaignSnapshotPublished' && event.sequence < 0) {
      store.applySnapshot(event);
    } else {
      store.applyEvent(event);
    }
  };
  return { host, session, arbiter, deliverToGuest };
}

beforeEach(() => {
  useCampaignMirrorStore.getState().reset();
  useCampaignMirrorStore
    .getState()
    .beginMirror(
      { hostPeerId: HOST_PEER, guestPeerId: GUEST_PEER },
      GUEST_PEER,
    );
});

describe('9.1 — co-op mission with both players deploying', () => {
  it('composes both rosters on the shared side', () => {
    const result = composeCoopEncounter(BASE_ENCOUNTER, [
      {
        playerId: HOST_ID,
        role: 'host',
        force: makeForce('force-host', ['u-h1', 'u-h2']),
        participation: 'deploy',
      },
      {
        playerId: GUEST_ID,
        role: 'guest',
        force: makeForce('force-guest', ['u-g1', 'u-g2']),
        participation: 'deploy',
      },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Both rosters present, all on the shared side.
    expect(result.composition.coopSeats).toHaveLength(4);
    expect(result.composition.deployingPlayerIds).toEqual([HOST_ID, GUEST_ID]);
    // The encounter routes through the existing combat host unchanged.
    expect(result.composition.encounter).toBe(BASE_ENCOUNTER);
  });
});

describe('9.2 — co-op mission with one player in command-hq', () => {
  it('keeps the command-hq guest mirror current with post-battle events', async () => {
    const { host, session, deliverToGuest } = harness(
      'auto-approve',
      1_000_000,
    );
    const code = await session.open();
    const join = await session.joinGuest(code, deliverToGuest);
    expect(join.ok).toBe(true);

    // Compose with the guest in command-hq — only the host deploys.
    const composed = composeCoopEncounter(BASE_ENCOUNTER, [
      {
        playerId: HOST_ID,
        role: 'host',
        force: makeForce('force-host', ['u-h1']),
        participation: 'deploy',
      },
      {
        playerId: GUEST_ID,
        role: 'guest',
        force: makeForce('force-guest', ['u-g1']),
        participation: 'command-hq',
      },
    ]);
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    expect(composed.composition.commandHqPlayerIds).toEqual([GUEST_ID]);

    // The battle resolves; reconcile post-battle consequences.
    await reconcileCoopBattle(host, {
      campaignId: CAMPAIGN_ID,
      matchId: 'match-9-2',
      fundsDelta: -100_000,
      fundsReason: 'Repair costs',
      salvageValue: 200_000,
      rosterChanges: [
        { unitId: 'u-h1', designation: 'Atlas AS7-D', status: 'damaged' },
      ],
    });

    // The command-hq guest's mirror converged on the post-battle state.
    const mirror = useCampaignMirrorStore.getState().campaign;
    expect(mirror?.balance).toBe(host.getState().balance);
    expect(mirror?.salvagePool).toBe(host.getState().salvagePool);
    expect(mirror?.balance).toBe(900_000);
    expect(mirror?.salvagePool).toBe(200_000);
  });
});

describe('9.3 — host-review approve and veto', () => {
  it('an approved HirePilot proposal converges both views; a veto commits nothing', async () => {
    const { host, session, arbiter, deliverToGuest } = harness(
      'host-review',
      1_000_000,
    );
    const code = await session.open();
    await session.joinGuest(code, deliverToGuest);

    // The guest proposes a hire — host-review queues it, no commit yet.
    const submit = await arbiter.submitProposal({
      proposalId: 'prop-hire',
      campaignId: CAMPAIGN_ID,
      proposingPlayerId: GUEST_ID,
      ts: '2026-05-19T10:00:00.000Z',
      intent: {
        kind: 'HirePilot',
        campaignId: CAMPAIGN_ID,
        intentId: 'intent-hire',
        payload: { pilot: { pilotId: 'p1', name: 'Pilot One' }, cost: 75_000 },
      },
    });
    expect(submit.status).toBe('pending');
    expect(
      useCampaignMirrorStore.getState().campaign?.pilots.p1,
    ).toBeUndefined();

    // The host approves — the CO1 events commit and broadcast.
    const approved = await arbiter.decide('prop-hire', 'approve');
    expect(approved?.status).toBe('committed');
    // Both views converge: host state + guest mirror.
    expect(host.getState().pilots.p1).toBeDefined();
    expect(useCampaignMirrorStore.getState().campaign?.pilots.p1).toBeDefined();
    expect(useCampaignMirrorStore.getState().campaign?.balance).toBe(
      host.getState().balance,
    );

    // A second proposal — the host vetoes it; nothing commits.
    const balanceBeforeVeto = host.getState().balance;
    await arbiter.submitProposal({
      proposalId: 'prop-spend',
      campaignId: CAMPAIGN_ID,
      proposingPlayerId: GUEST_ID,
      ts: '2026-05-19T10:05:00.000Z',
      intent: {
        kind: 'SpendFunds',
        campaignId: CAMPAIGN_ID,
        intentId: 'intent-spend',
        payload: { amount: 50_000, reason: 'Ammo' },
      },
    });
    const vetoed = await arbiter.decide('prop-spend', 'veto');
    expect(vetoed?.status).toBe('vetoed');
    if (vetoed?.status === 'vetoed') {
      expect(vetoed.error.code).toBe('PROPOSAL_VETOED');
    }
    // Nothing committed — balance unchanged, connection still open.
    expect(host.getState().balance).toBe(balanceBeforeVeto);
    expect(host.isClosed()).toBe(false);
  });
});

describe('9.4 — auto-approve commit and over-balance rejection', () => {
  it('commits a valid proposal with no host step; rejects an over-balance proposal', async () => {
    const { host, session, arbiter, deliverToGuest } = harness(
      'auto-approve',
      300_000,
    );
    const code = await session.open();
    await session.joinGuest(code, deliverToGuest);

    // A valid proposal commits immediately — no review step.
    const ok = await arbiter.submitProposal({
      proposalId: 'prop-ok',
      campaignId: CAMPAIGN_ID,
      proposingPlayerId: GUEST_ID,
      ts: '2026-05-19T10:00:00.000Z',
      intent: {
        kind: 'SpendFunds',
        campaignId: CAMPAIGN_ID,
        intentId: 'intent-ok',
        payload: { amount: 100_000, reason: 'Ammo' },
      },
    });
    expect(ok.status).toBe('committed');
    expect(arbiter.getPendingProposals()).toHaveLength(0);
    expect(host.getState().balance).toBe(200_000);
    expect(useCampaignMirrorStore.getState().campaign?.balance).toBe(200_000);

    // An over-balance proposal is still rejected mechanically.
    const over = await arbiter.submitProposal({
      proposalId: 'prop-over',
      campaignId: CAMPAIGN_ID,
      proposingPlayerId: GUEST_ID,
      ts: '2026-05-19T10:05:00.000Z',
      intent: {
        kind: 'SpendFunds',
        campaignId: CAMPAIGN_ID,
        intentId: 'intent-over',
        payload: { amount: 500_000, reason: 'Too much' },
      },
    });
    expect(over.status).toBe('mechanically-rejected');
    if (over.status === 'mechanically-rejected') {
      expect(over.reason).toBe('insufficient-funds');
    }
    // Balance untouched by the rejected proposal.
    expect(host.getState().balance).toBe(200_000);
  });
});
