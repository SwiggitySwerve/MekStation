/**
 * Versioned viewer-audience projector (authority-audit PR 6).
 *
 * Replay projectors (ReplayProjectorRegistry) decide how an event
 * changes replay STATE. This registry is a different axis: it decides
 * which audience may SEE a fact, then builds a fresh viewer-safe
 * payload. The style is the same: every encountered event type needs
 * an EXPLICIT decision. A missing decision fails the whole request
 * (fail closed, no partial raw fallback).
 *
 * Decision kinds:
 * - public: every authorized viewer of the stream receives the fact.
 * - owner-only: visible when the payload's acting participant or force
 *   is this viewer, OR the viewer role is gm (gm sees every owner).
 * - gm-only: role gm only.
 * - hidden: never projected to anyone through this service (not even gm).
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/gm-authority-redaction/spec.md
 */

import type { IAuthorizedViewer } from '../authorization/AuthorizedViewer';

import {
  VIEWER_PROJECTION_MESSAGES,
  ViewerProjectionError,
  type JsonValue,
} from './ViewerProjectionTypes';

/** Payload keys that name the acting participant for owner-only facts. */
const PARTICIPANT_OWNER_KEYS = [
  'participantId',
  'actingParticipantId',
] as const;
/** Payload keys that name the acting force for owner-only facts. */
const FORCE_OWNER_KEYS = ['forceId', 'ownedForceId'] as const;

export interface IPublicAudienceDecision {
  readonly kind: 'public';
  project(payload: unknown, viewer: IAuthorizedViewer): JsonValue;
}

export interface IOwnerOnlyAudienceDecision {
  readonly kind: 'owner-only';
  project(payload: unknown, viewer: IAuthorizedViewer): JsonValue;
}

export interface IGmOnlyAudienceDecision {
  readonly kind: 'gm-only';
  project(payload: unknown, viewer: IAuthorizedViewer): JsonValue;
}

export interface IHiddenAudienceDecision {
  readonly kind: 'hidden';
}

export type ViewerAudienceDecision =
  | IPublicAudienceDecision
  | IOwnerOnlyAudienceDecision
  | IGmOnlyAudienceDecision
  | IHiddenAudienceDecision;

export interface IViewerAudienceEventDecision {
  readonly eventType: string;
  readonly decision: ViewerAudienceDecision;
}

export interface IViewerAudienceProjectorDefinition {
  readonly projectorVersion: number;
  readonly streamType: string;
  readonly decisions: readonly IViewerAudienceEventDecision[];
}

/**
 * True when `value` is a non-array object we can read owner keys from.
 * Arrays and primitives have no acting participant/force.
 */
function isOwnerRecord(
  value: unknown,
): value is { readonly [key: string]: unknown } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Owner-only visibility matching.
 *
 * Why this rule: owner-only facts are still player-safe for THEIR
 * owner, but must not leak to opponents. GM is the campaign authority
 * and sees owner-only facts for every owner. Matching reads the
 * projector-facing payload only (never stored-row principal or
 * authority fields, which are server-only). A payload with no
 * recognized owner keys is not an owner match for a player (fail
 * closed).
 */
export function isOwnerAudienceMatch(
  viewer: IAuthorizedViewer,
  payload: unknown,
): boolean {
  if (viewer.role === 'gm') return true;
  if (!isOwnerRecord(payload)) return false;
  for (const key of PARTICIPANT_OWNER_KEYS) {
    const value = payload[key];
    if (typeof value === 'string' && value === viewer.participantId)
      return true;
  }
  for (const key of FORCE_OWNER_KEYS) {
    const value = payload[key];
    if (typeof value === 'string' && viewer.ownedForceIds.includes(value))
      return true;
  }
  return false;
}

/**
 * Validated, indexed audience projector for one stream type.
 */
export class ViewerAudienceProjector {
  public readonly projectorVersion: number;
  public readonly streamType: string;
  private readonly decisions: ReadonlyMap<string, ViewerAudienceDecision>;

  /**
   * Indexes decisions after validating version, stream type, and unique
   * event types. Copy-then-freeze so a retained definition cannot swap
   * a decision after registration.
   */
  public constructor(definition: IViewerAudienceProjectorDefinition) {
    if (definition.streamType.trim().length === 0)
      throw new ViewerProjectionError(
        'invalid-projector-registration',
        VIEWER_PROJECTION_MESSAGES.invalidRegistration,
      );
    if (
      !Number.isSafeInteger(definition.projectorVersion) ||
      definition.projectorVersion < 1
    )
      throw new ViewerProjectionError(
        'invalid-projector-registration',
        VIEWER_PROJECTION_MESSAGES.invalidRegistration,
      );
    const indexed = new Map<string, ViewerAudienceDecision>();
    for (const entry of definition.decisions) {
      if (entry.eventType.trim().length === 0)
        throw new ViewerProjectionError(
          'invalid-projector-registration',
          VIEWER_PROJECTION_MESSAGES.invalidRegistration,
        );
      if (indexed.has(entry.eventType))
        throw new ViewerProjectionError(
          'invalid-projector-registration',
          VIEWER_PROJECTION_MESSAGES.invalidRegistration,
        );
      indexed.set(entry.eventType, Object.freeze({ ...entry.decision }));
    }
    this.projectorVersion = definition.projectorVersion;
    this.streamType = definition.streamType;
    this.decisions = indexed;
  }

  /**
   * Returns the explicit decision for `eventType`, or undefined when
   * the definition omitted it (the service treats that as fail-closed).
   */
  public decisionFor(eventType: string): ViewerAudienceDecision | undefined {
    return this.decisions.get(eventType);
  }
}

/**
 * Registry keyed by streamType. Duplicate registration and unknown
 * lookup are typed ViewerProjectionError values (same catalog style as
 * ReplayProjector construction, different identity axis).
 */
export class ViewerAudienceProjectorRegistry {
  private readonly byStreamType = new Map<string, ViewerAudienceProjector>();

  /**
   * Indexes a validated projector. A second projector for the same
   * stream type is a typed duplicate, not a silent overwrite.
   */
  public register(definition: IViewerAudienceProjectorDefinition): void {
    const projector = new ViewerAudienceProjector(definition);
    if (this.byStreamType.has(projector.streamType))
      throw new ViewerProjectionError(
        'duplicate-projector',
        VIEWER_PROJECTION_MESSAGES.duplicateProjector,
      );
    this.byStreamType.set(projector.streamType, projector);
  }

  /**
   * Resolves the projector for a request stream type. Unknown types
   * fail before the journal is read so a miss cannot probe storage.
   */
  public projectorFor(streamType: string): ViewerAudienceProjector {
    const found = this.byStreamType.get(streamType);
    if (found === undefined)
      throw new ViewerProjectionError(
        'unknown-projector',
        VIEWER_PROJECTION_MESSAGES.unknownProjector,
      );
    return found;
  }
}
