/**
 * Server-only durable public application evidence. Receipt issuance and consumer
 * completion belong to the delivery layer; this owner never accepts a wire cut.
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/coop-campaign-sync/spec.md
 */
import type Database from 'better-sqlite3';

import type { IStoredEvent } from '@/lib/events/journal/EventJournalContract';
import type { CampaignProgressionRefusal } from '@/lib/multiplayer/server/CampaignProgressionGate';
import type { ICampaignWireViewer } from '@/lib/multiplayer/server/campaignWireScopeBoundary';
import type { ICampaignSessionMembership } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import type {
  CampaignEventScope,
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import { campaignBranchSegmentReader } from '@/lib/campaign/rebuild/campaignBranchSegmentReader';
import { EventHistoryBranchError } from '@/lib/events/journal/EventHistoryBranchContract';
import {
  materializeBranchPath,
  resolveBranchPath,
} from '@/lib/events/journal/EventHistoryBranchResolver';
import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { selectCampaignMissionLaunches } from '@/lib/multiplayer/server/campaignMissionLaunchReplay';
import { campaignScopeAdmits } from '@/lib/multiplayer/server/campaignWireScopeBoundary';

import { projectCampaignForViewer } from './campaignViewerProjection';
import {
  CAMPAIGN_STREAM_TYPE,
  envelopeOf,
  type ICampaignJournalEnvelope,
} from './JournalCampaignEventStore';

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

export function readCampaignPublicAppliedView(
  db: Database.Database,
  key: ICampaignAppliedViewKey,
): ICampaignPublicAppliedView | null {
  return (
    (db
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

export class CampaignPublicAppliedViewStore {
  constructor(
    private readonly db: Database.Database,
    private readonly ports: ICampaignApplicationPorts,
  ) {}

  read(key: ICampaignAppliedViewKey): ICampaignPublicAppliedView | null {
    return readCampaignPublicAppliedView(this.db, key);
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

export interface ICampaignLaunchKey {
  readonly campaignId: string;
  readonly sessionId: string;
}

/** Strict branch/saga/artifact context. `unavailable` is an unreadable input, never known absence. */
export type CampaignLaunchPrecedence =
  | { readonly kind: 'clear' }
  | {
      readonly kind: 'blocked';
      readonly reason: CampaignProgressionRefusal['reason'];
    }
  | { readonly kind: 'unavailable' };

/** Readers owned by the graph that created the view; `currentDb` is that graph's live handle. */
export interface ICampaignLaunchPorts {
  readonly currentDb: () => Database.Database | null;
  readonly listRoster: (
    campaignId: string,
    sessionId: string,
  ) => readonly ICampaignSessionMembership[];
  readonly readPrecedence: (
    db: Database.Database,
    campaignId: string,
  ) => CampaignLaunchPrecedence;
}

/** One retained participant's public hydration, from the same cut as the verdict. */
export interface ICampaignLaunchHydration {
  readonly participantId: string;
  readonly state: ICampaignAuthoritativeState;
  readonly missionLaunches: readonly ICampaignEvent<'CampaignMissionLaunched'>[];
}

export type CampaignLaunchVerdict =
  | { readonly kind: 'ready' }
  | { readonly kind: 'not-converged'; readonly reason: 'fresh-request' }
  | {
      readonly kind: 'not-converged';
      readonly reason: 'participants-behind';
      readonly participantIds: readonly string[];
    }
  | {
      readonly kind: 'refused';
      readonly reason:
        | CampaignProgressionRefusal['reason']
        | 'evidence-unavailable'
        | 'history-integrity'
        | 'context-mismatch'
        | 'gm-required';
    };

/** Carries no journal position, digest or row fingerprint; the captured inputs stay in this module. */
export interface ICampaignLaunchPreparation {
  readonly verdict: CampaignLaunchVerdict;
  readonly hydration: readonly ICampaignLaunchHydration[];
}

type LaunchInputs = ReturnType<typeof readLaunchInputs>;

const launchCaptures = new WeakMap<
  ICampaignLaunchPreparation,
  {
    readonly db: Database.Database;
    readonly key: ICampaignLaunchKey;
    readonly inputs: string;
  }
>();

const launchRefusal = (
  reason: Extract<CampaignLaunchVerdict, { kind: 'refused' }>['reason'],
): CampaignLaunchVerdict => ({ kind: 'refused', reason });
const launchPreparation = (
  verdict: CampaignLaunchVerdict,
  hydration: readonly ICampaignLaunchHydration[] = [],
): ICampaignLaunchPreparation =>
  Object.freeze({ verdict, hydration: Object.freeze([...hydration]) });
const precedenceRefusal = (
  precedence: Exclude<CampaignLaunchPrecedence, { kind: 'clear' }>,
): CampaignLaunchVerdict =>
  launchRefusal(
    precedence.kind === 'blocked' ? precedence.reason : 'evidence-unavailable',
  );
function integrityRefusal(error: unknown): CampaignLaunchVerdict {
  if (error instanceof EventHistoryBranchError)
    return launchRefusal('history-integrity');
  throw error;
}

/** Every raw input the strict launch snapshot binds, read synchronously on one handle. */
function readLaunchInputs(
  db: Database.Database,
  ports: ICampaignLaunchPorts,
  key: ICampaignLaunchKey,
) {
  const stream = { streamType: CAMPAIGN_STREAM_TYPE, streamId: key.campaignId };
  const branches = new SQLiteEventHistoryBranchStore(db);
  const effective = branches.requireEffectiveHead(stream);
  const head = readEffectiveStreamHead(db, branches, stream);
  const roster = ports.listRoster(key.campaignId, key.sessionId);
  return {
    effectiveGeneration: effective.effectiveGeneration,
    head,
    path: resolveBranchPath(branches, stream, head.branchId, head.revision),
    roster,
    rows: roster.map((member) =>
      readCampaignPublicAppliedView(db, {
        ...key,
        participantId: member.participantId,
      }),
    ),
  };
}

function deriveLaunchView(
  key: ICampaignLaunchKey,
  inputs: LaunchInputs,
  stored: readonly IStoredEvent<ICampaignJournalEnvelope>[],
): ICampaignLaunchPreparation {
  const events = stored.map(envelopeOf);
  const revisionOf = new Map(
    events.map((event, index) => [event, stored[index].streamRevision]),
  );
  // Committed removals come from the whole verified history, before any
  // viewer filter, and apply even before the seat row is healed.
  const removed = new Set(
    events.flatMap((event) =>
      event.type === 'ParticipantRemoved' ? [event.payload.participantId] : [],
    ),
  );
  const retained = inputs.roster.flatMap((member, index) =>
    removed.has(member.participantId) ? [] : [{ member, index }],
  );
  if (!retained.some(({ member }) => member.seat === 'gm'))
    return launchPreparation(launchRefusal('gm-required'));
  const behind: string[] = [];
  const hydration = retained.map(({ member, index }) => {
    const viewer = {
      participantId: member.participantId,
      isGm: member.seat === 'gm',
    };
    const admits = (scope: CampaignEventScope) =>
      campaignScopeAdmits(scope, viewer);
    const { visible, state } = projectCampaignForViewer(
      key.campaignId,
      events,
      admits,
    );
    // A visible no-op is still owed; a hidden-only suffix owes nothing and
    // earns nothing: the row itself must cover the last visible revision.
    const owed = visible.reduce(
      (max, event) => Math.max(max, revisionOf.get(event) ?? 0),
      0,
    );
    const row = inputs.rows[index];
    if (
      row === null ||
      row.branchId !== inputs.head.branchId ||
      row.effectiveGeneration !== inputs.effectiveGeneration ||
      row.viewerAuthorityFingerprint !==
        campaignViewerAuthorityFingerprint(member, viewer) ||
      row.acknowledgedJournalCut < owed ||
      row.acknowledgedJournalCut > inputs.head.revision
    ) {
      behind.push(member.participantId);
    }
    // The launch ceiling is the visible set's own authority sequence, never
    // the journal revision; an empty set selects nothing.
    const ceiling = visible.reduce(
      (max, event) => Math.max(max, event.sequence),
      -Infinity,
    );
    return Object.freeze({
      participantId: member.participantId,
      state,
      missionLaunches: selectCampaignMissionLaunches(visible, ceiling, admits),
    });
  });
  return launchPreparation(
    behind.length === 0
      ? { kind: 'ready' }
      : {
          kind: 'not-converged',
          reason: 'participants-behind',
          participantIds: behind,
        },
    hydration,
  );
}

/**
 * Launch-time public application view. `prepare` captures raw inputs in one
 * short read transaction, then materializes the captured verified path
 * outside SQL. `revalidate` runs synchronously inside the caller's launch
 * transaction on the same handle and refuses any changed input. Neither
 * writes; P2CA alone advances applied rows. The saga lives in another
 * SQLite file, so its recheck detects drift but is not atomic with this one.
 */
export class CampaignLaunchView {
  constructor(
    private readonly db: Database.Database,
    private readonly ports: ICampaignLaunchPorts,
  ) {}

  async prepare(key: ICampaignLaunchKey): Promise<ICampaignLaunchPreparation> {
    if (this.ports.currentDb() !== this.db)
      return launchPreparation(launchRefusal('context-mismatch'));
    let inputs: LaunchInputs;
    let precedence: CampaignLaunchPrecedence;
    let stored: readonly IStoredEvent<ICampaignJournalEnvelope>[];
    try {
      [inputs, precedence] = this.db.transaction(
        () =>
          [
            readLaunchInputs(this.db, this.ports, key),
            this.ports.readPrecedence(this.db, key.campaignId),
          ] as const,
      )();
      if (precedence.kind !== 'clear')
        return launchPreparation(precedenceRefusal(precedence));
      stored = await materializeBranchPath(
        campaignBranchSegmentReader(
          new SQLiteEventJournal<ICampaignJournalEnvelope>(this.db),
        ),
        inputs.path,
      );
    } catch (error) {
      return launchPreparation(integrityRefusal(error));
    }
    if (this.ports.currentDb() !== this.db)
      return launchPreparation(launchRefusal('context-mismatch'));
    const reached =
      stored.at(-1)?.eventDigest ?? inputs.path.segments[0].baseDigest;
    if (reached !== inputs.head.digest)
      return launchPreparation(launchRefusal('history-integrity'));
    const prepared = deriveLaunchView(key, inputs, stored);
    if (prepared.verdict.kind !== 'refused') {
      launchCaptures.set(prepared, {
        db: this.db,
        key,
        inputs: JSON.stringify(inputs),
      });
    }
    return prepared;
  }

  revalidate(
    db: Database.Database,
    prepared: ICampaignLaunchPreparation,
  ): CampaignLaunchVerdict {
    if (prepared.verdict.kind === 'refused') return prepared.verdict;
    const capture = launchCaptures.get(prepared);
    if (
      capture === undefined ||
      capture.db !== this.db ||
      db !== this.db ||
      this.ports.currentDb() !== db ||
      !db.inTransaction
    ) {
      return launchRefusal('context-mismatch');
    }
    const precedence = this.ports.readPrecedence(db, capture.key.campaignId);
    if (precedence.kind !== 'clear') return precedenceRefusal(precedence);
    try {
      if (
        JSON.stringify(readLaunchInputs(db, this.ports, capture.key)) !==
        capture.inputs
      ) {
        return { kind: 'not-converged', reason: 'fresh-request' };
      }
    } catch (error) {
      return integrityRefusal(error);
    }
    return prepared.verdict;
  }
}
