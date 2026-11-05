import { renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import { Era } from '@/types/temporal/Era';
import { getEquipmentPayloadWeight } from '@/utils/equipment/equipmentWeightAccounting';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import wasp from '../../../../../public/data/units/battlemechs/5-civil-war/standard/Wasp LAM WSP-110.json';
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

// 48fcb2f64 MiscType.java:12413-12420: one-ton, one-critical LAM bomb bay.
it('recovers all five native Wasp bomb bays once', () => {
  const state = new UnitLoaderService().mapToUnitState(wasp, true);
  const bays = state.equipment.filter(
    (item) => item.equipmentId === 'bomb-bay',
  );
  expect(bays).toHaveLength(5);
  expect(
    bays.every(
      (item) =>
        item.weight === 1 &&
        item.criticalSlots === 1 &&
        item.slots?.length === 1,
    ),
  ).toBe(true);
});

// TestMek.java:191-200 adds conversion equipment; Java's WSP-110 is33/30t.
it('counts Wasp conversion equipment and bomb bays toward its native33t weight', () => {
  const state = new UnitLoaderService().mapToUnitState(wasp, true);
  const { result } = renderHook(() =>
    useUnitCalculations(
      state.tonnage,
      state,
      state.armorTonnage,
      state.configuration,
    ),
  );
  expect(
    result.current.totalStructuralWeight +
      getEquipmentPayloadWeight(state.equipment),
  ).toBe(33);
});

it('uses native standard/bimodal conversion mass without charging ordinary mechs', () => {
  const state = new UnitLoaderService().mapToUnitState(wasp, true);
  const total = (configuration: MechConfiguration, lamType: string) => {
    const { result } = renderHook(() =>
      useUnitCalculations(
        30,
        { ...state, lamType },
        state.armorTonnage,
        configuration,
      ),
    );
    return result.current.totalStructuralWeight;
  };
  const ordinary = total(MechConfiguration.BIPED, 'Standard');
  expect(total(MechConfiguration.LAM, 'Standard') - ordinary).toBe(3);
  expect(total(MechConfiguration.LAM, 'Bimodal') - ordinary).toBe(5);
});

it('retains bimodal subtype and bomb-bay count through save and reload', () => {
  const loader = new UnitLoaderService();
  const state = loader.mapToUnitState({ ...wasp, lamType: 'Bimodal' }, true);
  const saved = serializeCustomUnitState(state, {
    id: 'wasp-mass',
    chassis: 'Wasp LAM',
    variant: 'Mass proof',
    era: Era.CIVIL_WAR,
  });
  expect(saved.lamType).toBe('Bimodal');
  const restored = loader.mapToUnitState(parseUnit(saved), false);
  expect(restored.lamType).toBe('Bimodal');
  expect(
    restored.equipment.filter((item) => item.equipmentId === 'bomb-bay'),
  ).toHaveLength(5);
});
