/**
 * Measured actions for the engine harness. Every action calls the function
 * the app, the engine or the bots call; nothing here re-implements a rule.
 */

import type { InteractiveSession } from '../../src/engine/GameEngine';
import type { IGameEvent, IGameSession } from '../../src/types/gameplay';
import type { ICombatRangeHex, IWeaponStatus } from '../../src/types/gameplay';

import { gateReplaySurfaceHistory } from '../../src/lib/events/replay/ReplaySurfaceGate';
import { unitStateToToken } from '../../src/lib/gameplay/unitStateToToken';
import { SeededRandom } from '../../src/simulation/core';
import { setInteractiveSessionLogic } from '../../src/stores/useGameplayStore.session';
import { TerrainPreset } from '../../src/types/encounter';
import {
  GamePhase,
  GameSide,
  MovementType,
  type IUnitGameState,
} from '../../src/types/gameplay';
import { deriveCombatRangeHexes } from '../../src/utils/gameplay/combatProjection';
import { hydrateGameSessionFromEvents } from '../../src/utils/gameplay/gameSession';
import { appendEvent } from '../../src/utils/gameplay/gameSessionEvents';
import { hexDistance } from '../../src/utils/gameplay/hexMath';
import { gridWithUnitOccupants } from '../../src/utils/gameplay/movement';
import { findPath } from '../../src/utils/gameplay/movement/pathfinding';
import { deriveReachableHexes } from '../../src/utils/gameplay/movement/reachable';
import { getRangeBracket } from '../../src/utils/gameplay/range';
import {
  buildWeaponAttackAttackerToHitState,
  buildWeaponAttackTargetToHitState,
  calculateToHit,
} from '../../src/utils/gameplay/toHit';
import {
  collectGarbage,
  countCalls,
  heapUsed,
  nowMs,
  summarize,
  type ICallTarget,
  type IResultRow,
} from './engine-harness.measure';
import { gridFor } from './engine-harness.play';

export const CALL_TARGETS = {
  findPath: {
    label: 'findPath',
    functionName: 'findPath',
    urlIncludes: 'movement/pathfinding.ts',
  },
  rangeHexForDestination: {
    label: 'deriveMovementRangeHexForDestination',
    functionName: 'deriveMovementRangeHexForDestination',
    urlIncludes: 'movement/reachableDestination.ts',
  },
  calculateLOS: {
    label: 'calculateLOS',
    functionName: 'calculateLOS',
    urlIncludes: 'gameplay/lineOfSight.ts',
  },
  deriveCombatRangeHexes: {
    label: 'deriveCombatRangeHexes',
    functionName: 'deriveCombatRangeHexes',
    urlIncludes: 'gameplay/combatProjection.rangeHex.ts',
  },
  deriveState: {
    label: 'deriveState',
    functionName: 'deriveState',
    urlIncludes: 'gameState/gameStateReducer.ts',
  },
} satisfies Record<string, ICallTarget>;

/** Untimed calls before a micro benchmark, so JIT warm-up stays out of p95. */
const WARMUP_RUNS = 3;

export function stateBytes(session: IGameSession): number {
  return Buffer.byteLength(JSON.stringify(session.currentState));
}

interface ISampler {
  readonly samples: number[];
  readonly appends: number[];
  readonly extra: Record<string, number[]>;
}

function sampler(): ISampler {
  return { samples: [], appends: [], extra: {} };
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

/** Time one engine command; record its duration and how many events it appended. */
function timeCommand(
  live: InteractiveSession,
  into: ISampler,
  run: () => void,
): void {
  const before = live.getSession().events.length;
  const started = nowMs();
  run();
  into.samples.push(nowMs() - started);
  into.appends.push(live.getSession().events.length - before);
}

function liveUnits(live: InteractiveSession, side: GameSide) {
  const state = live.getState();
  return Object.entries(state.units)
    .filter(([, unit]) => unit.side === side && !unit.destroyed)
    .map(([id, unit]) => ({ id, unit }));
}

function nearestEnemy(
  live: InteractiveSession,
  unit: IUnitGameState,
): { id: string; unit: IUnitGameState; distance: number } | null {
  const enemySide =
    unit.side === GameSide.Player ? GameSide.Opponent : GameSide.Player;
  let best: { id: string; unit: IUnitGameState; distance: number } | null =
    null;
  for (const enemy of liveUnits(live, enemySide)) {
    const distance = hexDistance(unit.position, enemy.unit.position);
    if (
      !best ||
      distance < best.distance ||
      (distance === best.distance && enemy.id < best.id)
    ) {
      best = { id: enemy.id, unit: enemy.unit, distance };
    }
  }
  return best;
}

/** The record-sheet weapon list the play page derives for a session. */
function displayWeapons(
  live: InteractiveSession,
): Record<string, readonly IWeaponStatus[]> {
  let captured: Record<string, readonly IWeaponStatus[]> = {};
  setInteractiveSessionLogic(live, (partial) => {
    const next = partial as { unitWeapons?: typeof captured };
    if (next.unitWeapons) captured = next.unitWeapons;
  });
  return captured;
}

/** Whole-map combat projection for one attacker, as the map overlay builds it. */
function projectWholeMap(
  live: InteractiveSession,
  attackerId: string,
  targetId: string,
  weapons: readonly IWeaponStatus[],
): readonly ICombatRangeHex[] {
  const session = live.getSession();
  const grid = live.getGrid();
  const attackerSide = session.currentState.units[attackerId]?.side;
  const tokens = session.units
    .filter((unit) => session.currentState.units[unit.id])
    .map((unit) => {
      const state = session.currentState.units[unit.id];
      return unitStateToToken(
        unit.id,
        state,
        { name: unit.name, side: unit.side },
        {
          isSelected: unit.id === attackerId,
          isValidTarget: state.side !== attackerSide && !state.destroyed,
          isActiveTarget: unit.id === targetId,
        },
      );
    });
  const attacker = tokens.find((token) => token.unitId === attackerId) ?? null;
  return deriveCombatRangeHexes({
    attacker,
    targetUnitId: targetId,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens,
    weapons,
    combatState: session.currentState,
  });
}

export interface IScenarioContext {
  readonly scenario: string;
  readonly seed: number;
  readonly rows: IResultRow[];
  readonly countCallsEnabled: boolean;
  /**
   * Fire the first ten weapons at the nearest enemy whatever the projection
   * says. Off by default: the play page only commits projection-attackable
   * volleys. On, it reproduces the AttackDeclared history rewrite.
   */
  readonly uncheckedAttacks: boolean;
}

function pushRow(
  ctx: IScenarioContext,
  live: InteractiveSession,
  action: string,
  s: ISampler,
  heapDeltaBytes: number,
  unit: 'ms' | 'us' = 'ms',
  extraFixed: Record<string, number | string | boolean> = {},
): void {
  if (s.samples.length === 0) return;
  const extra: Record<string, number | string | boolean> = { ...extraFixed };
  if (s.appends.length > 0) {
    extra.appendsPerCommandP50 = median(s.appends);
    extra.appendsPerCommandMax = Math.max(...s.appends);
  }
  for (const [key, values] of Object.entries(s.extra)) {
    extra[`${key}P50`] = median(values);
  }
  ctx.rows.push(
    summarize(
      {
        scenario: ctx.scenario,
        action,
        unit,
        heapDeltaBytes,
        stateBytes: stateBytes(live.getSession()),
        eventCount: live.getSession().events.length,
        extra,
      },
      s.samples,
    ),
  );
}

/**
 * P1: append one real next event to a session holding `count` events.
 * `appendEvent` is pure, so every sample appends the same event to the same
 * session.
 */
export function measureAppend(
  ctx: IScenarioContext,
  live: InteractiveSession,
  nextEvent: IGameEvent | undefined,
  samples: number,
): void {
  if (!nextEvent) return;
  const session = live.getSession();
  const s = sampler();
  collectGarbage();
  const heapBefore = heapUsed();
  for (let i = 0; i < samples; i++) {
    const started = nowMs();
    appendEvent(session, nextEvent);
    s.samples.push(nowMs() - started);
  }
  collectGarbage();
  pushRow(ctx, live, 'append-one-event', s, heapUsed() - heapBefore);
}

/**
 * Replay load: the two steps cold recovery runs
 * (hydrateRecoverableSessionWithReport), timed apart so a history the gate
 * refuses still yields a fold time: gateReplaySurfaceHistory, then
 * hydrateGameSessionFromEvents.
 */
export function measureReplayLoad(
  ctx: IScenarioContext,
  live: InteractiveSession,
  events: readonly IGameEvent[],
  samples: number,
): void {
  const gate = sampler();
  const fold = sampler();
  const total = sampler();
  let accepted = true;
  collectGarbage();
  const heapBefore = heapUsed();
  for (let i = 0; i < samples; i++) {
    const started = nowMs();
    const gated = gateReplaySurfaceHistory(events, {
      surfaceId: 'cold-recovery',
      streamId: events[0].gameId,
      formatId: 'match-log-idb',
      formatVersion: 2,
    });
    const gatedAt = nowMs();
    accepted = gated.kind === 'accepted';
    hydrateGameSessionFromEvents(
      events[0].gameId,
      gated.kind === 'accepted' ? [...gated.events] : events,
    );
    const done = nowMs();
    gate.samples.push(gatedAt - started);
    fold.samples.push(done - gatedAt);
    total.samples.push(done - started);
  }
  collectGarbage();
  const heapDelta = heapUsed() - heapBefore;
  const extra = { replayedEvents: events.length, gateAccepted: accepted };
  pushRow(ctx, live, 'replay-gate', gate, heapDelta, 'ms', extra);
  pushRow(ctx, live, 'replay-fold', fold, heapDelta, 'ms', extra);
  pushRow(ctx, live, 'replay-load-gate-fold', total, heapDelta, 'ms', extra);
}

interface ITurnSamplers {
  readonly overlay: ISampler;
  readonly move: ISampler;
  readonly bot: ISampler;
  readonly advance: ISampler;
  readonly byPhase: Map<string, ISampler>;
  readonly projection: ISampler;
  readonly toHit: ISampler;
  readonly attack: ISampler;
  skippedAttacks: number;
}

/**
 * `turns` fully measured turns from a Movement-phase start, samples pooled
 * across turns into one row per action. Call counts run on the first turn
 * only. Leaves the session at the next Movement phase (or game over).
 */
export async function measureTurns(
  ctx: IScenarioContext,
  live: InteractiveSession,
  turns: number,
): Promise<void> {
  const t: ITurnSamplers = {
    overlay: sampler(),
    move: sampler(),
    bot: sampler(),
    advance: sampler(),
    byPhase: new Map(),
    projection: sampler(),
    toHit: sampler(),
    attack: sampler(),
    skippedAttacks: 0,
  };
  collectGarbage();
  const heapBefore = heapUsed();
  for (let turn = 0; turn < turns; turn++) {
    if (live.isGameOver()) break;
    await playMeasuredTurn(ctx, live, turn, t);
    startNextTurn(live);
  }
  collectGarbage();
  const heapDelta = heapUsed() - heapBefore;
  pushRow(ctx, live, 'reachable-overlay-scenario-units', t.overlay, heapDelta);
  pushRow(ctx, live, 'move-commit', t.move, heapDelta);
  pushRow(ctx, live, 'bot-move-decision', t.bot, heapDelta);
  pushRow(
    ctx,
    live,
    'los-whole-map-projection',
    t.projection,
    heapDelta,
    'ms',
    {
      mapHexes: live.getGrid().hexes.size,
    },
  );
  pushRow(ctx, live, 'to-hit', t.toHit, heapDelta, 'us');
  pushRow(ctx, live, 'weapon-attack', t.attack, heapDelta, 'ms', {
    skippedNotAttackable: t.skippedAttacks,
  });
  pushRow(ctx, live, 'phase-advance-any', t.advance, heapDelta);
  for (const [label, s] of t.byPhase) pushRow(ctx, live, label, s, heapDelta);
}

/**
 * One turn from a Movement-phase start: player commands timed per command,
 * opponent bot decisions timed per unit, every phase advance timed. Leaves
 * the session on the next Initiative phase.
 */
async function playMeasuredTurn(
  ctx: IScenarioContext,
  live: InteractiveSession,
  turnIndex: number,
  t: ITurnSamplers,
): Promise<void> {
  if (live.getState().phase !== GamePhase.Movement) {
    throw new Error(
      `[${ctx.scenario}] measured turn must start in Movement, got ${live.getState().phase}`,
    );
  }
  const random = new SeededRandom(ctx.seed + 7919 * (turnIndex + 1));
  const { overlay, move, bot, advance, byPhase, projection, toHit, attack } = t;
  const countThisTurn = ctx.countCallsEnabled && turnIndex === 0;
  const config = live.getSession().config;

  // --- Movement: player commits, opponent bot decisions ---
  for (const { id } of liveUnits(live, GameSide.Player)) {
    const unit = live.getState().units[id];
    const capability = live.getMovementCapability(id);
    if (!unit || !capability) continue;
    const movementGrid = gridWithUnitOccupants(
      live.getGrid(),
      live.getState().units,
    );
    const started = nowMs();
    const range = deriveReachableHexes(
      unit,
      MovementType.Walk,
      movementGrid,
      capability,
      'normal',
      {
        environmentalConditions: config.environmentalConditions,
        optionalRules: config.optionalRules,
      },
    );
    overlay.samples.push(nowMs() - started);
    const options = range.filter(
      (hex) =>
        hex.reachable &&
        hex.mpCost > 0 &&
        (hex.hex.q !== unit.position.q || hex.hex.r !== unit.position.r),
    );
    if (options.length === 0) continue;
    const choice = options[Math.floor(random.next() * options.length)];
    timeCommand(live, move, () =>
      live.applyMovement(
        id,
        choice.hex,
        unit.facing,
        MovementType.Walk,
        choice.path,
      ),
    );
  }
  const opponents = liveUnits(live, GameSide.Opponent);
  for (const [index, { id }] of opponents.entries()) {
    const countThisOne = countThisTurn && index === opponents.length - 1;
    if (countThisOne) {
      const before = live.getSession().events.length;
      const { counts } = await countCalls(
        [
          CALL_TARGETS.findPath,
          CALL_TARGETS.calculateLOS,
          CALL_TARGETS.deriveState,
        ],
        () => live.runAITurn(GameSide.Opponent, id),
      );
      ctx.rows.push(
        summarize(
          {
            scenario: ctx.scenario,
            action: 'bot-move-decision-calls',
            heapDeltaBytes: 0,
            stateBytes: stateBytes(live.getSession()),
            eventCount: live.getSession().events.length,
            extra: {
              ...counts,
              appends: live.getSession().events.length - before,
              note: 'call counts for one decision (untimed pass)',
            },
          },
          [],
        ),
      );
      continue;
    }
    timeCommand(live, bot, () => live.runAITurn(GameSide.Opponent, id));
  }
  const timeAdvance = (label: string): void => {
    const phaseSampler = byPhase.get(label) ?? sampler();
    byPhase.set(label, phaseSampler);
    const before = live.getSession().events.length;
    const started = nowMs();
    live.advancePhase();
    const elapsed = nowMs() - started;
    const appended = live.getSession().events.length - before;
    phaseSampler.samples.push(elapsed);
    phaseSampler.appends.push(appended);
    advance.samples.push(elapsed);
    advance.appends.push(appended);
  };
  timeAdvance('advance-from-movement');
  if (live.isGameOver()) return;

  // --- Weapon attack: projection, to-hit, player volleys, bot volleys ---
  const weaponsByUnit = displayWeapons(live);
  const players = liveUnits(live, GameSide.Player);
  for (const [index, { id, unit }] of players.entries()) {
    const target = nearestEnemy(live, unit);
    if (!target) continue;
    const weapons = weaponsByUnit[id] ?? [];
    if (index === 0 && countThisTurn) {
      const { counts } = await countCalls(
        [CALL_TARGETS.calculateLOS, CALL_TARGETS.deriveCombatRangeHexes],
        () => projectWholeMap(live, id, target.id, weapons),
      );
      ctx.rows.push(
        summarize(
          {
            scenario: ctx.scenario,
            action: 'los-projection-calls',
            heapDeltaBytes: 0,
            stateBytes: stateBytes(live.getSession()),
            eventCount: live.getSession().events.length,
            extra: {
              ...counts,
              mapHexes: live.getGrid().hexes.size,
              note: 'calls inside ONE whole-map projection; per-selection caller count needs the play page (phase 2)',
            },
          },
          [],
        ),
      );
    }
    const started = nowMs();
    const projected = projectWholeMap(live, id, target.id, weapons);
    projection.samples.push(nowMs() - started);
    const targetHex = projected.find(
      (hex) =>
        hex.hex.q === target.unit.position.q &&
        hex.hex.r === target.unit.position.r,
    );

    const gunnery =
      live.getSession().units.find((u) => u.id === id)?.gunnery ?? 4;
    const engineWeapons = live.getUnitWeapons(id);
    const primary = engineWeapons[0];
    const batch = 200;
    const toHitStarted = nowMs();
    for (let i = 0; i < batch; i++) {
      calculateToHit(
        buildWeaponAttackAttackerToHitState(
          unit,
          gunnery,
          primary ? { id: primary.id, name: primary.name } : undefined,
          target.id,
        ),
        buildWeaponAttackTargetToHitState(target.unit, false),
        getRangeBracket(target.distance),
        target.distance,
      );
    }
    toHit.samples.push(((nowMs() - toHitStarted) * 1000) / batch);

    // Commit only what the play page lets a player commit: a target the
    // projection marks attackable, with the weapons it marks available.
    const weaponIds = ctx.uncheckedAttacks
      ? engineWeapons
          .filter((weapon) => weapon.destroyed !== true)
          .map((weapon) => weapon.id)
          .slice(0, 10)
      : targetHex?.attackable &&
          targetHex.validTargetUnitIds.includes(target.id)
        ? targetHex.weaponRangeOptions
            .filter((option) => option.available)
            .map((option) => option.weaponId)
            .slice(0, 10)
        : [];
    if (weaponIds.length === 0) {
      t.skippedAttacks++;
      continue;
    }
    (attack.extra.weapons ??= []).push(weaponIds.length);
    (attack.extra.rangeHexes ??= []).push(target.distance);
    timeCommand(live, attack, () => live.applyAttack(id, target.id, weaponIds));
  }
  live.runAITurn(GameSide.Opponent);
  timeAdvance('advance-from-weapon-attack');
  if (live.isGameOver()) return;

  // --- Physical, heat, end (PSR drain), initiative ---
  if (live.getState().phase === GamePhase.PhysicalAttack) {
    live.runAITurn(GameSide.Player);
    live.runAITurn(GameSide.Opponent);
    timeAdvance('advance-from-physical-attack');
  }
  if (live.getState().phase === GamePhase.Heat && !live.isGameOver()) {
    timeAdvance('heat-phase');
  }
  if (live.getState().phase === GamePhase.End && !live.isGameOver()) {
    const pendingPsrs = Object.values(live.getState().units).reduce(
      (sum, unit) => sum + (unit.pendingPSRs?.length ?? 0),
      0,
    );
    const psrSampler = byPhase.get('psr-end-phase') ?? sampler();
    (psrSampler.extra.pendingPsrs ??= []).push(pendingPsrs);
    byPhase.set('psr-end-phase', psrSampler);
    timeAdvance('psr-end-phase');
  }
}

/** Move the session from Initiative into the next Movement phase. */
export function startNextTurn(live: InteractiveSession): void {
  if (live.getState().phase === GamePhase.Initiative && !live.isGameOver()) {
    live.advancePhase();
  }
}

/** P3: reachable-hex overlay on a 32×34-equivalent map, walk 4 and 8. */
export async function measureReachableMicro(
  rows: IResultRow[],
  template: IUnitGameState,
  radius: number,
  samples: number,
  countCallsEnabled: boolean,
): Promise<void> {
  for (const terrain of [TerrainPreset.Clear, TerrainPreset.HeavyWoods]) {
    const grid = gridFor(radius, terrain);
    const unit: IUnitGameState = {
      ...template,
      position: { q: 0, r: 0 },
      heat: 0,
    };
    const movementGrid = gridWithUnitOccupants(grid, { [unit.id]: unit });
    for (const walkMP of [4, 8]) {
      const capability = {
        walkMP,
        runMP: Math.ceil(walkMP * 1.5),
        jumpMP: 0,
      };
      const run = () =>
        deriveReachableHexes(unit, MovementType.Walk, movementGrid, capability);
      for (let i = 0; i < WARMUP_RUNS; i++) run();
      const times: number[] = [];
      collectGarbage();
      const heapBefore = heapUsed();
      let reachable = 0;
      for (let i = 0; i < samples; i++) {
        const started = nowMs();
        reachable = run().filter((hex) => hex.reachable).length;
        times.push(nowMs() - started);
      }
      collectGarbage();
      const extra: Record<string, number | string | boolean> = {
        walkMP,
        reachableHexes: reachable,
        mapHexes: grid.hexes.size,
      };
      if (countCallsEnabled) {
        const { counts } = await countCalls(
          [CALL_TARGETS.findPath, CALL_TARGETS.rangeHexForDestination],
          run,
        );
        Object.assign(extra, counts);
      }
      rows.push(
        summarize(
          {
            scenario: `micro-r${radius}-${terrain}`,
            action: `reachable-overlay-walk${walkMP}`,
            heapDeltaBytes: heapUsed() - heapBefore,
            stateBytes: 0,
            eventCount: 0,
            extra,
          },
          times,
        ),
      );
    }
  }
}

/** P4: single A* path of length 5, 15 and 30 hexes. */
export function measurePathMicro(
  rows: IResultRow[],
  radius: number,
  samples: number,
): void {
  for (const terrain of [TerrainPreset.Clear, TerrainPreset.HeavyWoods]) {
    const grid = gridFor(radius, terrain);
    for (const length of [5, 15, 30]) {
      const start = { q: -15, r: 0 };
      const end = { q: -15 + length, r: 0 };
      for (let i = 0; i < WARMUP_RUNS; i++) findPath(grid, start, end);
      const times: number[] = [];
      let pathLength = 0;
      collectGarbage();
      const heapBefore = heapUsed();
      for (let i = 0; i < samples; i++) {
        const started = nowMs();
        pathLength = findPath(grid, start, end)?.length ?? 0;
        times.push(nowMs() - started);
      }
      collectGarbage();
      rows.push(
        summarize(
          {
            scenario: `micro-r${radius}-${terrain}`,
            action: `single-path-length${length}`,
            heapDeltaBytes: heapUsed() - heapBefore,
            stateBytes: 0,
            eventCount: 0,
            extra: { pathHexes: pathLength },
          },
          times,
        ),
      );
    }
  }
}
