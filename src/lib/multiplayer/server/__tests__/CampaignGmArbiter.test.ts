/**
 * Tests for `CampaignGmArbiter` — the host-as-GM arbitration layer
 * (CO2, tasks 4.4, 5.5).
 *
 * Covers: a guest proposal does not commit until approved; an approve
 * commits and broadcasts the CO1 event; auto-approve commits with no
 * host step; host-review waits for the host; a vetoed proposal commits
 * nothing; an over-balance proposal is rejected before review in both
 * modes; CO1 mechanical validation runs first.
 *
 * @spec openspec/changes/add-coop-campaign-play/specs/coop-campaign-sync/spec.md
 */

import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';
import type { IGuestProposal } from '@/types/campaign/CoopCampaign';

import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { CampaignGmArbiter } from '@/lib/multiplayer/server/CampaignGmArbiter';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { PROPOSAL_VETOED } from '@/types/campaign/CoopCampaign';

const CAMPAIGN_ID = 'campaign-gm';
const HOST_ID = 'host-player';
const GUEST_ID = 'guest-player';

function stateWith(
  patch: Partial<ICampaignAuthoritativeState>,
): ICampaignAuthoritativeState {
  return { ...createEmptyCampaignState(CAMPAIGN_ID), ...patch };
}

async function makeArbiter(
  mode: 'auto-approve' | 'host-review',
  initialState: ICampaignAuthoritativeState,
): Promise<{
  arbiter: CampaignGmArbiter;
  host: CampaignMatchHost;
  received: ICampaignEvent[];
}> {
  const host = new CampaignMatchHost({
    campaignId: CAMPAIGN_ID,
    hostPlayerId: HOST_ID,
    eventStore: new InMemoryCampaignEventStore(),
    initialState,
  });
  const received: ICampaignEvent[] = [];
  host.subscribe((event) => received.push(event));
  await host.open();
  received.length = 0;
  return { arbiter: new CampaignGmArbiter(host, mode), host, received };
}

function spendProposal(amount: number, id = 'proposal-1'): IGuestProposal {
  return {
    proposalId: id,
    campaignId: CAMPAIGN_ID,
    proposingPlayerId: GUEST_ID,
    ts: '2026-05-19T10:00:00.000Z',
    intent: {
      kind: 'SpendFunds',
      campaignId: CAMPAIGN_ID,
      intentId: `intent-${id}`,
      payload: { amount, reason: 'Ammo' },
    },
  };
}

function hireProposal(cost: number, id = 'proposal-hire'): IGuestProposal {
  return {
    proposalId: id,
    campaignId: CAMPAIGN_ID,
    proposingPlayerId: GUEST_ID,
    ts: '2026-05-19T10:00:00.000Z',
    intent: {
      kind: 'HirePilot',
      campaignId: CAMPAIGN_ID,
      intentId: `intent-${id}`,
      payload: { pilot: { pilotId: 'p1', name: 'Pilot One' }, cost },
    },
  };
}

describe('CampaignGmArbiter — auto-approve mode', () => {
  it('commits a valid proposal immediately with no host step', async () => {
    const { arbiter, host, received } = await makeArbiter(
      'auto-approve',
      stateWith({ balance: 600_000 }),
    );

    const result = await arbiter.submitProposal(spendProposal(100_000));

    expect(result.status).toBe('committed');
    // No host review step — the pending queue stays empty.
    expect(arbiter.getPendingProposals()).toHaveLength(0);
    // The CO1 event committed and broadcast.
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('FundsChanged');
    expect(host.getState().balance).toBe(500_000);
  });

  it('rejects an over-balance proposal before any review', async () => {
    const { arbiter, received } = await makeArbiter(
      'auto-approve',
      stateWith({ balance: 600_000 }),
    );

    const result = await arbiter.submitProposal(spendProposal(700_000));

    expect(result.status).toBe('mechanically-rejected');
    if (result.status === 'mechanically-rejected') {
      expect(result.code).toBe('INVALID_CAMPAIGN_INTENT');
      expect(result.reason).toBe('insufficient-funds');
    }
    // Nothing committed, queue empty.
    expect(received).toHaveLength(0);
    expect(arbiter.getPendingProposals()).toHaveLength(0);
  });

  it('rejects a malformed proposal as mechanically-rejected', async () => {
    const { arbiter } = await makeArbiter(
      'auto-approve',
      stateWith({ balance: 600_000 }),
    );
    const result = await arbiter.submitProposal({ nonsense: true });
    expect(result.status).toBe('mechanically-rejected');
    if (result.status === 'mechanically-rejected') {
      expect(result.reason).toBe('malformed-intent');
    }
  });
});

describe('CampaignGmArbiter — host-review mode', () => {
  it('queues a valid proposal as pending without committing', async () => {
    const { arbiter, host, received } = await makeArbiter(
      'host-review',
      stateWith({ balance: 600_000 }),
    );

    const result = await arbiter.submitProposal(spendProposal(100_000));

    expect(result.status).toBe('pending');
    // The proposal does NOT commit until approved.
    expect(received).toHaveLength(0);
    expect(host.getState().balance).toBe(600_000);
    // It is surfaced on the host review queue with context.
    const pending = arbiter.getPendingProposals();
    expect(pending).toHaveLength(1);
    expect(pending[0].balanceAtSubmit).toBe(600_000);
    expect(pending[0].effectSummary).toContain('Spend');
  });

  it('an approve decision commits and broadcasts the CO1 event', async () => {
    const { arbiter, host, received } = await makeArbiter(
      'host-review',
      stateWith({ balance: 600_000 }),
    );
    await arbiter.submitProposal(spendProposal(100_000));

    const decision = await arbiter.decide('proposal-1', 'approve');

    expect(decision?.status).toBe('committed');
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('FundsChanged');
    expect(host.getState().balance).toBe(500_000);
    // The proposal left the queue.
    expect(arbiter.getPendingProposals()).toHaveLength(0);
  });

  it('a veto commits nothing and returns PROPOSAL_VETOED', async () => {
    const { arbiter, host, received } = await makeArbiter(
      'host-review',
      stateWith({ balance: 600_000 }),
    );
    await arbiter.submitProposal(spendProposal(100_000));

    const decision = await arbiter.decide('proposal-1', 'veto');

    expect(decision?.status).toBe('vetoed');
    if (decision?.status === 'vetoed') {
      expect(decision.error.code).toBe(PROPOSAL_VETOED);
      expect(decision.error.code).not.toBe('INVALID_CAMPAIGN_INTENT');
      expect(decision.error.proposalId).toBe('proposal-1');
    }
    // Nothing committed; balance unchanged; connection still open.
    expect(received).toHaveLength(0);
    expect(host.getState().balance).toBe(600_000);
    expect(host.isClosed()).toBe(false);
    expect(arbiter.getPendingProposals()).toHaveLength(0);
  });

  it('an over-balance proposal is rejected before it reaches the review queue', async () => {
    const { arbiter } = await makeArbiter(
      'host-review',
      stateWith({ balance: 600_000 }),
    );

    const result = await arbiter.submitProposal(spendProposal(700_000));

    expect(result.status).toBe('mechanically-rejected');
    if (result.status === 'mechanically-rejected') {
      expect(result.reason).toBe('insufficient-funds');
    }
    // The host is never asked to approve an over-balance spend.
    expect(arbiter.getPendingProposals()).toHaveLength(0);
  });

  it('decide returns null for an unknown proposal id', async () => {
    const { arbiter } = await makeArbiter(
      'host-review',
      stateWith({ balance: 600_000 }),
    );
    expect(await arbiter.decide('no-such-proposal', 'approve')).toBeNull();
  });

  it('an approval that drifted over-balance resolves mechanically-rejected', async () => {
    const { arbiter, host } = await makeArbiter(
      'host-review',
      stateWith({ balance: 600_000 }),
    );
    // Queue a 500k proposal — valid at submit.
    await arbiter.submitProposal(spendProposal(500_000, 'proposal-big'));
    // Meanwhile the host spends 400k directly.
    await host.applyHostIntent({
      kind: 'SpendFunds',
      campaignId: CAMPAIGN_ID,
      intentId: 'host-spend',
      payload: { amount: 400_000, reason: 'Direct host spend' },
    });
    expect(host.getState().balance).toBe(200_000);

    // Approving the now-stale 500k proposal no longer fits the balance.
    const decision = await arbiter.decide('proposal-big', 'approve');
    expect(decision?.status).toBe('mechanically-rejected');
    expect(host.getState().balance).toBe(200_000);
  });

  it('notifies pending-queue subscribers on enqueue and decide', async () => {
    const { arbiter } = await makeArbiter(
      'host-review',
      stateWith({ balance: 600_000 }),
    );
    const snapshots: number[] = [];
    arbiter.subscribePending((pending) => snapshots.push(pending.length));

    await arbiter.submitProposal(spendProposal(100_000));
    await arbiter.decide('proposal-1', 'veto');

    expect(snapshots).toEqual([1, 0]);
  });
});

describe('CampaignGmArbiter — guest holds no write authority', () => {
  it('a queued host-review proposal is the only path to a commit', async () => {
    const { arbiter, host } = await makeArbiter(
      'host-review',
      stateWith({ balance: 600_000 }),
    );
    await arbiter.submitProposal(hireProposal(75_000));
    // Before the host decides, nothing is on the roster.
    expect(host.getState().pilots.p1).toBeUndefined();

    await arbiter.decide('proposal-hire', 'approve');
    // Only after the GM approves does the pilot land.
    expect(host.getState().pilots.p1).toBeDefined();
    expect(host.getState().balance).toBe(525_000);
  });
});
