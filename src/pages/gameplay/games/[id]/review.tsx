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
   * Apply the outcome to the campaign and dequeue it. Uses the
   * processor's `applyPostBattle` so the same idempotency / status
   * mapping logic the day pipeline runs is exercised here too.
   */
  const handleApply = (): void => {
    setIsApplying(true);
    try {
      const state = store.getState();
      const campaign = state.campaign as ICampaign | null;
      if (!campaign) {
        // No campaign loaded — fall back to just dequeueing so the
        // user isn't stuck. Real-world this branch is unreachable
        // because the outcome could only have been enqueued against
        // a loaded campaign.
        state.dequeueOutcome(outcome.matchId);
        setApplied(true);
        return;
      }
      const result = applyPostBattle(outcome, campaign);
      state.updateCampaign(result.campaign);
      state.dequeueOutcome(outcome.matchId);
      setApplied(true);
      // Navigate back to the campaign dashboard so the player can see
      // the day-pipeline effects on next advance.
      void router.push('/campaign');
    } finally {
      setIsApplying(false);
    }
  };

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
      />
    </>
  );
}
