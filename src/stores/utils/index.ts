/**
 * Store Utilities
 *
 * Shared utilities for Zustand stores.
 */

export {
  clientSafeStorage,
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
} from './clientSafeStorage';
export {
  createStoreRegistry,
  type BaseStoreState,
  type StoreRegistryConfig,
  type StoreRegistry,
} from './createStoreRegistry';
