/**
 * Replay backfill scan — reconstructs an in-memory `IReplayManifestEntry[]`
 * from the on-disk contents of `simulation-reports/`. Invoked by the central
 * index reader when `replay-index.json` is missing, so a developer that
 * deletes the index (or hits a fresh checkout with pre-existing logs from
 * an earlier build) does not lose the catalog of replays.
 *
 * Per add-replay-library spec (Backfill Scan requirement):
 *   - SHALL examine BOTH the new partition layout
 *     (`simulation-reports/<source>/*.jsonl`) and the legacy flat layout
 *     (`simulation-reports/games/<timestamp>/*.jsonl`).
 *   - For each NDJSON file, stream-read enough lines to extract first event
 *     (must be `GameCreated`) for `bvTotal` + source-specific fields, and
 *     last event for `winner`/`turns` (with `turn_started`-count fallback).
 *   - For legacy flat-layout files, infer `replaySource = ReplaySource.Swarm`
 *     and set `batchTimestamp` from the parent directory name.
 *   - SHALL be idempotent: re-runs on the same disk state SHALL produce a
 *     deep-equal manifest array.
 *
 * PR 3 is Node-only; PR 5 introduces env-aware abstractions for browser builds.
 *
 * Streaming choice: `node:readline` over `node:fs.createReadStream` keeps
 * the worst-case memory footprint linear in line size, not in file size.
 * The first event lives at line 1 and the last `GameEnded` (when present)
 * is short-circuited by tracking a rolling "last event we saw of this type"
 * variable while iterating. The `turn_started` fallback only kicks in when
 * `GameEnded.turns` is absent — at that point we already paid the streaming
 * cost so re-iterating the line buffer is cheap.
 */

import { createReadStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';

import type {
  GameEventType,
  IGameCreatedPayload,
  IGameEndedPayload,
  IGameEvent,
  IGameUnit,
} from '@/types/gameplay';

import { GameSide, ReplaySource } from '@/types/gameplay';
import { logger } from '@/utils/logger';

import type {
  IQuickReplayManifestEntry,
  IReplayManifestEntry,
  ISwarmReplayManifestEntry,
} from './types';

/**
 * Options for the backfill scan. `cwd` lets tests inject an isolated tmpdir
 * without polluting the real `simulation-reports/` tree.
 */
export interface IScanReplayDirectoryOptions {
  /** Override `process.cwd()` for the simulation-reports root resolution. */
  readonly cwd?: string;
}

/**
 * Materializes an in-memory manifest from disk. Returns an empty array when
 * `simulation-reports/` does not exist (fresh checkout).
 */
export async function scanReplayDirectory(
  options: IScanReplayDirectoryOptions = {},
): Promise<readonly IReplayManifestEntry[]> {
  const cwd = options.cwd ?? process.cwd();
  const reportsRoot = path.resolve(cwd, 'simulation-reports');

  // Fresh checkout / nothing to scan — return the empty manifest. The reader
  // path treats an empty manifest exactly like "missing index" today, so
  // surfacing an error here would be a regression.
  try {
    await fs.access(reportsRoot);
  } catch {
    return [];
  }

  const entries: IReplayManifestEntry[] = [];

  // Phase 1: scan the four partition directories named after `ReplaySource`
  // values. Iterating `Object.values(ReplaySource)` keeps adding a fifth
  // variant zero-touch — the new directory is automatically picked up.
  for (const source of Object.values(ReplaySource)) {
    const sourceDir = path.join(reportsRoot, source);
    const partitionEntries = await scanPartitionDirectory(
      sourceDir,
      source,
      reportsRoot,
    );
    entries.push(...partitionEntries);
  }

  // Phase 2: scan the legacy flat layout `simulation-reports/games/<ts>/`.
  // Every file under here predates the partition cutover; PR 4 will stop
  // writing new files into this tree, but we keep reading from it so a
  // developer's accumulated logs survive the layout change.
  const legacyEntries = await scanLegacyDirectory(reportsRoot);
  entries.push(...legacyEntries);

  // Idempotency: sort by `id` so two scans on the same disk state produce
  // arrays that are deep-equal element-for-element. The directory iteration
  // order is filesystem-dependent (NTFS vs ext4 vs APFS all differ); a
  // stable sort by `id` is the only zero-cost guarantee.
  entries.sort((a, b) => a.id.localeCompare(b.id));

  return entries;
}

// ---------------------------------------------------------------------------
// Partition layout: simulation-reports/<source>/<gameId>.jsonl
// ---------------------------------------------------------------------------

/**
 * Scans one of the four partition directories. Skips silently if the
 * directory does not exist (a fresh checkout never wrote that source).
 */
async function scanPartitionDirectory(
  sourceDir: string,
  source: ReplaySource,
  reportsRoot: string,
): Promise<IReplayManifestEntry[]> {
  let dirEntries: string[];
  try {
    dirEntries = await fs.readdir(sourceDir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }

  const out: IReplayManifestEntry[] = [];
  for (const file of dirEntries) {
    if (!file.endsWith('.jsonl')) continue;
    const filePath = path.join(sourceDir, file);
    const gameId = path.basename(file, '.jsonl');
    const entry = await buildPartitionEntry(
      filePath,
      gameId,
      source,
      reportsRoot,
    );
    if (entry) out.push(entry);
  }
  return out;
}

/**
 * Builds a manifest entry for a partition-layout file. Returns `null` if the
 * file lacks a `GameCreated` event (corrupt / aborted run); the scan logs
 * and skips rather than crashing.
 */
async function buildPartitionEntry(
  filePath: string,
  gameId: string,
  source: ReplaySource,
  reportsRoot: string,
): Promise<IReplayManifestEntry | null> {
  const summary = await streamFileSummary(filePath);
  if (!summary.gameCreated) {
    logger.debug(
      '[replay-library] backfill skipping file without GameCreated event',
      { filePath, gameId },
    );
    return null;
  }

  const relativePath = path
    .relative(reportsRoot, filePath)
    .split(path.sep)
    .join('/');

  const baseFields = await deriveBaseFields(filePath, summary, relativePath);

  switch (source) {
    case ReplaySource.Swarm:
      return buildSwarmEntry(gameId, baseFields, summary);
    case ReplaySource.Quick:
      return buildQuickEntry(gameId, baseFields, summary);
    case ReplaySource.PvP:
    case ReplaySource.Campaign:
      // PR 1 reserved these shapes for future emitters. Until those write
      // paths exist, an on-disk file under `pvp/` or `campaign/` is almost
      // certainly a developer testing fixture — we materialize a minimal
      // entry so the scan stays exhaustive on `ReplaySource`. Forward-compat
      // with future emitters: if the file's `GameCreated` event already
      // carries source-specific fields, that emitter is already authoritative
      // and the writer path will overwrite this manifest entry on next run.
      return buildPlaceholderEntry(gameId, source, baseFields);
    default: {
      // Exhaustiveness check — adding a fifth `ReplaySource` value triggers
      // a compile error here so the author cannot forget to handle it.
      const _exhaustive: never = source;
      throw new Error(
        `unhandled ReplaySource in backfill: ${String(_exhaustive)}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Legacy flat layout: simulation-reports/games/<timestamp>/<gameId>.jsonl
// ---------------------------------------------------------------------------

/**
 * Scans the legacy flat layout. Each subdirectory of `simulation-reports/games/`
 * is a `<run-timestamp>` slug; every `.jsonl` inside is a swarm-runner output
 * from before the partition cutover.
 */
async function scanLegacyDirectory(
  reportsRoot: string,
): Promise<IReplayManifestEntry[]> {
  const legacyRoot = path.join(reportsRoot, 'games');
  let timestampDirs: string[];
  try {
    timestampDirs = await fs.readdir(legacyRoot);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }

  const out: IReplayManifestEntry[] = [];
  for (const tsDir of timestampDirs) {
    const tsDirPath = path.join(legacyRoot, tsDir);
    let stat: import('fs').Stats;
    try {
      stat = await fs.stat(tsDirPath);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;

    let files: string[];
    try {
      files = await fs.readdir(tsDirPath);
    } catch {
      continue;
    }

    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      const filePath = path.join(tsDirPath, file);
      const gameId = path.basename(file, '.jsonl');
      const entry = await buildLegacyEntry(
        filePath,
        gameId,
        tsDir,
        reportsRoot,
      );
      if (entry) out.push(entry);
    }
  }
  return out;
}

/**
 * Builds a swarm manifest entry for a legacy-layout file. `configName='' `
 * and `seed=0` because the legacy filenames did not preserve the original
 * config/seed — PR 4 will start writing these fields into new manifest
 * entries so future scans get the real values.
 */
async function buildLegacyEntry(
  filePath: string,
  gameId: string,
  parentTimestamp: string,
  reportsRoot: string,
): Promise<ISwarmReplayManifestEntry | null> {
  const summary = await streamFileSummary(filePath);
  if (!summary.gameCreated) {
    logger.debug(
      '[replay-library] backfill skipping legacy file without GameCreated event',
      { filePath, gameId },
    );
    return null;
  }

  const relativePath = path
    .relative(reportsRoot, filePath)
    .split(path.sep)
    .join('/');

  const baseFields = await deriveBaseFields(filePath, summary, relativePath);

  return {
    id: gameId,
    replaySource: ReplaySource.Swarm,
    path: relativePath,
    createdAt: baseFields.createdAt,
    turns: baseFields.turns,
    winner: baseFields.winner,
    bvTotal: baseFields.bvTotal,
    // No way to recover the original config from legacy files. PR 4+ writes
    // these fields into newly-emitted entries so future scans of partition-
    // layout files will have real values.
    configName: '',
    seed: 0,
    batchTimestamp: parentTimestamp,
  };
}

// ---------------------------------------------------------------------------
// File-level streaming + base-field derivation
// ---------------------------------------------------------------------------

/**
 * Per-file summary derived from a single streaming pass. `lines` keeps the
 * raw line array around so the `turn_started`-count fallback can compute
 * without re-streaming when `GameEnded.turns` is missing.
 */
interface IFileSummary {
  /** First event in the file — must be `GameCreated` per spec. */
  readonly gameCreated: IGameEvent | null;
  /** Last `GameEnded` event seen (null if the run did not finish cleanly). */
  readonly gameEnded: IGameEvent | null;
  /** Raw lines preserved for the `turn_started` fallback. */
  readonly lines: readonly string[];
}

/**
 * Streams a `.jsonl` file line-by-line. The reader keeps a running last-of-
 * type pointer for `GameEnded` so we always end up with the final ending
 * event (the spec only writes one `GameEnded` per run, but defending against
 * a future "session reset" event sequence is cheap). All lines are buffered
 * because the `turn_started`-count fallback iterates them lazily later.
 *
 * Note: buffering all lines breaks the "stream-only" purity goal slightly,
 * but the line strings here are short (~200-500 bytes typical) and
 * simulation event logs cap out at low-thousands of events. The memory
 * footprint of a 5000-line file is well under 5 MB even with allocator
 * overhead. The alternative (two streaming passes) is a clean rewrite for
 * a future optimization PR if profiling demands it.
 */
async function streamFileSummary(filePath: string): Promise<IFileSummary> {
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  let gameCreated: IGameEvent | null = null;
  let gameEnded: IGameEvent | null = null;
  const lines: string[] = [];

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    lines.push(trimmed);

    let parsed: IGameEvent;
    try {
      parsed = JSON.parse(trimmed) as IGameEvent;
    } catch {
      continue;
    }

    if (!gameCreated && parsed.type === ('game_created' as GameEventType)) {
      gameCreated = parsed;
    }
    if (parsed.type === ('game_ended' as GameEventType)) {
      gameEnded = parsed;
    }
  }

  return { gameCreated, gameEnded, lines };
}

/**
 * Fields shared by every variant. Derived once per file so the variant-
 * specific builders only worry about source-specific fields.
 */
interface IDerivedBaseFields {
  readonly path: string;
  readonly createdAt: string;
  readonly turns: number;
  readonly winner: GameSide | null;
  readonly bvTotal: number;
}

/**
 * Computes fields shared across every variant. `createdAt` falls back to the
 * file mtime when the `GameCreated` event lacks a timestamp; `winner`/`turns`
 * fall back per the spec; `bvTotal` defers to `computeBvTotal` which itself
 * defends against the unit shape lacking a `bv` field.
 */
async function deriveBaseFields(
  filePath: string,
  summary: IFileSummary,
  relativePath: string,
): Promise<IDerivedBaseFields> {
  // `createdAt` priority: GameCreated event timestamp → file mtime → now.
  // Mtime fallback covers a future emitter that forgot to populate the
  // timestamp; "now" is the last-resort guard against fs.stat racing.
  let createdAt = summary.gameCreated?.timestamp ?? '';
  if (!createdAt) {
    try {
      const stat = await fs.stat(filePath);
      createdAt = stat.mtime.toISOString();
    } catch {
      createdAt = new Date().toISOString();
    }
  }

  const winner = resolveWinner(summary.gameEnded);
  const turns = resolveTurns(summary);
  const bvTotal = computeBvTotal(summary.gameCreated, relativePath);

  return { path: relativePath, createdAt, turns, winner, bvTotal };
}

/**
 * Resolves the winner field from a `GameEnded` payload. `'draw'` and the
 * absence of a `GameEnded` event both collapse to `null` so the manifest
 * type stays `GameSide | null`.
 */
function resolveWinner(gameEnded: IGameEvent | null): GameSide | null {
  if (!gameEnded) return null;
  const payload = gameEnded.payload as IGameEndedPayload;
  if (payload.winner === 'draw') return null;
  if (payload.winner === GameSide.Player) return GameSide.Player;
  if (payload.winner === GameSide.Opponent) return GameSide.Opponent;
  return null;
}

/**
 * Resolves the `turns` field with the spec's three-step fallback chain:
 *   1. `GameEnded.turns` (when present)
 *   2. count of `turn_started` events in the file
 *   3. `0` when neither is available
 *
 * The lazy-iteration of `summary.lines` is the load-bearing escape hatch:
 * the count walk only happens when step 1 fails, so well-formed event logs
 * never pay the linear-scan cost.
 */
function resolveTurns(summary: IFileSummary): number {
  if (summary.gameEnded) {
    const payload = summary.gameEnded.payload as IGameEndedPayload;
    if (typeof payload.turns === 'number') {
      return payload.turns;
    }
  }

  let turnStartedCount = 0;
  for (const line of summary.lines) {
    // Cheap pre-check: if the substring isn't present, skip the JSON parse
    // entirely. Saves ~80% of the parse cost on large files where most
    // events aren't `turn_started`.
    if (!line.includes('turn_started')) continue;
    try {
      const parsed = JSON.parse(line) as IGameEvent;
      if (parsed.type === ('turn_started' as GameEventType)) {
        turnStartedCount += 1;
      }
    } catch {
      // Skip malformed lines silently — they are already accounted for in
      // the GameCreated/GameEnded scan and either succeeded or didn't.
    }
  }
  return turnStartedCount;
}

/**
 * Computes `bvTotal` from `GameCreated.payload.units`. Today `IGameUnit` does
 * not expose a `bv` field directly, so we look for one defensively (a future
 * emitter may add it as a denorm) and fall back to `0` with a debug log
 * naming the gameId. PR 4+ will populate this from the construction-side
 * BV calculator at write time so future scans return real values.
 */
function computeBvTotal(
  gameCreated: IGameEvent | null,
  relativePath: string,
): number {
  if (!gameCreated) return 0;
  const payload = gameCreated.payload as IGameCreatedPayload;
  const units = payload.units;
  if (!Array.isArray(units) || units.length === 0) return 0;

  let total = 0;
  let foundAny = false;
  for (const unit of units) {
    // Defensive shape check: `IGameUnit` does not currently declare `bv`,
    // but the field is the obvious place for a future denorm. Reading it
    // off the unsealed shape via `as` keeps the compile clean.
    const bv = (unit as IGameUnit & { bv?: number }).bv;
    if (typeof bv === 'number' && Number.isFinite(bv)) {
      total += bv;
      foundAny = true;
    }
  }

  if (!foundAny) {
    logger.debug(
      '[replay-library] backfill could not derive bvTotal — no unit.bv field on GameCreated',
      { relativePath, unitCount: units.length },
    );
    return 0;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Variant builders
// ---------------------------------------------------------------------------

/**
 * Materializes a swarm entry from partition-layout context. `configName`,
 * `seed`, and `batchTimestamp` come from optional payload fields a forward-
 * compat emitter may have written into `GameCreated`; otherwise they fall
 * back to the same legacy defaults the legacy-layout builder uses (PR 4
 * will populate them on every new write).
 */
function buildSwarmEntry(
  gameId: string,
  baseFields: IDerivedBaseFields,
  summary: IFileSummary,
): ISwarmReplayManifestEntry {
  const created = summary.gameCreated;
  const meta = (created?.payload as { swarmMeta?: unknown } | undefined)
    ?.swarmMeta as
    | { configName?: string; seed?: number; batchTimestamp?: string }
    | undefined;
  return {
    id: gameId,
    replaySource: ReplaySource.Swarm,
    path: baseFields.path,
    createdAt: baseFields.createdAt,
    turns: baseFields.turns,
    winner: baseFields.winner,
    bvTotal: baseFields.bvTotal,
    configName: meta?.configName ?? '',
    seed: typeof meta?.seed === 'number' ? meta.seed : 0,
    batchTimestamp: meta?.batchTimestamp ?? baseFields.createdAt,
  };
}

/**
 * Materializes a quick entry from partition-layout context. `playerSide` and
 * `aiVariant` come from optional payload fields the QuickGameResults emitter
 * may have written; otherwise they fall back to `Player` / `'unknown'` with
 * a debug log so a developer can spot the missing denorm.
 */
function buildQuickEntry(
  gameId: string,
  baseFields: IDerivedBaseFields,
  summary: IFileSummary,
): IQuickReplayManifestEntry {
  const created = summary.gameCreated;
  const meta = (created?.payload as { quickMeta?: unknown } | undefined)
    ?.quickMeta as { playerSide?: GameSide; aiVariant?: string } | undefined;
  if (!meta) {
    logger.debug(
      '[replay-library] backfill quick entry missing quickMeta — using fallbacks',
      { gameId },
    );
  }
  return {
    id: gameId,
    replaySource: ReplaySource.Quick,
    path: baseFields.path,
    createdAt: baseFields.createdAt,
    turns: baseFields.turns,
    winner: baseFields.winner,
    bvTotal: baseFields.bvTotal,
    playerSide: meta?.playerSide ?? GameSide.Player,
    aiVariant: meta?.aiVariant ?? 'unknown',
  };
}

/**
 * Materializes a placeholder entry for `pvp` / `campaign` partitions. The
 * shape is reserved by PR 1 but no emitter writes into these partitions yet.
 * If a developer drops a fixture in there, we keep the scan exhaustive
 * rather than skipping silently.
 */
function buildPlaceholderEntry(
  gameId: string,
  source: ReplaySource.PvP | ReplaySource.Campaign,
  baseFields: IDerivedBaseFields,
): IReplayManifestEntry {
  if (source === ReplaySource.PvP) {
    return {
      id: gameId,
      replaySource: ReplaySource.PvP,
      path: baseFields.path,
      createdAt: baseFields.createdAt,
      turns: baseFields.turns,
      winner: baseFields.winner,
      bvTotal: baseFields.bvTotal,
      opponentName: '',
      matchId: '',
    };
  }
  return {
    id: gameId,
    replaySource: ReplaySource.Campaign,
    path: baseFields.path,
    createdAt: baseFields.createdAt,
    turns: baseFields.turns,
    winner: baseFields.winner,
    bvTotal: baseFields.bvTotal,
    campaignId: '',
    missionId: '',
    difficulty: '',
  };
}
