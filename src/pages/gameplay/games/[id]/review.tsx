/**
 * Post-Battle Review Page
 *
 * Rich review surface bridging the tactical session and the campaign
 * queue. Renders the six post-battle panels (header, casualty, pilot
 * XP, salvage, contract, repair preview) and provides a single
 * "Apply outcome" CTA that drains the matching outcome from the
 * campaign store via `applyPostBattle`.
 *
 * Pages Router (this project does NOT use the App Router). Layout
 * mirrors the Phase 1 victory screen so the two pages feel like
 * siblings.
 *
 * @spec openspec/changes/add-post-battle-review-ui/specs/post-battle-ui/spec.md
 */

import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type { ISalvageReport } from '@/types/campaign/Salvage';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import {
  CasualtyPanel,
  ContractPanel,
  PilotXpPanel,
  PostBattleHeader,
  RepairPreviewPanel,
  SalvagePanel,
} from '@/components/gameplay/post-battle';
import { Button } from '@/components/ui/Button';
import { applyPostBattle } from '@/lib/campaign/processors/postBattleProcessor';
import { appendContractPaymentActivityEntries } from '@/stores/campaign/contractPaymentActivity';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

// =============================================================================
// Presentational Screen
// =============================================================================

export interface PostBattleReviewScreenProps {
  /** Hand-off shape from the engine. */
  readonly outcome: ICombatOutcome;
  /** Salvage report (Wave 3a); null when no pool was generated. */
  readonly salvageReport?: ISalvageReport | null;
  /** Repair tickets (Wave 3b); empty when no repairs needed. */
  readonly repairTickets?: readonly IRepairTicket[];
  /** Resolved contract metadata for the contract panel. */
  readonly contractName?: string | null;
  readonly employerName?: string | null;
  /** Pilot name lookup keyed by unit id. */
  readonly pilotNames?: Readonly<Record<string, string>>;
  /** Side this UI player controls. Defaults to Player. */
  readonly playerSide?: GameSide;
  /** Click handler for "Apply outcome" CTA. */
  readonly onApply?: () => void;
  /** True while the apply action is in flight. */
  readonly isApplying?: boolean;
  /** Disables the apply button (e.g., outcome already applied). */
  readonly applyDisabled?: boolean;
  /**
   * Per `wire-encounter-to-campaign-round-trip` Wave 5 §11.2: error
   * message recorded by the post-battle processor on its last try to
   * apply this outcome. When set, the screen renders an inline error
   * panel + a "Retry application" CTA.
   */
  readonly applyError?: string | null;
  /** Click handler for the "Retry application" CTA (Wave 5 §11.3). */
  readonly onRetry?: () => void;
  /** True while the retry action is in flight. */
  readonly isRetrying?: boolean;
}

/**
 * Pure presentational shell. Test wrapper renders this directly with
 * synthetic data so we don't need to mock the router or stores.
 */
export function PostBattleReviewScreen({
  outcome,
  salvageReport = null,
  repairTickets = [],
  contractName = null,
  employerName = null,
  pilotNames = {},
  playerSide = GameSide.Player,
  onApply,
  isApplying = false,
  applyDisabled = false,
  applyError = null,
  onRetry,
  isRetrying = false,
}: PostBattleReviewScreenProps): React.ReactElement {
  return (
    <div
      className="bg-surface-base min-h-screen px-6 py-10"
      data-testid="post-battle-review-screen"
    >
      <div className="mx-auto max-w-6xl">
        <PostBattleHeader
          outcome={outcome}
          playerSide={playerSide}
          contractName={contractName}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CasualtyPanel outcome={outcome} playerSide={playerSide} />
          <PilotXpPanel
            outcome={outcome}
            playerSide={playerSide}
            pilotNames={pilotNames}
          />
          <SalvagePanel report={salvageReport} />
          <ContractPanel
            outcome={outcome}
            playerSide={playerSide}
            contractName={contractName}
            employerName={employerName}
          />
          <div className="lg:col-span-2">
            <RepairPreviewPanel tickets={repairTickets} />
          </div>
        </div>

        {applyError && (
          <div
            className="mt-8 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3"
            data-testid="apply-error-panel"
            role="alert"
          >
            <p className="text-sm font-medium text-red-200">
              Outcome failed to apply on the last day-advance.
            </p>
            <p
              className="mt-1 font-mono text-xs text-red-100/80"
              data-testid="apply-error-message"
            >
              {applyError}
            </p>
            {onRetry && (
              <div className="mt-3">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={onRetry}
                  disabled={isRetrying}
                  data-testid="retry-application-cta"
                >
                  {isRetrying ? 'Retrying…' : 'Retry application'}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="mt-10 flex flex-col items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={onApply}
            disabled={applyDisabled || isApplying || !onApply}
            data-testid="apply-outcome-cta"
          >
            {isApplying ? 'Applying…' : 'Apply outcome'}
          </Button>
          <Link
            href="/gameplay/encounters"
            className="text-text-theme-secondary text-sm hover:underline"
            data-testid="review-back-link"
          >
            Back to Encounter Hub
          </Link>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Page Wrapper
// =============================================================================

/**
 * Look up the outcome currently in the campaign store's pending queue
 * by `matchId`. Returns null when nothing matches — caller renders
 * the empty state.
 */
function findPendingOutcome(
  store: ReturnType<typeof useCampaignStore>,
  matchId: string,
): ICombatOutcome | null {
  if (!matchId) return null;
  const pending = store.getState().getPendingOutcomes();
  return pending.find((o) => o.matchId === matchId) ?? null;
}

export default function PostBattleReviewPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const matchId = typeof id === 'string' ? id : '';

  const store = useCampaignStore();

  // Hydration guard — store reads happen client-side only so SSR
  // never renders a half-formed page.
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Snapshot of the current pending outcome for this match. Re-derived
  // when matchId changes; we don't subscribe to the full queue because
  // we only care about this one match's outcome existing.
  const outcome = useMemo<ICombatOutcome | null>(() => {
    if (!isClient) return null;
    return findPendingOutcome(store, matchId);
  }, [isClient, store, matchId]);

  const [isApplying, setIsApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryFailureMessage, setRetryFailureMessage] = useState<string | null>(
    null,
  );

  if (!isClient) {
    return (
      <div
        className="bg-surface-base flex h-screen items-center justify-center"
        data-testid="review-loading"
      >
        <p className="text-text-theme-secondary">Loading post-battle review…</p>
      </div>
    );
  }

  if (!outcome) {
    return (
      <div
        className="bg-surface-base flex h-screen flex-col items-center justify-center gap-4 px-6 text-center"
        data-testid="review-no-outcome"
      >
        <h2 className="text-text-theme-primary text-xl font-semibold">
          No pending outcome
        </h2>
        <p className="text-text-theme-secondary text-sm">
          The campaign store does not have a pending outcome for match{' '}
          <span className="font-mono">{matchId || 'n/a'}</span>. The match may
          have been applied already, or you arrived here directly.
        </p>
        <Link
          href="/gameplay/encounters"
          className="bg-accent text-text-theme-primary inline-flex min-h-[44px] items-center rounded-lg px-5 py-3 text-sm font-medium hover:opacity-90"
        >
          Back to Encounter Hub
        </Link>
      </div>
    );
  }

  /**
   * Apply the outcome to the campaign and mark it reviewed. Uses the
   * processor's `applyPostBattle` so the same idempotency / status
   * mapping logic the day pipeline runs is exercised here too.
   * `markBattleReviewed` stamps the reviewed-at timestamp AND drains
   * the pending queue so the dashboard banner stops surfacing it.
   */
  const handleApply = (): void => {
    setIsApplying(true);
    try {
      const state = store.getState();
      const campaign = state.campaign as ICampaign | null;
      if (!campaign) {
        // No campaign loaded — fall back to just marking reviewed so
        // the user isn't stuck. Real-world this branch is unreachable
        // because the outcome could only have been enqueued against
        // a loaded campaign.
        state.markBattleReviewed(outcome.matchId);
        setApplied(true);
        return;
      }
      const result = applyPostBattle(outcome, campaign);
      state.updateCampaign(result.campaign);
      appendContractPaymentActivityEntries(
        state.appendActivityLogEntry,
        result.campaign,
        result.events,
      );
      state.markBattleReviewed(outcome.matchId);
      setApplied(true);
      // Per `wire-encounter-to-campaign-round-trip` Wave 5 (task 4.3):
      // navigate to the campaign dashboard with `?pendingBattle=<matchId>`
      // so the dashboard can highlight the just-applied outcome. The
      // campaign id comes from the live store; falls back to the
      // campaigns index when somehow the campaign disappeared mid-flow.
      const target = `/gameplay/campaigns/${campaign.id}?pendingBattle=${outcome.matchId}`;
      void router.push(target);
    } finally {
      setIsApplying(false);
    }
  };

  /**
   * Per `wire-encounter-to-campaign-round-trip` Wave 5 §11.3: manual
   * retry path for an outcome the day pipeline failed to apply. Calls
   * the store's `retryOutcomeApplication` which mirrors the post-battle
   * processor's apply logic and clears the recorded error on success.
   */
  const handleRetry = (): void => {
    setIsRetrying(true);
    setRetryFailureMessage(null);
    try {
      const ok = store.getState().retryOutcomeApplication(outcome.matchId);
      if (ok) {
        setApplied(true);
        const campaign = store.getState().campaign;
        if (campaign) {
          const target = `/gameplay/campaigns/${campaign.id}?pendingBattle=${outcome.matchId}`;
          void router.push(target);
        }
      } else {
        // The store stamps the latest error onto outcomeApplyErrors;
        // we surface a generic "still failing" hint here. The detailed
        // message is available via the live store snapshot used in
        // `applyError` below.
        setRetryFailureMessage(
          'Retry did not apply this outcome. See error details above.',
        );
      }
    } finally {
      setIsRetrying(false);
    }
  };

  // Live error message for this specific match (if any).
  const applyError =
    store.getState().getOutcomeApplyErrors()[outcome.matchId] ??
    retryFailureMessage ??
    null;

  return (
    <>
      <Head>
        <title>Post-Battle Review — MekStation</title>
      </Head>
      <PostBattleReviewScreen
        outcome={outcome}
        playerSide={GameSide.Player}
        onApply={handleApply}
        isApplying={isApplying}
        applyDisabled={applied}
        applyError={applyError}
        onRetry={handleRetry}
        isRetrying={isRetrying}
      />
    </>
  );
}
