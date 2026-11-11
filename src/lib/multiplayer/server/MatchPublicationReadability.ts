import type { IGameEvent } from '@/types/gameplay';

import { prepareEventForSerialization } from '@/utils/gameplay/gameEvents/serialization';
import { logger } from '@/utils/logger';

import type {
  IMatchPublication,
  IMatchStore,
  IPublicationOutboxStore,
} from './IMatchStore';

import { hasPublicationOutbox } from './IMatchStore';
import { sealedDeclarationsRevealedBy } from './projection/MatchWireSealedChoices';

/** Validate the complete pending set before handing any row to a recipient. */
export async function readReadablePendingPublications(
  matchId: string,
  store: IPublicationOutboxStore,
): Promise<readonly IMatchPublication[]> {
  const rows = await store.listPendingPublications(matchId);
  return rows.map((row) => {
    const event = prepareEventForSerialization(row.event, 'match-broadcast');
    return event === row.event ? row : { ...row, event };
  });
}

/** Resolve sealed declarations to committed bytes (or this still-staged batch). */
export async function readReadableRevealedDeclarations(
  matchId: string,
  store: Pick<IMatchStore, 'getEvents'>,
  history: readonly IGameEvent[],
  publications: readonly IGameEvent[],
  offered: readonly IGameEvent[] = [],
): Promise<readonly IGameEvent[]> {
  const selected = publications.flatMap((event) =>
    sealedDeclarationsRevealedBy(history, event),
  );
  if (selected.length === 0) return [];
  const fromSeq = Math.min(...selected.map((event) => event.sequence));
  let committed: readonly IGameEvent[];
  try {
    committed = await store.getEvents(matchId, fromSeq);
  } catch (error) {
    logger.warn(
      '[multiplayer] sealed reveal withheld: committed events unavailable',
      { matchId, fromSeq, error },
    );
    return [];
  }
  // Committed rows take precedence. A current staged declaration is used only
  // before the batch's first append, never in place of a stored authority row.
  const byId = new Map(
    [...offered, ...committed].map((event) => [event.id, event]),
  );
  const resolved: IGameEvent[] = [];
  for (const declaration of selected) {
    const row = byId.get(declaration.id);
    if (!row) {
      logger.warn(
        '[multiplayer] sealed reveal withheld: committed row missing',
        { matchId, eventId: declaration.id, sequence: declaration.sequence },
      );
      continue;
    }
    resolved.push(prepareEventForSerialization(row, 'match-broadcast'));
  }
  return resolved;
}

/** All asynchronous publication reads settle while the command can still roll back. */
export async function preflightMatchPublications(
  matchId: string,
  store: IMatchStore,
  history: readonly IGameEvent[],
  offered: readonly IGameEvent[],
): Promise<void> {
  const pending = hasPublicationOutbox(store)
    ? await readReadablePendingPublications(matchId, store)
    : [];
  await readReadableRevealedDeclarations(
    matchId,
    store,
    history,
    [...pending.map((row) => row.event), ...offered],
    offered,
  );
}
