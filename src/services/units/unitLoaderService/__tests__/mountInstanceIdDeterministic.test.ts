/**
 * 0c-UUID-001: mount instance ids minted by the loader were random UUIDs, so
 * VAL-UNIV-015 issue fields (`criticalSlots.<instanceId>`) differed on every
 * load of the same committed unit. The field must name the real mount (the
 * editor routes on it) and must be the same on every load.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { CriticalSlotOverflowValidation } from '@/services/validation/rules/universal/UniversalValidationRules';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  IUnitValidationContext,
  UnitCategory,
} from '@/types/validation/UnitValidationInterfaces';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';

import atae70 from '../../../../../public/data/units/battlemechs/6-dark-age/standard/Uni ATAE-70 ArtilleryMech.json';
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

function load(unit: unknown) {
  return new UnitLoaderService().mapToUnitState(
    parseUnit(unit as Parameters<typeof parseUnit>[0]),
    true,
  );
}

function slotRuleFields(unit: unknown): string[] {
  const state = load(unit);
  const context: IUnitValidationContext = {
    unit: {
      id: 'unit',
      name: 'unit',
      unitType: UnitType.BATTLEMECH,
      techBase: state.techBase,
      slotsByLocation: {},
      equipmentSlotIssues: getEquipmentSlotIssues(
        state.equipment,
        state.configuration,
        state.engineType,
        state.gyroType,
        state.armActuators,
        state.cockpitType,
      ),
    } as unknown as IUnitValidationContext['unit'],
    unitType: UnitType.BATTLEMECH,
    unitCategory: UnitCategory.MECH,
    techBase: state.techBase,
    options: {},
    cache: new Map(),
  };
  const result = CriticalSlotOverflowValidation.validate(context);
  return [...result.errors, ...result.warnings].map((issue) => issue.field!);
}

describe('mount instance ids are deterministic across loads', () => {
  it('gives identical VAL-UNIV-015 fields on two loads of ATAE-70 ArtilleryMech', () => {
    const first = slotRuleFields(atae70);
    const second = slotRuleFields(atae70);
    expect(first.length).toBeGreaterThan(0); // the unplaced thumpers fire it
    expect(second).toEqual(first);
  });

  it('keeps every mount id on one unit unique, including same-location duplicates', () => {
    const doubled = {
      ...atae70,
      equipment: [
        ...atae70.equipment,
        { id: 'thumper', location: 'CENTER_TORSO' },
      ],
    };
    const ids = load(doubled).equipment.map((item) => item.instanceId);
    // Two source thumpers + the recovered thumper ammo bin + the added one.
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(load(doubled).equipment.map((item) => item.instanceId));
  });
});
