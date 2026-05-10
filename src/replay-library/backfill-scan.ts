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

import type { IDerivedBaseFields, IFileSummary } from './backfill-scan.types';
import type { IReplayManifestEntry, ISwarmReplayManifestEntry } from './types';

import {
  buildEncounterEntry,
  buildPlaceholderEntry,
  buildQuickEntry,
  buildSwarmEntry,
} from './backfill-scan.builders';
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
  if (summary.gameEnded) {
    const payload = summary.gameEnded.payload as IGameEndedPayload;
    if (typeof payload.turns === 'number') {
      return payload.turns;
    }
  }
  let turnStartedCount = 0;
  for (const line of summary.lines) {
    if (!line.includes('turn_started')) continue;
    try {
      const parsed = JSON.parse(line) as IGameEvent;
      if (parsed.type === ('turn_started' as GameEventType)) {
        turnStartedCount += 1;
      }
    } catch {
      continue;
    }
  }
  return turnStartedCount;
}
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
    const bv = (unit as IGameUnit & { bv?: number }).bv;
    if (typeof bv === 'number' && Number.isFinite(bv)) {
      total += bv;
      foundAny = true;
    }
  }
  if (!foundAny) {
    logger.debug(
      '[replay-library] backfill could not derive bvTotal â€” no unit.bv field on GameCreated',
      { relativePath, unitCount: units.length },
    );
    return 0;
  }
  return total;
}
