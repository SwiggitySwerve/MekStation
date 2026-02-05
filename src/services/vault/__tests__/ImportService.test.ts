/**
 * Import Service Tests
 *
 * Tests for bundle import, conflict detection, and ID remapping.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { IShareableBundle } from '@/types/vault';

import { serializeBundle } from '@/services/vault/BundleService';
import {
  generateImportId,
  remapItemIds,
  validateBundleFile,
  previewBundle,
} from '@/services/vault/ImportService';

// =============================================================================
// ID Generation
// =============================================================================

describe('ID Generation', () => {
  describe('generateImportId', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateImportId());
      }
      expect(ids.size).toBe(100);
    });

    it('should start with "import-" prefix', () => {
      const id = generateImportId();
      expect(id).toMatch(/^import-/);
    });

    it('should contain timestamp', () => {
      const before = Date.now();
      const id = generateImportId();
      const after = Date.now();

      const timestamp = parseInt(id.split('-')[1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('remapItemIds', () => {
    it('should remap ID using the provided map', () => {
      const item = { id: 'old-id', name: 'Test' };
      const idMap = new Map([['old-id', 'new-id']]);

      const remapped = remapItemIds(item, idMap);

      expect(remapped.id).toBe('new-id');
      expect(remapped.name).toBe('Test');
    });

    it('should generate new ID if not in map', () => {
      const item = { id: 'unknown-id', name: 'Test' };
      const idMap = new Map<string, string>();

      const remapped = remapItemIds(item, idMap);

      expect(remapped.id).toMatch(/^import-/);
      expect(remapped.id).not.toBe('unknown-id');
    });

    it('should not mutate original item', () => {
      const item = { id: 'old-id', name: 'Test' };
      const idMap = new Map([['old-id', 'new-id']]);

      remapItemIds(item, idMap);

      expect(item.id).toBe('old-id');
    });
  });
});

// =============================================================================
// File Validation
// =============================================================================

describe('File Validation', () => {
  describe('validateBundleFile', () => {
    it('should accept .mekbundle files', () => {
      const file = new File(['{}'], 'test.mekbundle', {
        type: 'application/json',
      });
      expect(validateBundleFile(file)).toBeNull();
    });

    it('should accept .json files', () => {
      const file = new File(['{}'], 'test.json', { type: 'application/json' });
      expect(validateBundleFile(file)).toBeNull();
    });

    it('should reject other file types', () => {
      const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
      expect(validateBundleFile(file)).toContain('Invalid file type');
    });

    it('should reject files over 10MB', () => {
      // Create a mock file that appears large
      const largeContent = 'x'.repeat(11 * 1024 * 1024);
      const file = new File([largeContent], 'test.mekbundle');
      expect(validateBundleFile(file)).toContain('too large');
    });
  });
});

// =============================================================================
// Bundle Preview
// =============================================================================

describe('Bundle Preview', () => {
  const mockBundle: IShareableBundle = {
    metadata: {
      version: '1.0.0',
      contentType: 'unit',
      itemCount: 3,
      author: {
        displayName: 'Test Author',
        publicKey: 'dGVzdC1rZXk=',
        friendCode: 'ABCD-EFGH-JKLM-NPQR',
      },
      createdAt: '2024-01-01T00:00:00.000Z',
      description: 'Test bundle',
      appVersion: '0.1.0',
    },
    payload: JSON.stringify([
      { id: '1', name: 'Unit 1' },
      { id: '2', name: 'Unit 2' },
      { id: '3', name: 'Unit 3' },
    ]),
    signature: 'test-signature',
  };

  it('should preview valid bundle', async () => {
    const json = serializeBundle(mockBundle);
    const preview = await previewBundle(json);

    expect(preview.valid).toBe(true);
    expect(preview.metadata).toBeDefined();
    expect(preview.itemCount).toBe(3);
    expect(preview.metadata?.author.displayName).toBe('Test Author');
    expect(preview.metadata?.description).toBe('Test bundle');
  });

  it('should reject invalid JSON', async () => {
    const preview = await previewBundle('not json');

    expect(preview.valid).toBe(false);
    expect(preview.error).toContain('not valid JSON');
  });

  it('should reject invalid bundle structure', async () => {
    const preview = await previewBundle('{}');

    expect(preview.valid).toBe(false);
    expect(preview.error).toBeDefined();
  });

  it('should reject incompatible version', async () => {
    const oldBundle = {
      ...mockBundle,
      metadata: { ...mockBundle.metadata, version: '99.0.0' },
    };
    const json = serializeBundle(oldBundle);
    const preview = await previewBundle(json);

    expect(preview.valid).toBe(false);
    expect(preview.error).toContain('Incompatible');
  });
});
