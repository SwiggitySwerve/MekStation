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
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D4, D10)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { ICampaignIntent } from '@/types/campaign/CampaignSync';

import { executeCampaignCommand } from '@/lib/campaign/authority/campaignCommandPipeline';
import { resolveCampaignAuthorityFromStores } from '@/lib/campaign/authority/resolveCampaignAuthorityFromStores';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  initializeApiDatabase as initCampaignDb,
  rejectMissingQueryString as readCampaignId,
  sendCaughtApiError as sendCampaignError,
} from '@/pages-modules/api/routeHelpers';
import { readCampaignMigrationMarker } from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

interface CommandBody {
  readonly intent: ICampaignIntent;
  readonly commandId: string;
  readonly authorPlayerId: string;
}

/** Narrow guard for the fields this route itself depends on. */
function isValidCommandBody(value: unknown): value is CommandBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Partial<CommandBody>;
  if (typeof body.commandId !== 'string' || body.commandId.trim() === '') {
    return false;
  }
  if (
    typeof body.authorPlayerId !== 'string' ||
    body.authorPlayerId.trim() === ''
  ) {
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
        authorPlayerId: body.authorPlayerId,
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
