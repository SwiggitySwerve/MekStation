/**
 * Read-only recovery evidence for E2E-01 / E2E-02.
 *
 * App-DB reads go through fixture.openEvidence so the path is the
 * run-owned one assertRunOwnedPath already validated. Match seats and
 * readiness come from mp_matches.meta_json (IMatchMeta.seats[].ready;
 * there is no campaign_session_state table and no readinessRevision
 * column on IMatchMeta). Cursors use the same mp_viewer_delivery
 * SELECT as the resilience pack's readAuthority.
 */

import { expect, type APIRequestContext } from '@playwright/test';

import { RUN_ID_HEADER } from './gmTwoPlayerMatchFlow';
import {
  parseMatchMetaJson,
  type IMatchSeatEvidence,
} from './matchAuthorityEvidence';

/** Narrow drive surface evidence needs — avoids a circular helper import. */
export interface IRecoveryEvidenceHost {
  readonly fixture: {
    readonly openEvidence: (which: 'app' | 'multiplayer') => {
      readonly select: <T>(
        sql: string,
        params?: readonly unknown[],
      ) => readonly T[];
      readonly fileHash: () => string;
      readonly close: () => void;
    };
  };
  readonly session: {
    readonly campaignId: string;
    readonly matchId: string;
  };
}

/** Reserved creation-mission id from campaignCreationCheckpoint.ts ~58. */
export const CAMPAIGN_CREATION_MISSION_ID = 'campaign-creation';

export const JOURNAL_CUTOVER_FAIL_REASON =
  'red until the journal cutover (task 5.7): no production path writes campaign events to the journal, finding #48';

export interface IParticipantRow {
  readonly campaign_id: string;
  readonly session_id: string;
  readonly participant_id: string;
  readonly seat: string;
  readonly revoked_at: string | null;
}

export interface IBranchRow {
  readonly stream_type: string;
  readonly stream_id: string;
  readonly branch_id: string;
  readonly parent_branch_id: string | null;
  readonly ancestor_depth: number;
  readonly status: string;
}

export interface IForceClaimRow {
  readonly campaign_id: string;
  readonly session_id: string;
  readonly mission_id: string;
  readonly force_id: string;
  readonly participant_id: string;
}

export interface ISeatReadyFlag {
  readonly slotId: string;
  readonly ready: boolean;
}

export interface IOwnershipSnapshot {
  readonly seats: readonly IMatchSeatEvidence[];
  readonly claims: readonly IForceClaimRow[];
  readonly seatReady: readonly ISeatReadyFlag[];
  readonly deliveryCursors: Readonly<Record<string, number>>;
  readonly effectiveBranchId: string | null;
}

export function readParticipants(
  drive: IRecoveryEvidenceHost,
): readonly IParticipantRow[] {
  return selectApp<IParticipantRow>(
    drive,
    `SELECT campaign_id, session_id, participant_id, seat, revoked_at
       FROM campaign_session_participant
       WHERE campaign_id = ? AND session_id = ?
       ORDER BY seat, participant_id`,
    [drive.session.campaignId, drive.session.matchId],
  );
}

export function readGenesisBranches(
  drive: IRecoveryEvidenceHost,
): readonly IBranchRow[] {
  return selectApp<IBranchRow>(
    drive,
    `SELECT stream_type, stream_id, branch_id, parent_branch_id,
            ancestor_depth, status
       FROM event_history_branches
       WHERE stream_type = ? AND stream_id = ?`,
    ['campaign', drive.session.campaignId],
  );
}

export function readForceClaims(
  drive: IRecoveryEvidenceHost,
): readonly IForceClaimRow[] {
  return selectApp<IForceClaimRow>(
    drive,
    `SELECT campaign_id, session_id, mission_id, force_id, participant_id
       FROM campaign_session_force_claim
       WHERE campaign_id = ? AND session_id = ? AND mission_id = ?
       ORDER BY force_id`,
    [
      drive.session.campaignId,
      drive.session.matchId,
      CAMPAIGN_CREATION_MISSION_ID,
    ],
  );
}

export function snapshotOwnership(
  drive: IRecoveryEvidenceHost,
): IOwnershipSnapshot {
  const authority = readMatchAuthority(drive);
  const effective = readGenesisBranches(drive).find(
    (row) => row.status === 'effective',
  );
  return {
    seats: authority.seats,
    claims: readForceClaims(drive),
    seatReady: authority.seats
      .map((seat) => ({ slotId: seat.slotId, ready: seat.ready }))
      .sort((left, right) => left.slotId.localeCompare(right.slotId)),
    deliveryCursors: authority.deliveryCursors,
    effectiveBranchId: effective?.branch_id ?? null,
  };
}

/** Playing seats that still have an occupant or an AI fill. WHY: the letter's two player slots live on IMatchMeta.seats, not campaign_session_participant. */
export function boundPlayingSeats(
  seats: readonly IMatchSeatEvidence[],
): readonly IMatchSeatEvidence[] {
  return seats.filter(
    (seat) =>
      seat.kind !== 'spectator' &&
      (seat.occupantPlayerId !== null || seat.kind === 'ai'),
  );
}

export function readAuthorizedBaseline(drive: IRecoveryEvidenceHost): {
  readonly campaignId: string;
  readonly hasState: boolean;
} {
  const authority = readMatchAuthority(drive);
  return {
    campaignId: authority.coopCampaignId ?? '',
    hasState: authority.hasCoopState,
  };
}

export function readMatchAuthority(drive: IRecoveryEvidenceHost): {
  readonly seats: readonly IMatchSeatEvidence[];
  readonly coopCampaignId: string | null;
  readonly hasCoopState: boolean;
  readonly deliveryCursors: Readonly<Record<string, number>>;
} {
  const evidence = drive.fixture.openEvidence('multiplayer');
  try {
    const before = evidence.fileHash();
    const match = evidence.select<{ metaJson: string }>(
      'SELECT meta_json AS metaJson FROM mp_matches WHERE match_id = ?',
      [drive.session.matchId],
    )[0];
    const cursorRows = evidence.select<{
      playerId: string;
      cursor: number;
    }>(
      `SELECT player_id AS playerId, MAX(delivery_sequence) AS cursor
         FROM mp_viewer_delivery WHERE match_id = ? GROUP BY player_id`,
      [drive.session.matchId],
    );
    expect(evidence.fileHash()).toBe(before);
    const meta = parseRecord(match?.metaJson);
    const parsed = match ? parseMatchMetaJson(match.metaJson) : null;
    const coop = isRecord(meta.coopCampaign) ? meta.coopCampaign : null;
    const cursors: Record<string, number> = {};
    for (const row of cursorRows) cursors[row.playerId] = row.cursor;
    return {
      seats: parsed?.seats ?? [],
      coopCampaignId:
        coop && typeof coop.campaignId === 'string' ? coop.campaignId : null,
      hasCoopState: Boolean(coop && isRecord(coop.state)),
      deliveryCursors: cursors,
    };
  } finally {
    evidence.close();
  }
}

export async function readStoredCampaign(
  request: APIRequestContext,
  campaignId: string,
): Promise<{ readonly campaignId: string; readonly name: string }> {
  const response = await request.get(`/api/campaigns/${campaignId}`, {
    headers: { [RUN_ID_HEADER]: process.env.PLAYWRIGHT_E2E_RUN_ID ?? '' },
  });
  expect(response.status(), await response.text()).toBe(200);
  const body = (await response.json()) as unknown;
  if (!isRecord(body)) throw new Error('Campaign GET was not an object');
  const nested = isRecord(body.body) ? body.body : null;
  const name =
    (nested && typeof nested.name === 'string' && nested.name) ||
    (typeof body.name === 'string' ? body.name : '');
  return {
    campaignId:
      typeof body.campaignId === 'string' ? body.campaignId : campaignId,
    name,
  };
}

export function assertGenesisBranchRecovers(
  drive: IRecoveryEvidenceHost,
): void {
  const rows = readGenesisBranches(drive);
  expect(rows).toHaveLength(1);
  expect(rows[0]?.status).toBe('effective');
  expect(rows[0]?.ancestor_depth).toBe(0);
  expect(rows[0]?.parent_branch_id).toBeNull();
}

export function assertCursorsNotRewound(
  before: Readonly<Record<string, number>>,
  after: Readonly<Record<string, number>>,
): void {
  expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
  for (const playerId of Object.keys(before)) {
    const prior = before[playerId];
    const next = after[playerId];
    if (prior === undefined || next === undefined) {
      throw new Error(`cursor missing for ${playerId}`);
    }
    expect(next).toBeGreaterThanOrEqual(prior);
  }
}

function selectApp<T>(
  drive: IRecoveryEvidenceHost,
  sql: string,
  params: readonly unknown[],
): readonly T[] {
  const evidence = drive.fixture.openEvidence('app');
  try {
    const before = evidence.fileHash();
    const rows = evidence.select<T>(sql, params);
    expect(evidence.fileHash()).toBe(before);
    return rows;
  } finally {
    evidence.close();
  }
}

function parseRecord(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  return isRecord(parsed) ? parsed : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
