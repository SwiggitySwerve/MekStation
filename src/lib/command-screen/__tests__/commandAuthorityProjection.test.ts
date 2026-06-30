import type { ICommandCommitResult } from '@/types/command-screen';

import { GameEventType, GamePhase } from '@/types/gameplay';

import {
  buildCoopCampaignAuthorityProjection,
  buildNetworkedTacticalAuthorityProjection,
  buildPlayerSafeCommandResultEvent,
  extractPlayerSafeCommandResults,
} from '../index';

describe('command authority projection helpers', () => {
  it('projects co-op campaign host controls as host-GM authority', () => {
    const projection = buildCoopCampaignAuthorityProjection({
      mode: 'host',
      routeId: 'finances',
      pendingProposalCount: 2,
    });

    expect(projection).toMatchObject({
      domain: 'campaign',
      viewerRole: 'host-gm',
      authority: 'host-gm',
      commandPath: 'host-authoritative',
      canViewPrivateGmMetadata: true,
      publicResultOnly: false,
    });
    expect(projection.enabledControls).toEqual(
      expect.arrayContaining([
        'preview',
        'approve',
        'veto',
        'manual-takeover',
        'gm-correction',
        'view-public-result',
      ]),
    );
    expect(projection.hiddenControls).toContain('submit-proposal');
  });

  it('projects co-op campaign guest controls as proposal-only public output', () => {
    const projection = buildCoopCampaignAuthorityProjection({
      mode: 'guest',
      routeId: 'mech-bay',
    });

    expect(projection).toMatchObject({
      domain: 'campaign',
      viewerRole: 'guest-player',
      authority: 'player',
      commandPath: 'host-approved-proposal',
      canViewPrivateGmMetadata: false,
      publicResultOnly: true,
    });
    expect(projection.enabledControls).toEqual([
      'submit-proposal',
      'view-public-result',
    ]);
    expect(projection.hiddenControls).toEqual(
      expect.arrayContaining(['approve', 'veto', 'manual-takeover']),
    );
  });

  it('projects networked tactical host and guest command boundaries', () => {
    const host = buildNetworkedTacticalAuthorityProjection({
      playerId: 'host-player',
      hostPlayerId: 'host-player',
      canAct: true,
    });
    const guest = buildNetworkedTacticalAuthorityProjection({
      playerId: 'guest-player',
      hostPlayerId: 'host-player',
      canAct: true,
    });

    expect(host).toMatchObject({
      viewerRole: 'host-gm',
      authority: 'host-gm',
      commandPath: 'host-authoritative',
      canViewPrivateGmMetadata: true,
    });
    expect(host.enabledControls).toEqual(
      expect.arrayContaining(['gm-correction', 'approve', 'send-intent']),
    );
    expect(guest).toMatchObject({
      viewerRole: 'guest-player',
      authority: 'player',
      commandPath: 'host-validated-intent',
      publicResultOnly: true,
    });
    expect(guest.hiddenControls).toEqual(
      expect.arrayContaining(['gm-correction', 'approve']),
    );
  });

  it('publishes networked command results without private GM metadata', () => {
    const commit: ICommandCommitResult<
      { summary: string; changedStateRefs: readonly string[] },
      { hiddenNotes: string; reason: string }
    > = {
      commandId: 'gm.tactical.correct-heat',
      previewId: 'preview-heat',
      domain: 'combat',
      status: 'committed',
      authority: 'host-gm',
      subjectRefs: [{ id: 'atlas-1', type: 'unit', label: 'Atlas' }],
      publicEffect: {
        summary: 'Atlas heat corrected to 8.',
        changedStateRefs: ['unit:atlas-1:heat'],
      },
      privateMetadata: {
        reason: 'Hidden GM adjudication reason.',
        hiddenNotes: 'Secret ambush state remains private.',
      },
      diagnosticEvent: 'command_gm_intervention_committed',
      committedAt: '2026-06-30T12:00:00.000Z',
    };

    const event = buildPlayerSafeCommandResultEvent({
      gameId: 'game-1',
      sequence: 7,
      turn: 3,
      phase: GamePhase.Heat,
      actorId: 'host-player',
      source: 'host-gm-intervention',
      result: commit,
      timestamp: '2026-06-30T12:00:01.000Z',
    });
    const replayed = extractPlayerSafeCommandResults([event]);

    expect(event.type).toBe(GameEventType.CommandResultPublished);
    expect(replayed).toHaveLength(1);
    expect(replayed[0].publicSummary).toBe('Atlas heat corrected to 8.');
    expect(replayed[0].result.publicEffect).toEqual(commit.publicEffect);
    expect(JSON.stringify(event)).not.toContain('Hidden GM adjudication');
    expect(JSON.stringify(event)).not.toContain('Secret ambush');
    expect(JSON.stringify(replayed)).not.toContain('privateMetadata');
  });
});
