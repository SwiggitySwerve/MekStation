/**
 * SyncEngine — shared callback types
 *
 * Leaf module that holds the storage-agnostic callback types the
 * SyncEngine class accepts. Extracting them breaks the
 * SyncEngine ↔ SyncEngine.conflictResolution circular import without
 * changing the public API (every name is re-exported from SyncEngine.ts).
 */

import type { ShareableContentType } from '@/types/vault';

/**
 * Content hash function type
 */
export type ContentHashFn = (
  itemId: string,
  contentType: ShareableContentType | 'folder',
) => Promise<string | null>;

/**
 * Content data function type
 */
export type ContentDataFn = (
  itemId: string,
  contentType: ShareableContentType | 'folder',
) => Promise<string | null>;

/**
 * Item name resolver — returns a human-readable display name for a
 * conflicting item so conflict records aren't labelled with raw ids.
 */
export type ItemNameFn = (
  itemId: string,
  contentType: ShareableContentType | 'folder',
) => Promise<string | null>;

/**
 * Content apply function — writes remote content back to local storage.
 * Registered by the caller that owns persistence (e.g. a vault store)
 * so the sync engine stays storage-agnostic.
 */
export type ContentApplyFn = (
  itemId: string,
  contentType: ShareableContentType | 'folder',
  data: string,
) => Promise<void>;
