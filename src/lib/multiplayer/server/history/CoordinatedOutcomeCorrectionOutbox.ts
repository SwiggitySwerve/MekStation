/**
 * One-slot combat-outcome outbox replace for the 17.2-a source saga.
 *
 * `mp_combat_outcome_outbox.match_id` is PRIMARY KEY: one occupant per
 * match, versioned in place. A second INSERT at N+1 is a PK violation
 * once the delivered vN row is there. DurableMatchStore's append-path
 * guard (~874) is a different writer and is not changed here.
 */

import type Database from 'better-sqlite3';

import type {
  IAcceptedCoordinatedOutcomeCorrection,
  IRecordCoordinatedCorrectionSourceInput,
} from './CoordinatedOutcomeCorrectionSaga';

/** One row per match — PK is `match_id`, versioned in place. */
export interface ICombatOutcomeSlot {
  readonly outcomeId: string;
  readonly outcomeVersion: number;
  readonly outcomeJson: string;
}

export function readCombatOutcomeSlot(
  db: Database.Database,
  matchId: string,
): ICombatOutcomeSlot | null {
  const row = db
    .prepare(
      `SELECT outcome_id AS outcomeId, outcome_version AS outcomeVersion,
              outcome_json AS outcomeJson
         FROM mp_combat_outcome_outbox WHERE match_id = ?`,
    )
    .get(matchId) as ICombatOutcomeSlot | undefined;
  return row === undefined ? null : row;
}

/** Slot-keyed: the PK is match_id, not (match_id, outcome, version). */
export function readRecordedOutcomeJson(
  db: Database.Database,
  matchId: string,
): string | null {
  return readCombatOutcomeSlot(db, matchId)?.outcomeJson ?? null;
}

export function classifyOutboxReplacement(
  slot: ICombatOutcomeSlot | null,
  acceptedVersion: number,
  outcomeJson: string,
): 'write' | 'adopt' | 'refuse' {
  if (slot === null) return 'write';
  if (slot.outcomeVersion > acceptedVersion) return 'refuse';
  if (slot.outcomeVersion === acceptedVersion) {
    return slot.outcomeJson === outcomeJson ? 'adopt' : 'refuse';
  }
  return 'write';
}

/**
 * Empty slot → INSERT (pre-delivery; admission already refuses — keep it).
 * Older occupant → UPDATE and clear published_at so a superseded row
 * is never left marked published. Same-or-newer is adopt/refuse above.
 */
export function writeReplacementOutboxSlot(
  db: Database.Database,
  accepted: IAcceptedCoordinatedOutcomeCorrection,
  input: IRecordCoordinatedCorrectionSourceInput,
  slot: ICombatOutcomeSlot | null,
): void {
  if (slot === null) {
    db.prepare(
      `INSERT INTO mp_combat_outcome_outbox
         (match_id, outcome_id, outcome_version, outcome_json,
          created_at, published_at)
       VALUES (?, ?, ?, ?, ?, NULL)`,
    ).run(
      accepted.matchId,
      accepted.outcomeId,
      accepted.outcomeVersion,
      input.outcomeJson,
      input.at,
    );
    return;
  }
  if (slot.outcomeVersion >= accepted.outcomeVersion) return;
  db.prepare(
    `UPDATE mp_combat_outcome_outbox
        SET outcome_id = ?, outcome_version = ?, outcome_json = ?,
            created_at = ?, published_at = NULL
      WHERE match_id = ?`,
  ).run(
    accepted.outcomeId,
    accepted.outcomeVersion,
    input.outcomeJson,
    input.at,
    accepted.matchId,
  );
}
