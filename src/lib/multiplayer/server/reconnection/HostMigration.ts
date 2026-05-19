/**
 * HostMigration — promote a surviving human seat to `hostPlayerId` when
 * the player holding host privilege loses their connection.
 *
 * Per `harden-multiplayer-transport` design D4: in the
 * server-authoritative model the authoritative `InteractiveSession`
 * lives on the *server*, not on the host's client. The "host" is just
 * the player holding `hostPlayerId` for privileged operations (close
 * match, lobby overrides, `MarkSeatAi` / `ForfeitMatch`). When the
 * host's *socket* drops the engine keeps running — host migration is
 * therefore not a state-transfer problem, it is a *privilege
 * reassignment* problem.
 *
 * Algorithm (design D4 + the risk-mitigation in the Risks section):
 *   1. Only act when the dropped player actually held `hostPlayerId`.
 *   2. Pick the longest-connected surviving human seat — the seat
 *      whose occupying player still has at least one attached socket,
 *      ranked by the earliest `connectedAt` (most stable connection).
 *   3. Persist the new `hostPlayerId` via `updateMatchMeta` and
 *      broadcast `HostMigrated` to every connected client.
 *   4. If NO human seat survives, do nothing — the match falls through
 *      to the grace path (design D5) and completes cleanly on grace
 *      expiry. The caller runs the grace path independently.
 *
 * Open-Question resolution (design "Open Questions"): a migrated
 * `hostPlayerId` STAYS migrated for the rest of the match even if the
 * original host reconnects — promoting back would cause a privilege
 * ping-pong. Reconnect simply re-streams events; it never re-abducts
 * host privilege.
 *
 * @spec openspec/changes/harden-multiplayer-transport/specs/multiplayer-server/spec.md
 */

import type { IMatchSeat } from '@/types/multiplayer/Lobby';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchMeta, IMatchStore } from '../IMatchStore';

/**
 * The slice of host state `migrateHostIfNeeded` needs. The host
 * implements this port; keeping it explicit makes the host ↔ migration
 * coupling one-directional and unit-testable.
 */
export interface IHostMigrationContext {
  readonly matchId: string;
  readonly store: IMatchStore;
  /** Player ids that currently have at least one attached socket. */
  readonly connectedSince: () => ReadonlyMap<string, number>;
  readonly broadcast: (message: IServerMessage) => void;
}

/**
 * Result of a migration attempt — surfaced so the host and tests can
 * assert what happened without re-reading the store.
 */
export interface IHostMigrationResult {
  /** True iff `hostPlayerId` was reassigned. */
  readonly migrated: boolean;
  /** The new host player id when `migrated` is true. */
  readonly newHostPlayerId?: string;
  /** The prior host player id when `migrated` is true. */
  readonly previousHostPlayerId?: string;
}

/**
 * If `droppedPlayerId` held host privilege, promote the
 * longest-connected surviving human seat to `hostPlayerId`. Safe to
 * call for any dropped player — it is a no-op when the dropped player
 * was not the host, or when no surviving human seat exists.
 */
export async function migrateHostIfNeeded(
  ctx: IHostMigrationContext,
  droppedPlayerId: string,
): Promise<IHostMigrationResult> {
  let meta: IMatchMeta;
  try {
    meta = await ctx.store.getMatchMeta(ctx.matchId);
  } catch {
    return { migrated: false };
  }
  // Only the host losing their connection triggers a migration.
  if (meta.hostPlayerId !== droppedPlayerId) {
    return { migrated: false };
  }
  // Migration is meaningful only for an in-flight match.
  if (meta.status !== 'active') {
    return { migrated: false };
  }

  const successor = pickSuccessor(
    meta.seats ?? [],
    meta.hostPlayerId,
    ctx.connectedSince(),
  );
  if (!successor) {
    // No surviving human seat — the grace path (design D5) handles it.
    return { migrated: false };
  }

  try {
    await ctx.store.updateMatchMeta(ctx.matchId, {
      hostPlayerId: successor,
    });
  } catch {
    // Persist failed — leave host privilege where it was rather than
    // diverging the in-memory broadcast from the durable record.
    return { migrated: false };
  }

  ctx.broadcast({
    kind: 'HostMigrated',
    matchId: ctx.matchId,
    ts: nowIso(),
    previousHostPlayerId: droppedPlayerId,
    hostPlayerId: successor,
  });

  return {
    migrated: true,
    newHostPlayerId: successor,
    previousHostPlayerId: droppedPlayerId,
  };
}

/**
 * Pick the longest-connected surviving human seat's player id, or
 * `null` if none survive. A "surviving" seat is a `human` seat whose
 * occupant is connected and is NOT the (dropped) current host. Ranking
 * is by ascending `connectedAt` — the smallest value is the
 * longest-connected, most stable connection.
 */
function pickSuccessor(
  seats: readonly IMatchSeat[],
  currentHostPlayerId: string,
  connectedSince: ReadonlyMap<string, number>,
): string | null {
  const candidates: { playerId: string; connectedAt: number }[] = [];
  for (const seat of seats) {
    if (seat.kind !== 'human') continue;
    const playerId = seat.occupant?.playerId;
    if (!playerId) continue;
    if (playerId === currentHostPlayerId) continue;
    const connectedAt = connectedSince.get(playerId);
    if (connectedAt === undefined) continue; // not connected — skip
    candidates.push({ playerId, connectedAt });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.connectedAt - b.connectedAt);
  return candidates[0].playerId;
}
