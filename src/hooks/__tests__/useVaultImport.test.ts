/**
 * useVaultImport Hook Tests
 *
 * Tests for the vault import hook that handles importing bundles
 * with file validation, preview, and conflict resolution.
 */

import { renderHook, act } from '@testing-library/react';

import {
  createMockConflict,
  createMockFile,
  createMockHandlers,
  mockBundleContent,
  mockImportFromString,
  mockPreviewBundle,
  mockReadBundleFromFile,
  mockValidateBundleFile,
  setupVaultImportTest,
} from './useVaultImport.test-helpers';

const { useVaultImport } =
  require('../useVaultImport') as typeof import('../useVaultImport');

describe('useVaultImport', () => {
  beforeEach(() => {
    setupVaultImportTest();
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
      const conflicts = [createMockConflict()];
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
});
