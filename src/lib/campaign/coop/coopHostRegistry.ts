/**
 * Active co-op host registry + post-battle reconciliation gate.
 *
 * D-4 remediation (2026-06-09 audit, W3.3): `reconcileCoopBattle` (CO2)
 * shipped with ZERO production callers — the co-op post-battle path was
 * dead code. The production seam where a battle "completes" for campaign
 * purposes is the combat-outcome bus -> `useCampaignStore.enqueueOutcome`
 * flow, so that is where `reconcileCoopOutcomeForCampaign` is invoked
 * (see `useCampaignStore.outcomes.ts#enqueueCampaignOutcome`).
 *
 * Reconciliation needs the campaign's authoritative `CampaignMatchHost`
 * (CO1). Production code does NOT yet instantiate one anywhere — the
 * Wave 6.1 co-op route surfaces shipped with stub transports and the
 * planned "Wave 6.2 live CO1 transport" replacement never landed
 * (`CampaignMatchHost` / `CampaignSyncSession` are constructed only in
 * tests). This registry is therefore the SINGLE point the future
 * session-lifecycle wiring must call (`registerActiveCoopHost`) when it
 * opens a hosted co-op session. Until that wiring exists,
 * `getActiveCoopHost` returns undefined in a live app and the gate
 * below resolves null — a documented no-op, not a silent throw.
 *
 * @module lib/campaign/coop/coopHostRegistry
 */

import type { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { GameSide } from '@/types/gameplay/GameSessionCoreTypes';

import type { ICoopReconciliationResult } from './reconcileCoopBattle';

import {
  deriveCoopBattleConsequences,
  reconcileCoopBattle,
} from './reconcileCoopBattle';

// =============================================================================
// Registry
// =============================================================================

/**
 * The live hosts, keyed by campaign id. A module-level map (not a store)
 * because `CampaignMatchHost` instances are runtime session objects —
 * they must never be serialized or rendered, only looked up by the
 * post-battle seam.
 */
const activeHosts = new Map<string, CampaignMatchHost>();

/**
 * Register the authoritative host for its campaign. Returns an
 * unregister function (mirrors `subscribeToCombatOutcome`'s contract);
 * the unregister is a no-op if a NEWER host has replaced this one, so a
 * stale teardown can't evict a live session.
 */
export function registerActiveCoopHost(host: CampaignMatchHost): () => void {
  activeHosts.set(host.campaignId, host);
  return () => {
    if (activeHosts.get(host.campaignId) === host) {
      activeHosts.delete(host.campaignId);
    }
  };
}

/** Look up the live host for a campaign, if one is registered. */
export function getActiveCoopHost(
  campaignId: string,
): CampaignMatchHost | undefined {
  return activeHosts.get(campaignId);
}

/** Test-only helper: drop every registered host. */
export function _resetActiveCoopHosts(): void {
  activeHosts.clear();
}

// =============================================================================
// Post-battle reconciliation gate
// =============================================================================

/**
 * Reconcile a freshly-landed combat outcome into the shared co-op
 * campaign, when (and only when) this client HOSTS a co-op session for
 * the outcome's campaign.
 *
 * Resolves null (no-op) when:
 *  - the campaign is not a co-op campaign, or this client is a guest —
 *    the host is CO1's single writer; a guest mirror receives the
 *    resulting events over the wire instead of reconciling locally;
 *  - no live `CampaignMatchHost` is registered for the campaign (the
 *    production state today — see the module docstring).
 *
 * Never throws: the caller is a synchronous store action firing this as
 * fire-and-forget, so a reconciliation failure is folded into the
 * result instead of surfacing as an unhandled rejection.
 */
export async function reconcileCoopOutcomeForCampaign(
  campaign: Pick<ICampaign, 'id' | 'coopSession'> | null,
  outcome: ICombatOutcome,
  designations: Readonly<Record<string, string>> = {},
): Promise<ICoopReconciliationResult | null> {
  if (!campaign?.coopSession || campaign.coopSession.mode !== 'host') {
    return null;
  }
  const host = getActiveCoopHost(campaign.id);
  if (!host) {
    return null;
  }
  try {
    const consequences = deriveCoopBattleConsequences({
      outcome,
      campaignId: campaign.id,
      // The local player's units fight on GameSide.Player in every
      // campaign-launched encounter (co-op composition puts BOTH
      // players' forces on the shared player side per design D1).
      playerSide: GameSide.Player,
      // The mission payout flows through the single-player post-battle
      // pipeline (contract fulfillment) — this seam only reconciles the
      // facts readable from the combat outcome itself, per the
      // `deriveCoopBattleConsequences` contract.
      missionPayout: 0,
      designations,
    });
    return await reconcileCoopBattle(host, consequences);
  } catch (err) {
    return {
      ok: false,
      events: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
