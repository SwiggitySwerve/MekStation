/**
 * Encounter-game persistence pipeline. Per `link-encounters-to-replays`
 * PR 2 (replay-library spec — Filesystem Partition Layout extended with
 * the `encounter/` partition; game-session-management spec — Encounter
 * Game Event Log Persistence ADDED): when an encounter session reaches
 * a terminal state (`endedAt` is set), persist its full event log to
 * `simulation-reports/encounter/<gameId>.jsonl` and append an
 * `IEncounterReplayManifestEntry` to the central replay-index.json.
 *
 * Mirrors `src/components/quickgame/persistQuickGame.ts` line-for-line
 * where applicable. Per design.md decision: do NOT extract a shared
 * helper — the source-specific fields differ (encounter metadata vs
 * `aiVariant`) and the post-stamp uses a different `ReplaySource`
 * discriminator. Two parallel modules > one over-abstracted shared one.
 *
 * Env-aware IO: this module is imported by service code that runs in
 * the browser (and in Node test envs). Browser builds get a no-op
 * persistence layer for v1 — IndexedDB-backed implementation is a
 * follow-on PR. Node test envs go through the same `node:fs/promises`
 * + `appendManifestEntry` pipeline the swarm runner uses.
 *
 * Post-stamping `replaySource: ReplaySource.Encounter` happens at the
 * boundary here (mirrors the persistQuickGame pattern from PR 5 of
 * add-replay-library): events on the wire carry the discriminator
 * without needing every `createGameEvent` callsite to thread it.
 *
 * Note on `encounterMeta`: PR 1's `buildEncounterEntry` in
 * `backfill-scan.ts` reads `GameCreated.payload.encounterMeta` to
 * recover the per-encounter fields when re-scanning the disk. This
 * pipeline writes the manifest entry directly off the input fields
 * (no need to read it back from `encounterMeta`); the encounter meta
 * lives on the GameCreated event because PR 3 of this change stamps
 * it onto the payload at session creation in `EncounterService`.
 * Backfill remains the recovery path for files written before the
 * manifest existed (e.g. rebuilt fresh checkout); the persist path
 * here is the authoritative write.
 */

// Import the type from the deeper module path (not the barrel) so the
// browser bundler doesn't trace `index-reader.ts` / `index-writer.ts`
// (which import `node:fs/promises`) when erasing the type-only import.
// Turbopack's chunking still walks value re-exports in the barrel even
// when the import is `import type`, hence the deep path.
import type { IEncounterReplayManifestEntry } from '@/replay-library/types';
import type { ScenarioTemplateType } from '@/types/encounter/EncounterInterfaces';

import { GameSide, ReplaySource, type IGameEvent } from '@/types/gameplay';

/**
 * Inputs required to persist a completed encounter game.
 *
 * The five encounter-specific fields (`encounterId`, `encounterName`,
 * `templateType`, `playerForceSummary`, `opponentSummary`) are
 * snapshot-at-launch values — see proposal §"Why summary strings, not
 * force IDs" for the immutability rationale (renaming or deleting a
 * force after the fact does not mutate the historical row).
 */
export interface IPersistEncounterGameInput {
  readonly gameId: string;
  readonly events: readonly IGameEvent[];
  readonly winner: 'player' | 'opponent' | 'draw' | null;
  readonly encounterId: string;
  readonly encounterName: string;
  readonly templateType: ScenarioTemplateType | null;
  readonly playerForceSummary: string;
  readonly opponentSummary: string;
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
export interface IPersistEncounterGameResult {
  readonly persisted: boolean;
  readonly path: string | null;
  readonly manifestEntry: IEncounterReplayManifestEntry | null;
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
 * NODE_ENV gate every component test that mounts the persist effect
 * would dump a real file under `simulation-reports/` in the repo root.
 * Component tests don't pass `cwd`; unit tests for this module always
 * do.
 *
 * Browser builds fail the Node check and short-circuit to the no-op
 * path immediately — no `process` access in the browser bundle.
 *
 * Duplicated from `persistQuickGame.ts` per design.md — shared helper
 * would couple two source-specific persist paths and is rejected.
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
 * Stamp `replaySource: ReplaySource.Encounter` on every event that does
 * not already have one. Preserves any explicit value so a future
 * emitter can override (mirrors the post-stamp pattern from
 * `persistQuickGame`).
 */
export function stampEncounterReplaySource(
  events: readonly IGameEvent[],
): readonly IGameEvent[] {
  return events.map((event) =>
    event.replaySource !== undefined
      ? event
      : { ...event, replaySource: ReplaySource.Encounter },
  );
}

/**
 * Count `turn_started` events. Used as the `turns` derivation — same
 * ladder the quick-game pipeline uses so build-time and read-time
 * agree.
 *
 * Duplicated from `persistQuickGame.ts` per design.md — shared helper
 * deferred until at least three call sites need the same logic.
 */
function countTurnStartedEvents(events: readonly IGameEvent[]): number {
  let count = 0;
  for (const event of events) {
    // String-compare against the wire shape rather than re-importing the
    // typed enum so the module tree stays small.
    if (event.type === 'turn_started') {
      count += 1;
    }
  }
  return count;
}

/**
 * Build the `IEncounterReplayManifestEntry` from a completed encounter
 * session. Pure — no IO. Exported so the service / route can render an
 * optimistic "saved" UI cell from the same shape that lands in
 * `replay-index.json`, and so the dedup branch in the API route can
 * return the same shape the persist branch would have produced.
 */
export function buildEncounterManifestEntry(
  input: IPersistEncounterGameInput,
): IEncounterReplayManifestEntry {
  const {
    gameId,
    events,
    winner,
    encounterId,
    encounterName,
    templateType,
    playerForceSummary,
    opponentSummary,
  } = input;

  // Winner: collapse 'draw' (and missing) to null per the manifest entry
  // contract. Encounter games can end in a draw if the turn limit is
  // reached without destruction, same as quick games.
  let manifestWinner: GameSide | null = null;
  if (winner === 'player') manifestWinner = GameSide.Player;
  else if (winner === 'opponent') manifestWinner = GameSide.Opponent;

  // Turns: count of turn_started events. Encounter sessions don't emit
  // a final GameEnded.turns explicitly today; the count is the most
  // robust derivation. Fallback to 0 for crashed-before-turn-1 runs.
  const turns = countTurnStartedEvents(events);

  // BV total: per Council Decision 3 + Momus MUST RESOLVE #1 from
  // add-replay-library, BV is computed at write time. Sum across
  // whatever payload.units[].bv values are on the GameCreated event.
  // Falls back to 0 if no GameCreated or no bv fields — in which case
  // the Library page row shows BV: 0 and a future PR can plumb the real
  // number through.
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
    replaySource: ReplaySource.Encounter,
    path: `encounter/${gameId}.jsonl`,
    createdAt: new Date().toISOString(),
    turns,
    winner: manifestWinner,
    bvTotal,
    encounterId,
    encounterName,
    templateType,
    playerForceSummary,
    opponentSummary,
  };
}

/**
 * Persist a completed encounter session to disk + append a manifest
 * entry. Browser builds short-circuit to a no-op (v1 — IndexedDB
 * follow-on planned).
 *
 * Caller MUST guard against double-invocation — the React component /
 * service hook uses a ref+effect or one-shot pattern so this is called
 * exactly once per `endedAt` transition. The API route does an
 * additional dedup check via `readReplayIndex` to defend against hard
 * refresh re-firing the persist effect on the client.
 */
export async function persistEncounterGame(
  input: IPersistEncounterGameInput,
): Promise<IPersistEncounterGameResult> {
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
  const manifestEntry = buildEncounterManifestEntry(input);

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

  const stampedEvents = stampEncounterReplaySource(input.events);
  const partitionDir = path.resolve(
    input.cwd ?? process.cwd(),
    'simulation-reports',
    'encounter',
  );
  await mkdir(partitionDir, { recursive: true });
  // NDJSON: one JSON-encoded event per line, `\n` separator, no trailing
  // newline (matches the swarm format from add-replay-library PR 4 +
  // the quick-game format from PR 5).
  const body = stampedEvents.map((event) => JSON.stringify(event)).join('\n');
  const filePath = path.resolve(partitionDir, `${input.gameId}.jsonl`);
  await writeFile(filePath, body, 'utf-8');

  await appendManifestEntry(manifestEntry, { cwd: input.cwd });

  return { persisted: true, path: filePath, manifestEntry };
}
