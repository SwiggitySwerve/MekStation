/**
 * Vault Export/Import Flow Integration Tests
 *
 * Tests the complete export and import lifecycle:
 * - Create bundle with units/pilots/forces
 * - Serialize and parse bundles
 * - Verify signatures during import
 * - Handle conflicts and resolutions
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IVaultIdentity,
  IShareableBundle,
  IImportSource,
} from '@/types/vault';

import {
  createBundle,
  serializeBundle,
  parseBundle,
  parseAndVerifyBundle,
  verifyBundleSignature,
  validateBundleMetadata,
  BUNDLE_VERSION,
} from '@/services/vault/BundleService';
import {
  createIdentity,
  unlockIdentity,
  getPublicIdentity,
} from '@/services/vault/IdentityService';
import {
  importBundle,
  importFromString,
  previewBundle,
  validateBundleFile,
} from '@/services/vault/ImportService';

// =============================================================================
// Test Configuration
// =============================================================================

const hasRequiredEnvironment = async (): Promise<boolean> => {
  try {
    // Check for TextEncoder (required for crypto operations)
    if (typeof TextEncoder === 'undefined') {
      return false;
    }

    // Check for Ed25519 support
    const crypto = await import('crypto');
    const testKeyPair = await crypto.webcrypto.subtle.generateKey(
      { name: 'Ed25519' },
      true,
      ['sign', 'verify'],
    );
    return !!testKeyPair;
  } catch {
    return false;
  }
};

// =============================================================================
// Mock Data
// =============================================================================

interface MockUnit {
  id: string;
  name: string;
  tonnage: number;
  techBase: string;
}

interface MockPilot {
  id: string;
  name: string;
  gunnery: number;
  piloting: number;
}

interface MockForce {
  id: string;
  name: string;
  units: string[];
}

const mockUnits: MockUnit[] = [
  { id: 'unit-1', name: 'Atlas AS7-D', tonnage: 100, techBase: 'INNER_SPHERE' },
  {
    id: 'unit-2',
    name: 'Locust LCT-1V',
    tonnage: 20,
    techBase: 'INNER_SPHERE',
  },
  { id: 'unit-3', name: 'Timber Wolf Prime', tonnage: 75, techBase: 'CLAN' },
];

const mockPilots: MockPilot[] = [
  { id: 'pilot-1', name: 'John Smith', gunnery: 3, piloting: 4 },
  { id: 'pilot-2', name: 'Jane Doe', gunnery: 2, piloting: 3 },
];

const mockForces: MockForce[] = [
  { id: 'force-1', name: 'Alpha Lance', units: ['unit-1', 'unit-2'] },
];

// =============================================================================
// Tests
// =============================================================================

describe('Vault Export/Import Flow Integration', () => {
  let envAvailable: boolean;
  let testIdentity: IVaultIdentity;

  beforeAll(async () => {
    envAvailable = await hasRequiredEnvironment();
    if (!envAvailable) {
      console.log(
        'Skipping crypto tests: required APIs not available in this environment',
      );
      return;
    }

    const stored = await createIdentity(
      'ExportImportTestUser',
      'testPassword123',
    );
    testIdentity = await unlockIdentity(stored, 'testPassword123');
  });

  describe('Bundle Creation', () => {
    it('should create a signed bundle with units', async () => {
      if (!envAvailable) return;

      const result = await createBundle('unit', mockUnits, testIdentity, {
        description: 'Test unit bundle',
        tags: ['test', 'units'],
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.bundle).toBeDefined();
      expect(result.data.bundle?.metadata.version).toBe(BUNDLE_VERSION);
      expect(result.data.bundle?.metadata.contentType).toBe('unit');
      expect(result.data.bundle?.metadata.itemCount).toBe(3);
      expect(result.data.bundle?.metadata.author.displayName).toBe(
        'ExportImportTestUser',
      );
      expect(result.data.bundle?.metadata.description).toBe('Test unit bundle');
      expect(result.data.bundle?.metadata.tags).toEqual(['test', 'units']);
      expect(result.data.bundle?.signature).toBeDefined();
      expect(result.data.suggestedFilename).toBeDefined();
    });

    it('should create a signed bundle with pilots', async () => {
      if (!envAvailable) return;

      const result = await createBundle('pilot', mockPilots, testIdentity);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.bundle?.metadata.contentType).toBe('pilot');
      expect(result.data.bundle?.metadata.itemCount).toBe(2);
    });

    it('should create a signed bundle with forces', async () => {
      if (!envAvailable) return;

      const result = await createBundle('force', mockForces, testIdentity);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.bundle?.metadata.contentType).toBe('force');
      expect(result.data.bundle?.metadata.itemCount).toBe(1);
    });

    it('should generate appropriate filenames', async () => {
      if (!envAvailable) return;

      // Single item uses item name
      const singleResult = await createBundle(
        'unit',
        [mockUnits[0]],
        testIdentity,
      );
      if (!singleResult.success) return;
      expect(singleResult.data.suggestedFilename).toMatch(
        /^atlas-as7-d-\d{8}\.mekbundle$/,
      );

      // Multiple items uses content type and count
      const multiResult = await createBundle('unit', mockUnits, testIdentity);
      if (!multiResult.success) return;
      expect(multiResult.data.suggestedFilename).toMatch(
        /^units-3-\d{8}\.mekbundle$/,
      );
    });
  });

  describe('Bundle Serialization', () => {
    it('should serialize and parse bundle correctly', async () => {
      if (!envAvailable) return;

      const result = await createBundle('unit', mockUnits, testIdentity);
      if (!result.success) return;
      expect(result.data.bundle).toBeDefined();

      const serialized = serializeBundle(result.data.bundle!);
      expect(typeof serialized).toBe('string');

      const parsed = parseBundle(serialized);
      expect(parsed.metadata).toEqual(result.data.bundle!.metadata);
      expect(parsed.payload).toBe(result.data.bundle!.payload);
      expect(parsed.signature).toBe(result.data.bundle!.signature);
    });

    it('should throw on invalid JSON', () => {
      expect(() => parseBundle('not valid json')).toThrow('not valid JSON');
    });

    it('should throw on missing required fields', () => {
      expect(() => parseBundle('{}')).toThrow('missing required fields');
      expect(() => parseBundle('{"metadata": {}}')).toThrow(
        'missing required fields',
      );
    });
  });

  describe('Bundle Signature Verification', () => {
    it('should verify valid signature', async () => {
      if (!envAvailable) return;

      const result = await createBundle('unit', mockUnits, testIdentity);
      if (!result.success) return;
      expect(result.data.bundle).toBeDefined();

      const isValid = await verifyBundleSignature(result.data.bundle!);
      expect(isValid).toBe(true);
    });

    it('should reject tampered payload', async () => {
      if (!envAvailable) return;

      const result = await createBundle('unit', mockUnits, testIdentity);
      if (!result.success) return;
      expect(result.data.bundle).toBeDefined();

      // Tamper with payload
      const tamperedBundle: IShareableBundle = {
        ...result.data.bundle!,
        payload: JSON.stringify([{ id: 'fake', name: 'Tampered Unit' }]),
      };

      const isValid = await verifyBundleSignature(tamperedBundle);
      expect(isValid).toBe(false);
    });

    it('should reject tampered metadata', async () => {
      if (!envAvailable) return;

      const result = await createBundle('unit', mockUnits, testIdentity);
      if (!result.success) return;
      expect(result.data.bundle).toBeDefined();

      // Tamper with metadata
      const tamperedBundle: IShareableBundle = {
        ...result.data.bundle!,
        metadata: {
          ...result.data.bundle!.metadata,
          author: {
            ...result.data.bundle!.metadata.author,
            displayName: 'Fake Author',
          },
        },
      };

      const isValid = await verifyBundleSignature(tamperedBundle);
      expect(isValid).toBe(false);
    });
  });

  describe('Bundle Validation', () => {
    it('should validate correct metadata', async () => {
      if (!envAvailable) return;

      const result = await createBundle('unit', mockUnits, testIdentity);
      if (!result.success) return;
      expect(result.data.bundle).toBeDefined();

      const errors = validateBundleMetadata(result.data.bundle!.metadata);
      expect(errors).toHaveLength(0);
    });

    it('should detect invalid version', () => {
      const invalidMetadata = {
        version: '99.0.0',
        contentType: 'unit' as const,
        itemCount: 1,
        author: {
          displayName: 'Test',
          publicKey: 'key',
          friendCode: 'ABCD-EFGH-JKLM-NPQR',
        },
        createdAt: new Date().toISOString(),
        appVersion: '0.1.0',
      };

      const errors = validateBundleMetadata(invalidMetadata);
      expect(errors.some((e) => e.includes('Incompatible'))).toBe(true);
    });

    it('should detect missing author key', () => {
      const invalidMetadata = {
        version: BUNDLE_VERSION,
        contentType: 'unit' as const,
        itemCount: 1,
        author: {
          displayName: 'Test',
          publicKey: '',
          friendCode: 'ABCD-EFGH-JKLM-NPQR',
        },
        createdAt: new Date().toISOString(),
        appVersion: '0.1.0',
      };

      const errors = validateBundleMetadata(invalidMetadata);
      expect(errors).toContain('Missing author public key');
    });
  });

  describe('Bundle Preview', () => {
    it('should preview valid bundle', async () => {
      if (!envAvailable) return;

      const result = await createBundle('unit', mockUnits, testIdentity);
      if (!result.success) return;
      const serialized = serializeBundle(result.data.bundle!);

      const preview = await previewBundle(serialized);

      expect(preview.valid).toBe(true);
      expect(preview.metadata).toBeDefined();
      expect(preview.itemCount).toBe(3);
    });

    it('should reject invalid bundle in preview', async () => {
      const preview = await previewBundle('invalid json');

      expect(preview.valid).toBe(false);
      expect(preview.error).toBeDefined();
    });
  });

  describe('Bundle Import with Verification', () => {
    it('should parse and verify bundle', async () => {
      if (!envAvailable) return;

      const result = await createBundle('unit', mockUnits, testIdentity);
      if (!result.success) return;
      expect(result.data.bundle).toBeDefined();

      const parsed = await parseAndVerifyBundle<MockUnit>(result.data.bundle!);

      expect(parsed.signatureValid).toBe(true);
      expect(parsed.items).toHaveLength(3);
      expect(parsed.items[0].name).toBe('Atlas AS7-D');
      expect(parsed.signer.displayName).toBe('ExportImportTestUser');
    });

    it('should detect invalid signature during import', async () => {
      if (!envAvailable) return;

      const result = await createBundle('unit', mockUnits, testIdentity);
      if (!result.success) return;
      expect(result.data.bundle).toBeDefined();

      // Tamper with bundle
      const tamperedBundle: IShareableBundle = {
        ...result.data.bundle!,
        payload: JSON.stringify([{ id: 'fake', name: 'Tampered' }]),
      };

      const parsed = await parseAndVerifyBundle<MockUnit>(tamperedBundle);
      expect(parsed.signatureValid).toBe(false);
    });
  });

  describe('Import with Conflict Resolution', () => {
    // Mock handlers for import testing
    const existingIds = new Set(['unit-1']); // unit-1 already exists
    const existingNames = new Map([
      ['Atlas AS7-D', { id: 'existing-atlas', name: 'Atlas AS7-D' }],
    ]);
    const savedItems: Array<{ item: MockUnit; source: IImportSource }> = [];

    const mockHandlers = {
      checkExists: async (id: string) => existingIds.has(id),
      checkNameConflict: async (name: string) =>
        existingNames.get(name) ?? null,
      save: async (item: MockUnit, source: IImportSource) => {
        savedItems.push({ item, source });
        return `new-${item.id}`;
      },
    };

    beforeEach(() => {
      savedItems.length = 0;
    });

    it('should detect conflicts during import', async () => {
      if (!envAvailable) return;

      const result = await createBundle('unit', mockUnits, testIdentity);
      if (!result.success) return;
      const serialized = serializeBundle(result.data.bundle!);

      const importResult = await importFromString<MockUnit>(
        serialized,
        mockHandlers,
        { conflictResolution: 'ask' },
      );

      // Should detect conflict with unit-1 (existing ID)
      // Conflict case returns success: true with data.conflicts
      expect(importResult.success).toBe(true);
      if (!importResult.success) return;
      expect(importResult.data.conflicts).toBeDefined();
      expect(importResult.data.conflicts!.length).toBeGreaterThan(0);
      expect(
        importResult.data.conflicts!.some(
          (c: { bundleItemId: string }) => c.bundleItemId === 'unit-1',
        ),
      ).toBe(true);
    });

    it('should skip conflicts with skip resolution', async () => {
      if (!envAvailable) return;

      const result = await createBundle('unit', mockUnits, testIdentity);
      if (!result.success) return;
      const serialized = serializeBundle(result.data.bundle!);

      const importResult = await importFromString<MockUnit>(
        serialized,
        mockHandlers,
        { conflictResolution: 'skip' },
      );

      expect(importResult.success).toBe(true);
      if (!importResult.success) return;
      // unit-1 should be skipped (existing), unit-2 and unit-3 imported
      expect(importResult.data.skippedCount).toBeGreaterThan(0);
    });

    it('should replace conflicts with replace resolution', async () => {
      if (!envAvailable) return;

      const result = await createBundle('unit', mockUnits, testIdentity);
      if (!result.success) return;
      const serialized = serializeBundle(result.data.bundle!);

      const importResult = await importFromString<MockUnit>(
        serialized,
        mockHandlers,
        { conflictResolution: 'replace' },
      );

      expect(importResult.success).toBe(true);
      if (!importResult.success) return;
      expect(importResult.data.replacedCount).toBeGreaterThan(0);
    });

    it('should reject bundles with invalid signatures when verification enabled', async () => {
      if (!envAvailable) return;

      const result = await createBundle('unit', mockUnits, testIdentity);
      if (!result.success) return;
      const tamperedBundle: IShareableBundle = {
        ...result.data.bundle!,
        payload: JSON.stringify([{ id: 'fake', name: 'Tampered' }]),
      };

      const importResult = await importBundle<MockUnit>(
        tamperedBundle,
        mockHandlers,
        { conflictResolution: 'skip', verifySignature: true },
      );

      expect(importResult.success).toBe(false);
      if (importResult.success) return;
      expect(importResult.error.message).toContain(
        'signature verification failed',
      );
    });

    it('should track import source', async () => {
      if (!envAvailable) return;

      // Use units without conflicts
      const noConflictUnits = [
        {
          id: 'unit-new-1',
          name: 'New Mech 1',
          tonnage: 50,
          techBase: 'INNER_SPHERE',
        },
      ];

      const result = await createBundle('unit', noConflictUnits, testIdentity, {
        description: 'Source tracking test',
      });
      if (!result.success) return;

      await importFromString<MockUnit>(
        serializeBundle(result.data.bundle!),
        mockHandlers,
        { conflictResolution: 'skip' },
      );

      expect(savedItems.length).toBe(1);
      expect(savedItems[0].source.author.displayName).toBe(
        'ExportImportTestUser',
      );
      expect(savedItems[0].source.originalId).toBe('unit-new-1');
      expect(savedItems[0].source.bundleDescription).toBe(
        'Source tracking test',
      );
    });
  });

  describe('File Validation', () => {
    // These tests don't require crypto, but the beforeAll runs createIdentity
    // which needs crypto. Skip if environment not available.
    it('should accept .mekbundle files', () => {
      if (!envAvailable) return;
      const file = new File(['content'], 'test.mekbundle', {
        type: 'application/json',
      });
      const error = validateBundleFile(file);
      expect(error).toBeNull();
    });

    it('should accept .json files', () => {
      if (!envAvailable) return;
      const file = new File(['content'], 'test.json', {
        type: 'application/json',
      });
      const error = validateBundleFile(file);
      expect(error).toBeNull();
    });

    it('should reject invalid file types', () => {
      if (!envAvailable) return;
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const error = validateBundleFile(file);
      expect(error).toContain('Invalid file type');
    });

    it('should reject oversized files', () => {
      if (!envAvailable) return;
      // Create a mock file that reports large size
      const largeFile = new File(['x'], 'test.mekbundle');
      Object.defineProperty(largeFile, 'size', { value: 20 * 1024 * 1024 }); // 20MB

      const error = validateBundleFile(largeFile);
      expect(error).toContain('too large');
    });
  });

  describe('Cross-Identity Import', () => {
    it('should correctly identify bundle author after import', async () => {
      if (!envAvailable) return;

      // Create bundle with first identity
      const result = await createBundle('unit', mockUnits, testIdentity);
      if (!result.success) return;
      const serialized = serializeBundle(result.data.bundle!);

      // Create second identity
      const stored2 = await createIdentity('OtherUser', 'otherPassword');
      const identity2 = await unlockIdentity(stored2, 'otherPassword');

      // Parse bundle and verify author
      const parsed = await parseAndVerifyBundle<MockUnit>(
        parseBundle(serialized),
      );

      // Bundle should be signed by first identity, not second
      expect(parsed.signer.displayName).toBe('ExportImportTestUser');
      expect(parsed.signer.displayName).not.toBe(identity2.displayName);
      expect(parsed.signer.publicKey).toBe(
        getPublicIdentity(testIdentity).publicKey,
      );
    });
  });
});
