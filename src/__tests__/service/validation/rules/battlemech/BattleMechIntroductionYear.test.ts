import { initializeUnitValidationRules } from '@/services/validation/initializeUnitValidation';
import { validateUnit } from '@/services/validation/UnitValidationOrchestrator';
import { CockpitType } from '@/types/construction/CockpitType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase, RulesLevel, Era } from '@/types/enums';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { IEquipmentItem } from '@/types/equipment/EquipmentItem';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { IValidatableUnit } from '@/types/validation/UnitValidationInterfaces';

const mace: IEquipmentItem = {
  id: 'mace',
  name: 'Mace',
  category: EquipmentCategory.PHYSICAL_WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 1,
  criticalSlots: 1,
  costCBills: 0,
  battleValue: 0,
  introductionYear: 3061,
};
type DateUnit = IValidatableUnit;
function unit(overrides: Partial<DateUnit> = {}): DateUnit {
  return {
    id: 'date-test',
    name: 'date-test',
    unitType: UnitType.BATTLEMECH,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    introductionYear: 3053,
    era: Era.CLAN_INVASION,
    weight: 50,
    cost: 0,
    battleValue: 0,
    ...overrides,
  };
}
function withEquipment(equipment = mace): Partial<DateUnit> {
  return {
    mountedEquipment: [{ equipmentId: equipment.id, weight: 1 }],
    equipmentCatalog: [equipment],
  };
}
function check(overrides: Partial<DateUnit>, campaignYear?: number) {
  initializeUnitValidationRules();
  const result = validateUnit(unit(overrides), { campaignYear });
  return {
    results: result.results,
    isValid:
      result.results.find((r) => r.ruleId === 'VAL-BM-011')?.passed ?? true,
  };
}

// MegaMek 48fcb2f64 TestEntity.java:1471-1622; no chassis-name exceptions.
describe('BattleMech component introduction years', () => {
  it('reads corrected catalog dates on every validation without a code change', () => {
    const loadout = {
      introductionYear: 3040,
      mountedEquipment: [{ equipmentId: 'claw', weight: 1 }],
    };
    expect(
      check({
        ...loadout,
        equipmentCatalog: [{ ...mace, id: 'claw', introductionYear: 3050 }],
      }).isValid,
    ).toBe(false);
    expect(
      check({
        ...loadout,
        equipmentCatalog: [{ ...mace, id: 'claw', introductionYear: 3045 }],
      }).isValid,
    ).toBe(true);
  });
  it('rejects the Cudgel CDG-1B mace (3061 on a 3053 design)', () => {
    expect(check(withEquipment()).isValid).toBe(false);
  });
  it('rejects the Zeus X ZEU-X composite structure', () => {
    expect(
      check({
        introductionYear: 3054,
        internalStructureType: InternalStructureType.COMPOSITE,
      }).isValid,
    ).toBe(false);
  });
  it('rejects the Cougar-XR Clan small cockpit', () => {
    expect(
      check({
        introductionYear: 3071,
        techBase: TechBase.CLAN,
        cockpitType: CockpitType.SMALL,
      }).isValid,
    ).toBe(false);
  });
  it.each([
    [3055, false],
    [3056, true],
    [3061, true],
  ])('uses the inclusive five-year margin at %i', (introductionYear, valid) => {
    expect(
      check({
        introductionYear,
        ...withEquipment(),
      }).isValid,
    ).toBe(valid);
  });
  it('uses the explicit validation year when supplied (TestEntity.java:1613)', () => {
    expect(
      check({ internalStructureType: InternalStructureType.COMPOSITE }, 3100)
        .isValid,
    ).toBe(true);
  });
  it('uses IS small-cockpit dates for mixed-tech Clan designs', () => {
    expect(
      check({
        introductionYear: 3055,
        techBase: TechBase.CLAN,
        techBaseMode: TechBaseMode.MIXED,
        cockpitType: CockpitType.SMALL,
      }).isValid,
    ).toBe(true);
  });
  it.each([
    [EquipmentCategory.AMMUNITION, true],
    [EquipmentCategory.ELECTRONICS, false],
  ])(
    'skips actual ammunition, not equipment whose name contains ammo (%s)',
    (category, valid) => {
      expect(
        check(withEquipment({ ...mace, id: 'ammo-controller', category }))
          .isValid,
      ).toBe(valid);
    },
  );
  it.each(['ei-interface', 'dni-cockpit'])(
    'skips retrofittable %s (TestEntity.java:1493-1497)',
    (id) => {
      expect(check(withEquipment({ ...mace, id })).isValid).toBe(true);
    },
  );
  it('uses a component date only on its tech side unless mixed', () => {
    const overrides = {
      ...withEquipment(),
      techBase: TechBase.CLAN,
    };
    expect(check(overrides).isValid).toBe(true);
    expect(
      check({ ...overrides, techBaseMode: TechBaseMode.MIXED }).isValid,
    ).toBe(false);
  });
  it('keeps the corrected Crael claw legal at the exact margin', () => {
    expect(
      check({
        introductionYear: 3040,
        mountedEquipment: [{ equipmentId: 'claw', weight: 1 }],
        equipmentCatalog: [{ ...mace, id: 'claw', introductionYear: 3045 }],
      }).isValid,
    ).toBe(true);
  });
  it('does not apply the mech rule to vehicles', () => {
    expect(
      check({
        unitType: UnitType.VEHICLE,
        internalStructureType: InternalStructureType.COMPOSITE,
      }).results.some((r) => r.ruleId === 'VAL-BM-011'),
    ).toBe(false);
  });
});
