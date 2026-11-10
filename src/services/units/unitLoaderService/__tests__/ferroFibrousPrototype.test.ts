import { renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type PropsWithChildren } from 'react';

import { buildBattleMechPreviewProjection } from '@/components/customizer/preview/recordSheetPreview.logic';
import { useUnitValidation } from '@/hooks/useUnitValidation';
import { useWeightValidation } from '@/hooks/validation/useWeightValidation';
import {
  decodeBlkArmorType,
  encodeBlkArmorType,
} from '@/services/conversion/BlkArmorCodes';
import { mapArmorType as convertArmor } from '@/services/conversion/ValueMappings';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { createUnitStore, UnitStoreContext } from '@/stores/useUnitStore';
import {
  ArmorTypeEnum,
  getArmorDefinition,
} from '@/types/construction/ArmorType';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/temporal/Era';
import { getArmorCriticalSlots } from '@/utils/construction/armorCalculations';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import jenner from '../../../../../public/data/units/battlemechs/3-succession-wars/standard/Jenner JR7-K (Grace).json';
import { mapArmorType } from '../componentMappers';
import { parseUnit } from '../unitContractAdapter';
import { UnitLoaderService } from '../unitLoader';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));

beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});

const prototypeJenner = {
  ...jenner,
  armor: { ...jenner.armor, type: 'FERRO_FIBROUS_PROTO' },
};

// MegaMek 48fcb2f64 ArmorType.java:518-540, MiscType.java:1224-1229;
// TechAdvancement.java:982-989. R1's pinned Java load identifies armor code 9.
it.each([mapArmorType, convertArmor])(
  'preserves the native prototype identity',
  (map) => {
    const type = map('FERRO_FIBROUS_PROTO', TechBase.INNER_SPHERE);
    expect(type).toBe('Ferro-Fibrous Prototype');
    expect(getArmorDefinition(type)).toMatchObject({
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: RulesLevel.EXPERIMENTAL,
      pointsPerTon: 17.92,
      criticalSlots: 16,
      costMultiplier: 6,
      introductionYear: 2552,
    });
    expect(getArmorCriticalSlots(type)).toBe(16);
  },
);

it('preserves ordinary Standard and Clan Ferro normalization', () => {
  expect(mapArmorType('STANDARD', TechBase.INNER_SPHERE)).toBe(
    ArmorTypeEnum.STANDARD,
  );
  expect(mapArmorType('FERRO_FIBROUS', TechBase.CLAN)).toBe(
    ArmorTypeEnum.FERRO_FIBROUS_CLAN,
  );
});

it('loads Jenner Grace with Java armor mass and valid construction', () => {
  const state = new UnitLoaderService().mapToUnitState(
    parseUnit(prototypeJenner),
    true,
  );
  const store = createUnitStore(state);
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(UnitStoreContext.Provider, { value: store }, children);
  const { result } = renderHook(
    () => ({
      weight: useWeightValidation(),
      validation: useUnitValidation({ debounceMs: 0 }),
    }),
    { wrapper },
  );

  // 80 allocated points: TestMek.getWeightArmor's half-ton ceiling is 4.5 t.
  // Standard-density fallback buys those points at 5 t and makes it 35.5/35 t.
  expect(state.armorTonnage).toBe(4.5);
  expect(buildBattleMechPreviewProjection(state).battleValue).toBe(702);
  expect(result.current.weight.allocatedWeight).toBe(35);
  expect(result.current.validation.isLoading).toBe(false);
  expect(
    result.current.validation.result?.results.flatMap((rule) => rule.errors),
  ).toEqual([]);
  expect(result.current.validation.isValid).toBe(true);
});

it('retains prototype identity, allocation and mass through JSON save and reopen', () => {
  const loader = new UnitLoaderService();
  const state = loader.mapToUnitState(parseUnit(prototypeJenner), true);
  const saved = serializeCustomUnitState(state, {
    id: 'jenner-prototype-roundtrip',
    chassis: 'Jenner',
    variant: 'JR7-K (Grace)',
    era: Era.LATE_SUCCESSION_WARS,
  });
  expect(saved.armor.type).toBe('FERRO_FIBROUS_PROTO');
  const reopened = loader.mapToUnitState(
    parseUnit(JSON.parse(JSON.stringify(saved))),
    false,
  );
  expect(reopened.armorType).toBe('Ferro-Fibrous Prototype');
  expect(reopened.armorAllocation).toEqual(state.armorAllocation);
  expect(reopened.armorTonnage).toBe(4.5);
});

it('round-trips native BLK armor code 9', () => {
  const type = mapArmorType('FERRO_FIBROUS_PROTO', TechBase.INNER_SPHERE);
  expect(encodeBlkArmorType(type)).toBe(9);
  expect(decodeBlkArmorType(9, false)).toBe('Ferro-Fibrous Prototype');
});
