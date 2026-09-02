/**
 * Shared Campaign State — campaign event log persistence contract (CO1).
 *
 * `ICampaignEventStore` is the campaign-tier analogue of the combat
 * `IMatchStore`: an ordered, gap-free, typed, transactionally-appended
 * event log. Per design D2 the campaign event log is a SEPARATE log
 * from the per-match combat event log; the two are linked by id, never
 * merged.
 *
 * The contract is deliberately small and async so a production
 * implementation can persist the log alongside the campaign save
 * (through `add-campaign-persistence`'s store) without leaking
 * persistence details into callers. CO1 ships an in-memory
 * implementation; wiring it to the durable campaign store is mechanical
 * and additive.
 *
 * Key invariants (mirror of `IMatchStore`):
 *   - `appendEvent` is transactional all-or-nothing — a sequence
 *     collision MUST reject with `CampaignEventSequenceCollisionError`
 *     and leave the log untouched.
 *   - `getEvents(campaignId, fromSeq?)` returns events with
 *     `sequence >= fromSeq`, ascending, with no gaps.
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-shared-campaign-state/design.md (D2)
 */

import type {
  ICampaignSessionParticipantPort,
  IEventHistoryBranchPort,
  IParticipantDeliveryCursorPort,
} from '@/lib/events/storeCapabilityPorts';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

/**
 * Thrown when an `appendEvent` call uses a `sequence` number that
 * already exists for the campaign. The campaign-tier analogue of
 * `MatchStoreSequenceCollisionError`. A hard error — the host treats it
 * as a server bug (two concurrent writers to the same campaign).
 */
export class CampaignEventSequenceCollisionError extends Error {
  constructor(
    public readonly campaignId: string,
    public readonly sequence: number,
  ) {
    super(
      `Campaign event sequence collision: campaign ${campaignId} already has an event at sequence ${sequence}`,
    );
    this.name = 'CampaignEventSequenceCollisionError';
  }
}

/**
 * The persistence boundary for the campaign event log.
 *
 * All methods are async so a future durable implementation can use a
 * network / SQLite backend without changing call sites. The in-memory
 * implementation satisfies the contract via `Promise.resolve`.
 */
/**
 * Thrown by the host's D10 pipeline when a committed batch's applied
 * digest diverges from the expected digest committed with it: the
 * projection was rebuilt from the journal, nothing was broadcast, and
 * the committed batch remains untouched in the durable log.
 */
export class CampaignProjectionDivergenceError extends Error {
  constructor(
    public readonly campaignId: string,
    public readonly expectedDigest: string,
    public readonly appliedDigest: string,
  ) {
    super(
      `Campaign projection divergence: campaign ${campaignId} applied digest does not match the committed expected digest`,
    );
    this.name = 'CampaignProjectionDivergenceError';
  }
}

/**
 * The accepted identity and events for one client-originated campaign
 * command. A retry returns this prior receipt without applying or
 * publishing the command again.
 */
export interface ICampaignCommandReceipt {
  readonly commandId: string;
  readonly intentFingerprint: string | null;
  readonly events: readonly ICampaignEvent[];
}

/**
 * Minimal structural result of the optional batch capability — the host
 * switches on `kind` only; richer implementations (the journal store's
 * receipt-carrying result) remain structurally assignable.
 */
export type CampaignCommandBatchResult =
  | { readonly kind: 'committed'; readonly receipt: ICampaignCommandReceipt }
  | { readonly kind: 'sequence-conflict' }
  | {
      readonly kind: 'duplicate-command';
      readonly receipt: ICampaignCommandReceipt;
    }
  | { readonly kind: 'command-identity-conflict'; readonly commandId: string }
  | { readonly kind: 'integrity-conflict' };

/** Durable receipt proving one combat outcome version reached campaign authority. */
export interface ICampaignCombatOutcomeReceipt {
  readonly outcomeId: string;
  readonly outcomeVersion: number;
  readonly campaignId: string;
  readonly commandId: string;
  readonly commandDigest: string;
  readonly firstStreamRevision: number;
  readonly lastStreamRevision: number;
  readonly firstCommitPosition: number;
  readonly lastCommitPosition: number;
  readonly receivedAt: string;
}

/** A different version cannot silently reuse an accepted outcome identity. */
export interface ICampaignOutcomeVersionConflict {
  readonly kind: 'outcome-version-conflict';
  readonly outcomeId: string;
  readonly acceptedVersion: number;
  readonly receivedVersion: number;
}

export type CampaignCombatOutcomeInboxResult =
  | {
      readonly kind: 'committed';
      readonly receipt: ICampaignCombatOutcomeReceipt;
    }
  | {
      readonly kind: 'duplicate';
      readonly receipt: ICampaignCombatOutcomeReceipt;
    }
  | ICampaignOutcomeVersionConflict
  | {
      readonly kind: 'duplicate-command';
      readonly commandId: string;
    }
  | Exclude<
      CampaignCommandBatchResult,
      { readonly kind: 'committed' | 'duplicate-command' }
    >;

/**
 * Optional branch / participant / cursor capabilities. Participant and
 * cursor keys are campaign/session/grant, not matchId — this is a
 * facade so both store boundaries can carry the same ports.
 */
export interface ICampaignEventStore
  extends Partial<IEventHistoryBranchPort>,
    Partial<ICampaignSessionParticipantPort>,
    Partial<IParticipantDeliveryCursorPort> {
  /**
   * Optional D10 batch capability (task 1.2): commit one command's whole
   * contiguous event batch plus its expected post-state digest atomically
   * at the expected head. Both the journal-backed and flag-off in-memory
   * stores provide it so client retry identity is adapter-compatible.
   */
  readonly appendCommandBatch?: (
    campaignId: string,
    input: {
      readonly commandId: string;
      /** Stable fingerprint of the client intent that owns this command id. */
      readonly intentFingerprint?: string | null;
      readonly events: readonly ICampaignEvent[];
      readonly expectedPostStateDigest: string;
    },
  ) => Promise<CampaignCommandBatchResult>;

  /** Return the accepted receipt for a client command id, if one exists. */
  readonly getCommandReceipt?: (
    campaignId: string,
    commandId: string,
  ) => Promise<ICampaignCommandReceipt | null>;

  /** Synchronous receipt lookup for process-local adapters on hot wire paths. */
  readonly getCommandReceiptNow?: (
    campaignId: string,
    commandId: string,
  ) => ICampaignCommandReceipt | null;

  /**
   * Optional durable inbox capability. Capable stores commit the campaign
   * consequence batch and outcome receipt in the same SQLite transaction.
   */
  readonly appendCombatOutcomeBatch?: (
    campaignId: string,
    input: {
      readonly outcomeId: string;
      readonly outcomeVersion: number;
      readonly commandId: string;
      readonly events: readonly ICampaignEvent[];
      readonly expectedPostStateDigest: string;
    },
  ) => Promise<CampaignCombatOutcomeInboxResult>;

  /**
   * Append a single campaign event. Sequence collisions MUST reject
   * with `CampaignEventSequenceCollisionError`. Implementations are
   * responsible for transactional all-or-nothing behaviour — exactly
   * one of two same-sequence appends succeeds.
   */
  appendEvent(campaignId: string, event: ICampaignEvent): Promise<void>;

  /**
   * Return all events for `campaignId` with `sequence >= fromSeq`
   * (default 0), in ascending sequence order with no gaps. An unknown
   * campaign returns an empty list (the log simply has not been written
   * to yet) — there is no "campaign not found" error here because the
   * log is created lazily on first append.
   */
  getEvents(
    campaignId: string,
    fromSeq?: number,
  ): Promise<readonly ICampaignEvent[]>;

  /**
   * The highest sequence number stored for `campaignId`, or `-1` when
   * the log is empty. Used by the host to assign the next sequence and
   * by a resync to decide between a tail stream and a fresh snapshot.
   */
  highestSequence(campaignId: string): Promise<number>;
}
