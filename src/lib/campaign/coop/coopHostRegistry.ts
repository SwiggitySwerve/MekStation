/**
 * Active co-op host registry and post-battle transport gate.
 *
 * Browser-local `CampaignMatchHost` instances remain registered for
 * single-graph runtime features such as proposal handling. Production battle
 * reconciliation deliberately bypasses that registry: it sends one host-only
 * intent through campaign sync to the server-resident host.
 *
 * @module lib/campaign/coop/coopHostRegistry
 */

import type { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { toast } from '@/components/shared/Toast';
import { GameSide } from '@/types/gameplay/GameSessionCoreTypes';

import type { ICoopReconciliationResult } from './reconcileCoopBattle';

import { getActiveCampaignSyncTransport } from './campaignSyncTransport';
import { deriveCoopBattleConsequences } from './reconcileCoopBattle';

// =============================================================================
// Registry
// =============================================================================

const activeHosts = new Map<string, CampaignMatchHost>();

/**
 * Register a browser-local host for runtime features that require a shared
 * in-process graph. Returns an unregister function that cannot remove a newer
 * host for the same campaign.
 */
export function registerActiveCoopHost(host: CampaignMatchHost): () => void {
  activeHosts.set(host.campaignId, host);
  return () => {
    if (activeHosts.get(host.campaignId) === host) {
      activeHosts.delete(host.campaignId);
    }
  };
}

/** Look up the local runtime host for a campaign, if one is registered. */
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
 * Send a host campaign's newly landed combat outcome to the server-resident
 * campaign host. Guests and single-player campaigns do not reconcile here and
 * return `null`. A host without a connected host-role transport retains its
 * locally persisted outcome, shows a warning, and returns a failed result.
 */
export async function reconcileCoopOutcomeForCampaign(
  campaign: Pick<ICampaign, 'id' | 'coopSession'> | null,
  outcome: ICombatOutcome,
  designations: Readonly<Record<string, string>> = {},
): Promise<ICoopReconciliationResult | null> {
  if (!campaign?.coopSession || campaign.coopSession.mode !== 'host') {
    return null;
  }

  const matchId =
    campaign.coopSession.matchId ?? campaign.coopSession.hostMatchId;

  try {
    const consequences = deriveCoopBattleConsequences({
      outcome,
      campaignId: campaign.id,
      playerSide: GameSide.Player,
      missionPayout: 0,
      designations,
    });
    const transport = getActiveCampaignSyncTransport(matchId);
    if (!transport || transport.role !== 'host') {
      toast({
        message:
          'Co-op battle reconciliation was saved locally but the live host connection is unavailable. Guests may need to refetch.',
        variant: 'warning',
        duration: 7000,
      });
      return {
        ok: false,
        events: [],
        error: 'live-host-connection-unavailable',
      };
    }

    transport.sendHostIntent({
      kind: 'ReconcileBattle',
      campaignId: campaign.id,
      intentId: `coop-recon-${outcome.matchId}`,
      payload: consequences,
    });
    return { ok: true, events: [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    toast({
      message: `Co-op battle reconciliation was saved locally but live push failed: ${message}. Guests may need to refetch.`,
      variant: 'warning',
      duration: 7000,
    });
    return {
      ok: false,
      events: [],
      error: message,
    };
  }
}
