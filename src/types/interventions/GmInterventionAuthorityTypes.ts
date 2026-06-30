import type {
  GmInterventionKind,
  IInterventionLedgerMetadata,
  IInterventionLedgerRecord,
  InterventionDomain,
} from './InterventionLedgerTypes';

export type GmInterventionActorRole = 'gm' | 'player' | 'spectator';

export type GmInterventionAuthorityRejectionCode =
  | 'actor-mismatch'
  | 'gm-role-required'
  | 'state-not-owned';

export interface IGmAuthorityContext {
  readonly actorId: string;
  readonly role: GmInterventionActorRole;
  readonly gameId: string;
  readonly campaignId?: string;
  readonly ownedStateRefs: readonly string[];
}

export interface IGmPrivateMetadata {
  readonly reason: string;
  readonly defaultOutcome?: string;
  readonly hiddenNotes?: string;
  readonly manualTakeoverNotes?: string;
  readonly [key: string]: unknown;
}

export interface IGmPublicEffect {
  readonly summary: string;
  readonly changedStateRefs: readonly string[];
  readonly visibleToPlayerIds?: readonly string[];
  readonly [key: string]: unknown;
}

export interface IGmAuthorityAuthorizedDecision {
  readonly status: 'authorized';
}

export interface IGmAuthorityRejectedDecision {
  readonly status: 'rejected';
  readonly code: GmInterventionAuthorityRejectionCode;
  readonly reason: string;
}

export type GmAuthorityDecision =
  | IGmAuthorityAuthorizedDecision
  | IGmAuthorityRejectedDecision;

export interface IRejectedGmInterventionRequest {
  readonly status: 'rejected';
  readonly code: GmInterventionAuthorityRejectionCode;
  readonly reason: string;
  readonly actorId: string;
  readonly role: GmInterventionActorRole;
  readonly gameId: string;
  readonly campaignId?: string;
  readonly domain: InterventionDomain;
  readonly kind: GmInterventionKind;
  readonly targetRefs: readonly string[];
}

export interface IGmInterventionRedactionEnvelope<
  TPrivate extends IGmPrivateMetadata = IGmPrivateMetadata,
  TPublic extends IGmPublicEffect = IGmPublicEffect,
> {
  readonly privateMetadata: TPrivate;
  readonly publicEffect: TPublic;
}

export interface IPlayerVisibleInterventionRecord<
  TPublic extends IGmPublicEffect = IGmPublicEffect,
> extends IInterventionLedgerMetadata {
  readonly id: string;
  readonly domain: InterventionDomain;
  readonly kind: GmInterventionKind;
  readonly status: IInterventionLedgerRecord['status'];
  readonly actorId: string;
  readonly targetRefs: readonly string[];
  readonly causedBy?: readonly string[];
  readonly supersedes?: readonly string[];
  readonly publicEffect: TPublic;
  readonly createdAt: string;
  readonly approvedAt?: string;
}

export interface IGmVisibleInterventionRecord<
  TPrivate extends IGmPrivateMetadata = IGmPrivateMetadata,
  TPublic extends IGmPublicEffect = IGmPublicEffect,
> extends IPlayerVisibleInterventionRecord<TPublic> {
  readonly privateMetadata: TPrivate;
}
