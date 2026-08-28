/**
 * Viewer publication boundary for live, replay, and SessionJoin frames
 * (authority-audit PR 8).
 *
 * Pure guards: no IO, no Date, no store access. The host resolves the
 * branded viewer, then asks this module whether a frame may be sent.
 * Missing catalog entries and projector throws fail closed with a typed
 * ViewerProjectionError; the host must not fall back to the raw frame.
 *
 * Public v1 decisions pass the original envelope through unchanged
 * (parity law). Hidden / gm-only / owner-only apply the PR 6 audience
 * visibility law and either omit the frame or send the original
 * envelope to eligible viewers. Control frames (Lobby, Error, Pong,
 * Heartbeat, ReplayStart/End metadata) are not catalog events.
 *
 * The parity law is about the AUDIENCE decision: it does not rewrite a
 * payload it decided a viewer may have. Removing server-only authority
 * fields is a separate law, and umbrella task 11.1 applies it here -
 * once, in `decideEvent`, which live, baseline, and replay all reach -
 * via `projectEventForViewer`. Doing it per surface let them disagree.
 * An event with nothing to remove keeps its identity, so a frame the
 * projector does not touch is still the object the authority published.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/gm-authority-redaction/spec.md
 */

import type {
  IEventMessage,
  IReplayChunk,
  IReplayEnd,
  IReplayStart,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import type { IAuthorizedViewer } from '../authorization/AuthorizedViewer';
import type { IReplayStreamFrames } from '../reconnection/replayStream';

import { isAuthorizedViewer } from '../authorization/AuthorizedViewer';
import { createMatchWireAudienceProjector } from './MatchWireAudienceCatalog';
import {
  isOwnerAudienceMatch,
  type ViewerAudienceDecision,
  type ViewerAudienceProjector,
} from './ViewerAudienceProjector';
import { projectEventForViewer } from './ViewerFrameProjector';
import {
  VIEWER_PROJECTION_MESSAGES,
  ViewerProjectionError,
} from './ViewerProjectionTypes';

/** Result when the frame may be sent to this viewer. */
export interface IPublicationSend<T> {
  readonly kind: 'send';
  readonly value: T;
}

/** Result when this viewer must not receive the frame. */
export interface IPublicationOmit {
  readonly kind: 'omit';
}

/** Typed fail-closed refusal. Never carries a payload fragment. */
export interface IPublicationFailure {
  readonly kind: 'failure';
  readonly error: ViewerProjectionError;
}

export type PublicationGuardResult<T> =
  | IPublicationSend<T>
  | IPublicationOmit
  | IPublicationFailure;

export type ReplayFramesGuardResult =
  | { readonly kind: 'send'; readonly frames: IReplayStreamFrames }
  | IPublicationFailure;

/**
 * Constant projection-failed refusal. Inner throw messages stay off
 * this object so JSON of the error cannot leak a payload fragment.
 */
function projectionFailed(): ViewerProjectionError {
  return new ViewerProjectionError(
    'projection-failed',
    VIEWER_PROJECTION_MESSAGES.projectionFailed,
  );
}

/**
 * Constant not-a-viewer refusal. Brand check is mandatory at this
 * boundary; property reads on a structural clone are not authority.
 */
function notAViewer(): ViewerProjectionError {
  return new ViewerProjectionError(
    'not-a-viewer',
    VIEWER_PROJECTION_MESSAGES.notAViewer,
  );
}

/**
 * Reads event type and payload from a wire event object.
 * Returns null when the value is not an object with a string type,
 * which the caller treats as a missing catalog entry (fail closed).
 */
function readWireEvent(
  event: unknown,
): { readonly type: string; readonly payload: unknown } | null {
  if (typeof event !== 'object' || event === null) return null;
  const record = event as {
    readonly type?: unknown;
    readonly payload?: unknown;
  };
  if (typeof record.type !== 'string' || record.type.trim().length === 0) {
    return null;
  }
  return { type: record.type, payload: record.payload };
}

/**
 * True when this viewer may receive a fact for `decision`.
 * Hidden and out-of-audience return false with no placeholder.
 */
function isVisibleToViewer(
  viewer: IAuthorizedViewer,
  decision: ViewerAudienceDecision,
  payload: unknown,
): boolean {
  if (decision.kind === 'hidden') return false;
  if (decision.kind === 'gm-only') return viewer.role === 'gm';
  if (decision.kind === 'owner-only') {
    return isOwnerAudienceMatch(viewer, payload);
  }
  return true;
}

/**
 * Runs the catalog `project` function. Throws are mapped onto the
 * constant projection-failed refusal so inner messages cannot leak.
 */
function applyProject(
  decision: ViewerAudienceDecision,
  payload: unknown,
  viewer: IAuthorizedViewer,
): ViewerProjectionError | null {
  if (decision.kind === 'hidden') return null;
  try {
    decision.project(payload, viewer);
    return null;
  } catch {
    return projectionFailed();
  }
}

/**
 * Reads the last event's sequence for ReplayEnd after a hidden filter.
 * Returns null when the event has no numeric sequence.
 */
function readSequence(event: unknown): number | null {
  if (typeof event !== 'object' || event === null) return null;
  const record = event as { readonly sequence?: unknown };
  return typeof record.sequence === 'number' ? record.sequence : null;
}

/**
 * Rebuilds the replay envelope around chunks that were already guarded
 * IN PLACE, preserving the original timestamps so this module never
 * invents a clock value.
 *
 * `chunks` carries the ORIGINAL pagination. `streamReplay` pages the
 * events precisely "so that long matches don't push a single megabyte
 * payload", so concatenating the survivors into one chunk would undo
 * that. A page may shrink or empty out; its boundaries are not ours.
 */
function rebuildReplayFrames(
  frames: IReplayStreamFrames,
  chunks: readonly IServerMessage[],
  totalEvents: number,
  lastVisibleEvent: unknown,
): IReplayStreamFrames {
  const start: IServerMessage =
    frames.start.kind === 'ReplayStart'
      ? ({ ...frames.start, totalEvents } satisfies IReplayStart)
      : frames.start;
  const lastSequence = readSequence(lastVisibleEvent);
  const end: IServerMessage =
    frames.end.kind === 'ReplayEnd' && lastSequence !== null
      ? ({ ...frames.end, toSeq: lastSequence } satisfies IReplayEnd)
      : frames.end;
  return { start, chunks, end };
}

/**
 * Pure publication guards bound to one audience projector.
 */
export class ViewerPublicationBoundary {
  /**
   * Binds a validated audience projector. Production uses the v1
   * match-wire catalog; tests may inject a synthetic catalog.
   */
  public constructor(private readonly projector: ViewerAudienceProjector) {}

  /**
   * Guards one live Event envelope for one branded viewer.
   * Public decisions return the ORIGINAL message object (parity law).
   * Hidden / out-of-audience return omit. Missing decision or project
   * throw return typed failure (no raw fallback).
   */
  public guardLiveEvent(
    viewer: IAuthorizedViewer,
    eventMessage: IEventMessage,
  ): PublicationGuardResult<IEventMessage> {
    if (!isAuthorizedViewer(viewer)) {
      return { kind: 'failure', error: notAViewer() };
    }
    if (eventMessage.kind !== 'Event') {
      return { kind: 'failure', error: projectionFailed() };
    }
    return this.guardEventEnvelope(viewer, eventMessage, eventMessage.event);
  }

  /**
   * Guards a SessionJoin replay bundle. Failure refuses the WHOLE
   * bundle so the host never sends ReplayStart then a raw chunk.
   * When every event is public identity, the original frames object
   * is returned (byte-identical envelopes, stamps included).
   *
   * Each chunk is guarded IN PLACE rather than the bundle being
   * flattened, so the caller's pagination survives a removal that
   * touches every event - the normal case, since the authority stamps
   * its concealment class on everything it emits.
   */
  public guardReplayFrames(
    viewer: IAuthorizedViewer,
    frames: IReplayStreamFrames,
  ): ReplayFramesGuardResult {
    if (!isAuthorizedViewer(viewer)) {
      return { kind: 'failure', error: notAViewer() };
    }
    const guardedChunks: IServerMessage[] = [];
    let changed = false;
    let totalEvents = 0;
    let lastVisibleEvent: unknown;
    for (const chunk of frames.chunks) {
      if (chunk.kind !== 'ReplayChunk') {
        guardedChunks.push(chunk);
        continue;
      }
      const guarded = this.guardReplayChunk(viewer, chunk);
      if (guarded.kind === 'failure') return guarded;
      if (guarded.value !== chunk) changed = true;
      guardedChunks.push(guarded.value);
      totalEvents += guarded.value.events.length;
      if (guarded.value.events.length > 0) {
        lastVisibleEvent =
          guarded.value.events[guarded.value.events.length - 1];
      }
    }
    if (!changed) {
      return { kind: 'send', frames };
    }
    return {
      kind: 'send',
      frames: rebuildReplayFrames(
        frames,
        guardedChunks,
        totalEvents,
        lastVisibleEvent,
      ),
    };
  }

  /**
   * Guards one SessionJoin outbound envelope (baseline control or a
   * replay/event payload). Event and ReplayChunk payloads use the
   * catalog; other control kinds pass through after the brand check.
   */
  public guardBaseline(
    viewer: IAuthorizedViewer,
    baselineMessage: IServerMessage,
  ): PublicationGuardResult<IServerMessage> {
    if (!isAuthorizedViewer(viewer)) {
      return { kind: 'failure', error: notAViewer() };
    }
    if (baselineMessage.kind === 'Event') {
      return this.guardEventEnvelope(
        viewer,
        baselineMessage,
        baselineMessage.event,
      );
    }
    if (baselineMessage.kind === 'ReplayChunk') {
      return this.guardReplayChunk(viewer, baselineMessage);
    }
    return { kind: 'send', value: baselineMessage };
  }

  /**
   * Applies catalog law to one stored/live event value and reports
   * send / omit / failure without wrapping a new envelope.
   */
  private decideEvent(
    viewer: IAuthorizedViewer,
    event: unknown,
  ): PublicationGuardResult<unknown> {
    const parsed = readWireEvent(event);
    if (parsed === null) {
      return { kind: 'failure', error: projectionFailed() };
    }
    const decision = this.projector.decisionFor(parsed.type);
    if (decision === undefined) {
      return { kind: 'failure', error: projectionFailed() };
    }
    if (!isVisibleToViewer(viewer, decision, parsed.payload)) {
      return { kind: 'omit' };
    }
    const projectError = applyProject(decision, parsed.payload, viewer);
    if (projectError !== null) {
      return { kind: 'failure', error: projectError };
    }
    // Audience law settled; now the authority-field law. This is the
    // ONE place it is applied, so live, baseline, and replay cannot
    // disagree about what a viewer is holding. It returns the same
    // object when there is nothing to remove, which is what lets the
    // callers below keep the original envelope, chunk, or bundle.
    const projected = projectEventForViewer(viewer, event);
    if (projected.kind === 'failure') {
      return { kind: 'failure', error: projected.error };
    }
    return { kind: 'send', value: projected.event };
  }

  /**
   * Event-envelope path used by live publication and Event baselines.
   * On send, returns the original envelope object so stamps stay put.
   */
  private guardEventEnvelope<T extends IEventMessage>(
    viewer: IAuthorizedViewer,
    envelope: T,
    event: unknown,
  ): PublicationGuardResult<T> {
    const result = this.decideEvent(viewer, event);
    if (result.kind === 'failure') return result;
    if (result.kind === 'omit') return result;
    if (result.value === event) {
      return { kind: 'send', value: envelope };
    }
    return { kind: 'send', value: { ...envelope, event: result.value } as T };
  }

  /**
   * Filters a single ReplayChunk. Unchanged chunks keep the original
   * object; filtered chunks copy metadata and keep remaining events.
   * Never omits - a chunk with nothing left is an empty chunk, so the
   * bundle guard above can rely on getting one chunk back per chunk in.
   */
  private guardReplayChunk(
    viewer: IAuthorizedViewer,
    chunk: IReplayChunk,
  ): IPublicationSend<IReplayChunk> | IPublicationFailure {
    const kept: unknown[] = [];
    let redacted = false;
    for (const event of chunk.events) {
      const result = this.decideEvent(viewer, event);
      if (result.kind === 'failure') return result;
      if (result.kind !== 'send') continue;
      if (result.value !== event) redacted = true;
      kept.push(result.value);
    }
    if (!redacted && kept.length === chunk.events.length) {
      return { kind: 'send', value: chunk };
    }
    return { kind: 'send', value: { ...chunk, events: kept } };
  }
}

/**
 * Production singleton bound to the v1 all-public match-wire catalog.
 */
export const MATCH_WIRE_PUBLICATION_BOUNDARY = new ViewerPublicationBoundary(
  createMatchWireAudienceProjector(),
);
