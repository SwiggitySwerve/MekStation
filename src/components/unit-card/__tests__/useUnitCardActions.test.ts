/**
 * useUnitCardActions Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';

import { useUnitCardActions } from '../useUnitCardActions';

const pushMock = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const customService = {
  getById: jest.fn(),
  create: jest.fn(),
  exists: jest.fn(),
  delete: jest.fn(),
};
const canonicalService = {
  getById: jest.fn(),
};

jest.mock('@/services/units', () => ({
  getCustomUnitService: () => customService,
  getCanonicalUnitService: () => canonicalService,
}));

describe('useUnitCardActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleEdit', () => {
    it('navigates to /customizer/:id for mech type by default', () => {
      const { result } = renderHook(() =>
        useUnitCardActions({ unitId: 'unit-42' }),
      );
      act(() => result.current.handleEdit());
      expect(pushMock).toHaveBeenCalledWith('/customizer/unit-42');
    });

    it('prefixes the route with the unit type for non-mech units', () => {
      const { result } = renderHook(() =>
        useUnitCardActions({ unitId: 'veh-1', unitType: 'vehicle' }),
      );
      act(() => result.current.handleEdit());
      expect(pushMock).toHaveBeenCalledWith('/vehicle/customizer/veh-1');
    });
  });

  describe('export and share dialogs', () => {
    it('toggles export dialog open/closed', () => {
      const { result } = renderHook(() => useUnitCardActions({ unitId: 'u1' }));
      expect(result.current.isExportDialogOpen).toBe(false);
      act(() => result.current.handleExport());
      expect(result.current.isExportDialogOpen).toBe(true);
      act(() => result.current.closeExportDialog());
      expect(result.current.isExportDialogOpen).toBe(false);
    });

    it('toggles share dialog open/closed', () => {
      const { result } = renderHook(() => useUnitCardActions({ unitId: 'u1' }));
      act(() => result.current.handleShare());
      expect(result.current.isShareDialogOpen).toBe(true);
      act(() => result.current.closeShareDialog());
      expect(result.current.isShareDialogOpen).toBe(false);
    });
  });

  describe('handleDuplicate', () => {
    it('duplicates a custom unit by cloning and persisting via CustomUnitService', async () => {
      customService.getById.mockResolvedValue({
        id: 'src-id',
        chassis: 'Atlas',
        variant: 'AS7-D',
        tonnage: 100,
        techBase: 'Inner Sphere',
        era: 'Star League',
        unitType: 'BattleMech',
      });
      customService.create.mockResolvedValue('new-id-1');
      const onSuccess = jest.fn();

      const { result } = renderHook(() =>
        useUnitCardActions({
          unitId: 'src-id',
          onDuplicateSuccess: onSuccess,
        }),
      );
      act(() => result.current.handleDuplicate());

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith('new-id-1');
      });
      expect(customService.create).toHaveBeenCalledTimes(1);
      const clonePayload = customService.create.mock.calls[0][0];
      expect(clonePayload.variant).toBe('AS7-D (Copy)');
      expect(clonePayload.chassis).toBe('Atlas');
    });

    it('falls back to CanonicalUnitService when the unit is not a custom unit', async () => {
      customService.getById.mockResolvedValue(null);
      canonicalService.getById.mockResolvedValue({
        id: 'canon-id',
        chassis: 'Hunchback',
        variant: 'HBK-4G',
        tonnage: 50,
        techBase: 'Inner Sphere',
        era: 'Star League',
        unitType: 'BattleMech',
      });
      customService.create.mockResolvedValue('new-id-2');
      const onSuccess = jest.fn();

      const { result } = renderHook(() =>
        useUnitCardActions({
          unitId: 'canon-id',
          onDuplicateSuccess: onSuccess,
        }),
      );
      act(() => result.current.handleDuplicate());

      await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('new-id-2'));
      expect(canonicalService.getById).toHaveBeenCalledWith('canon-id');
    });

    it('reports an error when the source unit cannot be found', async () => {
      customService.getById.mockResolvedValue(null);
      canonicalService.getById.mockResolvedValue(null);
      const onError = jest.fn();

      const { result } = renderHook(() =>
        useUnitCardActions({
          unitId: 'missing',
          onDuplicateError: onError,
        }),
      );
      act(() => result.current.handleDuplicate());

      await waitFor(() => expect(onError).toHaveBeenCalled());
      expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(customService.create).not.toHaveBeenCalled();
    });

    it('ignores rapid double-clicks while a duplicate is in-flight', async () => {
      customService.getById.mockResolvedValue({
        id: 'src',
        chassis: 'A',
        variant: 'B',
        tonnage: 50,
        techBase: 'Inner Sphere',
        era: 'Star League',
        unitType: 'BattleMech',
      });
      customService.create.mockResolvedValue('new');

      const { result } = renderHook(() =>
        useUnitCardActions({ unitId: 'src' }),
      );
      act(() => {
        result.current.handleDuplicate();
        result.current.handleDuplicate();
      });
      await waitFor(() =>
        expect(customService.create).toHaveBeenCalledTimes(1),
      );
    });
  });

  describe('delete flow', () => {
    it('handleDelete opens the confirmation, cancelDelete closes it', () => {
      const { result } = renderHook(() => useUnitCardActions({ unitId: 'u1' }));
      act(() => result.current.handleDelete());
      expect(result.current.isDeletePending).toBe(true);
      act(() => result.current.cancelDelete());
      expect(result.current.isDeletePending).toBe(false);
    });

    it('confirmDelete removes the custom unit and fires onDeleteSuccess', async () => {
      customService.exists.mockResolvedValue(true);
      customService.delete.mockResolvedValue(undefined);
      const onSuccess = jest.fn();

      const { result } = renderHook(() =>
        useUnitCardActions({ unitId: 'u1', onDeleteSuccess: onSuccess }),
      );
      act(() => result.current.confirmDelete());
      await waitFor(() => expect(onSuccess).toHaveBeenCalled());
      expect(customService.delete).toHaveBeenCalledWith('u1');
    });

    it('refuses to delete a canonical unit and reports the error', async () => {
      customService.exists.mockResolvedValue(false);
      const onError = jest.fn();

      const { result } = renderHook(() =>
        useUnitCardActions({ unitId: 'canon', onDeleteError: onError }),
      );
      act(() => result.current.confirmDelete());

      await waitFor(() => expect(onError).toHaveBeenCalled());
      expect(onError.mock.calls[0][0].message).toMatch(/canonical/i);
      expect(customService.delete).not.toHaveBeenCalled();
    });

    it('clears isDeletePending after the operation completes', async () => {
      customService.exists.mockResolvedValue(true);
      customService.delete.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUnitCardActions({ unitId: 'u1' }));
      act(() => result.current.handleDelete());
      expect(result.current.isDeletePending).toBe(true);
      act(() => result.current.confirmDelete());
      await waitFor(() => expect(result.current.isDeletePending).toBe(false));
    });
  });
});
