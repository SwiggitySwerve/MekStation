import { act, renderHook } from '@testing-library/react';
import { writeFileSync } from 'node:fs';
import { createElement, type ReactNode } from 'react';

import { validateUnit } from '@/services/validation/UnitValidationOrchestrator';
import { createDefaultUnitState, type UnitState } from '@/stores/unitState';
import { createUnitStore, UnitStoreContext } from '@/stores/useUnitStore';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { Era, RulesLevel, TechBase } from '@/types/enums';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import { UnitCategory } from '@/types/validation/UnitValidationInterfaces';

import {
  useUnitValidation,
  type UseUnitValidationOptions,
} from '../useUnitValidation';

let mockReady = false;
jest.mock('../useEquipmentRegistry', () => ({
  useEquipmentRegistry: () => ({ isReady: mockReady }),
}));
jest.mock('@/services/validation/UnitValidationOrchestrator', () => {
  const actual = jest.requireActual<
    typeof import('@/services/validation/UnitValidationOrchestrator')
  >('@/services/validation/UnitValidationOrchestrator');
  return { ...actual, validateUnit: jest.fn(actual.validateUnit) };
});

const receipts: unknown[] = [];
const initial = createDefaultUnitState({
  id: 'cv1',
  name: 'CV1 Control',
  tonnage: 50,
  techBase: TechBase.INNER_SPHERE,
});
function setup(patch: Partial<UnitState> = {}) {
  const store = createUnitStore({
    ...initial,
    armorTonnage: 0,
    year: 3025,
    ...patch,
  });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(UnitStoreContext.Provider, { value: store }, children);
  return { store, wrapper };
}

beforeEach(() => {
  mockReady = false;
  jest.mocked(validateUnit).mockClear();
});
afterAll(() => {
  if (process.env.CV1_UI_RECEIPT)
    writeFileSync(
      process.env.CV1_UI_RECEIPT,
      JSON.stringify(receipts, null, 2),
    );
});

test.each([
  { name: 'IS', patch: {}, ready: false },
  { name: 'registry ready', patch: {}, ready: true },
  {
    name: 'metadata defaults',
    patch: { id: '', name: '', year: 0, tonnage: 0 },
    ready: false,
  },
  {
    name: 'optional metadata',
    patch: { extinctionYear: 3100, cost: 123, battleValue: 456 },
    ready: false,
  },
  {
    name: 'future armor',
    patch: { armorType: ArmorTypeEnum.STEALTH },
    ready: false,
  },
  {
    name: 'standard LAM',
    patch: { configuration: MechConfiguration.LAM, lamType: 'Standard' },
    ready: false,
  },
  {
    name: 'bimodal LAM',
    patch: { configuration: MechConfiguration.LAM, lamType: 'Bimodal' },
    ready: false,
  },
])(
  'preserves complete app input and UI result: $name',
  ({ name, patch, ready }) => {
    mockReady = ready;
    const { wrapper } = setup(patch);
    const { result } = renderHook(() => useUnitValidation(), { wrapper });
    const [input, options] = jest.mocked(validateUnit).mock.calls[0];
    expect(input).toMatchObject({
      id: patch.id === '' ? 'new-unit' : 'cv1',
      name: patch.name === '' ? 'Unnamed' : 'CV1 Control',
      introductionYear: 3025,
      weight: patch.tonnage === 0 ? 20 : 50,
    });
    expect(input.equipmentCatalog?.length === 0).toBe(!ready);
    expect(options).toEqual({
      campaignYear: undefined,
      rulesLevelFilter: undefined,
      skipRules: undefined,
      maxErrors: undefined,
      categories: undefined,
      unitCategories: undefined,
      strictMode: true,
      includeWarnings: true,
      includeInfos: true,
    });
    if (name === 'metadata defaults') expect(input.era).toBe(Era.DARK_AGE);
    if (name === 'optional metadata')
      expect(input).toMatchObject({
        extinctionYear: 3100,
        cost: 123,
        battleValue: 456,
      });
    if (name.endsWith('LAM'))
      expect(input.allocatedWeight).toBe(name === 'bimodal LAM' ? 26.5 : 23.5);
    if (name === 'future armor')
      expect(result.current).toMatchObject({
        status: 'error',
        isValid: false,
        errorCount: 1,
      });
    const { result: validation, ...ui } = result.current;
    receipts.push({
      name,
      input,
      options,
      ui,
      diagnostics: validation?.results.map(
        ({ ruleId, passed, errors, warnings, infos }) => ({
          ruleId,
          passed,
          errors,
          warnings,
          infos,
        }),
      ),
    });
  },
);

test('forwards options and debounces edits while retaining the previous result', () => {
  jest.useFakeTimers();
  try {
    const { store, wrapper } = setup();
    const options: UseUnitValidationOptions = {
      campaignYear: 3060,
      rulesLevelFilter: RulesLevel.ADVANCED,
      skipRules: ['VAL-UNIV-014'],
      maxErrors: 2,
      categories: [ValidationCategory.ERA],
      unitCategories: [UnitCategory.MECH],
      strictMode: false,
      includeWarnings: false,
      includeInfos: false,
      debounceMs: 100,
    };
    const { result } = renderHook(() => useUnitValidation(options), {
      wrapper,
    });
    const { debounceMs: _delay, ...forwarded } = options;
    expect(jest.mocked(validateUnit).mock.calls[0][1]).toEqual(forwarded);
    const prior = result.current.result;
    act(() => store.setState({ year: 3070 }));
    expect(result.current.isValidating).toBe(true);
    expect(result.current.result).toBe(prior);
    expect(validateUnit).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(99));
    expect(validateUnit).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(1));
    expect(validateUnit).toHaveBeenCalledTimes(2);
    expect(jest.mocked(validateUnit).mock.calls[1][0].introductionYear).toBe(
      3070,
    );
    expect(result.current.isValidating).toBe(false);
    receipts.push({
      name: 'debounce',
      inputs: jest.mocked(validateUnit).mock.calls,
      status: result.current.status,
    });
  } finally {
    jest.useRealTimers();
  }
});

test('disabled validation keeps its loading/default UI without calling the validator', () => {
  const { wrapper } = setup();
  const { result } = renderHook(() => useUnitValidation({ disabled: true }), {
    wrapper,
  });
  expect(validateUnit).not.toHaveBeenCalled();
  expect(result.current).toEqual({
    status: 'valid',
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    isValid: true,
    hasCriticalErrors: false,
    result: null,
    isLoading: true,
    isValidating: false,
  });
});
