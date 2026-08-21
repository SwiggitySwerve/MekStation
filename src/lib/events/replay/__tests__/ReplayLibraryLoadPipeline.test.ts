/**
 * Replay Library load pipeline contract (replay-safety PR 18).
 *
 * Pins: a fully supported NDJSON history loads through adapter +
 * composed schemas + provenance + census projector and retains
 * byte/source identity (whole-source sha256 plus per-line evidence
 * digests over the EXACT raw bytes) and the same accepted canonical
 * state digest as the pre-integration parse; ANY failing line blocks
 * the WHOLE history with typed per-line reasons (malformed bytes,
 * missing discriminant, unknown event type, invalid payload, ambiguous
 * attribution) and zero events - the old skip-and-continue partial
 * success does not exist on this path; and the PR-18 stored-form
 * corrections (auto-shutdown null targetNumber, the impossible
 * physical resolution's null toHitNumber with roll 0, and
 * projection-enriched weaponAttacks) load as genuine current history.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/replay-library/spec.md
 */

import { sha256 } from 'js-sha256';

import type { IGameEvent } from '@/types/gameplay';

import { digestReplayCheckpointState } from '../ReplayCheckpointCompatibility';
import { loadReplayLibraryNdjson } from '../ReplayLibraryLoadPipeline';

const envelope = (
  sequence: number,
  type: string,
  payload: unknown,
): Record<string, unknown> => ({
  id: `evt-${sequence}`,
  gameId: 'pipeline-test',
  sequence,
  timestamp: '2026-08-21T00:00:00.000Z',
  type,
  turn: 1,
  phase: 'weapon_attack',
  payload,
});

const VALID_LINES: readonly Record<string, unknown>[] = [
  envelope(0, 'turn_started', {}),
  envelope(1, 'shutdown_check', {
    unitId: 'atlas-as7-d',
    heatLevel: 35,
    targetNumber: null,
    roll: 0,
    shutdownOccurred: true,
  }),
  envelope(2, 'physical_attack_resolved', {
    attackerId: 'atlas-as7-d',
    targetId: 'locust-lct-1v',
    attackType: 'dfa',
    roll: 0,
    toHitNumber: null,
    hit: false,
  }),
  envelope(3, 'attack_declared', {
    attackerId: 'atlas-as7-d',
    targetId: 'locust-lct-1v',
    weapons: ['weapon-1'],
    toHitNumber: 8,
    modifiers: [],
    weaponAttacks: [
      {
        weaponId: 'weapon-1',
        weaponName: 'Medium Laser',
        damage: 5,
        heat: 3,
        mode: 'Direct',
        rangeBracket: 'medium',
        toHitNumber: null,
        modifiers: [],
      },
    ],
  }),
  envelope(4, 'trooper_killed', {
    unitId: 'elemental-squad',
    trooperIndex: 2,
    survivingTroopers: 4,
  }),
];

const ndjson = (records: readonly Record<string, unknown>[]): string =>
  records.map((record) => JSON.stringify(record)).join('\n');

describe('replay library load pipeline', () => {
  it('loads a fully supported history with byte/source identity and census', () => {
    const raw = `${ndjson(VALID_LINES)}\n`;
    const result = loadReplayLibraryNdjson(raw, 'quick/pipeline-test');
    expect(result.kind).toBe('loaded');
    if (result.kind === 'loaded') {
      expect(result.events).toHaveLength(VALID_LINES.length);
      expect(result.census.eventsApplied).toBe(VALID_LINES.length);
      expect(result.sourceDigest).toBe(sha256(new TextEncoder().encode(raw)));
    }
  });

  it('retains the same accepted state digest as the pre-integration parse', () => {
    const raw = ndjson(VALID_LINES);
    // The pre-PR-18 path: JSON.parse each line, no validation.
    const legacyParsed = raw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as IGameEvent);
    const result = loadReplayLibraryNdjson(raw, 'quick/pipeline-test');
    expect(result.kind).toBe('loaded');
    if (result.kind === 'loaded') {
      expect(digestReplayCheckpointState(result.events)).toBe(
        digestReplayCheckpointState(legacyParsed),
      );
    }
  });

  it.each([
    ['malformed bytes', '{this is not json}', 'invalid-source-event', null],
    [
      'no discriminant',
      JSON.stringify({ foo: 'bar' }),
      'invalid-source-event',
      null,
    ],
    [
      'unknown event type',
      JSON.stringify(envelope(9, 'warp_drive_engaged', {})),
      'unsupported-event-type',
      'warp_drive_engaged',
    ],
    [
      'invalid payload',
      JSON.stringify(
        envelope(9, 'shutdown_check', {
          unitId: 'atlas-as7-d',
          heatLevel: 'hot',
          targetNumber: 4,
          roll: 7,
          shutdownOccurred: false,
        }),
      ),
      'invalid-payload',
      'shutdown_check',
    ],
    [
      'ambiguous attribution (explicit version identity)',
      JSON.stringify({
        ...envelope(9, 'turn_started', {}),
        eventVersion: 3,
      }),
      'ambiguous-attribution',
      null,
    ],
  ])(
    'a %s line blocks the WHOLE history with typed evidence',
    (_label, badLine, expectedReason, expectedEventType) => {
      const lines = [
        JSON.stringify(VALID_LINES[0]),
        badLine,
        JSON.stringify(VALID_LINES[4]),
      ];
      const raw = lines.join('\n');
      const result = loadReplayLibraryNdjson(raw, 'quick/pipeline-test');
      expect(result.kind).toBe('blocked');
      if (result.kind === 'blocked') {
        expect(result.blockedLines).toHaveLength(1);
        const blocked = result.blockedLines[0];
        expect(blocked?.line).toBe(2);
        expect(blocked?.reason).toBe(expectedReason);
        expect(blocked?.eventType).toBe(expectedEventType);
        expect(blocked?.evidenceDigest).toBe(
          sha256(new TextEncoder().encode(badLine)),
        );
        expect(result.sourceId).toBe('quick/pipeline-test');
        expect(result.formatId).toBe('simulation-report-jsonl');
        // No partial success of any kind.
        expect('events' in result).toBe(false);
      }
    },
  );

  it('reports every failing line, not just the first', () => {
    const raw = [
      '{broken one}',
      JSON.stringify(VALID_LINES[0]),
      '{broken two}',
    ].join('\n');
    const result = loadReplayLibraryNdjson(raw, 'quick/pipeline-test');
    expect(result.kind).toBe('blocked');
    if (result.kind === 'blocked') {
      expect(result.blockedLines.map((blocked) => blocked.line)).toEqual([
        1, 3,
      ]);
    }
  });

  it('an empty history loads with zero events', () => {
    const result = loadReplayLibraryNdjson('\n\n', 'quick/empty');
    expect(result.kind).toBe('loaded');
    if (result.kind === 'loaded') {
      expect(result.events).toEqual([]);
      expect(result.census.eventsApplied).toBe(0);
    }
  });
});
