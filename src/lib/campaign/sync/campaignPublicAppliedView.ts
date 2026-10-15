/**
 * Server-only durable public application evidence. Receipt issuance and consumer
 * completion belong to the delivery layer; this owner never accepts a wire cut.
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/coop-campaign-sync/spec.md
 */
import type Database from 'better-sqlite3';

import type { ICampaignWireViewer } from '@/lib/multiplayer/server/campaignWireScopeBoundary';
import type { ICampaignSessionMembership } from '@/services/campaignPersistence/CampaignSessionParticipantStore';

export interface ICampaignAppliedViewKey {
  readonly campaignId: string;
  readonly sessionId: string;
  readonly participantId: string;
}

export interface ICampaignPublicAppliedView extends ICampaignAppliedViewKey {
  readonly branchId: string;
  readonly effectiveGeneration: number;
  readonly acknowledgedJournalCut: number;
  /** Versioned entitlement identity from the authority owner, never a state hash. */
  readonly viewerAuthorityFingerprint: string;
  readonly receiptId: string;
  readonly appliedAt: string;
}

export interface ICampaignApplicationOffer extends Omit<
  ICampaignPublicAppliedView,
  'appliedAt'
> {
  readonly kind: 'baseline' | 'delta' | 'replacement';
  readonly predecessorReceiptId: string | null;
}

export interface ICampaignApplicationContext {
  readonly branchId: string;
  readonly effectiveGeneration: number;
  readonly headRevision: number;
  readonly viewer: ICampaignWireViewer;
  readonly membership: ICampaignSessionMembership | null;
  readonly participantRemoved: boolean;
}

/** Canonical v1 authority identity shared with future receipt issuance. Includes
 * membership incarnation and proven public scope, never presentation state.
 */
export function campaignViewerAuthorityFingerprint(
  membership: ICampaignSessionMembership,
  viewer: ICampaignWireViewer,
): string {
  return JSON.stringify([
    1,
    membership.campaignId,
    membership.sessionId,
    membership.participantId,
    membership.seat,
    membership.boundAt,
    viewer.participantId,
    viewer.isGm,
  ]);
}

export interface ICampaignApplicationRequest extends ICampaignAppliedViewKey {
  readonly receiptId: string;
}

/** Trusted server ports, not client claims. Both run synchronously under the
 * same immediate transaction. Throw on integrity/unavailable authority.
 * The registry must resolve only the admitted socket/principal's delivered,
 * cumulative, completed offer, rejecting unknown/expired/superseded identities.
 * Context reads must use the existing membership, verified effective-history and
 * viewer authority owners on this handle, including committed seat removals.
 * No production registry/wire integration is introduced by this storage unit.
 */
export interface ICampaignApplicationPorts {
  readonly resolveDeliveredOffer: (
    db: Database.Database,
    request: ICampaignApplicationRequest,
  ) => ICampaignApplicationOffer | null;
  readonly readCurrentContext: (
    db: Database.Database,
    key: ICampaignAppliedViewKey,
  ) => ICampaignApplicationContext;
}

export type CampaignApplicationResult =
  | { readonly kind: 'accepted' | 'duplicate' | 'stale' }
  | {
      readonly kind: 'refused';
      readonly reason:
        | 'invalid-offer'
        | 'unknown-receipt'
        | 'offer-binding'
        | 'not-admitted'
        | 'current-authority'
        | 'receipt-conflict'
        | 'baseline-required'
        | 'replacement-required';
    };

const nonempty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const natural = (value: number): boolean =>
  Number.isSafeInteger(value) && value >= 0;
const sameKey = (
  a: ICampaignAppliedViewKey,
  b: ICampaignAppliedViewKey,
): boolean =>
  a.campaignId === b.campaignId &&
  a.sessionId === b.sessionId &&
  a.participantId === b.participantId;
const sameAuthority = (
  a: Pick<
    ICampaignPublicAppliedView,
    'branchId' | 'effectiveGeneration' | 'viewerAuthorityFingerprint'
  >,
  b: Pick<
    ICampaignPublicAppliedView,
    'branchId' | 'effectiveGeneration' | 'viewerAuthorityFingerprint'
  >,
): boolean =>
  a.branchId === b.branchId &&
  a.effectiveGeneration === b.effectiveGeneration &&
  a.viewerAuthorityFingerprint === b.viewerAuthorityFingerprint;
const refusal = (
  reason: Extract<CampaignApplicationResult, { kind: 'refused' }>['reason'],
): CampaignApplicationResult => ({ kind: 'refused', reason });

export class CampaignPublicAppliedViewStore {
  constructor(
    private readonly db: Database.Database,
    private readonly ports: ICampaignApplicationPorts,
  ) {}

  read(key: ICampaignAppliedViewKey): ICampaignPublicAppliedView | null {
    return (
      (this.db
        .prepare(`SELECT campaign_id AS campaignId, session_id AS sessionId,
      participant_id AS participantId, branch_id AS branchId,
      effective_generation AS effectiveGeneration, acknowledged_journal_cut AS acknowledgedJournalCut,
      viewer_authority_fingerprint AS viewerAuthorityFingerprint, receipt_id AS receiptId,
      applied_at AS appliedAt FROM campaign_public_applied_view
      WHERE campaign_id = ? AND session_id = ? AND participant_id = ?`)
        .get(key.campaignId, key.sessionId, key.participantId) as
        | ICampaignPublicAppliedView
        | undefined) ?? null
    );
  }

  /** Public result deliberately contains no journal position. */
  accept(request: ICampaignApplicationRequest): CampaignApplicationResult {
    if (
      ![
        request.campaignId,
        request.sessionId,
        request.participantId,
        request.receiptId,
      ].every(nonempty)
    ) {
      return refusal('invalid-offer');
    }
    return this.db
      .transaction((): CampaignApplicationResult => {
        const offer = this.ports.resolveDeliveredOffer(this.db, request);
        if (offer === null) return refusal('unknown-receipt');
        if (!sameKey(offer, request) || offer.receiptId !== request.receiptId)
          return refusal('offer-binding');
        if (
          ![offer.branchId, offer.viewerAuthorityFingerprint].every(nonempty) ||
          !natural(offer.effectiveGeneration) ||
          !natural(offer.acknowledgedJournalCut) ||
          !['baseline', 'delta', 'replacement'].includes(offer.kind)
        )
          return refusal('invalid-offer');
        const context = this.ports.readCurrentContext(this.db, request);
        const member = context.membership;
        if (
          !member ||
          !sameKey(member, request) ||
          member.revokedAt !== null ||
          context.viewer.participantId !== request.participantId ||
          context.participantRemoved
        ) {
          return refusal('not-admitted');
        }
        if (
          !sameAuthority(offer, {
            ...context,
            viewerAuthorityFingerprint: campaignViewerAuthorityFingerprint(
              member,
              context.viewer,
            ),
          }) ||
          !natural(context.headRevision) ||
          offer.acknowledgedJournalCut > context.headRevision
        )
          return refusal('current-authority');
        const previous = this.read(request);
        if (previous?.receiptId === offer.receiptId) {
          return sameAuthority(previous, offer) &&
            previous.acknowledgedJournalCut === offer.acknowledgedJournalCut
            ? { kind: 'duplicate' }
            : refusal('receipt-conflict');
        }
        if (previous === null) {
          if (offer.kind !== 'baseline' || offer.predecessorReceiptId !== null)
            return refusal('baseline-required');
        } else if (!sameAuthority(previous, offer)) {
          if (
            offer.kind !== 'replacement' ||
            offer.predecessorReceiptId !== previous.receiptId
          ) {
            return refusal('replacement-required');
          }
        } else if (
          offer.acknowledgedJournalCut <= previous.acknowledgedJournalCut
        ) {
          return { kind: 'stale' };
        }
        this.db
          .prepare(`INSERT INTO campaign_public_applied_view
        (campaign_id, session_id, participant_id, branch_id, effective_generation,
         acknowledged_journal_cut, viewer_authority_fingerprint, receipt_id, applied_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(campaign_id, session_id, participant_id) DO UPDATE SET
          branch_id = excluded.branch_id, effective_generation = excluded.effective_generation,
          acknowledged_journal_cut = excluded.acknowledged_journal_cut,
          viewer_authority_fingerprint = excluded.viewer_authority_fingerprint,
          receipt_id = excluded.receipt_id, applied_at = excluded.applied_at`)
          .run(
            request.campaignId,
            request.sessionId,
            request.participantId,
            offer.branchId,
            offer.effectiveGeneration,
            offer.acknowledgedJournalCut,
            offer.viewerAuthorityFingerprint,
            offer.receiptId,
            new Date().toISOString(),
          );
        return { kind: 'accepted' };
      })
      .immediate();
  }
}
