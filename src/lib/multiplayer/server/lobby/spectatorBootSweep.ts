/**
 * Boot-time release of crash-leftover spectator seats (M-H2, Wave 4).
 *
 * A spectator seat is released when the viewer's last socket detaches. A
 * process that died before that ran leaves the seat persisted, where it counts
 * toward the 16-spectator cap for the life of the match. Boot recovery calls
 * this for every active match: no socket survives a restart, so every persisted
 * viewer seat is a leftover. A viewer registers again to watch.
 *
 * What counts as a leftover is `isAutoReleasableSpectatorSeat`, the same rule the
 * last-socket detach uses: the co-op GM host's own spectator seat is its match
 * membership and is kept while the match is live.
 *
 * Boot only. A recovery scoped to one match runs at runtime too, where a
 * spectator may have just registered and not attached yet.
 */

import { logger } from '@/utils/logger';

import type { IMatchMeta, IMatchStore } from '../IMatchStore';

import { updateMatchSeats } from './seatUpdate';
import { isAutoReleasableSpectatorSeat } from './spectatorSeats';

const releasableCount = (meta: IMatchMeta): number =>
  (meta.seats ?? []).filter((seat) => isAutoReleasableSpectatorSeat(seat, meta))
    .length;

/**
 * Remove every spectator seat of `listed`'s match that automatic cleanup may
 * release, deriving from the metadata at write time. Returns how many seats were
 * released. It never throws: one match that cannot be swept must not stop
 * recovery of the rest.
 */
export async function releaseLeftoverSpectators(
  store: IMatchStore,
  listed: IMatchMeta,
): Promise<number> {
  if (releasableCount(listed) === 0) return 0;
  const seen = { spectators: 0 };
  try {
    const result = await updateMatchSeats(store, listed.matchId, (current) => {
      seen.spectators = releasableCount(current);
      return seen.spectators === 0
        ? null
        : {
            seats: (current.seats ?? []).filter(
              (seat) => !isAutoReleasableSpectatorSeat(seat, current),
            ),
          };
    });
    if (result.kind === 'busy') {
      logger.warn(
        `[MatchRecovery] kept leftover spectator seats on ${listed.matchId}: every attempt lost to a concurrent seat write`,
        { spectators: seen.spectators },
      );
      return 0;
    }
    if (result.kind === 'unchanged') return 0;
    logger.info(
      `[MatchRecovery] released ${seen.spectators} leftover spectator seat(s) on ${listed.matchId}`,
    );
    return seen.spectators;
  } catch (error) {
    logger.warn(
      `[MatchRecovery] could not release leftover spectator seats on ${listed.matchId}`,
      error,
    );
    return 0;
  }
}
