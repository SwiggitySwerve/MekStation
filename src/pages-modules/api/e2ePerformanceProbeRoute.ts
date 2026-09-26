/**
 * E2E-only server clock and memory probe (23.1).
 *
 * Two numbers in the performance letter can only be read from INSIDE the
 * server process: its monotonic clock (needed to correlate a commit
 * stamp with a browser render) and its resident memory (the 128 MiB
 * post-warm growth ceiling). Neither is observable from Playwright, and
 * scraping them out of stdout would make the gate depend on log format.
 *
 * So the same explicit-seam discipline the fault injector uses applies
 * here: one read-only route, behind the same per-run guard, answering
 * 404 unless the server was launched by Playwright with a matching run
 * token. It mutates nothing.
 *
 * Given a `matchId`, it also answers that co-op campaign session's
 * convergence: the same `evaluateScenarioLaunch` answer the authority's
 * AdvanceDay check reads (the required revision and, when refused, each
 * behind participant's id and acknowledged revision). The performance
 * pack waits on it before issuing each command.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (23.1)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { CampaignProgressionGate } from '@/lib/multiplayer/server/CampaignProgressionGate';

import { getCampaignHostRegistry } from '@/lib/multiplayer/server/CampaignHostRegistry';
import { rejectUnexpectedMethod } from '@/pages-modules/api/routeHelpers';

interface IProbeResponse {
  readonly success: true;
  /** Wall clock, for pairing against the browser's own wall reading. */
  readonly wallMs: number;
  /** Monotonic clock, the source every server-side elapsed measure uses. */
  readonly monotonicMs: number;
  readonly memory: {
    readonly rss: number;
    readonly heapUsed: number;
  };
  /**
   * Only when the request names a `matchId`: that match's campaign
   * session convergence, or null when this process holds no campaign
   * session for it.
   */
  readonly convergence?: CampaignProgressionGate | null;
}

interface IErrorResponse {
  readonly error: string;
}

const RUN_ID_HEADER = 'x-playwright-e2e-run-id';

/**
 * Answers 404 unless the e2e guard passes and 405 for a non-GET; otherwise
 * 200 with the paired clock reading and process memory, plus, when the
 * query names a `matchId`, the convergence of the campaign session the
 * process registry holds for that match (null when it holds none).
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IProbeResponse | IErrorResponse>,
): Promise<void> {
  if (!isAuthorizedE2ERequest(req)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (req.method !== 'GET') {
    rejectUnexpectedMethod(req, res, ['GET']);
    return;
  }
  const matchId = firstQueryValue(req.query.matchId);
  // Read BEFORE the clock pair, so the pair stays two adjacent stamps.
  const convergence =
    matchId === null
      ? undefined
      : ((await getCampaignHostRegistry()
          .get(matchId)
          ?.syncSession.evaluateScenarioLaunch()) ?? null);
  const memory = process.memoryUsage();
  res.status(200).json({
    success: true,
    // Read as a PAIR, in this order, so the offset the caller derives is
    // taken from two stamps microseconds apart rather than two requests.
    wallMs: Date.now(),
    monotonicMs: Number(process.hrtime.bigint()) / 1e6,
    memory: { rss: memory.rss, heapUsed: memory.heapUsed },
    ...(convergence === undefined ? {} : { convergence }),
  });
}

/** The first value of a query parameter, or null when it is absent. */
function firstQueryValue(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

/** Same guard as the fault seam: e2e mode AND this run's token. */
function isAuthorizedE2ERequest(req: NextApiRequest): boolean {
  if (process.env.NEXT_PUBLIC_E2E_MODE !== 'true') return false;
  const expectedRunId = process.env.PLAYWRIGHT_E2E_RUN_ID;
  if (!expectedRunId) return false;
  return requestRunId(req) === expectedRunId;
}

function requestRunId(req: NextApiRequest): string | null {
  const header = req.headers[RUN_ID_HEADER];
  if (typeof header === 'string') return header;
  if (Array.isArray(header)) return header[0] ?? null;
  const query = req.query.runId;
  if (typeof query === 'string') return query;
  if (Array.isArray(query)) return query[0] ?? null;
  return null;
}
