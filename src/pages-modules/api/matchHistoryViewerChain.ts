/**
 * Shared GET chain for match timeline and export HTTP.
 *
 * The service re-resolves the branded viewer on every entrypoint
 * (`kind: 'timeline'` / `'export'`). This module therefore authenticates
 * the bearer and then calls the service — it must not authorize a
 * viewer and hand that brand through, or the service gate becomes a
 * dead letter a stranger could walk around.
 *
 * expectedScope is derived from the URL match id, never from the
 * request body, so a token minted for another session cannot name its
 * own scope on the way in.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { JsonValue } from '@/lib/multiplayer/server/projection/ViewerProjectionTypes';

import { SQLiteActionAuditRepository } from '@/lib/events/audit/SQLiteActionAuditRepository';
import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { SQLitePrivateRecordRepository } from '@/lib/events/privacy/SQLitePrivateRecordRepository';
import { authenticateRequest } from '@/lib/multiplayer/server/auth';
import {
  AuthorizedViewerError,
  AuthorizedViewerResolver,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import { HumanActionAuthorizationError } from '@/lib/multiplayer/server/authorization/HumanActionAuthorizationGate';
import { MatchSeatMembershipSource } from '@/lib/multiplayer/server/authorization/MatchSeatMembershipSource';
import { SQLiteDeliveryEpochStore } from '@/lib/multiplayer/server/delivery/SQLiteDeliveryEpochStore';
import { getDefaultMatchStore } from '@/lib/multiplayer/server/getDefaultMatchStore';
import {
  projectViewerHistoryLineage,
  type IViewerHistoryLineage,
  type IViewerHistoryLineageStores,
} from '@/lib/multiplayer/server/history/ViewerHistoryLineage';
import { ViewerHistoryService } from '@/lib/multiplayer/server/history/ViewerHistoryService';
import { matchWireAudienceDefinition } from '@/lib/multiplayer/server/projection/MatchWireAudienceCatalog';
import {
  ViewerAudienceProjectorRegistry,
  type IViewerAudienceEventDecision,
  type IViewerAudienceProjectorDefinition,
} from '@/lib/multiplayer/server/projection/ViewerAudienceProjector';
import { ViewerProjectionService } from '@/lib/multiplayer/server/projection/ViewerProjectionService';
import {
  initializeApiDatabase,
  queryStringParam,
  rejectMissingQueryString,
  rejectUnexpectedMethod,
  sendCaughtApiError,
} from '@/pages-modules/api/routeHelpers';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

/** Constant, id-free 403 so a refusal cannot probe whether a match exists. */
export const MATCH_HISTORY_AUTHORIZATION_REFUSED = 'Authorization refused';

const STREAM_TYPE_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

export interface IMatchHistoryCaller {
  readonly playerId: string;
  readonly matchId: string;
}

/** Copies headline onto a fresh projector payload. */
function projectHeadline(payload: unknown): JsonValue {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload))
    return { headline: '' };
  const headline = (payload as { readonly [key: string]: unknown })['headline'];
  return { headline: typeof headline === 'string' ? headline : '' };
}

/**
 * Production match-wire catalog, registered as streamType `match` so
 * the E2E export query and the combat stream name agree.
 */
function matchHttpAudienceDefinition(): IViewerAudienceProjectorDefinition {
  const wire = matchWireAudienceDefinition();
  return {
    projectorVersion: wire.projectorVersion,
    streamType: 'match',
    decisions: wire.decisions,
  };
}

/**
 * Same public/hidden pair ViewerHistoryService tests seed. Lives on
 * its own stream type so the match-wire catalog stays exhaustive for
 * GameEventType and does not grow test-only event names.
 */
function historyProofAudienceDefinition(): IViewerAudienceProjectorDefinition {
  const decisions: readonly IViewerAudienceEventDecision[] = [
    {
      eventType: 'public_notice',
      decision: { kind: 'public', project: projectHeadline },
    },
    { eventType: 'hidden_authority', decision: { kind: 'hidden' } },
  ];
  return {
    projectorVersion: 1,
    streamType: 'history-proof',
    decisions,
  };
}

/**
 * Builds the production service graph. Membership comes from durable
 * seats; audit, private records, and delivery epochs share the API
 * SQLite handle; projection reads the same handle through the journal.
 */
export function createViewerHistoryService(): ViewerHistoryService {
  const db = getSQLiteService().getDatabase();
  const registry = new ViewerAudienceProjectorRegistry();
  registry.register(matchHttpAudienceDefinition());
  registry.register(historyProofAudienceDefinition());
  return new ViewerHistoryService({
    resolver: new AuthorizedViewerResolver(
      new MatchSeatMembershipSource(getDefaultMatchStore()),
    ),
    projection: new ViewerProjectionService({
      journal: new SQLiteEventJournal(db, () => new Date().toISOString()),
      registry,
    }),
    epochStore: new SQLiteDeliveryEpochStore(db, () =>
      new Date().toISOString(),
    ),
    auditRepo: new SQLiteActionAuditRepository(db),
    privateRepo: new SQLitePrivateRecordRepository(db),
  });
}

/**
 * Branch + manifest readers on the API SQLite handle — never a match
 * file. Match seats never stamp role `gm`, so the host principal is
 * the GM audience for this HTTP surface.
 */
export function createViewerHistoryLineageStores(): IViewerHistoryLineageStores {
  const db = getSQLiteService().getDatabase();
  return {
    branches: new SQLiteEventHistoryBranchStore(db),
    manifests: new SQLiteEventHistoryArtifactManifestStore(db),
  };
}

export const DEFAULT_MATCH_HISTORY_STREAM_TYPE = 'match';

/** Optional streamType for timeline lineage; invalid/missing stays `match`. */
export function matchHistoryLineageStreamType(req: NextApiRequest): string {
  const streamType = queryStringParam(req, 'streamType');
  if (streamType && STREAM_TYPE_PATTERN.test(streamType)) return streamType;
  return DEFAULT_MATCH_HISTORY_STREAM_TYPE;
}

export async function readMatchHistoryLineage(
  caller: IMatchHistoryCaller,
  streamType: string,
): Promise<IViewerHistoryLineage> {
  const meta = await getDefaultMatchStore().getMatchMeta(caller.matchId);
  return projectViewerHistoryLineage(
    createViewerHistoryLineageStores(),
    { streamType, streamId: caller.matchId },
    {
      audience: caller.playerId === meta.hostPlayerId ? 'gm' : 'player',
      viewerId: caller.playerId,
    },
  );
}

/**
 * Method, database, URL id, then scoped bearer. Returns null when the
 * response has already been written.
 */
export async function prepareMatchHistoryGet(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<IMatchHistoryCaller | null> {
  if (
    rejectUnexpectedMethod(req, res, ['GET'], () => ({
      error: 'method not allowed',
    }))
  ) {
    return null;
  }
  if (!initializeApiDatabase(res)) return null;
  const matchId = rejectMissingQueryString(
    req,
    res,
    'id',
    'missing or invalid match id',
  );
  if (!matchId) return null;
  const auth = await authenticateRequest(req, undefined, {
    kind: 'match',
    id: matchId,
  });
  if (!auth.ok) {
    res.status(401).json({ error: `Unauthorized: ${auth.reason}` });
    return null;
  }
  return { playerId: auth.playerId, matchId };
}

/** Missing, empty, or syntactically invalid streamType is a client error. */
export function rejectInvalidStreamType(
  req: NextApiRequest,
  res: NextApiResponse,
): string | undefined {
  const streamType = queryStringParam(req, 'streamType');
  if (streamType && STREAM_TYPE_PATTERN.test(streamType)) return streamType;
  res.status(400).json({ error: 'missing or invalid streamType' });
  return undefined;
}

/**
 * Human / brand refusals stay 403 with the constant message.
 * MembershipSourceUnavailableError is infrastructure and stays 500.
 */
export function rejectMatchHistoryFailure(
  res: NextApiResponse,
  error: unknown,
  fallback: string,
): void {
  if (
    error instanceof HumanActionAuthorizationError ||
    error instanceof AuthorizedViewerError
  ) {
    res.status(403).json({ error: MATCH_HISTORY_AUTHORIZATION_REFUSED });
    return;
  }
  sendCaughtApiError(res, error, fallback);
}
