/**
 * Synced Vault Store
 *
 * Zustand store for vault items that sync via Yjs CRDT.
 * Bidirectionally syncs state between Zustand and Y.Map.
 *
 * @spec openspec/changes/add-p2p-vault-sync/specs/vault-sync/spec.md
 */

import * as Y from 'yjs';
import { create } from 'zustand';

import { getYMap, getActiveRoom, onSyncEvent } from './SyncProvider';
import {
  ISyncedVaultState,
  ISyncedVaultActions,
  ISyncableVaultItem,
  ISyncMetadata,
  SyncState,
  SyncableItemType,
} from './types';

// =============================================================================
// Store Type
// =============================================================================

type SyncedVaultStore = ISyncedVaultState & ISyncedVaultActions;

// =============================================================================
// Y.Map Sync Helpers
// =============================================================================

const VAULT_MAP_NAME = 'vault-items';
const METADATA_MAP_NAME = 'vault-metadata';

/**
 * Get the Yjs map for vault items.
 */
function getVaultYMap(): Y.Map<ISyncableVaultItem> | null {
  return getYMap<ISyncableVaultItem>(VAULT_MAP_NAME);
}

/**
 * Get the Yjs map for metadata.
 * Reserved for future use (conflict tracking, version vectors).
 */
function _getMetadataYMap(): Y.Map<ISyncMetadata> | null {
  return getYMap<ISyncMetadata>(METADATA_MAP_NAME);
}

/**
 * Sync an item to the Yjs document.
 */
function syncItemToYjs(item: ISyncableVaultItem): void {
  if (!item.syncEnabled) return;

  const ymap = getVaultYMap();
  if (!ymap) return;

  const room = getActiveRoom();
  if (!room) return;

  // Update Y.Map (will propagate to peers via CRDT)
  room.doc.transact(() => {
    ymap.set(item.id, {
      ...item,
      lastModifiedBy: String(room.webrtcProvider.awareness.clientID),
    });
  });
}

/**
 * Remove an item from the Yjs document.
 */
function removeItemFromYjs(id: string): void {
  const ymap = getVaultYMap();
  if (!ymap) return;

  const room = getActiveRoom();
  if (!room) return;

  room.doc.transact(() => {
    ymap.delete(id);
  });
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useSyncedVaultStore = create<SyncedVaultStore>()((set, get) => {
  // Set up Y.Map observer when room changes
  let unsubscribeYjs: (() => void) | null = null;

  onSyncEvent((event) => {
    if (event.type === 'connected') {
      // Set up Y.Map observer
      const ymap = getVaultYMap();
      if (ymap) {
        const observer = () => {
          // Sync Y.Map changes to Zustand
          const items: Record<string, ISyncableVaultItem> = {};
          ymap.forEach((value, key) => {
            items[key] = value;
          });
          set({ items });
        };

        ymap.observe(observer);
        unsubscribeYjs = () => ymap.unobserve(observer);

        // Initial sync from Y.Map
        observer();
      }
    }

    if (event.type === 'disconnected') {
      if (unsubscribeYjs) {
        unsubscribeYjs();
        unsubscribeYjs = null;
      }
    }
  });

  return {
    // State
    items: {},
    metadata: {},

    // Actions
    addItem: (item: ISyncableVaultItem) => {
      const now = Date.now();
      const newItem: ISyncableVaultItem = {
        ...item,
        lastModified: now,
        syncState: item.syncEnabled ? SyncState.Pending : SyncState.Disabled,
      };

      set((state) => ({
        items: { ...state.items, [item.id]: newItem },
        metadata: {
          ...state.metadata,
          [item.id]: {
            itemId: item.id,
            syncState: newItem.syncState,
            version: 1,
          },
        },
      }));

      if (item.syncEnabled) {
        syncItemToYjs(newItem);
      }
    },

    removeItem: (id: string) => {
      const item = get().items[id];
      if (!item) return;

      set((state) => {
        const { [id]: _removed, ...remainingItems } = state.items;
        const { [id]: _removedMeta, ...remainingMetadata } = state.metadata;
        return { items: remainingItems, metadata: remainingMetadata };
      });

      if (item.syncEnabled) {
        removeItemFromYjs(id);
      }
    },

    updateItem: (id: string, data: Partial<ISyncableVaultItem>) => {
      const item = get().items[id];
      if (!item) return;

      const now = Date.now();
      const updatedItem: ISyncableVaultItem = {
        ...item,
        ...data,
        lastModified: now,
        syncState: item.syncEnabled ? SyncState.Pending : SyncState.Disabled,
      };

      set((state) => ({
        items: { ...state.items, [id]: updatedItem },
        metadata: {
          ...state.metadata,
          [id]: {
            ...state.metadata[id],
            syncState: updatedItem.syncState,
            version: (state.metadata[id]?.version ?? 0) + 1,
          },
        },
      }));

      if (item.syncEnabled) {
        syncItemToYjs(updatedItem);
      }
    },

    toggleSync: (id: string, enabled: boolean) => {
      const item = get().items[id];
      if (!item) return;

      const now = Date.now();
      const updatedItem: ISyncableVaultItem = {
        ...item,
        syncEnabled: enabled,
        syncState: enabled ? SyncState.Pending : SyncState.Disabled,
        lastModified: now,
      };

      set((state) => ({
        items: { ...state.items, [id]: updatedItem },
        metadata: {
          ...state.metadata,
          [id]: {
            ...state.metadata[id],
            syncState: updatedItem.syncState,
          },
        },
      }));

      if (enabled) {
        syncItemToYjs(updatedItem);
      } else {
        removeItemFromYjs(id);
      }
    },

    getItemsByType: (type: SyncableItemType) => {
      return Object.values(get().items).filter((item) => item.type === type);
    },

    getSyncState: (id: string) => {
      return get().items[id]?.syncState ?? SyncState.Disabled;
    },

    /**
     * Import an item from a peer (one-time copy, sync disabled).
     * Creates a new local copy with a new ID.
     */
    importFromPeer: (item: ISyncableVaultItem): string => {
      const now = Date.now();
      // Generate new ID to avoid conflicts with the original
      const newId = `${item.type}-${now}-${Math.random().toString(36).slice(2, 9)}`;

      const importedItem: ISyncableVaultItem = {
        ...item,
        id: newId,
        syncEnabled: false, // Disable sync for imported items
        syncState: SyncState.Disabled,
        lastModified: now,
        lastSynced: undefined, // Clear sync metadata
        lastModifiedBy: undefined,
      };

      set((state) => ({
        items: { ...state.items, [newId]: importedItem },
        metadata: {
          ...state.metadata,
          [newId]: {
            itemId: newId,
            syncState: SyncState.Disabled,
            version: 1,
          },
        },
      }));

      return newId;
    },
  };
});

// =============================================================================
// Selector Hooks
// =============================================================================

/**
 * Get all synced items.
 */
export function useSyncedItems(): readonly ISyncableVaultItem[] {
  return useSyncedVaultStore((state) => Object.values(state.items));
}

/**
 * Get items by type.
 */
export function useSyncedItemsByType(
  type: SyncableItemType,
): readonly ISyncableVaultItem[] {
  return useSyncedVaultStore((state) =>
    Object.values(state.items).filter((item) => item.type === type),
  );
}

/**
 * Get synced units.
 */
export function useSyncedUnits(): readonly ISyncableVaultItem[] {
  return useSyncedItemsByType('unit');
}

/**
 * Get synced pilots.
 */
export function useSyncedPilots(): readonly ISyncableVaultItem[] {
  return useSyncedItemsByType('pilot');
}

/**
 * Get synced forces.
 */
export function useSyncedForces(): readonly ISyncableVaultItem[] {
  return useSyncedItemsByType('force');
}

/**
 * Get a single item by ID.
 */
export function useSyncedItem(id: string): ISyncableVaultItem | undefined {
  return useSyncedVaultStore((state) => state.items[id]);
}

/**
 * Get sync state for an item.
 */
export function useItemSyncState(id: string): SyncState {
  return useSyncedVaultStore(
    (state) => state.items[id]?.syncState ?? SyncState.Disabled,
  );
}
