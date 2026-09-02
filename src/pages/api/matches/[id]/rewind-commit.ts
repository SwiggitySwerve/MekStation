/**
 * /api/matches/[id]/rewind-commit — perform the approved GM rewind
 * (add-authoritative-history-branches; umbrella 13.5, seam 3b-iv-b).
 *
 * POST returns `GmCombatRewindCommitResult` VERBATIM. No envelope: both
 * arms already carry `kind`. Status carries the class, body the answer:
 *
 *   200  committed
 *   403  gm-role-required / actor-mismatch / state-not-owned
 *   404  no authoritative history
 *   409  every other typed refusal, including the three commit-only
 *        members (candidate-verification-failed, generation-exhausted,
 *        correction-lease-held)
 *
 * Transport `{ error }` is only for 400 / 401 / 405 / 500 — the same
 * split the preview route already taught clients: `kind` present means
 * domain, absent means transport.
 *
 * Replacement events are REFUSED, never stripped. A client that sent
 * them and got a commit back would believe they had been applied.
 *
 * "GM" here means the match's current host (finding #55). The viewer is
 * branded first; the role is then derived from `meta.hostPlayerId`.
 * The actor is the branded principal, never a body field.
 *
 * `nowIso` is created HERE. The history module must not touch the clock.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-combat-interventions/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { GmCombatRewindCommitResult } from '@/lib/multiplayer/server/history/GmCombatRewindCommit';
import type { IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';
import type { IGmAuthorityContext } from '@/types/interventions';

import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { authenticateRequest } from '@/lib/multiplayer/server/auth';
import {
  AuthorizedViewerError,
  AuthorizedViewerResolver,
  isAuthorizedViewer,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import {
  authorizeHumanAction,
  HumanActionAuthorizationError,
} from '@/lib/multiplayer/server/authorization/HumanActionAuthorizationGate';
import { MatchSeatMembershipSource } from '@/lib/multiplayer/server/authorization/MatchSeatMembershipSource';
import { getDefaultMatchStore } from '@/lib/multiplayer/server/getDefaultMatchStore';
import { commitGmCombatRewind } from '@/lib/multiplayer/server/history/GmCombatRewindCommit';
import { matchStreamRef } from '@/lib/multiplayer/server/history/GmCombatRewindPreview';
import {
  initializeApiDatabase,
  rejectMissingQueryString,
  sendCaughtApiError,
} from '@/pages-modules/api/routeHelpers';
import {
  buildGmCombatRewindCommitDeps,
  isRewindCommitBody,
  readEffectiveRevision,
  REWIND_COMMIT_REASON,
} from '@/pages-modules/api/rewindCommitDeps';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

function refused(
  res: NextApiResponse,
  status: number,
  result: GmCombatRewindCommitResult,
): void {
  res.status(status).json(result);
}

/** 403 for the authority arms, 404 for a stream we hold nothing for. */
function statusForRefusal(
  reason: Extract<GmCombatRewindCommitResult, { kind: 'refused' }>['reason'],
): number {
  if (
    reason === 'gm-role-required' ||
    reason === 'actor-mismatch' ||
    reason === 'state-not-owned'
  ) {
    return 403;
  }
  return reason === 'no-authoritative-history' ? 404 : 409;
}

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
  // got a commit back would believe they had been applied.
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
  if (!isRewindCommitBody(body)) {
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

    const viewer = await authorizeHumanAction(
      new AuthorizedViewerResolver(new MatchSeatMembershipSource(store)),
      auth.playerId,
      matchId,
      { kind: 'branch', streamType: 'match', streamId: matchId },
    );
    // Brand recheck is the authorization. Property reads are not.
    if (!isAuthorizedViewer(viewer)) {
      refused(res, 403, {
        kind: 'refused',
        reason: 'state-not-owned',
        detail: 'command refused: no-viewer',
      });
      return;
    }

    if (meta.config.fogOfWar === true) {
      refused(res, 409, {
        kind: 'refused',
        reason: 'fog-preview-unsupported',
        detail:
          'This match runs with fog of war; a rewind cannot yet be derived for it',
      });
      return;
    }

    const stream = matchStreamRef(matchId);
    const branches = new SQLiteEventHistoryBranchStore(
      getSQLiteService().getDatabase(),
    );
    const head = branches.readEffectiveHead(stream);
    const priorHeadRevision =
      head === null ? 0 : readEffectiveRevision(stream, head.branchId);

    const authority: IGmAuthorityContext = {
      actorId: viewer.principalId,
      role: viewer.principalId === meta.hostPlayerId ? 'gm' : 'player',
      gameId: matchId,
      ownedStateRefs: [`game:${matchId}`],
    };

    const result = await commitGmCombatRewind(
      buildGmCombatRewindCommitDeps({
        store,
        meta,
        priorHeadRevision,
        nowIso: () => new Date().toISOString(),
      }),
      authority,
      {
        matchId,
        ...body,
        actor: viewer.principalId,
        reason: REWIND_COMMIT_REASON,
      },
    );

    if (result.kind === 'committed') {
      res.status(200).json(result);
      return;
    }
    refused(res, statusForRefusal(result.reason), result);
  } catch (error) {
    // A refused brand is a 403, not a fault. The module is not called.
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
    sendCaughtApiError(res, error, 'rewind commit failed');
  }
}
