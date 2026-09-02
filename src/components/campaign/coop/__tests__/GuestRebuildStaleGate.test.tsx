/**
 * Gating the GUEST command surface during a rebuild and on a stale branch
 * (umbrella 19.2, the guest arm; the GM arm shipped in cut A).
 *
 * Seam 1 gated the guest on SYNC alone, and the reasoning it recorded was
 * that progression was the only thing the server refused and no guest
 * route raises an `AdvanceDay`. That reasoning stopped holding: the
 * command-admission gate answers `PROJECTION_REBUILDING` and the
 * staleness family BEFORE the intent is read, so those refusals apply to
 * every command a guest can raise. A guest mid-rebuild has a converged,
 * connected replica whose server will not take a thing from them - which
 * is exactly the case where a healthy "up to date" banner reads as
 * permission.
 *
 * The rows split the two things that can be wrong independently: whether
 * the surface WITHHOLDS the control, and whether it SAYS WHY. A disabled
 * control with no rendered reason is a dead button - the failure mode
 * finding #42 was filed for - and it satisfies every gate assertion on
 * its own.
 *
 * GM rows deliberately live in `GmRebuildStaleGate.test.tsx` and are not
 * repeated here. The one place this file renders the host surface is the
 * cross-surface row, which is a claim ABOUT the relationship between the
 * two and cannot be made from one side.
 */

import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';

import type { ICampaignSyncTransport } from '@/lib/campaign/coop/campaignSyncTransport';
import type {
  CampaignLifecycleRefusalCode,
  ICampaignCommandRefusal,
} from '@/lib/campaign/lifecycle/campaignLifecycleState';
import type { IPendingProposal } from '@/lib/multiplayer/server/CampaignGmArbiter';

import {
  _resetCampaignSyncTransportsForTest,
  registerCampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import { storeCoopCampaignToken } from '@/lib/campaign/coop/coopCampaignAuthTokenStore';
import {
  _resetCoopRuntimeSessions,
  openCoopRuntimeSession,
} from '@/lib/campaign/coop/coopRuntimeSession';
import {
  deriveGmLifecyclePosture,
  toCampaignLifecyclePosture,
} from '@/lib/campaign/lifecycle/campaignLifecycleState';
import { deriveCampaignSyncUxPosture } from '@/lib/campaign/replica/campaignSyncUxState';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
import { resetCampaignStore } from '@/stores/campaign/useCampaignStore';
import { createCampaign } from '@/types/campaign/Campaign';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { createGuestCoopSession } from '@/types/campaign/CoopSession';

import { CampaignCoopRouteSurfaceConnected } from '../CampaignCoopRouteSurfaceConnected';
import { GuestProposalSurface } from '../GuestProposalSurface';
import { HostGmReviewSurface } from '../HostGmReviewSurface';

// =============================================================================
// Fixtures
// =============================================================================

/** A converged, connected replica - so a refusal is the ONLY thing gating. */
function liveSync() {
  return deriveCampaignSyncUxPosture({
    connection: 'connected',
    refusedReason: null,
    awaitingRebaseline: false,
    deliveredSequence: 3,
    appliedSequence: 3,
    joinCompleted: true,
  });
}

/** The guest posture under one refusal, built through the real derivation. */
function guestUnder(standing: ICampaignCommandRefusal | null) {
  return toCampaignLifecyclePosture(liveSync(), {
    proposalAwaitingGm: false,
    lastProposalCommitted: false,
    refusal: standing,
  });
}

/** A refusal as received, with no server-named action unless one is given. */
function refusal(
  code: CampaignLifecycleRefusalCode,
  recoveryAction: string | null = null,
): ICampaignCommandRefusal {
  return { code, recoveryAction };
}

/** The stub proposal API - this surface is presentational over it. */
function guestApi() {
  return {
    proposals: [],
    isPending: () => false,
    submit: jest.fn(async () => undefined),
  } as never;
}

const GUEST_ACTIONS = [
  {
    kind: 'SpendFunds' as const,
    label: 'Propose: Spend Funds',
    buildIntent: () =>
      ({
        campaignId: 'campaign-1',
        intentId: 'intent-spend',
        kind: 'SpendFunds',
        payload: { amount: 1, reason: 'x' },
      }) as never,
  },
];

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
 * Asserts the anti-dead-button contract on one control: disabled, and
 * pointing at an element that EXISTS and actually says something. A
 * `data-` attribute is not a reason - nothing reads it to a human.
 */
function expectDisabledWithReason(control: HTMLElement): void {
  expect(control).toBeDisabled();
  const describedBy = control.getAttribute('aria-describedby');
  expect(describedBy).toBeTruthy();
  const reason = document.getElementById(describedBy as string);
  expect(reason).not.toBeNull();
  expect((reason as HTMLElement).textContent?.trim() ?? '').not.toBe('');
}

afterEach(() => {
  cleanup();
});

// =============================================================================
// The guest gate
// =============================================================================

describe('guest command surface under a rebuild or a stale branch', () => {
  it('withholds every proposal control while the projection is rebuilding', () => {
    // Seam 1 gated the guest on SYNC alone. A rebuilding projection is a
    // converged, connected replica whose server will not take a command -
    // exactly the case where a healthy sync posture reads as permission.
    render(
      <GuestProposalSurface
        api={guestApi()}
        actions={GUEST_ACTIONS}
        syncPosture={guestUnder(refusal('PROJECTION_REBUILDING'))}
      />,
    );

    expectDisabledWithReason(screen.getByTestId('guest-action-SpendFunds'));
  });

  it('withholds every proposal control on a stale branch', () => {
    render(
      <GuestProposalSurface
        api={guestApi()}
        actions={GUEST_ACTIONS}
        syncPosture={guestUnder(refusal('STALE_BRANCH'))}
      />,
    );

    expectDisabledWithReason(screen.getByTestId('guest-action-SpendFunds'));
  });

  it('offers its controls when nothing is refusing them', () => {
    // The inverse. A gate that never opens teaches nothing about the gate.
    render(
      <GuestProposalSurface
        api={guestApi()}
        actions={GUEST_ACTIONS}
        syncPosture={guestUnder(null)}
      />,
    );

    const control = screen.getByTestId('guest-action-SpendFunds');
    expect(control).toBeEnabled();
    expect(control).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByTestId('guest-lifecycle-recovery')).toBeNull();
  });
});

// =============================================================================
// Recovery, and one vocabulary across both surfaces
// =============================================================================

describe('the guest reads the same refusal the host does', () => {
  /** Renders the GM surface under one refusal and returns the reason text. */
  function gmReasonUnder(code: CampaignLifecycleRefusalCode): string {
    const { unmount } = render(
      <HostGmReviewSurface
        pending={[pendingProposal('p-day', 'AdvanceDay')]}
        onDecide={() => {}}
        lifecycle={deriveGmLifecyclePosture({
          refusal: refusal(code),
          pendingProposalCount: 1,
        })}
      />,
    );
    const text = screen.getByTestId('gm-command-blocked-reason').textContent;
    unmount();
    return text ?? '';
  }

  it('tells the guest the same thing it tells the host', () => {
    // One refusal, one meaning. A guest told "rebuilding" while the host
    // is told "not converged" would put two people in the same campaign
    // on two different theories of what is wrong. This is the only row in
    // the file that renders the host surface, and it has to: the claim is
    // about the RELATIONSHIP between the two, which cannot be checked
    // from one side.
    render(
      <GuestProposalSurface
        api={guestApi()}
        actions={GUEST_ACTIONS}
        syncPosture={guestUnder(refusal('STALE_BRANCH'))}
      />,
    );

    expect(
      screen.getByTestId('guest-command-blocked-reason'),
    ).toHaveTextContent(gmReasonUnder('STALE_BRANCH'));
  });

  it('offers the guest the same recovery vocabulary', () => {
    render(
      <GuestProposalSurface
        api={guestApi()}
        actions={GUEST_ACTIONS}
        syncPosture={guestUnder(refusal('STALE_BRANCH'))}
      />,
    );

    expect(screen.getByTestId('guest-lifecycle-recovery')).toHaveTextContent(
      'Resync to active head',
    );
  });

  it('tells the guest to wait out a rebuild, with no button to press', () => {
    // The guest half of the not-actionable recovery. Waiting is the
    // recovery; a button whose only effect is to re-discover the same
    // refusal would dress it up as something the guest controls.
    render(
      <GuestProposalSurface
        api={guestApi()}
        actions={GUEST_ACTIONS}
        syncPosture={guestUnder(refusal('PROJECTION_REBUILDING'))}
      />,
    );

    expect(
      screen.getByTestId('guest-lifecycle-recovery-wait'),
    ).toHaveTextContent('Wait for rebuild');
    expect(screen.queryByTestId('guest-lifecycle-recovery')).toBeNull();
  });
});

// =============================================================================
// The wiring row (#21-class): the surface's REAL refusal channel
// =============================================================================

/**
 * Every row above hands a posture in. That proves the RENDERING and proves
 * nothing about whether a refusal can reach the surface at all - which is
 * exactly the miss 19.4's co-op manifest rows were written for. On shipped
 * code the guest branch of the connected surface discards `Error` frames
 * and passes `refusal: null` unconditionally, so a guest could be refused
 * all day and keep pressing.
 *
 * So this drives a REAL frame through the transport the guest actually
 * subscribes to, and reads the button.
 */
describe('a refusal reaches the guest through the channel it really has', () => {
  const MATCH_ID = 'match-guest-refusal';
  const ROOM_CODE = 'GST234';
  const CAMPAIGN_ID = 'campaign-guest-refusal';

  let frameHandlers: ((message: unknown) => void)[] = [];

  function emit(frame: unknown): void {
    act(() => {
      for (const handler of frameHandlers) handler(frame);
    });
  }

  function guestCampaign() {
    return {
      ...createCampaign('Refusal Guest', 'mercenary', {
        startingFunds: 1_000_000,
      }),
      id: CAMPAIGN_ID,
      coopSession: createGuestCoopSession(MATCH_ID, ROOM_CODE),
    };
  }

  /** The rebuild refusal, as the wire's own `ErrorCodeSchema` carries it. */
  function rebuildingFrame() {
    return {
      kind: 'Error',
      matchId: MATCH_ID,
      ts: '3025-01-01T00:00:01.000Z',
      code: 'PROJECTION_REBUILDING',
      reason: 'correction-lease-live',
    };
  }

  beforeEach(async () => {
    frameHandlers = [];
    _resetCoopRuntimeSessions();
    _resetCampaignSyncTransportsForTest();
    useCampaignMirrorStore.getState().reset();
    resetCampaignStore();
    window.sessionStorage.clear();
    storeCoopCampaignToken({
      matchId: MATCH_ID,
      playerId: 'guest-player',
      wireToken: 'guest-wire-token',
      displayName: 'Guest',
    });
    // A SYNCED mirror, so the sync gate is open and a refusal is the only
    // thing that can close the control. Without this the guest is
    // `connecting`, its controls are already withheld, and the row could
    // not tell a rebuild gate from the sync gate that shipped in 5.6.
    useCampaignMirrorStore.getState().applySnapshot({
      type: 'CampaignSnapshotPublished',
      sequence: 0,
      campaignId: CAMPAIGN_ID,
      ts: '3025-01-01T00:00:00.000Z',
      authorPlayerId: 'host-player',
      scope: 'campaign',
      payload: {
        matchId: MATCH_ID,
        revision: 0,
        state: createEmptyCampaignState(CAMPAIGN_ID),
      },
    } as never);

    const transport: ICampaignSyncTransport = {
      matchId: MATCH_ID,
      playerId: 'guest-player',
      role: 'guest',
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

    await openCoopRuntimeSession(guestCampaign(), {
      matchId: MATCH_ID,
      roomCode: ROOM_CODE,
      arbitrationMode: 'host-review',
    });
  });

  afterEach(() => {
    _resetCoopRuntimeSessions();
    _resetCampaignSyncTransportsForTest();
    useCampaignMirrorStore.getState().reset();
    resetCampaignStore();
    window.sessionStorage.clear();
  });

  async function mountGuestFinances(): Promise<void> {
    render(
      <CampaignCoopRouteSurfaceConnected
        campaign={guestCampaign()}
        routeId="finances"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
  }

  it('withholds the guest control once the server refuses on the wire', async () => {
    await mountGuestFinances();
    expect(screen.getByTestId('guest-action-SpendFunds')).toBeEnabled();

    emit(rebuildingFrame());

    expectDisabledWithReason(screen.getByTestId('guest-action-SpendFunds'));
    expect(screen.getByTestId('campaign-sync-state')).toHaveAttribute(
      'data-state',
      'rebuilding',
    );
  });

  it('lifts the guest block once a campaign event proves the server took a write', async () => {
    await mountGuestFinances();
    emit(rebuildingFrame());
    expect(screen.getByTestId('guest-action-SpendFunds')).toBeDisabled();

    emit({
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
    });

    expect(screen.getByTestId('guest-action-SpendFunds')).toBeEnabled();
  });
});
