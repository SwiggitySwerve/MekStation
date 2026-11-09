import type { GmActionLedgerRecordFromIntervention } from './ActionLedgerTypes';
import type {
  GmInterventionKind,
  IInterventionConflict,
  IInterventionLedgerMetadata,
  IInterventionLedgerRecord,
  InterventionDomain,
} from './InterventionLedgerTypes';

export type GmCascadePreviewStatus =
  | 'ready'
  | 'requires-manual-takeover'
  | 'blocked'
  | 'unsupported'
  | 'deferred'
  | 'rejected';

/** Transient source-state token; never part of a canonical record or effect. */
export type GmCascadePreviewFreshness =
  | {
      readonly kind: 'campaign';
      readonly campaignId: string;
      readonly updatedAt: string;
      readonly currentDate: string;
    }
  | { readonly kind: 'state'; readonly fingerprint: string };

export interface IGmCascadePreview<
  TPrivate = unknown,
  TPublic = unknown,
  TDomainPayload = unknown,
> extends IInterventionLedgerMetadata {
  readonly interventionId: string;
  /** Missing on unavailable previews; a ready approval requires this token. */
  readonly freshness?: GmCascadePreviewFreshness;
  readonly status: GmCascadePreviewStatus;
  readonly domain: InterventionDomain;
  readonly kind: GmInterventionKind;
  readonly actorId: string;
  readonly targetRefs: readonly string[];
  readonly affectedStateRefs: readonly string[];
  readonly privateMetadata?: TPrivate;
  readonly publicEffect?: TPublic;
  readonly domainPayload?: TDomainPayload;
  readonly projectedEvents: readonly unknown[];
  readonly conflicts: readonly IInterventionConflict[];
  readonly causedBy?: readonly string[];
  readonly supersedes?: readonly string[];
  readonly reason?: string;
}

export interface IGmCascadeApprovalResult<TState = unknown> {
  readonly status: 'approved' | 'blocked';
  readonly state: TState;
  readonly appended: boolean;
  readonly record?: IInterventionLedgerRecord;
  readonly actionLedgerRecord?: GmActionLedgerRecordFromIntervention;
  readonly reason?: string;
}

/**
 * An approval that passed every check and whose state was derived, but whose
 * record is not in any ledger yet: the caller applies `state`, then records
 * `record` only if that apply succeeded.
 */
export interface IGmCascadePreparedApproval<TState = unknown> {
  readonly status: 'prepared';
  readonly state: TState;
  readonly record: IInterventionLedgerRecord;
}

export interface IGmCascadeBlockedApproval<TState = unknown> {
  readonly status: 'blocked';
  readonly state: TState;
  readonly appended: false;
  readonly reason: string;
}

export type GmCascadeApprovalPreparation<TState = unknown> =
  | IGmCascadePreparedApproval<TState>
  | IGmCascadeBlockedApproval<TState>;

export interface IGmCascadeCancellationResult<TState = unknown> {
  readonly status: 'cancelled';
  readonly state: TState;
  readonly appended: false;
}
