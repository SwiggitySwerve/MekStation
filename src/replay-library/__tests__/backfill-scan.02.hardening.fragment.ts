import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import {
  GameSide,
  IReplayManifestEntry,
  ReplaySource,
  fs,
  gameCreatedEvent,
  gameEndedEvent,
  makeTmpCwd,
  os,
  path,
  scanReplayDirectory,
  setupBackfillScanTestMode,
  teardownBackfillScanTestMode,
  turnStartedEvent,
  writeNDJSON,
} from './backfill-scan.test-helpers';

describe('scanReplayDirectory', () => {
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleDebugSpy = setupBackfillScanTestMode();
  });

  afterEach(() => {
    teardownBackfillScanTestMode();
  });

  it('skips files with no GameCreated event and logs at debug', async () => {
    const cwd = await makeTmpCwd();

    // Corrupt fixture: only TurnStarted + GameEnded, no GameCreated. Per spec
    // the scan must skip without crashing and emit a debug log.
    await writeNDJSON(
      path.join(cwd, 'simulation-reports', 'swarm', 'corrupt.jsonl'),
      [
        turnStartedEvent('corrupt', 1, 1),
        gameEndedEvent('corrupt', GameSide.Player, { turns: 1 }),
      ],
    );
    // Healthy fixture alongside it — proves the corrupt one was skipped, not
    // the whole scan aborted.
    await writeNDJSON(
      path.join(cwd, 'simulation-reports', 'swarm', 'healthy.jsonl'),
      [
        gameCreatedEvent('healthy', [{ id: 'u1', bv: 999 }]),
        gameEndedEvent('healthy', GameSide.Opponent, { turns: 3 }),
      ],
    );

    const entries = await scanReplayDirectory({ cwd });
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('healthy');

    const skipLog = consoleDebugSpy.mock.calls.find(
      (call) =>
        typeof call[0] === 'string' &&
        call[0].includes('without GameCreated event'),
    );
    expect(skipLog).toBeDefined();
    expect(skipLog?.[1]).toMatchObject({ gameId: 'corrupt' });
  });

  it('returns an empty array when simulation-reports/ is empty', async () => {
    const cwd = await makeTmpCwd();
    const entries = await scanReplayDirectory({ cwd });
    expect(entries).toEqual([]);
  });

  it('returns an empty array when simulation-reports/ does not exist', async () => {
    // Use a tmp parent without creating `simulation-reports/` inside.
    const cwd = await fs.mkdtemp(
      path.join(os.tmpdir(), 'replay-library-backfill-missing-'),
    );
    const entries = await scanReplayDirectory({ cwd });
    expect(entries).toEqual([]);
  });

  it('produces typed entries that narrow on replaySource', async () => {
    // Compile-time narrowing check materialized as a runtime assertion. If
    // the discriminated union breaks, the `if`-branches stop type-checking
    // and the test fails to compile.
    const cwd = await makeTmpCwd();
    await writeNDJSON(
      path.join(cwd, 'simulation-reports', 'swarm', 'sim-x.jsonl'),
      [
        gameCreatedEvent('sim-x', [{ id: 'u1', bv: 50 }]),
        gameEndedEvent('sim-x', GameSide.Player, { turns: 2 }),
      ],
    );

    const entries: readonly IReplayManifestEntry[] = await scanReplayDirectory({
      cwd,
    });
    const e = entries[0];
    if (e.replaySource === ReplaySource.Swarm) {
      // `configName` only exists on the swarm variant — references narrowing.
      expect(typeof e.configName).toBe('string');
    } else {
      throw new Error('expected swarm variant');
    }
  });

  // -------------------------------------------------------------------------
  // Encounter partition (link-encounters-to-replays PR 1)
  // -------------------------------------------------------------------------

  it('covers encounter partition layout (encounterMeta round-trip)', async () => {
    // Stages a fixture under `simulation-reports/encounter/` that mirrors
    // what the PR 2 persist hook will write — `GameCreated.payload.encounterMeta`
    // carries the snapshot fields. Verifies `scanReplayDirectory` reads them
    // back into a typed `IEncounterReplayManifestEntry`.
    const cwd = await makeTmpCwd();

    await writeNDJSON(
      path.join(cwd, 'simulation-reports', 'encounter', 'enc-1.jsonl'),
      [
        gameCreatedEvent(
          'enc-1',
          [
            { id: 'u1', bv: 1500 },
            { id: 'u2', bv: 1700 },
          ],
          {
            encounterMeta: {
              encounterId: 'encounter-alpha',
              encounterName: "Wolf's Dragoons vs Clan Jade Falcon",
              templateType: 'skirmish',
              playerForceSummary: "Wolf's Dragoons (3200 BV, 4 units)",
              opponentSummary: 'Clan Jade Falcon (3200 BV, 4 units)',
            },
          },
        ),
        gameEndedEvent('enc-1', GameSide.Opponent, { turns: 8 }),
      ],
    );

    const entries = await scanReplayDirectory({ cwd });

    expect(entries).toHaveLength(1);
    const entry = entries[0];
    if (entry.replaySource !== ReplaySource.Encounter) {
      throw new Error('expected encounter narrowing');
    }
    expect(entry.id).toBe('enc-1');
    expect(entry.path).toBe('encounter/enc-1.jsonl');
    expect(entry.bvTotal).toBe(3200);
    expect(entry.turns).toBe(8);
    expect(entry.winner).toBe(GameSide.Opponent);
    expect(entry.encounterId).toBe('encounter-alpha');
    expect(entry.encounterName).toBe("Wolf's Dragoons vs Clan Jade Falcon");
    expect(entry.templateType).toBe('skirmish');
    expect(entry.playerForceSummary).toBe("Wolf's Dragoons (3200 BV, 4 units)");
    expect(entry.opponentSummary).toBe('Clan Jade Falcon (3200 BV, 4 units)');
  });

  it('encounter scan is idempotent (re-scan deep-equal)', async () => {
    // Two scans on the same disk state SHALL produce deep-equal arrays.
    // Mirrors the PR 1 swarm/quick idempotency test for the new partition.
    const cwd = await makeTmpCwd();

    await writeNDJSON(
      path.join(cwd, 'simulation-reports', 'encounter', 'enc-a.jsonl'),
      [
        gameCreatedEvent('enc-a', [{ id: 'u1', bv: 1000 }], {
          encounterMeta: {
            encounterId: 'enc-a',
            encounterName: 'Encounter A',
            templateType: 'duel',
            playerForceSummary: 'Player A (1000 BV, 1 unit)',
            opponentSummary: 'Opponent A (1000 BV, 1 unit)',
          },
        }),
        gameEndedEvent('enc-a', GameSide.Player, { turns: 4 }),
      ],
    );
    await writeNDJSON(
      path.join(cwd, 'simulation-reports', 'encounter', 'enc-b.jsonl'),
      [
        gameCreatedEvent('enc-b', [{ id: 'u1', bv: 2000 }], {
          encounterMeta: {
            encounterId: 'enc-b',
            encounterName: 'Encounter B',
            // null templateType — free-form / custom encounter case
            templateType: null,
            playerForceSummary: 'Player B (2000 BV, 2 units)',
            opponentSummary: 'Generated lance (~2000 BV)',
          },
        }),
        gameEndedEvent('enc-b', 'draw', { turns: 6 }),
      ],
    );

    const first = await scanReplayDirectory({ cwd });
    const second = await scanReplayDirectory({ cwd });

    expect(second).toEqual(first);
    expect(first.map((e) => e.id)).toEqual(['enc-a', 'enc-b']);

    // null templateType round-trips without coercion
    const encB = first.find((e) => e.id === 'enc-b');
    if (!encB || encB.replaySource !== ReplaySource.Encounter) {
      throw new Error('expected encounter narrowing on enc-b');
    }
    expect(encB.templateType).toBeNull();
  });

  it('encounter entry without encounterMeta falls back to empty strings + null template', async () => {
    // A developer dropping a raw fixture under `encounter/` without the
    // PR 2 metadata SHALL still produce a typed entry — the Library page
    // renders empty cells rather than crashing.
    const cwd = await makeTmpCwd();

    await writeNDJSON(
      path.join(cwd, 'simulation-reports', 'encounter', 'enc-bare.jsonl'),
      [
        gameCreatedEvent('enc-bare', [{ id: 'u1', bv: 500 }]),
        gameEndedEvent('enc-bare', GameSide.Player, { turns: 1 }),
      ],
    );

    const entries = await scanReplayDirectory({ cwd });
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    if (entry.replaySource !== ReplaySource.Encounter) {
      throw new Error('expected encounter narrowing');
    }
    expect(entry.encounterId).toBe('');
    expect(entry.encounterName).toBe('');
    expect(entry.templateType).toBeNull();
    expect(entry.playerForceSummary).toBe('');
    expect(entry.opponentSummary).toBe('');
  });
});
