/**
 * /api/campaigns/redeem — accept a share on the consuming device.
 *
 * This is the only endpoint that creates a `role: 'replica'` campaign
 * record. It verifies the signed token, then persists a local record
 * whose authority names the source instance, the grant, and the scopes,
 * so the replica can state what it is a copy of rather than inferring it
 * from whether a socket happens to be connected.
 *
 * Refusal reasons map to distinct statuses: a tampered or forged token
 * is a 400 (the caller sent something invalid), while trying to redeem
 * over a campaign this host already SOURCES is a 409 (a real conflict
 * with local authority that the caller could resolve).
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D2)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { RedeemRefusalReason } from '@/lib/campaign/grants/redeemCampaignGrant';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { getOrCreateHostInstanceId } from '@/lib/campaign/authority/campaignHostInstance';
import { redeemCampaignGrant } from '@/lib/campaign/grants/redeemCampaignGrant';
import {
  initializeApiDatabase,
  sendCaughtApiError,
} from '@/pages-modules/api/routeHelpers';
import {
  readCampaign,
  storeRedeemedReplica,
} from '@/services/campaignPersistence/CampaignPersistenceService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

type ErrorResponse = { error: string; reason?: RedeemRefusalReason };

/**
 * `already-redeemed` is a conflict with local authority the caller can
 * act on; everything else means the presented share was not acceptable.
 */
function statusForRefusal(reason: RedeemRefusalReason): number {
  return reason === 'already-redeemed' ? 409 : 400;
}

interface IRedeemBody {
  readonly token: unknown;
  readonly sourceInstanceId: string;
  readonly body: SerializedCampaign['body'];
}

/** True when the request carries a token, a source id, and a body. */
function isRedeemBody(value: unknown): value is IRedeemBody {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  if (b.token === undefined || b.token === null) return false;
  if (
    typeof b.sourceInstanceId !== 'string' ||
    b.sourceInstanceId.length === 0
  ) {
    return false;
  }
  return typeof b.body === 'object' && b.body !== null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SerializedCampaign | ErrorResponse>,
): Promise<void> {
  if (!initializeApiDatabase(res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  if (!isRedeemBody(req.body)) {
    res.status(400).json({ error: 'missing or invalid request body' });
    return;
  }

  try {
    const db = getSQLiteService().getDatabase();
    const localInstanceId = getOrCreateHostInstanceId(db);
    const campaignId = (req.body.token as { campaignId?: unknown })?.campaignId;
    const existingRead =
      typeof campaignId === 'string' ? readCampaign(campaignId) : null;
    // A record we cannot read is NOT treated as absent: redeeming over
    // it would destroy something repairable.
    if (existingRead !== null && existingRead.kind === 'corrupt') {
      res.status(409).json({ error: 'local campaign record is unreadable' });
      return;
    }
    const existing =
      existingRead !== null && existingRead.kind === 'ok'
        ? existingRead.record
        : null;

    const redeemed = await redeemCampaignGrant(
      {
        token: req.body.token,
        sourceInstanceId: req.body.sourceInstanceId,
        localInstanceId,
        body: req.body.body,
        redeemedAt: new Date().toISOString(),
        existing,
      },
      Date.now(),
    );
    if (redeemed.kind !== 'ok') {
      res
        .status(statusForRefusal(redeemed.reason))
        .json({ error: 'cannot redeem share', reason: redeemed.reason });
      return;
    }

    // Redeem is not a campaign COMMAND, so it does not go through the
    // command path - that path correctly refuses to write a replica
    // envelope. It uses the narrow replica door instead, which refuses
    // anything that is not a replica and refuses to overwrite a record
    // this host sources.
    const saved = storeRedeemedReplica(redeemed.record);
    if (saved.kind !== 'ok') {
      res.status(409).json({ error: `cannot store replica: ${saved.reason}` });
      return;
    }
    res.status(201).json(saved.record);
  } catch (error) {
    sendCaughtApiError(res, error, 'campaign redeem failed');
  }
}
