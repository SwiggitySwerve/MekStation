export type KnownInterventionDomain =
  | 'combat'
  | 'unit-reload'
  | 'post-combat'
  | 'economy'
  | 'repair'
  | 'salvage'
  | 'time';

export type InterventionDomain = KnownInterventionDomain | (string & {});

export type GmInterventionKind = 'add' | 'subtract' | 'fix' | 'undo' | 'reload';

export type InterventionLedgerRecordStatus =
  | 'previewed'
  | 'approved'
  | 'cancelled'
  | 'manual';

export type InterventionPreviewStatus =
  | 'ready'
  | 'requires-manual-takeover'
  | 'blocked'
  | 'unsupported';

export interface IInterventionConflict {
  readonly code: string;
  readonly message: string;
  readonly affectedRefs?: readonly string[];
  readonly requiresManualTakeover?: boolean;
}

export interface IInterventionLedgerCommand<TPayload = unknown> {
  readonly domain: InterventionDomain;
  readonly kind: GmInterventionKind;
  readonly actorId: string;
  readonly targetRefs: readonly string[];
  readonly payload?: TPayload;
  readonly causedBy?: readonly string[];
  readonly supersedes?: readonly string[];
}

export interface IInterventionLedgerRecord<
  TPrivate = unknown,
  TPublic = unknown,
  TDomainPayload = unknown,
> {
  readonly id: string;
  readonly domain: InterventionDomain;
  readonly kind: GmInterventionKind;
  readonly status: InterventionLedgerRecordStatus;
  readonly actorId: string;
  readonly targetRefs: readonly string[];
  readonly causedBy?: readonly string[];
  readonly supersedes?: readonly string[];
  readonly privateMetadata: TPrivate;
  readonly publicEffect: TPublic;
  readonly domainPayload?: TDomainPayload;
  readonly createdAt: string;
  readonly approvedAt?: string;
}

export interface IInterventionLedgerPreview<
  TPrivate = unknown,
  TPublic = unknown,
  TDomainPayload = unknown,
> {
  readonly domain: InterventionDomain;
  readonly kind: GmInterventionKind;
  readonly status: InterventionPreviewStatus;
  readonly actorId: string;
  readonly targetRefs: readonly string[];
  readonly privateMetadata?: TPrivate;
  readonly publicEffect?: TPublic;
  readonly domainPayload?: TDomainPayload;
  readonly causedBy?: readonly string[];
  readonly supersedes?: readonly string[];
  readonly projectedEvents?: readonly unknown[];
  readonly conflicts: readonly IInterventionConflict[];
  readonly reason?: string;
}

export interface IUnsupportedInterventionResult<TState = unknown> {
  readonly status: 'unsupported';
  readonly domain: InterventionDomain;
  readonly kind?: GmInterventionKind;
  readonly reason: string;
  readonly state: TState;
}

export interface IAppliedInterventionResult<TState = unknown> {
  readonly status: 'applied';
  readonly domain: InterventionDomain;
  readonly record: IInterventionLedgerRecord;
  readonly state: TState;
}

export type InterventionApplyResult<TState = unknown> =
  | IAppliedInterventionResult<TState>
  | IUnsupportedInterventionResult<TState>;

export interface IInterventionLedgerImplementer<
  TCommand extends IInterventionLedgerCommand = IInterventionLedgerCommand,
  TState = unknown,
  TPrivate = unknown,
  TPublic = unknown,
  TDomainPayload = unknown,
> {
  readonly domain: InterventionDomain;
  preview(
    command: TCommand,
    state: TState,
  ): IInterventionLedgerPreview<TPrivate, TPublic, TDomainPayload>;
  apply(
    record: IInterventionLedgerRecord<TPrivate, TPublic, TDomainPayload>,
    state: TState,
  ): TState;
  projectPublic(
    record: IInterventionLedgerRecord<TPrivate, TPublic, TDomainPayload>,
  ): TPublic;
  projectPrivate(
    record: IInterventionLedgerRecord<TPrivate, TPublic, TDomainPayload>,
  ): TPrivate;
}
