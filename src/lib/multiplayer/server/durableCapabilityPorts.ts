/**
 * DurableMatchStore capability compose (seam 2.2-COMPOSE).
 *
 * this.db is the match file (multiplayer-matches.db). Branch,
 * participant, and cursor tables live in SQLiteService's campaign
 * database. Building the branch store on this.db would either throw
 * "no such table" or, worse, grow an event_history_branches table
 * beside the match log.
 */

import type Database from 'better-sqlite3';

import type {
  EventHistoryBranchStatus,
  IEventHistoryBranch,
  IEventHistoryStreamRef,
} from '@/lib/events/journal/EventHistoryBranchContract';
import type {
  ICampaignSessionParticipantPort,
  IEventHistoryBranchPort,
  IParticipantDeliveryCursorPort,
} from '@/lib/events/storeCapabilityPorts';

import { bindSqliteSessionPorts } from '@/lib/campaign/sync/journalCapabilityPorts';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

type CapabilityTarget = Partial<
  IEventHistoryBranchPort &
    ICampaignSessionParticipantPort &
    IParticipantDeliveryCursorPort
>;

export function bindDurableCapabilityPorts(
  store: CapabilityTarget,
  options: { readonly capabilityDb?: () => Database.Database },
): void {
  const getCapabilityDb =
    options.capabilityDb ?? (() => getSQLiteService().getDatabase());
  // Lazy: existing DurableMatchStore tests never initialize
  // SQLiteService, and must not start doing so just because the
  // methods now exist.
  let branches: SQLiteEventHistoryBranchStore | undefined;
  const branchStore = (): SQLiteEventHistoryBranchStore => {
    if (branches === undefined) {
      // Default seam stays production/disabled, same as the shipped store.
      branches = new SQLiteEventHistoryBranchStore(getCapabilityDb());
    }
    return branches;
  };
  Object.assign(store, {
    readBranch: (stream: IEventHistoryStreamRef, branchId: string) =>
      branchStore().readBranch(stream, branchId),
    requireBranch: (stream: IEventHistoryStreamRef, branchId: string) =>
      branchStore().requireBranch(stream, branchId),
    readEffectiveHead: (stream: IEventHistoryStreamRef) =>
      branchStore().readEffectiveHead(stream),
    requireEffectiveHead: (stream: IEventHistoryStreamRef) =>
      branchStore().requireEffectiveHead(stream),
    createBranch: (branch: IEventHistoryBranch) =>
      branchStore().createBranch(branch),
    transitionBranchStatus: (
      stream: IEventHistoryStreamRef,
      branchId: string,
      to: EventHistoryBranchStatus,
    ) => branchStore().transitionBranchStatus(stream, branchId, to),
  });
  bindSqliteSessionPorts(store, getCapabilityDb);
}
