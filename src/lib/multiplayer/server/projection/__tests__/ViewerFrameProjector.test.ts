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
  projectReplayEndForViewer,
  projectReplayStartForViewer,
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

const GM_ROW: IMembershipRecord = {
  ...PLAYER_ROW,
  principalId: 'user-gm',
  participantId: 'participant-gm',
  role: 'gm',
  ownedForceIds: ['force-gm'],
};

class FakeMembershipSource implements IMembershipSource {
  public constructor(private readonly row: IMembershipRecord = PLAYER_ROW) {}

  /** Returns the configured row for a matching principal/session. */
  public async lookupMembership(
    principalId: string,
    campaignSessionId: string,
  ): Promise<IMembershipRecord | null> {
    if (
      principalId !== this.row.principalId ||
      campaignSessionId !== SESSION_ID
    ) {
      return null;
    }
    return this.row;
  }

  /** Returns the session membership epoch. */
  public async currentMembershipRevision(): Promise<number> {
    return this.row.membershipRevision;
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

async function gmViewer(): Promise<IAuthorizedViewer> {
  const resolver = new AuthorizedViewerResolver(
    new FakeMembershipSource(GM_ROW),
  );
  return resolver.resolve(
    mintVerifiedPrincipal(GM_ROW.principalId),
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
      type: 'phase_changed',
      payload: { fromPhase: 'initiative', toPhase: 'movement' },
    });
    // CONTROL for the row above: the fields really were there to remove,
    // and the authority's own object was not mutated on the way past.
    expect(event.visibility).toBe('observer-visible');
    expect(event.sequence).toBe(7);
  });

  it('keeps sequence on an authority viewer while still dropping visibility', async () => {
    const viewer = await gmViewer();
    const event = {
      id: 'evt-gm',
      sequence: 7,
      type: 'phase_changed',
      visibility: 'observer-visible',
      payload: { fromPhase: 'initiative', toPhase: 'movement' },
    };

    const result = projectEventForViewer(viewer, event);

    expect(result.kind).toBe('project');
    if (result.kind !== 'project') return;
    expect(result.event).toEqual({
      id: 'evt-gm',
      sequence: 7,
      type: 'phase_changed',
      payload: { fromPhase: 'initiative', toPhase: 'movement' },
    });
  });

  it('returns the original object when nothing needs removing', async () => {
    const viewer = await playerViewer();
    const event = {
      id: 'evt-2',
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

describe('projectReplay envelopes for viewer', () => {
  const start = {
    kind: 'ReplayStart' as const,
    matchId: 'match-projector',
    ts: '2026-08-28T12:00:00.000Z',
    fromSeq: 0,
    totalEvents: 4,
  };
  const end = {
    kind: 'ReplayEnd' as const,
    matchId: 'match-projector',
    ts: '2026-08-28T12:00:00.000Z',
    toSeq: 12,
  };

  it('strips authority bounds from a player ReplayStart/End', async () => {
    const viewer = await playerViewer();
    const projectedStart = projectReplayStartForViewer(viewer, start, 3);
    const projectedEnd = projectReplayEndForViewer(viewer, end, 11);
    expect(projectedStart.fromSeq).toBeUndefined();
    expect(projectedStart.totalEvents).toBe(3);
    expect(projectedEnd.toSeq).toBeUndefined();
  });

  it('keeps authority bounds on a GM ReplayStart/End', async () => {
    const viewer = await gmViewer();
    const projectedStart = projectReplayStartForViewer(viewer, start, 3);
    const projectedEnd = projectReplayEndForViewer(viewer, end, 11);
    expect(projectedStart.fromSeq).toBe(0);
    expect(projectedStart.totalEvents).toBe(3);
    expect(projectedEnd.toSeq).toBe(11);
  });
});
