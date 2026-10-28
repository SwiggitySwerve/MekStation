import { act, renderHook } from '@testing-library/react';

import { useAutoSaveIndicator } from '@/hooks/useAutoSaveIndicator';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

const showToastMock = jest.fn();
jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

const MECH_ID = '11111111-1111-4111-8111-111111111111';
const VEHICLE_ID = '22222222-2222-4222-8222-222222222222';
const MECH_TARGET = { unitId: MECH_ID, unitType: UnitType.BATTLEMECH };

beforeEach(() => {
  showToastMock.mockClear();
  localStorage.clear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('useAutoSaveIndicator', () => {
  it('does not report a save without an active customizer unit', () => {
    renderHook(() => useAutoSaveIndicator(null));

    act(() => {
      clientSafeStorage.setItem(`megamek-unit-${MECH_ID}`, '{}');
      jest.advanceTimersByTime(500);
    });

    expect(showToastMock).not.toHaveBeenCalled();
  });

  it('confirms a successful draft write in the header, not in a toast', () => {
    renderHook(() => useAutoSaveIndicator(MECH_TARGET));

    act(() => {
      clientSafeStorage.setItem(`megamek-unit-${MECH_ID}`, '{"state":{}}');
      jest.advanceTimersByTime(2000);
    });

    expect(localStorage.getItem(`megamek-unit-${MECH_ID}`)).toBe(
      '{"state":{}}',
    );
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it('reports a failed active-unit write and never reports success', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    renderHook(() => useAutoSaveIndicator(MECH_TARGET));

    act(() => {
      expect(() =>
        clientSafeStorage.setItem(`megamek-unit-${MECH_ID}`, '{}'),
      ).toThrow('quota exceeded');
      jest.advanceTimersByTime(500);
    });

    expect(showToastMock).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Draft save failed in browser',
        variant: 'error',
      }),
    );
  });

  it('ignores a failed receipt for a different unit family', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    renderHook(() => useAutoSaveIndicator(MECH_TARGET));

    act(() => {
      expect(() =>
        clientSafeStorage.setItem(`megamek-vehicle-${MECH_ID}`, '{}'),
      ).toThrow('quota exceeded');
    });

    expect(showToastMock).not.toHaveBeenCalled();
  });

  it('stops reporting the previous unit once the active unit switches', () => {
    const { rerender } = renderHook(
      ({ target }) => useAutoSaveIndicator(target),
      { initialProps: { target: MECH_TARGET } },
    );
    rerender({
      target: { unitId: VEHICLE_ID, unitType: UnitType.VEHICLE },
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    act(() => {
      expect(() =>
        clientSafeStorage.setItem(`megamek-unit-${MECH_ID}`, '{}'),
      ).toThrow('quota exceeded');
    });

    expect(showToastMock).not.toHaveBeenCalled();
  });
});
