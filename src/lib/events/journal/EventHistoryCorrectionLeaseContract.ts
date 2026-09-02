/**
 * Durable correction-lease records and their typed refusals
 * (add-authoritative-history-branches task 2.1; design D2).
 *
 * A correction lease is the durable permission to rebuild one stream's
 * history: an opaque id, the owner holding it, an expiry, a monotonically
 * increasing fencing epoch, the head the rebuild is bound to, the actor who
 * authorized it, and why. It lives entirely in SQLite, so a host that dies
 * mid-rebuild leaves a stream whose state the next host can read rather
 * than guess at.
 *
 * Two distinctions this module is deliberate about:
 *
 * - **Owner is not actor.** The owner is the process holding the lease -
 *   fencing compares it, and it changes on takeover. The actor is the
 *   principal who authorized the correction - audit reads it, and it
 *   survives a handover. Collapsing them would make a takeover look like a
 *   different GM authorized the same rewind.
 * - **Active is not live.** `active` is a storage state, and a row keeps it
 *   until somebody reaps it. LIVE is the domain question - is this lease
 *   still inside its expiry, measured on an explicit clock - and it is the
 *   only one that decides whether an owner may still act. The store
 *   answers both, separately, and never lets a stale `active` row stand in
 *   for a live lease.
 *
 * Every refusal here is typed. A caller that lost its lease to a takeover,
 * asked while another owner holds one, or bound its build to a head that
 * moved gets the code and (for a stale head) which of the four bound facts
 * broke - never a bare `Error` and never a silent no-op.
 *
 * @spec openspec/changes/add-authoritative-history-branches/specs/event-store/spec.md
 */

import { randomBytes } from 'node:crypto';

/** Storage states a lease row may hold. `active` is the only non-terminal one. */
export const CORRECTION_LEASE_STATES = [
  'active',
  'released',
  'expired',
] as const;

export type CorrectionLeaseState = (typeof CORRECTION_LEASE_STATES)[number];

/** One durable correction lease, exactly as the table holds it. */
export interface IEventHistoryCorrectionLease {
  readonly streamType: string;
  readonly streamId: string;
  readonly leaseId: string;
  readonly owner: string;
  readonly actor: string;
  readonly reason: string;
  readonly fencingEpoch: number;
  readonly expectedBranchId: string;
  readonly expectedRevision: number;
  readonly expectedDigest: string;
  readonly expectedGeneration: number;
  readonly acquiredAtMs: number;
  readonly expiresAtMs: number;
  readonly state: CorrectionLeaseState;
}

/** What an acquirer asks for. The lease id and epoch are minted, never named. */
export interface ICorrectionLeaseRequest {
  readonly streamType: string;
  readonly streamId: string;
  readonly owner: string;
  readonly actor: string;
  readonly reason: string;
  readonly ttlMs: number;
  readonly expectedBranchId: string;
  readonly expectedRevision: number;
  readonly expectedDigest: string;
  readonly expectedGeneration: number;
}

/** A renewal names the lease it holds and how much longer it wants. */
export interface ICorrectionLeaseRenewal {
  readonly leaseId: string;
  readonly owner: string;
  readonly ttlMs: number;
}

/** A release names the lease it holds. */
export interface ICorrectionLeaseHandle {
  readonly leaseId: string;
  readonly owner: string;
}

/**
 * What a resuming owner must present. The epoch is in here on purpose: an
 * owner that restarts after being taken over still knows its own lease id
 * and name, and only the epoch tells it the world moved on.
 */
export interface IHeldCorrectionLease {
  readonly leaseId: string;
  readonly owner: string;
  readonly fencingEpoch: number;
}

/**
 * The clock expiry is measured against. Injected rather than read from
 * `Date.now()` inside the store so a test can hold a lease past its expiry
 * without sleeping, and so a caller can pin one instant across a decision.
 */
export interface IEventHistoryClock {
  nowMs(): number;
}

/** The clock production uses. */
export const SYSTEM_EVENT_HISTORY_CLOCK: IEventHistoryClock = Object.freeze({
  nowMs: (): number => Date.now(),
});

export type EventHistoryCorrectionLeaseErrorCode =
  /** The request itself is malformed; nothing was read or written. */
  | 'invalid-correction-lease-request'
  /** Another (or the same) owner already holds a live lease on this stream. */
  | 'correction-lease-held'
  /** The named lease is not the live one: wrong id, owner, epoch, or expired. */
  | 'stale-correction-lease'
  /** The head the lease would bind to is not the stream's current head. */
  | 'stale-expected-head';

/**
 * Which of the four bound facts broke. Branch, revision and generation come
 * from the shared expected-head comparison; the digest is checked here
 * because a lease binds to a digest the expected-head module does not carry.
 */
export type CorrectionLeaseStaleHeadReason =
  | 'STALE_BRANCH'
  | 'STALE_REVISION'
  | 'STALE_GENERATION'
  | 'STALE_DIGEST';

/** Every refusal in this seam carries one of the codes above. */
export class EventHistoryCorrectionLeaseError extends Error {
  public readonly name = 'EventHistoryCorrectionLeaseError';
  public constructor(
    public readonly code: EventHistoryCorrectionLeaseErrorCode,
    message: string,
    /** Set only for `stale-expected-head`; names which fact moved. */
    public readonly staleHeadReason?: CorrectionLeaseStaleHeadReason,
  ) {
    super(message);
  }
}

/**
 * Mint an opaque 32-char lowercase hex lease id from 16 random bytes.
 *
 * Never derived from the stream, the owner, or the epoch: a derivable id
 * would let a caller name a lease it does not hold, which is precisely what
 * the id exists to prevent.
 */
export function mintCorrectionLeaseId(): string {
  return randomBytes(16).toString('hex');
}

/** True for exactly 64 lowercase hex characters - the journal digest shape. */
function isJournalDigest(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

/**
 * Validate an acquisition request before it reaches storage.
 *
 * The schema repeats every one of these as a CHECK; this is where a caller
 * coming through the store gets a refusal that names the field instead of a
 * SQLite constraint error naming a column.
 */
export function assertValidCorrectionLeaseRequest(
  request: ICorrectionLeaseRequest,
): void {
  const fail = (message: string): never => {
    throw new EventHistoryCorrectionLeaseError(
      'invalid-correction-lease-request',
      message,
    );
  };
  for (const [field, value] of [
    ['streamType', request.streamType],
    ['streamId', request.streamId],
    ['owner', request.owner],
    ['actor', request.actor],
    ['reason', request.reason],
    ['expectedBranchId', request.expectedBranchId],
  ] as const) {
    if (value.trim().length === 0) fail(`${field} must not be empty`);
  }
  assertPositiveTtl(request.ttlMs);
  if (!isJournalDigest(request.expectedDigest)) {
    fail('expectedDigest must be 64 lowercase hex characters');
  }
  if (
    !Number.isSafeInteger(request.expectedRevision) ||
    request.expectedRevision < 0
  ) {
    fail('expectedRevision must be a non-negative safe integer');
  }
  if (
    !Number.isSafeInteger(request.expectedGeneration) ||
    request.expectedGeneration < 1
  ) {
    fail('expectedGeneration must be a positive safe integer');
  }
}

/**
 * A lease must be granted for a whole, positive number of milliseconds.
 * A zero or negative TTL would mint a lease that was never live, which the
 * `expires_at_ms > acquired_at_ms` CHECK also refuses.
 */
export function assertPositiveTtl(ttlMs: number): void {
  if (Number.isSafeInteger(ttlMs) && ttlMs > 0) return;
  throw new EventHistoryCorrectionLeaseError(
    'invalid-correction-lease-request',
    'ttlMs must be a positive safe integer number of milliseconds',
  );
}
