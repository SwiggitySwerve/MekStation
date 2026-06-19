import { act, renderHook } from '@testing-library/react';

import type { IImportConflict } from '@/types/vault';

import {
  createMockConflict,
  createMockFile,
  createMockHandlers,
  mockBundleContent,
  mockImportFromString,
  setupVaultImportTest,
} from './useVaultImport.test-helpers';

const { useVaultImport } =
  require('../useVaultImport') as typeof import('../useVaultImport');

describe('useVaultImport string import and reset', () => {
  beforeEach(() => {
    setupVaultImportTest();
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

      await act(async () => {
        await result.current.importString(mockBundleContent, handlers);
      });

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
      const resolutions = [createMockConflict('replace')];

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

      await act(async () => {
        await result.current.selectFile(file);
      });

      await act(async () => {
        await result.current.importFile(handlers);
      });

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
