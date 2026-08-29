/**
 * Campaign wire scope boundary (umbrella 11.1, campaign half).
 *
 * The scope vocabulary has been stamped on every campaign event since
 * design D3, and the emission table anticipates GM-hidden facts - but
 * nothing on the delivery side ever read it: `CampaignSyncSession`
 * fanned every envelope to every sink, so the FIRST gm-scoped producer
 * would have broadcast its secret to the whole session. This is the
 * enforcement, applied per recipient before serialization, mirroring
 * the match side's publication boundary.
 *
 * Deliberately NOT here: stripping the envelope's authority `sequence`
 * from player frames. The legacy campaign client resumes by that
 * number, and the delivery-epoch mapping that replaces it is delegated
 * to `design-campaign-authority-and-sync` (wave map row 5). Until that
 * lands, concealment arithmetic over sequence gaps remains possible
 * the moment anything is actually withheld - accepted and recorded in
 * the 11.1 receipts rather than silently shipped.
 */

import type { CampaignEventScope } from '@/types/campaign/CampaignSync';

export interface ICampaignWireViewer {
  /**
   * The PROVEN participant identity, or null for a sink whose caller
   * could not prove one. Null is fail-closed: an unproven viewer gets
   * only campaign-scoped facts.
   */
  readonly participantId: string | null;
  /** True when the participant is the campaign's GM (host player). */
  readonly isGm: boolean;
}

/**
 * Whether a scope admits a viewer. The GM sees everything - the scope
 * system exists to let the GM hold facts back from players, never the
 * reverse. Team scope has no membership source yet (no producer emits
 * it either); until one exists it admits only the GM, which is the
 * fail-closed reading rather than a guess at team semantics.
 */
export function campaignScopeAdmits(
  scope: CampaignEventScope,
  viewer: ICampaignWireViewer,
): boolean {
  if (viewer.isGm) return true;
  if (scope === 'campaign') return true;
  if (scope === 'gm') return false;
  if (scope.startsWith('player:')) {
    return (
      viewer.participantId !== null &&
      scope === `player:${viewer.participantId}`
    );
  }
  // team:<id> - no membership source exists; fail closed.
  return false;
}
