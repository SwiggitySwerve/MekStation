/**
 * Quarantine for legacy session-keyed combat states (T1), kept OUTSIDE the
 * campaign payload so it never counts toward the page-close keepalive cap.
 *
 * Device-local: browser IndexedDB, keyed by campaign id. There is no
 * server-side store for it. Records are never pruned automatically.
 */

import type { ILegacyCombatStateQuarantineRecord } from '@/types/campaign/LegacyCombatStateMigration';

import { getIndexedDBService, STORES } from './IndexedDBService';

export interface ILegacyCombatStateQuarantineStore {
  /** Adds records; an identical record already stored is not duplicated. */
  put(
    campaignId: string,
    records: readonly ILegacyCombatStateQuarantineRecord[],
  ): Promise<void>;
  get(
    campaignId: string,
  ): Promise<readonly ILegacyCombatStateQuarantineRecord[]>;
}

function recordIdentity(record: ILegacyCombatStateQuarantineRecord): string {
  return record.source === 'combat-state'
    ? JSON.stringify([record.source, record.sessionUnitId, record.original])
    : JSON.stringify([record.source, record.sessionUnitId, record.matchId]);
}

export function createIndexedDbLegacyCombatStateQuarantineStore(
  service = getIndexedDBService(),
): ILegacyCombatStateQuarantineStore {
  const get = async (
    campaignId: string,
  ): Promise<readonly ILegacyCombatStateQuarantineRecord[]> => {
    await service.initialize();
    return (
      (await service.get<readonly ILegacyCombatStateQuarantineRecord[]>(
        STORES.LEGACY_COMBAT_STATE_QUARANTINE,
        campaignId,
      )) ?? []
    );
  };
  return {
    get,
    put: async (campaignId, records) => {
      await service.initialize();
      // One readwrite transaction: concurrent puts (several legacy outcomes
      // applied in one day) cannot overwrite each other's records.
      await service.update<readonly ILegacyCombatStateQuarantineRecord[]>(
        STORES.LEGACY_COMBAT_STATE_QUARANTINE,
        campaignId,
        (existing = []) => {
          const known = new Set(existing.map(recordIdentity));
          const added = records.filter(
            (record) => !known.has(recordIdentity(record)),
          );
          return added.length === 0 ? existing : [...existing, ...added];
        },
      );
    },
  };
}
