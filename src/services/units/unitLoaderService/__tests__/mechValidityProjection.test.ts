import { renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { getTotalAllocatedArmor } from '@/stores/unitState';
import { createNewUnitStore } from '@/stores/useUnitStore';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/temporal/Era';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';
import { getEquipmentPayloadWeight } from '@/utils/equipment/equipmentWeightAccounting';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import nova from '../../../../../public/data/units/battlemechs/3-succession-wars/advanced/Black Hawk A.json';
import avatar from '../../../../../public/data/units/battlemechs/4-clan-invasion/experimental/Avatar AV1-OR.json';
import ares from '../../../../../public/data/units/battlemechs/6-dark-age/experimental/Ares ARS-V1 Zeus.json';
import { mapEngineType } from '../componentMappers';
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

it('keeps all 456 Ares armor points in the editor weight and save/reopen', () => {
  // Pinned Java 48fcb2f64: Ares ARS-V1 Zeus getWeightArmor = 28.5.
  // Its center leg contributes 56 points: (400 + 56) / 16 = 28.5 tons.
  const loader = new UnitLoaderService();
  const store = createNewUnitStore({
    name: 'Ares armor',
    tonnage: 135,
    techBase: TechBase.INNER_SPHERE,
  });
  store.setState(loader.mapToUnitState(parseUnit(ares), true));
  const state = store.getState();
  expect(state.configuration).toBe(MechConfiguration.TRIPOD);
  expect(state.armorAllocation[MechLocation.CENTER_LEG]).toBe(56);
  expect(
    getTotalAllocatedArmor(state.armorAllocation, state.configuration),
  ).toBe(456);
  expect(state.armorTonnage).toBe(28.5);
  const { result } = renderHook(() =>
    useUnitCalculations(
      state.tonnage,
      state,
      state.armorTonnage,
      state.configuration,
    ),
  );
  expect(result.current.armorWeight).toBe(28.5);
  const reopened = loader.mapToUnitState(
    parseUnit(
      serializeCustomUnitState(state, {
        id: state.id,
        chassis: state.chassis,
        variant: state.model,
        era: Era.DARK_AGE,
      }),
    ),
    false,
  );
  expect(reopened.armorTonnage).toBe(28.5);
  expect(
    getTotalAllocatedArmor(reopened.armorAllocation, reopened.configuration),
  ).toBe(456);
});

// MegaMek 48fcb2f6: Engine.java:416-418; MtfFile.java:1010-1020.
it('retains the explicit Clan XL engine even on an Inner Sphere chassis', () => {
  expect(mapEngineType('CLAN_XL', TechBase.INNER_SPHERE)).toBe(
    EngineType.XL_CLAN,
  );
});

it('loads Black Hawk (Nova) A at its legal 50-ton weight', () => {
  const state = new UnitLoaderService().mapToUnitState(nova, true);
  const { result } = renderHook(() =>
    useUnitCalculations(
      state.tonnage,
      state,
      state.armorTonnage,
      state.configuration,
    ),
  );
  expect(result.current.engineWeight).toBe(6.5);
  expect(
    result.current.totalStructuralWeight +
      getEquipmentPayloadWeight(state.equipment),
  ).toBe(50);
});

it.each([nova, avatar])(
  'restores $chassis $model native pod critical slots',
  (unit) => {
    const state = new UnitLoaderService().mapToUnitState(parseUnit(unit), true);
    const issues = getEquipmentSlotIssues(
      state.equipment,
      state.configuration,
      state.engineType,
      state.gyroType,
      state.armActuators,
    );
    expect(issues).toEqual([]);
  },
);
