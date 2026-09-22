import type { NextApiRequest, NextApiResponse } from 'next';

import type { IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';

import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import {
  AuthorizedViewerResolver,
  isAuthorizedViewer,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import { authorizeHumanAction } from '@/lib/multiplayer/server/authorization/HumanActionAuthorizationGate';
import { MatchSeatMembershipSource } from '@/lib/multiplayer/server/authorization/MatchSeatMembershipSource';
import { getDefaultMatchStore } from '@/lib/multiplayer/server/getDefaultMatchStore';
import { matchStreamRef } from '@/lib/multiplayer/server/history/GmCombatRewindPreview';
import { HostAsGmMembershipSource } from '@/pages-modules/api/hostAsGmMembershipSource';
import {
  MATCH_HISTORY_AUTHORIZATION_REFUSED,
  prepareMatchHistoryGet,
  rejectMatchHistoryFailure,
} from '@/pages-modules/api/matchHistoryViewerChain';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const caller = await prepareMatchHistoryGet(req, res);
  if (!caller) return;

  const store = getDefaultMatchStore();
  let meta: IMatchMeta;
  try {
    meta = await store.getMatchMeta(caller.matchId);
  } catch {
    res.status(404).json({ error: 'unknown match' });
    return;
  }

  try {
    const stream = matchStreamRef(caller.matchId);
    const viewer = await authorizeHumanAction(
      new AuthorizedViewerResolver(
        new HostAsGmMembershipSource(
          new MatchSeatMembershipSource(store),
          meta.hostPlayerId,
        ),
      ),
      caller.playerId,
      caller.matchId,
      { kind: 'history-read', ...stream },
    );
    if (
      !isAuthorizedViewer(viewer) ||
      viewer.principalId !== meta.hostPlayerId ||
      viewer.role !== 'gm'
    ) {
      res.status(403).json({ error: MATCH_HISTORY_AUTHORIZATION_REFUSED });
      return;
    }

    const db = getSQLiteService().getDatabase();
    const branches = new SQLiteEventHistoryBranchStore(db);
    // Keep generation and the lease's journal head in one read snapshot.
    const body = db.transaction(() => {
      const effective = branches.readEffectiveHead(stream);
      if (effective === null) return null;
      const head = readEffectiveStreamHead(db, branches, stream);
      if (head.revision === 0) return null;
      return {
        branchId: head.branchId,
        revision: head.revision,
        effectiveGeneration: effective.effectiveGeneration,
        digest: head.digest,
      };
    })();
    if (body === null) {
      res.status(404).json({ error: 'no head' });
      return;
    }
    res.status(200).json(body);
  } catch (error) {
    rejectMatchHistoryFailure(res, error, 'failed to read the match head');
  }
}
