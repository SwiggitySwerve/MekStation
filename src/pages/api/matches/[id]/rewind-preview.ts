/**
 * /api/matches/[id]/rewind-preview — what a GM rewind would touch, before
 * anything is touched (add-authoritative-history-branches; umbrella 13.4).
 *
 * POST returns `GmCombatRewindPreviewResult` VERBATIM. No envelope: both
 * arms already carry `kind`, so a wrapper would only add a second thing
 * to unwrap. Status carries the class, body carries the answer:
 *
 *   200  a preview
 *   403  the caller is not this match's GM
 *   404  no authoritative history for this match (or no such match)
 *   409  every other typed refusal
 *
 * TWO BODY SHAPES, ONE ADAPTER RULE. Anything the PREVIEW produced is
 * the union above. Anything rejected before it ran - a malformed body,
 * an unauthenticated caller, the wrong method - uses the existing
 * `{ error }` shape from `routeHelpers`, exactly as
 * `campaigns/[id]/commands` does. A client tells them apart by whether
 * `kind` is present: present means domain, absent means transport.
 *
 * A KNOWN WART, recorded rather than smoothed over:
 * `replacement-events-unsupported` exists in BOTH shapes. The body guard
 * below refuses `replacementEvents` with a 400 `{ error, reason }`
 * because that is a malformed request and it is the shape
 * `commands.ts` uses for the same class of thing (`author-not-accepted`).
 * The module keeps its own 409 arm because the module is callable
 * directly - the dialog surface injects its own producer and never comes
 * through here - so deleting either one would leave a caller unguarded.
 *
 * "GM" ON THIS ROUTE MEANS THE MATCH'S CURRENT HOST. Finding #55: no
 * production match viewer ever resolves as `role: 'gm'` -
 * `MatchSeatMembershipSource` hardcodes `'player'` at every return. So
 * the viewer is branded first (which proves server-derived, active,
 * human membership) and the GM role is then derived from
 * `meta.hostPlayerId`, the same privileged identity the lobby already
 * enforces host-only intents against. Teaching the membership source to
 * emit `'gm'` is the eventual home and is its own seam: that role is
 * what `projectEventForViewerClass` keys on, so changing it would change
 * the live wire's field policy for the host.
 *
 * `campaignSessionId` IS the matchId for combat - `authorizeHumanAction`
 * passes its third argument straight through to the resolver. That is
 * the established convention here, not something this route bends.
 *
 * A successful preview then stores one server-only GM review record
 * through GmPrivatePreviewRecordWriter. The write lives HERE, not in
 * previewGmCombatRewind: that module is a pure consult so its storage
 * census stays true, and an unfinalized preview is reachable only
 * through this authorized GM path. Refusals write nothing. The record
 * is never copied onto the response, a player frame, a snapshot, a
 * history read, or an export.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-combat-interventions/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';
import type { IGmAuthorityContext } from '@/types/interventions';

import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLitePrivateRecordRepository } from '@/lib/events/privacy/SQLitePrivateRecordRepository';
import { authenticateRequest } from '@/lib/multiplayer/server/auth';
import {
  AuthorizedViewerError,
  AuthorizedViewerResolver,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import {
  authorizeHumanAction,
  HumanActionAuthorizationError,
} from '@/lib/multiplayer/server/authorization/HumanActionAuthorizationGate';
import { MatchSeatMembershipSource } from '@/lib/multiplayer/server/authorization/MatchSeatMembershipSource';
import { getDefaultMatchStore } from '@/lib/multiplayer/server/getDefaultMatchStore';
import {
  matchStreamRef,
  previewGmCombatRewind,
} from '@/lib/multiplayer/server/history/GmCombatRewindPreview';
import { GmPrivatePreviewRecordWriter } from '@/lib/multiplayer/server/history/GmPrivatePreviewRecordWriter';
import { matchStoreBranchSegmentReader } from '@/lib/multiplayer/server/history/matchStoreBranchSegmentReader';
import { hasCombatOutcomeOutbox } from '@/lib/multiplayer/server/IMatchStore';
import { combatViewerProbe } from '@/lib/multiplayer/server/projection/combatViewerProbe';
import { HostAsGmMembershipSource } from '@/pages-modules/api/hostAsGmMembershipSource';
import {
  FOG_DISABLED_STATE,
  isPreviewBody,
  readEffectiveRevision,
  refused,
  statusForRefusal,
  viewerIdsFor,
} from '@/pages-modules/api/rewindPreviewRouteSupport';
import {
  initializeApiDatabase,
  rejectMissingQueryString,
  sendCaughtApiError,
} from '@/pages-modules/api/routeHelpers';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { nowIso } from '@/types/multiplayer/Protocol';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (!initializeApiDatabase(res)) return;

  const matchId = rejectMissingQueryString(
    req,
    res,
    'id',
    'missing or invalid match id',
  );
  if (!matchId) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const body = req.body as unknown;
  // Refused, never stripped: a client that sent replacement events and
  // got a preview back would believe they had been previewed.
  if (
    typeof body === 'object' &&
    body !== null &&
    'replacementEvents' in body
  ) {
    res.status(400).json({
      error:
        'this rewind truncates history; replacement events are not accepted',
      reason: 'replacement-events-unsupported',
    });
    return;
  }
  if (!isPreviewBody(body)) {
    res.status(400).json({ error: 'missing or invalid request body' });
    return;
  }

  // Identity BEFORE anything match-specific: an anonymous caller learns
  // only that it must authenticate, never whether the match exists.
  const auth = await authenticateRequest(req);
  if (!auth.ok) {
    res.status(401).json({ error: `Unauthorized: ${auth.reason}` });
    return;
  }

  try {
    const store = getDefaultMatchStore();
    let meta: IMatchMeta;
    try {
      meta = await store.getMatchMeta(matchId);
    } catch {
      res.status(404).json({ error: 'unknown match', reason: 'unknown-match' });
      return;
    }

    // The brand is the authorization. A preview is a READ, so it asks
    // for the `branch` stream kind - a `command` request would run the
    // force-scope check and refuse a GM who holds no forces.
    const membership = new MatchSeatMembershipSource(store);
    const viewer = await authorizeHumanAction(
      new AuthorizedViewerResolver(membership),
      auth.playerId,
      matchId,
      { kind: 'branch', streamType: 'match', streamId: matchId },
    );

    // Fog would make the projection depend on engine state this route
    // does not hold. Refused rather than answered from a placeholder:
    // a blast radius computed against the wrong fog is worse than none.
    if (meta.config.fogOfWar === true) {
      refused(res, 409, {
        kind: 'refused',
        reason: 'fog-preview-unsupported',
        detail:
          'This match runs with fog of war; a rewind preview cannot yet be derived for it',
      });
      return;
    }

    const stream = matchStreamRef(matchId);
    const branches = new SQLiteEventHistoryBranchStore(
      getSQLiteService().getDatabase(),
    );
    const head = branches.readEffectiveHead(stream);
    // A stream with no effective head gets revision 0 and the MODULE
    // refuses it. Deciding here too would be a second copy of a rule
    // that already has one owner.
    const priorHeadRevision =
      head === null ? 0 : readEffectiveRevision(stream, head.branchId);

    const authority: IGmAuthorityContext = {
      actorId: viewer.principalId,
      role: viewer.principalId === meta.hostPlayerId ? 'gm' : 'player',
      gameId: matchId,
      ownedStateRefs: [`game:${matchId}`],
    };

    const result = await previewGmCombatRewind(
      {
        db: getSQLiteService().getDatabase(),
        branches,
        reader: matchStoreBranchSegmentReader(store),
        priorHeadRevision,
        viewerIds: viewerIdsFor(meta),
        probe: combatViewerProbe({
          state: FOG_DISABLED_STATE,
          audience: {
            gmPlayerId: meta.hostPlayerId,
            playerIds: meta.playerIds,
            config: { fogOfWar: false },
            sideAssignments: meta.sideAssignments,
          },
        }),
        readOutcomeId: async (id) =>
          hasCombatOutcomeOutbox(store)
            ? ((await store.getCombatOutcomeOutbox(id))?.outcomeId ?? null)
            : null,
      },
      authority,
      { matchId, ...body },
    );

    if (result.kind === 'preview') {
      // Record after the consult so a 403/404/409 leaves no row, and
      // so the preview module itself never writes.
      const writer = new GmPrivatePreviewRecordWriter(
        new SQLitePrivateRecordRepository(getSQLiteService().getDatabase()),
      );
      await writer.store({
        resolver: new AuthorizedViewerResolver(
          new HostAsGmMembershipSource(membership, meta.hostPlayerId),
        ),
        principalId: viewer.principalId,
        campaignSessionId: matchId,
        commandId: null,
        createdAt: nowIso(),
        preview: {
          actorId: viewer.principalId,
          stream,
          branchId: result.priorHead.branchId,
          targetRevision: result.targetRevision,
          entries: result.entries,
          changedViewerIds: result.changedViewerIds,
        },
        derivedSummary: `GM rewind preview to revision ${String(result.targetRevision)}`,
      });
      res.status(200).json(result);
      return;
    }
    refused(res, statusForRefusal(result.reason), result);
  } catch (error) {
    // A refused brand is a 403, not a fault: the caller is authenticated
    // but is not an active human member of this match. The message stays
    // the gate's constant, id-free one so a refusal cannot be used to
    // probe which matches exist.
    if (
      error instanceof HumanActionAuthorizationError ||
      error instanceof AuthorizedViewerError
    ) {
      refused(res, 403, {
        kind: 'refused',
        reason: 'state-not-owned',
        detail: `command refused: ${error.code}`,
      });
      return;
    }
    sendCaughtApiError(res, error, 'rewind preview failed');
  }
}
