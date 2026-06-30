import type {
  GmInterventionKind,
  IInterventionLedgerMetadata,
  IInterventionLedgerRecord,
  InterventionDomain,
} from './InterventionLedgerTypes';

export type ActionLedgerRecordKind = 'normal' | 'gm-intervention' | 'system';

export type ActionLedgerActorRole = 'player' | 'gm' | 'system';

export type ActionLedgerRecordStatus = 'committed' | 'approved' | 'manual';

export type ActionLedgerProjectionVisibility = 'public' | 'gm-private';

export interface IActionLedgerAppendInput<
  TPublic = unknown,
  TPrivate = unknown,
  TDomainPayload = unknown,
> extends IInterventionLedgerMetadata {
  readonly id: string;
  readonly recordKind: ActionLedgerRecordKind;
  readonly actorId: string;
  readonly actorRole: ActionLedgerActorRole;
  readonly domain: InterventionDomain;
  readonly action: string;
  readonly status: ActionLedgerRecordStatus;
  readonly targetRefs: readonly string[];
  readonly publicEffect: TPublic;
  readonly privateMetadata?: TPrivate;
  readonly domainPayload?: TDomainPayload;
  readonly causedBy?: readonly string[];
  readonly supersedes?: readonly string[];
  readonly interventionRecordId?: string;
  readonly createdAt: string;
  readonly approvedAt?: string;
}

export interface IActionLedgerNormalActionInput<TPublic = unknown> extends Omit<
  IActionLedgerAppendInput<TPublic, never, never>,
  'recordKind' | 'actorRole' | 'status' | 'privateMetadata' | 'domainPayload'
> {
  readonly actorRole?: Extract<ActionLedgerActorRole, 'player' | 'system'>;
}

export interface IActionLedgerRecord<
  TPublic = unknown,
  TPrivate = unknown,
  TDomainPayload = unknown,
> extends IActionLedgerAppendInput<TPublic, TPrivate, TDomainPayload> {
  readonly sequence: number;
}

export interface IPlayerVisibleActionLedgerRecord<TPublic = unknown> {
  readonly id: string;
  readonly sequence: number;
  readonly recordKind: ActionLedgerRecordKind;
  readonly actorId: string;
  readonly actorRole: ActionLedgerActorRole;
  readonly domain: InterventionDomain;
  readonly action: string;
  readonly status: ActionLedgerRecordStatus;
  readonly targetRefs: readonly string[];
  readonly publicEffect: TPublic;
  readonly causedBy?: readonly string[];
  readonly supersedes?: readonly string[];
  readonly interventionRecordId?: string;
  readonly previewId?: string;
  readonly subjectIds?: readonly string[];
  readonly beforeSummary?: string;
  readonly afterSummary?: string;
  readonly resultingStateSummary?: string;
  readonly redactionPolicy?: IInterventionLedgerMetadata['redactionPolicy'];
  readonly createdAt: string;
  readonly approvedAt?: string;
}

export interface IGmVisibleActionLedgerRecord<
  TPublic = unknown,
  TPrivate = unknown,
  TDomainPayload = unknown,
> extends IPlayerVisibleActionLedgerRecord<TPublic> {
  readonly privateMetadata?: TPrivate;
  readonly domainPayload?: TDomainPayload;
}

export type ActionLedgerProjection<
  TPublic = unknown,
  TPrivate = unknown,
  TDomainPayload = unknown,
> =
  | IPlayerVisibleActionLedgerRecord<TPublic>
  | IGmVisibleActionLedgerRecord<TPublic, TPrivate, TDomainPayload>;

export type GmActionLedgerRecordFromIntervention<
  TPrivate = unknown,
  TPublic = unknown,
  TDomainPayload = unknown,
> = IActionLedgerRecord<TPublic, TPrivate, TDomainPayload> & {
  readonly recordKind: 'gm-intervention';
  readonly actorRole: 'gm';
  readonly action: GmInterventionKind;
  readonly interventionRecordId: string;
};

export type NormalActionLedgerRecord<TPublic = unknown> = IActionLedgerRecord<
  TPublic,
  undefined,
  undefined
> & {
  readonly recordKind: 'normal';
  readonly actorRole: 'player' | 'system';
  readonly status: 'committed';
};

export type ActionLedgerInterventionRecordInput<
  TPrivate = unknown,
  TPublic = unknown,
  TDomainPayload = unknown,
> = IInterventionLedgerRecord<TPrivate, TPublic, TDomainPayload>;
