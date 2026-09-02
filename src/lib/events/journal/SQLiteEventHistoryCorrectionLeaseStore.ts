/**
 * SQLite correction-lease store (add-authoritative-history-branches
 * task 2.1; design D2).
 *
 * Borrowed-handle adapter over migration 24's single table, the same idiom
 * as `SQLiteEventHistoryBranchStore`: it never opens or migrates a
 * database. It owns exactly one question - who may rebuild this stream's
 * history right now, bound to which head, and until when.
 *
 * Four things this store is careful about:
 *
 * - **The expected head is verified, never trusted.** Acquisition compares
 *   the caller's expected branch/revision/generation through PR 1's shared
 *   `validateExpectedBranchHead` rather than a second copy of the rule, and
 *   then compares the digest, which that module deliberately does not
 *   carry. A lease bound to a head the stream does not hold would make
 *   every later comparison a comparison against a fiction.
 * - **Expiry is decided here, on an explicit clock.** The table records
 *   what was promised; whether a lease is still LIVE is a domain decision,
 *   and SQL's `now` is not the domain clock. `readActiveLease` answers the
 *   storage question and `readLiveLease` the domain one - a lapsed `active`
 *   row is never allowed to stand in for a live lease.
 * - **Takeover is expiry plus acquisition, not a third primitive.** A
 *   reaped lease is marked `expired` and the new one is minted at a
 *   strictly higher epoch, in one transaction, so the partial unique index
 *   never sees two active rows and the epoch ladder never reuses a rung.
 * - **Every refusal is typed and appends nothing.** A stale head, a held
 *   lease, a stranger's renewal and a taken-over owner each get their own
 *   code, and each is raised before any write.
 *
 * @spec openspec/changes/add-authoritative-history-branches/specs/event-store/spec.md
 */

import type Database from 'better-sqlite3';

import type { IEventHistoryStreamRef } from './EventHistoryBranchContract';
import type {
  CorrectionLeaseStaleHeadReason,
  ICorrectionLeaseHandle,
  ICorrectionLeaseRenewal,
  ICorrectionLeaseRequest,
  IEventHistoryClock,
  IEventHistoryCorrectionLease,
  IExpectedHeadBinding,
  IHeldCorrectionLease,
} from './EventHistoryCorrectionLeaseContract';
import type { SQLiteEventHistoryBranchStore } from './SQLiteEventHistoryBranchStore';

import { EVENT_HISTORY_GENESIS_DIGEST } from './EventHistoryBranchContract';
import {
  EventHistoryCorrectionLeaseError,
  SYSTEM_EVENT_HISTORY_CLOCK,
  assertPositiveTtl,
  assertValidCorrectionLeaseRequest,
  mintCorrectionLeaseId,
} from './EventHistoryCorrectionLeaseContract';
import { validateExpectedBranchHead } from './EventHistoryExpectedHead';

const LEASE_COLUMNS = `stream_type AS streamType, stream_id AS streamId, lease_id AS leaseId, owner, actor, reason, fencing_epoch AS fencingEpoch, expected_branch_id AS expectedBranchId, expected_revision AS expectedRevision, expected_digest AS expectedDigest, expected_generation AS expectedGeneration, acquired_at_ms AS acquiredAtMs, expires_at_ms AS expiresAtMs, state`;

/** The journal head a stream answers from, or genesis when it has none. */
interface IJournalHead {
  readonly revision: number;
  readonly digest: string;
}

export class SQLiteEventHistoryCorrectionLeaseStore {
  public constructor(
    private readonly db: Database.Database,
    private readonly branches: SQLiteEventHistoryBranchStore,
    private readonly clock: IEventHistoryClock = SYSTEM_EVENT_HISTORY_CLOCK,
  ) {}

  /**
   * Acquire the stream's correction lease, reaping an expired one on the
   * way if there is one. Refuses while a live lease is held - by anyone,
   * the asker included, because two live leases on one stream is exactly
   * the state the fencing epoch exists to make impossible.
   */
  public acquireCorrectionLease(
    request: ICorrectionLeaseRequest,
  ): IEventHistoryCorrectionLease {
    assertValidCorrectionLeaseRequest(request);
    const stream = {
      streamType: request.streamType,
      streamId: request.streamId,
    };
    // One transaction: the head comparison, the reap, and the mint have to
    // agree about the same instant, and the partial unique index must never
    // see the reaped row and the new one both active.
    return this.db.transaction((): IEventHistoryCorrectionLease => {
      this.assertExpectedHeadIsCurrent(stream, request);
      const now = this.clock.nowMs();
      const active = this.readActiveLease(stream);
      if (active !== null) {
        if (active.expiresAtMs > now) {
          throw new EventHistoryCorrectionLeaseError(
            'correction-lease-held',
            `Stream ${stream.streamType}/${stream.streamId} is already leased to '${active.owner}' until ${active.expiresAtMs}`,
          );
        }
        this.markLeaseTerminal(stream, active.leaseId, 'expired');
      }
      const leaseId = mintCorrectionLeaseId();
      this.db
        .prepare(
          `INSERT INTO event_history_correction_leases (
             stream_type, stream_id, lease_id, owner, actor, reason,
             fencing_epoch, expected_branch_id, expected_revision,
             expected_digest, expected_generation, acquired_at_ms,
             expires_at_ms, state
           ) VALUES (
             @streamType, @streamId, @leaseId, @owner, @actor, @reason,
             @fencingEpoch, @expectedBranchId, @expectedRevision,
             @expectedDigest, @expectedGeneration, @acquiredAtMs,
             @expiresAtMs, 'active')`,
        )
        .run({
          ...request,
          leaseId,
          fencingEpoch: this.nextFencingEpoch(stream),
          acquiredAtMs: now,
          expiresAtMs: now + request.ttlMs,
        });
      return this.requireLeaseRow(stream, leaseId);
    })();
  }

  /**
   * Extend a live lease's expiry. The fencing epoch is preserved (design
   * D2): a renewal is the same permission lasting longer, not a new one,
   * and minting an epoch here would fence a build against itself.
   */
  public renewCorrectionLease(
    stream: IEventHistoryStreamRef,
    renewal: ICorrectionLeaseRenewal,
  ): IEventHistoryCorrectionLease {
    assertPositiveTtl(renewal.ttlMs);
    return this.db.transaction((): IEventHistoryCorrectionLease => {
      const live = this.readLiveLease(stream);
      if (
        live === null ||
        live.leaseId !== renewal.leaseId ||
        live.owner !== renewal.owner
      ) {
        throw this.staleLease(stream, renewal.leaseId, renewal.owner);
      }
      const expiresAtMs = this.clock.nowMs() + renewal.ttlMs;
      if (expiresAtMs < live.expiresAtMs) {
        // Refused rather than clamped: silently keeping the longer expiry
        // would tell the caller its shorter renewal took effect.
        throw new EventHistoryCorrectionLeaseError(
          'invalid-correction-lease-request',
          `A renewal may only extend; ${expiresAtMs} is before the current expiry ${live.expiresAtMs}`,
        );
      }
      this.db
        .prepare(
          `UPDATE event_history_correction_leases SET expires_at_ms = ?
           WHERE stream_type = ? AND stream_id = ? AND lease_id = ?
             AND state = 'active'`,
        )
        .run(expiresAtMs, stream.streamType, stream.streamId, live.leaseId);
      return this.requireLeaseRow(stream, live.leaseId);
    })();
  }

  /**
   * Give up a live lease. The row stays as `released` rather than being
   * deleted, so its epoch stays spent and the next acquirer still climbs.
   */
  public releaseCorrectionLease(
    stream: IEventHistoryStreamRef,
    handle: ICorrectionLeaseHandle,
  ): void {
    this.db.transaction((): void => {
      const live = this.readLiveLease(stream);
      if (
        live === null ||
        live.leaseId !== handle.leaseId ||
        live.owner !== handle.owner
      ) {
        throw this.staleLease(stream, handle.leaseId, handle.owner);
      }
      this.markLeaseTerminal(stream, live.leaseId, 'released');
    })();
  }

  /** The row storage calls active, live or not. */
  public readActiveLease(
    stream: IEventHistoryStreamRef,
  ): IEventHistoryCorrectionLease | null {
    const row = this.db
      .prepare(
        `SELECT ${LEASE_COLUMNS} FROM event_history_correction_leases
         WHERE stream_type = ? AND stream_id = ? AND state = 'active'`,
      )
      .get(stream.streamType, stream.streamId) as
      | IEventHistoryCorrectionLease
      | undefined;
    return row ?? null;
  }

  /**
   * The lease that may still act: active AND inside its expiry on this
   * store's clock. An expiry that has arrived is expired, not "about to
   * be" - the boundary belongs to the next acquirer.
   */
  public readLiveLease(
    stream: IEventHistoryStreamRef,
  ): IEventHistoryCorrectionLease | null {
    const active = this.readActiveLease(stream);
    if (active === null) return null;
    return active.expiresAtMs > this.clock.nowMs() ? active : null;
  }

  /**
   * The lease an owner claims to hold, or a typed refusal. This is the
   * restart-recovery gate: a host resuming after a crash proves it still
   * holds the lease by naming the id, the owner, AND the epoch. Only the
   * epoch reveals a takeover, because an owner that was taken over still
   * remembers its own id and name.
   */
  public requireLiveLease(
    stream: IEventHistoryStreamRef,
    held: IHeldCorrectionLease,
  ): IEventHistoryCorrectionLease {
    const live = this.readLiveLease(stream);
    if (
      live === null ||
      live.leaseId !== held.leaseId ||
      live.owner !== held.owner ||
      live.fencingEpoch !== held.fencingEpoch
    ) {
      throw this.staleLease(stream, held.leaseId, held.owner);
    }
    return live;
  }

  /** The next rung: `MAX + 1` over the stream, terminal rows included. */
  private nextFencingEpoch(stream: IEventHistoryStreamRef): number {
    const row = this.db
      .prepare(
        `SELECT COALESCE(MAX(fencing_epoch), 0) + 1 AS epoch
         FROM event_history_correction_leases
         WHERE stream_type = ? AND stream_id = ?`,
      )
      .get(stream.streamType, stream.streamId) as { readonly epoch: number };
    return row.epoch;
  }

  /** Read one lease row by identity, refusing when it is not there. */
  private requireLeaseRow(
    stream: IEventHistoryStreamRef,
    leaseId: string,
  ): IEventHistoryCorrectionLease {
    const row = this.db
      .prepare(
        `SELECT ${LEASE_COLUMNS} FROM event_history_correction_leases
         WHERE stream_type = ? AND stream_id = ? AND lease_id = ?`,
      )
      .get(stream.streamType, stream.streamId, leaseId) as
      | IEventHistoryCorrectionLease
      | undefined;
    if (row === undefined) throw this.staleLease(stream, leaseId, null);
    return row;
  }

  /** Move an active lease to a terminal state. */
  private markLeaseTerminal(
    stream: IEventHistoryStreamRef,
    leaseId: string,
    state: 'released' | 'expired',
  ): void {
    this.db
      .prepare(
        `UPDATE event_history_correction_leases SET state = ?
         WHERE stream_type = ? AND stream_id = ? AND lease_id = ?
           AND state = 'active'`,
      )
      .run(state, stream.streamType, stream.streamId, leaseId);
  }

  /**
   * Verify the four facts a correction binds to, against the live head.
   *
   * Public because it is asked TWICE: once here when the lease is acquired,
   * and again when the candidate is built, because a head that moved in
   * between would leave the build anchored to history that is no longer
   * there. One verifier, so the two moments cannot disagree.
   *
   * Branch, revision and generation go through PR 1's shared expected-head
   * comparison - not a restated copy - so the lease and an ordinary command
   * can never disagree about what "stale" means. The digest is compared
   * here because that module carries branch/revision/generation only.
   */
  public assertExpectedHeadIsCurrent(
    stream: IEventHistoryStreamRef,
    binding: IExpectedHeadBinding,
  ): void {
    const head = this.readJournalHead(stream);
    const verdict = validateExpectedBranchHead(
      this.branches,
      stream,
      head.revision,
      {
        branchId: binding.expectedBranchId,
        revision: binding.expectedRevision,
        effectiveGeneration: binding.expectedGeneration,
      },
    );
    if (verdict.kind === 'refused') {
      throw this.staleHead(
        verdict.code,
        `Correction would bind to ${verdict.code} on branch '${binding.expectedBranchId}' at revision ${binding.expectedRevision}`,
      );
    }
    if (binding.expectedDigest !== head.digest) {
      throw this.staleHead(
        'STALE_DIGEST',
        `Correction would bind to digest '${binding.expectedDigest}' but the head holds '${head.digest}'`,
      );
    }
  }

  /**
   * The journal's revision and digest for this stream. A stream with no
   * events yet has no head row; it sits at revision 0 on the genesis
   * digest, which is the same "nothing has happened yet" a root branch
   * records - not an error and not a missing head.
   */
  private readJournalHead(stream: IEventHistoryStreamRef): IJournalHead {
    const row = this.db
      .prepare(
        `SELECT stream_revision AS revision, event_digest AS digest
         FROM event_journal_stream_heads
         WHERE stream_type = ? AND stream_id = ?`,
      )
      .get(stream.streamType, stream.streamId) as IJournalHead | undefined;
    return row ?? { revision: 0, digest: EVENT_HISTORY_GENESIS_DIGEST };
  }

  private staleHead(
    reason: CorrectionLeaseStaleHeadReason,
    message: string,
  ): EventHistoryCorrectionLeaseError {
    return new EventHistoryCorrectionLeaseError(
      'stale-expected-head',
      message,
      reason,
    );
  }

  private staleLease(
    stream: IEventHistoryStreamRef,
    leaseId: string,
    owner: string | null,
  ): EventHistoryCorrectionLeaseError {
    return new EventHistoryCorrectionLeaseError(
      'stale-correction-lease',
      `Lease '${leaseId}'${owner === null ? '' : ` held by '${owner}'`} is not the live lease on ${stream.streamType}/${stream.streamId}`,
    );
  }
}
