import { renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { EngineType } from '@/types/construction/EngineType';
import { TechBase } from '@/types/enums/TechBase';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';
import { getEquipmentPayloadWeight } from '@/utils/equipment/equipmentWeightAccounting';

import nova from '../../../../../public/data/units/battlemechs/3-succession-wars/advanced/Black Hawk A.json';
import avatar from '../../../../../public/data/units/battlemechs/4-clan-invasion/experimental/Avatar AV1-OR.json';
import { mapEngineType } from '../componentMappers';
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
    const state = new UnitLoaderService().mapToUnitState(unit, true);
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
