/**
 * Laws of the pre-serialization viewer projector (umbrella task 11.1).
 *
 * Four properties a plausible wrong implementation breaks: it removes
 * the declared fields; it removes ONLY those; it returns the original
 * object when there is nothing to remove (the boundary reads that
 * identity to decide whether to rebuild an envelope at all); and it
 * fails closed, because the last step before serialization is exactly
 * where a silent fallback would be invisible.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-authority-redaction/spec.md
 */

import {
  AuthorizedViewerResolver,
  mintVerifiedPrincipal,
  type IAuthorizedViewer,
  type IMembershipRecord,
  type IMembershipSource,
} from '../../authorization/AuthorizedViewer';
import {
  AUTHORITY_ONLY_EVENT_FIELDS,
  projectEventForViewer,
} from '../ViewerFrameProjector';

const SESSION_ID = 'session-projector';

const PLAYER_ROW: IMembershipRecord = {
  principalId: 'user-player',
  principalKind: 'human',
  campaignId: 'campaign-alpha',
  campaignSessionId: SESSION_ID,
  matchId: 'match-projector',
  participantId: 'participant-player',
  role: 'player',
  ownedForceIds: ['force-1'],
  membershipRevision: 2,
  active: true,
};

class FakeMembershipSource implements IMembershipSource {
  /** Returns the single player row for a matching principal/session. */
  public async lookupMembership(
    principalId: string,
    campaignSessionId: string,
  ): Promise<IMembershipRecord | null> {
    if (
      principalId !== PLAYER_ROW.principalId ||
      campaignSessionId !== SESSION_ID
    ) {
      return null;
    }
    return PLAYER_ROW;
  }

  /** Returns the session membership epoch. */
  public async currentMembershipRevision(): Promise<number> {
    return PLAYER_ROW.membershipRevision;
  }
}

/** Mints the branded viewer these rows project for. */
async function playerViewer(): Promise<IAuthorizedViewer> {
  const resolver = new AuthorizedViewerResolver(new FakeMembershipSource());
  return resolver.resolve(
    mintVerifiedPrincipal(PLAYER_ROW.principalId),
    SESSION_ID,
  );
}

describe('projectEventForViewer', () => {
  it('removes the declared authority-only fields and keeps everything else', async () => {
    const viewer = await playerViewer();
    const event = {
      id: 'evt-1',
      sequence: 7,
      type: 'phase_changed',
      visibility: 'observer-visible',
      payload: { fromPhase: 'initiative', toPhase: 'movement' },
    };

    const result = projectEventForViewer(viewer, event);

    expect(result.kind).toBe('project');
    if (result.kind !== 'project') return;
    expect(result.event).toEqual({
      id: 'evt-1',
      sequence: 7,
      type: 'phase_changed',
      payload: { fromPhase: 'initiative', toPhase: 'movement' },
    });
    // CONTROL for the row above: the field really was there to remove,
    // and the authority's own object was not mutated on the way past.
    expect(event.visibility).toBe('observer-visible');
  });

  it('returns the original object when nothing needs removing', async () => {
    const viewer = await playerViewer();
    const event = {
      id: 'evt-2',
      sequence: 8,
      type: 'turn_started',
      payload: { turn: 2 },
    };

    const result = projectEventForViewer(viewer, event);

    expect(result.kind).toBe('project');
    if (result.kind !== 'project') return;
    // Identity, not deep equality: the boundary compares by reference to
    // decide whether to rebuild the envelope around it.
    expect(result.event).toBe(event);
  });

  it('refuses a value that is not a branded viewer', async () => {
    const viewer = await playerViewer();
    const forged = { ...viewer } as IAuthorizedViewer;

    const result = projectEventForViewer(forged, {
      id: 'evt-3',
      type: 'phase_changed',
      visibility: 'public',
      payload: {},
    });

    expect(result.kind).toBe('failure');
    if (result.kind !== 'failure') return;
    expect(result.error.code).toBe('not-a-viewer');
  });

  it('refuses an event that is not a plain object', async () => {
    const viewer = await playerViewer();

    for (const event of [null, 'phase_changed', 42, ['a']]) {
      const result = projectEventForViewer(viewer, event);
      expect(result.kind).toBe('failure');
      if (result.kind !== 'failure') continue;
      expect(result.error.code).toBe('projection-failed');
    }
  });

  it('declares at least one field, so the projector is not a no-op', () => {
    // Guards the rows above from quietly becoming vacuous if the list is
    // ever emptied rather than replaced.
    expect(AUTHORITY_ONLY_EVENT_FIELDS.length).toBeGreaterThan(0);
  });
});
