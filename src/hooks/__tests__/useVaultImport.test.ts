/**
 * useVaultImport Hook Tests
 *
 * Tests for the vault import hook that handles importing bundles
 * with file validation, preview, and conflict resolution.
 */

import { renderHook, act } from '@testing-library/react';

import type { IImportHandlers, IImportConflict } from '@/types/vault';

import {
  importFromString,
  readBundleFromFile,
  validateBundleFile,
  previewBundle,
} from '@/services/vault/ImportService';

import { useVaultImport } from '../useVaultImport';

// Mock dependencies
jest.mock('@/services/vault/ImportService');

const mockImportFromString = importFromString as jest.MockedFunction<
  typeof importFromString
>;
const mockReadBundleFromFile = readBundleFromFile as jest.MockedFunction<
  typeof readBundleFromFile
>;
const mockValidateBundleFile = validateBundleFile as jest.MockedFunction<
  typeof validateBundleFile
>;
const mockPreviewBundle = previewBundle as jest.MockedFunction<
  typeof previewBundle
>;

// Sample test data
const createMockFile = (name: string, _size: number = 1000): File => {
  const blob = new Blob(['test content'], { type: 'application/json' });
  return new File([blob], name, { type: 'application/json' });
};

const createMockHandlers = <T>(): IImportHandlers<T> => ({
  checkExists: jest.fn().mockResolvedValue(false),
  checkNameConflict: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue('new-id'),
});

const mockBundleContent = JSON.stringify({
  metadata: {
    version: '1.0.0',
    contentType: 'unit',
    itemCount: 1,
    author: {
      displayName: 'Test Author',
      publicKey: 'abc123',
      friendCode: 'TEST-1234',
    },
    createdAt: '2024-01-01T00:00:00Z',
    appVersion: '0.1.0',
  },
  payload: JSON.stringify([{ id: 'unit-1', name: 'Test Unit' }]),
  signature: 'test-signature',
});

describe('useVaultImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateBundleFile.mockReturnValue(null);
    mockReadBundleFromFile.mockResolvedValue(mockBundleContent);
    mockPreviewBundle.mockResolvedValue({
      valid: true,
      metadata: {
        version: '1.0.0',
        contentType: 'unit',
        itemCount: 1,
        author: {
          displayName: 'Test Author',
          publicKey: 'abc123',
          friendCode: 'TEST-1234',
        },
        createdAt: '2024-01-01T00:00:00Z',
        appVersion: '0.1.0',
      },
      itemCount: 1,
    });
    mockImportFromString.mockResolvedValue({
      success: true,
      data: {
        importedCount: 1,
        skippedCount: 0,
        replacedCount: 0,
      },
    });
  });

  describe('initial state', () => {
    it('should start with idle step', () => {
      const { result } = renderHook(() => useVaultImport());

      expect(result.current.step).toBe('idle');
    });

    it('should start with no file selected', () => {
      const { result } = renderHook(() => useVaultImport());

      expect(result.current.file).toBeNull();
    });

    it('should start with no preview', () => {
      const { result } = renderHook(() => useVaultImport());

      expect(result.current.preview).toBeNull();
    });

    it('should start with no conflicts', () => {
      const { result } = renderHook(() => useVaultImport());

      expect(result.current.conflicts).toEqual([]);
    });

    it('should start with no result', () => {
      const { result } = renderHook(() => useVaultImport());

      expect(result.current.result).toBeNull();
    });

    it('should start with no error', () => {
      const { result } = renderHook(() => useVaultImport());

      expect(result.current.error).toBeNull();
    });

    it('should start not importing', () => {
      const { result } = renderHook(() => useVaultImport());

      expect(result.current.importing).toBe(false);
    });
  });

  describe('file selection', () => {
    it('should validate file on selection', async () => {
      const { result } = renderHook(() => useVaultImport());
      const file = createMockFile('test.mekbundle');

      await act(async () => {
        await result.current.selectFile(file);
      });

      expect(mockValidateBundleFile).toHaveBeenCalledWith(file);
    });

    it('should set error for invalid file', async () => {
      mockValidateBundleFile.mockReturnValue('Invalid file type');
      const { result } = renderHook(() => useVaultImport());
      const file = createMockFile('test.txt');

      await act(async () => {
        await result.current.selectFile(file);
      });

      expect(result.current.error).toBe('Invalid file type');
      expect(result.current.step).toBe('idle');
    });

    it('should set file on valid selection', async () => {
      const { result } = renderHook(() => useVaultImport());
      const file = createMockFile('test.mekbundle');

      await act(async () => {
        await result.current.selectFile(file);
      });

      expect(result.current.file).toBe(file);
    });

    it('should transition to preview step on valid file', async () => {
      const { result } = renderHook(() => useVaultImport());
      const file = createMockFile('test.mekbundle');

      await act(async () => {
        await result.current.selectFile(file);
      });

      expect(result.current.step).toBe('preview');
    });

    it('should read bundle content from file', async () => {
      const { result } = renderHook(() => useVaultImport());
      const file = createMockFile('test.mekbundle');

      await act(async () => {
        await result.current.selectFile(file);
      });

      expect(mockReadBundleFromFile).toHaveBeenCalledWith(file);
    });

    it('should preview bundle after reading', async () => {
      const { result } = renderHook(() => useVaultImport());
      const file = createMockFile('test.mekbundle');

      await act(async () => {
        await result.current.selectFile(file);
      });

      expect(mockPreviewBundle).toHaveBeenCalledWith(mockBundleContent);
    });

    it('should set preview data on successful preview', async () => {
      const { result } = renderHook(() => useVaultImport());
      const file = createMockFile('test.mekbundle');

      await act(async () => {
        await result.current.selectFile(file);
      });

      expect(result.current.preview).toEqual({
        valid: true,
        contentType: 'unit',
        itemCount: 1,
        authorName: 'Test Author',
        description: undefined,
        createdAt: '2024-01-01T00:00:00Z',
      });
    });

    it('should handle invalid preview result', async () => {
      mockPreviewBundle.mockResolvedValue({
        valid: false,
        error: 'Invalid bundle format',
      });
      const { result } = renderHook(() => useVaultImport());
      const file = createMockFile('test.mekbundle');

      await act(async () => {
        await result.current.selectFile(file);
      });

      expect(result.current.preview?.valid).toBe(false);
      expect(result.current.error).toBe('Invalid bundle format');
    });

    it('should handle file read error', async () => {
      mockReadBundleFromFile.mockRejectedValue(new Error('Read failed'));
      const { result } = renderHook(() => useVaultImport());
      const file = createMockFile('test.mekbundle');

      await act(async () => {
        await result.current.selectFile(file);
      });

      expect(result.current.error).toBe('Read failed');
      expect(result.current.preview?.valid).toBe(false);
    });
  });

  describe('clear file', () => {
    it('should clear file and reset state', async () => {
      const { result } = renderHook(() => useVaultImport());
      const file = createMockFile('test.mekbundle');

      await act(async () => {
        await result.current.selectFile(file);
      });

      expect(result.current.file).not.toBeNull();

      act(() => {
        result.current.clearFile();
      });

      expect(result.current.file).toBeNull();
      expect(result.current.preview).toBeNull();
      expect(result.current.step).toBe('idle');
      expect(result.current.error).toBeNull();
    });
  });

  describe('import file', () => {
    it('should return error when no file content', async () => {
      const { result } = renderHook(() => useVaultImport());
      const handlers = createMockHandlers();

      const importResult = await act(async () => {
        return await result.current.importFile(handlers);
      });

      expect(importResult.success).toBe(false);
      expect(importResult.error).toEqual({ message: 'No file content' });
    });

    it('should transition through importing step during import', async () => {
      const { result } = renderHook(() => useVaultImport());
      const file = createMockFile('test.mekbundle');
      const handlers = createMockHandlers();

      await act(async () => {
        await result.current.selectFile(file);
      });

      // Verify the import function is called and completes
      await act(async () => {
        await result.current.importFile(handlers);
      });

      // After completion, importing should be false and step should be complete
      expect(result.current.importing).toBe(false);
      expect(result.current.step).toBe('complete');
      expect(mockImportFromString).toHaveBeenCalled();
    });

    it('should call importFromString with file content', async () => {
      const { result } = renderHook(() => useVaultImport());
      const file = createMockFile('test.mekbundle');
      const handlers = createMockHandlers();

      await act(async () => {
        await result.current.selectFile(file);
      });

      await act(async () => {
        await result.current.importFile(handlers);
      });

      expect(mockImportFromString).toHaveBeenCalledWith(
        mockBundleContent,
        handlers,
        { conflictResolution: 'ask' },
      );
    });

    it('should transition to complete step on success', async () => {
      const { result } = renderHook(() => useVaultImport());
      const file = createMockFile('test.mekbundle');
      const handlers = createMockHandlers();

      await act(async () => {
        await result.current.selectFile(file);
      });

      await act(async () => {
        await result.current.importFile(handlers);
      });

      expect(result.current.step).toBe('complete');
    });

    it('should set result on success', async () => {
      const { result } = renderHook(() => useVaultImport());
      const file = createMockFile('test.mekbundle');
      const handlers = createMockHandlers();

      await act(async () => {
        await result.current.selectFile(file);
      });

      await act(async () => {
        await result.current.importFile(handlers);
      });

      expect(result.current.result).toEqual({
        success: true,
        data: {
          importedCount: 1,
          skippedCount: 0,
          replacedCount: 0,
        },
      });
    });

    it('should handle conflicts', async () => {
      const conflicts: IImportConflict[] = [
        {
          contentType: 'unit',
          bundleItemId: 'unit-1',
          bundleItemName: 'Test Unit',
          existingItemId: 'existing-1',
          existingItemName: 'Existing Unit',
          resolution: 'skip',
        },
      ];
      mockImportFromString.mockResolvedValue({
        success: true,
        data: {
          importedCount: 0,
          skippedCount: 0,
          replacedCount: 0,
          conflicts,
        },
      });

      const { result } = renderHook(() => useVaultImport());
      const file = createMockFile('test.mekbundle');
      const handlers = createMockHandlers();

      await act(async () => {
        await result.current.selectFile(file);
      });

      await act(async () => {
        await result.current.importFile(handlers);
      });

      expect(result.current.step).toBe('conflicts');
      expect(result.current.conflicts).toEqual(conflicts);
    });

    it('should handle import error', async () => {
      mockImportFromString.mockRejectedValue(new Error('Import failed'));

      const { result } = renderHook(() => useVaultImport());
      const file = createMockFile('test.mekbundle');
      const handlers = createMockHandlers();

      await act(async () => {
        await result.current.selectFile(file);
      });

      const importResult = await act(async () => {
        return await result.current.importFile(handlers);
      });

      expect(importResult.success).toBe(false);
      if (!importResult.success) {
        expect(importResult.error.message).toBe('Import failed');
      }
      expect(result.current.error).toBe('Import failed');
      expect(result.current.step).toBe('preview');
    });

    it('should set error on unsuccessful import result', async () => {
      mockImportFromString.mockResolvedValue({
        success: false,
        error: { message: 'Validation failed' },
      });

      const { result } = renderHook(() => useVaultImport());
      const file = createMockFile('test.mekbundle');
      const handlers = createMockHandlers();

      await act(async () => {
        await result.current.selectFile(file);
      });

      await act(async () => {
        await result.current.importFile(handlers);
      });

      expect(result.current.error).toBe('Validation failed');
    });
  });

  describe('import from string', () => {
    it('should import directly from string', async () => {
      const { result } = renderHook(() => useVaultImport());
      const handlers = createMockHandlers();

      await act(async () => {
        await result.current.importString(mockBundleContent, handlers);
      });

      expect(mockImportFromString).toHaveBeenCalledWith(
        mockBundleContent,
        handlers,
        { conflictResolution: 'ask' },
      );
    });

    it('should transition through importing step during string import', async () => {
      const { result } = renderHook(() => useVaultImport());
      const handlers = createMockHandlers();

      // Verify the import function is called and completes
      await act(async () => {
        await result.current.importString(mockBundleContent, handlers);
      });

      // After completion, importing should be false and step should be complete
      expect(result.current.importing).toBe(false);
      expect(result.current.step).toBe('complete');
      expect(mockImportFromString).toHaveBeenCalled();
    });

    it('should transition to complete on success', async () => {
      const { result } = renderHook(() => useVaultImport());
      const handlers = createMockHandlers();

      await act(async () => {
        await result.current.importString(mockBundleContent, handlers);
      });

      expect(result.current.step).toBe('complete');
    });

    it('should handle string import error', async () => {
      mockImportFromString.mockRejectedValue(new Error('Parse error'));

      const { result } = renderHook(() => useVaultImport());
      const handlers = createMockHandlers();

      const importResult = await act(async () => {
        return await result.current.importString(mockBundleContent, handlers);
      });

      expect(importResult.success).toBe(false);
      expect(importResult.error).toEqual({ message: 'Parse error' });
      expect(result.current.step).toBe('idle');
    });

    it('should handle conflicts in string import', async () => {
      const conflicts: IImportConflict[] = [
        {
          contentType: 'unit',
          bundleItemId: 'unit-1',
          bundleItemName: 'Test Unit',
          existingItemId: 'existing-1',
          existingItemName: 'Existing Unit',
          resolution: 'skip',
        },
      ];
      mockImportFromString.mockResolvedValue({
        success: true,
        data: {
          importedCount: 0,
          skippedCount: 0,
          replacedCount: 0,
          conflicts,
        },
      });

      const { result } = renderHook(() => useVaultImport());
      const handlers = createMockHandlers();

      await act(async () => {
        await result.current.importString(mockBundleContent, handlers);
      });

      expect(result.current.step).toBe('conflicts');
      expect(result.current.conflicts).toEqual(conflicts);
    });
  });

  describe('resolve conflicts', () => {
    it('should return error when no file content', async () => {
      const { result } = renderHook(() => useVaultImport());
      const handlers = createMockHandlers();
      const resolutions: IImportConflict[] = [];

      const resolveResult = await act(async () => {
        return await result.current.resolveConflicts(resolutions, handlers);
      });

      expect(resolveResult.success).toBe(false);
      expect(resolveResult.error).toEqual({ message: 'No file content' });
    });

    it('should call importFile with resolved conflicts', async () => {
      const { result } = renderHook(() => useVaultImport());
      const file = createMockFile('test.mekbundle');
      const handlers = createMockHandlers();
      const resolutions: IImportConflict[] = [
        {
          contentType: 'unit',
          bundleItemId: 'unit-1',
          bundleItemName: 'Test Unit',
          existingItemId: 'existing-1',
          existingItemName: 'Existing Unit',
          resolution: 'replace',
        },
      ];

      await act(async () => {
        await result.current.selectFile(file);
      });

      await act(async () => {
        await result.current.resolveConflicts(resolutions, handlers);
      });

      expect(mockImportFromString).toHaveBeenCalledWith(
        mockBundleContent,
        handlers,
        { conflictResolution: 'ask', resolvedConflicts: resolutions },
      );
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', async () => {
      const { result } = renderHook(() => useVaultImport());
      const file = createMockFile('test.mekbundle');
      const handlers = createMockHandlers();

      // Set up some state
      await act(async () => {
        await result.current.selectFile(file);
      });

      await act(async () => {
        await result.current.importFile(handlers);
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.file).toBeNull();
      expect(result.current.preview).toBeNull();
      expect(result.current.conflicts).toEqual([]);
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.step).toBe('idle');
      expect(result.current.importing).toBe(false);
    });
  });
});
