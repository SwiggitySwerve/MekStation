/**
 * Fog of war for the HTTP history chain (review N6, PR #2212 review).
 *
 * B14 CONTAINMENT (B14-0A). No per-viewer reveal projection is available yet, so
 * after current-seat verification a fog-on or unknown-config match stream
 * is refused with fog-projection-unavailable before any journal read.
 * `fogMatchHistoryProjection` below is retained for the FOG chain; it is
 * not served. The rest of this header describes that retained design.
 *
 * WHY THIS EXISTS. `/api/matches/:id/export` and `/private-preview`
 * project the journal's `match` stream through the match-wire catalog,
 * whose decisions are identity pass-through. The live WebSocket path
 * runs every event through `filterEventForPlayer` /
 * `filterEventForSpectator`, holds sealed declarations to their actor
 * until reveal, and strips authority-only fields. The identity HTTP
 * projection did none of that.
 *
 * WHAT A FOG-ON MATCH GETS, per viewer, matching the live replay path
 * (`getReplayEventsForPlayer` + the publication boundary):
 *
 *   1. THE EFFECTIVE HISTORY. The S1 mirror writes the match stream on
 *      the baseline branch `main`, not `root`, so the parent's root read
 *      returns nothing for a really-mirrored match. A fog-on match is
 *      read along its effective head's verified branch path instead
 *      (`resolveBranchPath` + `materializeBranchPath`, the reads the
 *      rewind preview already relies on).
 *   2. FOG. State is folded one event at a time and each event is
 *      filtered against the state AFTER it, with durable side
 *      assignments. Spectator seats outrank any side assignment.
 *   3. SEALED CHOICES. Held to the actor until the reveal. Whether the
 *      viewer is a GM for this rule comes from the DURABLE SEAT source,
 *      never from the caller's brand: the private-preview route brands
 *      the tactical host `gm` to read its own private records, and the
 *      live wire would brand that same host `player`.
 *   4. AUTHORITY FIELDS. Each kept event goes through
 *      `projectEventForViewerClass` with that same seat role, so
 *      `sequence` (whose holes would count concealed events),
 *      `visibility` and `privateRecordRef` leave exactly as on the wire.
 *      The server-only `expectedPostStateDigest` is withheld.
 *
 * WHAT IT DOES NOT TOUCH. Fog off, and every stream type other than
 * `match`, go through the parent unchanged - same read, same object.
 * Moving fog-off onto the effective head is deliberately NOT done here:
 * fog-off has no sealed-choice hold on this path yet, so routing it
 * would turn a latent pre-reveal leak into a live one.
 *
 * FAIL CLOSED. No meta, no durable seat, a mid-stream page, an envelope
 * without a match event, a branch path that does not verify, or a
 * projection failure refuses the whole request with the constant
 * `projection-failed`. A partially fogged history is a leak.
 *
 * @spec openspec/specs/fog-of-war/spec.md
 * @spec openspec/specs/multiplayer-sync/spec.md
 */

import type { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import type { IGameEvent, IGameState } from '@/types/gameplay';

import { applyEvent, deriveState } from '@/utils/gameplay/gameState';

import type {
  IAuthorizedViewer,
  IMembershipSource,
  ViewerRole,
} from '../authorization/AuthorizedViewer';
import type { IMatchConfig, IMatchMeta } from '../IMatchStore';
import type {
  IIdentifiedViewerFact,
  IViewerProjectionServiceDeps,
  IViewerProjectionWithIdentities,
} from './ViewerProjectionService';
import type {
  IViewerProjectionRequest,
  JsonValue,
} from './ViewerProjectionTypes';

import { isAuthorizedViewer } from '../authorization/AuthorizedViewer';
import { noPerViewerRevealProjection, FOG_REFUSAL } from '../fogMatchAdmission';
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
} from './MatchWireSealedChoices';
import { projectEventForViewerClass } from './ViewerFrameProjector';
import { ViewerProjectionService } from './ViewerProjectionService';
import {
  VIEWER_PROJECTION_MESSAGES,
  ViewerProjectionError,
} from './ViewerProjectionTypes';

/** The one match-store read this service needs: the fog flag and seats. */
export interface IMatchHistoryMetaReader {
  getMatchMeta(matchId: string): Promise<IMatchMeta>;
}

/** Effective-head reads over the same SQLite handle as the journal. */
export interface IMatchHistoryHeadStores {
  readonly branches: SQLiteEventHistoryBranchStore;
  readEffectiveStreamHead(stream: {
    readonly streamType: string;
    readonly streamId: string;
  }): { readonly branchId: string; readonly revision: number };
}

export interface IFogAwareMatchProjectionDeps extends IViewerProjectionServiceDeps {
  readonly matchMeta: IMatchHistoryMetaReader;
  readonly heads: IMatchHistoryHeadStores;
  /**
   * Durable seat membership - the source the live wire resolves viewers
   * from. Never a GM-remapping wrapper.
   */
  readonly seatMembership: IMembershipSource;
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

/** The envelope shape check the live wire relies on: type, game, sequence. */
function isMatchEvent(value: unknown): value is IGameEvent {
  return (
    isRecord(value) &&
    typeof value['type'] === 'string' &&
    typeof value['gameId'] === 'string' &&
    typeof value['sequence'] === 'number'
  );
}

/** The match event inside a mirrored `IMatchJournalEnvelope`, or refuse. */
function matchEventOf(payload: unknown): IGameEvent {
  if (!isRecord(payload)) projectionFailed();
  const event = payload['matchEvent'];
  if (!isMatchEvent(event)) projectionFailed();
  return event;
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

/** Strip authority-only fields exactly as the wire does for this role. */
function wireShaped(event: IGameEvent, role: ViewerRole): JsonValue {
  const projected = projectEventForViewerClass(event, role);
  if (projected.kind === 'failure') projectionFailed();
  return projected.event as JsonValue;
}

/**
 * One viewer's fogged view of an already-authorized match projection.
 * `seatRole` is the viewer's role from durable seats (see header 3).
 * Identities ride along unchanged for the facts that survive, so the
 * delivery-epoch path assigns nothing for a withheld event.
 */
export function fogMatchHistoryProjection(
  viewer: IAuthorizedViewer,
  seatRole: ViewerRole,
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
  // The sealed rule reads `role` and `principalId` only; the role it
  // sees is the seat role, not the caller's brand. A spectator owns no
  // side (fog-of-war D6), so a stale side assignment naming it never
  // makes it the actor of a sealed choice.
  const sealedAudience = { ...viewer, role: seatRole } as IAuthorizedViewer;
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
        (!spectator &&
          sealed?.isActorOwnedByViewer?.(sealedAudience, event) === true)
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
    const payload: JsonValue = {
      matchEvent: wireShaped(visible, seatRole),
      expectedPostStateDigest: null,
    };
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

/** The parent's brand-then-scope refusal, with its codes and messages. */
function assertViewerScope(viewer: IAuthorizedViewer, streamId: string): void {
  if (!isAuthorizedViewer(viewer)) {
    throw new ViewerProjectionError(
      'not-a-viewer',
      VIEWER_PROJECTION_MESSAGES.notAViewer,
    );
  }
  if (
    streamId !== viewer.campaignSessionId &&
    (viewer.matchId === null || streamId !== viewer.matchId)
  ) {
    throw new ViewerProjectionError(
      'wrong-session',
      VIEWER_PROJECTION_MESSAGES.wrongSession,
    );
  }
}

/**
 * The history graph's projection service. Identical to its parent for
 * every stream but a fog-on `match` stream. Overriding
 * `projectWithIdentities` covers `project()` (export, private-preview)
 * and `projectWithCursor` (history pages) at once; overriding the read
 * keeps the parent's brand, scope and registry checks in front of it.
 */
export class FogAwareMatchProjectionService extends ViewerProjectionService {
  private readonly fogDeps: IFogAwareMatchProjectionDeps;

  public constructor(deps: IFogAwareMatchProjectionDeps) {
    super({ journal: deps.journal, registry: deps.registry });
    this.fogDeps = deps;
  }

  public override async projectWithIdentities(
    viewer: IAuthorizedViewer,
    request: IViewerProjectionRequest,
  ): Promise<IViewerProjectionWithIdentities> {
    // The parent's brand and scope checks run before any match read.
    assertViewerScope(viewer, request.streamId);
    if (
      request.streamType === MATCH_STREAM_TYPE &&
      noPerViewerRevealProjection(await this.matchConfig(request.streamId))
    ) {
      await this.requireCurrentSeat(viewer, request);
      throw new ViewerProjectionError('projection-failed', FOG_REFUSAL);
    }
    return super.projectWithIdentities(viewer, request);
  }

  /** Authoritative config, or undefined (unknown) when unreadable. */
  private async matchConfig(
    matchId: string,
  ): Promise<IMatchConfig | undefined> {
    try {
      return (await this.fogDeps.matchMeta.getMatchMeta(matchId)).config;
    } catch {
      return undefined;
    }
  }

  /** Membership precedes fog policy: a non-member learns nothing of fog. */
  private async requireCurrentSeat(
    viewer: IAuthorizedViewer,
    request: IViewerProjectionRequest,
  ): Promise<void> {
    const seat = await this.fogDeps.seatMembership
      .lookupMembership(viewer.principalId, request.streamId)
      .catch(() => projectionFailed());
    if (seat === null || !seat.active) {
      throw new ViewerProjectionError(
        'wrong-session',
        VIEWER_PROJECTION_MESSAGES.wrongSession,
      );
    }
  }
}
