/**
 * Phase 2 of `add-always-on-event-log` — integration test for task 2.4.
 *
 * Spec contract: openspec/changes/add-always-on-event-log/specs/
 *   quick-session/spec.md → "Per-Game Event Log Persistence" +
 *   simulation-system/spec.md → "Event Log Chronological Contract".
 *
 * Verifies the always-on persistence module:
 *   - Writes one NDJSON line per event (no wrapper).
 *   - Line count === events.length.
 *   - Each line round-trips through `JSON.parse` to the original event
 *     (deep-equal — no field added, removed, renamed by the layer).
 *   - Sequence numbers strictly increase across consecutive lines.
 *   - Empty-events input writes an empty file (zero lines, no crash).
 *   - Concurrent writes against distinct gameIds in the same dir are
 *     safe (the spec mandates `mkdir({ recursive: true })` tolerance).
 */

import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { GameEventType, GamePhase, type IGameEvent } from '@/types/gameplay';

import { writeEventLog } from '../runner/eventLogPersistence';

jest.setTimeout(15_000);

/**
 * Produce a small but realistic event-list fixture for the test.
 * Uses real `IGameEvent` shapes — sequence is monotonically
 * increasing, two distinct event types appear, the gameId is constant.
 */
function buildFixtureEvents(gameId: string): readonly IGameEvent[] {
  const baseTimestamp = '2026-05-06T12:00:00.000Z';
  return [
    {
      id: `${gameId}-0`,
      gameId,
      sequence: 0,
      timestamp: baseTimestamp,
      type: GameEventType.GameCreated,
      turn: 1,
      phase: GamePhase.Initiative,
      payload: {
        config: {
          playersCount: 2,
          maxTurns: 50,
          rules: { quickStart: true },
          mapId: 'test-map',
        },
        units: [],
      },
    },
    {
      id: `${gameId}-1`,
      gameId,
      sequence: 1,
      timestamp: baseTimestamp,
      type: GameEventType.GameStarted,
      turn: 1,
      phase: GamePhase.Initiative,
      payload: { firstSide: 'player' },
    },
    {
      id: `${gameId}-2`,
      gameId,
      sequence: 2,
      timestamp: baseTimestamp,
      type: GameEventType.MovementDeclared,
      turn: 1,
      phase: GamePhase.Movement,
      actorId: 'player-1',
      payload: {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        facing: 0,
        movementType: 'walk',
        mpUsed: 1,
      },
    },
    {
      id: `${gameId}-3`,
      gameId,
      sequence: 3,
      timestamp: baseTimestamp,
      type: GameEventType.MovementDeclared,
      turn: 1,
      phase: GamePhase.Movement,
      actorId: 'opponent-1',
      payload: {
        unitId: 'opponent-1',
        from: { q: 5, r: 5 },
        to: { q: 4, r: 5 },
        facing: 3,
        movementType: 'walk',
        mpUsed: 1,
      },
    },
    {
      id: `${gameId}-4`,
      gameId,
      sequence: 4,
      timestamp: baseTimestamp,
      type: GameEventType.GameEnded,
      turn: 2,
      phase: GamePhase.End,
      payload: {
        winner: 'player',
        reason: 'opponent-destroyed',
      },
    },
  ] as readonly IGameEvent[];
}

describe('add-always-on-event-log Phase 2 — eventLogPersistence', () => {
  let tmpDir: string;

  beforeEach(async () => {
    // Each test gets its own throwaway directory so concurrent jest
    // workers don't share state.
    tmpDir = await fsPromises.mkdtemp(
      path.join(os.tmpdir(), 'mekstation-event-log-'),
    );
  });

  afterEach(async () => {
    // Clean up the throwaway directory.
    await fsPromises.rm(tmpDir, { recursive: true, force: true });
  });

  it('writes one NDJSON line per event with monotonic sequence', async () => {
    const gameId = 'test-game-1';
    const events = buildFixtureEvents(gameId);

    const filePath = await writeEventLog(gameId, events, tmpDir);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(filePath).toMatch(/test-game-1\.jsonl$/);

    const raw = await fsPromises.readFile(filePath, 'utf-8');
    // No trailing newline per spec D2 ("no trailing newline").
    expect(raw.endsWith('\n')).toBe(false);

    const lines = raw.split('\n');
    expect(lines).toHaveLength(events.length);

    const parsed = lines.map((line) => JSON.parse(line) as IGameEvent);

    // Round-trip equality — every event SHALL deep-equal its original
    // (no consumer-visible field added, removed, or renamed by the
    // persistence layer per simulation-system spec).
    expect(parsed).toEqual(events);

    // Strictly increasing sequence numbers (ordering invariant from
    // the chronological contract).
    for (let i = 1; i < parsed.length; i++) {
      expect(parsed[i].sequence).toBeGreaterThan(parsed[i - 1].sequence);
    }

    // Every event's gameId equals the file's basename without
    // `.jsonl` (per quick-session spec scenario).
    const basename = path.basename(filePath, '.jsonl');
    for (const event of parsed) {
      expect(event.gameId).toBe(basename);
    }
  });

  it('creates parent directories when missing (recursive mkdir)', async () => {
    // Ask for a nested directory that does NOT exist yet — the
    // function MUST create it without throwing.
    const nestedDir = path.join(tmpDir, 'games', 'run-2026-05-06');
    expect(fs.existsSync(nestedDir)).toBe(false);

    const gameId = 'nested-test';
    const events = buildFixtureEvents(gameId);
    const filePath = await writeEventLog(gameId, events, nestedDir);

    expect(fs.existsSync(nestedDir)).toBe(true);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('writes empty file when events array is empty', async () => {
    // A 0-event run is legitimate (e.g. a 0-turn dry test). The
    // function should write an empty file, not skip the write.
    const filePath = await writeEventLog('empty-game', [], tmpDir);
    expect(fs.existsSync(filePath)).toBe(true);

    const raw = await fsPromises.readFile(filePath, 'utf-8');
    expect(raw).toBe('');
  });

  it('handles concurrent writes against distinct gameIds in the same dir', async () => {
    // Spec D2 says "safe to call concurrently across distinct
    // gameId's". This test fires three writes in parallel against the
    // SAME outputDir and confirms all three files land cleanly with
    // no `mkdir` race.
    const events1 = buildFixtureEvents('game-a');
    const events2 = buildFixtureEvents('game-b');
    const events3 = buildFixtureEvents('game-c');

    const [pathA, pathB, pathC] = await Promise.all([
      writeEventLog('game-a', events1, tmpDir),
      writeEventLog('game-b', events2, tmpDir),
      writeEventLog('game-c', events3, tmpDir),
    ]);

    expect(fs.existsSync(pathA)).toBe(true);
    expect(fs.existsSync(pathB)).toBe(true);
    expect(fs.existsSync(pathC)).toBe(true);

    // Each file's line count matches its source events array.
    const [rawA, rawB, rawC] = await Promise.all([
      fsPromises.readFile(pathA, 'utf-8'),
      fsPromises.readFile(pathB, 'utf-8'),
      fsPromises.readFile(pathC, 'utf-8'),
    ]);
    expect(rawA.split('\n')).toHaveLength(events1.length);
    expect(rawB.split('\n')).toHaveLength(events2.length);
    expect(rawC.split('\n')).toHaveLength(events3.length);
  });

  it('returns an absolute path that resolves to the written file', async () => {
    const filePath = await writeEventLog('abs-path-test', [], tmpDir);
    expect(path.isAbsolute(filePath)).toBe(true);
    expect(fs.existsSync(filePath)).toBe(true);
  });
});
