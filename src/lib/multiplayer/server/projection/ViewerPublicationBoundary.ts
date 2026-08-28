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
 * Rebuilds replay frames after omitting hidden events, preserving the
 * original timestamps so this module never invents a clock value.
 */
function rebuildReplayFrames(
  frames: IReplayStreamFrames,
  visible: readonly unknown[],
): IReplayStreamFrames {
  const start: IServerMessage =
    frames.start.kind === 'ReplayStart'
      ? ({
          ...frames.start,
          totalEvents: visible.length,
        } satisfies IReplayStart)
      : frames.start;
  const lastSequence = readSequence(visible[visible.length - 1]);
  const end: IServerMessage =
    frames.end.kind === 'ReplayEnd' && lastSequence !== null
      ? ({ ...frames.end, toSeq: lastSequence } satisfies IReplayEnd)
      : frames.end;
  const template = frames.chunks[0];
  const chunk: IReplayChunk =
    template !== undefined && template.kind === 'ReplayChunk'
      ? { ...template, events: [...visible] }
      : {
          kind: 'ReplayChunk',
          matchId: start.matchId,
          ts: start.ts,
          events: [...visible],
        };
  return { start, chunks: [chunk], end };
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
   */
  public guardReplayFrames(
    viewer: IAuthorizedViewer,
    frames: IReplayStreamFrames,
  ): ReplayFramesGuardResult {
    if (!isAuthorizedViewer(viewer)) {
      return { kind: 'failure', error: notAViewer() };
    }
    const originalEvents: unknown[] = [];
    for (const chunk of frames.chunks) {
      if (chunk.kind !== 'ReplayChunk') continue;
      for (const event of chunk.events) originalEvents.push(event);
    }
    const visible: unknown[] = [];
    for (const event of originalEvents) {
      const result = this.decideEvent(viewer, event);
      if (result.kind === 'failure') return result;
      if (result.kind === 'send') visible.push(event);
    }
    if (visible.length === originalEvents.length) {
      return { kind: 'send', frames };
    }
    return { kind: 'send', frames: rebuildReplayFrames(frames, visible) };
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
    return { kind: 'send', value: event };
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
    return { kind: 'send', value: envelope };
  }

  /**
   * Filters a single ReplayChunk. Unchanged chunks keep the original
   * object; filtered chunks copy metadata and keep remaining events.
   */
  private guardReplayChunk(
    viewer: IAuthorizedViewer,
    chunk: IReplayChunk,
  ): PublicationGuardResult<IServerMessage> {
    const kept: unknown[] = [];
    for (const event of chunk.events) {
      const result = this.decideEvent(viewer, event);
      if (result.kind === 'failure') return result;
      if (result.kind === 'send') kept.push(event);
    }
    if (kept.length === chunk.events.length) {
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
