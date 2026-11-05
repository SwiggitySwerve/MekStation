import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentCalculatorService } from '@/services/equipment/EquipmentCalculatorService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { FormulaRegistry } from '@/services/equipment/FormulaRegistry';
import {
  getVariableEquipmentFormulas,
  getVariableEquipmentIds,
  hasVariableEquipmentFormulas,
} from '@/services/equipment/variableEquipmentFormulas';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EquipmentCategory } from '@/types/equipment';
import {
  calculatePhysicalWeaponSlots,
  calculatePhysicalWeaponWeight,
  PhysicalWeaponType,
} from '@/types/equipment/PhysicalWeaponTypes';
import { fixed } from '@/types/equipment/VariableEquipment';

import cudgel from '../../../../../public/data/units/battlemechs/4-clan-invasion/experimental/Cudgel CDG-1B.json';
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
jest.mock('@/services/persistence/IndexedDBService', () => ({
  getIndexedDBService: () => ({ put: jest.fn().mockResolvedValue(undefined) }),
  STORES: { CUSTOM_FORMULAS: 'custom-formulas' },
}));
beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});

// MegaMek 48fcb2f64, MiscType.java:688-689,1000-1001,1259-1260.
it.each([
  [20, 2],
  [35, 3],
  [80, 6],
  [105, 7],
])(
  'sizes both Claw identities through one owner at %d tons',
  (tonnage, criticalSlots) => {
    for (const id of ['claw', 'claws']) {
      expect(
        getEquipmentCalculatorService().calculateProperties(id, { tonnage }),
      ).toMatchObject({
        weight: criticalSlots,
        criticalSlots,
        costCBills: tonnage * 200,
      });
    }
    expect(
      calculatePhysicalWeaponWeight(PhysicalWeaponType.CLAWS, tonnage),
    ).toBe(criticalSlots);
    expect(
      calculatePhysicalWeaponSlots(PhysicalWeaponType.CLAWS, tonnage),
    ).toBe(criticalSlots);
  },
);

it('rounds Claw construction cost up to the next C-bill', () => {
  expect(
    getEquipmentCalculatorService().calculateProperties('claws', {
      tonnage: 35.0025,
    }).costCBills,
  ).toBe(7001);
});

it('exposes the native sizing identity without replacing API IDs or duplicating formulas', () => {
  expect(getEquipmentLookupService().getById('claw')).toMatchObject({
    id: 'claw',
    category: EquipmentCategory.PHYSICAL_WEAPON,
  });
  expect(getEquipmentLookupService().getById('claws')?.id).toBe('claws');
  expect(
    getEquipmentLookupService()
      .getAllEquipment()
      .filter((item) => item.id === 'claw'),
  ).toEqual([]);
  expect(getVariableEquipmentIds()).toContain('claw');
  expect(hasVariableEquipmentFormulas('claw')).toBe(true);
  expect(getVariableEquipmentFormulas('claw')).toBe(
    getVariableEquipmentFormulas('claws'),
  );
});

it('retains exact-ID custom formula precedence', async () => {
  const registry = new FormulaRegistry();
  const custom = {
    weight: fixed(9),
    criticalSlots: fixed(1),
    cost: fixed(1),
    requiredContext: [],
  };
  await registry.registerCustomFormulas('claw', custom);
  expect(registry.getFormulas('claw')).toBe(custom);
  expect(registry.getFormulas('claws')).toBe(
    getVariableEquipmentFormulas('claws'),
  );
});

// MiscType.java:3982-3992 marks native Claws physical; MtfFile.java:1133-1175
// groups each complete native mount, including mounts absent from the summary.
it.each([undefined, 'claw', 'claws'] as const)(
  'recovers two native Claws without duplicating a listed one (%s)',
  (listedId) => {
    const state = new UnitLoaderService().mapToUnitState(
      {
        ...cudgel,
        equipment: listedId ? [{ id: listedId, location: 'LEFT_ARM' }] : [],
        criticalSlots: {
          LEFT_ARM: Array(6).fill('ISClaw'),
          RIGHT_ARM: Array(6).fill('ISClaw'),
        },
      },
      true,
    );
    const mounts = state.equipment.filter((item) =>
      ['claw', 'claws'].includes(item.equipmentId),
    );
    expect(mounts).toHaveLength(2);
    for (const [index, location] of [
      MechLocation.LEFT_ARM,
      MechLocation.RIGHT_ARM,
    ].entries()) {
      expect(mounts[index]).toMatchObject({
        equipmentId: index === 0 && listedId ? listedId : 'claw',
        category: EquipmentCategory.PHYSICAL_WEAPON,
        weight: 6,
        criticalSlots: 6,
        location,
        slots: [0, 1, 2, 3, 4, 5],
      });
    }
  },
);

// Mek.java:3484-3492: use the existing superheavy entry owner after sizing.
it('keeps nominal sizing distinct from superheavy consumed entries', () => {
  const state = new UnitLoaderService().mapToUnitState(
    {
      ...cudgel,
      tonnage: 105,
      equipment: [],
      criticalSlots: { LEFT_ARM: Array(4).fill('ISClaw') },
    },
    true,
  );
  expect(state.equipment.filter((item) => item.equipmentId === 'claw')).toEqual(
    [
      expect.objectContaining({
        weight: 7,
        criticalSlots: 4,
        slots: [0, 1, 2, 3],
      }),
    ],
  );
});
