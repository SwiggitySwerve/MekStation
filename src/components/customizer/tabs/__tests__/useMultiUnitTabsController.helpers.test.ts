import type { IUnitIndexEntry } from '@/services/common/types';

import { unitLoaderService } from '@/services/units/unitLoaderService';
import { createUnitFromFullState } from '@/stores/unitStoreRegistry';
import { TechBase } from '@/types/enums/TechBase';

import { loadUnitIntoTab } from '../useMultiUnitTabsController.helpers';

jest.mock('@/services/units/unitLoaderService', () => ({
  unitLoaderService: { loadUnit: jest.fn() },
}));
jest.mock('@/stores/unitStoreRegistry', () => ({
  createUnitFromFullState: jest.fn(),
  getUnitStore: jest.fn(),
}));
jest.mock('@/utils/logger', () => ({ logger: { error: jest.fn() } }));

it.each([
  [
    'unknown-family',
    'This library entry uses an unknown unit family. Choose another entry or correct the saved definition.',
  ],
  [
    'family-not-found',
    'The catalog for this unit family is unavailable. Choose an entry from another family.',
  ],
] as const)(
  'explains %s without suggesting a retry',
  async (errorCode, message) => {
    jest.clearAllMocks();
    jest.mocked(unitLoaderService.loadUnit).mockResolvedValue({
      success: false,
      errorCode,
    });
    const params = {
      unit: {
        id: 'atlas-as7-d',
        chassis: 'Atlas',
        variant: 'AS7-D',
      } as IUnitIndexEntry,
      source: 'canonical' as const,
      createTab: jest.fn(),
      navigateToTab: jest.fn(),
      setIsLoadDialogOpen: jest.fn(),
      setIsLoadingUnit: jest.fn(),
      showToast: jest.fn(),
    };
    await loadUnitIntoTab(params);
    expect(params.showToast).toHaveBeenCalledWith({
      variant: 'error',
      message,
    });
    expect(params.setIsLoadDialogOpen).not.toHaveBeenCalledWith(false);
    expect(params.navigateToTab).not.toHaveBeenCalled();
    expect(createUnitFromFullState).not.toHaveBeenCalled();
    expect(params.setIsLoadingUnit).toHaveBeenLastCalledWith(false);
  },
);

it('keeps the load dialog open and reports failure instead of substituting a template', async () => {
  (unitLoaderService.loadUnit as jest.Mock).mockResolvedValue({
    success: false,
    error: 'Catalog entry unavailable',
  });
  const createTab = jest.fn();
  const navigateToTab = jest.fn();
  const setIsLoadDialogOpen = jest.fn();
  const setIsLoadingUnit = jest.fn();
  const showToast = jest.fn();
  await loadUnitIntoTab({
    unit: {
      id: 'atlas-as7-d',
      chassis: 'Atlas',
      variant: 'AS7-D',
      tonnage: 100,
      techBase: TechBase.INNER_SPHERE,
    } as IUnitIndexEntry,
    source: 'canonical',
    createTab,
    navigateToTab,
    setIsLoadDialogOpen,
    setIsLoadingUnit,
    showToast,
  });
  expect(createTab).not.toHaveBeenCalled();
  expect(navigateToTab).not.toHaveBeenCalled();
  expect(setIsLoadDialogOpen).not.toHaveBeenCalledWith(false);
  expect(showToast).toHaveBeenCalledWith(
    expect.objectContaining({
      variant: 'error',
      message: expect.stringMatching(/failed to load/i),
    }),
  );
  expect(setIsLoadingUnit).toHaveBeenLastCalledWith(false);
});

describe('pending source requests', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['success', 'failure', 'throw'] as const)(
    'ignores a canceled %s response without affecting the newer request',
    async (outcome) => {
      let resolve!: (value: unknown) => void;
      let reject!: (reason: Error) => void;
      (unitLoaderService.loadUnit as jest.Mock).mockReturnValue(
        new Promise((yes, no) => {
          resolve = yes;
          reject = no;
        }),
      );
      let current = true;
      const params = {
        unit: {
          id: 'atlas-as7-d',
          chassis: 'Atlas',
          variant: 'AS7-D',
        } as IUnitIndexEntry,
        source: 'canonical' as const,
        createTab: jest.fn(),
        navigateToTab: jest.fn(),
        setIsLoadDialogOpen: jest.fn(),
        setIsLoadingUnit: jest.fn(),
        showToast: jest.fn(),
        isCurrent: () => current,
      };
      const pending = loadUnitIntoTab(params);
      current = false;
      if (outcome === 'throw') reject(new Error('offline'));
      else
        resolve(
          outcome === 'success'
            ? {
                success: true,
                state: {
                  id: 'late-editor',
                  name: 'Atlas',
                  tonnage: 100,
                  techBase: TechBase.INNER_SPHERE,
                },
              }
            : { success: false, error: 'offline' },
        );
      await pending;
      expect(createUnitFromFullState).not.toHaveBeenCalled();
      expect(params.navigateToTab).not.toHaveBeenCalled();
      expect(params.setIsLoadDialogOpen).not.toHaveBeenCalled();
      expect(params.showToast).not.toHaveBeenCalled();
      expect(params.setIsLoadingUnit.mock.calls).toEqual([[true]]);
    },
  );
});

it.each(['canonical', 'custom'] as const)(
  'UL-10 forwards family for %s and preserves the failed dialog',
  async (source) => {
    jest.clearAllMocks();
    const loadUnit = jest.mocked(unitLoaderService.loadUnit);
    loadUnit.mockResolvedValue({
      success: false,
      errorCode: 'unsupported-store-family',
    });
    const params = {
      unit: {
        id: 'tomahawk-c',
        family: 'aerospace',
        chassis: 'Tomahawk',
        variant: 'C',
      } as IUnitIndexEntry,
      source,
      createTab: jest.fn(),
      navigateToTab: jest.fn(),
      setIsLoadDialogOpen: jest.fn(),
      setIsLoadingUnit: jest.fn(),
      showToast: jest.fn(),
    };
    await loadUnitIntoTab(params);
    expect(unitLoaderService.loadUnit).toHaveBeenCalledWith(
      'tomahawk-c',
      source,
      'aerospace',
    );
    expect(params.showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'error',
        message: expect.stringMatching(/cannot be opened/i),
      }),
    );
    expect(params.setIsLoadDialogOpen).not.toHaveBeenCalledWith(false);
    expect(createUnitFromFullState).not.toHaveBeenCalled();
  },
);
