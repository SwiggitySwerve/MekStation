/**
 * SQLite delivery-epoch store (authority-audit PR 7, design D2).
 *
 * Borrowed-handle adapter over the v13 delivery_epoch,
 * delivery_event_mapping, and delivery_generation tables. Epoch ids are
 * minted here from crypto randomness. Viewer methods brand-check first
 * and derive the complete 8-tuple from the viewer; request objects
 * never carry principal, participant, session, or revision.
 *
 * Sequence assignment is one IMMEDIATE transaction: reuse an existing
 * (epoch, identity) mapping or allocate MAX(sequence)+1 starting at 1.
 * A thrown transaction rolls back every new row, so failed work leaves
 * no reserved gap. Timestamps come from the injected clock.
 *
 * Server-internal only. Not wired into live socket or route paths;
 * PR 8 owns that seam.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/gm-authority-redaction/spec.md
 */

import type Database from 'better-sqlite3';

import type { IAuthorizedViewer } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';

import {
  assertAuthorizedViewer,
  assertDeliveryCursor,
  assertDeliveryEpochRequest,
  assertNonemptyIdentity,
  deriveEpochTuple,
  epochRowMatchesTuple,
  generateOpaqueEpochId,
  hydrateMappingRow,
  isIdentityUniqueViolation,
  isNonempty,
  isOpaqueEpochId,
  isSequenceUniqueViolation,
  isUniqueViolation,
  staleEpochResult,
  MAX_EPOCH_ID_ATTEMPTS,
  MAX_SEQUENCE_ALLOC_ATTEMPTS,
  type IDeliveryEpochRow,
  type IDeliveryEpochTuple,
  type IDeliveryMappingRow,
} from './deliveryEpochGuards';
import {
  DELIVERY_EPOCH_MESSAGES,
  DeliveryEpochError,
  type DeliveryCursorValidation,
  type DeliveryEpochClock,
  type IDeliveryCursor,
  type IDeliveryEpochBaseline,
  type IDeliveryEpochRequest,
  type IDeliveryEpochStore,
  type IDeliveryMapping,
  type IDeliverySequenceAssignment,
} from './IDeliveryEpochStore';

const EPOCH_COLUMNS = `delivery_epoch_id, principal_id, campaign_session_id,
  participant_id, membership_revision, stream_type, stream_id,
  projector_version, effective_generation, created_at`;

const INSERT_EPOCH_SQL = `INSERT INTO delivery_epoch (
  delivery_epoch_id, principal_id, campaign_session_id, participant_id,
  membership_revision, stream_type, stream_id, projector_version,
  effective_generation, created_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const INSERT_MAPPING_SQL = `INSERT INTO delivery_event_mapping (
  delivery_epoch_id, projected_event_identity, delivery_sequence, created_at
) VALUES (?, ?, ?, ?)`;

export class SQLiteDeliveryEpochStore implements IDeliveryEpochStore {
  /**
   * Binds a borrowed SQLite handle and an injected clock. The clock
   * MUST return a nonempty timestamp string; the store never reads
   * the system clock.
   */
  public constructor(
    private readonly db: Database.Database,
    private readonly clock: DeliveryEpochClock,
  ) {}

  /**
   * Resolves the opaque epoch for the viewer's current 8-tuple.
   * Creates the row atomically when missing; a UNIQUE race re-reads
   * the winner so concurrent resolve calls share one id.
   */
  public resolveEpoch(
    viewer: IAuthorizedViewer,
    request: IDeliveryEpochRequest,
  ): IDeliveryEpochBaseline {
    const authorized = assertAuthorizedViewer(viewer);
    assertDeliveryEpochRequest(request);
    const createdAt = this.requireTimestamp();
    return this.db.transaction((): IDeliveryEpochBaseline => {
      const generation = this.readGeneration(
        authorized.campaignSessionId,
        request.streamType,
        request.streamId,
      );
      const tuple = deriveEpochTuple(authorized, request, generation);
      const existing = this.loadEpochByTuple(tuple);
      if (existing !== null) {
        return this.toBaseline(existing);
      }
      return this.insertEpochOrReload(tuple, createdAt);
    })();
  }

  /**
   * Freshly derives the current tuple, loads the cursor's epoch row,
   * and compares. Unknown ids and any component mismatch return one
   * stale-epoch shape whose baseline is the caller's own current epoch
   * (safe to hand back; never names the foreign row).
   */
  public validateCursor(
    viewer: IAuthorizedViewer,
    request: IDeliveryEpochRequest,
    cursor: IDeliveryCursor,
  ): DeliveryCursorValidation {
    const authorized = assertAuthorizedViewer(viewer);
    assertDeliveryEpochRequest(request);
    assertDeliveryCursor(cursor);
    const generation = this.readGeneration(
      authorized.campaignSessionId,
      request.streamType,
      request.streamId,
    );
    const tuple = deriveEpochTuple(authorized, request, generation);
    const row = this.loadEpochById(cursor.deliveryEpochId);
    if (row !== null && epochRowMatchesTuple(row, tuple)) {
      return { kind: 'valid' };
    }
    return staleEpochResult(this.resolveEpoch(authorized, request));
  }

  /**
   * Assigns gapless sequences for the given identities in one IMMEDIATE
   * transaction. Existing mappings are reused. New identities take
   * MAX(sequence)+1 starting at 1. A throw rolls the whole batch back
   * so a failed attempt reserves no gap.
   */
  public assignSequences(
    deliveryEpochId: string,
    projectedEventIdentities: readonly string[],
  ): readonly IDeliverySequenceAssignment[] {
    if (!isNonempty(deliveryEpochId)) {
      throw new DeliveryEpochError(
        'invalid-request',
        DELIVERY_EPOCH_MESSAGES.invalidRequest,
      );
    }
    const createdAt = this.requireTimestamp();
    const run = this.db.transaction(
      (): readonly IDeliverySequenceAssignment[] => {
        this.requireEpoch(deliveryEpochId);
        const assigned: IDeliverySequenceAssignment[] = [];
        for (const identity of projectedEventIdentities) {
          assigned.push(this.allocateOne(deliveryEpochId, identity, createdAt));
        }
        return Object.freeze(assigned);
      },
    );
    return run.immediate();
  }

  /**
   * Reads mappings with delivery_sequence greater than afterSequence,
   * ascending. Returns durable identities only; journal positions never
   * appear on the row.
   */
  public readMappings(
    deliveryEpochId: string,
    afterSequence: number,
    limit: number,
  ): readonly IDeliveryMapping[] {
    if (!isNonempty(deliveryEpochId)) {
      throw new DeliveryEpochError(
        'invalid-request',
        DELIVERY_EPOCH_MESSAGES.invalidRequest,
      );
    }
    if (!Number.isSafeInteger(afterSequence) || afterSequence < 0) {
      throw new DeliveryEpochError(
        'invalid-request',
        DELIVERY_EPOCH_MESSAGES.invalidRequest,
      );
    }
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new DeliveryEpochError(
        'invalid-request',
        DELIVERY_EPOCH_MESSAGES.invalidRequest,
      );
    }
    const rows = this.db
      .prepare(
        `SELECT projected_event_identity, delivery_sequence
         FROM delivery_event_mapping
         WHERE delivery_epoch_id = ? AND delivery_sequence > ?
         ORDER BY delivery_sequence ASC
         LIMIT ?`,
      )
      .all(deliveryEpochId, afterSequence, limit) as IDeliveryMappingRow[];
    return Object.freeze(rows.map((row) => hydrateMappingRow(row)));
  }

  /**
   * Advances effective generation by exactly 1 for the stream triple.
   * Absent rows mean implicit generation 1: INSERT 1 then UPDATE +1 in
   * one transaction so the first explicit rebaseline is 2. After this
   * returns, resolveEpoch derives a new tuple and a new opaque epoch.
   */
  public bumpGeneration(
    campaignSessionId: string,
    streamType: string,
    streamId: string,
  ): number {
    assertNonemptyIdentity(campaignSessionId);
    assertNonemptyIdentity(streamType);
    assertNonemptyIdentity(streamId);
    return this.db.transaction((): number => {
      this.db
        .prepare(
          `INSERT OR IGNORE INTO delivery_generation (
             campaign_session_id, stream_type, stream_id, effective_generation
           ) VALUES (?, ?, ?, 1)`,
        )
        .run(campaignSessionId, streamType, streamId);
      this.db
        .prepare(
          `UPDATE delivery_generation
           SET effective_generation = effective_generation + 1
           WHERE campaign_session_id = ? AND stream_type = ? AND stream_id = ?`,
        )
        .run(campaignSessionId, streamType, streamId);
      return this.readGeneration(campaignSessionId, streamType, streamId);
    })();
  }

  /**
   * Reads the persisted generation, or 1 when no row exists. Default 1
   * is implicit so unused streams do not write a generation row.
   */
  private readGeneration(
    campaignSessionId: string,
    streamType: string,
    streamId: string,
  ): number {
    const row = this.db
      .prepare(
        `SELECT effective_generation AS generation FROM delivery_generation
         WHERE campaign_session_id = ? AND stream_type = ? AND stream_id = ?`,
      )
      .get(campaignSessionId, streamType, streamId) as
      | { generation: number }
      | undefined;
    return row === undefined ? 1 : row.generation;
  }

  /** SELECT by opaque id; returns null when absent. */
  private loadEpochById(deliveryEpochId: string): IDeliveryEpochRow | null {
    const row = this.db
      .prepare(
        `SELECT ${EPOCH_COLUMNS} FROM delivery_epoch WHERE delivery_epoch_id = ?`,
      )
      .get(deliveryEpochId) as IDeliveryEpochRow | undefined;
    return row === undefined ? null : row;
  }

  /** SELECT by the complete 8-tuple; returns null when absent. */
  private loadEpochByTuple(
    tuple: IDeliveryEpochTuple,
  ): IDeliveryEpochRow | null {
    const row = this.db
      .prepare(
        `SELECT ${EPOCH_COLUMNS} FROM delivery_epoch
         WHERE principal_id = ? AND campaign_session_id = ?
           AND participant_id = ? AND membership_revision = ?
           AND stream_type = ? AND stream_id = ?
           AND projector_version = ? AND effective_generation = ?`,
      )
      .get(
        tuple.principalId,
        tuple.campaignSessionId,
        tuple.participantId,
        tuple.membershipRevision,
        tuple.streamType,
        tuple.streamId,
        tuple.projectorVersion,
        tuple.effectiveGeneration,
      ) as IDeliveryEpochRow | undefined;
    return row === undefined ? null : row;
  }

  /**
   * Inserts a minted opaque id for `tuple`. Id collisions retry mint.
   * Tuple UNIQUE races reload the winner. Constraint: the id is never
   * computed from key material.
   */
  private insertEpochOrReload(
    tuple: IDeliveryEpochTuple,
    createdAt: string,
  ): IDeliveryEpochBaseline {
    for (let attempt = 0; attempt < MAX_EPOCH_ID_ATTEMPTS; attempt += 1) {
      const deliveryEpochId = generateOpaqueEpochId();
      if (!isOpaqueEpochId(deliveryEpochId)) {
        continue;
      }
      try {
        this.db
          .prepare(INSERT_EPOCH_SQL)
          .run(
            deliveryEpochId,
            tuple.principalId,
            tuple.campaignSessionId,
            tuple.participantId,
            tuple.membershipRevision,
            tuple.streamType,
            tuple.streamId,
            tuple.projectorVersion,
            tuple.effectiveGeneration,
            createdAt,
          );
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        const raced = this.loadEpochByTuple(tuple);
        if (raced !== null) return this.toBaseline(raced);
        continue;
      }
      const created = this.loadEpochById(deliveryEpochId);
      if (created === null) {
        throw new DeliveryEpochError(
          'invalid-request',
          DELIVERY_EPOCH_MESSAGES.invalidRequest,
        );
      }
      return this.toBaseline(created);
    }
    throw new DeliveryEpochError(
      'invalid-request',
      DELIVERY_EPOCH_MESSAGES.invalidRequest,
    );
  }

  /**
   * Reuses an existing mapping or inserts MAX+1. Identity UNIQUE races
   * re-read and reuse. Sequence UNIQUE races retry allocation inside
   * this loop so a colliding slot is never left reserved.
   */
  private allocateOne(
    deliveryEpochId: string,
    identity: string,
    createdAt: string,
  ): IDeliverySequenceAssignment {
    assertNonemptyIdentity(identity);
    const existing = this.loadMapping(deliveryEpochId, identity);
    if (existing !== null) {
      return Object.freeze({
        projectedEventIdentity: identity,
        deliverySequence: existing.delivery_sequence,
        reused: true,
      });
    }
    for (let attempt = 0; attempt < MAX_SEQUENCE_ALLOC_ATTEMPTS; attempt += 1) {
      const next = this.nextSequence(deliveryEpochId);
      try {
        this.db
          .prepare(INSERT_MAPPING_SQL)
          .run(deliveryEpochId, identity, next, createdAt);
      } catch (error) {
        if (isIdentityUniqueViolation(error)) {
          const raced = this.loadMapping(deliveryEpochId, identity);
          if (raced !== null) {
            return Object.freeze({
              projectedEventIdentity: identity,
              deliverySequence: raced.delivery_sequence,
              reused: true,
            });
          }
        }
        if (isSequenceUniqueViolation(error)) continue;
        throw error;
      }
      return Object.freeze({
        projectedEventIdentity: identity,
        deliverySequence: next,
        reused: false,
      });
    }
    throw new DeliveryEpochError(
      'invalid-request',
      DELIVERY_EPOCH_MESSAGES.invalidRequest,
    );
  }

  /** Next gapless sequence for the epoch: 1 when no rows exist. */
  private nextSequence(deliveryEpochId: string): number {
    const row = this.db
      .prepare(
        `SELECT MAX(delivery_sequence) AS maxSeq FROM delivery_event_mapping
         WHERE delivery_epoch_id = ?`,
      )
      .get(deliveryEpochId) as { maxSeq: number | null };
    return (row.maxSeq ?? 0) + 1;
  }

  /** SELECT mapping by epoch plus identity; null when absent. */
  private loadMapping(
    deliveryEpochId: string,
    identity: string,
  ): IDeliveryMappingRow | null {
    const row = this.db
      .prepare(
        `SELECT projected_event_identity, delivery_sequence
         FROM delivery_event_mapping
         WHERE delivery_epoch_id = ? AND projected_event_identity = ?`,
      )
      .get(deliveryEpochId, identity) as IDeliveryMappingRow | undefined;
    return row === undefined ? null : row;
  }

  /** Refuses assignment against an id that was never resolved. */
  private requireEpoch(deliveryEpochId: string): void {
    if (this.loadEpochById(deliveryEpochId) === null) {
      throw new DeliveryEpochError(
        'invalid-request',
        DELIVERY_EPOCH_MESSAGES.invalidRequest,
      );
    }
  }

  /** Maps a stored epoch row onto the public baseline (id + generation). */
  private toBaseline(row: IDeliveryEpochRow): IDeliveryEpochBaseline {
    return Object.freeze({
      deliveryEpochId: row.delivery_epoch_id,
      effectiveGeneration: row.effective_generation,
    });
  }

  /** Reads the injected clock and refuses a blank timestamp. */
  private requireTimestamp(): string {
    const createdAt = this.clock();
    if (!isNonempty(createdAt)) {
      throw new DeliveryEpochError(
        'invalid-request',
        DELIVERY_EPOCH_MESSAGES.invalidRequest,
      );
    }
    return createdAt;
  }
}
