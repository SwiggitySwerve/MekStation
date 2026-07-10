/**
 * Contract Processor — daily contract lifecycle management.
 *
 * Two responsibilities:
 *   1. Expire contracts whose `endDate` has passed (legacy behaviour
 *      from Phase 2; preserved via `processContracts`).
 *   2. Per `wire-encounter-to-campaign-round-trip` Wave 5 §9: close
 *      contracts the post-battle processor flagged as fulfilled. This
 *      means applying final payment, recording the closure as a day
 *      event, and clearing the fulfilled queue so the close is
 *      idempotent across re-runs.
 *
 * The processor reads two campaign-extension fields:
 *   - `pendingFulfilledContractIds`: queue maintained by post-battle.
 *   - `processedFulfilledContractIds`: ledger of contracts already
 *     closed, so re-emitted bus events don't double-pay.
 *
 * Faction standing is intentionally left as a follow-up — the standing
 * system is in its own change (`add-faction-standing`). The hook is
 * present (we emit a `contract_closed` event with the success modifier)
 * so the standing processor can pick it up downstream.
 *
 * @spec openspec/changes/wire-encounter-to-campaign-round-trip/specs/contract-types/spec.md
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { Transaction } from '@/types/campaign/Transaction';

import { isContract, type IMission } from '@/types/campaign/Mission';
import { logger } from '@/utils/logger';

import { processContracts } from '../dayAdvancement';
import {
  IDayProcessor,
  IDayProcessorResult,
  DayPhase,
  IDayEvent,
} from '../dayPipeline';
import { asEventDataRecord } from '../utils/processorHelpers';
import { applyContractClosure } from './contractClosure';

// =============================================================================
// Extension Surface
// =============================================================================

interface IFulfillmentExtensions {
  readonly pendingFulfilledContractIds?: readonly string[];
  readonly processedFulfilledContractIds?: readonly string[];
}

type ICampaignWithFulfillment = ICampaign & IFulfillmentExtensions;

// =============================================================================
// Day Processor
// =============================================================================

export const contractProcessor: IDayProcessor = {
  id: 'contracts',
  phase: DayPhase.MISSIONS,
  displayName: 'Contract Processing',

  process(campaign: ICampaign): IDayProcessorResult {
    const extended = campaign as ICampaignWithFulfillment;

    // -----------------------------------------------------------------
    // Step 1 — legacy expiration (endDate → SUCCESS).
    // -----------------------------------------------------------------
    const expirationResult = processContracts(extended);
    const workingMissions: Map<string, IMission> = expirationResult.missions;

    const events: IDayEvent[] = expirationResult.events.map((evt) => ({
      type: 'contract_expired',
      description: `Contract "${evt.contractName}" completed`,
      severity: 'info' as const,
      data: asEventDataRecord(evt),
    }));

    // -----------------------------------------------------------------
    // Step 2 — Wave 5 §9 fulfillment closure.
    // -----------------------------------------------------------------
    const pending = extended.pendingFulfilledContractIds ?? [];
    const alreadyClosed = new Set(extended.processedFulfilledContractIds ?? []);

    let balance = campaign.finances.balance;
    let transactions: Transaction[] = [...campaign.finances.transactions];
    const closedThisRun: string[] = [];
    const nowIso = new Date().toISOString();

    for (const contractId of pending) {
      if (alreadyClosed.has(contractId)) continue;
      const mission = workingMissions.get(contractId);
      if (!mission || !isContract(mission)) {
        logger.warn(
          `[contractProcessor] Pending fulfillment for "${contractId}" but mission is missing or not a contract — skipping.`,
        );
        continue;
      }

      const closure = applyContractClosure(
        { ...campaign, finances: { balance, transactions } },
        mission,
        nowIso,
      );
      balance = closure.balance;
      transactions = closure.transactions;
      events.push(closure.event);
      closedThisRun.push(contractId);
    }

    // -----------------------------------------------------------------
    // Build the updated campaign object.
    // -----------------------------------------------------------------
    const remainingPending = pending.filter(
      (id) => !alreadyClosed.has(id) && !closedThisRun.includes(id),
    );
    const nextProcessedFulfilled = [
      ...(extended.processedFulfilledContractIds ?? []),
      ...closedThisRun,
    ];

    const updatedCampaign: ICampaign = {
      ...campaign,
      missions: workingMissions,
      finances: {
        ...campaign.finances,
        balance,
        transactions,
      },
    };

    // We always re-stamp the fulfillment ledger (even when no closures
    // happened this run) so the pending-set drains to empty and any
    // stale ids are normalized. Cast through the extension type for
    // the returned shape.
    const updatedExtended: ICampaign = {
      ...updatedCampaign,
      ...({
        pendingFulfilledContractIds: remainingPending,
        processedFulfilledContractIds: nextProcessedFulfilled,
      } satisfies IFulfillmentExtensions),
    } as ICampaign;

    return { events, campaign: updatedExtended };
  },
};
