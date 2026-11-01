import { act, renderHook } from '@testing-library/react';

import type { IUnitIndexEntry } from '@/services/common/types';

import { unitLoaderService } from '@/services/units/unitLoaderService';
import { createUnitFromFullState } from '@/stores/unitStoreRegistry';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { TechBase } from '@/types/enums/TechBase';

import { useMultiUnitTabsController } from '../useMultiUnitTabsController';

const push = jest.fn();
const showToast = jest.fn();
const router = { push, query: {} };
jest.mock('next/router', () => ({ useRouter: () => router }));
jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast }),
}));
jest.mock('@/services/units/unitLoaderService', () => ({
  unitLoaderService: { loadUnit: jest.fn() },
}));
jest.mock('@/stores/unitStoreRegistry', () => ({
  createUnitFromFullState: jest.fn(),
  getUnitStore: jest.fn(),
}));
jest.mock('../MultiUnitTabsUnitState', () => ({
  getLibrarySaveDisabledReason: () => null,
  isLibrarySaveSupported: () => true,
  getTabDisplayState: (tab: unknown) => tab,
  isTabModified: () => false,
  subscribeToTabDisplayState: () => () => undefined,
}));
jest.mock('@/utils/logger', () => ({ logger: { error: jest.fn() } }));

const unit = {
  id: 'atlas-as7-d',
  chassis: 'Atlas',
  variant: 'AS7-D',
} as IUnitIndexEntry;

function deferredLoad() {
  let resolve!: (value: unknown) => void;
  (unitLoaderService.loadUnit as jest.Mock).mockReturnValueOnce(
    new Promise((yes) => {
      resolve = yes;
    }),
  );
  return (id: string) =>
    resolve({
      success: true,
      state: {
        id,
        name: 'Atlas AS7-D',
        tonnage: 100,
        techBase: TechBase.INNER_SPHERE,
      },
    });
}

beforeEach(() => {
  jest.clearAllMocks();
  useTabManagerStore.setState({
    tabs: [],
    activeTabId: null,
    isLoading: false,
  });
});

it('opens one editor for concurrent duplicate requests', async () => {
  const complete = deferredLoad();
  const { result } = renderHook(() => useMultiUnitTabsController());
  let first!: Promise<void>;
  act(() => {
    result.current.openLoadDialog();
    first = result.current.handleLoadUnit(unit, 'canonical');
  });
  await act(async () => result.current.handleLoadUnit(unit, 'canonical'));
  expect(unitLoaderService.loadUnit).toHaveBeenCalledTimes(1);
  expect(result.current.isLoadingUnit).toBe(true);
  await act(async () => {
    complete('one-editor');
    await first;
  });
  expect(createUnitFromFullState).toHaveBeenCalledTimes(1);
  expect(useTabManagerStore.getState().tabs.map((tab) => tab.id)).toEqual([
    'one-editor',
  ]);
  expect(push).toHaveBeenCalledTimes(1);
  expect(result.current.isLoadingUnit).toBe(false);
  expect(result.current.isLoadDialogOpen).toBe(false);
});

it.each(['close', 'selection', 'unmount'] as const)(
  'does not open an editor after %s cancels a pending load',
  async (reason) => {
    const complete = deferredLoad();
    const { result, unmount } = renderHook(() => useMultiUnitTabsController());
    let pending!: Promise<void>;
    act(() => {
      result.current.openLoadDialog();
      pending = result.current.handleLoadUnit(unit, 'canonical');
    });
    act(() => {
      if (reason === 'unmount') unmount();
      else if (reason === 'close') result.current.closeLoadDialog();
      else result.current.cancelPendingLoad();
    });
    await act(async () => {
      complete('canceled-editor');
      await pending;
    });
    expect(createUnitFromFullState).not.toHaveBeenCalled();
    expect(useTabManagerStore.getState().tabs).toEqual([]);
    expect(push).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  },
);

it('keeps the newer load busy when an older request returns', async () => {
  const oldDone = deferredLoad();
  const newDone = deferredLoad();
  const { result } = renderHook(() => useMultiUnitTabsController());
  let old!: Promise<void>;
  let next!: Promise<void>;
  act(() => {
    old = result.current.handleLoadUnit(unit, 'canonical');
    next = result.current.handleLoadUnit(unit, 'custom');
  });
  await act(async () => {
    oldDone('old-editor');
    await old;
  });
  expect(result.current.isLoadingUnit).toBe(true);
  expect(createUnitFromFullState).not.toHaveBeenCalled();
  await act(async () => {
    newDone('new-editor');
    await next;
  });
  expect(useTabManagerStore.getState().tabs.map((tab) => tab.id)).toEqual([
    'new-editor',
  ]);
  expect(result.current.isLoadingUnit).toBe(false);
});

it('UL-10 treats the same id in different families as separate requests', async () => {
  const oldDone = deferredLoad();
  const newDone = deferredLoad();
  const { result } = renderHook(() => useMultiUnitTabsController());
  let old!: Promise<void>;
  let next!: Promise<void>;
  act(() => {
    old = result.current.handleLoadUnit(
      { ...unit, id: 'tomahawk-c' },
      'canonical',
    );
    next = result.current.handleLoadUnit(
      { ...unit, id: 'tomahawk-c', family: 'aerospace' },
      'canonical',
    );
  });
  expect(unitLoaderService.loadUnit).toHaveBeenCalledTimes(2);
  await act(async () => {
    oldDone('old-editor');
    await old;
  });
  expect(createUnitFromFullState).not.toHaveBeenCalled();
  await act(async () => {
    newDone('new-editor');
    await next;
  });
  expect(useTabManagerStore.getState().tabs.map((tab) => tab.id)).toEqual([
    'new-editor',
  ]);
});
