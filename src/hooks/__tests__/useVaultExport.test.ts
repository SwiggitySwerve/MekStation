/**
 * useVaultExport Hook Tests
 *
 * Tests for the vault export hook that handles exporting units,
 * pilots, and forces with server-side signing.
 */

import { renderHook, act } from '@testing-library/react';

import {
  cleanupVaultExportTest,
  createExportOptions,
  createMockBundle,
  createMockForce,
  createMockPilot,
  createMockUnit,
  mockClick,
  mockFetch,
  mockSerializeBundle,
  mockUseIdentityStore,
  mockWriteText,
  setupVaultExportTest,
} from './useVaultExport.test-helpers';

const { useVaultExport } =
  require('../useVaultExport') as typeof import('../useVaultExport');

describe('useVaultExport', () => {
  beforeEach(() => {
    setupVaultExportTest();
  });

  afterEach(() => {
    cleanupVaultExportTest();
  });

  describe('initial state', () => {
    it('should start not exporting', () => {
      const { result } = renderHook(() => useVaultExport());

      expect(result.current.exporting).toBe(false);
    });

    it('should start with no result', () => {
      const { result } = renderHook(() => useVaultExport());

      expect(result.current.result).toBeNull();
    });

    it('should start with no error', () => {
      const { result } = renderHook(() => useVaultExport());

      expect(result.current.error).toBeNull();
    });
  });

  describe('export units', () => {
    it('should fail when identity not unlocked', async () => {
      mockUseIdentityStore.mockReturnValue({
        isUnlocked: false,
        initialized: true,
        hasIdentity: true,
        publicIdentity: null,
        loading: false,
        error: null,
        checkIdentity: jest.fn(),
        createIdentity: jest.fn(),
        unlockIdentity: jest.fn(),
        lockIdentity: jest.fn(),
        updateDisplayName: jest.fn(),
        clearError: jest.fn(),
      });

      const { result } = renderHook(() => useVaultExport());
      const units = [createMockUnit()];
      const options = createExportOptions();

      const exportResult = await act(async () => {
        return await result.current.exportUnits(units, options);
      });

      expect(exportResult.success).toBe(false);
      expect(exportResult.error).toEqual({
        message: 'Identity not unlocked. Please unlock your vault first.',
      });
      expect(result.current.error).toBe(
        'Identity not unlocked. Please unlock your vault first.',
      );
    });

    it('should fail when no units provided', async () => {
      const { result } = renderHook(() => useVaultExport());
      const options = createExportOptions();

      const exportResult = await act(async () => {
        return await result.current.exportUnits([], options);
      });

      expect(exportResult.success).toBe(false);
      expect(exportResult.error).toEqual({ message: 'No units to export' });
    });

    it('should call API with correct parameters', async () => {
      const { result } = renderHook(() => useVaultExport());
      const units = [createMockUnit()];
      const options = createExportOptions();

      await act(async () => {
        await result.current.exportUnits(units, options);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/vault/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: options.password,
          contentType: 'unit',
          items: units,
          description: options.description,
          tags: options.tags,
        }),
      });
    });

    it('should complete export and set result', async () => {
      const { result } = renderHook(() => useVaultExport());
      const units = [createMockUnit()];
      const options = createExportOptions();

      await act(async () => {
        await result.current.exportUnits(units, options);
      });

      expect(result.current.exporting).toBe(false);
      expect(result.current.result?.success).toBe(true);
    });

    it('should return success result on successful export', async () => {
      const { result } = renderHook(() => useVaultExport());
      const units = [createMockUnit()];
      const options = createExportOptions();

      const exportResult = await act(async () => {
        return await result.current.exportUnits(units, options);
      });

      expect(exportResult.success).toBe(true);
      if (exportResult.success) {
        expect(exportResult.data.bundle).toBeDefined();
        expect(exportResult.data.suggestedFilename).toBe(
          'test-unit-20240101.mekbundle',
        );
      }
    });

    it('should set result state on success', async () => {
      const { result } = renderHook(() => useVaultExport());
      const units = [createMockUnit()];
      const options = createExportOptions();

      await act(async () => {
        await result.current.exportUnits(units, options);
      });

      expect(result.current.result?.success).toBe(true);
      if (result.current.result?.success) {
        expect(result.current.result.data.bundle).toBeDefined();
      }
    });

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Invalid password',
          }),
      });

      const { result } = renderHook(() => useVaultExport());
      const units = [createMockUnit()];
      const options = createExportOptions();

      const exportResult = await act(async () => {
        return await result.current.exportUnits(units, options);
      });

      expect(exportResult.success).toBe(false);
      expect(exportResult.error).toEqual({ message: 'Invalid password' });
      expect(result.current.error).toBe('Invalid password');
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useVaultExport());
      const units = [createMockUnit()];
      const options = createExportOptions();

      const exportResult = await act(async () => {
        return await result.current.exportUnits(units, options);
      });

      expect(exportResult.success).toBe(false);
      expect(exportResult.error).toEqual({ message: 'Network error' });
      expect(result.current.error).toBe('Network error');
    });

    it('should clear error before export', async () => {
      const { result } = renderHook(() => useVaultExport());
      const units = [createMockUnit()];
      const options = createExportOptions();

      // First, cause an error
      mockFetch.mockRejectedValueOnce(new Error('First error'));
      await act(async () => {
        await result.current.exportUnits(units, options);
      });
      expect(result.current.error).toBe('First error');

      // Then, successful export should clear error
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            bundle: createMockBundle(),
            suggestedFilename: 'test.mekbundle',
          }),
      });

      await act(async () => {
        await result.current.exportUnits(units, options);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('export pilots', () => {
    it('should call API with pilot content type', async () => {
      const { result } = renderHook(() => useVaultExport());
      const pilots = [createMockPilot()];
      const options = createExportOptions();

      await act(async () => {
        await result.current.exportPilots(pilots, options);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/vault/sign',
        expect.objectContaining({
          // oxlint-disable-next-line @typescript-eslint/no-unsafe-assignment
          body: expect.stringContaining('"contentType":"pilot"'),
        }),
      );
    });

    it('should fail when no pilots provided', async () => {
      const { result } = renderHook(() => useVaultExport());
      const options = createExportOptions();

      const exportResult = await act(async () => {
        return await result.current.exportPilots([], options);
      });

      expect(exportResult.success).toBe(false);
      expect(exportResult.error).toEqual({ message: 'No pilots to export' });
    });

    it('should return success on successful pilot export', async () => {
      const { result } = renderHook(() => useVaultExport());
      const pilots = [createMockPilot()];
      const options = createExportOptions();

      const exportResult = await act(async () => {
        return await result.current.exportPilots(pilots, options);
      });

      expect(exportResult.success).toBe(true);
    });
  });

  describe('export forces', () => {
    it('should call API with force content type', async () => {
      const { result } = renderHook(() => useVaultExport());
      const forces = [createMockForce()];
      const options = createExportOptions();

      await act(async () => {
        await result.current.exportForces(forces, options);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/vault/sign',
        expect.objectContaining({
          // oxlint-disable-next-line @typescript-eslint/no-unsafe-assignment
          body: expect.stringContaining('"contentType":"force"'),
        }),
      );
    });

    it('should fail when no forces provided', async () => {
      const { result } = renderHook(() => useVaultExport());
      const options = createExportOptions();

      const exportResult = await act(async () => {
        return await result.current.exportForces([], options);
      });

      expect(exportResult.success).toBe(false);
      expect(exportResult.error).toEqual({ message: 'No forces to export' });
    });

    it('should return success on successful force export', async () => {
      const { result } = renderHook(() => useVaultExport());
      const forces = [createMockForce()];
      const options = createExportOptions();

      const exportResult = await act(async () => {
        return await result.current.exportForces(forces, options);
      });

      expect(exportResult.success).toBe(true);
    });
  });

  describe('download result', () => {
    it('should not download when no result', () => {
      const { result } = renderHook(() => useVaultExport());

      act(() => {
        result.current.downloadResult();
      });

      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('should not download when result is unsuccessful', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ success: false, error: 'Failed' }),
      });

      const { result } = renderHook(() => useVaultExport());
      const units = [createMockUnit()];
      const options = createExportOptions();

      await act(async () => {
        await result.current.exportUnits(units, options);
      });

      act(() => {
        result.current.downloadResult();
      });

      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('should create blob and trigger download', async () => {
      const { result } = renderHook(() => useVaultExport());
      const units = [createMockUnit()];
      const options = createExportOptions();

      await act(async () => {
        await result.current.exportUnits(units, options);
      });

      act(() => {
        result.current.downloadResult();
      });

      expect(mockSerializeBundle).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('copy to clipboard', () => {
    it('should not copy when no result', async () => {
      const { result } = renderHook(() => useVaultExport());

      await act(async () => {
        await result.current.copyToClipboard();
      });

      expect(mockWriteText).not.toHaveBeenCalled();
    });

    it('should not copy when result is unsuccessful', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ success: false, error: 'Failed' }),
      });

      const { result } = renderHook(() => useVaultExport());
      const units = [createMockUnit()];
      const options = createExportOptions();

      await act(async () => {
        await result.current.exportUnits(units, options);
      });

      await act(async () => {
        await result.current.copyToClipboard();
      });

      expect(mockWriteText).not.toHaveBeenCalled();
    });

    it('should serialize and copy to clipboard', async () => {
      const { result } = renderHook(() => useVaultExport());
      const units = [createMockUnit()];
      const options = createExportOptions();

      await act(async () => {
        await result.current.exportUnits(units, options);
      });

      await act(async () => {
        await result.current.copyToClipboard();
      });

      expect(mockSerializeBundle).toHaveBeenCalled();
      expect(mockWriteText).toHaveBeenCalledWith('{"serialized":"bundle"}');
    });
  });

  describe('clear', () => {
    it('should clear result and error', async () => {
      const { result } = renderHook(() => useVaultExport());
      const units = [createMockUnit()];
      const options = createExportOptions();

      // First export to set result
      await act(async () => {
        await result.current.exportUnits(units, options);
      });

      expect(result.current.result).not.toBeNull();

      // Clear
      act(() => {
        result.current.clear();
      });

      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should clear error after failed export', async () => {
      mockFetch.mockRejectedValue(new Error('Export failed'));

      const { result } = renderHook(() => useVaultExport());
      const units = [createMockUnit()];
      const options = createExportOptions();

      await act(async () => {
        await result.current.exportUnits(units, options);
      });

      expect(result.current.error).toBe('Export failed');

      act(() => {
        result.current.clear();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('multiple exports', () => {
    it('should handle multiple sequential exports', async () => {
      const { result } = renderHook(() => useVaultExport());
      const units = [createMockUnit()];
      const pilots = [createMockPilot()];
      const options = createExportOptions();

      // Export units
      await act(async () => {
        await result.current.exportUnits(units, options);
      });

      expect(result.current.result?.success).toBe(true);

      // Export pilots
      await act(async () => {
        await result.current.exportPilots(pilots, options);
      });

      expect(result.current.result?.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
