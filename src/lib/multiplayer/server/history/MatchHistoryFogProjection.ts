/**
 * Fog of war for the HTTP history chain (review N6, 2026-10-17).
 *
 * WHY THIS EXISTS. `/api/matches/:id/export` and `/private-preview`
 * project the journal's `match` stream through the match-wire catalog,
 * whose decisions are identity pass-through: every `GameCreated` went
 * out with both sides' `customUnitDefinition` and
 * `criticalSlotManifest`, and every fog-withheld event went out whole.
 * The live WebSocket path never did that - `broadcastEvent` and
 * `sendReplay` run each event through `filterEventForPlayer` /
 * `filterEventForSpectator` - so a seated opponent could read through
 * HTTP what the wire withheld.
 *
 * WHAT IT DOES. For a fog-on match this service hands each viewer the
 * view the live replay path would: fold the stream into state one event
 * at a time, filter each event against the state AFTER it (exactly as
 * `getReplayEventsForPlayer` does), keep sealed declarations to their
 * actor until reveal (exactly as the publication boundary does), and
 * route spectators through the most-redacted spectator audience. The
 * server-only `expectedPostStateDigest` is withheld too: it is a digest
 * of the authoritative state the fog hides, and no live frame carries it.
 *
 * WHAT IT DOES NOT TOUCH. Fog off, and every stream type other than
 * `match`, return the parent projection object unchanged - same
 * reference, same bytes. Anything it cannot read on a fog-on match
 * (no meta, an envelope without a match event, a fold that throws, a
 * request that starts mid-stream so the prefix is missing) refuses the
 * whole request with the constant `projection-failed`: a partially
 * filtered history is a leak with extra steps.
 *
 * @spec openspec/specs/fog-of-war/spec.md
 */

import type { IGameEvent, IGameState } from '@/types/gameplay';

import { applyEvent, deriveState } from '@/utils/gameplay/gameState';

import type { IAuthorizedViewer } from '../authorization/AuthorizedViewer';
import type { IMatchMeta } from '../IMatchStore';
import type {
  IIdentifiedViewerFact,
  IViewerProjectionServiceDeps,
  IViewerProjectionWithIdentities,
} from '../projection/ViewerProjectionService';
import type {
  IViewerProjectionRequest,
  JsonValue,
} from '../projection/ViewerProjectionTypes';

import {
  filterEventForPlayer,
  filterEventForSpectator,
  FogOfWarVisibilityCache,
} from '../fogOfWar';
import { isSpectatorPlayer } from '../lobby/spectatorSeats';
import { MATCH_STREAM_TYPE } from '../MatchStreamJournalMirror';
import {
  createMatchWireSealedChoiceAudienceContext,
  isMatchWireSealedDeclaration,
} from '../projection/MatchWireSealedChoices';
import { ViewerProjectionService } from '../projection/ViewerProjectionService';
import {
  VIEWER_PROJECTION_MESSAGES,
  ViewerProjectionError,
} from '../projection/ViewerProjectionTypes';

/** The one match-store read this service needs: the fog flag and seats. */
export interface IMatchHistoryMetaReader {
  getMatchMeta(matchId: string): Promise<IMatchMeta>;
}

export interface IFogAwareMatchProjectionDeps extends IViewerProjectionServiceDeps {
  readonly matchMeta: IMatchHistoryMetaReader;
}

function projectionFailed(): never {
  throw new ViewerProjectionError(
    'projection-failed',
    VIEWER_PROJECTION_MESSAGES.projectionFailed,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The match event inside a mirrored `IMatchJournalEnvelope`, or refuse. */
function matchEventOf(payload: unknown): IGameEvent {
  if (!isRecord(payload)) projectionFailed();
  const event = payload['matchEvent'];
  if (
    !isRecord(event) ||
    typeof event['type'] !== 'string' ||
    typeof event['gameId'] !== 'string' ||
    typeof event['sequence'] !== 'number'
  ) {
    projectionFailed();
  }
  return event as unknown as IGameEvent;
}

/** The live path's visibility state: engine state plus durable seats. */
function withSideAssignments(state: IGameState, meta: IMatchMeta): IGameState {
  return { ...state, sideAssignments: meta.sideAssignments } as IGameState;
}

/** State after each event, in order. A throwing fold refuses the read. */
function statesAfterEach(events: readonly IGameEvent[]): readonly IGameState[] {
  const first = events[0];
  if (first === undefined) return [];
  try {
    let state = deriveState(first.gameId, []);
    return events.map((event) => {
      state = applyEvent(state, event);
      return state;
    });
  } catch {
    projectionFailed();
  }
}

/**
 * One viewer's fogged view of an already-authorized match projection.
 * Identities ride along unchanged for the facts that survive, so the
 * delivery-epoch path assigns nothing for a withheld event.
 */
export function fogMatchHistoryProjection(
  viewer: IAuthorizedViewer,
  identified: IViewerProjectionWithIdentities,
  meta: IMatchMeta,
): IViewerProjectionWithIdentities {
  const entries = identified.identifiedFacts;
  const events = entries.map((entry) => matchEventOf(entry.fact.payload));
  const states = statesAfterEach(events);
  const finalState = states[states.length - 1];
  const sealed =
    finalState === undefined
      ? undefined
      : createMatchWireSealedChoiceAudienceContext(
          events,
          withSideAssignments(finalState, meta),
          Number.MAX_SAFE_INTEGER,
        );
  const spectator = isSpectatorPlayer(meta.seats ?? [], viewer.principalId);
  const cache = new FogOfWarVisibilityCache();
  const kept: IIdentifiedViewerFact[] = [];

  entries.forEach((entry, index) => {
    const event = events[index];
    const state = states[index];
    if (event === undefined || state === undefined) projectionFailed();
    let visible: IGameEvent | null;
    if (isMatchWireSealedDeclaration(event)) {
      visible =
        sealed?.isSealedChoiceRevealed?.(event) === true ||
        sealed?.isActorOwnedByViewer?.(viewer, event) === true
          ? event
          : null;
    } else {
      const visibility = withSideAssignments(state, meta);
      visible = spectator
        ? filterEventForSpectator(event, visibility, {
            config: meta.config,
            cache,
          })
        : filterEventForPlayer(event, viewer.principalId, visibility, {
            config: meta.config,
            cache,
          });
    }
    if (visible === null) return;
    const payload = {
      matchEvent: visible,
      expectedPostStateDigest: null,
    } as unknown as JsonValue;
    kept.push(
      Object.freeze({
        fact: Object.freeze({
          factType: entry.fact.factType,
          sequenceHint: kept.length + 1,
          payload,
        }),
        projectedEventIdentity: entry.projectedEventIdentity,
      }),
    );
  });

  return Object.freeze({
    projection: Object.freeze({
      ...identified.projection,
      facts: Object.freeze(kept.map((entry) => entry.fact)),
    }),
    identifiedFacts: Object.freeze(kept),
  });
}

/**
 * The history graph's projection service. Identical to its parent for
 * every stream but a fog-on `match` stream, which it fogs per viewer.
 * Overriding `projectWithIdentities` covers `project()` (export,
 * private-preview) and `projectWithCursor` (history pages) at once.
 */
export class FogAwareMatchProjectionService extends ViewerProjectionService {
  private readonly matchMeta: IMatchHistoryMetaReader;

  public constructor(deps: IFogAwareMatchProjectionDeps) {
    super({ journal: deps.journal, registry: deps.registry });
    this.matchMeta = deps.matchMeta;
  }

  public override async projectWithIdentities(
    viewer: IAuthorizedViewer,
    request: IViewerProjectionRequest,
  ): Promise<IViewerProjectionWithIdentities> {
    const identified = await super.projectWithIdentities(viewer, request);
    if (request.streamType !== MATCH_STREAM_TYPE) return identified;
    let meta: IMatchMeta;
    try {
      meta = await this.matchMeta.getMatchMeta(request.streamId);
    } catch {
      projectionFailed();
    }
    if (meta.config.fogOfWar !== true) return identified;
    // Visibility is a function of the whole prefix; a page that starts
    // mid-stream has no honest state to filter against.
    if ((request.afterRevision ?? 0) !== 0) projectionFailed();
    return fogMatchHistoryProjection(viewer, identified, meta);
  }
}
