import {
  matchLogStorage,
  type IPurgeOldMatchesResult,
} from './matchLogStorage';

export interface IMatchLogMaintenanceStorage {
  purgeOldMatches(retentionMs?: number): Promise<IPurgeOldMatchesResult>;
}

export interface IMatchLogMaintenanceOptions {
  readonly storage?: IMatchLogMaintenanceStorage;
  readonly logger?: Pick<Console, 'error'>;
}

declare global {
  interface Window {
    __mekstationDebug?: {
      purgeOldMatches?: (
        retentionMs?: number,
      ) => Promise<IPurgeOldMatchesResult>;
      [key: string]: unknown;
    };
  }
}

export function installMatchLogMaintenance(
  options: IMatchLogMaintenanceOptions = {},
): void {
  if (typeof window === 'undefined') return;

  const storage = options.storage ?? matchLogStorage;
  const logger = options.logger ?? console;

  void storage.purgeOldMatches().catch((error: unknown) => {
    logger.error('Failed to purge old match logs', error);
  });

  window.__mekstationDebug = {
    ...(window.__mekstationDebug ?? {}),
    purgeOldMatches: (retentionMs?: number) =>
      storage.purgeOldMatches(retentionMs),
  };
}

export {};
