/**
 * Authorized viewer contract + resolver contract (authority-audit PR 1).
 *
 * Pins (the 1.1 failing-first set, now green): a known campaign/match
 * id plus a client role/ownership claim CANNOT construct an authorized
 * viewer - only server-verified identity plus an active durable HUMAN
 * membership can; structural forgeries (plain objects, spreads,
 * escalated copies, JSON round-trips) fail `isAuthorizedViewer`;
 * viewer contexts are non-serializable; non-human principals fail
 * typed and cannot borrow/convert into viewer authority; membership
 * revision changes invalidate the revision-bound cache; and a healthy
 * authorized control resolves throughout.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/authority-history/spec.md
 */

import {
  AuthorizedViewerError,
  AuthorizedViewerResolver,
  isAuthorizedViewer,
  isVerifiedPrincipal,
  mintVerifiedPrincipal,
  type IMembershipRecord,
  type IMembershipSource,
} from '../AuthorizedViewer';

const HUMAN_ROW: IMembershipRecord = {
  principalId: 'user-gm',
  principalKind: 'human',
  campaignId: 'campaign-alpha',
  campaignSessionId: 'session-1',
  matchId: 'match-9',
  participantId: 'participant-gm',
  role: 'gm',
  ownedForceIds: ['force-1'],
  membershipRevision: 3,
  active: true,
};

class FakeMembershipSource implements IMembershipSource {
  public rows = new Map<string, IMembershipRecord>();
  public revisions = new Map<string, number>();

  public set(row: IMembershipRecord): void {
    this.rows.set(
      JSON.stringify([row.principalId, row.campaignSessionId]),
      row,
    );
    this.revisions.set(row.campaignSessionId, row.membershipRevision);
  }

  async lookupMembership(
    principalId: string,
    campaignSessionId: string,
  ): Promise<IMembershipRecord | null> {
    return (
      this.rows.get(JSON.stringify([principalId, campaignSessionId])) ?? null
    );
  }

  async currentMembershipRevision(campaignSessionId: string): Promise<number> {
    return this.revisions.get(campaignSessionId) ?? 0;
  }
}

const expectFailure = async (
  run: () => Promise<unknown>,
): Promise<AuthorizedViewerError> => {
  try {
    await run();
  } catch (error) {
    if (error instanceof AuthorizedViewerError) return error;
    throw error;
  }
  throw new Error('expected AuthorizedViewerError');
};

describe('authorized viewer contract', () => {
  it('a client claim with known ids and roles is NOT an authorized viewer', () => {
    // Structurally identical to the real contract - still refused.
    const clientClaim = {
      kind: 'viewer',
      principalId: 'user-gm',
      campaignId: 'campaign-alpha',
      campaignSessionId: 'session-1',
      matchId: 'match-9',
      participantId: 'participant-gm',
      role: 'gm',
      ownedForceIds: ['force-1'],
      membershipRevision: 3,
    };
    expect(isAuthorizedViewer(clientClaim)).toBe(false);
    expect(isVerifiedPrincipal({ principalId: 'user-gm' })).toBe(false);
  });

  it('resolution requires a server-verified principal', async () => {
    const source = new FakeMembershipSource();
    source.set(HUMAN_ROW);
    const resolver = new AuthorizedViewerResolver(source);
    const error = await expectFailure(() =>
      resolver.resolve({ principalId: 'user-gm' } as never, 'session-1'),
    );
    expect(error.code).toBe('unverified-identity');
  });

  it('verified identity WITHOUT active membership fails typed', async () => {
    const source = new FakeMembershipSource();
    source.set({ ...HUMAN_ROW, active: false });
    const resolver = new AuthorizedViewerResolver(source);
    const error = await expectFailure(() =>
      resolver.resolve(mintVerifiedPrincipal('user-gm'), 'session-1'),
    );
    expect(error.code).toBe('no-active-membership');

    const unknown = await expectFailure(() =>
      resolver.resolve(mintVerifiedPrincipal('user-stranger'), 'session-1'),
    );
    expect(unknown.code).toBe('no-active-membership');
  });

  it('a mismatched membership row NEVER mints - identity is authority, not a lookup key', async () => {
    class TreacherousSource extends FakeMembershipSource {
      override async lookupMembership(): Promise<IMembershipRecord> {
        // Returns ANOTHER principal's GM row regardless of the query.
        return { ...HUMAN_ROW, principalId: 'user-someone-else' };
      }
    }
    const source = new TreacherousSource();
    source.set(HUMAN_ROW);
    const resolver = new AuthorizedViewerResolver(source);
    const error = await expectFailure(() =>
      resolver.resolve(mintVerifiedPrincipal('user-gm'), 'session-1'),
    );
    expect(error.code).toBe('membership-source-integrity');

    class CrossSessionSource extends FakeMembershipSource {
      override async lookupMembership(): Promise<IMembershipRecord> {
        return { ...HUMAN_ROW, campaignSessionId: 'session-OTHER' };
      }
    }
    const cross = new AuthorizedViewerResolver(new CrossSessionSource());
    const crossError = await expectFailure(() =>
      cross.resolve(mintVerifiedPrincipal('user-gm'), 'session-1'),
    );
    expect(crossError.code).toBe('membership-source-integrity');
  });

  it('an empty session request fails typed before any lookup', async () => {
    const source = new FakeMembershipSource();
    const resolver = new AuthorizedViewerResolver(source);
    const error = await expectFailure(() =>
      resolver.resolve(mintVerifiedPrincipal('user-gm'), '  '),
    );
    expect(error.code).toBe('invalid-request');
  });

  it('non-human principals never receive viewer authority', async () => {
    const source = new FakeMembershipSource();
    source.set({
      ...HUMAN_ROW,
      principalId: 'job-effects-runner',
      principalKind: 'service',
    });
    // Healthy authorized control alongside the denial.
    source.set(HUMAN_ROW);
    const resolver = new AuthorizedViewerResolver(source);

    const error = await expectFailure(() =>
      resolver.resolve(
        mintVerifiedPrincipal('job-effects-runner'),
        'session-1',
      ),
    );
    expect(error.code).toBe('non-human-principal');

    const control = await resolver.resolve(
      mintVerifiedPrincipal('user-gm'),
      'session-1',
    );
    expect(isAuthorizedViewer(control)).toBe(true);
    expect(control.role).toBe('gm');
  });

  it('viewer fields derive from the membership row alone', async () => {
    const source = new FakeMembershipSource();
    source.set({ ...HUMAN_ROW, role: 'player', ownedForceIds: ['force-2'] });
    const resolver = new AuthorizedViewerResolver(source);
    const viewer = await resolver.resolve(
      mintVerifiedPrincipal('user-gm'),
      'session-1',
    );
    expect(viewer.role).toBe('player');
    expect(viewer.ownedForceIds).toEqual(['force-2']);
    expect(Object.isFrozen(viewer)).toBe(true);
    expect(Object.isFrozen(viewer.ownedForceIds)).toBe(true);
  });

  it('viewer contexts are non-serializable and copies lose authority', async () => {
    const source = new FakeMembershipSource();
    source.set(HUMAN_ROW);
    const resolver = new AuthorizedViewerResolver(source);
    const viewer = await resolver.resolve(
      mintVerifiedPrincipal('user-gm'),
      'session-1',
    );
    expect(isAuthorizedViewer(viewer)).toBe(true);

    // Serialization fails closed.
    expect(() => JSON.stringify(viewer)).toThrow(AuthorizedViewerError);

    // A spread copy (even unescalated) is not authority.
    const copy = { ...viewer };
    expect(isAuthorizedViewer(copy)).toBe(false);
    // An escalated copy is not authority.
    const escalated = { ...viewer, role: 'gm' as const };
    expect(isAuthorizedViewer(escalated)).toBe(false);
    // Mutation of the real viewer is impossible (frozen).
    expect(() => {
      (viewer as { role: string }).role = 'gm';
    }).toThrow();
  });

  it('the cache is revision-bound: membership changes invalidate contexts', async () => {
    const source = new FakeMembershipSource();
    source.set(HUMAN_ROW);
    const resolver = new AuthorizedViewerResolver(source);
    const principal = mintVerifiedPrincipal('user-gm');

    const first = await resolver.resolve(principal, 'session-1');
    const second = await resolver.resolve(principal, 'session-1');
    expect(second).toBe(first);
    expect(resolver.lookups).toBe(1);
    await expect(resolver.isCurrent(first)).resolves.toBe(true);

    // Membership changes: ownership shrinks, revision bumps.
    source.set({
      ...HUMAN_ROW,
      ownedForceIds: [],
      membershipRevision: 4,
    });
    await expect(resolver.isCurrent(first)).resolves.toBe(false);
    const third = await resolver.resolve(principal, 'session-1');
    expect(third).not.toBe(first);
    expect(third.membershipRevision).toBe(4);
    expect(third.ownedForceIds).toEqual([]);
    expect(resolver.lookups).toBe(2);

    // Revocation after the bump: the context disappears entirely.
    source.set({ ...HUMAN_ROW, membershipRevision: 5, active: false });
    const revoked = await expectFailure(() =>
      resolver.resolve(principal, 'session-1'),
    );
    expect(revoked.code).toBe('no-active-membership');
    await expect(resolver.isCurrent(third)).resolves.toBe(false);
  });

  it('isCurrent refuses forged viewers outright', async () => {
    const source = new FakeMembershipSource();
    source.set(HUMAN_ROW);
    const resolver = new AuthorizedViewerResolver(source);
    const forged = { ...HUMAN_ROW, kind: 'viewer' } as never;
    await expect(resolver.isCurrent(forged)).resolves.toBe(false);
  });
});
