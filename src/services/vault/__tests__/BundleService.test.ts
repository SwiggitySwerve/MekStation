/**
 * Bundle Service Tests
 *
 * Tests for bundle creation, parsing, and validation.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import {
  BUNDLE_VERSION,
  serializeBundle,
  parseBundle,
  validateBundleMetadata,
  isBundleVersionCompatible,
  getContentTypeLabel,
} from '@/services/vault/BundleService';
import type { IShareableBundle, IBundleMetadata } from '@/types/vault';

// =============================================================================
// Bundle Version
// =============================================================================

describe('Bundle Version', () => {
  it('should have a valid version format', () => {
    expect(BUNDLE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  describe('isBundleVersionCompatible', () => {
    it('should accept same major version', () => {
      expect(isBundleVersionCompatible('1.0.0')).toBe(true);
      expect(isBundleVersionCompatible('1.5.0')).toBe(true);
      expect(isBundleVersionCompatible('1.99.99')).toBe(true);
    });

    it('should reject different major version', () => {
      expect(isBundleVersionCompatible('0.1.0')).toBe(false);
      expect(isBundleVersionCompatible('2.0.0')).toBe(false);
    });
  });
});

// =============================================================================
// Bundle Serialization
// =============================================================================

describe('Bundle Serialization', () => {
  const mockBundle: IShareableBundle = {
    metadata: {
      version: '1.0.0',
      contentType: 'unit',
      itemCount: 1,
      author: {
        displayName: 'Test User',
        publicKey: 'dGVzdC1wdWJsaWMta2V5',
        friendCode: 'ABCD-EFGH-JKLM-NPQR',
      },
      createdAt: '2024-01-01T00:00:00.000Z',
      appVersion: '0.1.0',
    },
    payload: JSON.stringify([{ id: '1', name: 'Test Unit' }]),
    signature: 'test-signature',
  };

  describe('serializeBundle', () => {
    it('should produce valid JSON', () => {
      const json = serializeBundle(mockBundle);
      expect(() => JSON.parse(json) as IShareableBundle).not.toThrow();
    });

    it('should preserve all bundle properties', () => {
      const json = serializeBundle(mockBundle);
      const parsed = JSON.parse(json) as IShareableBundle;

      expect(parsed.metadata).toEqual(mockBundle.metadata);
      expect(parsed.payload).toBe(mockBundle.payload);
      expect(parsed.signature).toBe(mockBundle.signature);
    });

    it('should format with indentation', () => {
      const json = serializeBundle(mockBundle);
      expect(json).toContain('\n');
    });
  });

  describe('parseBundle', () => {
    it('should parse valid bundle JSON', () => {
      const json = serializeBundle(mockBundle);
      const parsed = parseBundle(json);

      expect(parsed).toEqual(mockBundle);
    });

    it('should throw on invalid JSON', () => {
      expect(() => parseBundle('not json')).toThrow('not valid JSON');
    });

    it('should throw on missing required fields', () => {
      expect(() => parseBundle('{}')).toThrow('missing required fields');
      expect(() => parseBundle('{"metadata": {}}')).toThrow('missing required fields');
    });

    it('should throw on missing metadata fields', () => {
      const incomplete = JSON.stringify({
        metadata: {},
        payload: '[]',
        signature: 'sig',
      });
      expect(() => parseBundle(incomplete)).toThrow('missing metadata fields');
    });
  });
});

// =============================================================================
// Metadata Validation
// =============================================================================

describe('Metadata Validation', () => {
  const validMetadata: IBundleMetadata = {
    version: '1.0.0',
    contentType: 'unit',
    itemCount: 1,
    author: {
      displayName: 'Test User',
      publicKey: 'dGVzdC1wdWJsaWMta2V5',
      friendCode: 'ABCD-EFGH-JKLM-NPQR',
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    appVersion: '0.1.0',
  };

  it('should accept valid metadata', () => {
    const errors = validateBundleMetadata(validMetadata);
    expect(errors).toHaveLength(0);
  });

  it('should reject missing version', () => {
    const metadata = { ...validMetadata, version: '' };
    const errors = validateBundleMetadata(metadata);
    expect(errors).toContain('Missing bundle version');
  });

  it('should reject incompatible version', () => {
    const metadata = { ...validMetadata, version: '99.0.0' };
    const errors = validateBundleMetadata(metadata);
    expect(errors.some((e) => e.includes('Incompatible'))).toBe(true);
  });

  it('should reject missing content type', () => {
    const metadata = { ...validMetadata, contentType: '' as never };
    const errors = validateBundleMetadata(metadata);
    expect(errors).toContain('Missing content type');
  });

  it('should reject invalid item count', () => {
    const metadata1 = { ...validMetadata, itemCount: -1 };
    expect(validateBundleMetadata(metadata1)).toContain('Invalid item count');

    const metadata2 = { ...validMetadata, itemCount: 'not a number' as never };
    expect(validateBundleMetadata(metadata2)).toContain('Invalid item count');
  });

  it('should reject missing author public key', () => {
    const metadata = {
      ...validMetadata,
      author: { ...validMetadata.author, publicKey: '' },
    };
    const errors = validateBundleMetadata(metadata);
    expect(errors).toContain('Missing author public key');
  });

  it('should reject missing creation timestamp', () => {
    const metadata = { ...validMetadata, createdAt: '' };
    const errors = validateBundleMetadata(metadata);
    expect(errors).toContain('Missing creation timestamp');
  });
});

// =============================================================================
// Content Type Labels
// =============================================================================

describe('Content Type Labels', () => {
  it('should return singular for count of 1', () => {
    expect(getContentTypeLabel('unit', 1)).toBe('Unit');
    expect(getContentTypeLabel('pilot', 1)).toBe('Pilot');
    expect(getContentTypeLabel('force', 1)).toBe('Force');
    expect(getContentTypeLabel('encounter', 1)).toBe('Encounter');
  });

  it('should return plural for count > 1', () => {
    expect(getContentTypeLabel('unit', 2)).toBe('Units');
    expect(getContentTypeLabel('pilot', 5)).toBe('Pilots');
    expect(getContentTypeLabel('force', 10)).toBe('Forces');
    expect(getContentTypeLabel('encounter', 0)).toBe('Encounters');
  });
});
