/**
 * CampaignCoopRouteSurface — page-level coordinator for the Wave 6.1
 * conditional-render contract (`wire-coop-campaign-route`, Section 2).
 *
 * Every campaign page in the detail tree mounts this surface near the top
 * of its content tree. The component decides whether to render the host
 * review surface, the guest proposal overlay, or NOTHING based on the
 * campaign's `coopSession` field:
 *
 *   - `coopSession === undefined` — single-player. The component renders
 *     nothing; every existing mutation control on the page behaves as it
 *     did before this change. This preserves the single-player path
 *     untouched (spec scenario "Single-player campaign mounts neither
 *     co-op surface").
 *   - `coopSession.mode === 'host'` (and `dashboardMount` is `true`) —
 *     mount the `<HostGmReviewSurface>` with the current pending-proposal
 *     queue (spec scenario "Host-review surface mounts on the campaign
 *     dashboard"). Non-dashboard sub-routes pass `dashboardMount={false}`
 *     so the surface only appears once per session.
 *   - `coopSession.mode === 'guest'` — mount the `<GuestProposalSurface>`
 *     with the actions appropriate for the current route. Each action
 *     submits an `IGuestProposal` via `useGuestProposals.submit` instead
 *     of mutating campaign state directly (spec scenario "Guest joins a
 *     co-op campaign via room code", final AND clause).
 *
 * The component is presentational — the pending queue (host side) and
 * the proposal transport (guest side) are owned by the caller. For
 * Wave 6.1, the queue is a stub (empty) and the transport resolves
 * unavailable; the live CO1 broadcast wiring replaces the transport prop.
 * The seam is deliberate so the live wiring is a single replacement of
 * the transport prop, not a re-architecture.
 *
 * @spec openspec/specs/coop-campaign-sync/spec.md
 */

import React, { useMemo } from 'react';

import type { IPendingProposal } from '@/lib/multiplayer/server/CampaignGmArbiter';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignIntent } from '@/types/campaign/CampaignSync';
import type {
  GmDecision,
  GuestProposalResult,
} from '@/types/campaign/CoopCampaign';

import { buildCoopCampaignAuthorityProjection } from '@/lib/command-screen';
import { INVALID_CAMPAIGN_INTENT } from '@/types/campaign/CampaignSync';

import {
  GuestProposalSurface,
  type IGuestActionDescriptor,
} from './GuestProposalSurface';
import { HostGmReviewSurface } from './HostGmReviewSurface';
import { useGuestProposals } from './useGuestProposals';

// =============================================================================
// Route → guest actions
// =============================================================================

/**
 * The campaign-detail sub-routes that surface guest proposal controls.
 * Mirrors the 5 mutation-surface sub-routes called out by task 2.2
 * (`personnel`, `mech-bay`, `hiring`, `contract-market`, `finances`),
 * plus the dashboard which is host-side-only.
 */
export type CampaignCoopRouteId =
  | 'dashboard'
  | 'personnel'
  | 'mech-bay'
  | 'hiring'
  | 'contract-market'
  | 'finances';

/**
 * Build the proposal actions for a given campaign sub-route. Each action
 * raises an `ICampaignIntent` of the kind the route's mutation controls
 * would have invoked on a single-player campaign. The intent payload is
 * route-appropriate but minimal — the GM review surface is what decides
 * whether the proposal is reasonable; the guest controls do not enforce
 * any campaign-side constraints (spec "every campaign-mutating control
 * on the page tree SHALL submit IGuestProposal").
 *
 * Wave 6.1 ships the canonical action set per route. Subsequent waves
 * may add per-pilot / per-mech granularity by extending this map.
 */
function buildActionsForRoute(
  routeId: CampaignCoopRouteId,
  campaignId: string,
): readonly IGuestActionDescriptor[] {
  const baseIntent = <K extends ICampaignIntent['kind']>(
    kind: K,
    payload: Extract<ICampaignIntent, { kind: K }>['payload'],
  ): ICampaignIntent =>
    ({
      campaignId,
      intentId: `intent-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind,
      payload,
    }) as ICampaignIntent;

  switch (routeId) {
    case 'personnel':
    case 'hiring':
      return [
        {
          kind: 'HirePilot',
          label: 'Propose: Hire Pilot',
          buildIntent: () =>
            baseIntent('HirePilot', {
              pilot: {
                pilotId: `pilot-coop-${Date.now()}`,
                name: 'Co-op Recruit',
              },
              cost: 12000,
            }),
        },
      ];
    case 'contract-market':
      return [
        {
          kind: 'AcceptContract',
          label: 'Propose: Accept Contract',
          buildIntent: () =>
            baseIntent('AcceptContract', {
              contract: {
                contractId: `contract-coop-${Date.now()}`,
                name: 'Co-op Proposed Contract',
                employerFactionId: 'mercenary',
              },
            }),
        },
      ];
    case 'finances':
      return [
        {
          kind: 'SpendFunds',
          label: 'Propose: Spend Funds',
          buildIntent: () =>
            baseIntent('SpendFunds', {
              amount: 50000,
              reason: 'Co-op proposal — operational expenditure',
            }),
        },
      ];
    case 'mech-bay':
      return [
        {
          kind: 'AllocateSalvage',
          label: 'Propose: Allocate Salvage',
          buildIntent: () =>
            baseIntent('AllocateSalvage', {
              value: 100000,
            }),
        },
      ];
    case 'dashboard':
      // Dashboard is host-side-only; guests never see action buttons here.
      return [];
    default: {
      const exhaustive: never = routeId;
      void exhaustive;
      return [];
    }
  }
}

// =============================================================================
// Props
// =============================================================================

export interface CampaignCoopRouteSurfaceProps {
  /** The current campaign — drives the co-op gate. */
  readonly campaign: ICampaign | null;
  /** Identifier of the current sub-route. */
  readonly routeId: CampaignCoopRouteId;
  /**
   * True on the dashboard sub-route only — the surface mounts
   * `<HostGmReviewSurface>` for hosts here and nowhere else. Non-dashboard
   * routes pass `false`.
   */
  readonly dashboardMount?: boolean;
  /**
   * Host-side: the pending guest proposals to surface. Default empty —
   * Wave 6.1 ships the surface mount; live CO1-feed wiring lands in
   * Wave 6.2 by replacing this prop with the live arbiter state.
   */
  readonly pendingProposals?: readonly IPendingProposal[];
  /**
   * Host-side: invoked when the host clicks approve / veto. Default is a
   * no-op; Wave 6.2 replaces with a wire-through to `CampaignGmArbiter.decide`.
   */
  readonly onDecide?: (proposalId: string, decision: GmDecision) => void;
  /**
   * Guest-side: the submit transport. Default resolves as unavailable
   * so the UI never leaves a guest action pending forever while the
   * live CO1 proposal transport is still being wired.
   */
  readonly proposalTransport?: (
    proposal: import('@/types/campaign/CoopCampaign').IGuestProposal,
  ) => Promise<GuestProposalResult>;
  /**
   * Guest-side: the proposing player's id. Stamped on every raised
   * proposal. Defaults to a stable placeholder for the Wave 6.1 wiring;
   * Wave 6.2 replaces with the authenticated multiplayer player id.
   */
  readonly proposingPlayerId?: string;
  readonly guestMirrorSummary?: {
    readonly status: 'connecting' | 'synced' | 'missing-token' | 'paused';
    readonly balance?: number;
    readonly salvagePool?: number;
    readonly rosterUnitCount?: number;
    readonly pilotCount?: number;
    readonly lastSequence?: number;
  };
}

// =============================================================================
// Component
// =============================================================================

/**
 * Default no-op transport — resolves immediately as a mechanical
 * rejection so a guest proposal does not appear to be waiting on a GM
 * decision when no live transport exists. Live transport replaces this
 * prop.
 */
const defaultUnavailableTransport = async (
  proposal: import('@/types/campaign/CoopCampaign').IGuestProposal,
): Promise<GuestProposalResult> => ({
  status: 'mechanically-rejected',
  proposalId: proposal.proposalId,
  code: INVALID_CAMPAIGN_INTENT,
  reason: 'session-closed',
});

export function CampaignCoopRouteSurface(
  props: CampaignCoopRouteSurfaceProps,
): React.ReactElement | null {
  const {
    campaign,
    routeId,
    dashboardMount = false,
    pendingProposals = [],
    onDecide = () => {
      /* Wave 6.2 wires to CampaignGmArbiter.decide */
    },
    proposalTransport = defaultUnavailableTransport,
    proposingPlayerId = 'co-op-guest',
    guestMirrorSummary,
  } = props;

  // Always call hooks unconditionally — the early-return below is a render
  // gate, not a hook gate.
  const guestActions = useMemo(
    () => buildActionsForRoute(routeId, campaign?.id ?? 'unknown-campaign'),
    [routeId, campaign?.id],
  );
  const proposalsApi = useGuestProposals(proposalTransport, proposingPlayerId);
  const authorityProjection = useMemo(
    () =>
      buildCoopCampaignAuthorityProjection({
        mode:
          campaign?.coopSession?.mode === 'host'
            ? 'host'
            : campaign?.coopSession?.mode === 'guest'
              ? 'guest'
              : 'single-player',
        routeId,
        pendingProposalCount: pendingProposals.length,
      }),
    [campaign?.coopSession?.mode, pendingProposals.length, routeId],
  );

  // Single-player campaigns mount neither co-op surface.
  if (!campaign?.coopSession) {
    return null;
  }

  if (campaign.coopSession.mode === 'host') {
    // Host-review surface mounts ONLY on the dashboard so the host sees
    // the pending queue at a glance — sub-routes stay clean (task 2.1).
    if (!dashboardMount) {
      return null;
    }
    return (
      <div data-testid="campaign-coop-route-surface-host" className="mb-6">
        <HostGmReviewSurface
          pending={pendingProposals}
          onDecide={onDecide}
          authorityProjection={authorityProjection}
        />
      </div>
    );
  }

  // Guest mode — present the proposal-controls overlay scoped to this route.
  if (campaign.coopSession.mode === 'guest') {
    // Guest mode is render-only on the dashboard — proposals get raised
    // from the mutation sub-routes, not the dashboard summary.
    if (dashboardMount) {
      return (
        <div
          data-testid="campaign-coop-route-surface-guest-dashboard-banner"
          className="mb-6 rounded-lg border border-sky-700 bg-sky-900/30 p-4 text-sm text-sky-200"
        >
          <p>
            You are joined as a guest. Mutation controls on every sub-route
            submit proposals to the host for review instead of mutating campaign
            state directly.
          </p>
          {guestMirrorSummary ? (
            <dl
              className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-5"
              data-testid="guest-mirror-sync-summary"
            >
              <div>
                <dt className="text-sky-300/80">Sync</dt>
                <dd data-testid="guest-mirror-sync-status">
                  {guestMirrorSummary.status}
                </dd>
              </div>
              <div>
                <dt className="text-sky-300/80">Balance</dt>
                <dd data-testid="guest-mirror-balance">
                  {guestMirrorSummary.balance?.toLocaleString() ?? 'pending'}
                </dd>
              </div>
              <div>
                <dt className="text-sky-300/80">Salvage</dt>
                <dd data-testid="guest-mirror-salvage">
                  {guestMirrorSummary.salvagePool?.toLocaleString() ??
                    'pending'}
                </dd>
              </div>
              <div>
                <dt className="text-sky-300/80">Units</dt>
                <dd data-testid="guest-mirror-unit-count">
                  {guestMirrorSummary.rosterUnitCount ?? 0}
                </dd>
              </div>
              <div>
                <dt className="text-sky-300/80">Seq</dt>
                <dd data-testid="guest-mirror-last-sequence">
                  {guestMirrorSummary.lastSequence ?? -1}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      );
    }
    return (
      <div data-testid="campaign-coop-route-surface-guest" className="mb-6">
        <GuestProposalSurface
          api={proposalsApi}
          actions={guestActions}
          authorityProjection={authorityProjection}
        />
      </div>
    );
  }

  // Exhaustive narrowing guard.
  const exhaustive: never = campaign.coopSession.mode;
  void exhaustive;
  return null;
}

export default CampaignCoopRouteSurface;
