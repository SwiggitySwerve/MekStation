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
import type { IReplaySurfaceBlockedEvent } from '../../src/lib/events/replay/ReplaySurfaceGate';

import { adaptUnitFromData } from '../../src/engine/adapters/CompendiumAdapter';
import { GameEngine, InteractiveSession } from '../../src/engine/GameEngine';
import { createGridFromTerrainPreset } from '../../src/engine/GameEngine.helpers';
import {
  InteractiveSessionRecoveryCorruptError,
  hydrateRecoverableSessionWithReport,
} from '../../src/engine/InteractiveSession.persistence';
import { bindLegacyObjectEvent } from '../../src/lib/events/replay/ReplayLegacySourceAdapters';
import {
  REPLAY_SURFACE_REGISTRY,
  gateReplaySurfaceHistory,
} from '../../src/lib/events/replay/ReplaySurfaceGate';
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

/** The first event a tracking check fails on, as stored in the log. */
export interface IFailingEvent {
  readonly sequence: number | null;
  readonly id: string;
  readonly type: string;
}

/**
 * What a tracking failure points at: the first failing event, the field path
 * that differs (a payload path for a gate refusal, a state path for a fold
 * difference) and the values on each side.
 */
export interface ITrackingEvidence {
  readonly check: string;
  readonly detail: string;
  readonly firstEvent: IFailingEvent | null;
  readonly fieldPath: string | null;
  /** The live (in-memory) value at fieldPath, JSON-rendered; Infinity kept. */
  readonly liveValue?: string;
  /** The stored (JSON image) or replayed value at fieldPath. */
  readonly storedValue?: string;
  readonly blockedCount?: number;
}

export class TrackingAssertError extends Error {
  readonly evidence: ITrackingEvidence;
  constructor(scenario: string, evidence: ITrackingEvidence) {
    super(
      `TRACKING ASSERT FAILED [${scenario}] ${evidence.check}: ${evidence.detail}`,
    );
    this.name = 'TrackingAssertError';
    this.evidence = evidence;
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
): Promise<{
  live: InteractiveSession;
  gateRefusal: ITrackingEvidence | null;
}> {
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
    const check = 'cold recovery refused the played log';
    return {
      live: await recoverServerInteractiveSession(session),
      gateRefusal:
        blocked && blocked.length > 0
          ? blockedEvidence(check, prefix, blocked)
          : {
              check,
              detail: String(error.originalError ?? error.message),
              firstEvent: null,
              fieldPath: null,
            },
    };
  }
}

const GATE_FORMAT = { formatId: 'match-log-idb', formatVersion: 2 } as const;

function failingEvent(event: IGameEvent): IFailingEvent {
  return { sequence: event.sequence, id: event.id, type: event.type };
}

/** JSON rendering for evidence values; keeps Infinity/NaN and undefined visible. */
function renderValue(value: unknown): string {
  if (typeof value === 'number' && !Number.isFinite(value))
    return String(value);
  if (value === undefined) return 'undefined';
  return (JSON.stringify(value) ?? String(value)).slice(0, 160);
}

/** The rendered value at a path, or '(absent)' when a key on it is missing. */
function renderAt(root: unknown, segments: readonly PropertyKey[]): string {
  let value = root;
  for (const segment of segments) {
    if (value === null || typeof value !== 'object' || !(segment in value)) {
      return '(absent)';
    }
    value = (value as Record<PropertyKey, unknown>)[segment];
  }
  return renderValue(value);
}

function pathText(prefix: string, segments: readonly PropertyKey[]): string {
  return segments.reduce<string>(
    (text, segment) =>
      typeof segment === 'number'
        ? `${text}[${segment}]`
        : `${text}.${String(segment)}`,
    prefix,
  );
}

/**
 * Evidence for a gate refusal: the first blocked event, and the payload path
 * its schema rejects. The gate keeps only the message, so the event's JSON
 * image is bound and upcast again here to read the schema's first issue.
 */
function blockedEvidence(
  check: string,
  events: readonly IGameEvent[],
  blocked: readonly IReplaySurfaceBlockedEvent[],
): ITrackingEvidence {
  const first = blocked[0];
  const event = events[first.index];
  let fieldPath: string | null = null;
  let issue = first.message;
  let liveValue: string | undefined;
  let storedValue: string | undefined;
  try {
    const image = JSON.parse(JSON.stringify(event)) as unknown;
    const attributed = bindLegacyObjectEvent(
      GATE_FORMAT.formatId,
      GATE_FORMAT.formatVersion,
      image,
    );
    const envelope = attributed.payload as { payload: unknown };
    REPLAY_SURFACE_REGISTRY.upcast(
      event.type,
      attributed.schemaVersion,
      envelope.payload,
    );
  } catch (error) {
    const cause = (error as { cause?: unknown }).cause as
      | { issues?: { path: PropertyKey[]; message: string }[] }
      | undefined;
    const top = cause?.issues?.[0];
    if (top) {
      fieldPath = pathText('payload', top.path);
      issue = `${first.message}: ${top.message}`;
      liveValue = renderAt(event.payload, top.path);
      storedValue = renderAt(
        JSON.parse(JSON.stringify(event.payload)),
        top.path,
      );
    } else if (error instanceof Error) {
      issue = `${first.message}: ${error.message}`;
    }
  }
  return {
    check,
    detail: `${describeBlocked(blocked)}; first: #${event.sequence} ${event.type} id ${event.id}${fieldPath ? ` at ${fieldPath} (live ${liveValue}, stored ${storedValue})` : ''} - ${issue}`,
    firstEvent: failingEvent(event),
    fieldPath,
    liveValue,
    storedValue,
    blockedCount: blocked.length,
  };
}

/**
 * The first event after which the gated (JSON image) fold of the log stops
 * matching the raw fold, by bisection over prefixes. Assumes a difference,
 * once in, stays in, which holds for state the replay keeps.
 */
function firstReplayDivergence(
  id: string,
  events: readonly IGameEvent[],
  gated: readonly IGameEvent[],
): { event: IGameEvent; diff: IDifference } | null {
  const differs = (count: number): IDifference | null => {
    const replayed = hydrateGameSessionFromEvents(
      id,
      gated.slice(0, count),
    ).currentState;
    const raw = deriveState(id, events.slice(0, count));
    return findDifference(replayed, tolerateF3(replayed, raw).state);
  };
  if (!differs(events.length)) return null;
  let low = 1;
  let high = events.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (differs(mid)) high = mid;
    else low = mid + 1;
  }
  return { event: events[low - 1], diff: differs(low) as IDifference };
}

/** The one R2 difference the tracking asserts tolerate (F3), nowhere else. */
export const F3_TOLERATED_PATH = 'state.turnEvents[*].actorId';

/**
 * F3 (R2): stored history is the JSON image of each event (ReplaySurfaceGate),
 * so a live `turnEvents[i]` keeps `actorId: undefined` where the replayed
 * entry has no `actorId` key. Returns `live` with exactly those keys removed,
 * and how many. Any other undefined-vs-absent key (another field, another
 * path, or the reverse direction) is left in and fails the strict comparison.
 */
export function tolerateF3(
  replayed: unknown,
  live: unknown,
): { state: unknown; count: number } {
  const replayedEvents = (replayed as { turnEvents?: unknown } | null)
    ?.turnEvents;
  const liveEvents = (live as { turnEvents?: unknown } | null)?.turnEvents;
  if (!Array.isArray(replayedEvents) || !Array.isArray(liveEvents)) {
    return { state: live, count: 0 };
  }
  let count = 0;
  const turnEvents = liveEvents.map((entry: unknown, index) => {
    const other: unknown = replayedEvents[index];
    if (
      entry !== null &&
      typeof entry === 'object' &&
      Object.hasOwn(entry, 'actorId') &&
      (entry as { actorId?: unknown }).actorId === undefined &&
      other !== null &&
      typeof other === 'object' &&
      !Object.hasOwn(other, 'actorId')
    ) {
      count++;
      const copy: Record<string, unknown> = { ...entry };
      delete copy.actorId;
      return copy;
    }
    return entry;
  });
  return count === 0
    ? { state: live, count }
    : { state: { ...(live as object), turnEvents }, count };
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

export interface IDifference {
  readonly path: string;
  readonly left: string;
  readonly right: string;
}

/** The first difference between two values: its path and both sides. */
export function findDifference(
  a: unknown,
  b: unknown,
  at = 'state',
): IDifference | null {
  if (isDeepStrictEqual(a, b)) return null;
  if (
    a === null ||
    b === null ||
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    Array.isArray(a) !== Array.isArray(b)
  ) {
    return { path: at, left: renderValue(a), right: renderValue(b) };
  }
  if (a instanceof Map && b instanceof Map) {
    for (const key of new Set([...a.keys(), ...b.keys()])) {
      const diff = findDifference(a.get(key), b.get(key), `${at}<${key}>`);
      if (diff) return diff;
    }
    return { path: at, left: 'Map', right: 'Map (differs)' };
  }
  const keys = new Set([
    ...Object.keys(a as object),
    ...Object.keys(b as object),
  ]);
  for (const key of keys) {
    const ra = (a as Record<string, unknown>)[key];
    const rb = (b as Record<string, unknown>)[key];
    if (!(key in (a as object)) || !(key in (b as object))) {
      return {
        path: `${at}.${key}`,
        left: key in (a as object) ? renderValue(ra) : '(absent)',
        right: key in (b as object) ? renderValue(rb) : '(absent)',
      };
    }
    const diff = findDifference(ra, rb, `${at}.${key}`);
    if (diff) return diff;
  }
  return { path: at, left: '?', right: '? (prototype or symbol keys)' };
}

/** Path to the first difference between two values, for assert messages. */
export function firstDifference(
  a: unknown,
  b: unknown,
  at = 'state',
): string | null {
  const diff = findDifference(a, b, at);
  return diff ? `${diff.path}: ${diff.left} vs ${diff.right}` : null;
}

/**
 * Hard tracking checks, run at the end of every scenario:
 * 1. deriveState over the session's events deep-equals its current state;
 * 2. the recording, through the replay gate, folds to the same state
 *    (only F3 aside: see tolerateF3 and F3_TOLERATED_PATH).
 *
 * Each failure carries its evidence (first failing event, field path). On
 * success it returns the F3 count: keys check 2 tolerated at F3_TOLERATED_PATH.
 */
export function assertTracking(
  scenario: string,
  live: InteractiveSession,
): { count: number; paths: string[] } {
  const session = live.getSession();
  const fold = deriveState(session.id, session.events);
  const foldDiff = findDifference(fold, session.currentState);
  if (foldDiff) {
    // currentState is not a fold of any event prefix, so there is no
    // failing event to name: the state moved without its log.
    throw new TrackingAssertError(scenario, {
      check: 'deriveState(events) != currentState',
      detail: `${foldDiff.path}: ${foldDiff.left} vs ${foldDiff.right}`,
      firstEvent: null,
      fieldPath: foldDiff.path,
      liveValue: foldDiff.right,
      storedValue: foldDiff.left,
    });
  }
  return assertReplayFold(
    scenario,
    session.matchId ?? session.id,
    session.id,
    session.events,
    session.currentState,
    'gated replay fold != currentState',
  );
}

/**
 * Check 2 alone: the events, through the replay gate, fold to `state`.
 * The simulation runner, which has no live state, passes its raw fold.
 */
export function assertReplayFold(
  scenario: string,
  streamId: string,
  id: string,
  events: readonly IGameEvent[],
  state: unknown,
  check: string,
): { count: number; paths: string[] } {
  const gated = gateReplaySurfaceHistory(events, {
    surfaceId: 'cold-recovery',
    streamId,
    ...GATE_FORMAT,
  });
  if (gated.kind !== 'accepted') {
    throw new TrackingAssertError(
      scenario,
      blockedEvidence(
        'replay gate blocked the recording',
        events,
        gated.blockedEvents,
      ),
    );
  }
  const replayed = hydrateGameSessionFromEvents(id, [
    ...gated.events,
  ]).currentState;
  const tolerated = tolerateF3(replayed, state);
  const whole = findDifference(replayed, tolerated.state);
  if (whole) {
    const found = firstReplayDivergence(id, events, gated.events);
    const diff = found?.diff ?? whole;
    throw new TrackingAssertError(scenario, {
      check,
      detail: `${diff.path}: ${diff.left} vs ${diff.right}${found ? `; first diverges at #${found.event.sequence} ${found.event.type} id ${found.event.id}` : ''}`,
      firstEvent: found ? failingEvent(found.event) : null,
      fieldPath: diff.path,
      liveValue: diff.right,
      storedValue: diff.left,
    });
  }
  return {
    count: tolerated.count,
    paths: tolerated.count > 0 ? [F3_TOLERATED_PATH] : [],
  };
}
