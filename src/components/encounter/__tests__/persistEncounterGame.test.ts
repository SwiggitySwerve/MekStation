/**
 * Tests for `persistEncounterGame` + `buildEncounterManifestEntry`. Per
 * `link-encounters-to-replays` PR 2 (game-session-management spec —
 * Encounter Game Event Log Persistence ADDED scenarios): completion →
 * file written to `simulation-reports/encounter/<gameId>.jsonl` AND
 * manifest entry appended AND replaySource=Encounter stamped on every
 * event.
 *
 * Mirror of the quick-game pipeline tests with the encounter-specific
 * fields added. Tests use a tmpdir cwd to avoid touching the real
 * `simulation-reports/` tree. The Node-vs-browser branch in
 * `persistEncounterGame` falls through to the Node path here because
 * `process.versions.node` is set under jest.
 */

import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ScenarioTemplateType } from '@/types/encounter/EncounterInterfaces';
import {
  GameEventType,
  GamePhase,
  GameSide,
  ReplaySource,
  type IGameCreatedPayload,
  type IGameEvent,
  type IGameUnit,
  type ITurnStartedPayload,
} from '@/types/gameplay';

import {
  buildEncounterManifestEntry,
  persistEncounterGame,
  stampEncounterReplaySource,
  type IPersistEncounterGameInput,
} from '../persistEncounterGame';

const FIXTURE_GAME_ID = 'encounter-test-1';

// Build a minimal IGameUnit shape — only `bv` matters for the manifest
// builder; everything else is a placeholder so the type-checker is happy
// without depending on the full IGameUnit surface.
function unit(id: string, bv: number): IGameUnit {
  return {
    id,
    name: `unit-${id}`,
    side: GameSide.Player,
    bv,
    type: 'mech',
  } as unknown as IGameUnit;
}

function gameCreatedEvent(units: readonly IGameUnit[]): IGameEvent {
  const payload: IGameCreatedPayload = {
    config: {
      mapRadius: 10,
      turnLimit: 10,
      victoryConditions: ['destruction'],
      optionalRules: [],
    },
    units,
  };
  return {
    id: `${FIXTURE_GAME_ID}-evt-0`,
    gameId: FIXTURE_GAME_ID,
    sequence: 0,
    timestamp: new Date(0).toISOString(),
    type: GameEventType.GameCreated,
    turn: 0,
    phase: GamePhase.Initiative,
    payload,
  };
}

function turnStartedEvent(sequence: number, turn: number): IGameEvent {
  const payload: ITurnStartedPayload = {};
  return {
    id: `${FIXTURE_GAME_ID}-evt-${sequence}`,
    gameId: FIXTURE_GAME_ID,
    sequence,
    timestamp: new Date(sequence * 1000).toISOString(),
    type: GameEventType.TurnStarted,
    turn,
    phase: GamePhase.Initiative,
    payload,
  };
}

// Convenience: a baseline encounter input with sensible defaults so each
// test can override only the fields it cares about.
function makeBaseInput(
  overrides: Partial<IPersistEncounterGameInput> = {},
): Omit<IPersistEncounterGameInput, 'cwd'> {
  return {
    gameId: FIXTURE_GAME_ID,
    events: [],
    winner: 'player',
    encounterId: 'enc-row-1',
    encounterName: 'Storming the Citadel',
    templateType: ScenarioTemplateType.Skirmish,
    playerForceSummary: "Wolf's Dragoons (4500 BV, 4 units)",
    opponentSummary: 'Clan Jade Falcon (5200 BV, 5 units)',
    ...overrides,
  };
}

describe('buildEncounterManifestEntry', () => {
  it('builds an IEncounterReplayManifestEntry with replaySource=Encounter discriminant', () => {
    const events: IGameEvent[] = [
      gameCreatedEvent([unit('p1', 1500), unit('o1', 1700)]),
      turnStartedEvent(1, 1),
      turnStartedEvent(2, 2),
    ];

    const entry = buildEncounterManifestEntry(makeBaseInput({ events }));

    expect(entry.replaySource).toBe(ReplaySource.Encounter);
    expect(entry.id).toBe(FIXTURE_GAME_ID);
    expect(entry.path).toBe(`encounter/${FIXTURE_GAME_ID}.jsonl`);
  });

  it('populates all encounter-specific fields verbatim from input', () => {
    const entry = buildEncounterManifestEntry(
      makeBaseInput({
        encounterId: 'enc-42',
        encounterName: 'Battle for Tukayyid',
        templateType: ScenarioTemplateType.Battle,
        playerForceSummary: 'ComStar 1st (8000 BV, 12 units)',
        opponentSummary: 'Clan Wolf (8500 BV, 12 units)',
      }),
    );
    expect(entry.encounterId).toBe('enc-42');
    expect(entry.encounterName).toBe('Battle for Tukayyid');
    expect(entry.templateType).toBe(ScenarioTemplateType.Battle);
    expect(entry.playerForceSummary).toBe('ComStar 1st (8000 BV, 12 units)');
    expect(entry.opponentSummary).toBe('Clan Wolf (8500 BV, 12 units)');
  });

  it('preserves templateType=null for free-form / custom encounters', () => {
    const entry = buildEncounterManifestEntry(
      makeBaseInput({ templateType: null }),
    );
    expect(entry.templateType).toBeNull();
  });

  it('extracts winner=Player from "player" winner string', () => {
    const entry = buildEncounterManifestEntry(
      makeBaseInput({ winner: 'player' }),
    );
    expect(entry.winner).toBe(GameSide.Player);
  });

  it('extracts winner=Opponent from "opponent" winner string', () => {
    const entry = buildEncounterManifestEntry(
      makeBaseInput({ winner: 'opponent' }),
    );
    expect(entry.winner).toBe(GameSide.Opponent);
  });

  it('collapses winner="draw" and winner=null to null', () => {
    expect(
      buildEncounterManifestEntry(makeBaseInput({ winner: 'draw' })).winner,
    ).toBeNull();
    expect(
      buildEncounterManifestEntry(makeBaseInput({ winner: null })).winner,
    ).toBeNull();
  });

  it('counts turn_started events as turns', () => {
    const events: IGameEvent[] = [
      gameCreatedEvent([]),
      turnStartedEvent(1, 1),
      turnStartedEvent(2, 2),
      turnStartedEvent(3, 3),
    ];
    const entry = buildEncounterManifestEntry(makeBaseInput({ events }));
    expect(entry.turns).toBe(3);
  });

  it('falls back to turns=0 when no turn_started events', () => {
    const entry = buildEncounterManifestEntry(
      makeBaseInput({ events: [gameCreatedEvent([])] }),
    );
    expect(entry.turns).toBe(0);
  });

  it('sums bv from GameCreated.payload.units', () => {
    const entry = buildEncounterManifestEntry(
      makeBaseInput({
        events: [gameCreatedEvent([unit('p1', 1500), unit('o1', 1700)])],
      }),
    );
    expect(entry.bvTotal).toBe(3200);
  });

  it('falls back to bvTotal=0 when no GameCreated event present', () => {
    const entry = buildEncounterManifestEntry(
      makeBaseInput({ events: [turnStartedEvent(0, 1)] }),
    );
    expect(entry.bvTotal).toBe(0);
  });
});

describe('stampEncounterReplaySource', () => {
  it('stamps Encounter on events without an explicit replaySource', () => {
    const events: IGameEvent[] = [gameCreatedEvent([]), turnStartedEvent(1, 1)];
    const stamped = stampEncounterReplaySource(events);
    for (const event of stamped) {
      expect(event.replaySource).toBe(ReplaySource.Encounter);
    }
  });

  it('preserves an explicit replaySource (does not overwrite)', () => {
    const fixedEvent: IGameEvent = {
      ...turnStartedEvent(0, 1),
      replaySource: ReplaySource.Campaign,
    };
    const stamped = stampEncounterReplaySource([
      gameCreatedEvent([]),
      fixedEvent,
    ]);
    expect(stamped[0].replaySource).toBe(ReplaySource.Encounter);
    expect(stamped[1].replaySource).toBe(ReplaySource.Campaign);
  });
});

describe('persistEncounterGame (Node env)', () => {
  let cwd: string;

  beforeEach(async () => {
    // Each test gets its own tmpdir so concurrent tests don't trip the
    // file-mutex in `appendManifestEntry`.
    cwd = await mkdtemp(path.join(tmpdir(), 'mekstation-encounter-pr2-'));
  });

  afterEach(async () => {
    if (cwd !== '') {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('happy path: writes file under tmpdir, appends manifest, returns persisted=true with the right discriminator', async () => {
    const events: IGameEvent[] = [
      gameCreatedEvent([unit('p1', 1500), unit('o1', 1700)]),
      turnStartedEvent(1, 1),
    ];

    const result = await persistEncounterGame({
      ...makeBaseInput({ events }),
      cwd,
    });

    expect(result.persisted).toBe(true);
    expect(result.path).toBe(
      path.resolve(
        cwd,
        'simulation-reports',
        'encounter',
        `${FIXTURE_GAME_ID}.jsonl`,
      ),
    );
    expect(result.manifestEntry).not.toBeNull();
    expect(result.manifestEntry!.replaySource).toBe(ReplaySource.Encounter);
    expect(result.manifestEntry!.encounterId).toBe('enc-row-1');
    expect(result.manifestEntry!.encounterName).toBe('Storming the Citadel');
    expect(result.manifestEntry!.templateType).toBe(
      ScenarioTemplateType.Skirmish,
    );

    // Manifest entry was appended to replay-index.json.
    const indexPath = path.resolve(
      cwd,
      'simulation-reports',
      'replay-index.json',
    );
    const indexJson = JSON.parse(await readFile(indexPath, 'utf-8')) as
      | { entries: unknown[] }
      | unknown[];
    const entries: unknown[] = Array.isArray(indexJson)
      ? indexJson
      : indexJson.entries;
    expect(entries).toHaveLength(1);
    const entry = entries[0] as {
      replaySource: ReplaySource;
      id: string;
      encounterId: string;
    };
    expect(entry.replaySource).toBe(ReplaySource.Encounter);
    expect(entry.id).toBe(FIXTURE_GAME_ID);
    expect(entry.encounterId).toBe('enc-row-1');
  });

  it('browser env (no Node runtime): no-op, returns persisted=false, manifestEntry=null', async () => {
    // Stub out `process.versions.node` to simulate a browser-like env.
    // The shouldPersistToDisk check uses `typeof process.versions.node === 'string'`,
    // so deleting / overriding that property flips the gate.
    const originalNode = process.versions.node;
    Object.defineProperty(process.versions, 'node', {
      value: undefined,
      configurable: true,
    });

    try {
      const result = await persistEncounterGame({
        ...makeBaseInput({
          events: [gameCreatedEvent([])],
        }),
        // Even with cwd provided, the Node-runtime gate fails first.
        cwd,
      });
      expect(result.persisted).toBe(false);
      expect(result.path).toBeNull();
      expect(result.manifestEntry).toBeNull();

      // Confirm nothing was written to disk under the tmpdir.
      let dirContents: string[] = [];
      try {
        dirContents = await readdir(path.resolve(cwd, 'simulation-reports'));
      } catch {
        // ENOENT — directory was never created. That's the expected no-op.
      }
      expect(dirContents).toHaveLength(0);
    } finally {
      Object.defineProperty(process.versions, 'node', {
        value: originalNode,
        configurable: true,
      });
    }
  });

  it('test env without cwd: no-op (jest-jsdom guard)', async () => {
    // process.env.NODE_ENV === 'test' under jest. Without a cwd override,
    // shouldPersistToDisk should return false and the call short-circuits.
    expect(process.env.NODE_ENV).toBe('test');

    const result = await persistEncounterGame(
      makeBaseInput({ events: [gameCreatedEvent([])] }),
      // no cwd — explicitly omitted
    );
    expect(result.persisted).toBe(false);
    expect(result.path).toBeNull();
    expect(result.manifestEntry).toBeNull();
  });

  it('preserves an explicit non-Encounter replaySource on a sample event (does not overwrite)', async () => {
    const fixedEvent: IGameEvent = {
      ...turnStartedEvent(0, 1),
      replaySource: ReplaySource.Campaign,
    };
    const events: IGameEvent[] = [gameCreatedEvent([]), fixedEvent];

    const result = await persistEncounterGame({
      ...makeBaseInput({ events }),
      cwd,
    });

    const written = await readFile(result.path!, 'utf-8');
    const parsed = written
      .split('\n')
      .map((line) => JSON.parse(line) as IGameEvent);
    // GameCreated didn't have a source → stamped Encounter
    expect(parsed[0].replaySource).toBe(ReplaySource.Encounter);
    // Fixed event already had Campaign → preserved
    expect(parsed[1].replaySource).toBe(ReplaySource.Campaign);
  });

  it('manifest entry shape: replaySource=encounter, all source-specific fields populated correctly', async () => {
    const events: IGameEvent[] = [gameCreatedEvent([unit('p1', 2000)])];
    const result = await persistEncounterGame({
      ...makeBaseInput({
        events,
        encounterId: 'enc-shape-1',
        encounterName: 'Shape Test',
        templateType: ScenarioTemplateType.Duel,
        playerForceSummary: 'Player Force (2000 BV, 1 unit)',
        opponentSummary: 'Generated lance (~2200 BV)',
      }),
      cwd,
    });

    const entry = result.manifestEntry!;
    expect(entry.replaySource).toBe('encounter');
    expect(entry.replaySource).toBe(ReplaySource.Encounter);
    expect(entry.encounterId).toBe('enc-shape-1');
    expect(entry.encounterName).toBe('Shape Test');
    expect(entry.templateType).toBe(ScenarioTemplateType.Duel);
    expect(entry.playerForceSummary).toBe('Player Force (2000 BV, 1 unit)');
    expect(entry.opponentSummary).toBe('Generated lance (~2200 BV)');
    expect(entry.path).toBe(`encounter/${FIXTURE_GAME_ID}.jsonl`);
    expect(entry.bvTotal).toBe(2000);
  });

  it('round-trip: written file parses back into an event array with the post-stamped source', async () => {
    const events: IGameEvent[] = [
      gameCreatedEvent([unit('p1', 1500)]),
      turnStartedEvent(1, 1),
      turnStartedEvent(2, 2),
    ];

    const result = await persistEncounterGame({
      ...makeBaseInput({ events }),
      cwd,
    });
    expect(result.persisted).toBe(true);

    const written = await readFile(result.path!, 'utf-8');
    const lines = written.split('\n');
    expect(lines).toHaveLength(events.length);

    const parsed = lines.map((line) => JSON.parse(line) as IGameEvent);
    expect(parsed).toHaveLength(events.length);
    for (const event of parsed) {
      expect(event.replaySource).toBe(ReplaySource.Encounter);
    }
    // First event survived the round-trip with its type intact.
    expect(parsed[0].type).toBe(GameEventType.GameCreated);
    expect(parsed[1].type).toBe(GameEventType.TurnStarted);
  });

  it('creates the encounter partition directory if missing', async () => {
    // tmpdir starts empty — `simulation-reports/encounter/` doesn't exist.
    const result = await persistEncounterGame({
      ...makeBaseInput({ events: [gameCreatedEvent([])] }),
      cwd,
    });
    expect(result.persisted).toBe(true);

    const files = await readdir(
      path.resolve(cwd, 'simulation-reports', 'encounter'),
    );
    expect(files).toContain(`${FIXTURE_GAME_ID}.jsonl`);
  });

  it('audit W5.2: a payload-less game_created throws BEFORE any write — no orphan JSONL, no manifest', async () => {
    // The old ordering wrote the JSONL first, then threw building the
    // manifest entry off `payload.units` — leaving an orphan file on
    // disk that the manifest never references.
    const malformed = { ...gameCreatedEvent([]) } as unknown as Record<
      string,
      unknown
    >;
    delete malformed.payload;

    await expect(
      persistEncounterGame({
        ...makeBaseInput({ events: [malformed as unknown as IGameEvent] }),
        cwd,
      }),
    ).rejects.toThrow();

    // Nothing may exist on disk: neither the partition file nor the
    // manifest. ENOENT on the reports dir is the fully-clean outcome.
    let partitionFiles: string[] = [];
    try {
      partitionFiles = await readdir(
        path.resolve(cwd, 'simulation-reports', 'encounter'),
      );
    } catch {
      // ENOENT — directory never created. Expected.
    }
    expect(partitionFiles).toHaveLength(0);

    await expect(
      readFile(
        path.resolve(cwd, 'simulation-reports', 'replay-index.json'),
        'utf-8',
      ),
    ).rejects.toThrow();
  });
});
