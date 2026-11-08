import type {
  ICampaignSyncTransport,
  CampaignSyncFrameHandler,
} from '@/lib/campaign/coop/campaignSyncTransport';
import type {
  IGuestProposal,
  GuestProposalResult,
} from '@/types/campaign/CoopCampaign';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import {
  registerCampaignSyncTransport,
  _resetCampaignSyncTransportsForTest,
} from '@/lib/campaign/coop/campaignSyncTransport';

import { submitGuestProposalOverTransport } from '../campaignCoopSurfaceHelpers';

function fixture() {
  const frames = new Set<CampaignSyncFrameHandler>();
  const errors = new Set<(error: unknown) => void>();
  const closes = new Set<() => void>();
  const transport: ICampaignSyncTransport = {
    matchId: 'match',
    playerId: 'guest',
    role: 'guest',
    sendProposal: jest.fn(),
    sendDecision: jest.fn(),
    sendHostIntent: jest.fn(),
    sendParticipation: jest.fn(),
    lastSeq: () => -1,
    onFrame: (handler) => {
      frames.add(handler);
      return () => {
        frames.delete(handler);
      };
    },
    onError: (handler) => {
      errors.add(handler);
      return () => {
        errors.delete(handler);
      };
    },
    onClose: (handler) => {
      closes.add(handler);
      return () => {
        closes.delete(handler);
      };
    },
    close: () => {
      [...closes].forEach((handler) => handler());
    },
  };
  const proposal: IGuestProposal = {
    proposalId: 'proposal',
    campaignId: 'campaign',
    proposingPlayerId: 'guest',
    ts: '2026-11-08T00:00:00.000Z',
    intent: {
      kind: 'SpendFunds',
      intentId: 'intent',
      campaignId: 'campaign',
      payload: { amount: 50, reason: 'Ammo' },
    },
  };
  const decision = (result: GuestProposalResult): IServerMessage => ({
    kind: 'CampaignDecision',
    matchId: 'match',
    ts: proposal.ts,
    proposalId: result.proposalId,
    result,
  });
  return { transport, proposal, frames, errors, closes, decision };
}

describe('guest proposal transport waiter ownership', () => {
  afterEach(() => {
    _resetCampaignSyncTransportsForTest();
  });

  it('does not send after a late close subscription immediately reports a closed connection', async () => {
    const { transport, proposal, frames, errors } = fixture();
    transport.onClose = (handler) => {
      handler();
      return () => undefined;
    };
    await expect(
      submitGuestProposalOverTransport(transport, proposal),
    ).resolves.toMatchObject({ reason: 'session-closed' });
    expect(transport.sendProposal).not.toHaveBeenCalled();
    expect([frames.size, errors.size]).toEqual([0, 0]);
  });

  it('registers before send and ignores pending or unrelated decisions', async () => {
    const { transport, proposal, frames, errors, closes, decision } = fixture();
    transport.sendProposal = () => {
      [...frames].forEach((handler) => {
        handler(decision({ status: 'pending', proposalId: 'proposal' }));
        handler(
          decision({
            status: 'mechanically-rejected',
            code: 'INVALID_CAMPAIGN_INTENT',
            reason: 'session-closed',
            proposalId: 'unrelated',
          }),
        );
        handler(
          decision({
            status: 'vetoed',
            proposalId: 'proposal',
            error: {
              ok: false,
              code: 'PROPOSAL_VETOED',
              proposalId: 'proposal',
            },
          }),
        );
      });
    };
    await expect(
      submitGuestProposalOverTransport(transport, proposal),
    ).resolves.toMatchObject({ status: 'vetoed' });
    expect([frames.size, errors.size, closes.size]).toEqual([0, 0, 0]);
  });

  it('settles the old waiter on replacement without closing a foreign socket or replaying a proposal', async () => {
    const old = fixture();
    registerCampaignSyncTransport(old.transport);
    let closed: GuestProposalResult | undefined;
    void submitGuestProposalOverTransport(old.transport, old.proposal).then(
      (r) => {
        closed = r;
      },
    );
    const fresh = fixture();
    registerCampaignSyncTransport(fresh.transport);
    await Promise.resolve();
    expect(closed).toMatchObject({ reason: 'session-closed' });
    expect(old.frames.size).toBe(0);
    expect(fresh.transport.sendProposal).not.toHaveBeenCalled();
    const next = submitGuestProposalOverTransport(
      fresh.transport,
      fresh.proposal,
    );
    [...fresh.frames].forEach((handler) =>
      handler(
        fresh.decision({
          status: 'vetoed',
          proposalId: 'proposal',
          error: { ok: false, code: 'PROPOSAL_VETOED', proposalId: 'proposal' },
        }),
      ),
    );
    await expect(next).resolves.toMatchObject({ status: 'vetoed' });
  });
  it('rejects a reused id without sending or resolving the original twice', async () => {
    const { transport, proposal, frames, decision } = fixture();
    let original: GuestProposalResult | undefined;
    void submitGuestProposalOverTransport(transport, proposal).then((r) => {
      original = r;
    });
    await expect(
      submitGuestProposalOverTransport(transport, proposal),
    ).resolves.toMatchObject({
      status: 'mechanically-rejected',
      reason: 'malformed-intent',
    });
    expect(transport.sendProposal).toHaveBeenCalledTimes(1);
    expect(original).toBeUndefined();
    [...frames].forEach((handler) =>
      handler(
        decision({
          status: 'vetoed',
          proposalId: 'proposal',
          error: { ok: false, code: 'PROPOSAL_VETOED', proposalId: 'proposal' },
        }),
      ),
    );
    await Promise.resolve();
    expect(original?.status).toBe('vetoed');
    expect(frames.size).toBe(0);
    await expect(
      submitGuestProposalOverTransport(transport, proposal),
    ).resolves.toMatchObject({ reason: 'malformed-intent' });
  });

  it('settles every waiter and removes listeners on connection close', async () => {
    const { transport, proposal, frames, errors, closes } = fixture();
    const results: GuestProposalResult[] = [];
    void submitGuestProposalOverTransport(transport, proposal).then((r) =>
      results.push(r),
    );
    void submitGuestProposalOverTransport(transport, {
      ...proposal,
      proposalId: 'second',
    }).then((r) => results.push(r));
    transport.close();
    await Promise.resolve();
    expect(results).toHaveLength(2);
    expect(
      results.every(
        (r) =>
          r.status === 'mechanically-rejected' && r.reason === 'session-closed',
      ),
    ).toBe(true);
    expect([frames.size, errors.size, closes.size]).toEqual([0, 0, 0]);
  });

  it('settles an error as a terminal result so the guest hook can leave pending', async () => {
    const { transport, proposal, errors, frames } = fixture();
    const pending = submitGuestProposalOverTransport(transport, proposal);
    [...errors].forEach((handler) => handler(new Error('offline')));
    await expect(pending).resolves.toMatchObject({ reason: 'session-closed' });
    expect(frames.size).toBe(0);
  });

  it('cleans up if sending throws synchronously', async () => {
    const { transport, proposal, errors, frames, closes } = fixture();
    transport.sendProposal = () => {
      throw new Error('send failed');
    };
    await expect(
      submitGuestProposalOverTransport(transport, proposal),
    ).resolves.toMatchObject({ reason: 'session-closed' });
    expect([frames.size, errors.size, closes.size]).toEqual([0, 0, 0]);
  });
});
