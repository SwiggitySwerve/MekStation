/**
 * Durable campaign-session restart state.
 *
 * Readiness is a computed projection from live state. A restart must
 * still remember the revision that projection is validated against and
 * the branch the session was on, or it accepts readiness acked against
 * a world that no longer exists / materializes from the wrong lineage.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (9.1)
 */

import { getSQLiteService } from '../persistence/SQLiteService';

export interface ICampaignSessionState {
  readonly campaignId: string;
  readonly sessionId: string;
  readonly readinessRevision: number;
  /** Null means the genesis/default branch. */
  readonly activeBranch: string | null;
}

interface IRow {
  readonly campaign_id: string;
  readonly session_id: string;
  readonly readiness_revision: number;
  readonly active_branch: string | null;
}

function toState(row: IRow): ICampaignSessionState {
  return {
    campaignId: row.campaign_id,
    sessionId: row.session_id,
    readinessRevision: row.readiness_revision,
    activeBranch: row.active_branch,
  };
}

/** The stored restart pair, or null when this session has never been written. */
export function readCampaignSessionState(
  campaignId: string,
  sessionId: string,
): ICampaignSessionState | null {
  const row = getSQLiteService()
    .getDatabase()
    .prepare(
      `SELECT campaign_id, session_id, readiness_revision, active_branch
         FROM campaign_session
        WHERE campaign_id = ? AND session_id = ?`,
    )
    .get(campaignId, sessionId) as IRow | undefined;
  return row === undefined ? null : toState(row);
}

/**
 * Remember both restart fields. Used when a test (or a future writer)
 * needs to set the pair in one statement rather than two upserts.
 */
export function writeCampaignSessionState(input: {
  readonly campaignId: string;
  readonly sessionId: string;
  readonly readinessRevision: number;
  readonly activeBranch: string | null;
}): void {
  getSQLiteService()
    .getDatabase()
    .prepare(
      `INSERT INTO campaign_session
         (campaign_id, session_id, readiness_revision, active_branch)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (campaign_id, session_id) DO UPDATE SET
         readiness_revision = excluded.readiness_revision,
         active_branch = excluded.active_branch`,
    )
    .run(
      input.campaignId,
      input.sessionId,
      input.readinessRevision,
      input.activeBranch,
    );
}

/** Persist a new readiness revision without clobbering the stored branch. */
export function writeCampaignSessionReadinessRevision(input: {
  readonly campaignId: string;
  readonly sessionId: string;
  readonly readinessRevision: number;
}): void {
  getSQLiteService()
    .getDatabase()
    .prepare(
      `INSERT INTO campaign_session
         (campaign_id, session_id, readiness_revision, active_branch)
       VALUES (?, ?, ?, NULL)
       ON CONFLICT (campaign_id, session_id) DO UPDATE SET
         readiness_revision = excluded.readiness_revision`,
    )
    .run(input.campaignId, input.sessionId, input.readinessRevision);
}

/** Persist a new active branch without clobbering the stored revision. */
export function writeCampaignSessionActiveBranch(input: {
  readonly campaignId: string;
  readonly sessionId: string;
  readonly activeBranch: string | null;
}): void {
  getSQLiteService()
    .getDatabase()
    .prepare(
      `INSERT INTO campaign_session
         (campaign_id, session_id, readiness_revision, active_branch)
       VALUES (?, ?, 0, ?)
       ON CONFLICT (campaign_id, session_id) DO UPDATE SET
         active_branch = excluded.active_branch`,
    )
    .run(input.campaignId, input.sessionId, input.activeBranch);
}
