/**
 * Deps the rewind-commit ROUTE hands the history module.
 *
 * Extracted so the handler stays an HTTP adapter: method, body, brand,
 * status. The module must not open a database or read the clock; the
 * route is the one place allowed to supply `nowIso`.
 *
 * Verification is identity-over-`GameEventType` on purpose. The match
 * store reader carries the WHOLE `IGameEvent` as payload (finding #48).
 * The baseline pack parses the inner payload shape and would refuse
 * every live match. The census projector still decides every
 * discriminant, so an unknown type fails closed rather than projecting
 * a partial state.
 */

import type { IEventHistoryStreamRef } from '@/lib/events/journal/EventHistoryBranchContract';
import type { IGmCombatRewindCommitDeps } from '@/lib/multiplayer/server/history/GmCombatRewindCommit';
import type {
  IMatchMeta,
  IMatchStore,
} from '@/lib/multiplayer/server/IMatchStore';
import type { IGameState } from '@/types/gameplay/GameSessionInterfaces';

import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { ReplaySchemaRegistry } from '@/lib/events/replay/ReplaySchemaRegistry';
import {
  REPLAY_LIBRARY_CENSUS_PROJECTOR,
  type IReplayLibraryCensusState,
} from '@/lib/events/replay/ReplaySurfaceGate';
import { matchStoreBranchSegmentReader } from '@/lib/multiplayer/server/history/matchStoreBranchSegmentReader';
import { hasCombatOutcomeOutbox } from '@/lib/multiplayer/server/IMatchStore';
import { combatViewerProbe } from '@/lib/multiplayer/server/projection/combatViewerProbe';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { GameEventType } from '@/types/gameplay/GameSessionInterfaces';

export const REWIND_COMMIT_REASON = 'authorized combat rewind';

/**
 * Never reached for a fogged match: the handler refuses those before
 * building the probe. With fog off the probe returns each event before
 * touching state. Remove the refusal and this placeholder becomes a lie.
 */
export const FOG_DISABLED_STATE = Object.freeze({}) as IGameState;

export interface IRewindCommitBody {
  readonly targetRevision: number;
  readonly expectedBranchId: string;
  readonly expectedRevision: number;
  readonly expectedDigest: string;
  readonly expectedGeneration: number;
}

export interface IBuildGmCombatRewindCommitDepsInput {
  readonly store: IMatchStore;
  readonly meta: IMatchMeta;
  readonly priorHeadRevision: number;
  /** Supplied by the route so the history module never touches the clock. */
  readonly nowIso: () => string;
}

export function isRewindCommitBody(value: unknown): value is IRewindCommitBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Partial<IRewindCommitBody>;
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

/** The journal revision the effective branch answers at, naming that branch. */
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

export function viewerIdsFor(meta: IMatchMeta): readonly string[] {
  return ['gm', ...meta.playerIds.map((playerId) => `player:${playerId}`)];
}

const REWIND_COMMIT_VERIFICATION: IGmCombatRewindCommitDeps<IReplayLibraryCensusState>['verification'] =
  {
    registry: new ReplaySchemaRegistry({
      events: Object.values(GameEventType).map((eventType) => ({
        eventType,
        targetSchemaVersion: 1,
        schemas: [
          {
            schemaVersion: 1,
            schemaId: `rewind-commit.${eventType}.v1`,
            parse: (payload: unknown) => payload,
          },
        ],
        transitions: [],
      })),
    }),
    projector: REPLAY_LIBRARY_CENSUS_PROJECTOR,
  };

export function buildGmCombatRewindCommitDeps(
  input: IBuildGmCombatRewindCommitDepsInput,
): IGmCombatRewindCommitDeps<IReplayLibraryCensusState> {
  const db = getSQLiteService().getDatabase();
  const branches = new SQLiteEventHistoryBranchStore(db);
  return {
    db,
    branches,
    leases: new SQLiteEventHistoryCorrectionLeaseStore(db, branches),
    manifests: new SQLiteEventHistoryArtifactManifestStore(db),
    reader: matchStoreBranchSegmentReader(input.store),
    probe: combatViewerProbe({
      state: FOG_DISABLED_STATE,
      audience: {
        gmPlayerId: input.meta.hostPlayerId,
        playerIds: input.meta.playerIds,
        config: { fogOfWar: false },
        sideAssignments: input.meta.sideAssignments,
      },
    }),
    readOutcomeId: async (matchId) =>
      hasCombatOutcomeOutbox(input.store)
        ? ((await input.store.getCombatOutcomeOutbox(matchId))?.outcomeId ??
          null)
        : null,
    priorHeadRevision: input.priorHeadRevision,
    viewerIds: viewerIdsFor(input.meta),
    verification: REWIND_COMMIT_VERIFICATION,
    // Fencing compares the process, not the actor. The actor is audit.
    owner: `rewind-commit:${process.pid}`,
    nowIso: input.nowIso,
  };
}
