/**
 * Live catch-up gate contract (replay-safety PR 19B).
 *
 * Pins: the client mirror routes the ordered broadcast/replay stream
 * through the registered replay pipeline as `match-broadcast`
 * object-backed history and reports the SAME identity septet cold
 * recovery reports for the same history; fog omissions and the
 * redacted attack_resolved arm are genuine stored forms and gate
 * cleanly; an unsupported broadcast event blocks the WHOLE mirror with
 * typed evidence and publishes NO partial session or event list while
 * a second (control) match's mirror keeps building; and the legacy
 * builder returns null (never a partial session) for a blocked stream.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/replay-library/spec.md
 */

import type { IGameEvent } from '@/types/gameplay';

import { gateReplaySurfaceHistory } from '@/lib/events/replay/ReplaySurfaceGate';

import {
  buildMirrorSession,
  buildMirrorSessionGated,
} from '../mirrorMatchSession';

const envelope = (
  gameId: string,
  sequence: number,
  type: string,
  payload: unknown,
): IGameEvent =>
  ({
    id: `${gameId}-evt-${sequence}`,
    gameId,
    sequence,
    timestamp: '2026-08-21T00:00:00.000Z',
    type,
    turn: 1,
    phase: 'initiative',
    payload,
  }) as unknown as IGameEvent;

const seed = (gameId: string): IGameEvent =>
  envelope(gameId, 0, 'game_created', {
    config: {
      mapRadius: 7,
      turnLimit: 30,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    units: [
      {
        id: 'player-1',
        name: 'Atlas',
        side: 'player',
        unitRef: 'atlas-as7-d',
        pilotRef: 'pilot-1',
        gunnery: 4,
        piloting: 5,
      },
    ],
  });

describe('live catch-up mirror gate', () => {
  it('reports the same identity septet as cold recovery for the same history', () => {
    const history = [
      seed('mirror-match'),
      envelope('mirror-match', 1, 'game_started', { firstSide: 'player' }),
      envelope('mirror-match', 2, 'turn_started', {}),
    ];
    const mirror = buildMirrorSessionGated(history);
    expect(mirror.kind).toBe('session');

    const recovery = gateReplaySurfaceHistory(history, {
      surfaceId: 'cold-recovery',
      streamId: 'mirror-match',
      formatId: 'match-log-idb',
      formatVersion: 2,
    });
    expect(recovery.kind).toBe('accepted');

    if (mirror.kind === 'session' && recovery.kind === 'accepted') {
      const septet = (report: typeof mirror.report) => ({
        streamId: report.streamId,
        branchId: report.branchId,
        range: report.range,
        schemaPipelineFingerprint: report.schemaPipelineFingerprint,
        projectorId: report.projectorId,
        projectorVersion: report.projectorVersion,
        stateDigest: report.stateDigest,
        audienceSafeDigest: report.audienceSafeDigest,
      });
      expect(septet(mirror.report)).toEqual(septet(recovery.report));
      expect(mirror.report.surfaceId).toBe('live-catch-up');
      expect(mirror.report.formatId).toBe('match-broadcast');
      expect(mirror.session.events).toHaveLength(3);
    }
  });

  it('fog omissions and the redacted attack_resolved arm gate cleanly', () => {
    const foggy = [
      seed('fog-match'),
      envelope('fog-match', 1, 'game_started', { firstSide: 'player' }),
      // sequences 2-4 omitted by fog - the gate demands no contiguity.
      envelope('fog-match', 5, 'attack_resolved', {
        targetId: 'player-1',
        roll: 9,
        toHitNumber: 7,
        hit: true,
        damage: 5,
      }),
    ];
    const mirror = buildMirrorSessionGated(foggy);
    expect(mirror.kind).toBe('session');
    if (mirror.kind === 'session')
      expect(mirror.report.range).toEqual({
        firstSequence: 0,
        lastSequence: 5,
        eventCount: 3,
      });
  });

  it('host-stamped first events (rolls + intentId) gate cleanly and keep their stamps', () => {
    // ServerMatchHost stamps the tick's dice capture and the accepted
    // intentId onto the FIRST event's payload - transport bookkeeping
    // the gate extracts before canonical validation while the consumed
    // envelope keeps the stamps.
    const stamped = [
      seed('stamped-match'),
      envelope('stamped-match', 1, 'attack_locked', {
        unitId: 'player-1',
        rolls: [4, 6, 2],
        intentId: 'intent-123',
      }),
      envelope('stamped-match', 2, 'psr_resolved', {
        unitId: 'player-1',
        targetNumber: 7,
        roll: 9,
        modifiers: 1,
        passed: true,
        reason: '20+ damage',
        rolls: [4, 5],
        intentId: 'intent-456',
      }),
    ];
    const mirror = buildMirrorSessionGated(stamped);
    expect(mirror.kind).toBe('session');
    if (mirror.kind === 'session') {
      const locked = mirror.events[1] as unknown as {
        payload: Record<string, unknown>;
      };
      expect(locked.payload['rolls']).toEqual([4, 6, 2]);
      expect(locked.payload['intentId']).toBe('intent-123');
    }
  });

  it('the redacted unit_destroyed fog arm gates cleanly', () => {
    const foggy = [
      seed('fog-destroy-match'),
      envelope('fog-destroy-match', 1, 'unit_destroyed', {
        unitId: 'player-1',
      }),
    ];
    expect(buildMirrorSessionGated(foggy).kind).toBe('session');
  });

  it('an unsupported broadcast blocks the whole mirror with no partial publication', () => {
    const blockedStream = [
      seed('blocked-match'),
      envelope('blocked-match', 1, 'warp_drive_engaged', {}),
      envelope('blocked-match', 2, 'turn_started', {}),
    ];
    const mirror = buildMirrorSessionGated(blockedStream);
    expect(mirror.kind).toBe('blocked');
    if (mirror.kind === 'blocked') {
      expect(mirror.streamId).toBe('blocked-match');
      expect(mirror.blockedEvents).toEqual([
        expect.objectContaining({
          sequence: 1,
          reason: 'unsupported-event-type',
          eventType: 'warp_drive_engaged',
        }),
      ]);
      expect('session' in mirror).toBe(false);
      expect('events' in mirror).toBe(false);
    }
    // The legacy builder never yields a partial session either.
    expect(buildMirrorSession(blockedStream)).toBeNull();

    // Control scope: a healthy match's mirror keeps building.
    const control = buildMirrorSessionGated([
      seed('control-match'),
      envelope('control-match', 1, 'turn_started', {}),
    ]);
    expect(control.kind).toBe('session');
  });

  it('stays pending before the GameCreated seed arrives', () => {
    expect(buildMirrorSessionGated([])).toEqual({ kind: 'pending' });
    expect(
      buildMirrorSessionGated([envelope('late-match', 3, 'turn_started', {})]),
    ).toEqual({ kind: 'pending' });
  });
});
