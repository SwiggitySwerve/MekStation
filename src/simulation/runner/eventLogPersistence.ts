/**
 * Always-On Event Log Persistence
 *
 * Per `add-always-on-event-log` Phase 2 (`quick-session/spec.md` →
 * "Per-Game Event Log Persistence"): every CLI swarm encounter persists
 * its full chronological event log to disk in NDJSON format, one
 * `IGameEvent` per line, no wrapper object, no schema-version field.
 *
 * Two write paths are exposed:
 *
 *   - `writeEventLog(gameId, events, outputDir)` — caller-owned outputDir.
 *     Used by the original always-on persistence integration test and
 *     by callers that need to direct writes to an arbitrary directory
 *     (e.g. an experimental tool that wants its own partition root).
 *
 *   - `writeSwarmEventLog(gameId, events, cwd?)` — partition-aware.
 *     Writes to `${cwd ?? process.cwd()}/simulation-reports/swarm/
 *     <gameId>.jsonl`. This is the new partition layout from
 *     `add-replay-library` (replay-library spec → Filesystem Partition
 *     Layout): every swarm-source replay log lives under
 *     `simulation-reports/swarm/`, no `<run-timestamp>/` directory
 *     segment. The flat layout `simulation-reports/games/<ts>/...`
 *     is no longer written by new runs (pre-existing files remain
 *     readable via the backfill scan from PR 3).
 *
 * Per design D3, events are written in the order returned by
 * `result.events` (which the runner populates in monotonically-increasing
 * `IGameEvent.sequence` order). This module MUST NOT re-sort, filter,
 * or transform — it's a pure persistence layer over the runtime contract.
 *
 * @see openspec/changes/add-always-on-event-log/specs/quick-session/spec.md
 * @see openspec/changes/add-always-on-event-log/specs/simulation-system/spec.md
 * @see openspec/changes/add-replay-library/specs/replay-library/spec.md
 * @see openspec/changes/add-replay-library/specs/quick-session/spec.md
 */

import * as fsPromises from 'fs/promises';
import * as path from 'path';

import type { IGameEvent } from '@/types/gameplay';

/**
 * Persist a single game's event log as NDJSON.
 *
 * @param gameId    Stable game identifier — becomes the file basename.
 * @param events    Chronological event list, monotonically increasing on
 *                  `IGameEvent.sequence` (the runner's emit order). The
 *                  function does not re-sort.
 * @param outputDir Already-resolved per-CLI-invocation directory (e.g.
 *                  `simulation-reports/games/2026-05-06T15-23-04-001Z/`).
 *                  Created with `recursive: true` if missing.
 * @returns         The absolute path of the file written.
 *
 * The function is safe to call concurrently across distinct `gameId`s —
 * `mkdir({ recursive: true })` tolerates the directory already existing,
 * and each call writes a different file. It MUST NOT be called twice for
 * the same `gameId` in one invocation (the second call would clobber).
 */
export async function writeEventLog(
  gameId: string,
  events: readonly IGameEvent[],
  outputDir: string,
): Promise<string> {
  await fsPromises.mkdir(outputDir, { recursive: true });

  // NDJSON: one JSON-encoded event per line, `\n` separator, no trailing
  // newline (per spec). An empty event list yields an empty file — that's
  // a legitimate state for a 0-turn run that produced no events, and the
  // line-count assertion in tests still holds.
  const body = events.map((event) => JSON.stringify(event)).join('\n');
  const filePath = path.resolve(outputDir, `${gameId}.jsonl`);
  await fsPromises.writeFile(filePath, body, 'utf-8');

  return filePath;
}

/**
 * Resolve the swarm partition directory rooted at the supplied `cwd`
 * (or `process.cwd()` when omitted). Tests inject a tmpdir to avoid
 * polluting the real `simulation-reports/swarm/` directory.
 */
function resolveSwarmPartitionDir(cwd?: string): string {
  return path.resolve(cwd ?? process.cwd(), 'simulation-reports', 'swarm');
}

/**
 * Persist a single swarm-game's event log as NDJSON under the new
 * partition layout `simulation-reports/swarm/<gameId>.jsonl`.
 *
 * Per `add-replay-library` (replay-library spec → Filesystem Partition
 * Layout; quick-session spec → Per-Game Event Log Persistence
 * MODIFIED): writers SHALL persist swarm logs to
 * `simulation-reports/swarm/<gameId>.jsonl`, NOT to the legacy flat
 * `simulation-reports/games/<run-timestamp>/<gameId>.jsonl` layout.
 * This sibling of `writeEventLog` exists so the partition path is
 * encoded once in the persistence module rather than scattered across
 * caller-side directory composition.
 *
 * The NDJSON encoding rules are identical to `writeEventLog`:
 *   - one JSON-encoded `IGameEvent` per line
 *   - `\n` separator, no trailing newline
 *   - no re-sort, filter, or payload transform
 *
 * @param gameId  Stable game identifier — becomes the file basename.
 * @param events  Chronological event list, monotonically increasing on
 *                `IGameEvent.sequence` (the runner's emit order). The
 *                function does not re-sort.
 * @param cwd     Optional override for `process.cwd()` so tests can
 *                inject a tmpdir. When omitted, writes to
 *                `<process.cwd()>/simulation-reports/swarm/`.
 * @returns       The absolute path of the file written.
 *
 * Like `writeEventLog`, the function is safe to call concurrently
 * across distinct `gameId`s — `mkdir({ recursive: true })` tolerates
 * the directory already existing, and each call writes a different
 * file. It MUST NOT be called twice for the same `gameId` in one
 * invocation (the second call would clobber).
 */
export async function writeSwarmEventLog(
  gameId: string,
  events: readonly IGameEvent[],
  cwd?: string,
): Promise<string> {
  const partitionDir = resolveSwarmPartitionDir(cwd);
  return writeEventLog(gameId, events, partitionDir);
}
