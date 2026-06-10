/**
 * Quick-game persistence pipeline. Per `add-replay-library` PR 5
 * (replay-library spec — Filesystem Partition Layout; quick-session spec —
 * Quick Game Event Log Persistence ADDED): when a quick game reaches a
 * terminal state (`endedAt` is set), persist its full event log to
 * `simulation-reports/quick/<gameId>.jsonl` and append an
 * `IQuickReplayManifestEntry` to the central replay-index.json.
 *
 * Env-aware IO: this module is imported by a React component that runs
 * in the browser (and in Node test envs). Browser builds get a no-op
 * persistence layer for v1 — IndexedDB-backed implementation is a
 * follow-on PR. Node test envs go through the same `node:fs/promises`
 * + `appendManifestEntry` pipeline the swarm runner uses.
 *
 * Post-stamping `replaySource: ReplaySource.Quick` happens at the
 * boundary here (mirrors the SimulationRunner.run() pattern from PR 4):
 * events on the wire carry the discriminator without needing every
 * `createGameEvent` callsite to thread it.
 */

// Import the type from the deeper module path (not the barrel) so the
// browser bundler doesn't trace `index-reader.ts` / `index-writer.ts`
// (which import `node:fs/promises`) when erasing the type-only import.
// Turbopack's chunking still walks value re-exports in the barrel even
// when the import is `import type`, hence the deep path.
import type { IQuickReplayManifestEntry } from '@/replay-library/types';

import { GameSide, ReplaySource, type IGameEvent } from '@/types/gameplay';

/**
 * Inputs required to persist a completed quick game.
 *
 * `aiVariant` falls back to `enemyFaction` from the scenario config,
 * then to `'unknown'`. The Replay Library page (PR 6) renders this
 * field on quick rows; an empty string would surface as a blank cell.
 */
export interface IPersistQuickGameInput {
  readonly gameId: string;
  readonly events: readonly IGameEvent[];
  readonly winner: 'player' | 'opponent' | 'draw' | null;
  readonly aiVariant: string;
  /**
   * Optional override for the working directory. Tests inject a
   * tmpdir; production callers omit and we fall back to
   * `process.cwd()`. Browser callers SHOULD pass `undefined` so the
   * `typeof window` branch fires before any `process` access.
   */
  readonly cwd?: string;
}

/**
 * Result returned to the caller. `persisted` is `false` for browser
 * environments where the v1 persistence is a no-op — the React
 * component can surface a "saved to library" status from this signal
 * if the UX wants to differentiate.
 */
export interface IPersistQuickGameResult {
  readonly persisted: boolean;
  readonly path: string | null;
  readonly manifestEntry: IQuickReplayManifestEntry | null;
}

/**
 * Detect whether we should perform a real filesystem write. Three gates:
 *
 *   1. Node runtime is available (`process.versions.node` set).
 *   2. EITHER an explicit `cwd` was passed (unit tests for this module
 *      opt in to the write path with a tmpdir) OR `NODE_ENV !== 'test'`
 *      (production code paths).
 *
 * Why both: jest's jsdom runtime is technically Node, so without the
 * NODE_ENV gate every `QuickGameResults.test.tsx` render that mounts
 * the persist effect would dump a real file under `simulation-reports/`
 * in the repo root. Component tests don't pass `cwd`; unit tests for
 * this module always do.
 *
 * Browser builds fail the Node check and short-circuit to the no-op
 * path immediately — no `process` access in the browser bundle.
 */
function shouldPersistToDisk(cwdProvided: boolean): boolean {
  const isNode =
    typeof process !== 'undefined' &&
    typeof (process as { versions?: { node?: string } }).versions?.node ===
      'string';
  if (!isNode) return false;
  if (cwdProvided) return true;
  // Production / dev — write. Tests without explicit cwd — no-op.
  return process.env.NODE_ENV !== 'test';
}

/**
 * Stamp `replaySource: ReplaySource.Quick` on every event that does
 * not already have one. Preserves any explicit value so a future
 * emitter can override (mirrors the `SimulationRunner.run()` post-
 * stamp pattern from PR 4).
 */
function stampQuickReplaySource(
  events: readonly IGameEvent[],
): readonly IGameEvent[] {
  return events.map((event) =>
    event.replaySource !== undefined
      ? event
      : { ...event, replaySource: ReplaySource.Quick },
  );
}

/**
 * Count `turn_started` events. Used as the `turns` fallback when the
 * `GameEnded.turns` field is missing — same ladder the swarm manifest
 * builder uses (PR 4) so build-time and read-time agree.
 */
function countTurnStartedEvents(events: readonly IGameEvent[]): number {
  let count = 0;
  for (const event of events) {
    // Use the typed enum from the existing GameEventType import path.
    // Avoid re-importing it here to keep the module tree small — we
    // string-compare the type field which is the wire shape.
    if (event.type === 'turn_started') {
      count += 1;
    }
  }
  return count;
}

/**
 * Build the `IQuickReplayManifestEntry` from a completed quick-game
 * session. Pure — no IO. Exported so the React component can render
 * an optimistic "saved" UI cell from the same shape that lands in
 * `replay-index.json`.
 */
export function buildQuickManifestEntry(
  input: IPersistQuickGameInput,
): IQuickReplayManifestEntry {
  const { gameId, events, winner, aiVariant } = input;

  // Winner: collapse 'draw' (and missing) to null per the manifest
  // entry contract. Quick games can end in a draw if the turn limit
  // is reached without destruction, so this is a real path.
  let manifestWinner: GameSide | null = null;
  if (winner === 'player') manifestWinner = GameSide.Player;
  else if (winner === 'opponent') manifestWinner = GameSide.Opponent;

  // Turns: count of turn_started events. Quick game store doesn't
  // emit a final GameEnded.turns explicitly; the count is the most
  // robust derivation. Fallback to 0 for crashed-before-turn-1 runs.
  const turns = countTurnStartedEvents(events);

  // BV total: per Council Decision 3 + Momus MUST RESOLVE #1, BV is
  // computed at write time. Quick games don't have a force-generator
  // `stats.totalBV` directly accessible from the events, so for v1
  // we sum across whatever payload.units[].bv values are on the
  // GameCreated event. Falls back to 0 if no GameCreated or no bv
  // fields — in which case the Library page row shows BV: 0 and a
  // future PR can plumb the real number through.
  let bvTotal = 0;
  for (const event of events) {
    if (event.type === 'game_created') {
      const payload = event.payload as {
        units?: ReadonlyArray<{ bv?: number }>;
      };
      if (payload.units !== undefined) {
        bvTotal = payload.units.reduce((sum, u) => sum + (u.bv ?? 0), 0);
      }
      break;
    }
  }

  return {
    id: gameId,
    replaySource: ReplaySource.Quick,
    path: `quick/${gameId}.jsonl`,
    createdAt: new Date().toISOString(),
    turns,
    winner: manifestWinner,
    bvTotal,
    playerSide: GameSide.Player,
    aiVariant: aiVariant.length > 0 ? aiVariant : 'unknown',
  };
}

/**
 * Persist a completed quick game to disk + append a manifest entry.
 * Browser builds short-circuit to a no-op (v1 — IndexedDB follow-on
 * planned).
 *
 * Caller MUST guard against double-invocation — the React component
 * uses a ref+effect pattern so this is called exactly once per
 * `endedAt` transition.
 */
export async function persistQuickGame(
  input: IPersistQuickGameInput,
): Promise<IPersistQuickGameResult> {
  if (!shouldPersistToDisk(input.cwd !== undefined)) {
    // Browser build OR component test without explicit cwd — return a
    // no-op result so the UI can render a "saved locally to session"
    // message instead of "saved to library", and component tests don't
    // dump real files under `simulation-reports/` in the repo root.
    return { persisted: false, path: null, manifestEntry: null };
  }

  // Build the manifest entry BEFORE any disk IO (audit 2026-06-09
  // W5.2): the builder reads `game_created.payload.units`, so a
  // malformed event throws here — with the old write-then-build order
  // that throw landed AFTER the JSONL write, leaving an orphan file the
  // manifest never references.
  const manifestEntry = buildQuickManifestEntry(input);

  // Lazy-import the Node-only modules so the browser bundle never
  // pulls them in. `await import` returns the module namespace; the
  // bundler tree-shakes the dynamic-import branch when statically
  // confident the runtime is browser.
  const { writeFile, mkdir } = await import('node:fs/promises');
  const path = await import('node:path');
  // Deep import (not the barrel) so the static-trace path in the
  // browser bundler never sees `node:fs/promises`. The dynamic
  // `await import` is sufficient on its own only when the bundler
  // skips the barrel; since Turbopack walks value re-exports through
  // the barrel statically, we go directly to the source.
  const { appendManifestEntry } = await import('@/replay-library/index-writer');

  const stampedEvents = stampQuickReplaySource(input.events);
  const partitionDir = path.resolve(
    input.cwd ?? process.cwd(),
    'simulation-reports',
    'quick',
  );
  await mkdir(partitionDir, { recursive: true });
  // NDJSON: one JSON-encoded event per line, `\n` separator, no trailing
  // newline (matches the swarm format from PR 4).
  const body = stampedEvents.map((event) => JSON.stringify(event)).join('\n');
  const filePath = path.resolve(partitionDir, `${input.gameId}.jsonl`);
  await writeFile(filePath, body, 'utf-8');

  await appendManifestEntry(manifestEntry, { cwd: input.cwd });

  return { persisted: true, path: filePath, manifestEntry };
}
