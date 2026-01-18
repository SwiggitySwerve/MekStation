/**
 * Import Service
 *
 * Handles importing bundles, conflict detection, and ID remapping.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IShareableBundle,
  IImportOptions,
  IImportResult,
  IImportConflict,
  IImportSource,
  ShareableContentType,
} from '@/types/vault';
import {
  parseBundle,
  parseBundleFromBytes,
  parseAndVerifyBundle,
  validateBundleMetadata,
} from './BundleService';

// =============================================================================
// Types
// =============================================================================

/**
 * Function to check if an ID already exists
 */
export type ExistsChecker = (id: string) => Promise<boolean>;

/**
 * Function to find item by name for conflict detection
 */
export type NameChecker = (name: string) => Promise<{ id: string; name: string } | null>;

/**
 * Function to save an imported item
 */
export type ItemSaver<T> = (item: T, source: IImportSource) => Promise<string>;

/**
 * Import handlers for different content types
 */
export interface IImportHandlers<T> {
  checkExists: ExistsChecker;
  checkNameConflict: NameChecker;
  save: ItemSaver<T>;
}

// =============================================================================
// Import Processing
// =============================================================================

/**
 * Import a bundle from a string
 */
export async function importFromString<T>(
  data: string,
  handlers: IImportHandlers<T>,
  options: IImportOptions = { conflictResolution: 'ask' }
): Promise<IImportResult> {
  try {
    const bundle = parseBundle(data);
    return importBundle<T>(bundle, handlers, options);
  } catch (error) {
    return {
      success: false,
      importedCount: 0,
      skippedCount: 0,
      replacedCount: 0,
      error: error instanceof Error ? error.message : 'Failed to parse bundle',
    };
  }
}

/**
 * Import a bundle from bytes
 */
export async function importFromBytes<T>(
  data: Uint8Array,
  handlers: IImportHandlers<T>,
  options: IImportOptions = { conflictResolution: 'ask' }
): Promise<IImportResult> {
  try {
    const bundle = parseBundleFromBytes(data);
    return importBundle<T>(bundle, handlers, options);
  } catch (error) {
    return {
      success: false,
      importedCount: 0,
      skippedCount: 0,
      replacedCount: 0,
      error: error instanceof Error ? error.message : 'Failed to parse bundle',
    };
  }
}

/**
 * Import a parsed bundle
 */
export async function importBundle<T>(
  bundle: IShareableBundle,
  handlers: IImportHandlers<T>,
  options: IImportOptions = { conflictResolution: 'ask' }
): Promise<IImportResult> {
  // Validate metadata
  const metadataErrors = validateBundleMetadata(bundle.metadata);
  if (metadataErrors.length > 0) {
    return {
      success: false,
      importedCount: 0,
      skippedCount: 0,
      replacedCount: 0,
      error: `Invalid bundle: ${metadataErrors.join(', ')}`,
    };
  }

  // Parse and verify
  const parsed = await parseAndVerifyBundle<T>(bundle);

  // Check signature if required
  if (options.verifySignature !== false && !parsed.signatureValid) {
    return {
      success: false,
      importedCount: 0,
      skippedCount: 0,
      replacedCount: 0,
      error: 'Bundle signature verification failed',
      signatureValid: false,
    };
  }

  // Detect conflicts
  const conflicts = await detectConflicts<T>(
    parsed.items,
    bundle.metadata.contentType,
    handlers
  );

  // If there are unresolved conflicts and resolution is 'ask', return them
  if (
    conflicts.length > 0 &&
    options.conflictResolution === 'ask' &&
    !options.resolvedConflicts
  ) {
    return {
      success: false,
      importedCount: 0,
      skippedCount: 0,
      replacedCount: 0,
      conflicts,
      signatureValid: parsed.signatureValid,
    };
  }

  // Apply conflict resolutions
  const resolvedConflicts = options.resolvedConflicts || [];
  const conflictMap = new Map(
    resolvedConflicts.map((c) => [c.bundleItemId, c.resolution])
  );

  // Apply default resolution to unresolved conflicts
  for (const conflict of conflicts) {
    if (!conflictMap.has(conflict.bundleItemId)) {
      // 'ask' defaults to 'skip' when no resolution provided
      const defaultResolution = options.conflictResolution === 'ask' ? 'skip' : options.conflictResolution;
      conflictMap.set(conflict.bundleItemId, defaultResolution);
    }
  }

  // Import items
  const importedIds: Record<string, string> = {};
  let importedCount = 0;
  let skippedCount = 0;
  let replacedCount = 0;

  const source: IImportSource = {
    author: parsed.signer,
    importedAt: new Date().toISOString(),
    originalId: '', // Will be set per item
    bundleDescription: bundle.metadata.description,
  };

  for (const item of parsed.items) {
    const itemId = getItemId(item);
    const resolution = conflictMap.get(itemId);

    // Only skip if item has a conflict and resolution is 'skip'
    // Items without conflicts (not in conflictMap) should be imported
    if (resolution === 'skip') {
      skippedCount++;
      continue;
    }

    try {
      const itemSource = { ...source, originalId: itemId };
      const newId = await handlers.save(item, itemSource);
      importedIds[itemId] = newId;

      if (resolution === 'replace') {
        replacedCount++;
      } else {
        importedCount++;
      }
    } catch (error) {
      // Log but continue with other items
      console.error(`Failed to import item ${itemId}:`, error);
      skippedCount++;
    }
  }

  return {
    success: true,
    importedCount,
    skippedCount,
    replacedCount,
    importedIds,
    signatureValid: parsed.signatureValid,
  };
}

// =============================================================================
// Conflict Detection
// =============================================================================

/**
 * Detect conflicts between bundle items and existing data
 */
async function detectConflicts<T>(
  items: T[],
  contentType: ShareableContentType,
  handlers: IImportHandlers<T>
): Promise<IImportConflict[]> {
  const conflicts: IImportConflict[] = [];

  for (const item of items) {
    const itemId = getItemId(item);
    const itemName = getItemName(item);

    // Check if ID already exists
    const idExists = await handlers.checkExists(itemId);
    if (idExists) {
      conflicts.push({
        contentType,
        bundleItemId: itemId,
        bundleItemName: itemName,
        existingItemId: itemId,
        existingItemName: itemName, // Same ID means same item
        resolution: 'skip',
      });
      continue;
    }

    // Check if name conflicts with existing item
    const nameConflict = await handlers.checkNameConflict(itemName);
    if (nameConflict) {
      conflicts.push({
        contentType,
        bundleItemId: itemId,
        bundleItemName: itemName,
        existingItemId: nameConflict.id,
        existingItemName: nameConflict.name,
        resolution: 'skip',
      });
    }
  }

  return conflicts;
}

/**
 * Get ID from an item
 */
function getItemId(item: unknown): string {
  if (typeof item === 'object' && item !== null && 'id' in item) {
    return String((item as { id: unknown }).id);
  }
  return '';
}

/**
 * Get name from an item
 */
function getItemName(item: unknown): string {
  if (typeof item === 'object' && item !== null && 'name' in item) {
    return String((item as { name: unknown }).name);
  }
  return 'Unknown';
}

// =============================================================================
// ID Remapping
// =============================================================================

/**
 * Generate a new unique ID for an imported item
 */
export function generateImportId(): string {
  return `import-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Remap IDs in an item, preserving references
 */
export function remapItemIds<T extends { id: string }>(
  item: T,
  idMap: Map<string, string>
): T {
  const newId = idMap.get(item.id) || generateImportId();
  return { ...item, id: newId };
}

// =============================================================================
// File Import Helpers
// =============================================================================

/**
 * Read a bundle from a File object
 */
export async function readBundleFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Validate a file before import
 */
export function validateBundleFile(file: File): string | null {
  // Check file extension
  if (!file.name.endsWith('.mekbundle') && !file.name.endsWith('.json')) {
    return 'Invalid file type. Expected .mekbundle or .json file.';
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return 'File too large. Maximum size is 10MB.';
  }

  return null;
}

/**
 * Preview a bundle without importing
 */
export async function previewBundle(
  data: string
): Promise<{
  valid: boolean;
  metadata?: IShareableBundle['metadata'];
  itemCount?: number;
  error?: string;
}> {
  try {
    const bundle = parseBundle(data);
    const errors = validateBundleMetadata(bundle.metadata);

    if (errors.length > 0) {
      return {
        valid: false,
        error: errors.join(', '),
      };
    }

    return {
      valid: true,
      metadata: bundle.metadata,
      itemCount: bundle.metadata.itemCount,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to parse bundle',
    };
  }
}
