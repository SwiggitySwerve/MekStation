import type { ScenarioTemplateType } from '@/types/encounter/EncounterInterfaces';

import { GameSide, ReplaySource } from '@/types/gameplay';
import { logger } from '@/utils/logger';

import type { IDerivedBaseFields, IFileSummary } from './backfill-scan.types';
import type {
  IEncounterReplayManifestEntry,
  IQuickReplayManifestEntry,
  IReplayManifestEntry,
  ISwarmReplayManifestEntry,
} from './types';

export function buildSwarmEntry(
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

export function buildQuickEntry(
  gameId: string,
  baseFields: IDerivedBaseFields,
  summary: IFileSummary,
): IQuickReplayManifestEntry {
  const created = summary.gameCreated;
  const meta = (created?.payload as { quickMeta?: unknown } | undefined)
    ?.quickMeta as { playerSide?: GameSide; aiVariant?: string } | undefined;
  if (!meta) {
    logger.debug(
      '[replay-library] backfill quick entry missing quickMeta - using fallbacks',
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

export function buildEncounterEntry(
  gameId: string,
  baseFields: IDerivedBaseFields,
  summary: IFileSummary,
): IEncounterReplayManifestEntry {
  const created = summary.gameCreated;
  const meta = (created?.payload as { encounterMeta?: unknown } | undefined)
    ?.encounterMeta as
    | {
        encounterId?: string;
        encounterName?: string;
        templateType?: ScenarioTemplateType | null;
        playerForceSummary?: string;
        opponentSummary?: string;
      }
    | undefined;
  if (!meta) {
    logger.debug(
      '[replay-library] backfill encounter entry missing encounterMeta - using fallbacks',
      { gameId },
    );
  }
  return {
    id: gameId,
    replaySource: ReplaySource.Encounter,
    path: baseFields.path,
    createdAt: baseFields.createdAt,
    turns: baseFields.turns,
    winner: baseFields.winner,
    bvTotal: baseFields.bvTotal,
    encounterId: meta?.encounterId ?? '',
    encounterName: meta?.encounterName ?? '',
    templateType: meta?.templateType === undefined ? null : meta.templateType,
    playerForceSummary: meta?.playerForceSummary ?? '',
    opponentSummary: meta?.opponentSummary ?? '',
  };
}

export function buildPlaceholderEntry(
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
