import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

export const MATCH_LOG_DB_NAME = 'mekstation-match-log';
export const MATCH_LOG_DB_VERSION = 2;
export const MATCH_LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export const MATCH_LOG_STORES = {
  MATCH_EVENTS: 'matchEvents',
  MATCHES: 'matches',
} as const;

export type MatchLogStoreName =
  (typeof MATCH_LOG_STORES)[keyof typeof MATCH_LOG_STORES];

export type MatchLogStatus = 'active' | 'completed' | 'abandoned';

export interface IMatchEventRecord {
  readonly matchId: string;
  readonly sequence: number;
  readonly event: IGameEvent;
  readonly savedAt: string;
}

export interface IMatchMetadataRecord {
  readonly matchId: string;
  readonly hostPeerId: string | null;
  readonly guestPeerId: string | null;
  readonly status: MatchLogStatus;
  readonly lastActivity: string;
}

export interface IMatchMetadataUpsert {
  readonly matchId: string;
  readonly hostPeerId?: string | null;
  readonly guestPeerId?: string | null;
  readonly status?: MatchLogStatus;
  readonly lastActivity?: string;
}

export interface IPurgeOldMatchesResult {
  readonly purgedMatchIds: readonly string[];
  readonly purgedEventCount: number;
}

export interface IMatchLogFlushInfo {
  readonly recordCount: number;
  readonly matchIds: readonly string[];
}

export interface IMatchLogStorageOptions {
  readonly dbName?: string;
  readonly dbVersion?: number;
  readonly indexedDB?: IDBFactory;
  readonly now?: () => string;
  readonly scheduleFrame?: (callback: () => void) => void;
  readonly onFlushTransaction?: (info: IMatchLogFlushInfo) => void;
}

export class MatchLogStorageUnavailableError extends Error {
  constructor() {
    super('IndexedDB is unavailable in this environment');
    this.name = 'MatchLogStorageUnavailableError';
  }
}

export class MatchLogStorageError extends Error {
  readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'MatchLogStorageError';
    this.originalError = originalError;
  }
}
