/**
 * Central replay index writer. Atomically appends a single
 * `IReplayManifestEntry` to `simulation-reports/replay-index.json`, creating
 * the file if absent.
 *
 * Atomicity:
 *   - Write the full new array to a temp file `replay-index.json.tmp-<ts>-<rand>`
 *   - `fs.rename` the temp into place (POSIX rename is atomic; Windows is
 *     mostly atomic and throws on collisions instead of silently corrupting,
 *     which is acceptable for this use case)
 *   - The temp filename includes a high-resolution timestamp + crypto-random
 *     suffix so concurrent appends from the same process cannot collide on
 *     the temp path
 *
 * Concurrency:
 *   - Read-modify-write is serialized via a per-file in-memory mutex so
 *     concurrent `appendManifestEntry` calls produce both entries (no
 *     last-writer-wins). The mutex is a `Promise<void>` chain stored in a
 *     module-level `Map` keyed by absolute path. Cross-process safety is
 *     out of scope — the swarm runner and quick-game persistence both run
 *     in the same Node process.
 *
 * PR 2 is Node-only; PR 5 will introduce env-aware abstraction for browser builds.
 */

import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { IReplayManifestEntry } from './types';

/**
 * Options for the writer. `cwd` lets tests inject a tmpdir without polluting
 * the real `simulation-reports/`.
 */
export interface IAppendManifestEntryOptions {
  /** Override `process.cwd()` for the index path resolution. */
  readonly cwd?: string;
}

/**
 * Resolves the absolute path to `simulation-reports/replay-index.json` rooted
 * at the supplied `cwd` (or `process.cwd()` when omitted).
 */
function resolveIndexPath(cwd?: string): string {
  return path.resolve(
    cwd ?? process.cwd(),
    'simulation-reports',
    'replay-index.json',
  );
}

// ---------------------------------------------------------------------------
// Per-path mutex — serializes read-modify-write across concurrent callers in
// the same Node process. Map key is the absolute index path so two different
// `cwd`s in tests do not block each other.
// ---------------------------------------------------------------------------
const writeQueues: Map<string, Promise<void>> = new Map();

/**
 * Runs `task` after any previously-queued task for the same `key` completes.
 * The queue stores the tail Promise; we install a new tail that resolves
 * after `task` settles. Failures unwind the queue without leaving the slot
 * "stuck" — the next caller starts from a resolved state.
 */
async function runSerialized<T>(
  key: string,
  task: () => Promise<T>,
): Promise<T> {
  const previous = writeQueues.get(key) ?? Promise.resolve();
  let release: (() => void) | undefined;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  writeQueues.set(
    key,
    previous.then(() => next),
  );

  try {
    await previous;
    return await task();
  } finally {
    release?.();
    // If we are the current tail, clear the slot so the map does not grow
    // unbounded on long-running processes.
    if (writeQueues.get(key) === previous.then(() => next)) {
      writeQueues.delete(key);
    }
  }
}

/**
 * Reads the existing manifest array from `indexPath`. Returns an empty array
 * when the file does not exist (writer-creates-when-absent path). Other read
 * or parse errors propagate.
 */
async function readExistingManifest(
  indexPath: string,
): Promise<IReplayManifestEntry[]> {
  let raw: string;
  try {
    raw = await fs.readFile(indexPath, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(
      `[replay-library] replay-index.json is malformed — expected JSON array, got ${typeof parsed}`,
    );
  }
  // Cast is safe at write time — the writer only ever round-trips entries it
  // (or another writer in the same partition layout) produced. The reader is
  // responsible for forward-compat filtering.
  return parsed as IReplayManifestEntry[];
}

/**
 * Generates a unique temp-file suffix for the atomic write. Format:
 * `<unix-ms>-<8-hex-crypto-random>`. The random suffix is the load-bearing
 * part — concurrent appends in the same millisecond would otherwise collide.
 */
function makeTempSuffix(): string {
  const ts = Date.now();
  const rand = randomBytes(4).toString('hex');
  return `${ts}-${rand}`;
}

/**
 * Atomically appends a single new `IReplayManifestEntry` to the central
 * replay index. Creates the index file (and its parent directory) when
 * absent. Concurrent calls in the same process are serialized so no entry
 * is lost.
 *
 * Atomicity guarantees:
 *   - On success: the index file at `indexPath` reflects all prior entries
 *     plus the new one
 *   - On rename failure (or any prior step throwing): the original index
 *     file is untouched. A temp file may be left behind for cleanup, but
 *     the reader's load path will not pick it up because the reader only
 *     reads `replay-index.json` (the unsuffixed name)
 */
export async function appendManifestEntry(
  entry: IReplayManifestEntry,
  options: IAppendManifestEntryOptions = {},
): Promise<void> {
  const indexPath = resolveIndexPath(options.cwd);

  await runSerialized(indexPath, async () => {
    // Ensure the parent `simulation-reports/` directory exists; the writer
    // is the first surface that materializes it on a fresh checkout.
    await fs.mkdir(path.dirname(indexPath), { recursive: true });

    const existing = await readExistingManifest(indexPath);
    const next: IReplayManifestEntry[] = [...existing, entry];

    // Atomic write: temp file + rename. The temp filename is colocated with
    // the index so the rename is on the same filesystem (cross-fs renames
    // would not be atomic).
    const tempPath = `${indexPath}.tmp-${makeTempSuffix()}`;
    const serialized = `${JSON.stringify(next, null, 2)}\n`;

    await fs.writeFile(tempPath, serialized, 'utf8');
    try {
      await fs.rename(tempPath, indexPath);
    } catch (err) {
      // Rename failed — best-effort cleanup of the temp file so a long-lived
      // process does not accumulate orphans. The original index is untouched
      // (rename is the only mutation of the canonical name) so callers can
      // safely retry.
      try {
        await fs.unlink(tempPath);
      } catch {
        // Swallow cleanup failure — the original error is the meaningful one.
      }
      throw err;
    }
  });
}
