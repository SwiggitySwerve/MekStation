/**
 * `GET /api/matches/:id/timeline` — one seated viewer's audit timeline.
 *
 * The service returns a bare array. The HTTP body adds `timelineDigest`
 * from the same `viewerTimelineDigest` the export arm already carries,
 * so the two surfaces can be compared as numbers rather than eyeballed.
 * The service signature is left alone; digesting here is the route's
 * job because it is the caller that receives the array.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { IViewerHistoryLineage } from '@/lib/multiplayer/server/history/ViewerHistoryLineage';
import type { IViewerTimelineEntry } from '@/lib/multiplayer/server/history/ViewerHistoryTypes';

import { viewerTimelineDigest } from '@/lib/multiplayer/server/history/viewerTimelineDigest';
import {
  createViewerHistoryService,
  matchHistoryLineageStreamType,
  prepareMatchHistoryGet,
  readMatchHistoryLineage,
  rejectMatchHistoryFailure,
} from '@/pages-modules/api/matchHistoryViewerChain';

export interface IMatchHistoryTimelineBody {
  readonly timeline: readonly IViewerTimelineEntry[];
  readonly timelineDigest: string;
  readonly lineage: IViewerHistoryLineage;
}

type ResponseBody = IMatchHistoryTimelineBody | { readonly error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>,
): Promise<void> {
  const caller = await prepareMatchHistoryGet(req, res);
  if (!caller) return;

  try {
    const timeline = await createViewerHistoryService().readTimeline(
      caller.playerId,
      caller.matchId,
      { campaignSessionId: caller.matchId },
    );
    // Digest stays over audit entries only. Lineage is a sibling so a
    // later rewind cannot change the number the export arm already
    // compared against those rows.
    const lineage = await readMatchHistoryLineage(
      caller,
      matchHistoryLineageStreamType(req),
    );
    res.status(200).json({
      timeline,
      timelineDigest: viewerTimelineDigest(timeline),
      lineage,
    });
  } catch (error) {
    rejectMatchHistoryFailure(res, error, 'failed to read match timeline');
  }
}
