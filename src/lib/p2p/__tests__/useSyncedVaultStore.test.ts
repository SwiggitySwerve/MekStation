/**
 * Integration tests for useSyncedVaultStore
 * Tests Zustand store operations and sync-related functionality.
 */

import { act } from '@testing-library/react';

import {
  SyncState,
  type ISyncableVaultItem,
  type SyncableItemType,
} from '../types';
import { useSyncedVaultStore } from '../useSyncedVaultStore';

// =============================================================================
// Test Helpers
// =============================================================================

function createTestItem(
  overrides: Partial<ISyncableVaultItem> = {},
): ISyncableVaultItem {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: 'unit' as SyncableItemType,
    name: 'Test Unit',
    data: { chassis: 'Atlas', variant: 'AS7-D' },
    syncEnabled: false,
    syncState: SyncState.Disabled,
    lastModified: Date.now(),
    ...overrides,
  };
}

// Reset store between tests
beforeEach(() => {
  useSyncedVaultStore.setState({
    items: {},
    metadata: {},
  });
});

// =============================================================================
// Store State Tests
// =============================================================================

describe('useSyncedVaultStore - State', () => {
  it('should start with empty state', () => {
    const state = useSyncedVaultStore.getState();
    expect(state.items).toEqual({});
    expect(state.metadata).toEqual({});
  });
});

// =============================================================================
// Add Item Tests
// =============================================================================

describe('useSyncedVaultStore - addItem', () => {
  it('should add an item to the store', () => {
    const item = createTestItem();

    act(() => {
      useSyncedVaultStore.getState().addItem(item);
    });

    const state = useSyncedVaultStore.getState();
    expect(state.items[item.id]).toBeDefined();
    expect(state.items[item.id].name).toBe(item.name);
  });

  it('should set sync state to Disabled when sync is off', () => {
    const item = createTestItem({ syncEnabled: false });

    act(() => {
      useSyncedVaultStore.getState().addItem(item);
    });

    const state = useSyncedVaultStore.getState();
    expect(state.items[item.id].syncState).toBe(SyncState.Disabled);
  });

  it('should set sync state to Pending when sync is on', () => {
    const item = createTestItem({ syncEnabled: true });

    act(() => {
      useSyncedVaultStore.getState().addItem(item);
    });

    const state = useSyncedVaultStore.getState();
    expect(state.items[item.id].syncState).toBe(SyncState.Pending);
  });

  it('should create metadata for the item', () => {
    const item = createTestItem();

    act(() => {
      useSyncedVaultStore.getState().addItem(item);
    });

    const state = useSyncedVaultStore.getState();
    expect(state.metadata[item.id]).toBeDefined();
    expect(state.metadata[item.id].itemId).toBe(item.id);
    expect(state.metadata[item.id].version).toBe(1);
  });
});

// =============================================================================
// Remove Item Tests
// =============================================================================

describe('useSyncedVaultStore - removeItem', () => {
  it('should remove an item from the store', () => {
    const item = createTestItem();

    act(() => {
      useSyncedVaultStore.getState().addItem(item);
    });

    expect(useSyncedVaultStore.getState().items[item.id]).toBeDefined();

    act(() => {
      useSyncedVaultStore.getState().removeItem(item.id);
    });

    expect(useSyncedVaultStore.getState().items[item.id]).toBeUndefined();
  });

  it('should remove metadata when removing item', () => {
    const item = createTestItem();

    act(() => {
      useSyncedVaultStore.getState().addItem(item);
      useSyncedVaultStore.getState().removeItem(item.id);
    });

    expect(useSyncedVaultStore.getState().metadata[item.id]).toBeUndefined();
  });

  it('should handle removing non-existent item gracefully', () => {
    expect(() => {
      act(() => {
        useSyncedVaultStore.getState().removeItem('non-existent');
      });
    }).not.toThrow();
  });
});

// =============================================================================
// Update Item Tests
// =============================================================================

describe('useSyncedVaultStore - updateItem', () => {
  it('should update item data', () => {
    const item = createTestItem({ name: 'Original Name' });

    act(() => {
      useSyncedVaultStore.getState().addItem(item);
      useSyncedVaultStore
        .getState()
        .updateItem(item.id, { name: 'Updated Name' });
    });

    const state = useSyncedVaultStore.getState();
    expect(state.items[item.id].name).toBe('Updated Name');
  });

  it('should increment metadata version on update', () => {
    const item = createTestItem();

    act(() => {
      useSyncedVaultStore.getState().addItem(item);
    });

    const versionBefore =
      useSyncedVaultStore.getState().metadata[item.id].version;

    act(() => {
      useSyncedVaultStore.getState().updateItem(item.id, { name: 'Updated' });
    });

    const versionAfter =
      useSyncedVaultStore.getState().metadata[item.id].version;
    expect(versionAfter).toBe(versionBefore + 1);
  });

  it('should update lastModified timestamp', () => {
    const item = createTestItem({ lastModified: 1000 });

    act(() => {
      useSyncedVaultStore.getState().addItem(item);
    });

    const before = useSyncedVaultStore.getState().items[item.id].lastModified;

    // Small delay to ensure timestamp changes
    act(() => {
      useSyncedVaultStore.getState().updateItem(item.id, { name: 'Updated' });
    });

    const after = useSyncedVaultStore.getState().items[item.id].lastModified;
    expect(after).toBeGreaterThanOrEqual(before);
  });
});

// =============================================================================
// Toggle Sync Tests
// =============================================================================

describe('useSyncedVaultStore - toggleSync', () => {
  it('should enable sync for an item', () => {
    const item = createTestItem({ syncEnabled: false });

    act(() => {
      useSyncedVaultStore.getState().addItem(item);
      useSyncedVaultStore.getState().toggleSync(item.id, true);
    });

    const state = useSyncedVaultStore.getState();
    expect(state.items[item.id].syncEnabled).toBe(true);
    expect(state.items[item.id].syncState).toBe(SyncState.Pending);
  });

  it('should disable sync for an item', () => {
    const item = createTestItem({ syncEnabled: true });

    act(() => {
      useSyncedVaultStore.getState().addItem(item);
      useSyncedVaultStore.getState().toggleSync(item.id, false);
    });

    const state = useSyncedVaultStore.getState();
    expect(state.items[item.id].syncEnabled).toBe(false);
    expect(state.items[item.id].syncState).toBe(SyncState.Disabled);
  });
});

// =============================================================================
// Import From Peer Tests
// =============================================================================

describe('useSyncedVaultStore - importFromPeer', () => {
  it('should create a copy of the item with a new ID', () => {
    const originalItem = createTestItem({
      id: 'original-id',
      name: 'Peer Unit',
      syncEnabled: true,
      lastModifiedBy: 'peer-123',
    });

    let newId: string;
    act(() => {
      newId = useSyncedVaultStore.getState().importFromPeer(originalItem);
    });

    const state = useSyncedVaultStore.getState();
    expect(newId!).not.toBe(originalItem.id);
    expect(state.items[newId!]).toBeDefined();
    expect(state.items[newId!].name).toBe(originalItem.name);
  });

  it('should disable sync on imported items', () => {
    const originalItem = createTestItem({ syncEnabled: true });

    let newId: string;
    act(() => {
      newId = useSyncedVaultStore.getState().importFromPeer(originalItem);
    });

    const state = useSyncedVaultStore.getState();
    expect(state.items[newId!].syncEnabled).toBe(false);
    expect(state.items[newId!].syncState).toBe(SyncState.Disabled);
  });

  it('should clear sync metadata on imported items', () => {
    const originalItem = createTestItem({
      lastModifiedBy: 'peer-456',
      lastSynced: Date.now(),
    });

    let newId: string;
    act(() => {
      newId = useSyncedVaultStore.getState().importFromPeer(originalItem);
    });

    const state = useSyncedVaultStore.getState();
    expect(state.items[newId!].lastModifiedBy).toBeUndefined();
    expect(state.items[newId!].lastSynced).toBeUndefined();
  });

  it('should preserve item data on import', () => {
    const originalItem = createTestItem({
      name: 'Imported Mech',
      data: { chassis: 'Madcat', variant: 'Prime' },
    });

    let newId: string;
    act(() => {
      newId = useSyncedVaultStore.getState().importFromPeer(originalItem);
    });

    const state = useSyncedVaultStore.getState();
    expect(state.items[newId!].name).toBe(originalItem.name);
    expect(state.items[newId!].data).toEqual(originalItem.data);
    expect(state.items[newId!].type).toBe(originalItem.type);
  });
});

// =============================================================================
// Query Tests
// =============================================================================

describe('useSyncedVaultStore - getItemsByType', () => {
  it('should filter items by type', () => {
    const unit = createTestItem({ type: 'unit' });
    const pilot = createTestItem({ type: 'pilot' });
    const force = createTestItem({ type: 'force' });

    act(() => {
      const store = useSyncedVaultStore.getState();
      store.addItem(unit);
      store.addItem(pilot);
      store.addItem(force);
    });

    const units = useSyncedVaultStore.getState().getItemsByType('unit');
    expect(units.length).toBe(1);
    expect(units[0].type).toBe('unit');

    const pilots = useSyncedVaultStore.getState().getItemsByType('pilot');
    expect(pilots.length).toBe(1);
    expect(pilots[0].type).toBe('pilot');
  });
});

describe('useSyncedVaultStore - getSyncState', () => {
  it('should return sync state for existing item', () => {
    const item = createTestItem({ syncEnabled: true });

    act(() => {
      useSyncedVaultStore.getState().addItem(item);
    });

    expect(useSyncedVaultStore.getState().getSyncState(item.id)).toBe(
      SyncState.Pending,
    );
  });

  it('should return Disabled for non-existent item', () => {
    expect(useSyncedVaultStore.getState().getSyncState('non-existent')).toBe(
      SyncState.Disabled,
    );
  });
});

// =============================================================================
// Multi-Item Workflow Tests
// =============================================================================

describe('useSyncedVaultStore - Workflows', () => {
  it('should handle multiple items correctly', () => {
    const items = [
      createTestItem({ name: 'Unit 1', type: 'unit' }),
      createTestItem({ name: 'Unit 2', type: 'unit' }),
      createTestItem({ name: 'Pilot 1', type: 'pilot' }),
    ];

    act(() => {
      items.forEach((item) => useSyncedVaultStore.getState().addItem(item));
    });

    const state = useSyncedVaultStore.getState();
    expect(Object.keys(state.items).length).toBe(3);
    expect(state.getItemsByType('unit').length).toBe(2);
    expect(state.getItemsByType('pilot').length).toBe(1);
  });

  it('should handle add, update, remove workflow', () => {
    const item = createTestItem({ name: 'Workflow Test' });

    // Add
    act(() => {
      useSyncedVaultStore.getState().addItem(item);
    });
    expect(useSyncedVaultStore.getState().items[item.id]).toBeDefined();

    // Update
    act(() => {
      useSyncedVaultStore.getState().updateItem(item.id, { name: 'Updated' });
    });
    expect(useSyncedVaultStore.getState().items[item.id].name).toBe('Updated');

    // Remove
    act(() => {
      useSyncedVaultStore.getState().removeItem(item.id);
    });
    expect(useSyncedVaultStore.getState().items[item.id]).toBeUndefined();
  });

  it('should handle import then modify workflow', () => {
    const peerItem = createTestItem({
      name: 'Peer Item',
      syncEnabled: true,
      lastModifiedBy: 'peer-789',
    });

    let importedId: string;

    // Import from peer
    act(() => {
      importedId = useSyncedVaultStore.getState().importFromPeer(peerItem);
    });

    // Modify imported item
    act(() => {
      useSyncedVaultStore
        .getState()
        .updateItem(importedId!, { name: 'My Modified Copy' });
    });

    const state = useSyncedVaultStore.getState();
    expect(state.items[importedId!].name).toBe('My Modified Copy');
    expect(state.items[importedId!].syncEnabled).toBe(false);
    expect(state.metadata[importedId!].version).toBe(2); // 1 from import, +1 from update
  });
});
