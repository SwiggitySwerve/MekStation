/**
 * Central replay index reader. Loads `simulation-reports/replay-index.json`
 * and returns a typed `readonly IReplayManifestEntry[]`. Forward-compatible
 * with future `ReplaySource` variants — entries whose `replaySource` is not a
 * recognized enum value are skipped (with a debug log) so a newer build
 * writing a future variant cannot crash this reader.
 *
 * Per add-replay-library spec (Central Replay Index Reader requirement):
 *   - Skip + debug-log unknown variants
 *   - When the index file is missing, invoke the backfill scan and return
 *     its result. PR 2 ships the reader with a stub fallback (returns an
 *     empty array); PR 3 plugs the real `scanReplayDirectory` in.
 *
 * PR 2 is Node-only; PR 5 will introduce env-aware abstraction for browser builds.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { ReplaySource } from '@/types/gameplay';
import { logger } from '@/utils/logger';

import type { IReplayManifestEntry } from './types';

/**
 * Backfill scan invoked when `replay-index.json` is missing. PR 3 wires the
 * real on-disk scan as the default; tests may still inject a stub through
 * the `backfillScan` option to assert the fallback path is hit without
 * touching the filesystem. The signature accepts the reader's resolved
 * `cwd` so an injected scan can honour the same isolation tests rely on.
 */
export type BackfillScan = (
  cwd: string,
) => Promise<readonly IReplayManifestEntry[]>;

/**
 * Default backfill — delegates to `scanReplayDirectory` so a fresh checkout
 * (or a developer that deleted `replay-index.json`) reconstructs the manifest
 * from the on-disk `simulation-reports/` tree. Exported so callers can wrap
 * or compose it without depending on `backfill-scan` directly.
 */
export const defaultBackfillScan: BackfillScan = async (cwd) => {
  // Keep the scanner lazy so normal replay API bundles do not trace the
  // developer's entire simulation-reports/ tree during standalone builds.
  const { scanReplayDirectory } = await import('./backfill-scan');
  return scanReplayDirectory({ cwd });
};

/**
 * Options for the reader. `cwd` lets tests inject a tmpdir without polluting
 * the real `simulation-reports/`; `backfillScan` lets tests assert the
 * fallback path is invoked.
 */
export interface IReadReplayIndexOptions {
  /** Override `process.cwd()` for the index path resolution. */
  readonly cwd?: string;
  /** Override the missing-file fallback (defaults to the empty-array stub). */
  readonly backfillScan?: BackfillScan;
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

/**
 * Set of recognized `ReplaySource` enum values, materialized once. Membership
 * check uses this set instead of pattern-matching each variant individually
 * so adding a fifth `ReplaySource` value automatically extends the recognized
 * set without touching this file.
 */
const RECOGNIZED_REPLAY_SOURCES: ReadonlySet<string> = new Set(
  Object.values(ReplaySource),
);

/**
 * Type guard — narrows a parsed-JSON candidate to `IReplayManifestEntry`
 * provided its `replaySource` is a recognized enum value. Other shape checks
 * are intentionally minimal: we trust the writer to produce well-formed
 * entries and rely on TypeScript at the consumer boundary. The forward-compat
 * filter is the load-bearing check here.
 */
function hasRecognizedReplaySource(
  candidate: unknown,
): candidate is IReplayManifestEntry {
  if (typeof candidate !== 'object' || candidate === null) return false;
  const source = (candidate as { replaySource?: unknown }).replaySource;
  return typeof source === 'string' && RECOGNIZED_REPLAY_SOURCES.has(source);
}

/**
 * Loads the central replay index. Forward-compatible with unknown variants.
 *
 * Behavior:
 *   - If `replay-index.json` exists and parses, returns the recognized
 *     entries (skips + debug-logs forward-compat ones).
 *   - If `replay-index.json` does not exist (`ENOENT`), invokes the
 *     `backfillScan` option (default: real on-disk scan) and returns its
 *     result.
 *   - Any other read/parse error propagates — the caller decides whether
 *     to surface it.
 */
export async function readReplayIndex(
  options: IReadReplayIndexOptions = {},
): Promise<readonly IReplayManifestEntry[]> {
  const cwd = options.cwd ?? process.cwd();
  const indexPath = resolveIndexPath(cwd);
  const backfillScan = options.backfillScan ?? defaultBackfillScan;

  let raw: string;
  try {
    raw = await fs.readFile(indexPath, 'utf8');
  } catch (err) {
    // Missing file → defer to the backfill scan. Other errors propagate.
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      logger.debug(
        '[replay-library] replay-index.json missing — falling back to backfill scan',
        { indexPath },
      );
      return backfillScan(cwd);
    }
    throw err;
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(
      `[replay-library] replay-index.json is malformed — expected JSON array, got ${typeof parsed}`,
    );
  }

  const recognized: IReplayManifestEntry[] = [];
  for (const candidate of parsed) {
    if (hasRecognizedReplaySource(candidate)) {
      recognized.push(candidate);
    } else {
      // Forward-compat: a newer build wrote an entry whose `replaySource`
      // is not in this build's enum. Skip it but log at debug so a developer
      // running with debug logs sees what was filtered.
      const id =
        typeof candidate === 'object' && candidate !== null
          ? (candidate as { id?: unknown }).id
          : undefined;
      const replaySource =
        typeof candidate === 'object' && candidate !== null
          ? (candidate as { replaySource?: unknown }).replaySource
          : undefined;
      logger.debug(
        '[replay-library] skipping replay-index entry with unrecognized replaySource',
        { id, replaySource },
      );
    }
  }

  return recognized;
}
