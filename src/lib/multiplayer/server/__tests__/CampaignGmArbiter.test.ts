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
import {
  CampaignGmArbiter,
  type CampaignGuardedCommit,
} from '@/lib/multiplayer/server/CampaignGmArbiter';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import {
  campaignProgressionLateRefusal,
  isCampaignProgressionLateRefusal,
} from '@/lib/multiplayer/server/CampaignProgressionGate';
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

// =============================================================================
// polish-wave-6.2-gaps (gap #3) — host-review proposal timeout
// =============================================================================
//
// A proposal that sits in `pending` longer than `proposalTimeoutMs` auto-
// resolves with `{ status: 'vetoed', reason: 'host-review-timeout' }`
// so the guest's pending overlay doesn't hang forever when the host
// goes AFK / disconnects. Manual host vetoes carry no `reason`, so the
// guest UI can label the badge distinctly.

async function makeArbiterWithTimeout(
  mode: 'auto-approve' | 'host-review',
  initialState: ICampaignAuthoritativeState,
  proposalTimeoutMs: number,
): Promise<{
  arbiter: CampaignGmArbiter;
  host: CampaignMatchHost;
}> {
  const host = new CampaignMatchHost({
    campaignId: CAMPAIGN_ID,
    hostPlayerId: HOST_ID,
    eventStore: new InMemoryCampaignEventStore(),
    initialState,
  });
  await host.open();
  return {
    arbiter: new CampaignGmArbiter(host, mode, { proposalTimeoutMs }),
    host,
  };
}

describe('CampaignGmArbiter — host-review proposal timeout (gap #3)', () => {
  it('autoVetoForTimeout emits a veto with reason "host-review-timeout"', async () => {
    // A 0-ms timeout would also work but we want to exercise the public
    // autoVetoForTimeout entry point directly (the timer-fired callback).
    const { arbiter } = await makeArbiterWithTimeout(
      'host-review',
      stateWith({ balance: 600_000 }),
      10_000,
    );

    await arbiter.submitProposal(spendProposal(50_000, 'p-timeout'));
    expect(arbiter.getPendingProposals()).toHaveLength(1);

    const result = arbiter.autoVetoForTimeout('p-timeout');

    expect(result).not.toBeNull();
    expect(result?.status).toBe('vetoed');
    if (result?.status === 'vetoed') {
      expect(result.error.code).toBe(PROPOSAL_VETOED);
      expect(result.error.reason).toBe('host-review-timeout');
    }
    expect(arbiter.getPendingProposals()).toHaveLength(0);
  });

  it('a host-driven veto omits the reason field (label-distinguishable from auto-veto)', async () => {
    const { arbiter } = await makeArbiterWithTimeout(
      'host-review',
      stateWith({ balance: 600_000 }),
      10_000,
    );
    await arbiter.submitProposal(spendProposal(50_000, 'p-manual'));

    const result = await arbiter.decide('p-manual', 'veto');

    expect(result?.status).toBe('vetoed');
    if (result?.status === 'vetoed') {
      expect(result.error.code).toBe(PROPOSAL_VETOED);
      // No reason on a host-driven veto — the guest UI labels it as
      // "host vetoed", not "host didn't respond".
      expect(result.error.reason).toBeUndefined();
    }
  });

  it('autoVetoForTimeout is a no-op for a proposal already resolved by the host', async () => {
    const { arbiter } = await makeArbiterWithTimeout(
      'host-review',
      stateWith({ balance: 600_000 }),
      10_000,
    );
    await arbiter.submitProposal(spendProposal(50_000, 'p-resolved'));
    await arbiter.decide('p-resolved', 'approve');

    // Host already resolved — the auto-veto path returns null and does
    // not double-veto.
    const result = arbiter.autoVetoForTimeout('p-resolved');
    expect(result).toBeNull();
  });

  it('a manually-resolved proposal cancels its timer (no stale auto-veto fires)', async () => {
    jest.useFakeTimers();
    try {
      const { arbiter } = await makeArbiterWithTimeout(
        'host-review',
        stateWith({ balance: 600_000 }),
        10_000,
      );
      await arbiter.submitProposal(spendProposal(50_000, 'p-cancel'));
      // Resolve before timeout fires.
      await arbiter.decide('p-cancel', 'veto');
      // Advance past the original timeout — no auto-veto should fire.
      jest.advanceTimersByTime(20_000);
      // Auto-veto path returns null because the entry is gone.
      expect(arbiter.autoVetoForTimeout('p-cancel')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('proposalTimeoutMs is configurable — fake timers fire auto-veto at the configured interval', async () => {
    jest.useFakeTimers();
    try {
      const { arbiter } = await makeArbiterWithTimeout(
        'host-review',
        stateWith({ balance: 600_000 }),
        500, // 500 ms — much shorter than default 5 min
      );
      await arbiter.submitProposal(spendProposal(50_000, 'p-fast'));
      expect(arbiter.getPendingProposals()).toHaveLength(1);

      // Advance just past the configured interval — timer should fire.
      jest.advanceTimersByTime(600);

      // Auto-veto fired automatically; pending queue cleared.
      expect(arbiter.getPendingProposals()).toHaveLength(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('proposalTimeoutMs: 0 disables the auto-veto entirely (legacy behavior)', async () => {
    jest.useFakeTimers();
    try {
      const { arbiter } = await makeArbiterWithTimeout(
        'host-review',
        stateWith({ balance: 600_000 }),
        0,
      );
      await arbiter.submitProposal(spendProposal(50_000, 'p-forever'));
      expect(arbiter.getPendingProposals()).toHaveLength(1);

      // Advance forever — no auto-veto fires.
      jest.advanceTimersByTime(10 * 60_000);

      expect(arbiter.getPendingProposals()).toHaveLength(1);
    } finally {
      jest.useRealTimers();
    }
  });
});

/**
 * P2CG1D: guarded AdvanceDay approvals. The commit itself (B's guard, the
 * C/M locks, real SQLite) is proven in bindCampaignSyncConnection.test.ts;
 * here a scripted guarded commit drives the arbiter's reservation,
 * coalescing and invalidation, with a recording timer pair and explicit
 * promise barriers.
 */
describe('CampaignGmArbiter ? guarded AdvanceDay reservation (P2CG1D)', () => {
  type Reservation = Parameters<CampaignGuardedCommit>[1];
  type Outcome = Awaited<ReturnType<CampaignGuardedCommit>>;

  function advanceProposal(id = 'p-advance'): IGuestProposal {
    return {
      proposalId: id,
      campaignId: CAMPAIGN_ID,
      proposingPlayerId: GUEST_ID,
      ts: '2026-05-19T10:00:00.000Z',
      intent: {
        kind: 'AdvanceDay',
        campaignId: CAMPAIGN_ID,
        intentId: `intent-${id}`,
        payload: { days: 1 },
      },
    };
  }

  /** A recording timer pair: armed handles, cleared handles, and a manual fire. */
  function recordingTimers() {
    const armed: Array<{ handler: () => void; ms: number; id: number }> = [];
    const cleared: unknown[] = [];
    return {
      armed,
      cleared,
      timers: {
        setTimeout: (handler: () => void, ms: number) => {
          const timer = { handler, ms, id: armed.length };
          armed.push(timer);
          return timer;
        },
        clearTimeout: (handle: unknown) => {
          cleared.push(handle);
        },
      },
    };
  }

  /**
   * A scripted guarded commit: waits on `gate`, then plays the real door's
   * order ? the guard reads `valid()`; a commit calls `consumed()` in the
   * commit's own span ? and answers `outcome` for a valid reservation.
   */
  function scripted(outcome: (r: Reservation) => Outcome) {
    let open!: () => void;
    const gate = new Promise<void>((resolve) => {
      open = resolve;
    });
    let entered!: () => void;
    const reached = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const commit = jest.fn<Promise<Outcome>, Parameters<CampaignGuardedCommit>>(
      async (_intent, reservation) => {
        entered();
        await gate;
        if (!reservation.valid()) {
          return {
            kind: 'refused',
            refusal: {
              kind: 'refused',
              reason: 'proposal-reservation-invalid',
            },
          };
        }
        const answer = outcome(reservation);
        if (answer.kind === 'committed') reservation.consumed();
        return answer;
      },
    );
    return { commit, open, reached };
  }

  const committed = (): Outcome => ({ kind: 'committed', events: [] });
  const refused = (reason: string): Outcome => ({
    kind: 'refused',
    refusal: { kind: 'refused', reason },
  });

  async function reviewArbiter() {
    const host = new CampaignMatchHost({
      campaignId: CAMPAIGN_ID,
      hostPlayerId: HOST_ID,
      eventStore: new InMemoryCampaignEventStore(),
      initialState: stateWith({ balance: 600_000 }),
    });
    await host.open();
    const recorded = recordingTimers();
    const arbiter = new CampaignGmArbiter(host, 'host-review', {
      proposalTimeoutMs: 60_000,
      timers: recorded.timers,
    });
    const resolved: unknown[] = [];
    arbiter.subscribeResolved((result) => resolved.push(result));
    expect(await arbiter.submitProposal(advanceProposal())).toEqual({
      status: 'pending',
      proposalId: 'p-advance',
    });
    const [pending] = arbiter.getPendingProposals();
    return { arbiter, host, pending, resolved, ...recorded };
  }

  it('keeps the pending entry and its original timer through preparation; the commit consumes it once', async () => {
    const { arbiter, pending, armed, cleared } = await reviewArbiter();
    const notified: number[] = [];
    arbiter.subscribePending((rows) => notified.push(rows.length));
    const guarded = scripted(committed);
    const decided = arbiter.decide('p-advance', 'approve', guarded.commit);
    await guarded.reached;
    expect(arbiter.getPendingProposals()).toEqual([pending]);
    expect(armed).toHaveLength(1);
    expect(cleared).toEqual([]);
    expect(notified).toEqual([]);
    guarded.open();
    expect(await decided).toEqual({
      status: 'committed',
      proposalId: 'p-advance',
      events: [],
    });
    expect(arbiter.getPendingProposals()).toEqual([]);
    expect(cleared).toEqual([armed[0]]);
    expect(notified).toEqual([0]);
    expect(guarded.commit).toHaveBeenCalledTimes(1);
    expect(
      await arbiter.decide('p-advance', 'approve', guarded.commit),
    ).toBeNull();
  });

  it('coalesces concurrent identical approvals into one attempt', async () => {
    const { arbiter } = await reviewArbiter();
    const guarded = scripted(committed);
    const first = arbiter.decide('p-advance', 'approve', guarded.commit);
    const second = arbiter.decide('p-advance', 'approve', guarded.commit);
    const third = arbiter.decide('p-advance', 'approve');
    guarded.open();
    expect(await first).toEqual(
      expect.objectContaining({ status: 'committed' }),
    );
    expect(await second).toBeNull();
    expect(await third).toBeNull();
    expect(guarded.commit).toHaveBeenCalledTimes(1);
  });

  it('a late refusal leaves the still-valid pending entry and deadline untouched, shared by coalesced approvals; a retry does not re-arm', async () => {
    const { arbiter, pending, armed, cleared } = await reviewArbiter();
    const guarded = scripted(() => refused('participants-behind'));
    const first = arbiter.decide('p-advance', 'approve', guarded.commit);
    const second = arbiter.decide('p-advance', 'approve', guarded.commit);
    guarded.open();
    for (const attempt of [first, second]) {
      const error: unknown = await attempt.catch((caught: unknown) => caught);
      expect(isCampaignProgressionLateRefusal(error)).toBe(true);
      expect(error).toEqual(
        expect.objectContaining({ reason: 'participants-behind' }),
      );
    }
    expect(arbiter.getPendingProposals()).toEqual([pending]);
    expect(armed).toHaveLength(1);
    expect(cleared).toEqual([]);
    const retry = scripted(committed);
    const retried = arbiter.decide('p-advance', 'approve', retry.commit);
    retry.open();
    expect(await retried).toEqual(
      expect.objectContaining({ status: 'committed' }),
    );
    expect(armed).toHaveLength(1);
  });

  it('a timeout during preparation invalidates the reservation before any write', async () => {
    const { arbiter, armed, resolved } = await reviewArbiter();
    const consume = jest.fn();
    const guarded = scripted(() => {
      consume();
      return committed();
    });
    const decided = arbiter.decide('p-advance', 'approve', guarded.commit);
    await guarded.reached;
    armed[0].handler();
    expect(resolved).toEqual([
      expect.objectContaining({ status: 'vetoed', proposalId: 'p-advance' }),
    ]);
    guarded.open();
    expect(await decided).toBeNull();
    expect(consume).not.toHaveBeenCalled();
    expect(arbiter.getPendingProposals()).toEqual([]);
  });

  it('a veto during preparation wins; the approval then commits nothing', async () => {
    const { arbiter } = await reviewArbiter();
    const consume = jest.fn();
    const guarded = scripted(() => {
      consume();
      return committed();
    });
    const decided = arbiter.decide('p-advance', 'approve', guarded.commit);
    await guarded.reached;
    expect(await arbiter.decide('p-advance', 'veto')).toEqual(
      expect.objectContaining({ status: 'vetoed' }),
    );
    guarded.open();
    expect(await decided).toBeNull();
    expect(consume).not.toHaveBeenCalled();
  });

  it('close during preparation means the approval can never commit', async () => {
    const { arbiter } = await reviewArbiter();
    const consume = jest.fn();
    const guarded = scripted(() => {
      consume();
      return committed();
    });
    const decided = arbiter.decide('p-advance', 'approve', guarded.commit);
    await guarded.reached;
    arbiter.close();
    guarded.open();
    expect(await decided).toBeNull();
    expect(consume).not.toHaveBeenCalled();
  });

  it('an uncertain commit consumes the proposal and rethrows; it can never authorize a fresh attempt', async () => {
    const { arbiter } = await reviewArbiter();
    const lost = new Error('append threw');
    const guarded = scripted(() => ({
      kind: 'commit-uncertain',
      commandId: 'intent-p-advance',
      error: lost,
    }));
    const decided = arbiter.decide('p-advance', 'approve', guarded.commit);
    guarded.open();
    await expect(decided).rejects.toBe(lost);
    expect(arbiter.getPendingProposals()).toEqual([]);
    expect(
      await arbiter.decide('p-advance', 'approve', guarded.commit),
    ).toBeNull();
    expect(guarded.commit).toHaveBeenCalledTimes(1);
  });

  it('guards only AdvanceDay: auto-approve refusal is the late refusal, SpendFunds and unknown ids keep the legacy paths', async () => {
    const { arbiter } = await makeArbiter(
      'auto-approve',
      stateWith({ balance: 600_000 }),
    );
    const guarded = scripted(() => refused('fresh-request'));
    guarded.open();
    const error: unknown = await arbiter
      .submitProposal(advanceProposal('p-auto'), guarded.commit)
      .catch((caught: unknown) => caught);
    expect(isCampaignProgressionLateRefusal(error)).toBe(true);
    expect(
      await arbiter.submitProposal(
        spendProposal(10, 'p-spend'),
        guarded.commit,
      ),
    ).toEqual(expect.objectContaining({ status: 'committed' }));
    expect(guarded.commit).toHaveBeenCalledTimes(1);
    expect(
      await arbiter.decide('unknown', 'approve', guarded.commit),
    ).toBeNull();
    // A malformed proposal is still mechanically rejected before any guard.
    expect(
      await arbiter.submitProposal({ proposalId: 'bad' }, guarded.commit),
    ).toEqual(expect.objectContaining({ status: 'mechanically-rejected' }));
    expect(guarded.commit).toHaveBeenCalledTimes(1);
  });

  it('recognises the late refusal by its whole structure, not its class or name', () => {
    expect(
      isCampaignProgressionLateRefusal(
        campaignProgressionLateRefusal('fresh-request'),
      ),
    ).toBe(true);
    expect(
      isCampaignProgressionLateRefusal({
        code: 'campaign-progression-late-refusal',
        reason: 'fresh-request',
      }),
    ).toBe(true);
    for (const spoof of [
      Object.assign(new Error('campaign-progression-late-refusal'), {
        name: 'campaign-progression-late-refusal',
      }),
      { code: 'campaign-progression-late-refusal', reason: 'cut 12 digest ab' },
      { code: 'campaign-progression-late-refusal', reason: 7 },
      {
        code: 'campaign-progression-late-refusal',
        reason: 'fresh-request',
        cut: 3,
      },
      { code: 'other', reason: 'fresh-request' },
      null,
      'campaign-progression-late-refusal',
    ]) {
      expect(isCampaignProgressionLateRefusal(spoof)).toBe(false);
    }
  });
});
