/**
 * Replay surface gate contract (replay-safety PR 19A).
 *
 * Pins: cold recovery's object-backed gate and the Replay Library's
 * byte-backed pipeline report the SAME identity septet for the same
 * history - stream, fixed root branch, range, schema-pipeline
 * fingerprint, projector id/version, state digest, audience-safe
 * digest (only the surface/source-format identities differ); an
 * unsupported stored event blocks the WHOLE history with typed
 * per-event evidence and yields no accepted events; and cold recovery
 * through `hydrateRecoverableSessionWithReport` throws the typed
 * corrupt error on a blocked gate (no partial baseline) while a
 * healthy CONTROL match in the same storage keeps recovering.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/replay-library/spec.md
 */

import type { IGameEvent } from '@/types/gameplay';

import {
  hydrateRecoverableSessionWithReport,
  InteractiveSessionRecoveryCorruptError,
} from '@/engine/InteractiveSession.persistence';

import { loadReplayLibraryNdjson } from '../ReplayLibraryLoadPipeline';
import { gateReplaySurfaceHistory } from '../ReplaySurfaceGate';

const STREAM_ID = 'match-gate-probe';

const envelope = (
  sequence: number,
  type: string,
  payload: unknown,
  extra: Record<string, unknown> = {},
): IGameEvent =>
  ({
    id: `evt-${sequence}`,
    gameId: STREAM_ID,
    sequence,
    timestamp: '2026-08-21T00:00:00.000Z',
    type,
    turn: 1,
    phase: 'initiative',
    payload,
    ...extra,
  }) as unknown as IGameEvent;

const HISTORY: readonly IGameEvent[] = [
  envelope(0, 'game_started', { firstSide: 'player' }),
  envelope(1, 'turn_started', {}),
  envelope(2, 'trooper_killed', {
    unitId: 'elemental-squad',
    trooperIndex: 2,
    survivingTroopers: 4,
  }),
];

describe('replay surface gate', () => {
  it('cold recovery and Replay Library report the same identity septet', () => {
    const gated = gateReplaySurfaceHistory(HISTORY, {
      surfaceId: 'cold-recovery',
      streamId: STREAM_ID,
      formatId: 'match-log-idb',
      formatVersion: 2,
    });
    expect(gated.kind).toBe('accepted');

    const ndjson = HISTORY.map((event) => JSON.stringify(event)).join('\n');
    const library = loadReplayLibraryNdjson(ndjson, STREAM_ID);
    expect(library.kind).toBe('loaded');

    if (gated.kind === 'accepted' && library.kind === 'loaded') {
      const shared = (report: typeof gated.report) => ({
        streamId: report.streamId,
        branchId: report.branchId,
        range: report.range,
        schemaPipelineFingerprint: report.schemaPipelineFingerprint,
        projectorId: report.projectorId,
        projectorVersion: report.projectorVersion,
        stateDigest: report.stateDigest,
        audienceSafeDigest: report.audienceSafeDigest,
      });
      expect(shared(gated.report)).toEqual(shared(library.report));
      // The surfaces still identify themselves and their source formats.
      expect(gated.report.surfaceId).toBe('cold-recovery');
      expect(gated.report.formatId).toBe('match-log-idb');
      expect(library.report.surfaceId).toBe('replay-library');
      expect(library.report.formatId).toBe('simulation-report-jsonl');
      expect(gated.report.range).toEqual({
        firstSequence: 0,
        lastSequence: 2,
        eventCount: 3,
      });
    }
  });

  it('stored records carrying undefined-valued keys gate via their JSON image', () => {
    // Live/structured-clone event objects may hold keys whose value is
    // undefined; the JSON image (what every byte-backed serialization
    // stores) is what gets bound.
    const withUndefined = {
      ...envelope(3, 'facing_changed', {
        unitId: 'atlas-as7-d',
        facing: 0,
        secondaryFacing: undefined,
        torsoTwist: undefined,
      }),
      side: undefined,
    };
    const gated = gateReplaySurfaceHistory([...HISTORY, withUndefined], {
      surfaceId: 'cold-recovery',
      streamId: STREAM_ID,
      formatId: 'match-log-idb',
      formatVersion: 2,
    });
    expect(gated.kind).toBe('accepted');
    if (gated.kind === 'accepted')
      expect(gated.report.range.eventCount).toBe(4);
  });

  it('non-finite stored numbers image to the PR-18 stored forms and gate cleanly', () => {
    const autoShutdown = envelope(3, 'shutdown_check', {
      unitId: 'atlas-as7-d',
      heatLevel: 35,
      targetNumber: Infinity,
      roll: 0,
      shutdownOccurred: true,
    });
    const gated = gateReplaySurfaceHistory([...HISTORY, autoShutdown], {
      surfaceId: 'cold-recovery',
      streamId: STREAM_ID,
      formatId: 'match-log-idb',
      formatVersion: 2,
    });
    expect(gated.kind).toBe('accepted');
    if (gated.kind === 'accepted') {
      const imaged = gated.events[3] as unknown as {
        payload: { targetNumber: unknown };
      };
      expect(imaged.payload.targetNumber).toBeNull();
    }
  });

  it('an unsupported stored event blocks the whole history with typed evidence', () => {
    const gated = gateReplaySurfaceHistory(
      [
        HISTORY[0],
        envelope(1, 'warp_drive_engaged', {}),
        envelope(2, 'shutdown_check', {
          unitId: 'atlas-as7-d',
          heatLevel: 'hot',
          targetNumber: 4,
          roll: 7,
          shutdownOccurred: false,
        }),
      ],
      {
        surfaceId: 'cold-recovery',
        streamId: STREAM_ID,
        formatId: 'match-log-idb',
        formatVersion: 2,
      },
    );
    expect(gated.kind).toBe('blocked');
    if (gated.kind === 'blocked') {
      expect(gated.blockedEvents).toEqual([
        expect.objectContaining({
          sequence: 1,
          reason: 'unsupported-event-type',
          eventType: 'warp_drive_engaged',
        }),
        expect.objectContaining({
          sequence: 2,
          reason: 'invalid-payload',
          eventType: 'shutdown_check',
        }),
      ]);
      expect('events' in gated).toBe(false);
    }
  });

  it('an unknown source format is refused, never assumed baseline v1', () => {
    const gated = gateReplaySurfaceHistory(HISTORY, {
      surfaceId: 'cold-recovery',
      streamId: STREAM_ID,
      formatId: 'mystery-format',
      formatVersion: 1,
    });
    expect(gated.kind).toBe('blocked');
    if (gated.kind === 'blocked')
      expect(
        gated.blockedEvents.every(
          (blocked) => blocked.reason === 'unknown-source-format',
        ),
      ).toBe(true);
  });

  it('blocked cold recovery hydrates nothing while a healthy control match recovers', async () => {
    const gameCreated = envelope(0, 'game_created', {
      config: {
        mapRadius: 8,
        turnLimit: 0,
        victoryConditions: ['destruction'],
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
    const corruptTail = envelope(1, 'warp_drive_engaged', {});
    const healthyTail = envelope(1, 'turn_started', {});

    const storage = {
      getEventsForMatch: jest.fn(async (matchId: string) =>
        matchId === 'corrupt-match'
          ? [gameCreated, corruptTail]
          : [gameCreated, healthyTail],
      ),
    };

    let corrupt: InteractiveSessionRecoveryCorruptError | null = null;
    try {
      await hydrateRecoverableSessionWithReport('corrupt-match', storage);
    } catch (error) {
      if (error instanceof InteractiveSessionRecoveryCorruptError)
        corrupt = error;
      else throw error;
    }
    expect(corrupt).not.toBeNull();
    expect(
      String((corrupt?.originalError as Error | undefined)?.message),
    ).toContain('unsupported-event-type');
    expect(corrupt?.blockedEvents).toEqual([
      expect.objectContaining({
        sequence: 1,
        reason: 'unsupported-event-type',
        eventType: 'warp_drive_engaged',
      }),
    ]);

    // The healthy control match recovers through the same gate.
    const recovered = await hydrateRecoverableSessionWithReport(
      'healthy-match',
      storage,
    );
    expect(recovered.session.events).toHaveLength(2);
    expect(recovered.report.surfaceId).toBe('cold-recovery');
    expect(recovered.report.range.eventCount).toBe(2);
  });
});
