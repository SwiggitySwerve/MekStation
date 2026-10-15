import { createReadStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';

import type {
  GameEventType,
  IGameEndedPayload,
  IGameEvent,
} from '@/types/gameplay';

import { GameSide, ReplaySource } from '@/types/gameplay';
import { logger } from '@/utils/logger';

import type { IDerivedBaseFields, IFileSummary } from './backfill-scan.types';
import type { IReplayManifestEntry, ISwarmReplayManifestEntry } from './types';

import {
  buildEncounterEntry,
  buildPlaceholderEntry,
  buildQuickEntry,
  buildSwarmEntry,
} from './backfill-scan.builders';
import { replayTurnCount, replayBvTotal } from './eventMetadata';
export type { IDerivedBaseFields, IFileSummary } from './backfill-scan.types';
export interface IScanReplayDirectoryOptions {
  readonly cwd?: string;
}
export async function scanReplayDirectory(
  options: IScanReplayDirectoryOptions = {},
): Promise<readonly IReplayManifestEntry[]> {
  const cwd = options.cwd ?? process.cwd();
  const reportsRoot = path.resolve(cwd, 'simulation-reports');
  try {
    await fs.access(reportsRoot);
  } catch {
    return [];
  }
  const entries: IReplayManifestEntry[] = [];
  for (const source of Object.values(ReplaySource)) {
    const sourceDir = path.join(reportsRoot, source);
    const partitionEntries = await scanPartitionDirectory(
      sourceDir,
      source,
      reportsRoot,
    );
    entries.push(...partitionEntries);
  }
  const legacyEntries = await scanLegacyDirectory(reportsRoot);
  entries.push(...legacyEntries);
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}
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
    case ReplaySource.Encounter:
      return buildEncounterEntry(gameId, baseFields, summary);
    case ReplaySource.PvP:
    case ReplaySource.Campaign:
      return buildPlaceholderEntry(gameId, source, baseFields);
    default: {
      const _exhaustive: never = source;
      throw new Error(
        `unhandled ReplaySource in backfill: ${String(_exhaustive)}`,
      );
    }
  }
}
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
    configName: '',
    seed: 0,
    batchTimestamp: parentTimestamp,
  };
}
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
async function deriveBaseFields(
  filePath: string,
  summary: IFileSummary,
  relativePath: string,
): Promise<IDerivedBaseFields> {
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
function resolveWinner(gameEnded: IGameEvent | null): GameSide | null {
  if (!gameEnded) return null;
  const payload = gameEnded.payload as IGameEndedPayload;
  if (payload.winner === 'draw') return null;
  if (payload.winner === GameSide.Player) return GameSide.Player;
  if (payload.winner === GameSide.Opponent) return GameSide.Opponent;
  return null;
}
function resolveTurns(summary: IFileSummary): number {
  const events: IGameEvent[] = [];
  for (const line of summary.lines) {
    try {
      const event: unknown = JSON.parse(line);
      if (event && typeof event === 'object' && !Array.isArray(event))
        events.push(event as IGameEvent);
    } catch {
      continue;
    }
  }
  return replayTurnCount(events);
}
function computeBvTotal(
  gameCreated: IGameEvent | null,
  relativePath: string,
): number {
  const total = replayBvTotal(gameCreated);
  if (total !== undefined) return total;
  logger.debug('[replay-library] backfill could not derive bvTotal', {
    relativePath,
  });
  return 0;
}
