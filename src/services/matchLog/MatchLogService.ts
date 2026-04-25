/**
 * Match Log Service
 *
 * Per `add-victory-and-post-battle-summary` design D4 / D10:
 * persistence layer for `IPostBattleReport`. Reads/writes the
 * `match_logs` SQLite table introduced in migration v5. Both tactical
 * (interactive) and ACAR (auto-resolve) paths POST through here.
 *
 * Strict version handshake on read — both an unversioned payload
 * (`version` missing from the JSON blob) AND an unknown version
 * (`version !== POST_BATTLE_REPORT_VERSION`) return 400 from the API
 * route per spec scenarios "Unversioned report rejected on read" and
 * "Unknown-version report rejected on read".
 *
 * @spec openspec/changes/add-victory-and-post-battle-summary/specs/after-combat-report/spec.md
 * @spec openspec/changes/add-victory-and-post-battle-summary/design.md (D4, D10)
 */

import { getSQLiteService } from '@/services/persistence/SQLiteService';
import {
  POST_BATTLE_REPORT_VERSION,
  type IPostBattleReport,
} from '@/utils/gameplay/postBattleReport';

// =============================================================================
// Types
// =============================================================================

/**
 * Read-side result discriminator. Lets API consumers distinguish
 * "row missing" from "row exists but version is stale" without
 * passing exception objects through the API boundary.
 */
export type MatchLogReadResult =
  | { readonly kind: 'ok'; readonly report: IPostBattleReport }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'unversioned' }
  | { readonly kind: 'unsupported_version'; readonly version: number };

/**
 * Lightweight row shape returned by the list endpoint (Phase 2 Quick
 * Sim aggregator). Excludes the heavy `payload` blob so list views
 * stay fast.
 */
export interface MatchLogSummary {
  readonly id: string;
  readonly version: number;
  readonly winner: string;
  readonly reason: string;
  readonly turnCount: number;
  readonly createdAt: number;
}

// =============================================================================
// Service
// =============================================================================

/**
 * Persist a derived report to `match_logs`. Idempotent: a second
 * insert for the same `matchId` REPLACEs the row. Returns the
 * `matchId` so the caller can echo it back to the UI.
 *
 * Version validation happens BEFORE the INSERT so a deliberately-
 * malformed report (e.g., synthesized in tests) doesn't pollute the
 * table. We trust the `report.version` field here because callers
 * either built the report via `derivePostBattleReport` (canonical) or
 * fetched it via the GET endpoint (already validated).
 */
export function persistMatchLog(report: IPostBattleReport): string {
  if (report.version !== POST_BATTLE_REPORT_VERSION) {
    throw new Error(
      `unsupported report version ${report.version}, this build supports ${POST_BATTLE_REPORT_VERSION}`,
    );
  }
  const db = getSQLiteService().getDatabase();
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO match_logs
       (id, version, winner, reason, turn_count, payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  stmt.run(
    report.matchId,
    report.version,
    report.winner,
    report.reason,
    report.turnCount,
    JSON.stringify(report),
    Date.now(),
  );
  return report.matchId;
}

/**
 * Read a stored report by id. Returns a tagged union so the API
 * route can pick the correct HTTP status (404 for missing, 400 for
 * version mismatch, 200 for ok).
 *
 * Per design D10: version is validated INSIDE the JSON payload as
 * the read-time authority. The denormalized `version` column is a
 * cheap server-side filter for batch operations; we do NOT trust
 * it as the read authority because the column type lacks the
 * type-narrowing the spec demands.
 */
export function readMatchLog(id: string): MatchLogReadResult {
  const db = getSQLiteService().getDatabase();
  const row = db
    .prepare('SELECT payload FROM match_logs WHERE id = ?')
    .get(id) as { payload: string } | undefined;
  if (!row) return { kind: 'not_found' };

  let parsed: Partial<IPostBattleReport>;
  try {
    parsed = JSON.parse(row.payload) as Partial<IPostBattleReport>;
  } catch {
    // Corrupt JSON in storage — treat as unversioned so the API
    // route returns the same 400 surface as a missing-version blob.
    return { kind: 'unversioned' };
  }
  if (typeof parsed.version !== 'number') {
    return { kind: 'unversioned' };
  }
  if (parsed.version !== POST_BATTLE_REPORT_VERSION) {
    return { kind: 'unsupported_version', version: parsed.version };
  }
  return { kind: 'ok', report: parsed as IPostBattleReport };
}

/**
 * List recent match logs (newest first). Excludes the `payload`
 * blob so the list endpoint stays fast even with thousands of
 * rows. Phase 1 has no callers yet — this is a forward seam for
 * Phase 2 Quick Sim aggregator + a future "recent matches"
 * drawer.
 */
export function listMatchLogs(limit = 50): readonly MatchLogSummary[] {
  const db = getSQLiteService().getDatabase();
  const rows = db
    .prepare(
      `SELECT id, version, winner, reason, turn_count AS turnCount, created_at AS createdAt
         FROM match_logs
         ORDER BY created_at DESC
         LIMIT ?`,
    )
    .all(limit) as MatchLogSummary[];
  return rows;
}
