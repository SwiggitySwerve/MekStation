/**
 * /api/campaigns/[id] item endpoint
 *
 * GET    — returns the stored `SerializedCampaign`, `404` if absent.
 * PUT    — persists a `SerializedCampaign` with the optimistic-concurrency
 *          stale-write guard; `409 Conflict` (with the current record)
 *          on a `baseVersion` mismatch, otherwise `200` with the stored
 *          record at its incremented `version`.
 * DELETE — removes the server record; `204`. Idempotent.
 *
 * Spec scenarios this satisfies:
 *  - "Save a campaign", "Load a saved campaign", "Load a missing campaign"
 *  - "Delete a server record"
 *  - "Clean write increments the version", "Stale write is rejected"
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 * @spec openspec/changes/add-campaign-persistence/design.md (D5, D8)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import {
  initializeApiDatabase as initCampaignDb,
  rejectMissingQueryString as readCampaignId,
  sendCaughtApiError as sendCampaignError,
} from '@/pages-modules/api/routeHelpers';
import {
  deleteCampaign,
  readCampaign,
  saveCampaign,
} from '@/services/campaignPersistence/CampaignPersistenceService';

type ErrorResponse = { error: string };

/**
 * Shape of a `PUT` body — the envelope plus the `baseVersion` the client
 * last read (drives the stale-write guard).
 */
interface PutBody {
  readonly envelope: SerializedCampaign;
  readonly baseVersion: number;
}

/**
 * Narrow guard for the `PUT` body. Phase 1 trusts the caller for the
 * deep envelope shape (the client builds it via `buildSerializedCampaign`)
 * but verifies the fields the route itself depends on.
 */
function isValidPutBody(value: unknown): value is PutBody {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const body = value as Partial<PutBody>;
  if (typeof body.baseVersion !== 'number' || body.baseVersion < 0) {
    return false;
  }
  const envelope = body.envelope as Partial<SerializedCampaign> | undefined;
  if (!envelope || typeof envelope !== 'object') {
    return false;
  }
  return (
    typeof envelope.campaignId === 'string' &&
    typeof envelope.schemaVersion === 'number' &&
    typeof envelope.body === 'object' &&
    envelope.body !== null
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SerializedCampaign | ErrorResponse>,
): Promise<void> {
  if (!initCampaignDb(res)) return;

  const id = readCampaignId(req, res, 'id', 'missing or invalid campaign id');
  if (!id) return;

  switch (req.method) {
    case 'GET': {
      const result = readCampaign(id);
      if (result.kind === 'not_found') {
        res.status(404).json({ error: 'not found' });
        return;
      }
      if (result.kind === 'corrupt') {
        // Explicit, intentional error surface for a corrupt stored
        // payload — never an unhandled JSON.parse throw (audit W5.2).
        // The row stays repairable via PUT with the correct baseVersion.
        res.status(500).json({ error: 'stored campaign record is corrupt' });
        return;
      }
      res.status(200).json(result.record);
      return;
    }

    case 'PUT': {
      const body = req.body as unknown;
      if (!isValidPutBody(body)) {
        res.status(400).json({ error: 'missing or invalid request body' });
        return;
      }
      // The path id is authoritative — guard against an envelope whose
      // campaignId disagrees with the URL.
      if (body.envelope.campaignId !== id) {
        res
          .status(400)
          .json({ error: 'envelope campaignId does not match url id' });
        return;
      }
      try {
        const result = saveCampaign(body.envelope, body.baseVersion);
        if (result.kind === 'conflict') {
          // Stale write — return the current record so the client can
          // offer keep-local / take-server.
          res.status(409).json(result.current);
          return;
        }
        res.status(200).json(result.record);
      } catch (error) {
        sendCampaignError(res, error, 'failed to persist campaign');
      }
      return;
    }

    case 'DELETE': {
      try {
        deleteCampaign(id);
        res.status(204).end();
      } catch (error) {
        sendCampaignError(res, error, 'failed to delete campaign');
      }
      return;
    }

    default:
      res.setHeader('Allow', 'GET, PUT, DELETE');
      res.status(405).json({ error: 'method not allowed' });
  }
}
