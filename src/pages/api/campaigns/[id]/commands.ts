/**
 * /api/campaigns/[id]/commands — the source command endpoint (task 1.2).
 *
 * One POST carries one intent and one stable command id. The pipeline
 * validates it against the projected stream, appends atomically, and
 * acknowledges with the state replayed after the commit.
 *
 * Status codes carry the distinction the pipeline works to preserve:
 *
 *   422  the campaign cannot do this (funds, standing, target)
 *   409  authority blocked, or another writer got there first
 *   200  committed, or a retried command that already committed
 *   500  the stream did not replay to the state the source derived
 *
 * A caller that saw one code for all of these would retry the ones that
 * can never succeed and give up on the ones that would.
 *
 * THE ACTOR IS THE VERIFIED CALLER (finding #28). This route used to
 * take `authorPlayerId` from the request body and hand it to the
 * pipeline as the command's author, so anyone who could reach it could
 * append to a campaign's journal wearing another participant's identity.
 * Attribution is the thing a journal exists to keep, so a forgeable one
 * makes every later audit of the campaign worthless. The id now comes
 * from the bearer token, and a body still carrying the old field is
 * REFUSED rather than silently stripped: a client that kept sending it
 * would otherwise go on believing it had attributed the command.
 *
 * The seat gate is `isActiveCampaignSeat`, not the GM-only predicate the
 * share surface uses. Commanding is what every participant does; only a
 * stranger is refused. A campaign with no co-op session has no seats, so
 * this route refuses every caller on one - which is correct here and is
 * the single-player boundary recorded as finding #29, not a gap to
 * paper over with a weaker gate.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D4, D10)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { ICampaignIntent } from '@/types/campaign/CampaignSync';

import { executeCampaignCommand } from '@/lib/campaign/authority/campaignCommandPipeline';
import { expectedScopeForCampaign } from '@/lib/campaign/authority/campaignSessionScope';
import { resolveCampaignAuthorityFromStores } from '@/lib/campaign/authority/resolveCampaignAuthorityFromStores';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { authenticateRequest } from '@/lib/multiplayer/server/auth';
import {
  initializeApiDatabase as initCampaignDb,
  rejectMissingQueryString as readCampaignId,
  sendCaughtApiError as sendCampaignError,
} from '@/pages-modules/api/routeHelpers';
import { readCampaignMigrationMarker } from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import { isActiveCampaignSeat } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

interface CommandBody {
  readonly intent: ICampaignIntent;
  readonly commandId: string;
}

/** Narrow guard for the fields this route itself depends on. */
function isValidCommandBody(value: unknown): value is CommandBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Partial<CommandBody>;
  if (typeof body.commandId !== 'string' || body.commandId.trim() === '') {
    return false;
  }
  const intent = body.intent as Partial<ICampaignIntent> | undefined;
  return (
    typeof intent === 'object' &&
    intent !== null &&
    typeof intent.kind === 'string' &&
    typeof intent.campaignId === 'string'
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (!initCampaignDb(res)) return;

  const id = readCampaignId(req, res, 'id', 'missing or invalid campaign id');
  if (!id) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const body = req.body as unknown;
  if (!isValidCommandBody(body)) {
    res.status(400).json({ error: 'missing or invalid request body' });
    return;
  }
  if (body.intent.campaignId !== id) {
    res.status(400).json({ error: 'intent campaignId does not match url id' });
    return;
  }

  // Identity BEFORE the contract complaint below: an anonymous caller
  // learns only that it must authenticate, never how the body is shaped.
  const auth = await authenticateRequest(
    req,
    undefined,
    expectedScopeForCampaign(id),
  );
  if (!auth.ok) {
    res.status(401).json({ error: `Unauthorized: ${auth.reason}` });
    return;
  }
  if (!isActiveCampaignSeat(id, auth.playerId)) {
    res.status(403).json({
      error: 'cannot command this campaign',
      reason: 'not-campaign-participant',
    });
    return;
  }
  if ((req.body as Record<string, unknown>).authorPlayerId !== undefined) {
    res.status(400).json({
      error: 'the command author is taken from the bearer token',
      reason: 'author-not-accepted',
    });
    return;
  }

  try {
    const journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
      getSQLiteService().getDatabase(),
      () => new Date().toISOString(),
    );
    const authority = await resolveCampaignAuthorityFromStores(
      { readMarker: readCampaignMigrationMarker, journal: () => journal },
      id,
    );

    const result = await executeCampaignCommand(
      { journal, authority },
      {
        campaignId: id,
        intent: body.intent,
        authorPlayerId: auth.playerId,
        commandId: body.commandId,
        ts: new Date().toISOString(),
      },
    );

    switch (result.kind) {
      case 'committed':
        res.status(200).json({
          kind: 'committed',
          events: result.events,
          state: result.state,
        });
        return;
      case 'duplicate':
        // A retry is not a failure. The command committed once, which is
        // exactly what the caller wanted.
        res
          .status(200)
          .json({ kind: 'duplicate', commandId: result.commandId });
        return;
      case 'rejected':
        res.status(422).json({ kind: 'rejected', reason: result.reason });
        return;
      case 'blocked':
        res.status(409).json({ kind: 'blocked', reason: result.reason });
        return;
      case 'conflict':
        res.status(409).json({
          kind: 'conflict',
          expectedSequence: result.expectedSequence,
          actualSequence: result.actualSequence,
        });
        return;
      case 'divergent':
        res.status(500).json({
          kind: 'divergent',
          expectedDigest: result.expectedDigest,
          actualDigest: result.actualDigest,
        });
        return;
      default: {
        const exhaustive: never = result;
        void exhaustive;
        res.status(500).json({ error: 'unhandled command result' });
      }
    }
  } catch (error) {
    sendCampaignError(res, error, 'failed to execute campaign command');
  }
}
