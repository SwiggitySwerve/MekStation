/**
 * Export Service Tests
 *
 * Tests for exporting units, pilots, and forces as signed bundles.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IVaultIdentity,
  IExportableUnit,
  IExportablePilot,
  IExportableForce,
  IExportResult,
} from '@/types/vault';

// =============================================================================
// Mock BundleService
// =============================================================================

const mockCreateBundle = jest.fn();
const mockSerializeBundle = jest.fn();

jest.mock('../BundleService', () => ({
  createBundle: (...args: unknown[]): unknown => mockCreateBundle(...args),
  serializeBundle: (...args: unknown[]): string =>
    mockSerializeBundle(...args) as string,
}));

// Import after mocking
import {
  exportUnit,
  exportUnits,
  exportPilot,
  exportPilots,
  exportForce,
  exportForces,
  exportContent,
  downloadBundle,
  copyBundleToClipboard,
} from '../ExportService';

// =============================================================================
// Test Fixtures
// =============================================================================

const mockIdentity: IVaultIdentity = {
  id: 'identity-test-1',
  displayName: 'Test User',
  publicKey: 'dGVzdC1wdWJsaWMta2V5LWJhc2U2NA==',
  privateKey: 'dGVzdC1wcml2YXRlLWtleS1iYXNlNjQ=',
  friendCode: 'TEST-1234-ABCD',
  createdAt: '2025-01-01T00:00:00.000Z',
  avatar: 'default',
};

const mockUnit: IExportableUnit = {
  id: 'unit-atlas-1',
  name: 'Atlas AS7-D',
  chassis: 'Atlas',
  model: 'AS7-D',
  data: {
    tonnage: 100,
    techBase: 'Inner Sphere',
    armor: { total: 304 },
  },
};

const mockUnit2: IExportableUnit = {
  id: 'unit-locust-1',
  name: 'Locust LCT-1V',
  chassis: 'Locust',
  model: 'LCT-1V',
  data: {
    tonnage: 20,
    techBase: 'Inner Sphere',
    armor: { total: 32 },
  },
};

const mockPilot: IExportablePilot = {
  id: 'pilot-1',
  name: 'John Smith',
  callsign: 'Maverick',
  data: {
    gunnery: 4,
    piloting: 5,
    skills: ['Jumping Jack', 'Iron Will'],
  },
};

const mockPilot2: IExportablePilot = {
  id: 'pilot-2',
  name: 'Jane Doe',
  callsign: 'Phoenix',
  data: {
    gunnery: 3,
    piloting: 4,
    skills: ['Natural Aptitude'],
  },
};

const mockForce: IExportableForce = {
  id: 'force-1',
  name: 'Alpha Lance',
  description: 'Assault lance',
  data: {
    faction: 'Steiner',
    era: 3025,
  },
  pilots: [mockPilot],
  units: [mockUnit],
};

const mockForce2: IExportableForce = {
  id: 'force-2',
  name: 'Beta Lance',
  description: 'Recon lance',
  data: {
    faction: 'Davion',
    era: 3025,
  },
};

const mockSuccessResult: IExportResult = {
  success: true,
  data: {
    bundle: {
      metadata: {
        version: '1.0.0',
        contentType: 'unit',
        itemCount: 1,
        author: {
          displayName: 'Test User',
          publicKey: 'dGVzdC1wdWJsaWMta2V5',
          friendCode: 'TEST-1234-ABCD',
        },
        createdAt: '2025-01-01T00:00:00.000Z',
        appVersion: '0.1.0',
      },
      payload: JSON.stringify([mockUnit]),
      signature: 'test-signature',
    },
    suggestedFilename: 'atlas-as7-d-20250101.mekbundle',
  },
};

// =============================================================================
// Tests
// =============================================================================

describe('ExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateBundle.mockResolvedValue(mockSuccessResult);
    mockSerializeBundle.mockReturnValue(
      JSON.stringify(mockSuccessResult.data.bundle),
    );
  });

  // ===========================================================================
  // Unit Export
  // ===========================================================================

  describe('Unit Export', () => {
    describe('exportUnit', () => {
      it('should export a single unit', async () => {
        const result = await exportUnit(mockUnit, mockIdentity);

        expect(mockCreateBundle).toHaveBeenCalledWith(
          'unit',
          [mockUnit],
          mockIdentity,
          {},
        );
        expect(result).toEqual(mockSuccessResult);
      });

      it('should export unit with options', async () => {
        const options = {
          description: 'My favorite mech',
          tags: ['assault', 'inner-sphere'],
        };

        await exportUnit(mockUnit, mockIdentity, options);

        expect(mockCreateBundle).toHaveBeenCalledWith(
          'unit',
          [mockUnit],
          mockIdentity,
          options,
        );
      });
    });

    describe('exportUnits', () => {
      it('should export multiple units', async () => {
        const units = [mockUnit, mockUnit2];
        mockCreateBundle.mockResolvedValue({
          ...mockSuccessResult,
          data: {
            ...mockSuccessResult.data,
            bundle: {
              ...mockSuccessResult.data.bundle,
              metadata: {
                ...mockSuccessResult.data.bundle.metadata,
                itemCount: 2,
              },
            },
          },
        });

        const result = await exportUnits(units, mockIdentity);

        expect(mockCreateBundle).toHaveBeenCalledWith(
          'unit',
          units,
          mockIdentity,
          {},
        );
        expect(result.success).toBe(true);
      });

      it('should return error for empty units array', async () => {
        const result = await exportUnits([], mockIdentity);

        expect(result.success).toBe(false);
        expect(result.error).toEqual({ message: 'No units to export' });
        expect(mockCreateBundle).not.toHaveBeenCalled();
      });

      it('should export units with options', async () => {
        const units = [mockUnit];
        const options = { description: 'Export batch' };

        await exportUnits(units, mockIdentity, options);

        expect(mockCreateBundle).toHaveBeenCalledWith(
          'unit',
          units,
          mockIdentity,
          options,
        );
      });
    });
  });

  // ===========================================================================
  // Pilot Export
  // ===========================================================================

  describe('Pilot Export', () => {
    describe('exportPilot', () => {
      it('should export a single pilot', async () => {
        mockCreateBundle.mockResolvedValue({
          ...mockSuccessResult,
          data: {
            ...mockSuccessResult.data,
            bundle: {
              ...mockSuccessResult.data.bundle,
              metadata: {
                ...mockSuccessResult.data.bundle.metadata,
                contentType: 'pilot',
              },
            },
          },
        });

        const result = await exportPilot(mockPilot, mockIdentity);

        expect(mockCreateBundle).toHaveBeenCalledWith(
          'pilot',
          [mockPilot],
          mockIdentity,
          {},
        );
        expect(result.success).toBe(true);
      });

      it('should export pilot with options', async () => {
        const options = { tags: ['elite', 'veteran'] };

        await exportPilot(mockPilot, mockIdentity, options);

        expect(mockCreateBundle).toHaveBeenCalledWith(
          'pilot',
          [mockPilot],
          mockIdentity,
          options,
        );
      });
    });

    describe('exportPilots', () => {
      it('should export multiple pilots', async () => {
        const pilots = [mockPilot, mockPilot2];

        await exportPilots(pilots, mockIdentity);

        expect(mockCreateBundle).toHaveBeenCalledWith(
          'pilot',
          pilots,
          mockIdentity,
          {},
        );
      });

      it('should return error for empty pilots array', async () => {
        const result = await exportPilots([], mockIdentity);

        expect(result.success).toBe(false);
        expect(result.error).toEqual({ message: 'No pilots to export' });
        expect(mockCreateBundle).not.toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // Force Export
  // ===========================================================================

  describe('Force Export', () => {
    describe('exportForce', () => {
      it('should export a single force', async () => {
        mockCreateBundle.mockResolvedValue({
          ...mockSuccessResult,
          data: {
            ...mockSuccessResult.data,
            bundle: {
              ...mockSuccessResult.data.bundle,
              metadata: {
                ...mockSuccessResult.data.bundle.metadata,
                contentType: 'force',
              },
            },
          },
        });

        const result = await exportForce(mockForce, mockIdentity);

        expect(mockCreateBundle).toHaveBeenCalledWith(
          'force',
          expect.arrayContaining([expect.objectContaining({ id: 'force-1' })]),
          mockIdentity,
          {},
        );
        expect(result.success).toBe(true);
      });

      it('should include nested data when includeNested is true', async () => {
        const options = { includeNested: true };

        await exportForce(mockForce, mockIdentity, options);

        expect(mockCreateBundle).toHaveBeenCalledWith(
          'force',
          [mockForce],
          mockIdentity,
          options,
        );
      });

      it('should strip nested data when includeNested is false', async () => {
        const options = { includeNested: false };

        await exportForce(mockForce, mockIdentity, options);

        expect(mockCreateBundle).toHaveBeenCalledWith(
          'force',
          [
            expect.objectContaining({
              id: 'force-1',
              pilots: undefined,
              units: undefined,
            }),
          ],
          mockIdentity,
          options,
        );
      });
    });

    describe('exportForces', () => {
      it('should export multiple forces', async () => {
        const forces = [mockForce, mockForce2];

        await exportForces(forces, mockIdentity);

        expect(mockCreateBundle).toHaveBeenCalledWith(
          'force',
          expect.any(Array),
          mockIdentity,
          {},
        );
      });

      it('should return error for empty forces array', async () => {
        const result = await exportForces([], mockIdentity);

        expect(result.success).toBe(false);
        expect(result.error).toEqual({ message: 'No forces to export' });
        expect(mockCreateBundle).not.toHaveBeenCalled();
      });

      it('should strip nested data from all forces when not including', async () => {
        const forces = [mockForce, mockForce2];
        const options = { includeNested: false };

        await exportForces(forces, mockIdentity, options);

        const callArgs = mockCreateBundle.mock.calls[0] as unknown[];
        const exportedForces = callArgs[1] as IExportableForce[];

        exportedForces.forEach((force: IExportableForce) => {
          expect(force.pilots).toBeUndefined();
          expect(force.units).toBeUndefined();
        });
      });
    });
  });

  // ===========================================================================
  // Generic Export
  // ===========================================================================

  describe('Generic Export', () => {
    describe('exportContent', () => {
      it('should export any content type', async () => {
        await exportContent('unit', [mockUnit], mockIdentity);

        expect(mockCreateBundle).toHaveBeenCalledWith(
          'unit',
          [mockUnit],
          mockIdentity,
          {},
        );
      });

      it('should return error for empty items', async () => {
        const result = await exportContent('pilot', [], mockIdentity);

        expect(result.success).toBe(false);
        expect(result.error).toEqual({ message: 'No pilots to export' });
      });

      it('should support encounter content type', async () => {
        const encounter = { id: 'enc-1', name: 'Test Encounter', data: {} };

        await exportContent('encounter', [encounter], mockIdentity);

        expect(mockCreateBundle).toHaveBeenCalledWith(
          'encounter',
          [encounter],
          mockIdentity,
          {},
        );
      });

      it('should pass options through', async () => {
        const options = { description: 'Generic export', tags: ['test'] };

        await exportContent('unit', [mockUnit], mockIdentity, options);

        expect(mockCreateBundle).toHaveBeenCalledWith(
          'unit',
          [mockUnit],
          mockIdentity,
          options,
        );
      });
    });
  });

  // ===========================================================================
  // File Operations
  // ===========================================================================

  describe('File Operations', () => {
    describe('downloadBundle', () => {
      // Save original implementations
      const originalCreateElement = document.createElement.bind(document);
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;
      const originalAppendChild = document.body.appendChild.bind(document.body);
      const originalRemoveChild = document.body.removeChild.bind(document.body);

      let mockAnchor: {
        href: string;
        download: string;
        click: jest.Mock;
      };

      beforeEach(() => {
        mockAnchor = {
          href: '',
          download: '',
          click: jest.fn(),
        };

        // Mock document.createElement
        document.createElement = jest.fn().mockReturnValue(mockAnchor);

        // Mock URL methods
        URL.createObjectURL = jest.fn().mockReturnValue('blob:test-url');
        URL.revokeObjectURL = jest.fn();

        // Mock body methods
        document.body.appendChild = jest
          .fn()
          .mockImplementation(<T extends Node>(node: T): T => node);
        document.body.removeChild = jest
          .fn()
          .mockImplementation(<T extends Node>(node: T): T => node);
      });

      afterEach(() => {
        // Restore original implementations
        document.createElement = originalCreateElement;
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
        document.body.appendChild = originalAppendChild;
        document.body.removeChild = originalRemoveChild;
      });

      it('should trigger file download', () => {
        downloadBundle(mockSuccessResult);

        expect(mockSerializeBundle).toHaveBeenCalledWith(
          mockSuccessResult.data.bundle,
        );
        expect(URL.createObjectURL).toHaveBeenCalled();
        expect(mockAnchor.click).toHaveBeenCalled();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
      });

      it('should use suggested filename', () => {
        downloadBundle(mockSuccessResult);

        expect(mockAnchor.download).toBe('atlas-as7-d-20250101.mekbundle');
      });

      it('should use default filename when not provided', () => {
        const resultWithoutFilename: IExportResult = {
          success: true,
          data: {
            bundle: mockSuccessResult.data.bundle,
            suggestedFilename: undefined,
          },
        };

        downloadBundle(resultWithoutFilename);

        expect(mockAnchor.download).toBe('export.mekbundle');
      });

      it('should throw on failed export result', () => {
        const failedResult: IExportResult = {
          success: false,
          error: { message: 'Export failed' },
        };

        expect(() => downloadBundle(failedResult)).toThrow('Export failed');
      });
    });

    describe('copyBundleToClipboard', () => {
      const originalClipboard = navigator.clipboard;
      let mockWriteText: jest.Mock;

      beforeEach(() => {
        mockWriteText = jest.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
          value: { writeText: mockWriteText },
          writable: true,
          configurable: true,
        });
      });

      afterEach(() => {
        Object.defineProperty(navigator, 'clipboard', {
          value: originalClipboard,
          writable: true,
          configurable: true,
        });
      });

      it('should copy bundle JSON to clipboard', async () => {
        const serialized = JSON.stringify(mockSuccessResult.data.bundle);
        mockSerializeBundle.mockReturnValue(serialized);

        await copyBundleToClipboard(mockSuccessResult);

        expect(mockSerializeBundle).toHaveBeenCalledWith(
          mockSuccessResult.data.bundle,
        );
        expect(mockWriteText).toHaveBeenCalledWith(serialized);
      });

      it('should throw on failed export result', async () => {
        const failedResult: IExportResult = {
          success: false,
          error: { message: 'Export failed' },
        };

        await expect(copyBundleToClipboard(failedResult)).rejects.toThrow(
          'Export failed',
        );
      });
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('Error Handling', () => {
    it('should handle createBundle errors', async () => {
      mockCreateBundle.mockResolvedValue({
        success: false,
        error: { message: 'Signing failed' },
      });

      const result = await exportUnit(mockUnit, mockIdentity);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Signing failed');
      }
    });

    it('should propagate bundle creation errors', async () => {
      mockCreateBundle.mockRejectedValue(new Error('Network error'));

      await expect(exportUnit(mockUnit, mockIdentity)).rejects.toThrow(
        'Network error',
      );
    });
  });
});
