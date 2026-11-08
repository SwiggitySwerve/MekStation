import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';
import type { IGuestProposal } from '@/types/campaign/CoopCampaign';
import type { IForce } from '@/types/campaign/Force';
import type { IPersonnelMarketOffer } from '@/types/campaign/markets/marketTypes';
import type { IContract } from '@/types/campaign/Mission';

import { createCampaign } from '@/types/campaign/Campaign';
import { createHostCoopSession } from '@/types/campaign/CoopSession';
import { ForceRole, FormationLevel } from '@/types/campaign/enums';

import {
  _resetCoopRuntimeSessions,
  decideGuestProposal,
  closeCoopRuntimeSession,
  getCoopPendingProposals,
  openCoopRuntimeSession,
  publishCoopParticipation,
  getCoopParticipationRecords,
  getCoopRuntimeSessionByMatch,
  submitGuestProposalToHost,
} from '../coopRuntimeSession';

function makeForce(id: string, unitIds: string[]): IForce {
  return {
    id,
    name: `Force ${id}`,
    subForceIds: [],
    unitIds,
    forceType: ForceRole.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '2026-06-21T00:00:00.000Z',
    updatedAt: '2026-06-21T00:00:00.000Z',
  };
}

function makeHostCampaign(matchId = 'match-runtime-1') {
  const campaign = {
    ...createCampaign('Runtime Host', 'mercenary', {
      startingFunds: 1_000_000,
    }),
    id: 'campaign-runtime',
    coopSession: createHostCoopSession('ABC234', matchId),
  };
  const force = makeForce(campaign.rootForceId, ['u-host-1']);
  return { ...campaign, forces: new Map([[force.id, force]]) };
}

function spendProposal(
  amount: number,
  proposalId = 'proposal-spend',
): IGuestProposal {
  return {
    proposalId,
    campaignId: 'campaign-runtime',
    proposingPlayerId: 'guest',
    ts: '2026-06-21T00:00:00.000Z',
    intent: {
      kind: 'SpendFunds',
      campaignId: 'campaign-runtime',
      intentId: `${proposalId}-intent`,
      payload: { amount, reason: 'Ammo' },
    },
  };
}

describe('coopRuntimeSession', () => {
  beforeEach(() => {
    _resetCoopRuntimeSessions();
  });

  afterEach(() => {
    _resetCoopRuntimeSessions();
  });

  it('settles a caller when the arbiter closes during an awaited approval', async () => {
    const runtime = await openCoopRuntimeSession(makeHostCampaign(), {
      matchId: 'match-runtime-1',
    });
    if (!runtime) throw new Error('missing runtime');
    let result: unknown;
    void submitGuestProposalToHost(
      'match-runtime-1',
      spendProposal(50_000),
    ).then((r) => {
      result = r;
    });
    await Promise.resolve();
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    const apply = runtime.host.applyHostIntent;
    jest
      .spyOn(runtime.host, 'applyHostIntent')
      .mockImplementation(async (...args) => {
        await waiting;
        return apply(...args);
      });
    const decision = decideGuestProposal(
      'match-runtime-1',
      'proposal-spend',
      'approve',
    );
    try {
      runtime.arbiter.close();
      await Promise.resolve();
      await Promise.resolve();
      expect(result).toMatchObject({ reason: 'session-closed' });
    } finally {
      release();
      await decision;
    }
  });

  it.each(['runtime', 'arbiter', 'reset'] as const)(
    'settles all waiters on %s close, including a submit still awaiting admission',
    async (closeKind) => {
      const runtime = await openCoopRuntimeSession(makeHostCampaign(), {
        matchId: 'match-runtime-1',
      });
      const results: unknown[] = [];
      void submitGuestProposalToHost(
        'match-runtime-1',
        spendProposal(50_000, 'one'),
      ).then((r) => results.push(r));
      void submitGuestProposalToHost(
        'match-runtime-1',
        spendProposal(50_000, 'two'),
      ).then((r) => results.push(r));
      if (closeKind === 'runtime') closeCoopRuntimeSession('match-runtime-1');
      else if (closeKind === 'arbiter') runtime?.arbiter.close();
      else _resetCoopRuntimeSessions();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      expect(results).toHaveLength(2);
      expect(results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            proposalId: 'one',
            reason: 'session-closed',
          }),
          expect.objectContaining({
            proposalId: 'two',
            reason: 'session-closed',
          }),
        ]),
      );
    },
  );

  it('rejects a duplicate without stealing the original waiter', async () => {
    await openCoopRuntimeSession(makeHostCampaign(), {
      matchId: 'match-runtime-1',
    });
    let original: unknown;
    void submitGuestProposalToHost(
      'match-runtime-1',
      spendProposal(50_000),
    ).then((r) => {
      original = r;
    });
    await expect(
      submitGuestProposalToHost('match-runtime-1', spendProposal(90_000)),
    ).resolves.toMatchObject({ reason: 'malformed-intent' });
    await decideGuestProposal('match-runtime-1', 'proposal-spend', 'approve');
    await Promise.resolve();
    await Promise.resolve();
    expect(original).toMatchObject({ status: 'committed' });
  });

  it('resolves a host-review guest proposal when the host decides', async () => {
    await openCoopRuntimeSession(makeHostCampaign(), {
      matchId: 'match-runtime-1',
      roomCode: 'ABC234',
      hostPlayerId: 'host',
      arbitrationMode: 'host-review',
    });

    const resolution = submitGuestProposalToHost(
      'match-runtime-1',
      spendProposal(50_000),
    );
    await Promise.resolve();

    expect(getCoopPendingProposals('match-runtime-1')).toHaveLength(1);
    const decision = await decideGuestProposal(
      'match-runtime-1',
      'proposal-spend',
      'approve',
    );
    expect(decision?.status).toBe('committed');
    await expect(resolution).resolves.toMatchObject({
      status: 'committed',
      proposalId: 'proposal-spend',
    });
    expect(getCoopPendingProposals('match-runtime-1')).toHaveLength(0);
  });

  it('resolves a host-review guest proposal with a typed veto', async () => {
    await openCoopRuntimeSession(makeHostCampaign(), {
      matchId: 'match-runtime-1',
      roomCode: 'ABC234',
      hostPlayerId: 'host',
      arbitrationMode: 'host-review',
    });

    const resolution = submitGuestProposalToHost(
      'match-runtime-1',
      spendProposal(50_000),
    );
    await Promise.resolve();

    const decision = await decideGuestProposal(
      'match-runtime-1',
      'proposal-spend',
      'veto',
    );
    expect(decision?.status).toBe('vetoed');
    await expect(resolution).resolves.toMatchObject({
      status: 'vetoed',
      proposalId: 'proposal-spend',
    });
  });

  it('returns a mechanical rejection when no host runtime is registered', async () => {
    await expect(
      submitGuestProposalToHost('missing-match', spendProposal(50_000)),
    ).resolves.toMatchObject({
      status: 'mechanically-rejected',
      reason: 'session-closed',
    });
  });

  it('stores per-mission participation records with force contributions', () => {
    const force = makeForce('force-guest', ['u-guest-1']);
    publishCoopParticipation({
      matchId: 'match-runtime-1',
      missionId: 'mission-alpha',
      playerId: 'guest',
      role: 'guest',
      choice: 'deploy',
      force,
    });

    expect(
      getCoopParticipationRecords('match-runtime-1', 'mission-alpha'),
    ).toEqual([
      expect.objectContaining({
        playerId: 'guest',
        choice: 'deploy',
        force,
      }),
    ]);
  });
});

// K14b PR3: the in-browser co-op host is the host's own campaign, so its
// market is the authority a hire or an acceptance is judged against - read
// live, so an offer the market gains after the session opened counts.
describe('coopRuntimeSession - host market binding', () => {
  beforeEach(() => {
    _resetCoopRuntimeSessions();
  });

  function recruit(id: string, hireCost: number): IPersonnelMarketOffer {
    return {
      id,
      name: `Recruit ${id}`,
      hireCost,
      expirationDate: '3999-12-31',
    } as IPersonnelMarketOffer;
  }

  function contract(id: string): IContract {
    return {
      id,
      name: `Stored ${id}`,
      employerId: 'house-davion',
    } as IContract;
  }

  async function openWithMarket(read: () => ICampaign | null) {
    await openCoopRuntimeSession(makeHostCampaign(), {
      matchId: 'match-runtime-1',
      roomCode: 'ABC234',
      hostPlayerId: 'host',
      arbitrationMode: 'auto-approve',
      readCampaign: read,
    });
    const runtime = getCoopRuntimeSessionByMatch('match-runtime-1');
    if (runtime === null) throw new Error('no runtime');
    return runtime.host;
  }

  it('hires and accepts from the live host campaign market', async () => {
    let live: ICampaignWithCommand = {
      ...makeHostCampaign(),
      personnelMarket: [recruit('offer-a', 40_000)],
      contractMarket: {
        offers: [contract('contract-a'), contract('contract-x')],
        declinedOfferIds: ['contract-x'],
      },
    };
    const host = await openWithMarket(() => live);
    // A refresh after the session opened.
    live = {
      ...live,
      personnelMarket: [
        ...(live.personnelMarket ?? []),
        recruit('offer-b', 60_000),
      ],
    };

    const hired = await host.applyHostIntent({
      kind: 'HireOffer',
      campaignId: 'campaign-runtime',
      intentId: 'intent-hire-b',
      payload: { offerId: 'offer-b' },
    });
    const accepted = await host.applyHostIntent({
      kind: 'AcceptContract',
      campaignId: 'campaign-runtime',
      intentId: 'intent-accept-a',
      payload: {
        contract: {
          contractId: 'contract-a',
          name: 'CALLER SUPPLIED NAME',
          employerFactionId: 'caller-supplied-employer',
        },
      },
    });
    const declined = await host.applyHostIntent({
      kind: 'AcceptContract',
      campaignId: 'campaign-runtime',
      intentId: 'intent-accept-x',
      payload: {
        contract: {
          contractId: 'contract-x',
          name: 'x',
          employerFactionId: 'house-davion',
        },
      },
    });

    expect(hired).toMatchObject({ ok: true });
    if (hired.ok) {
      expect(hired.events[1].payload).toStrictEqual({
        pilot: { pilotId: 'hired-offer-b', name: 'Recruit offer-b' },
        cost: 60_000,
      });
    }
    expect(accepted).toMatchObject({ ok: true });
    if (accepted.ok) {
      expect(accepted.events[0].payload).toStrictEqual({
        contract: {
          contractId: 'contract-a',
          name: 'Stored contract-a',
          employerFactionId: 'house-davion',
        },
      });
    }
    expect(declined).toMatchObject({ ok: false, reason: 'offer-declined' });
  });

  it('refuses a hire when the live campaign is another campaign or gone', async () => {
    const host = await openWithMarket(() => null);

    const result = await host.applyHostIntent({
      kind: 'HireOffer',
      campaignId: 'campaign-runtime',
      intentId: 'intent-hire-gone',
      payload: { offerId: 'offer-a' },
    });

    expect(result).toMatchObject({
      ok: false,
      reason: 'offer-source-unavailable',
    });
  });
});
