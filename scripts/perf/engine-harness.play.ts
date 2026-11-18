/**
 * Scenario construction for the engine harness, on the production path only:
 *
 * - real catalog units read by `NodeCanonicalUnitService` and adapted by
 *   `adaptUnitFromData`, the pair the multiplayer server uses in Node;
 * - `GameEngine.createInteractiveSession`, which appends `GameCreated`, as the
 *   quick game and pre-battle launches do;
 * - a prior log played by the bots (`runAITurn` + `advancePhase`, the
 *   spectator loop), never synthesised;
 * - the measured session reloaded through cold recovery's gate and fold
 *   (`hydrateRecoverableSessionWithReport`) and the server's Node recovery
 *   (`recoverServerInteractiveSession`).
 *
 * Tracking asserts live here too: they are hard failures.
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import type { IAdaptedUnit } from '../../src/engine/types';

import { adaptUnitFromData } from '../../src/engine/adapters/CompendiumAdapter';
import { GameEngine, InteractiveSession } from '../../src/engine/GameEngine';
import { createGridFromTerrainPreset } from '../../src/engine/GameEngine.helpers';
import {
  InteractiveSessionRecoveryCorruptError,
  hydrateRecoverableSessionWithReport,
} from '../../src/engine/InteractiveSession.persistence';
import { gateReplaySurfaceHistory } from '../../src/lib/events/replay/ReplaySurfaceGate';
import { recoverServerInteractiveSession } from '../../src/lib/multiplayer/server/matchUnitBootstrap';
import { getNodeCanonicalUnitService } from '../../src/services/units/NodeCanonicalUnitService';
import { SeededRandom } from '../../src/simulation/core';
import { TerrainPreset } from '../../src/types/encounter';
import {
  GamePhase,
  GameSide,
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
} from '../../src/types/gameplay';
import { hydrateGameSessionFromEvents } from '../../src/utils/gameplay/gameSession';
import { deriveState } from '../../src/utils/gameplay/gameState';

/** Bump when the way a prior log is played changes; it keys the cache. */
const LOG_BUILDER_VERSION = 1;

export interface IUnitPick {
  readonly id: string;
  readonly name: string;
  readonly tonnage: number;
}

export interface IPlayConfig {
  readonly label: string;
  readonly seed: number;
  readonly units: readonly IUnitPick[];
  readonly mapRadius: number;
  readonly terrain: TerrainPreset;
  /** Ascending event counts to stop at; each lands on a Movement-phase start. */
  readonly checkpoints: readonly number[];
}

export interface IPlayedLog {
  readonly events: readonly IGameEvent[];
  /** target → event count of the Movement-phase start where it was taken. */
  readonly checkpoints: ReadonlyMap<number, number>;
  readonly unreached: readonly number[];
  readonly source: 'played' | 'cache';
  readonly buildMs: number;
  readonly turns: number;
}

export class TrackingAssertError extends Error {
  constructor(scenario: string, check: string, detail: string) {
    super(`TRACKING ASSERT FAILED [${scenario}] ${check}: ${detail}`);
    this.name = 'TrackingAssertError';
  }
}

const GUNNERY = 4;
const PILOTING = 5;

/** BattleMechs 20-100 t from the catalog index, sorted by id. */
export function loadUnitPool(): IUnitPick[] {
  const service = getNodeCanonicalUnitService();
  const index = service.getIndexSync({ family: 'battlemechs' } as never);
  return index
    .filter((entry) => entry.tonnage >= 20 && entry.tonnage <= 100)
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      tonnage: entry.tonnage,
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * Seeded picks. With `configurations` set, a pick whose catalog
 * `configuration` is not listed is skipped and the draw repeated.
 */
export function pickUnits(
  pool: readonly IUnitPick[],
  count: number,
  seed: number,
  configurations: ReadonlySet<string> | null,
): IUnitPick[] {
  const service = getNodeCanonicalUnitService();
  const random = new SeededRandom(seed);
  const picks: IUnitPick[] = [];
  while (picks.length < count) {
    const pick = pool[Math.floor(random.next() * pool.length)];
    if (configurations) {
      const unit = service.getByIdSync(pick.id) as {
        configuration?: string;
      } | null;
      if (!configurations.has(unit?.configuration ?? '')) continue;
    }
    picks.push(pick);
  }
  return picks;
}

function sideFor(index: number): GameSide {
  return index % 2 === 0 ? GameSide.Player : GameSide.Opponent;
}

export function gridFor(radius: number, terrain: TerrainPreset) {
  return createGridFromTerrainPreset(radius, terrain);
}

/** Adapt the picks and open a session the way the launch paths do. */
export function createLiveSession(config: IPlayConfig): InteractiveSession {
  const service = getNodeCanonicalUnitService();
  const adapted: IAdaptedUnit[] = [];
  const gameUnits: IGameUnit[] = [];
  config.units.forEach((pick, index) => {
    const fullUnit = service.getByIdSync(pick.id);
    if (!fullUnit) throw new Error(`Catalog miss for ${pick.id}`);
    const side = sideFor(index);
    const id = `u${index}`;
    adapted.push({
      ...adaptUnitFromData(fullUnit, {
        side,
        gunnery: GUNNERY,
        piloting: PILOTING,
      }),
      id,
    });
    gameUnits.push({
      id,
      name: pick.name,
      side,
      unitRef: pick.id,
      pilotRef: `pilot-${id}`,
      gunnery: GUNNERY,
      piloting: PILOTING,
    });
  });
  const engine = new GameEngine({
    seed: config.seed,
    mapRadius: config.mapRadius,
    turnLimit: 999,
    grid: gridFor(config.mapRadius, config.terrain),
  });
  return engine.createInteractiveSession(
    adapted.filter((unit) => unit.side === GameSide.Player),
    adapted.filter((unit) => unit.side === GameSide.Opponent),
    gameUnits,
  );
}

const BOT_PHASES = new Set<GamePhase>([
  GamePhase.Movement,
  GamePhase.WeaponAttack,
  GamePhase.PhysicalAttack,
]);

/** Play the rest of the current turn with both bots, ending on Initiative. */
export function playTurnRemainder(session: InteractiveSession): void {
  for (let guard = 0; guard < 8; guard++) {
    if (session.isGameOver()) return;
    if (BOT_PHASES.has(session.getState().phase)) {
      session.runAITurn(GameSide.Player);
      session.runAITurn(GameSide.Opponent);
    }
    session.advancePhase();
    if (session.getState().phase === GamePhase.Initiative) return;
  }
}

function playLog(config: IPlayConfig, maxTurns: number): IPlayedLog {
  const started = Date.now();
  const session = createLiveSession(config);
  const pending = [...config.checkpoints];
  const checkpoints = new Map<number, number>();
  let turns = 0;
  while (pending.length > 0 && turns < maxTurns && !session.isGameOver()) {
    // Initiative → Movement; a checkpoint is a Movement-phase start.
    session.advancePhase();
    if (session.getState().phase !== GamePhase.Movement) break;
    const length = session.getSession().events.length;
    while (pending.length > 0 && length >= pending[0]) {
      checkpoints.set(pending.shift() as number, length);
    }
    playTurnRemainder(session);
    turns++;
  }
  return {
    events: session.getSession().events,
    checkpoints,
    unreached: pending,
    source: 'played',
    buildMs: Date.now() - started,
    turns,
  };
}

function cacheKey(config: IPlayConfig): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        v: LOG_BUILDER_VERSION,
        seed: config.seed,
        units: config.units.map((unit) => unit.id),
        radius: config.mapRadius,
        terrain: config.terrain,
        checkpoints: config.checkpoints,
      }),
    )
    .digest('hex')
    .slice(0, 16);
}

export function defaultCacheDir(): string {
  return path.join(os.tmpdir(), 'mekstation-engine-harness');
}

interface ICachedLog {
  readonly key: string;
  readonly label: string;
  readonly builtAt: string;
  readonly builtAtCommit: string;
  readonly buildMs: number;
  readonly turns: number;
  readonly events: IGameEvent[];
  readonly checkpoints: [number, number][];
  readonly unreached: number[];
}

/**
 * The prior log for a scenario: played now, or read from the disk cache when
 * the largest checkpoint is at least `cacheMinEvents` (playing a 10,000-event
 * log costs minutes because each append re-derives state from event 0, P1).
 * A cached log is only a seeded played log; it is gated and folded like any
 * stored history before use.
 */
export function obtainPriorLog(
  config: IPlayConfig,
  options: {
    readonly cacheDir: string | null;
    readonly cacheMinEvents: number;
    readonly fresh: boolean;
    readonly commit: string;
    readonly maxTurns: number;
  },
): IPlayedLog {
  const largest = config.checkpoints[config.checkpoints.length - 1] ?? 0;
  const useCache =
    options.cacheDir !== null && largest >= options.cacheMinEvents;
  const file = useCache
    ? path.join(options.cacheDir as string, `${cacheKey(config)}.json`)
    : null;
  if (file && !options.fresh && fs.existsSync(file)) {
    const cached = JSON.parse(fs.readFileSync(file, 'utf8')) as ICachedLog;
    return {
      events: cached.events,
      checkpoints: new Map(cached.checkpoints),
      unreached: cached.unreached,
      source: 'cache',
      buildMs: cached.buildMs,
      turns: cached.turns,
    };
  }
  const played = playLog(config, options.maxTurns);
  if (file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const record: ICachedLog = {
      key: cacheKey(config),
      label: config.label,
      builtAt: new Date().toISOString(),
      builtAtCommit: options.commit,
      buildMs: played.buildMs,
      turns: played.turns,
      events: [...played.events],
      checkpoints: [...played.checkpoints.entries()],
      unreached: [...played.unreached],
    };
    fs.writeFileSync(file, JSON.stringify(record));
  }
  return played;
}

/** Cold recovery's gate and fold over an in-memory match log. */
export async function gateAndFold(
  matchId: string,
  events: readonly IGameEvent[],
): Promise<IGameSession> {
  const { session } = await hydrateRecoverableSessionWithReport(matchId, {
    getEventsForMatch: async () => [...events],
  });
  return session;
}

/**
 * A playable session for the first `count` events of a played log, through
 * cold recovery's gate and fold. When the gate refuses the played history,
 * the refusal is returned (the caller records a tracking failure) and the
 * session is built from the ungated fold so the timings still run.
 */
export async function recoverAt(
  log: IPlayedLog,
  count: number,
): Promise<{ live: InteractiveSession; gateRefusal: string | null }> {
  const prefix = log.events.slice(0, count);
  const matchId = prefix[0].gameId;
  try {
    const session = await gateAndFold(matchId, prefix);
    return {
      live: await recoverServerInteractiveSession(session),
      gateRefusal: null,
    };
  } catch (error) {
    if (!(error instanceof InteractiveSessionRecoveryCorruptError)) throw error;
    const blocked = error.blockedEvents;
    const session = hydrateGameSessionFromEvents(matchId, prefix);
    return {
      live: await recoverServerInteractiveSession(session),
      gateRefusal: blocked
        ? describeBlocked(blocked)
        : String(error.originalError ?? error.message),
    };
  }
}

/**
 * A deep copy without own keys whose value is `undefined`. Stored history is
 * the JSON image of each event (ReplaySurfaceGate), so the live reducer keeps
 * `{ actorId: undefined }` where the replayed one has no key: the known R2
 * difference. That is the only tolerance; non-finite numbers, nulls and every
 * other value still compare strictly.
 */
export function withoutUndefinedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutUndefinedKeys);
  if (value instanceof Map) {
    return new Map(
      [...value.entries()].map(([k, v]) => [k, withoutUndefinedKeys(v)]),
    );
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) out[key] = withoutUndefinedKeys(entry);
    }
    return out;
  }
  return value;
}

export function describeBlocked(
  blocked: readonly {
    sequence: number | null;
    reason: string;
    eventType: string | null;
    message: string;
  }[],
): string {
  return `${blocked.length} event(s) blocked: ${blocked
    .slice(0, 3)
    .map(
      (event) =>
        `#${event.sequence} ${event.reason} ${event.eventType ?? '?'} (${event.message})`,
    )
    .join('; ')}`;
}

/** Path to the first difference between two values, for assert messages. */
export function firstDifference(
  a: unknown,
  b: unknown,
  at = 'state',
): string | null {
  if (isDeepStrictEqual(a, b)) return null;
  if (
    a === null ||
    b === null ||
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    Array.isArray(a) !== Array.isArray(b)
  ) {
    return `${at}: ${JSON.stringify(a)?.slice(0, 120)} vs ${JSON.stringify(b)?.slice(0, 120)}`;
  }
  if (a instanceof Map && b instanceof Map) {
    for (const key of new Set([...a.keys(), ...b.keys()])) {
      const diff = firstDifference(a.get(key), b.get(key), `${at}<${key}>`);
      if (diff) return diff;
    }
    return `${at}: Map differs`;
  }
  const keys = new Set([
    ...Object.keys(a as object),
    ...Object.keys(b as object),
  ]);
  for (const key of keys) {
    const ra = (a as Record<string, unknown>)[key];
    const rb = (b as Record<string, unknown>)[key];
    if (!(key in (a as object)) || !(key in (b as object))) {
      return `${at}.${key}: present on one side only`;
    }
    const diff = firstDifference(ra, rb, `${at}.${key}`);
    if (diff) return diff;
  }
  return `${at}: differs (prototype or symbol keys)`;
}

/**
 * Hard tracking checks, run at the end of every scenario:
 * 1. deriveState over the session's events deep-equals its current state;
 * 2. the recording, through the replay gate, folds to the same state
 *    (undefined-valued keys aside, see withoutUndefinedKeys).
 */
export function assertTracking(
  scenario: string,
  live: InteractiveSession,
): void {
  const session = live.getSession();
  const fold = deriveState(session.id, session.events);
  const foldDiff = firstDifference(fold, session.currentState);
  if (foldDiff) {
    throw new TrackingAssertError(
      scenario,
      'deriveState(events) != currentState',
      foldDiff,
    );
  }
  const gated = gateReplaySurfaceHistory(session.events, {
    surfaceId: 'cold-recovery',
    streamId: session.matchId ?? session.id,
    formatId: 'match-log-idb',
    formatVersion: 2,
  });
  if (gated.kind !== 'accepted') {
    throw new TrackingAssertError(
      scenario,
      'replay gate blocked the recording',
      describeBlocked(gated.blockedEvents),
    );
  }
  const replayed = hydrateGameSessionFromEvents(session.id, [
    ...gated.events,
  ]).currentState;
  const replayDiff = firstDifference(
    withoutUndefinedKeys(replayed),
    withoutUndefinedKeys(session.currentState),
  );
  if (replayDiff) {
    throw new TrackingAssertError(
      scenario,
      'gated replay fold != currentState',
      replayDiff,
    );
  }
}
