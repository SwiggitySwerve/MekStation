/**
 * `POST /api/campaigns/:id/launch-authority` - may this launch proceed,
 * and with whose forces (umbrella task 10.3).
 *
 * The browser cannot answer either question. It has no SQLite, so it
 * cannot read the branch store or the durable force claims, and it must
 * not be trusted to decide whether its own view is current. So it sends
 * the head it is holding and the authority answers.
 *
 * WHY THE CLIENT SENDS A HEAD IT WAS GIVEN EARLIER. The head is read once
 * when the campaign page hydrates and held on launch state; the launch
 * sends THAT head, not a freshly read one. Reading it immediately before
 * launching would make the comparison vacuous - it would always match.
 * The gap between hydration and launch is exactly the window in which
 * another client can advance the campaign, and catching that is the
 * point.
 *
 * THE SINGLE-PLAYER PATH HAS NO OWNED FORCES, and that is not a
 * degradation. Force claims are keyed by session, and a campaign with no
 * co-op session has none; running one through owned-force materialization
 * would refuse every launch with `UNOWNED_SLOT`. A body without a
 * `sessionId` therefore gets its head validated and nothing else, which
 * leaves the flat-roster launch exactly as it is today.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 *   ("Scenario Materialization Uses Authoritative Owned Forces")
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { OwnedForceMaterializationResult } from '@/lib/campaign/encounter/campaignOwnedForceMaterialization';
import type {
  IActiveBranchHead,
  IExpectedBranchHead,
} from '@/lib/events/journal/EventHistoryExpectedHead';

import {
  campaignLaunchHeadPorts,
  campaignStreamRef,
  resolveCampaignLaunchHead,
} from '@/lib/campaign/authority/campaignLaunchHead';
import { materializeOwnedPlayerForces } from '@/lib/campaign/encounter/campaignOwnedForceMaterialization';
import { validateExpectedBranchHead } from '@/lib/events/journal/EventHistoryExpectedHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import {
  initializeApiDatabase,
  rejectMissingQueryString,
  rejectUnexpectedMethod,
  sendCaughtApiError,
} from '@/pages-modules/api/routeHelpers';
import { readCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import {
  readCampaignSessionForceHolder,
  readCampaignSessionForcesHeldBy,
} from '@/services/campaignPersistence/CampaignSessionForceClaimStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { getUnitRepository } from '@/services/units/UnitRepository';

export type CampaignLaunchAuthorityResponse =
  /** Head is current; no co-op session, so no owned forces to resolve. */
  | { readonly kind: 'current'; readonly head: IActiveBranchHead }
  | Extract<OwnedForceMaterializationResult, { kind: 'materialized' }>
  | { readonly kind: 'no-authoritative-stream' };

type ResponseBody =
  | CampaignLaunchAuthorityResponse
  | Extract<OwnedForceMaterializationResult, { kind: 'refused' }>
  | { readonly error: string };

interface IRequestBody {
  readonly expectedHead: IExpectedBranchHead;
  readonly missionId: string;
  readonly sessionId?: string;
}

/**
 * Validate the body this route depends on. The expected head is checked
 * field by field: a head carrying a stringly revision is not a head that
 * needs coercing, it is a caller this route does not understand, and
 * coercing it would feed a fabricated number into the comparison.
 */
function parseBody(value: unknown): IRequestBody | null {
  if (typeof value !== 'object' || value === null) return null;
  const body = value as Record<string, unknown>;
  const head = body.expectedHead;
  if (typeof head !== 'object' || head === null) return null;
  const { branchId, revision, effectiveGeneration } = head as Record<
    string,
    unknown
  >;
  if (typeof branchId !== 'string' || branchId.length === 0) return null;
  if (typeof revision !== 'number' || !Number.isFinite(revision)) return null;
  if (
    typeof effectiveGeneration !== 'number' ||
    !Number.isFinite(effectiveGeneration)
  ) {
    return null;
  }
  if (typeof body.missionId !== 'string' || body.missionId.length === 0) {
    return null;
  }
  if (body.sessionId !== undefined && typeof body.sessionId !== 'string') {
    return null;
  }
  return {
    expectedHead: { branchId, revision, effectiveGeneration },
    missionId: body.missionId,
    ...(typeof body.sessionId === 'string'
      ? { sessionId: body.sessionId }
      : {}),
  };
}

/** The durable owned-force ports. Only reachable with SQLite present. */
function ownedForcePorts(currentRevision: number) {
  return {
    validateHead: (
      campaignId: string,
      revision: number,
      expected: IExpectedBranchHead,
    ) =>
      validateExpectedBranchHead(
        new SQLiteEventHistoryBranchStore(getSQLiteService().getDatabase()),
        campaignStreamRef(campaignId),
        revision,
        expected,
      ),
    readForcesHeldBy: readCampaignSessionForcesHeldBy,
    readForceHolder: readCampaignSessionForceHolder,
    readCampaign,
    resolveCustomUnit: (unitRef: string) =>
      getUnitRepository().getById(unitRef),
    currentRevision,
  };
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>,
): void {
  if (rejectUnexpectedMethod(req, res, ['POST'])) return;
  if (!initializeApiDatabase(res)) return;

  const id = rejectMissingQueryString(
    req,
    res,
    'id',
    'missing or invalid campaign id',
  );
  if (!id) return;

  const body = parseBody(req.body as unknown);
  if (!body) {
    res.status(400).json({ error: 'missing or invalid request body' });
    return;
  }

  try {
    const head = resolveCampaignLaunchHead(campaignLaunchHeadPorts(), id);
    if (head.kind === 'campaign-not-found') {
      res.status(404).json({ error: 'not found' });
      return;
    }
    if (head.kind === 'no-authoritative-stream') {
      res.status(200).json({ kind: 'no-authoritative-stream' });
      return;
    }

    const ports = ownedForcePorts(head.revision);
    if (body.sessionId === undefined) {
      // Head-only gate: validate and stop. No session means no claims.
      const verdict = ports.validateHead(id, head.revision, body.expectedHead);
      if (verdict.kind === 'refused') {
        res.status(409).json({
          kind: 'refused',
          code: verdict.code,
          reason: `launch head is stale (${verdict.code})`,
          activeHead: verdict.activeHead,
          resyncAction: verdict.resyncAction,
        });
        return;
      }
      res.status(200).json({ kind: 'current', head: verdict.activeHead });
      return;
    }

    const owned = materializeOwnedPlayerForces(ports, {
      campaignId: id,
      sessionId: body.sessionId,
      missionId: body.missionId,
      currentRevision: head.revision,
      expectedHead: body.expectedHead,
      materializedAt: new Date().toISOString(),
    });
    res.status(owned.kind === 'refused' ? 409 : 200).json(owned);
  } catch (error) {
    sendCaughtApiError(res, error, 'failed to resolve launch authority');
  }
}
