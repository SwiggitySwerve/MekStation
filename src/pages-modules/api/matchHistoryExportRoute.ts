/**
 * `GET /api/matches/:id/export` — one seated viewer's history snapshot.
 *
 * The service body is written VERBATIM (application/json, no file
 * wrapper). It already carries `timelineDigest` over the projected
 * timeline, which is how a client proves export and timeline agree
 * without a second hash function. includePrivate is not accepted here:
 * that gate is a different letter and would turn this route into an
 * authorization oracle if a player could toggle it.
 *
 * streamId is the URL match id. A caller-supplied streamId would let
 * the request name a foreign stream after the token had already been
 * bound to this match.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { IViewerHistoryLineage } from '@/lib/multiplayer/server/history/ViewerHistoryLineage';
import type { IViewerHistoryExport } from '@/lib/multiplayer/server/history/ViewerHistoryTypes';

import {
  createViewerHistoryService,
  prepareMatchHistoryGet,
  readMatchHistoryLineage,
  rejectInvalidStreamType,
  rejectMatchHistoryFailure,
} from '@/pages-modules/api/matchHistoryViewerChain';

export type IMatchHistoryExportBody = IViewerHistoryExport & {
  readonly lineage: IViewerHistoryLineage;
};

type ResponseBody = IMatchHistoryExportBody | { readonly error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>,
): Promise<void> {
  const caller = await prepareMatchHistoryGet(req, res);
  if (!caller) return;

  const streamType = rejectInvalidStreamType(req, res);
  if (!streamType) return;

  try {
    const body = await createViewerHistoryService().exportForViewer(
      caller.playerId,
      caller.matchId,
      { streamType, streamId: caller.matchId },
    );
    // Same streamType the export already authorized, so timeline and
    // export lineage compare as the same object for one viewer.
    const lineage = await readMatchHistoryLineage(caller, streamType);
    res.status(200).json({ ...body, lineage });
  } catch (error) {
    rejectMatchHistoryFailure(res, error, 'failed to export match history');
  }
}
