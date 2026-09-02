/**
 * Campaign and GM lifecycle derivation (umbrella 19.1 / 19.2).
 *
 * The rows that matter most here are the GUARD rows at the bottom.
 * `rewound` and `rebuilding` are postures the product cannot reach yet -
 * they belong to `add-authoritative-history-branches` - and a reserved
 * posture is only honest if nothing live can wander into it. The
 * tactical half of this task learned that the hard way: its first guard
 * was a single sample, and a mutant that routed a live signal into the
 * reserved branch survived it. So the guard here is a SWEEP over every
 * wire error code crossed with every sync state and every fact
 * combination, plus a row proving the reserved postures are reachable
 * when the branch work does inject its typed signal - a guard that
 * nothing can satisfy is just as useless as one everything can.
 */

import type {
  CampaignLifecycleRefusalCode,
  ICampaignLifecycleFacts,
} from '@/lib/campaign/lifecycle/campaignLifecycleState';
import type { CampaignSyncUxState } from '@/lib/campaign/replica/campaignSyncUxState';

import {
  campaignRefusalFromServerErrorCode,
  deriveGmLifecyclePosture,
  toCampaignLifecyclePosture,
} from '@/lib/campaign/lifecycle/campaignLifecycleState';
import { deriveCampaignSyncUxPosture } from '@/lib/campaign/replica/campaignSyncUxState';

/** Builds each shipped sync posture from its real inputs, not a literal. */
const SYNC_INPUTS: Readonly<
  Record<CampaignSyncUxState, Parameters<typeof deriveCampaignSyncUxPosture>[0]>
> = {
  blocked: {
    connection: 'connected',
    refusedReason: 'revoked',
    awaitingRebaseline: false,
    deliveredSequence: 3,
    appliedSequence: 3,
    joinCompleted: true,
  },
  resyncing: {
    connection: 'connected',
    refusedReason: null,
    awaitingRebaseline: true,
    deliveredSequence: 3,
    appliedSequence: 3,
    joinCompleted: true,
  },
  retrying: {
    connection: 'disconnected',
    refusedReason: null,
    awaitingRebaseline: false,
    deliveredSequence: 3,
    appliedSequence: 3,
    joinCompleted: true,
  },
  'catching-up': {
    connection: 'connecting',
    refusedReason: null,
    awaitingRebaseline: false,
    deliveredSequence: 3,
    appliedSequence: 3,
    joinCompleted: false,
  },
  behind: {
    connection: 'connected',
    refusedReason: null,
    awaitingRebaseline: false,
    deliveredSequence: 7,
    appliedSequence: 3,
    joinCompleted: true,
  },
  live: {
    connection: 'connected',
    refusedReason: null,
    awaitingRebaseline: false,
    deliveredSequence: 3,
    appliedSequence: 3,
    joinCompleted: true,
  },
};

const SYNC_STATES = Object.keys(SYNC_INPUTS) as readonly CampaignSyncUxState[];

function sync(state: CampaignSyncUxState) {
  return deriveCampaignSyncUxPosture(SYNC_INPUTS[state]);
}

function facts(
  overrides: Partial<ICampaignLifecycleFacts> = {},
): ICampaignLifecycleFacts {
  return {
    proposalAwaitingGm: false,
    lastProposalCommitted: false,
    refusal: null,
    ...overrides,
  };
}

/**
 * Every code the campaign wire can carry, plus the two codes other
 * subsystems use today. Both groups go through the same door.
 */
const LIVE_WIRE_CODES = [
  'BAD_ENVELOPE',
  'PROTOCOL_VIOLATION',
  'INVALID_INTENT',
  'UNKNOWN_INTENT',
  'UNKNOWN_MATCH',
  'AUTH_REJECTED',
  'STORE_FAILURE',
  'INTERNAL_ERROR',
  'MATCH_PAUSED',
  'RATE_LIMITED',
  'DUPLICATE_INTENT',
  'CAMPAIGN_NOT_CONVERGED',
  'STALE_BRANCH',
  'STALE_OWNERSHIP',
  'PROJECTION_REWOUND',
  'PROJECTION_REBUILDING',
] as const;

const RESERVED_STATES = ['rewound', 'rebuilding'] as const;

const LIVE_REFUSALS: readonly CampaignLifecycleRefusalCode[] = [
  'CAMPAIGN_NOT_CONVERGED',
  'STALE_BRANCH',
  'PROJECTION_REWOUND',
  'PROJECTION_REBUILDING',
];

describe('guest lifecycle derivation', () => {
  it('renames each shipped sync posture into the shared vocabulary', () => {
    const named = SYNC_STATES.map(
      (state) =>
        toCampaignLifecyclePosture(sync(state), facts()).lifecycleState,
    );

    expect(named).toEqual([
      'blocked',
      'syncing',
      'reconnecting',
      'syncing',
      'behind',
      'live',
    ]);
  });

  it('keeps the shipped sync name and gate untouched underneath', () => {
    // The e2e spec and the shipped component tests read `state` and
    // `commandsEnabled`. Renaming on top must not move either.
    for (const state of SYNC_STATES) {
      const posture = toCampaignLifecyclePosture(sync(state), facts());
      expect(posture.state).toBe(state);
      expect(posture.commandsEnabled).toBe(state === 'live');
    }
  });

  it('reports a proposal awaiting the GM as pending', () => {
    const posture = toCampaignLifecyclePosture(
      sync('live'),
      facts({ proposalAwaitingGm: true }),
    );

    expect(posture.lifecycleState).toBe('pending');
    // Other actions are still legitimate - the per-action pending flag
    // is what withholds the one already in flight. Blanket-disabling
    // here would be a regression on shipped behaviour.
    expect(posture.commandsEnabled).toBe(true);
  });

  it('reports a decided proposal as finalized', () => {
    expect(
      toCampaignLifecyclePosture(
        sync('live'),
        facts({ lastProposalCommitted: true }),
      ).lifecycleState,
    ).toBe('finalized');
  });

  it('never names a decision posture on a view that is not converged', () => {
    // "Awaiting the GM" while the replica is mid-backfill would name the
    // wrong reason for the wait.
    for (const state of SYNC_STATES.filter((row) => row !== 'live')) {
      expect(
        toCampaignLifecyclePosture(
          sync(state),
          facts({ proposalAwaitingGm: true, lastProposalCommitted: true }),
        ).lifecycleState,
      ).not.toBe('pending');
    }
  });

  it('withholds the controls while a refusal stands', () => {
    const posture = toCampaignLifecyclePosture(
      sync('live'),
      facts({ refusal: 'CAMPAIGN_NOT_CONVERGED' }),
    );

    expect(posture.lifecycleState).toBe('blocked');
    expect(posture.commandsEnabled).toBe(false);
  });

  it('announces nothing with a digit in it', () => {
    // A spoken "twelve events behind" rebuilds the same inference
    // channel the scoped-projection proofs closed for the printed one.
    for (const state of SYNC_STATES) {
      for (const fact of [
        facts(),
        facts({ proposalAwaitingGm: true }),
        facts({ lastProposalCommitted: true }),
        facts({ refusal: 'CAMPAIGN_NOT_CONVERGED' }),
      ]) {
        expect(
          toCampaignLifecyclePosture(sync(state), fact).message,
        ).not.toMatch(/\d/);
      }
    }
  });
});

describe('GM lifecycle derivation', () => {
  it('is live and unrestricted with an empty queue', () => {
    const posture = deriveGmLifecyclePosture({
      refusal: null,
      pendingProposalCount: 0,
    });

    expect(posture.state).toBe('live');
    expect(posture.progressionEnabled).toBe(true);
    expect(posture.recovery).toBeNull();
  });

  it('is pending while proposals await review, without restricting anything', () => {
    const posture = deriveGmLifecyclePosture({
      refusal: null,
      pendingProposalCount: 2,
    });

    expect(posture.state).toBe('pending');
    // A queue is not a refusal. Gating here would stop the host from
    // clearing the very queue that produced the posture.
    expect(posture.progressionEnabled).toBe(true);
  });

  it('blocks progression and names a recovery when the campaign has not converged', () => {
    const posture = deriveGmLifecyclePosture({
      refusal: 'CAMPAIGN_NOT_CONVERGED',
      pendingProposalCount: 1,
    });

    expect(posture.state).toBe('blocked');
    expect(posture.progressionEnabled).toBe(false);
    expect(posture.recovery?.code).toBe('CAMPAIGN_NOT_CONVERGED');
  });

  it('announces nothing with a digit in it', () => {
    for (const refusal of [null, ...LIVE_REFUSALS]) {
      expect(
        deriveGmLifecyclePosture({ refusal, pendingProposalCount: 4 }).message,
      ).not.toMatch(/\d/);
    }
  });
});

describe('reserved postures are unreachable from a live signal', () => {
  it('admits exactly one wire code through the refusal door', () => {
    const admitted = LIVE_WIRE_CODES.filter(
      (code) => campaignRefusalFromServerErrorCode(code) !== null,
    );

    expect(admitted).toEqual(['CAMPAIGN_NOT_CONVERGED']);
  });

  it('reaches no reserved posture from ANY live combination', () => {
    // The sweep, not a sample. Every wire code the client can actually
    // receive, crossed with every sync state and every fact combination.
    for (const code of LIVE_WIRE_CODES) {
      const refusal = campaignRefusalFromServerErrorCode(code);
      for (const state of SYNC_STATES) {
        for (const proposalAwaitingGm of [false, true]) {
          for (const lastProposalCommitted of [false, true]) {
            const guest = toCampaignLifecyclePosture(
              sync(state),
              facts({
                proposalAwaitingGm,
                lastProposalCommitted,
                refusal,
              }),
            );
            expect(RESERVED_STATES).not.toContain(guest.lifecycleState);
          }
        }
      }
      for (const pendingProposalCount of [0, 1, 5]) {
        const host = deriveGmLifecyclePosture({
          refusal,
          pendingProposalCount,
        });
        expect(RESERVED_STATES).not.toContain(host.state);
      }
    }
  });

  it('reaches them the moment the branch work injects its typed signal', () => {
    // A guard nothing can satisfy is as useless as one everything can.
    // These are the two calls `add-authoritative-history-branches` makes
    // to light the postures without touching a banner or a locator.
    expect(
      deriveGmLifecyclePosture({
        refusal: 'PROJECTION_REWOUND',
        pendingProposalCount: 0,
      }).state,
    ).toBe('rewound');
    expect(
      toCampaignLifecyclePosture(
        sync('live'),
        facts({ refusal: 'PROJECTION_REBUILDING' }),
      ).lifecycleState,
    ).toBe('rebuilding');
  });
});
