/**
 * Durable per-viewer delivery records (leaf 3.1).
 *
 * The in-memory mapping lives in `ViewerDeliveryCursors`: index is the
 * delivery sequence, value is the authority sequence (-1 for a frame
 * that consumed a number but carried none). This table is that same
 * record on the multiplayer match DB so a rebuilt host can answer a
 * deliveryCursor resume after the process is gone.
 *
 * Resume optimization, not authority. A persist failure must not block
 * or reorder a send; a missing row falls back to a full replay, which
 * is safer than a shifted cursor.
 */

import type Database from 'better-sqlite3';

import { logger } from '@/utils/logger';

import type { ViewerDeliveryPersist } from './projection/ViewerDeliveryCursors';

import {
  hasViewerDeliveryStore,
  type IMatchStore,
  type IViewerDeliveryRecord,
} from './IMatchStore';

const nonempty = (column: string): string => `length(trim(${column})) > 0`;

export const VIEWER_DELIVERY_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS mp_viewer_delivery (
    match_id           TEXT    NOT NULL CHECK (${nonempty('match_id')}),
    player_id          TEXT    NOT NULL CHECK (${nonempty('player_id')}),
    delivery_sequence  INTEGER NOT NULL CHECK (delivery_sequence >= 0),
    authority_sequence INTEGER NOT NULL,
    PRIMARY KEY (match_id, player_id, delivery_sequence),
    FOREIGN KEY (match_id) REFERENCES mp_matches(match_id) ON DELETE CASCADE
  );
`;

interface IViewerDeliveryRow {
  readonly match_id: string;
  readonly player_id: string;
  readonly delivery_sequence: number;
  readonly authority_sequence: number;
}

function recordFrom(row: IViewerDeliveryRow): IViewerDeliveryRecord {
  return {
    matchId: row.match_id,
    playerId: row.player_id,
    deliverySequence: row.delivery_sequence,
    authoritySequence: row.authority_sequence,
  };
}

export function insertViewerDeliveryRecord(
  db: Database.Database,
  record: IViewerDeliveryRecord,
): void {
  db.prepare(
    `INSERT INTO mp_viewer_delivery
       (match_id, player_id, delivery_sequence, authority_sequence)
     VALUES (?, ?, ?, ?)`,
  ).run(
    record.matchId,
    record.playerId,
    record.deliverySequence,
    record.authoritySequence,
  );
}

export function selectViewerDeliveryRecords(
  db: Database.Database,
  matchId: string,
): readonly IViewerDeliveryRecord[] {
  const rows = db
    .prepare(
      `SELECT match_id, player_id, delivery_sequence, authority_sequence
       FROM mp_viewer_delivery
       WHERE match_id = ?
       ORDER BY player_id, delivery_sequence`,
    )
    .all(matchId) as IViewerDeliveryRow[];
  return rows.map(recordFrom);
}

/**
 * Write-through hook for `ViewerDeliveryCursors.assign`. Absent when
 * the store has no delivery port (in-memory tests, socket-only suites).
 */
export function bindViewerDeliveryPersist(
  matchId: string,
  store: IMatchStore,
): ViewerDeliveryPersist | undefined {
  if (!hasViewerDeliveryStore(store)) return undefined;
  return (playerId, deliverySequence, authoritySequence) => {
    void store
      .appendViewerDeliveryRecord({
        matchId,
        playerId,
        deliverySequence,
        authoritySequence,
      })
      .catch((error: unknown) => {
        logger.warn(
          '[ViewerDeliveryCursors] persist failed; a missing row falls back to a full replay, which is safer than a shifted cursor',
          error,
        );
      });
  };
}
