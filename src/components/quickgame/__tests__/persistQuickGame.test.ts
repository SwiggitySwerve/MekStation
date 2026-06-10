/**
 * Tests for `persistQuickGame` + `buildQuickManifestEntry`. Per
 * `add-replay-library` PR 5 (quick-session spec — Quick Game Event Log
 * Persistence ADDED scenarios): completion → file written to
 * `simulation-reports/quick/<gameId>.jsonl` AND manifest entry appended
 * AND replaySource=Quick stamped on every event.
 *
 * Tests use a tmpdir cwd to avoid touching the real
 * `simulation-reports/` tree. The Node-vs-browser branch in
 * `persistQuickGame` falls through to the Node path here because
 * `process.versions.node` is set under jest.
 */

import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

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

import { buildQuickManifestEntry, persistQuickGame } from '../persistQuickGame';

const FIXTURE_GAME_ID = 'quick-test-1';

// Build a minimal IGameUnit shape — only the fields the manifest builder
// reads (`bv`) need a real value; everything else is a placeholder so
// the type-checker is happy without depending on the full IGameUnit
// surface.
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

describe('buildQuickManifestEntry', () => {
  const baseInput = {
    gameId: FIXTURE_GAME_ID,
    aiVariant: 'aggressive-v2',
  };

  it('builds an IQuickReplayManifestEntry with replaySource=Quick discriminant', () => {
    const events: IGameEvent[] = [
      gameCreatedEvent([unit('p1', 1500), unit('o1', 1700)]),
      turnStartedEvent(1, 1),
      turnStartedEvent(2, 2),
    ];

    const entry = buildQuickManifestEntry({
      ...baseInput,
      events,
      winner: 'player',
    });

    expect(entry.replaySource).toBe(ReplaySource.Quick);
    expect(entry.id).toBe(FIXTURE_GAME_ID);
    expect(entry.path).toBe(`quick/${FIXTURE_GAME_ID}.jsonl`);
    expect(entry.playerSide).toBe(GameSide.Player);
    expect(entry.aiVariant).toBe('aggressive-v2');
  });

  it('extracts winner=Player from "player" winner string', () => {
    const entry = buildQuickManifestEntry({
      ...baseInput,
      events: [],
      winner: 'player',
    });
    expect(entry.winner).toBe(GameSide.Player);
  });

  it('extracts winner=Opponent from "opponent" winner string', () => {
    const entry = buildQuickManifestEntry({
      ...baseInput,
      events: [],
      winner: 'opponent',
    });
    expect(entry.winner).toBe(GameSide.Opponent);
  });

  it('collapses winner="draw" and winner=null to null', () => {
    expect(
      buildQuickManifestEntry({ ...baseInput, events: [], winner: 'draw' })
        .winner,
    ).toBeNull();
    expect(
      buildQuickManifestEntry({ ...baseInput, events: [], winner: null })
        .winner,
    ).toBeNull();
  });

  it('counts turn_started events as turns', () => {
    const events: IGameEvent[] = [
      gameCreatedEvent([]),
      turnStartedEvent(1, 1),
      turnStartedEvent(2, 2),
      turnStartedEvent(3, 3),
    ];
    const entry = buildQuickManifestEntry({
      ...baseInput,
      events,
      winner: 'player',
    });
    expect(entry.turns).toBe(3);
  });

  it('falls back to turns=0 when no turn_started events', () => {
    const entry = buildQuickManifestEntry({
      ...baseInput,
      events: [gameCreatedEvent([])],
      winner: null,
    });
    expect(entry.turns).toBe(0);
  });

  it('sums bv from GameCreated.payload.units', () => {
    const entry = buildQuickManifestEntry({
      ...baseInput,
      events: [gameCreatedEvent([unit('p1', 1500), unit('o1', 1700)])],
      winner: 'player',
    });
    expect(entry.bvTotal).toBe(3200);
  });

  it('falls back to bvTotal=0 when no GameCreated event present', () => {
    const entry = buildQuickManifestEntry({
      ...baseInput,
      events: [turnStartedEvent(0, 1)],
      winner: 'player',
    });
    expect(entry.bvTotal).toBe(0);
  });

  it('falls back to aiVariant="unknown" when input is empty string', () => {
    const entry = buildQuickManifestEntry({
      gameId: FIXTURE_GAME_ID,
      events: [],
      winner: null,
      aiVariant: '',
    });
    expect(entry.aiVariant).toBe('unknown');
  });
});

describe('persistQuickGame (Node env)', () => {
  let cwd: string;

  beforeEach(async () => {
    // Each test gets its own tmpdir so concurrent tests don't trip the
    // file-mutex in `appendManifestEntry`.
    cwd = await mkdtemp(path.join(tmpdir(), 'mekstation-pr5-'));
  });

  afterEach(async () => {
    if (cwd !== '') {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('writes the event log to simulation-reports/quick/<gameId>.jsonl', async () => {
    const events: IGameEvent[] = [
      gameCreatedEvent([unit('p1', 1500)]),
      turnStartedEvent(1, 1),
    ];

    const result = await persistQuickGame({
      gameId: FIXTURE_GAME_ID,
      events,
      winner: 'player',
      aiVariant: 'aggressive-v2',
      cwd,
    });

    expect(result.persisted).toBe(true);
    expect(result.path).toBe(
      path.resolve(
        cwd,
        'simulation-reports',
        'quick',
        `${FIXTURE_GAME_ID}.jsonl`,
      ),
    );

    const written = await readFile(result.path!, 'utf-8');
    const lines = written.split('\n');
    expect(lines).toHaveLength(events.length);
    // Round-trip through JSON.parse to assert the file is well-formed.
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it('stamps replaySource=Quick on every persisted event', async () => {
    const events: IGameEvent[] = [
      gameCreatedEvent([]),
      turnStartedEvent(1, 1),
      turnStartedEvent(2, 2),
    ];

    const result = await persistQuickGame({
      gameId: FIXTURE_GAME_ID,
      events,
      winner: 'player',
      aiVariant: 'aggressive-v2',
      cwd,
    });

    const written = await readFile(result.path!, 'utf-8');
    const parsed = written
      .split('\n')
      .map((line) => JSON.parse(line) as IGameEvent);
    for (const event of parsed) {
      expect(event.replaySource).toBe(ReplaySource.Quick);
    }
  });

  it('preserves an explicit replaySource (does not overwrite)', async () => {
    const fixedEvent: IGameEvent = {
      ...turnStartedEvent(0, 1),
      // Future emitter sets a different source — post-stamp respects it.
      replaySource: ReplaySource.Campaign,
    };
    const events: IGameEvent[] = [gameCreatedEvent([]), fixedEvent];

    const result = await persistQuickGame({
      gameId: FIXTURE_GAME_ID,
      events,
      winner: 'player',
      aiVariant: 'aggressive-v2',
      cwd,
    });

    const written = await readFile(result.path!, 'utf-8');
    const parsed = written
      .split('\n')
      .map((line) => JSON.parse(line) as IGameEvent);
    // GameCreated didn't have a source → stamped Quick
    expect(parsed[0].replaySource).toBe(ReplaySource.Quick);
    // Fixed event already had Campaign → preserved
    expect(parsed[1].replaySource).toBe(ReplaySource.Campaign);
  });

  it('appends an IQuickReplayManifestEntry to replay-index.json', async () => {
    const events: IGameEvent[] = [
      gameCreatedEvent([unit('p1', 1500), unit('o1', 1700)]),
      turnStartedEvent(1, 1),
    ];

    await persistQuickGame({
      gameId: FIXTURE_GAME_ID,
      events,
      winner: 'opponent',
      aiVariant: 'aggressive-v2',
      cwd,
    });

    const indexPath = path.resolve(
      cwd,
      'simulation-reports',
      'replay-index.json',
    );
    const indexJson = JSON.parse(await readFile(indexPath, 'utf-8')) as {
      entries: unknown[];
    };
    // Index file format from PR 2 stores entries under `entries: []`.
    // If the writer's serialization shape is just an array, adapt:
    const entries: unknown[] = Array.isArray(indexJson)
      ? indexJson
      : indexJson.entries;
    expect(entries).toHaveLength(1);
    const entry = entries[0] as { replaySource: ReplaySource; id: string };
    expect(entry.replaySource).toBe(ReplaySource.Quick);
    expect(entry.id).toBe(FIXTURE_GAME_ID);
  });

  it('creates the partition directory if missing', async () => {
    // tmpdir starts empty — `simulation-reports/quick/` doesn't exist.
    const result = await persistQuickGame({
      gameId: FIXTURE_GAME_ID,
      events: [gameCreatedEvent([])],
      winner: null,
      aiVariant: 'unknown',
      cwd,
    });
    expect(result.persisted).toBe(true);

    const files = await readdir(
      path.resolve(cwd, 'simulation-reports', 'quick'),
    );
    expect(files).toContain(`${FIXTURE_GAME_ID}.jsonl`);
  });

  it('audit W5.2: a payload-less game_created throws BEFORE any write — no orphan JSONL, no manifest', async () => {
    // Mirror of the encounter pipeline defect: the old ordering wrote
    // the JSONL first, then threw building the manifest entry off
    // `payload.units` — leaving an orphan file the manifest never saw.
    const malformed = { ...gameCreatedEvent([]) } as unknown as Record<
      string,
      unknown
    >;
    delete malformed.payload;

    await expect(
      persistQuickGame({
        gameId: FIXTURE_GAME_ID,
        events: [malformed as unknown as IGameEvent],
        winner: 'player',
        aiVariant: 'aggressive-v2',
        cwd,
      }),
    ).rejects.toThrow();

    let partitionFiles: string[] = [];
    try {
      partitionFiles = await readdir(
        path.resolve(cwd, 'simulation-reports', 'quick'),
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
