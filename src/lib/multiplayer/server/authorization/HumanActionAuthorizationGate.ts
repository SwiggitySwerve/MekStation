/**
 * Human command and read authorization gate (authority-audit PR 3).
 *
 * THE single application chokepoint before a human-initiated entrypoint
 * reaches authority or storage services. Every later surface (timeline,
 * export, private-audit, branch, history-read) calls this function even
 * when production wiring for that kind has not landed yet; tests drive
 * those kinds directly and the same checks apply.
 *
 * Law: actor, authority, role, campaign, match, participant, and
 * ownership scope are SERVER-derived. Client claims never grant
 * authority. Recheck is fresh through AuthorizedViewerResolver so a
 * membership epoch/revocation is visible on this call, not a stale
 * attached-socket cache.
 *
 * Consumer contract: this module calls `isAuthorizedViewer` on the
 * resolver result and refuses when the brand check fails. Callers MUST
 * do the same on any viewer they receive; property reads are not
 * authorization.
 *
 * Auth-vs-infra split (preserved from PR 2): membership source
 * infrastructure failures propagate as MembershipSourceUnavailableError.
 * Resolver integrity failures propagate as AuthorizedViewerError.
 * Human-facing refusals are HumanActionAuthorizationError.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/multiplayer-server/spec.md
 */

import {
  AuthorizedViewerError,
  AuthorizedViewerResolver,
  isAuthorizedViewer,
  mintVerifiedPrincipal,
  type IAuthorizedViewer,
} from './AuthorizedViewer';

export const HUMAN_ACTION_KINDS = [
  'command',
  'history-read',
  'branch',
  'timeline',
  'export',
  'private-audit',
] as const;

export type HumanActionKind = (typeof HUMAN_ACTION_KINDS)[number];

/**
 * Entity/stream identity a read-kind request names. Only server-bound
 * session ids belong here; client role/ownership fields have no field.
 */
export interface IHumanActionEntityRef {
  readonly matchId?: string;
  readonly campaignSessionId?: string;
}

export interface IHumanCommandActionRequest {
  readonly kind: 'command';
  /**
   * Client-supplied actor/participant claim, if the command named one.
   * When present it MUST equal the server-derived viewer.participantId;
   * mismatch is a typed refusal, never a fallback to the claim.
   */
  readonly claimedParticipantId?: string;
  /**
   * Force ids the command claims to act on. Must be a subset of the
   * server-derived viewer.ownedForceIds. Omitted or empty means the
   * command claimed no force scope.
   */
  readonly claimedForceIds?: readonly string[];
}

export interface IHumanStreamActionRequest {
  readonly kind: Exclude<HumanActionKind, 'command'>;
  readonly streamType: string;
  readonly streamId?: string;
  readonly entityRef?: IHumanActionEntityRef;
}

export type IHumanActionRequest =
  | IHumanCommandActionRequest
  | IHumanStreamActionRequest;

export type HumanActionAuthorizationFailureCode =
  | 'invalid-request'
  | 'no-viewer'
  | 'scope-escalation'
  | 'wrong-session';

/**
 * Typed human-action refusal. Messages are constant and id-free so a
 * wrong-session result does not disclose whether the named session
 * exists.
 */
export class HumanActionAuthorizationError extends Error {
  public readonly name = 'HumanActionAuthorizationError';
  public constructor(
    public readonly code: HumanActionAuthorizationFailureCode,
    message: string,
  ) {
    super(message);
  }
}

const SAFE_REFUSAL = 'Authorization refused';

/**
 * True only for HumanActionAuthorizationError instances. Structural
 * copies and plain `{code, message}` objects are not this error.
 */
export function isHumanActionAuthorizationError(
  candidate: unknown,
): candidate is HumanActionAuthorizationError {
  return candidate instanceof HumanActionAuthorizationError;
}

/**
 * Rechecks active viewer membership and requested entity/stream scope.
 *
 * `matchId` is the session the caller is operating in (the host match),
 * not a client-claimed target. Stream/entity fields on the request are
 * compared against the SERVER-derived viewer scope after a fresh
 * resolve. Force and participant claims are compared the same way.
 *
 * Returns the branded viewer on success. Throws on refusal. Does not
 * mutate gameplay state and does not look up the requested foreign
 * session, so a wrong-session refusal cannot become an existence oracle.
 */
export async function authorizeHumanAction(
  resolver: AuthorizedViewerResolver,
  verifiedPrincipalId: string,
  matchId: string,
  request: IHumanActionRequest,
): Promise<IAuthorizedViewer> {
  if (verifiedPrincipalId.trim().length === 0)
    throw new HumanActionAuthorizationError('no-viewer', SAFE_REFUSAL);
  if (matchId.trim().length === 0)
    throw new HumanActionAuthorizationError('invalid-request', SAFE_REFUSAL);

  const viewer = await resolveCurrentViewer(
    resolver,
    verifiedPrincipalId,
    matchId,
  );
  // Brand check is the authorization; fields below are scope data only.
  if (!isAuthorizedViewer(viewer))
    throw new HumanActionAuthorizationError('no-viewer', SAFE_REFUSAL);

  if (request.kind === 'command') {
    assertCommandScope(viewer, request);
    return viewer;
  }
  assertStreamScope(viewer, request);
  return viewer;
}

/**
 * Fresh resolve so epoch/revocation applies on this call. Maps
 * principal-not-a-current-human-viewer failures to `no-viewer` with a
 * constant message (unknown, inactive, and non-human are not distinct
 * oracles). Lets membership-source-integrity and invalid-request
 * AuthorizedViewerError values propagate, and lets infrastructure
 * failures propagate unchanged.
 */
async function resolveCurrentViewer(
  resolver: AuthorizedViewerResolver,
  verifiedPrincipalId: string,
  matchId: string,
): Promise<IAuthorizedViewer> {
  try {
    return await resolver.resolve(
      mintVerifiedPrincipal(verifiedPrincipalId),
      matchId,
    );
  } catch (error) {
    if (error instanceof AuthorizedViewerError) {
      if (
        error.code === 'no-active-membership' ||
        error.code === 'non-human-principal' ||
        error.code === 'unverified-identity'
      )
        throw new HumanActionAuthorizationError('no-viewer', SAFE_REFUSAL);
      throw error;
    }
    throw error;
  }
}

/**
 * Command force scope must be a subset of server-derived ownership.
 * A participant claim, when present, must equal viewer.participantId.
 */
function assertCommandScope(
  viewer: IAuthorizedViewer,
  request: IHumanCommandActionRequest,
): void {
  if (
    request.claimedParticipantId !== undefined &&
    request.claimedParticipantId !== viewer.participantId
  )
    throw new HumanActionAuthorizationError('scope-escalation', SAFE_REFUSAL);

  const claimedForceIds = request.claimedForceIds ?? [];
  const owned = new Set(viewer.ownedForceIds);
  for (const forceId of claimedForceIds) {
    if (!owned.has(forceId))
      throw new HumanActionAuthorizationError('scope-escalation', SAFE_REFUSAL);
  }
}

/**
 * Stream/entity identifiers must name the viewer's own campaign session
 * or match. Comparison is against viewer fields only; the named foreign
 * session is never loaded.
 */
function assertStreamScope(
  viewer: IAuthorizedViewer,
  request: IHumanStreamActionRequest,
): void {
  const requestedIds = collectRequestedScopeIds(request);
  for (const scopeId of requestedIds) {
    if (!scopeBelongsToViewer(viewer, scopeId))
      throw new HumanActionAuthorizationError('wrong-session', SAFE_REFUSAL);
  }
}

/**
 * Collects the session identifiers the request named. Empty strings are
 * invalid-request rather than a probe of some other session.
 */
function collectRequestedScopeIds(
  request: IHumanStreamActionRequest,
): readonly string[] {
  const ids: string[] = [];
  pushScopeId(ids, request.streamId);
  if (request.entityRef !== undefined) {
    pushScopeId(ids, request.entityRef.matchId);
    pushScopeId(ids, request.entityRef.campaignSessionId);
  }
  return ids;
}

/**
 * Appends a provided scope id, or refuses blank values without looking
 * anything up.
 */
function pushScopeId(ids: string[], value: string | undefined): void {
  if (value === undefined) return;
  if (value.trim().length === 0)
    throw new HumanActionAuthorizationError('invalid-request', SAFE_REFUSAL);
  ids.push(value);
}

/**
 * A requested id is in-scope only when it equals the viewer's
 * campaignSessionId or (when the viewer has a match) the viewer's
 * matchId.
 */
function scopeBelongsToViewer(
  viewer: IAuthorizedViewer,
  scopeId: string,
): boolean {
  if (scopeId === viewer.campaignSessionId) return true;
  return viewer.matchId !== null && scopeId === viewer.matchId;
}
