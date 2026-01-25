/**
 * useVaultExport Hook Tests
 *
 * Tests for the vault export hook that handles exporting units,
 * pilots, and forces with server-side signing.
 */

import { renderHook, act } from '@testing-library/react';
import { useVaultExport, ExportOptions } from '../useVaultExport';
import { useIdentityStore } from '@/stores/useIdentityStore';
import { serializeBundle } from '@/services/vault/BundleService';
import type { IExportableUnit, IExportablePilot, IExportableForce, IShareableBundle } from '@/types/vault';

// Mock dependencies
jest.mock('@/stores/useIdentityStore');
jest.mock('@/services/vault/BundleService');

const mockUseIdentityStore = useIdentityStore as jest.MockedFunction<typeof useIdentityStore>;
const mockSerializeBundle = serializeBundle as jest.MockedFunction<typeof serializeBundle>;

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Sample test data
const createMockBundle = (): IShareableBundle => ({
  metadata: {
    version: '1.0.0',
    contentType: 'unit',
    itemCount: 1,
    author: { displayName: 'Test Author', publicKey: 'abc123', friendCode: 'TEST-1234' },
    createdAt: '2024-01-01T00:00:00Z',
    appVersion: '0.1.0',
  },
  payload: JSON.stringify([{ id: 'unit-1', name: 'Test Unit' }]),
  signature: 'test-signature',
});

const createMockUnit = (overrides: Partial<IExportableUnit> = {}): IExportableUnit => ({
  id: 'unit-1',
  name: 'Test Mech',
  chassis: 'Atlas',
  model: 'AS7-D',
  data: { tonnage: 100 },
  ...overrides,
});

const createMockPilot = (overrides: Partial<IExportablePilot> = {}): IExportablePilot => ({
  id: 'pilot-1',
  name: 'John Doe',
  callsign: 'Maverick',
  data: { gunnery: 4, piloting: 5 },
  ...overrides,
});

const createMockForce = (overrides: Partial<IExportableForce> = {}): IExportableForce => ({
  id: 'force-1',
  name: 'Alpha Lance',
  description: 'Test force',
  data: { units: [] },
  ...overrides,
});

const createExportOptions = (overrides: Partial<ExportOptions> = {}): ExportOptions => ({
  password: 'test-password',
  description: 'Test export',
  tags: ['test'],
  ...overrides,
});

describe('useVaultExport', () => {
  // Store original implementations
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  
  // Mock functions for DOM operations
  const mockClick = jest.fn();
  const mockWriteText = jest.fn();
  let createElementSpy: jest.SpyInstance;
  let appendChildSpy: jest.SpyInstance;
  let removeChildSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default identity store mock - unlocked
    mockUseIdentityStore.mockReturnValue({
      isUnlocked: true,
      initialized: true,
      hasIdentity: true,
      publicIdentity: { displayName: 'Test User', publicKey: 'abc123', friendCode: 'TEST-1234' },
      loading: false,
      error: null,
      checkIdentity: jest.fn(),
      createIdentity: jest.fn(),
      unlockIdentity: jest.fn(),
      lockIdentity: jest.fn(),
      updateDisplayName: jest.fn(),
      clearError: jest.fn(),
    });

    // Default fetch mock - success
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        bundle: createMockBundle(),
        suggestedFilename: 'test-unit-20240101.mekbundle',
      }),
    });

    // Default serialize mock
    mockSerializeBundle.mockReturnValue('{"serialized":"bundle"}');

    // Setup URL mocks
    URL.createObjectURL = jest.fn().mockReturnValue('blob:test-url');
    URL.revokeObjectURL = jest.fn();
    
    // Setup DOM spies - only intercept anchor element creation
    // eslint-disable-next-line no-restricted-syntax
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick,
    } as unknown as HTMLAnchorElement;
    
    const originalCreateElement = document.createElement.bind(document);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tagName: string): any => {
      if (tagName === 'a') {
        return mockAnchor;
      }
      // Call original for other elements (needed by React Testing Library)
      return originalCreateElement(tagName);
    });
    
    appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    // Mock clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText.mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore original implementations
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    createElementSpy?.mockRestore();
    appendChildSpy?.mockRestore();
    removeChildSpy?.mockRestore();
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
      expect(exportResult.error).toBe('Identity not unlocked. Please unlock your vault first.');
      expect(result.current.error).toBe('Identity not unlocked. Please unlock your vault first.');
    });

    it('should fail when no units provided', async () => {
      const { result } = renderHook(() => useVaultExport());
      const options = createExportOptions();

      const exportResult = await act(async () => {
        return await result.current.exportUnits([], options);
      });

      expect(exportResult.success).toBe(false);
      expect(exportResult.error).toBe('No units to export');
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
      expect(exportResult.bundle).toBeDefined();
      expect(exportResult.suggestedFilename).toBe('test-unit-20240101.mekbundle');
    });

    it('should set result state on success', async () => {
      const { result } = renderHook(() => useVaultExport());
      const units = [createMockUnit()];
      const options = createExportOptions();

      await act(async () => {
        await result.current.exportUnits(units, options);
      });

      expect(result.current.result?.success).toBe(true);
      expect(result.current.result?.bundle).toBeDefined();
    });

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({
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
      expect(exportResult.error).toBe('Invalid password');
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
      expect(exportResult.error).toBe('Network error');
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
        json: () => Promise.resolve({
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

      expect(mockFetch).toHaveBeenCalledWith('/api/vault/sign', expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        body: expect.stringContaining('"contentType":"pilot"'),
      }));
    });

    it('should fail when no pilots provided', async () => {
      const { result } = renderHook(() => useVaultExport());
      const options = createExportOptions();

      const exportResult = await act(async () => {
        return await result.current.exportPilots([], options);
      });

      expect(exportResult.success).toBe(false);
      expect(exportResult.error).toBe('No pilots to export');
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

      expect(mockFetch).toHaveBeenCalledWith('/api/vault/sign', expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        body: expect.stringContaining('"contentType":"force"'),
      }));
    });

    it('should fail when no forces provided', async () => {
      const { result } = renderHook(() => useVaultExport());
      const options = createExportOptions();

      const exportResult = await act(async () => {
        return await result.current.exportForces([], options);
      });

      expect(exportResult.success).toBe(false);
      expect(exportResult.error).toBe('No forces to export');
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
