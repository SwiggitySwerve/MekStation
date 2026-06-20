import type {
  GmInterventionKind,
  IInterventionConflict,
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

export interface IGmCascadePreview<
  TPrivate = unknown,
  TPublic = unknown,
  TDomainPayload = unknown,
> {
  readonly interventionId: string;
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
  readonly reason?: string;
}

export interface IGmCascadeCancellationResult<TState = unknown> {
  readonly status: 'cancelled';
  readonly state: TState;
  readonly appended: false;
}
