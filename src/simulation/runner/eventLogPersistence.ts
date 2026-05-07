/**
 * Always-On Event Log Persistence
 *
 * Per `add-always-on-event-log` Phase 2 (`quick-session/spec.md` →
 * "Per-Game Event Log Persistence"): every CLI swarm encounter persists
 * its full chronological event log to disk in NDJSON format, one
 * `IGameEvent` per line, no wrapper object, no schema-version field.
 *
 * The function is intentionally narrow — it takes the already-resolved
 * per-invocation directory (the caller owns the `<run-timestamp>` slug)
 * and writes `<outputDir>/<gameId>.jsonl`. Caller-side composition keeps
 * the timestamp policy in `scripts/run-simulation.ts` rather than buried
 * here.
 *
 * Per design D3, events are written in the order returned by
 * `result.events` (which the runner populates in monotonically-increasing
 * `IGameEvent.sequence` order). This module MUST NOT re-sort, filter,
 * or transform — it's a pure persistence layer over the runtime contract.
 *
 * @see openspec/changes/add-always-on-event-log/specs/quick-session/spec.md
 * @see openspec/changes/add-always-on-event-log/specs/simulation-system/spec.md
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
