import type { IGuestProposal } from '@/types/campaign/CoopCampaign';
import type { IForce } from '@/types/campaign/Force';

import { createCampaign } from '@/types/campaign/Campaign';
import { createHostCoopSession } from '@/types/campaign/CoopSession';
import { ForceRole, FormationLevel } from '@/types/campaign/enums';

import {
  _resetCoopRuntimeSessions,
  decideGuestProposal,
  getCoopPendingProposals,
  openCoopRuntimeSession,
  publishCoopParticipation,
  getCoopParticipationRecords,
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
