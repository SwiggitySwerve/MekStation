import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

import { validateUnit } from '@/services/validation/UnitValidationOrchestrator';
import { createDefaultUnitState } from '@/stores/unitState';
import { createUnitStore, UnitStoreContext } from '@/stores/useUnitStore';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums';

import { useUnitValidation } from '../../useUnitValidation';
import { useMechValidationInput } from '../useMechValidationInput';

let mockReady = false;
jest.mock('../../useEquipmentRegistry', () => ({
  useEquipmentRegistry: () => ({ isReady: mockReady }),
}));
jest.mock('@/services/validation/UnitValidationOrchestrator', () => {
  const actual = jest.requireActual<
    typeof import('@/services/validation/UnitValidationOrchestrator')
  >('@/services/validation/UnitValidationOrchestrator');
  return { ...actual, validateUnit: jest.fn(actual.validateUnit) };
});

test.each([false, true])(
  'complete projection equals the hook validator input; registry ready=%s',
  (ready) => {
    mockReady = ready;
    jest.mocked(validateUnit).mockClear();
    const store = createUnitStore({
      ...createDefaultUnitState({
        id: 'same-state',
        name: 'Same State',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      }),
      techBaseMode: TechBaseMode.MIXED,
      armorType: ArmorTypeEnum.STEALTH,
    });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(UnitStoreContext.Provider, { value: store }, children);
    const { result, rerender } = renderHook(
      () => {
        const input = useMechValidationInput();
        useUnitValidation();
        return input;
      },
      { wrapper },
    );
    expect(jest.mocked(validateUnit).mock.calls[0][0]).toStrictEqual(
      result.current,
    );
    expect(result.current).toMatchObject({
      techBaseMode: TechBaseMode.MIXED,
      armorType: ArmorTypeEnum.STEALTH,
    });
    expect(result.current.equipmentCatalog?.length === 0).toBe(!ready);
    const input = result.current;
    rerender();
    expect(result.current).toBe(input);
    act(() => store.setState({ name: 'Changed' }));
    expect(result.current).not.toBe(input);
    expect(result.current.name).toBe('Changed');
  },
);
