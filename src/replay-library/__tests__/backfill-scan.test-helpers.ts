/**
 * Tests for the backfill scan. Covers the four Backfill Scan spec scenarios:
 *
 *   1. Scan covers new partition layout (one swarm + one quick fixture)
 *   2. Scan covers legacy flat layout (one `games/<ts>/<id>.jsonl` fixture)
 *   3. `GameEnded.turns` optionality fallback (turn_started count, then 0)
 *   4. Scan is idempotent — two runs produce deep-equal arrays
 *
 * Plus several non-spec hardening cases:
 *   - Scan covers BOTH layouts simultaneously
 *   - Files without `GameCreated` are skipped with a debug log (no crash)
 *   - Empty `simulation-reports/` returns empty array
 *
 * Tests stage NDJSON fixtures into `os.tmpdir()` and pass the parent as `cwd`
 * so the scan resolves into a clean tmp tree per-test (jest --runInBand is
 * not assumed).
 */

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { GameEventType, GameSide, ReplaySource } from '@/types/gameplay';
import { disableTestMode, enableTestMode } from '@/utils/logger';

import type { IReplayManifestEntry } from '../types';

import { scanReplayDirectory } from '../backfill-scan';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/**
 * Builds an isolated tmp `cwd` containing an empty `simulation-reports/`.
 * Each test gets its own tmpdir so concurrent runs cannot stomp each other.
 */
export async function makeTmpCwd(): Promise<string> {
  const dir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'replay-library-backfill-'),
  );
  await fs.mkdir(path.join(dir, 'simulation-reports'), { recursive: true });
  return dir;
}

/**
 * Tiny helper around `fs.writeFile` that creates the parent directory tree
 * first — every fixture-write needs `recursive: true`.
 */
export async function writeNDJSON(
  filePath: string,
  events: ReadonlyArray<Record<string, unknown>>,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const body = events.map((e) => JSON.stringify(e)).join('\n');
  await fs.writeFile(filePath, body, 'utf8');
}

/**
 * Synthesizes a minimal `GameCreated` event — only the fields the backfill
 * scan reads. The spec's "stream-read enough lines" pattern means anything
 * we don't reference here is irrelevant to the test.
 */
export function gameCreatedEvent(
  gameId: string,
  units: ReadonlyArray<Record<string, unknown>>,
  extraPayload: Record<string, unknown> = {},
  timestamp = '2026-05-07T12:00:00.000Z',
): Record<string, unknown> {
  return {
    id: `${gameId}-evt-1`,
    gameId,
    sequence: 1,
    timestamp,
    type: GameEventType.GameCreated,
    turn: 0,
    phase: 'initiative',
    payload: {
      config: {
        mapRadius: 8,
        turnLimit: 0,
        victoryConditions: [],
        optionalRules: [],
      },
      units,
      ...extraPayload,
    },
  };
}

/**
 * Synthesizes a `GameEnded` event. `turns` is optional so tests can exercise
 * the missing-field fallback.
 */
export function gameEndedEvent(
  gameId: string,
  winner: GameSide | 'draw',
  options: { turns?: number } = {},
  timestamp = '2026-05-07T12:30:00.000Z',
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    winner,
    reason: 'destruction',
  };
  if (typeof options.turns === 'number') {
    payload.turns = options.turns;
  }
  return {
    id: `${gameId}-evt-end`,
    gameId,
    sequence: 999,
    timestamp,
    type: GameEventType.GameEnded,
    turn: options.turns ?? 0,
    phase: 'end',
    payload,
  };
}

/**
 * Synthesizes a `TurnStarted` event — used when a fixture wants the
 * `turn_started`-count fallback to bite.
 */
export function turnStartedEvent(
  gameId: string,
  turn: number,
  sequence: number,
): Record<string, unknown> {
  return {
    id: `${gameId}-evt-turn-${turn}`,
    gameId,
    sequence,
    timestamp: '2026-05-07T12:10:00.000Z',
    type: GameEventType.TurnStarted,
    turn,
    phase: 'initiative',
    payload: {},
  };
}

// ---------------------------------------------------------------------------
// Spec scenarios
// ---------------------------------------------------------------------------

export { fs, os, path, GameSide, ReplaySource, scanReplayDirectory };
export type { IReplayManifestEntry };

export function setupBackfillScanTestMode(): jest.SpyInstance {
  enableTestMode();
  return jest.spyOn(console, 'debug').mockImplementation();
}

export function teardownBackfillScanTestMode(): void {
  disableTestMode();
  jest.restoreAllMocks();
}
