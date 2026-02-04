/**
 * Bundle Service
 *
 * Handles creating, signing, and parsing shareable bundles.
 * Bundles contain exported units, pilots, or forces with cryptographic signatures.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IShareableBundle,
  IBundleMetadata,
  IParsedBundle,
  IVaultIdentity,
  ShareableContentType,
  IExportOptions,
  IExportResult,
} from '@/types/vault';
import {
  signMessage,
  verifyMessage,
  getPublicIdentity,
} from './IdentityService';



// =============================================================================
// Constants
// =============================================================================

/** Current bundle format version */
export const BUNDLE_VERSION = '1.0.0';

/** File extension for bundle files */
export const BUNDLE_FILE_EXTENSION = '.mekbundle';

/** MIME type for bundle files */
export const BUNDLE_MIME_TYPE = 'application/x-mekstation-bundle+json';

// =============================================================================
// Bundle Creation
// =============================================================================

/**
 * Create a signed bundle from content
 */
export async function createBundle<T>(
  contentType: ShareableContentType,
  items: T[],
  identity: IVaultIdentity,
  options: IExportOptions = {}
): Promise<IExportResult> {
  try {
    // Serialize the payload
    const payload = JSON.stringify(items);

    // Create metadata
    const metadata: IBundleMetadata = {
      version: BUNDLE_VERSION,
      contentType,
      itemCount: items.length,
      author: getPublicIdentity(identity),
      createdAt: new Date().toISOString(),
      description: options.description,
      tags: options.tags,
      appVersion: getAppVersion(),
    };

    // Create the message to sign (metadata + payload)
    const messageToSign = JSON.stringify(metadata) + payload;

    // Sign the message
    const signature = await signMessage(messageToSign, identity);

    const bundle: IShareableBundle = {
      metadata,
      payload,
      signature,
    };

    // Generate suggested filename
    const suggestedFilename = generateFilename(contentType, items, metadata);

    return {
      success: true,
      data: {
        bundle,
        suggestedFilename,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to create bundle' },
    };
  }
}

/**
 * Serialize a bundle to a string (for file export)
 */
export function serializeBundle(bundle: IShareableBundle): string {
  return JSON.stringify(bundle, null, 2);
}

/**
 * Serialize a bundle to bytes (for binary export)
 */
export function serializeBundleToBytes(bundle: IShareableBundle): Uint8Array {
  const json = serializeBundle(bundle);
  return new TextEncoder().encode(json);
}

// =============================================================================
// Bundle Parsing
// =============================================================================

/**
 * Parse a bundle from a string
 */
export function parseBundle(data: string): IShareableBundle {
  try {
    const parsed: unknown = JSON.parse(data);

    // Validate and get error message if any
    const validationError = validateBundleStructure(parsed);
    if (validationError) {
      throw new Error(validationError);
    }

    return parsed as IShareableBundle;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid bundle format: not valid JSON');
    }
    throw error;
  }
}

/**
 * Validate bundle structure and return error message if invalid
 */
function validateBundleStructure(obj: unknown): string | null {
  if (typeof obj !== 'object' || obj === null) {
    return 'Invalid bundle format: missing required fields';
  }

  const bundle = obj as Record<string, unknown>;

  // Check required top-level fields
  if (!bundle.metadata || !bundle.payload || !bundle.signature) {
    return 'Invalid bundle format: missing required fields';
  }

  if (typeof bundle.payload !== 'string' || typeof bundle.signature !== 'string') {
    return 'Invalid bundle format: missing required fields';
  }

  // Check metadata fields
  const metadata = bundle.metadata as Record<string, unknown>;
  if (!metadata.version || !metadata.contentType) {
    return 'Invalid bundle format: missing metadata fields';
  }

  return null;
}

/**
 * Parse a bundle from bytes
 */
export function parseBundleFromBytes(data: Uint8Array): IShareableBundle {
  const json = new TextDecoder().decode(data);
  return parseBundle(json);
}

/**
 * Parse and verify a bundle, extracting the content
 */
export async function parseAndVerifyBundle<T>(
  bundle: IShareableBundle
): Promise<IParsedBundle<T>> {
  // Reconstruct the signed message
  const messageToVerify = JSON.stringify(bundle.metadata) + bundle.payload;

  // Verify the signature
  const signatureValid = await verifyMessage(
    messageToVerify,
    bundle.signature,
    bundle.metadata.author
  );

  // Parse the payload
  let items: T[];
  try {
    const parsedPayload = JSON.parse(bundle.payload) as T | T[];
    if (!Array.isArray(parsedPayload)) {
      items = [parsedPayload];
    } else {
      items = parsedPayload;
    }
  } catch {
    throw new Error('Invalid bundle payload: not valid JSON');
  }

  return {
    metadata: bundle.metadata,
    items,
    signatureValid,
    signer: bundle.metadata.author,
  };
}

/**
 * Verify a bundle signature without parsing the content
 */
export async function verifyBundleSignature(
  bundle: IShareableBundle
): Promise<boolean> {
  const messageToVerify = JSON.stringify(bundle.metadata) + bundle.payload;
  return verifyMessage(
    messageToVerify,
    bundle.signature,
    bundle.metadata.author
  );
}

// =============================================================================
// Bundle Validation
// =============================================================================

/**
 * Check if a bundle version is compatible
 */
export function isBundleVersionCompatible(version: string): boolean {
  const [major] = version.split('.');
  const [currentMajor] = BUNDLE_VERSION.split('.');
  return major === currentMajor;
}

/**
 * Validate bundle metadata
 */
export function validateBundleMetadata(metadata: IBundleMetadata): string[] {
  const errors: string[] = [];

  if (!metadata.version) {
    errors.push('Missing bundle version');
  } else if (!isBundleVersionCompatible(metadata.version)) {
    errors.push(
      `Incompatible bundle version: ${metadata.version} (expected ${BUNDLE_VERSION})`
    );
  }

  if (!metadata.contentType) {
    errors.push('Missing content type');
  }

  if (typeof metadata.itemCount !== 'number' || metadata.itemCount < 0) {
    errors.push('Invalid item count');
  }

  if (!metadata.author?.publicKey) {
    errors.push('Missing author public key');
  }

  if (!metadata.createdAt) {
    errors.push('Missing creation timestamp');
  }

  return errors;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get application version for bundle metadata
 */
function getAppVersion(): string {
  // In a real app, this would come from package.json or environment
  return '0.1.0';
}

/**
 * Generate a suggested filename for the bundle
 */
function generateFilename<T>(
  contentType: ShareableContentType,
  items: T[],
  metadata: IBundleMetadata
): string {
  const date = new Date(metadata.createdAt)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');

  let name: string;

  if (items.length === 1 && hasName(items[0])) {
    // Use the item name for single-item exports
    name = sanitizeFilename(items[0].name);
  } else {
    // Use content type and count for multi-item exports
    name = `${contentType}s-${items.length}`;
  }

  return `${name}-${date}${BUNDLE_FILE_EXTENSION}`;
}

/**
 * Check if an item has a name property
 */
function hasName(item: unknown): item is { name: string } {
  return (
    typeof item === 'object' &&
    item !== null &&
    'name' in item &&
    typeof (item as { name: unknown }).name === 'string'
  );
}

/**
 * Sanitize a string for use in a filename
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Get content type label for display
 */
export function getContentTypeLabel(
  contentType: ShareableContentType,
  count: number
): string {
  const labels: Record<ShareableContentType, [string, string]> = {
    unit: ['Unit', 'Units'],
    pilot: ['Pilot', 'Pilots'],
    force: ['Force', 'Forces'],
    encounter: ['Encounter', 'Encounters'],
  };

  const [singular, plural] = labels[contentType] || ['Item', 'Items'];
  return count === 1 ? singular : plural;
}
