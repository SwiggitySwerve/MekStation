/**
 * Engine performance harness (DATA-ENGINE-REVIEW §5).
 *
 *   node --expose-gc --import tsx scripts/perf/engine-harness.ts --quick
 *   node --expose-gc --import tsx scripts/perf/engine-harness.ts --full --out=engine.json
 *   npm run perf:engine -- --full --check=scripts/perf/engine-harness.thresholds.json
 *
 * Builds every scenario on the production path (catalog units, Compendium
 * adapter, GameCreated, InteractiveSession), plays the prior log with the
 * bots, reloads it through cold recovery and times what a player runs. It
 * gates on SHAPE (ratios across the grid), never on milliseconds, heap or
 * state size (AGENTS.md invariant 6): heap delta and state bytes are reported
 * only. Tracking asserts run at the end of every scenario and fail the run.
 *
 * Exit codes: 0 ok; 1 a --check ratio failed; 2 a tracking assert failed;
 * 3 bad arguments or a harness error.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { UnitHydrationMap } from '../../src/simulation/runner/SimulationRunnerState';
import type { IGameEvent } from '../../src/types/gameplay';

import { getNodeCanonicalUnitService } from '../../src/services/units/NodeCanonicalUnitService';
import { SimulationRunner } from '../../src/simulation/runner/SimulationRunner';
import {
  buildWeaponLookupFromCatalogFiles,
  hydrateAIWeaponsFromFullUnit,
} from '../../src/simulation/runner/UnitHydration';
import { TerrainPreset } from '../../src/types/encounter';
import { GameSide } from '../../src/types/gameplay';
import { WEAPON_CATALOG_FILES } from '../../src/utils/construction/equipmentBVCatalogData';
import { deriveState } from '../../src/utils/gameplay/gameState';
import {
  measureAppend,
  measurePathMicro,
  measureReachableMicro,
  measureReplayLoad,
  measureTurns,
  stateBytes,
  type IScenarioContext,
} from './engine-harness.actions';
import {
  collectGarbage,
  heapUsed,
  nowMs,
  startCpuProfile,
  stopCpuProfile,
  summarize,
  type IResultRow,
  type ISelfFrame,
} from './engine-harness.measure';
import {
  TrackingAssertError,
  assertReplayFold,
  assertTracking,
  createLiveSession,
  defaultCacheDir,
  loadUnitPool,
  obtainPriorLog,
  pickUnits,
  recoverAt,
  type IFailingEvent,
  type IPlayConfig,
  type IUnitPick,
} from './engine-harness.play';

type Mode = 'quick' | 'full';

interface IArgs {
  readonly mode: Mode;
  readonly out: string | null;
  readonly check: string | null;
  readonly cpuProf: boolean;
  readonly cacheDir: string | null;
  readonly freshLogs: boolean;
  readonly seed: number;
  readonly callCounts: boolean;
  readonly allConfigurations: boolean;
  readonly uncheckedAttacks: boolean;
  /** Run only this scenario (a repro command); null runs the whole plan. */
  readonly scenario: string | null;
}

const DEFAULT_SEED = 20261118;

/**
 * Minimum samples on EACH side of a gated ratio. --check gates on p50, and
 * with n = 30 the distribution-free 95% confidence interval for the median
 * runs from the 10th to the 21st order statistic, i.e. inside the middle
 * third of the sample; at n = 10 it spans the 2nd to the 9th (nearly all of
 * it). Below this a check is INSUFFICIENT, and INSUFFICIENT fails --check.
 */
const MIN_SAMPLES = 30;

/** Repetitions of each repeated command row (`*-repeat`): MIN_SAMPLES. */
const COMMAND_REPEATS = MIN_SAMPLES;

/**
 * One tracking failure, with everything needed to turn it into a failing
 * test: seed, scenario, checkpoint, first failing event, field path, and
 * the command that runs that one scenario again.
 */
interface IFinding {
  readonly scenario: string;
  /** --seed of the run; the game seed below is derived from it. */
  readonly baseSeed: number;
  readonly gameSeed: number;
  /** Target and actual event count of the checkpoint; null for the runner. */
  readonly checkpoint: {
    readonly target: number;
    readonly events: number;
  } | null;
  /**
   * Where the prior log came from. A cached log is the JSON image of the
   * played one, so its in-memory ("live") event values are already imaged.
   */
  readonly logSource: 'played' | 'cache' | 'runner';
  readonly check: string;
  readonly firstEvent: IFailingEvent | null;
  readonly fieldPath: string | null;
  readonly liveValue?: string;
  readonly storedValue?: string;
  readonly blockedCount?: number;
  readonly repro: string;
  readonly detail: string;
}

interface IFindingContext {
  readonly scenario: string;
  /** Overrides the default repro command (e.g. the played-log check). */
  readonly repro?: string;
  readonly gameSeed: number;
  readonly checkpoint: IFinding['checkpoint'];
  readonly logSource: IFinding['logSource'];
}

interface IRunMeta {
  commit: string;
  logs: unknown[];
  trimmed: string[];
  trackingFailures: string[];
  findings: IFinding[];
  /** F3: undefined-valued keys the replay comparison tolerated, per scenario. */
  toleratedUndefinedKeys: Record<string, { count: number; paths: string[] }>;
  warnings: string[];
}

/** Board sizes from §5 mapped to hex-radius maps of about the same hex count. */
const MAP_RADIUS = { '16x17': 9, '32x34': 19, '48x51': 28 } as const;

const NOT_COVERED: readonly { item: string; reason: string }[] = [
  {
    item: 'P2 play-page React commits per event and per hover',
    reason: 'needs a browser; phase 2 of §5, out of scope here',
  },
  {
    item: 'P5 LOS projections per selection (four UI callers)',
    reason:
      'the four callers are React hooks on the play page; the harness counts calculateLOS calls inside ONE whole-map projection instead (phase 2)',
  },
  {
    item: 'P7 occupancy clone per event on the play page',
    reason:
      'the per-event clone is driven by a React effect (GameSessionPage.movement.ts); the harness calls gridWithUnitOccupants once per overlay, as the helper does',
  },
  {
    item: 'P9 fog-of-war join replay at 10,000 events',
    reason:
      'production refuses fog joins (B14: matchLacksRevealProjection in fogMatchAdmission.ts); the per-viewer filter loop in ServerMatchHostReplay.getReplayEventsForPlayer is private and only reachable when tests jest.mock the admission gate',
  },
  {
    item: 'Hosted intent to broadcast, 4 sockets, 5,000 events',
    reason:
      'not in this task; needs ServerMatchHost with a match store and sockets (candidate for a follow-up)',
  },
  {
    item: 'P10 campaign day at 12/48/120 units and 30-day advance',
    reason:
      'the only production day path is useCampaignStore.advanceDay, which saves through the campaign persistence layer (HTTP API plus browser storage); the headless fast-forward driver runs only under jest/jsdom with the in-process SQLite API router. A plain Node script would need a localStorage shim and that router, a parallel environment this harness does not build',
  },
  {
    item: 'P11 checkpoint recovery (MatchRecovery / AuthorityRecoveryPort)',
    reason:
      'not in this task; the cold-recovery gate plus fold is measured as replay load',
  },
];

function printHelp(): void {
  console.log(`
MekStation engine performance harness

Usage: node --expose-gc --import tsx scripts/perf/engine-harness.ts [options]

  --quick              Small subset (default)
  --full               Full grid (warm log cache: under 5 minutes)
  --out=PATH           Write the JSON report to PATH
  --check=PATH         Fail (exit 1) when a p50 ratio exceeds its threshold, or
                       has fewer than ${MIN_SAMPLES} samples on a side (INSUFFICIENT)
  --cpu-prof           Add the top-10 self-time frames (and a .cpuprofile next to --out)
  --cache-dir=DIR      Prior-log cache (default ${defaultCacheDir()})
  --no-cache           Play every prior log now (10,000 events takes about 11 minutes)
  --fresh-logs         Replay and overwrite cached logs
  --seed=N             Base seed (default 20261118)
  --no-call-counts     Skip the V8 precise-coverage call-count pass
  --all-configurations Pick quad, tripod and LAM BattleMechs too (default: Biped;
                       quads currently fail the replay gate, see the report)
  --unchecked-attacks  Fire ten weapons at the nearest enemy even when the
                       projection says no (reproduces the AttackDeclared rewrite)
  --scenario=NAME      Run only NAME (e.g. u24-32x34-e5000, sim-4v4-32x34-20turns);
                       each tracking finding prints the command with this set
  --help, -h           Show this help
`);
}

function parseArgs(argv = process.argv.slice(2)): IArgs {
  let mode: Mode = 'quick';
  let out: string | null = null;
  let check: string | null = null;
  let cpuProf = false;
  let cacheDir: string | null = defaultCacheDir();
  let freshLogs = false;
  let seed = DEFAULT_SEED;
  let callCounts = true;
  let allConfigurations = false;
  let uncheckedAttacks = false;
  let scenario: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const [flag, inline] = arg.includes('=')
      ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)]
      : [arg, undefined];
    const value = (): string => {
      const next = inline ?? argv[++i];
      if (next === undefined) throw new Error(`${flag} needs a value`);
      return next;
    };
    switch (flag) {
      case '--quick':
        mode = 'quick';
        break;
      case '--full':
        mode = 'full';
        break;
      case '--out':
        out = value();
        break;
      case '--check':
        check = value();
        break;
      case '--cpu-prof':
        cpuProf = true;
        break;
      case '--cache-dir':
        cacheDir = value();
        break;
      case '--no-cache':
        cacheDir = null;
        break;
      case '--fresh-logs':
        freshLogs = true;
        break;
      case '--seed':
        seed = Number.parseInt(value(), 10);
        if (!Number.isSafeInteger(seed))
          throw new Error('--seed must be an integer');
        break;
      case '--no-call-counts':
        callCounts = false;
        break;
      case '--all-configurations':
        allConfigurations = true;
        break;
      case '--unchecked-attacks':
        uncheckedAttacks = true;
        break;
      case '--scenario':
        scenario = value();
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return {
    mode,
    out,
    check,
    cpuProf,
    cacheDir,
    freshLogs,
    seed,
    callCounts,
    allConfigurations,
    uncheckedAttacks,
    scenario,
  };
}

interface ILogPlan {
  readonly units: number;
  readonly mapKey: keyof typeof MAP_RADIUS;
  readonly checkpoints: readonly number[];
  readonly measuredTurns: number;
  readonly appendSamples: number;
  readonly replaySamples: number;
}

interface IPlan {
  readonly logs: readonly ILogPlan[];
  readonly microSamples: number;
  readonly simulations: readonly { perSide: number; runs: number }[];
  readonly trimmed: readonly string[];
}

function planFor(mode: Mode): IPlan {
  if (mode === 'quick') {
    return {
      logs: [
        {
          units: 8,
          mapKey: '32x34',
          checkpoints: [500],
          measuredTurns: 1,
          appendSamples: MIN_SAMPLES,
          replaySamples: 3,
        },
        {
          units: 24,
          mapKey: '32x34',
          checkpoints: [500, 2000],
          measuredTurns: 1,
          appendSamples: MIN_SAMPLES,
          // The replay ratio is gated on this log only.
          replaySamples: MIN_SAMPLES,
        },
      ],
      microSamples: MIN_SAMPLES,
      simulations: [{ perSide: 4, runs: 1 }],
      trimmed: [
        'quick: units 4/48, maps 16x17/48x51, events 5,000/10,000, 12v12 runner',
      ],
    };
  }
  return {
    logs: [
      // Units axis at 32x34, 500 events (24 units comes from the events axis).
      {
        units: 4,
        mapKey: '32x34',
        checkpoints: [500],
        measuredTurns: 2,
        appendSamples: MIN_SAMPLES,
        replaySamples: 3,
      },
      {
        units: 8,
        mapKey: '32x34',
        checkpoints: [500],
        measuredTurns: 2,
        appendSamples: MIN_SAMPLES,
        replaySamples: 3,
      },
      {
        units: 48,
        mapKey: '32x34',
        checkpoints: [500],
        measuredTurns: 1,
        appendSamples: MIN_SAMPLES,
        replaySamples: 3,
      },
      // Map axis at 8 units, 500 events.
      {
        units: 8,
        mapKey: '16x17',
        checkpoints: [500],
        measuredTurns: 2,
        appendSamples: MIN_SAMPLES,
        replaySamples: 3,
      },
      {
        units: 8,
        mapKey: '48x51',
        checkpoints: [500],
        measuredTurns: 2,
        appendSamples: MIN_SAMPLES,
        replaySamples: 3,
      },
      // Events axis: one 24-unit game, measured at each checkpoint.
      {
        units: 24,
        mapKey: '32x34',
        checkpoints: [500, 2000, 5000, 10000],
        measuredTurns: 1,
        appendSamples: MIN_SAMPLES,
        // The replay ratio is gated on this log only.
        replaySamples: MIN_SAMPLES,
      },
    ],
    microSamples: MIN_SAMPLES,
    simulations: [
      { perSide: 4, runs: 2 },
      { perSide: 12, runs: 1 },
    ],
    trimmed: [
      'grid is axes through a centre point (24 units, 32x34, 500 events), not the full 4x3x4 cross product',
      'events axis only at 24 units on 32x34; units and map axes only at 500 events',
      '48 units measured for one turn (bot decisions dominate)',
    ],
  };
}

/** The command that runs one scenario again with this run's settings. */
function reproCommand(args: IArgs, scenario: string): string {
  const parts = ['npm run perf:engine --', `--${args.mode}`];
  if (args.seed !== DEFAULT_SEED) parts.push(`--seed=${args.seed}`);
  if (args.allConfigurations) parts.push('--all-configurations');
  if (args.uncheckedAttacks) parts.push('--unchecked-attacks');
  if (!args.callCounts) parts.push('--no-call-counts');
  if (args.cacheDir === null) parts.push('--no-cache');
  else if (args.cacheDir !== defaultCacheDir())
    parts.push(`--cache-dir=${args.cacheDir}`);
  parts.push(`--scenario=${scenario}`);
  return parts.join(' ');
}

/** Record a tracking failure as a string (report) and as a finding. */
function recordFinding(
  args: IArgs,
  ctx: IFindingContext,
  error: TrackingAssertError,
  meta: IRunMeta,
): void {
  const evidence = error.evidence;
  meta.trackingFailures.push(error.message);
  meta.findings.push({
    scenario: ctx.scenario,
    baseSeed: args.seed,
    gameSeed: ctx.gameSeed,
    checkpoint: ctx.checkpoint,
    logSource: ctx.logSource,
    check: evidence.check,
    firstEvent: evidence.firstEvent,
    fieldPath: evidence.fieldPath,
    ...(evidence.liveValue !== undefined
      ? { liveValue: evidence.liveValue }
      : {}),
    ...(evidence.storedValue !== undefined
      ? { storedValue: evidence.storedValue }
      : {}),
    ...(evidence.blockedCount !== undefined
      ? { blockedCount: evidence.blockedCount }
      : {}),
    repro: ctx.repro ?? reproCommand(args, ctx.scenario),
    detail: evidence.detail,
  });
  console.error(`  ${error.message}`);
}

/**
 * Run a scenario's tracking asserts. A failure is recorded and the run goes
 * on, so one report lists every failing scenario; main() then exits 2.
 */
function trackScenario(
  args: IArgs,
  ctx: IFindingContext,
  check: () => { count: number; paths: string[] },
  meta: IRunMeta,
): 'OK' | 'FAILED' {
  try {
    meta.toleratedUndefinedKeys[ctx.scenario] = check();
    return 'OK';
  } catch (error) {
    if (!(error instanceof TrackingAssertError)) throw error;
    recordFinding(args, ctx, error, meta);
    return 'FAILED';
  }
}

/**
 * The findings block: one entry per distinct defect (event type and field
 * path, or check and field path when no event is named), first scenario
 * first, with the command that reproduces it.
 */
function printFindings(findings: readonly IFinding[]): void {
  const groups = new Map<string, IFinding[]>();
  for (const finding of findings) {
    const key = finding.firstEvent
      ? `${finding.firstEvent.type} ${finding.fieldPath ?? '?'}`
      : `${finding.check} ${finding.fieldPath ?? '?'}`;
    groups.set(key, [...(groups.get(key) ?? []), finding]);
  }
  console.error(
    `\nFINDINGS (${groups.size} distinct, ${findings.length} failures):`,
  );
  let n = 0;
  for (const group of groups.values()) {
    const f = group[0];
    const event = f.firstEvent
      ? `#${f.firstEvent.sequence} id ${f.firstEvent.id} type ${f.firstEvent.type}`
      : 'none (no event prefix reproduces it; see check)';
    console.error(
      [
        `  [${++n}] ${f.check}`,
        `      seed        ${f.gameSeed} (--seed ${f.baseSeed})`,
        `      scenario    ${f.scenario}`,
        `      checkpoint  ${f.checkpoint ? `target ${f.checkpoint.target}, at ${f.checkpoint.events} events` : 'n/a (runner game)'}, log ${f.logSource}`,
        `      first event ${event}`,
        `      field path  ${f.fieldPath ?? '?'}${f.liveValue !== undefined ? ` (live ${f.liveValue}, stored ${f.storedValue})` : ''}`,
        ...(f.blockedCount !== undefined
          ? [`      blocked     ${f.blockedCount} event(s)`]
          : []),
        `      repro       ${f.repro}`,
        ...(group.length > 1
          ? [
              `      also in     ${group
                .slice(1)
                .map((other) => `${other.scenario} (${other.check})`)
                .join('; ')}`,
            ]
          : []),
      ].join('\n'),
    );
  }
}

function configurationsFor(args: IArgs): ReadonlySet<string> | null {
  return args.allConfigurations ? null : new Set(['Biped']);
}

function scenarioName(units: number, mapKey: string, events: number): string {
  return `u${units}-${mapKey}-e${events}`;
}

function gitHead(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function freeMemGb(): number {
  return Math.round((os.freemem() / 1024 ** 3) * 10) / 10;
}

/** Logs whose largest checkpoint reaches this many events are cached. */
const CACHE_MIN_EVENTS = 2001;

async function runLog(
  args: IArgs,
  plan: ILogPlan,
  pool: readonly IUnitPick[],
  rows: IResultRow[],
  meta: IRunMeta,
): Promise<void> {
  const radius = MAP_RADIUS[plan.mapKey];
  const wanted = plan.checkpoints.filter(
    (target) =>
      args.scenario === null ||
      args.scenario === scenarioName(plan.units, plan.mapKey, target),
  );
  if (wanted.length === 0) return;
  const seed = args.seed + plan.units * 101 + radius;
  const config: IPlayConfig = {
    label: `u${plan.units}-${plan.mapKey}`,
    seed,
    units: pickUnits(pool, plan.units, seed, configurationsFor(args)),
    mapRadius: radius,
    terrain: TerrainPreset.LightWoods,
    checkpoints: plan.checkpoints,
  };
  const log = obtainPriorLog(config, {
    cacheDir: args.cacheDir,
    cacheMinEvents: CACHE_MIN_EVENTS,
    fresh: args.freshLogs,
    commit: meta.commit,
    maxTurns: 400,
  });
  const staleCache = log.builtAtCommit !== meta.commit;
  meta.logs.push({
    label: config.label,
    seed,
    source: log.source,
    buildMs: log.buildMs,
    turns: log.turns,
    events: log.events.length,
    checkpoints: Object.fromEntries(log.checkpoints),
    unreached: log.unreached,
    builtAtCommit: log.builtAtCommit,
    staleCache,
    liveStateCheck:
      typeof log.liveStateCheck === 'string' ? log.liveStateCheck : 'FAILED',
  });
  if (staleCache) {
    const warning = `WARNING: log ${config.label} was played at ${log.builtAtCommit} but HEAD is ${meta.commit}; HEAD may play different events. Re-play it with --fresh-logs.`;
    meta.warnings.push(warning);
    console.warn(`  ${warning}`);
  }
  for (const target of log.unreached) {
    meta.trimmed.push(
      `${config.label}: ${target} events unreached (game ended at ${log.events.length})`,
    );
  }
  console.log(
    `  log ${config.label}: ${log.events.length} events, ${log.source}, ${log.buildMs} ms`,
  );
  if (log.liveStateCheck === 'ok') {
    console.log(
      `  log ${config.label}: live-state check OK over ${log.events.length} played events`,
    );
  } else if (log.liveStateCheck === 'skipped: cached log') {
    console.log(`  log ${config.label}: live-state check skipped: cached log`);
  } else {
    const label = `${config.label}-played`;
    const cacheable = log.events.length >= CACHE_MIN_EVENTS;
    recordFinding(
      args,
      {
        scenario: label,
        gameSeed: seed,
        checkpoint: {
          target: plan.checkpoints[plan.checkpoints.length - 1],
          events: log.events.length,
        },
        logSource: 'played',
        repro:
          reproCommand(args, scenarioName(plan.units, plan.mapKey, wanted[0])) +
          (cacheable && !args.freshLogs ? ' --fresh-logs' : ''),
      },
      new TrackingAssertError(label, log.liveStateCheck),
      meta,
    );
  }
  for (const target of wanted) {
    const count = log.checkpoints.get(target);
    if (count === undefined) continue;
    const scenario = scenarioName(plan.units, plan.mapKey, target);
    const findingCtx: IFindingContext = {
      scenario,
      gameSeed: seed,
      checkpoint: { target, events: count },
      logSource: log.source,
    };
    const started = nowMs();
    const { live, fork, gateRefusal } = await recoverAt(log, count);
    const recoverMs = nowMs() - started;
    const ctx: IScenarioContext = {
      scenario,
      seed,
      rows,
      countCallsEnabled: args.callCounts,
      uncheckedAttacks: args.uncheckedAttacks,
      repeats: COMMAND_REPEATS,
      fork,
    };
    if (gateRefusal) {
      recordFinding(
        args,
        findingCtx,
        new TrackingAssertError(scenario, gateRefusal),
        meta,
      );
    }
    measureAppend(ctx, live, log.events[count], plan.appendSamples);
    measureReplayLoad(
      ctx,
      live,
      log.events.slice(0, count),
      plan.replaySamples,
    );
    await measureTurns(ctx, live, plan.measuredTurns);
    const tracking = trackScenario(
      args,
      findingCtx,
      () => assertTracking(scenario, live),
      meta,
    );
    console.log(
      `  ${scenario}: checkpoint at ${count} events, recover ${Math.round(recoverMs)} ms, now ${live.getSession().events.length} events, state ${stateBytes(live.getSession())} B, tracking ${tracking}`,
    );
  }
}

async function runSimulations(
  args: IArgs,
  plan: IPlan,
  pool: readonly IUnitPick[],
  rows: IResultRow[],
  meta: IRunMeta,
): Promise<void> {
  const catalog = getNodeCanonicalUnitService();
  const weaponLookup = buildWeaponLookupFromCatalogFiles(
    WEAPON_CATALOG_FILES as readonly { items?: readonly unknown[] }[],
  );
  for (const { perSide, runs } of plan.simulations) {
    const scenario = `sim-${perSide}v${perSide}-32x34-20turns`;
    if (args.scenario !== null && args.scenario !== scenario) continue;
    const seed = args.seed + 5000 + perSide;
    const picks = pickUnits(pool, perSide * 2, seed, configurationsFor(args));
    // The hydration map the swarm CLI builds (buildSwarmHydration in
    // scripts/run-simulation-swarm.ts): runner ids player-N / opponent-N,
    // catalog unit, AI weapons from the catalog lookup. Not imported because
    // that file is outside the scripts typecheck and fails it today.
    const hydration: UnitHydrationMap = new Map(
      picks.map((pick, index) => {
        const side = index < perSide ? GameSide.Player : GameSide.Opponent;
        const runnerUnitId = `${side === GameSide.Player ? 'player' : 'opponent'}-${(index % perSide) + 1}`;
        const fullUnit = catalog.getByIdSync(pick.id);
        if (!fullUnit) throw new Error(`Catalog miss for ${pick.id}`);
        return [
          runnerUnitId,
          {
            runnerUnitId,
            side,
            position: { q: 0, r: 0 },
            fullUnit,
            aiWeapons: hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup),
            gunnery: 4,
            piloting: 5,
          },
        ];
      }),
    );
    const times: number[] = [];
    let events = 0;
    let turns = 0;
    let lastEvents: readonly IGameEvent[] = [];
    collectGarbage();
    const heapBefore = heapUsed();
    for (let run = 0; run < runs; run++) {
      const runner = new SimulationRunner(
        seed,
        undefined,
        undefined,
        undefined,
        undefined,
        hydration,
      );
      const started = nowMs();
      const result = runner.run({
        seed,
        turnLimit: 20,
        unitCount: { player: perSide, opponent: perSide },
        mapRadius: MAP_RADIUS['32x34'],
      });
      times.push(nowMs() - started);
      events = result.events.length;
      turns = result.turns;
      lastEvents = result.events;
    }
    collectGarbage();
    const gameId = lastEvents[0]?.gameId ?? scenario;
    const fold = deriveState(gameId, lastEvents);
    const tracking = trackScenario(
      args,
      { scenario, gameSeed: seed, checkpoint: null, logSource: 'runner' },
      () =>
        assertReplayFold(
          scenario,
          gameId,
          gameId,
          lastEvents,
          fold,
          'gated replay fold != raw fold',
        ),
      meta,
    );
    rows.push(
      summarize(
        {
          scenario,
          action: 'simulation-runner-game',
          heapDeltaBytes: heapUsed() - heapBefore,
          stateBytes: Buffer.byteLength(JSON.stringify(fold)),
          eventCount: events,
          extra: { turns, unitsPerSide: perSide },
        },
        times,
      ),
    );
    console.log(
      `  ${scenario}: ${events} events, ${turns} turns, ${Math.round(times[0])} ms, tracking ${tracking}`,
    );
  }
}

interface IRatio {
  readonly name: string;
  readonly items: string;
  readonly numerator: { scenario: string; action: string };
  readonly denominator: { scenario: string; action: string };
  /**
   * What the ratio would be if cost grew linearly with the axis; 'events'
   * means the ratio of the two rows' event counts at sample time.
   */
  readonly linear: number | 'events' | null;
}

/**
 * Every ratio is p50 over p50. Command ratios use the `*-repeat` rows: one
 * command repeated on forks of one session state, so both sides have
 * COMMAND_REPEATS samples. The pooled phase-advance and runner ratios are
 * reported but not gated (see the thresholds file).
 */
function ratioDefinitions(mode: Mode): IRatio[] {
  const hi = mode === 'full' ? 10000 : 2000;
  const lo = mode === 'full' ? 2000 : 500;
  const ev = (events: number) => scenarioName(24, '32x34', events);
  const r = (
    name: string,
    items: string,
    num: [string, string],
    den: [string, string],
    linear: number | 'events' | null,
  ): IRatio => ({
    name,
    items,
    numerator: { scenario: num[0], action: num[1] },
    denominator: { scenario: den[0], action: den[1] },
    linear,
  });
  const list: IRatio[] = [
    r(
      `append-${hi}-over-500`,
      'P1',
      [ev(hi), 'append-one-event'],
      [ev(500), 'append-one-event'],
      'events',
    ),
    r(
      `move-commit-${hi}-over-500`,
      'P1',
      [ev(hi), 'move-commit-repeat'],
      [ev(500), 'move-commit-repeat'],
      'events',
    ),
    r(
      `weapon-attack-${hi}-over-500`,
      'P1 P8',
      [ev(hi), 'weapon-attack-repeat'],
      [ev(500), 'weapon-attack-repeat'],
      'events',
    ),
    r(
      `phase-advance-${hi}-over-500`,
      'P1 P8',
      [ev(hi), 'phase-advance-any'],
      [ev(500), 'phase-advance-any'],
      'events',
    ),
    r(
      'reachable-walk8-over-walk4-clear',
      'P3',
      ['micro-r19-clear', 'reachable-overlay-walk8'],
      ['micro-r19-clear', 'reachable-overlay-walk4'],
      217 / 61,
    ),
    r(
      'reachable-walk8-over-walk4-wooded',
      'P3',
      ['micro-r19-heavy_woods', 'reachable-overlay-walk8'],
      ['micro-r19-heavy_woods', 'reachable-overlay-walk4'],
      217 / 61,
    ),
    r(
      'path-30-over-5-clear',
      'P4',
      ['micro-r19-clear', 'single-path-length30'],
      ['micro-r19-clear', 'single-path-length5'],
      6,
    ),
    r(
      `replay-load-${hi}-over-${lo}`,
      'P1 R2',
      [ev(hi), 'replay-load-gate-fold'],
      [ev(lo), 'replay-load-gate-fold'],
      'events',
    ),
  ];
  if (mode === 'full') {
    list.push(
      r(
        'los-projection-48x51-over-16x17',
        'P5',
        [scenarioName(8, '48x51', 500), 'los-whole-map-projection-repeat'],
        [scenarioName(8, '16x17', 500), 'los-whole-map-projection-repeat'],
        2437 / 271,
      ),
      r(
        'bot-decision-48x51-over-16x17',
        'P6',
        [scenarioName(8, '48x51', 500), 'bot-move-decision-repeat'],
        [scenarioName(8, '16x17', 500), 'bot-move-decision-repeat'],
        null,
      ),
      r(
        'bot-decision-48u-over-4u',
        'P6',
        [scenarioName(48, '32x34', 500), 'bot-move-decision-repeat'],
        [scenarioName(4, '32x34', 500), 'bot-move-decision-repeat'],
        null,
      ),
      r(
        'sim-12v12-over-4v4',
        'runner',
        ['sim-12v12-32x34-20turns', 'simulation-runner-game'],
        ['sim-4v4-32x34-20turns', 'simulation-runner-game'],
        3,
      ),
    );
  }
  return list;
}

function computeRatios(rows: readonly IResultRow[], mode: Mode) {
  const find = (ref: IRatio['numerator']) =>
    rows.find(
      (row) => row.scenario === ref.scenario && row.action === ref.action,
    );
  return ratioDefinitions(mode).map((def) => {
    const num = find(def.numerator);
    const den = find(def.denominator);
    const value = num && den && den.p50 > 0 ? num.p50 / den.p50 : null;
    const linear =
      def.linear === 'events'
        ? num && den && den.eventCount > 0
          ? num.eventCount / den.eventCount
          : null
        : def.linear;
    return {
      name: def.name,
      items: def.items,
      stat: 'p50' as const,
      value: value === null ? null : Math.round(value * 100) / 100,
      linear: linear === null ? null : Math.round(linear * 100) / 100,
      overLinear:
        value === null || linear === null
          ? null
          : Math.round((value / linear) * 100) / 100,
      numeratorSamples: num?.count ?? 0,
      denominatorSamples: den?.count ?? 0,
      numerator: def.numerator,
      denominator: def.denominator,
    };
  });
}

interface IThresholds {
  readonly ratios: Readonly<Record<string, { readonly max: number }>>;
}

/**
 * Read the thresholds file before anything runs. A ratio name that neither
 * mode defines is an error (exit 3), so a typo cannot pass as "skipped".
 */
function loadThresholds(thresholdsPath: string): IThresholds {
  const thresholds = JSON.parse(
    fs.readFileSync(thresholdsPath, 'utf8'),
  ) as IThresholds;
  const known = new Set(
    [...ratioDefinitions('quick'), ...ratioDefinitions('full')].map(
      (def) => def.name,
    ),
  );
  const unknown = Object.keys(thresholds.ratios).filter(
    (name) => !known.has(name),
  );
  if (unknown.length > 0) {
    throw new Error(
      `unknown ratio name(s) in ${thresholdsPath}: ${unknown.join(', ')}. Known: ${[...known].join(', ')}`,
    );
  }
  return thresholds;
}

type CheckStatus = 'pass' | 'fail' | 'insufficient' | 'skipped';

/**
 * Gate each threshold on its p50 ratio. A ratio of the other mode is
 * skipped; one with fewer than MIN_SAMPLES on either side (or a missing row)
 * is INSUFFICIENT, which fails like a ratio over its max.
 */
function applyChecks(
  ratios: ReturnType<typeof computeRatios>,
  thresholds: IThresholds,
) {
  return Object.entries(thresholds.ratios).map(([name, { max }]) => {
    const ratio = ratios.find((entry) => entry.name === name);
    const samples = ratio
      ? `n=${ratio.numeratorSamples}/${ratio.denominatorSamples}`
      : '';
    let status: CheckStatus;
    let reason: string;
    if (!ratio) {
      status = 'skipped';
      reason = 'a ratio of the other mode';
    } else if (
      ratio.value === null ||
      ratio.numeratorSamples < MIN_SAMPLES ||
      ratio.denominatorSamples < MIN_SAMPLES
    ) {
      status = 'insufficient';
      reason = `${samples} samples (numerator/denominator), below ${MIN_SAMPLES} per side${ratio.value === null ? '; a row is missing' : ''}: not a pass`;
    } else if (ratio.value <= max) {
      status = 'pass';
      reason = `p50 ratio ${ratio.value} <= max ${max} (${samples})`;
    } else {
      status = 'fail';
      reason = `p50 ratio ${ratio.value} > max ${max} (${samples})`;
    }
    return { name, max, value: ratio?.value ?? null, status, reason };
  });
}

/** Every scenario name the plan can run, for --scenario. */
function scenarioNames(plan: IPlan): string[] {
  return [
    ...plan.logs.flatMap((log) =>
      log.checkpoints.map((target) =>
        scenarioName(log.units, log.mapKey, target),
      ),
    ),
    ...plan.simulations.map(
      ({ perSide }) => `sim-${perSide}v${perSide}-32x34-20turns`,
    ),
  ];
}

function printRows(rows: readonly IResultRow[]): void {
  const lines = rows
    .filter((row) => row.count > 0)
    .map(
      (row) =>
        `${row.scenario.padEnd(28)} ${row.action.padEnd(36)} n=${String(row.count).padStart(3)} p50=${String(row.p50).padStart(9)}${row.unit} p95=${String(row.p95).padStart(9)}${row.unit} ev=${row.eventCount}`,
    );
  console.log(lines.join('\n'));
}

async function main(): Promise<number> {
  const args = parseArgs();
  const plan = planFor(args.mode);
  if (args.scenario !== null && !scenarioNames(plan).includes(args.scenario)) {
    throw new Error(
      `unknown --scenario ${args.scenario}; valid in --${args.mode}: ${scenarioNames(plan).join(', ')}`,
    );
  }
  const thresholds = args.check ? loadThresholds(args.check) : null;
  const startedAt = new Date().toISOString();
  const wallStarted = Date.now();
  const commit = gitHead();
  const meta: IRunMeta & Record<string, unknown> = {
    mode: args.mode,
    seed: args.seed,
    commit,
    node: process.version,
    startedAt,
    freeMemGbAtStart: freeMemGb(),
    gcExposed: typeof (globalThis as { gc?: unknown }).gc === 'function',
    cacheDir: args.cacheDir,
    mapRadius: MAP_RADIUS,
    terrain: TerrainPreset.LightWoods,
    logs: [] as unknown[],
    trimmed: [...plan.trimmed],
    unitConfigurations: args.allConfigurations ? 'all' : 'Biped',
    uncheckedAttacks: args.uncheckedAttacks,
    scenario: args.scenario,
    trackingFailures: [],
    findings: [],
    toleratedUndefinedKeys: {},
    warnings: [],
    minSamplesPerSide: MIN_SAMPLES,
    commandRepeats: COMMAND_REPEATS,
  };
  console.log(
    `engine harness: ${args.mode}, seed ${args.seed}, ${commit.slice(0, 9)}, free ${meta.freeMemGbAtStart} GB, gc ${meta.gcExposed}`,
  );
  if (args.cpuProf) await startCpuProfile();

  const rows: IResultRow[] = [];
  const pool = loadUnitPool();
  console.log(`  unit pool: ${pool.length} BattleMechs`);
  let templateUnit: Parameters<typeof measureReachableMicro>[1] | null = null;
  for (const logPlan of plan.logs) {
    await runLog(args, logPlan, pool, rows, meta);
  }
  if (args.scenario === null) {
    // A real unit state as the template for the micro benchmarks.
    const config: IPlayConfig = {
      label: 'template',
      seed: args.seed,
      units: pickUnits(pool, 2, args.seed, configurationsFor(args)),
      mapRadius: MAP_RADIUS['32x34'],
      terrain: TerrainPreset.Clear,
      checkpoints: [],
    };
    const live = createLiveSession(config);
    templateUnit = Object.values(live.getState().units)[0];
    await measureReachableMicro(
      rows,
      templateUnit,
      MAP_RADIUS['32x34'],
      plan.microSamples,
      args.callCounts,
    );
    measurePathMicro(rows, MAP_RADIUS['32x34'], plan.microSamples * 2);
  }
  await runSimulations(args, plan, pool, rows, meta);

  let cpuTopSelf: ISelfFrame[] | undefined;
  if (args.cpuProf) {
    const { profile, topSelf } = await stopCpuProfile(10);
    cpuTopSelf = topSelf;
    if (args.out) {
      fs.writeFileSync(
        args.out.replace(/\.json$/, '') + '.cpuprofile',
        JSON.stringify(profile),
      );
    }
  }

  const ratios = computeRatios(rows, args.mode);
  const checks = thresholds ? applyChecks(ratios, thresholds) : undefined;
  const report = {
    meta: {
      ...meta,
      wallMs: Date.now() - wallStarted,
      freeMemGbAtEnd: freeMemGb(),
    },
    rows,
    ratios,
    ...(checks ? { checks } : {}),
    notCovered: NOT_COVERED,
    ...(cpuTopSelf ? { cpuTopSelf } : {}),
  };
  printRows(rows);
  console.log('\nratios (p50 / p50, value / linear):');
  for (const ratio of ratios) {
    console.log(
      `  ${ratio.name.padEnd(40)} ${String(ratio.value).padStart(8)}  linear ${ratio.linear ?? '-'}  x${ratio.overLinear ?? '-'}  n=${ratio.numeratorSamples}/${ratio.denominatorSamples}`,
    );
  }
  if (args.out) {
    fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
    fs.writeFileSync(args.out, JSON.stringify(report, null, 2));
    console.log(`\nreport: ${args.out}`);
  }
  const tolerated = Object.values(meta.toleratedUndefinedKeys).reduce(
    (sum, entry) => sum + entry.count,
    0,
  );
  console.log(
    `F3 tolerated undefined-valued keys: ${tolerated} across ${Object.keys(meta.toleratedUndefinedKeys).length} passing scenario(s)`,
  );
  for (const warning of meta.warnings) console.warn(warning);
  console.log(`wall ${report.meta.wallMs} ms`);
  for (const check of checks ?? []) {
    console.log(
      `  check ${check.status.toUpperCase()} ${check.name}: ${check.reason}`,
    );
  }
  if (meta.trackingFailures.length > 0) {
    console.error(
      `\n${meta.trackingFailures.length} TRACKING ASSERT FAILURE(S):\n${meta.trackingFailures.join('\n')}`,
    );
    printFindings(meta.findings);
    return 2;
  }
  const notPassed = (checks ?? []).filter(
    (check) => check.status === 'fail' || check.status === 'insufficient',
  );
  if (notPassed.length > 0) {
    console.error(
      `\n${notPassed.length} check(s) did not pass: ${notPassed.map((check) => `${check.name} (${check.status})`).join(', ')}`,
    );
    return 1;
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    if (error instanceof TrackingAssertError) {
      console.error(`\n${error.message}`);
      process.exit(2);
    }
    console.error('engine harness failed:', error);
    process.exit(3);
  });
