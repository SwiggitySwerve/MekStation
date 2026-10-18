/**
 * Module-scoped owner of the GM's authoritative fold (P2CG1G1, CF11/M2),
 * the host counterpart of the guest's campaign mirror store. It holds one
 * lineage per browser graph. A rebind continues it only on the same live
 * transport bound to the same campaign and match, so a remount keeps the
 * fold and launch facts a linked receipt chain builds on. Any other
 * binding (an unbound legacy transport, a replacement after a rejoin,
 * another campaign) starts a fresh cell at EMPTY, which a writer still
 * holding the old cell cannot reach. Cached view state only: never receipt
 * authority, readiness or durable proof.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D4, D9)
 */

import {
  EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD,
  type ICampaignAuthoritativeFold,
} from './campaignAuthoritativeFold';
import {
  getActiveCampaignSyncTransport,
  type ICampaignSyncTransport,
} from './campaignSyncTransport';

/** The cell the legacy fold and the receipt consumer both write. */
export interface ICampaignHostFoldCell {
  current: ICampaignAuthoritativeFold;
}

export interface ICampaignHostFoldBinding {
  readonly campaignId: string;
  readonly matchId: string;
  readonly transport: ICampaignSyncTransport;
}

interface IHostFoldLineage extends ICampaignHostFoldBinding {
  readonly cell: ICampaignHostFoldCell;
}

let held: IHostFoldLineage | null = null;

/**
 * Bound exactly as the receipt consumer requires, still registered, and
 * current (CF-H3): a fold behind the transport cursor missed a frame while
 * nothing was bound. A legacy baseline is adopted at 0 while the cursor
 * stays -1, so "not behind" rather than equal.
 */
function continues(
  lineage: IHostFoldLineage | null,
  { campaignId, matchId, transport }: ICampaignHostFoldBinding,
): lineage is IHostFoldLineage {
  return (
    lineage !== null &&
    lineage.transport === transport &&
    lineage.campaignId === campaignId &&
    lineage.matchId === matchId &&
    transport.campaignId === campaignId &&
    transport.confirmApplied !== undefined &&
    getActiveCampaignSyncTransport(matchId) === transport &&
    lineage.cell.current.lastSequence >= transport.lastSeq()
  );
}

/**
 * The fold cell for one host binding: the held cell when the binding
 * continues its lineage, otherwise a fresh cell at EMPTY that replaces it.
 */
export function claimCampaignHostFold(binding: ICampaignHostFoldBinding): {
  readonly cell: ICampaignHostFoldCell;
  readonly continued: boolean;
} {
  if (continues(held, binding)) return { cell: held.cell, continued: true };
  held = { ...binding, cell: { current: EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD } };
  return { cell: held.cell, continued: false };
}
