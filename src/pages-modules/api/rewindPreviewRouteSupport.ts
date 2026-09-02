/**
 * Request-shape and status helpers for the rewind-preview route.
 * Kept out of the handler file so the write-after-preview path can
 * stay there without pushing that file over the size budget.
 */

import type { NextApiResponse } from 'next';

import type { IEventHistoryStreamRef } from '@/lib/events/journal/EventHistoryBranchContract';
import type { GmCombatRewindPreviewResult } from '@/lib/multiplayer/server/history/GmCombatRewindPreview';
import type { IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';
import type { IGameState } from '@/types/gameplay/GameSessionInterfaces';

import { getSQLiteService } from '@/services/persistence/SQLiteService';

export interface IPreviewBody {
  readonly targetRevision: number;
  readonly expectedBranchId: string;
  readonly expectedRevision: number;
  readonly expectedDigest: string;
  readonly expectedGeneration: number;
}

/**
 * The state fog-of-war filtering would read. Never reached: the handler
 * refuses a fogged match before building the probe, and with fog off
 * each event is returned before state is touched. The refusal is what
 * makes this placeholder honest.
 */
export const FOG_DISABLED_STATE = Object.freeze({}) as IGameState;

export function isPreviewBody(value: unknown): value is IPreviewBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Partial<IPreviewBody>;
  return (
    Number.isSafeInteger(body.targetRevision) &&
    (body.targetRevision as number) >= 0 &&
    typeof body.expectedBranchId === 'string' &&
    body.expectedBranchId.trim().length > 0 &&
    Number.isSafeInteger(body.expectedRevision) &&
    typeof body.expectedDigest === 'string' &&
    Number.isSafeInteger(body.expectedGeneration)
  );
}

/**
 * The journal revision the effective branch answers at, read NAMING that
 * branch (finding #81). An unqualified read is exact only while a stream
 * has one head row; a candidate then returns an arbitrary row.
 */
export function readEffectiveRevision(
  stream: IEventHistoryStreamRef,
  branchId: string,
): number {
  const row = getSQLiteService()
    .getDatabase()
    .prepare(
      `SELECT stream_revision AS revision
         FROM event_journal_stream_heads
        WHERE stream_type = ? AND stream_id = ? AND branch_id = ?`,
    )
    .get(stream.streamType, stream.streamId, branchId) as
    | { readonly revision: number }
    | undefined;
  return row?.revision ?? 0;
}

/** Every audience the probe can be asked about, in its own vocabulary. */
export function viewerIdsFor(meta: IMatchMeta): readonly string[] {
  return ['gm', ...meta.playerIds.map((playerId) => `player:${playerId}`)];
}

export function refused(
  res: NextApiResponse,
  status: number,
  result: GmCombatRewindPreviewResult,
): void {
  res.status(status).json(result);
}

/** 403 for the authority arms, 404 for a stream we hold nothing for. */
export function statusForRefusal(
  reason: Extract<GmCombatRewindPreviewResult, { kind: 'refused' }>['reason'],
): number {
  if (
    reason === 'gm-role-required' ||
    reason === 'actor-mismatch' ||
    reason === 'state-not-owned'
  ) {
    return 403;
  }
  return reason === 'no-authoritative-history' ? 404 : 409;
}
