/**
 * Campaign and GM lifecycle postures on screen (umbrella 19.1 / 19.2).
 *
 * The tactical surface already carries a stable lifecycle posture with a
 * `data-state` locator in the umbrella's shared vocabulary. The campaign
 * and GM surfaces did not: the guest banner spoke a private sync
 * vocabulary and the GM review surface said nothing at all about whether
 * the server would accept the decision the host was about to make.
 *
 * These rows pin both halves, and pin the GATE precisely. The server
 * refuses `CAMPAIGN_NOT_CONVERGED` for exactly one thing - a progression
 * commit (`AdvanceDay`), including the host's approval of a guest's
 * `AdvanceDay` proposal. Disabling every control while a participant
 * lags would be a lie about what the server does; disabling nothing
 * would let the host press a button that is already refused. So the rows
 * assert both directions.
 */

import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';

import type { ICampaignSyncTransport } from '@/lib/campaign/coop/campaignSyncTransport';
import type { IGmLifecyclePosture } from '@/lib/campaign/lifecycle/campaignLifecycleState';
import type { IPendingProposal } from '@/lib/multiplayer/server/CampaignGmArbiter';

import {
  _resetCampaignSyncTransportsForTest,
  registerCampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import {
  _resetCoopRuntimeSessions,
  openCoopRuntimeSession,
} from '@/lib/campaign/coop/coopRuntimeSession';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
import { resetCampaignStore } from '@/stores/campaign/useCampaignStore';
import { createCampaign } from '@/types/campaign/Campaign';
import { createHostCoopSession } from '@/types/campaign/CoopSession';

import { CampaignCoopRouteSurfaceConnected } from '../CampaignCoopRouteSurfaceConnected';
import { CampaignSyncStateBanner } from '../CampaignSyncStateBanner';
import { HostGmReviewSurface } from '../HostGmReviewSurface';

// =============================================================================
// Fixtures
// =============================================================================

/** A pending proposal of an arbitrary kind, with the id under test. */
function pendingProposal(id: string, kind: string): IPendingProposal {
  return {
    proposal: {
      proposalId: id,
      campaignId: 'campaign-1',
      proposingPlayerId: 'guest-player',
      ts: '2026-09-01T10:00:00.000Z',
      intent: {
        kind,
        campaignId: 'campaign-1',
        intentId: `intent-${id}`,
        payload:
          kind === 'AdvanceDay' ? { days: 1 } : { amount: 1, reason: 'x' },
      },
    },
    balanceAtSubmit: 600_000,
    relevantStanding: null,
    effectSummary: `Proposal ${id}`,
  } as unknown as IPendingProposal;
}

/**
 * A GM posture literal, so these rows test the SURFACE, not a derivation.
 *
 * TYPED as `IGmLifecyclePosture` rather than cast through `as never`. The
 * cast is what let this helper silently fall behind the interface when
 * 19.2 seam 3 added `commandsEnabled`: every row here kept compiling
 * while handing the surface a posture the product cannot produce, and the
 * surface read the missing field as "no commands allowed". A literal
 * fixture is a fine way to test a component, but only if the compiler
 * still holds it to the shape the component is promised.
 */
function gmPosture(
  overrides: Partial<IGmLifecyclePosture> = {},
): IGmLifecyclePosture {
  return {
    state: 'live',
    message: 'Campaign lifecycle posture: live.',
    progressionEnabled: true,
    commandsEnabled: true,
    recovery: null,
    ...overrides,
  };
}

/** The refused-progression posture the host actually sees today. */
function refusedPosture(): IGmLifecyclePosture {
  return gmPosture({
    state: 'blocked',
    message: 'Campaign lifecycle posture: blocked.',
    progressionEnabled: false,
    // Progression only. The convergence refusal is checked against the
    // intent, so every other command stays enabled - which is exactly
    // what the anti-over-gating rows below assert.
    commandsEnabled: true,
    recovery: {
      code: 'CAMPAIGN_NOT_CONVERGED',
      label: 'Check again',
      description: 'Waiting for every participant to catch up.',
      actionable: true,
    },
  });
}

// =============================================================================
// The campaign banner's shared locator
// =============================================================================

const CAMPAIGN_STATES = [
  'pending',
  'finalized',
  'syncing',
  'reconnecting',
  'behind',
  'blocked',
  'rewound',
  'rebuilding',
  'live',
] as const;

describe('campaign lifecycle locator', () => {
  it.each(CAMPAIGN_STATES)(
    'exposes %s under the shared data-state locator',
    (state) => {
      // The umbrella asks for ONE state vocabulary across campaign,
      // combat, and GM. `data-sync-state` stays for the surfaces already
      // reading it; `data-state` is the shared name.
      render(
        <CampaignSyncStateBanner
          posture={
            {
              state: 'live',
              lifecycleState: state,
              message: `Campaign lifecycle posture: ${state}.`,
              commandsEnabled: state === 'live',
            } as never
          }
        />,
      );

      expect(screen.getByTestId('campaign-sync-state')).toHaveAttribute(
        'data-state',
        state,
      );
    },
  );
});

// =============================================================================
// The GM surface's posture and gate
// =============================================================================

describe('GM lifecycle posture', () => {
  it('renders the stable GM locator with its state', () => {
    render(
      <HostGmReviewSurface
        pending={[]}
        onDecide={() => {}}
        lifecycle={refusedPosture()}
      />,
    );

    expect(screen.getByTestId('gm-lifecycle-state')).toHaveAttribute(
      'data-state',
      'blocked',
    );
  });

  it('announces the posture through a polite live region, including blocked', () => {
    // A status that changes outside a live region is announced to
    // nobody. Polite rather than assertive: a lifecycle posture is never
    // more urgent than the sentence the host is in the middle of, and
    // the blocked posture also disables the control it refers to.
    render(
      <HostGmReviewSurface
        pending={[]}
        onDecide={() => {}}
        lifecycle={refusedPosture()}
      />,
    );

    const status = screen.getByTestId('gm-lifecycle-state');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).not.toHaveAttribute('aria-live', 'assertive');
  });

  it('withholds approval of a progression proposal while the server refuses it', () => {
    render(
      <HostGmReviewSurface
        pending={[pendingProposal('p-day', 'AdvanceDay')]}
        onDecide={() => {}}
        lifecycle={refusedPosture()}
      />,
    );

    const approve = screen.getByTestId('approve-p-day');
    expect(approve).toBeDisabled();
    // The reason rides the control, so a disabled button is not a
    // mystery the host has to correlate with a banner elsewhere.
    expect(approve).toHaveAttribute('data-lifecycle-blocked', 'true');
  });

  it('does not swallow the decisions the server still accepts', () => {
    // The refusal covers progression only. Disabling veto - or approval
    // of a non-progression proposal - would be a claim about the server
    // that is simply untrue, and would strand the host with a queue they
    // cannot clear.
    render(
      <HostGmReviewSurface
        pending={[
          pendingProposal('p-day', 'AdvanceDay'),
          pendingProposal('p-spend', 'SpendFunds'),
        ]}
        onDecide={() => {}}
        lifecycle={refusedPosture()}
      />,
    );

    expect(screen.getByTestId('veto-p-day')).toBeEnabled();
    expect(screen.getByTestId('approve-p-spend')).toBeEnabled();
    expect(screen.getByTestId('approve-p-spend')).not.toHaveAttribute(
      'data-lifecycle-blocked',
    );
  });

  it('offers the typed recovery action the refusal names', () => {
    const onClear = jest.fn();
    render(
      <HostGmReviewSurface
        pending={[]}
        onDecide={() => {}}
        lifecycle={refusedPosture()}
        onClearLifecycleRefusal={onClear}
      />,
    );

    const recovery = screen.getByTestId('gm-lifecycle-recovery');
    expect(recovery).toHaveAttribute(
      'data-recovery-code',
      'CAMPAIGN_NOT_CONVERGED',
    );
    recovery.click();
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('offers every decision while the campaign is converged', () => {
    render(
      <HostGmReviewSurface
        pending={[pendingProposal('p-day', 'AdvanceDay')]}
        onDecide={() => {}}
        lifecycle={gmPosture()}
      />,
    );

    expect(screen.getByTestId('approve-p-day')).toBeEnabled();
    expect(screen.queryByTestId('gm-lifecycle-recovery')).toBeNull();
  });
});

// =============================================================================
// The refusal's whole life, driven through the real frame stream
// =============================================================================

/**
 * The rows above pin what a posture RENDERS. These pin where the posture
 * comes from and, more importantly, when it goes away.
 *
 * There is no "you have converged" frame - the server only ever says no.
 * So the block is cleared optimistically on the next committed campaign
 * event, and the server re-refuses if the condition still holds. That
 * clear is a judgment call, and a judgment call with no row behind it is
 * just an opinion in a comment: with the clear dead, a host who
 * converged would sit behind a disabled Approve forever, and every other
 * test in this tree would still pass. Hence a row for the clear AND a
 * row for its inverse, so the clear cannot quietly widen into "any frame
 * at all dismisses a refusal the server meant".
 */
describe('campaign refusal lifecycle over the wire', () => {
  const MATCH_ID = 'match-refusal';
  const ROOM_CODE = 'ABC234';
  const CAMPAIGN_ID = 'campaign-refusal';

  /** Frame handlers the connected surface registered on the transport. */
  let frameHandlers: ((message: unknown) => void)[] = [];

  function emit(frame: unknown): void {
    act(() => {
      for (const handler of frameHandlers) handler(frame);
    });
  }

  function hostCampaign() {
    return {
      ...createCampaign('Refusal Host', 'mercenary', {
        startingFunds: 1_000_000,
      }),
      id: CAMPAIGN_ID,
      coopSession: createHostCoopSession(ROOM_CODE, MATCH_ID),
    };
  }

  /** A guest proposal frame carrying the one intent the server gates. */
  function advanceDayProposalFrame() {
    return {
      kind: 'CampaignProposal',
      matchId: MATCH_ID,
      ts: '3025-01-01T00:00:00.000Z',
      playerId: 'guest-player',
      proposal: {
        proposalId: 'p-day',
        campaignId: CAMPAIGN_ID,
        proposingPlayerId: 'guest-player',
        ts: '3025-01-01T00:00:00.000Z',
        intent: {
          kind: 'AdvanceDay',
          campaignId: CAMPAIGN_ID,
          intentId: 'intent-p-day',
          payload: { days: 1 },
        },
      },
    };
  }

  /** The refusal the campaign host server actually sends. */
  function notConvergedFrame() {
    return {
      kind: 'Error',
      matchId: MATCH_ID,
      ts: '3025-01-01T00:00:01.000Z',
      code: 'CAMPAIGN_NOT_CONVERGED',
      reason: 'participants-behind guest-player:2; requiredRevision 4',
    };
  }

  /** A committed progression event - proof the server took a write. */
  function dayAdvancedFrame() {
    return {
      kind: 'CampaignEvent',
      matchId: MATCH_ID,
      ts: '3025-01-01T00:00:02.000Z',
      event: {
        type: 'CampaignDayAdvanced',
        sequence: 1,
        campaignId: CAMPAIGN_ID,
        ts: '3025-01-01T00:00:02.000Z',
        authorPlayerId: 'host-player',
        scope: 'campaign',
        payload: { days: 1 },
      },
    };
  }

  beforeEach(async () => {
    frameHandlers = [];
    _resetCoopRuntimeSessions();
    _resetCampaignSyncTransportsForTest();
    useCampaignMirrorStore.getState().reset();
    resetCampaignStore();
    window.sessionStorage.clear();

    const transport: ICampaignSyncTransport = {
      matchId: MATCH_ID,
      playerId: 'host-player',
      role: 'host',
      sendProposal: jest.fn(),
      sendDecision: jest.fn(),
      sendHostIntent: jest.fn(),
      sendParticipation: jest.fn(),
      onFrame: (handler) => {
        frameHandlers.push(handler as (message: unknown) => void);
        return () => undefined;
      },
      onError: jest.fn(() => () => undefined),
      close: jest.fn(),
      lastSeq: jest.fn(() => -1),
    };
    registerCampaignSyncTransport(transport);

    await openCoopRuntimeSession(hostCampaign(), {
      matchId: MATCH_ID,
      roomCode: ROOM_CODE,
      arbitrationMode: 'host-review',
    });
  });

  afterEach(() => {
    cleanup();
    _resetCoopRuntimeSessions();
    _resetCampaignSyncTransportsForTest();
    useCampaignMirrorStore.getState().reset();
    resetCampaignStore();
    window.sessionStorage.clear();
  });

  /** Mounts the host dashboard and settles the runtime-session effect. */
  async function mountHostDashboard(): Promise<void> {
    render(
      <CampaignCoopRouteSurfaceConnected
        campaign={hostCampaign()}
        routeId="dashboard"
        dashboardMount
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
  }

  it('blocks progression when the server refuses it', async () => {
    await mountHostDashboard();
    emit(advanceDayProposalFrame());

    expect(screen.getByTestId('gm-lifecycle-state')).toHaveAttribute(
      'data-state',
      'pending',
    );
    expect(screen.getByTestId('approve-p-day')).toBeEnabled();

    emit(notConvergedFrame());

    expect(screen.getByTestId('gm-lifecycle-state')).toHaveAttribute(
      'data-state',
      'blocked',
    );
    expect(screen.getByTestId('approve-p-day')).toBeDisabled();
  });

  it('lifts the block once a campaign event proves the server took a write', async () => {
    // The row the optimistic clear exists for. Without it a host who
    // converged stays gated forever on a message that stopped being true.
    await mountHostDashboard();
    emit(advanceDayProposalFrame());
    emit(notConvergedFrame());
    expect(screen.getByTestId('approve-p-day')).toBeDisabled();

    emit(dayAdvancedFrame());

    expect(screen.getByTestId('gm-lifecycle-state')).not.toHaveAttribute(
      'data-state',
      'blocked',
    );
    expect(screen.getByTestId('approve-p-day')).toBeEnabled();
    expect(screen.queryByTestId('gm-lifecycle-recovery')).toBeNull();
  });

  it('does not let just any frame dismiss a refusal the server meant', async () => {
    // The inverse guard. A clear that fires on ANY frame would re-enable
    // a control the server is still refusing - which is worse than never
    // clearing, because the host would be told yes and then refused.
    await mountHostDashboard();
    emit(advanceDayProposalFrame());
    emit(notConvergedFrame());

    emit({
      kind: 'Heartbeat',
      matchId: MATCH_ID,
      ts: '3025-01-01T00:00:03.000Z',
    });
    emit(notConvergedFrame());

    expect(screen.getByTestId('gm-lifecycle-state')).toHaveAttribute(
      'data-state',
      'blocked',
    );
    expect(screen.getByTestId('approve-p-day')).toBeDisabled();
  });
});
