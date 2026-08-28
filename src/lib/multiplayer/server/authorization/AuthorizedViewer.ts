/**
 * Authorized viewer contract and membership resolver (authority-audit
 * wave PR 1, per design D1).
 *
 * Verified identity PLUS durable active membership is the ONLY way a
 * viewer context exists:
 *
 * - `IAuthorizedViewer` has NO public constructor and NO transport
 *   deserializer. Minted viewers are registered in a module-private
 *   WeakSet, so a structurally identical plain object (a client-supplied
 *   claim, a spread/copy, a JSON round-trip, an escalated
 *   `{...viewer, role: 'gm'}`) is NOT an authorized viewer -
 *   `isAuthorizedViewer` refuses it.
 * - Serialization fails closed: `JSON.stringify` of a viewer throws.
 *   A viewer context never crosses a transport boundary.
 * - Client-supplied role/actor/authority/campaign/match/ownership
 *   fields are never accepted: the resolver's inputs are a
 *   server-minted `VerifiedPrincipal` and the requested session id;
 *   every viewer field derives from the durable membership row alone.
 * - Non-human principals NEVER become viewers: a membership row whose
 *   `principalKind` is not `'human'` resolves to a typed
 *   `non-human-principal` failure. Non-human subsystems must mint
 *   their own capabilities (owned by the cross-stream effect wave);
 *   nothing here converts one into human viewer authority.
 * - The cache is REVISION-BOUND: entries carry the membership revision
 *   they were minted at, every resolve re-reads the source's current
 *   revision, and a mismatch discards the cached context.
 *
 * The membership SOURCE is a server-internal port; PR 2 binds the
 * durable store when socket admission routes through this resolver.
 *
 * CONSUMER CONTRACT (binding on PR 2/3 and every later surface): every
 * trust boundary - socket attachment, command, history read, branch
 * operation, timeline, export, projection, private-audit - MUST call
 * `isAuthorizedViewer` on the object it received and fail closed when
 * it returns false. NEVER authorize from property reads: TypeScript's
 * structural typing will happily treat a forged plain object (or a
 * Proxy around a real viewer) as `IAuthorizedViewer` if code only
 * reads `role`/`ownedForceIds`/`kind`. The brand check is the
 * authorization; the fields are merely scope data.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/authority-history/spec.md
 */

export type ViewerRole = 'gm' | 'player';

export interface IAuthorizedViewer {
  readonly kind: 'viewer';
  readonly principalId: string;
  readonly campaignId: string;
  readonly campaignSessionId: string;
  readonly matchId: string | null;
  readonly participantId: string;
  readonly role: ViewerRole;
  readonly ownedForceIds: readonly string[];
  readonly membershipRevision: number;
}

/** One durable membership row as the source reports it. */
export interface IMembershipRecord {
  readonly principalId: string;
  readonly principalKind: 'human' | 'service';
  readonly campaignId: string;
  readonly campaignSessionId: string;
  readonly matchId: string | null;
  readonly participantId: string;
  readonly role: ViewerRole;
  readonly ownedForceIds: readonly string[];
  readonly membershipRevision: number;
  readonly active: boolean;
}

/**
 * Server-internal membership port (durable binding lands in PR 2).
 *
 * REVISION INVARIANT the durable adapter MUST uphold:
 * `currentMembershipRevision` is a SESSION-SCOPED membership epoch -
 * ANY membership change in the session (join, leave, role change,
 * ownership change, revocation) bumps it, and every row returned by
 * `lookupMembership` carries the epoch current at its last write. The
 * resolver's cache and `isCurrent` compare a viewer's minted epoch to
 * the session epoch, so an un-bumped change would go unnoticed and a
 * per-principal-only revision would fail-closed unaffected members
 * (safe but wasteful) - the epoch contract is the intended semantics.
 */
export interface IMembershipSource {
  lookupMembership(
    principalId: string,
    campaignSessionId: string,
  ): Promise<IMembershipRecord | null>;
  currentMembershipRevision(campaignSessionId: string): Promise<number>;
}

export type AuthorizedViewerFailureCode =
  | 'invalid-request'
  | 'membership-source-integrity'
  | 'no-active-membership'
  | 'non-human-principal'
  | 'unverified-identity';

export class AuthorizedViewerError extends Error {
  public readonly name = 'AuthorizedViewerError';
  public constructor(
    public readonly code: AuthorizedViewerFailureCode,
    message: string,
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Verified principals - server-minted identity proof.
// ---------------------------------------------------------------------------

export interface IVerifiedPrincipal {
  readonly principalId: string;
}

const VERIFIED_PRINCIPALS = new WeakSet<IVerifiedPrincipal>();

/**
 * Mints the server-side proof that identity verification happened for
 * `principalId`. ONLY the server session/auth layer may call this; a
 * client-supplied `{principalId}` object was never minted here and
 * fails `isVerifiedPrincipal`.
 */
export function mintVerifiedPrincipal(principalId: string): IVerifiedPrincipal {
  if (principalId.trim().length === 0)
    throw new AuthorizedViewerError(
      'unverified-identity',
      'principalId must not be empty',
    );
  const principal = Object.freeze({ principalId });
  VERIFIED_PRINCIPALS.add(principal);
  return principal;
}

export function isVerifiedPrincipal(
  candidate: unknown,
): candidate is IVerifiedPrincipal {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    VERIFIED_PRINCIPALS.has(candidate as IVerifiedPrincipal)
  );
}

// ---------------------------------------------------------------------------
// Viewer minting - module-private, registry-branded, non-serializable.
// ---------------------------------------------------------------------------

const MINTED_VIEWERS = new WeakSet<IAuthorizedViewer>();

function mintViewer(record: IMembershipRecord): IAuthorizedViewer {
  const viewer: IAuthorizedViewer = Object.freeze({
    kind: 'viewer' as const,
    principalId: record.principalId,
    campaignId: record.campaignId,
    campaignSessionId: record.campaignSessionId,
    matchId: record.matchId,
    participantId: record.participantId,
    role: record.role,
    ownedForceIds: Object.freeze([...record.ownedForceIds]),
    membershipRevision: record.membershipRevision,
    // Serialization fails closed: a viewer context is server-internal
    // authority and never crosses a transport boundary.
    toJSON(): never {
      throw new AuthorizedViewerError(
        'unverified-identity',
        'An authorized viewer context is not serializable',
      );
    },
  } as IAuthorizedViewer);
  MINTED_VIEWERS.add(viewer);
  return viewer;
}

/**
 * True ONLY for viewer objects this module minted. Structural copies,
 * spreads, JSON round-trips, and client claims all fail.
 */
export function isAuthorizedViewer(
  candidate: unknown,
): candidate is IAuthorizedViewer {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    MINTED_VIEWERS.has(candidate as IAuthorizedViewer)
  );
}

// ---------------------------------------------------------------------------
// Resolver with revision-bound cache.
// ---------------------------------------------------------------------------

interface ICacheEntry {
  readonly viewer: IAuthorizedViewer;
  readonly revision: number;
}

export class AuthorizedViewerResolver {
  private readonly cache = new Map<string, ICacheEntry>();
  /** Source lookups performed - lets tests pin cache behavior. */
  public lookups = 0;

  public constructor(private readonly source: IMembershipSource) {}

  /**
   * Resolves the ONLY viewer context: server-verified identity plus an
   * active durable HUMAN membership. Typed failures otherwise; no
   * partial context of any kind.
   */
  public async resolve(
    principal: IVerifiedPrincipal,
    campaignSessionId: string,
  ): Promise<IAuthorizedViewer> {
    if (!isVerifiedPrincipal(principal))
      throw new AuthorizedViewerError(
        'unverified-identity',
        'Viewer resolution requires a server-verified principal',
      );
    if (campaignSessionId.trim().length === 0)
      throw new AuthorizedViewerError(
        'invalid-request',
        'campaignSessionId must not be empty',
      );

    const cacheKey = `${JSON.stringify([principal.principalId, campaignSessionId])}`;
    const currentRevision =
      await this.source.currentMembershipRevision(campaignSessionId);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.revision === currentRevision) return cached.viewer;
    this.cache.delete(cacheKey);

    this.lookups += 1;
    const looked = await this.source.lookupMembership(
      principal.principalId,
      campaignSessionId,
    );
    // Snapshot the row's fields ONCE before any check: a hostile
    // getter-based object cannot present one value to the bind checks
    // and another to the mint.
    const record: IMembershipRecord | null =
      looked === null
        ? null
        : {
            principalId: looked.principalId,
            principalKind: looked.principalKind,
            campaignId: looked.campaignId,
            campaignSessionId: looked.campaignSessionId,
            matchId: looked.matchId,
            participantId: looked.participantId,
            role: looked.role,
            ownedForceIds: [...looked.ownedForceIds],
            membershipRevision: looked.membershipRevision,
            active: looked.active,
          };
    if (record === null || !record.active)
      throw new AuthorizedViewerError(
        'no-active-membership',
        `No active membership for the requested session`,
      );
    // BIND the row to the verified principal and the requested session:
    // verified identity is authority, not merely a lookup key. A source
    // returning someone else's row (or another session's) is a server
    // integrity failure and must never mint.
    if (
      record.principalId !== principal.principalId ||
      record.campaignSessionId !== campaignSessionId
    )
      throw new AuthorizedViewerError(
        'membership-source-integrity',
        'Membership row does not match the verified principal and requested session',
      );
    if (record.principalKind !== 'human')
      throw new AuthorizedViewerError(
        'non-human-principal',
        'Non-human principals never receive viewer authority',
      );

    const viewer = mintViewer(record);
    this.cache.set(cacheKey, {
      viewer,
      revision: record.membershipRevision,
    });
    return viewer;
  }

  /**
   * True while the viewer's membership revision is still the session's
   * current revision - the recheck gates in later PRs use this.
   */
  public async isCurrent(viewer: IAuthorizedViewer): Promise<boolean> {
    if (!isAuthorizedViewer(viewer)) return false;
    const currentRevision = await this.source.currentMembershipRevision(
      viewer.campaignSessionId,
    );
    return viewer.membershipRevision === currentRevision;
  }
}
