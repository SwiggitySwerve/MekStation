import { convertAmmunition } from '@/services/equipment/EquipmentConverters';
import { initializeUnitValidationRules } from '@/services/validation/initializeUnitValidation';
import { validateUnit } from '@/services/validation/UnitValidationOrchestrator';
import { TechBase, RulesLevel, Era } from '@/types/enums';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { IEquipmentItem } from '@/types/equipment/EquipmentItem';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  IValidatableUnit,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';

import ammunitionData from '../../../../../../public/data/equipment/official/ammunition/other.json';

const rawAmmo = ammunitionData.items.find(
  (item) => item.id === 'ammo-srtorpedo-6',
);
if (!rawAmmo) throw new Error('Missing Javelin SRT 6 ammunition');
const ammo = convertAmmunition(rawAmmo);
const srtAmmo: IEquipmentItem = {
  ...ammo,
  category: EquipmentCategory.AMMUNITION,
  costCBills: ammo.costPerTon,
};

// mm-data 50f7efe: meks/3025 CCE/Light/Javelin JVN-10U.mtf, rules level:1.
// Source SHA-256: 315173421c9212993b3f2da0f0514665348f30888ce951de902f6a2b30c9edd1.
// MegaMek 48fcb2f64 TestEntity.java:1271-1286 rejects both SRT 6 ammo bins.
function javelin(overrides: Partial<IValidatableUnit> = {}): IValidatableUnit {
  return {
    id: 'javelin-jvn-10u',
    name: 'Javelin JVN-10U',
    unitType: UnitType.BATTLEMECH,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    introductionYear: 2751,
    era: Era.STAR_LEAGUE,
    weight: 30,
    cost: 0,
    battleValue: 0,
    engineType: 'Standard 180',
    gyroType: 'Standard',
    cockpitType: 'Standard',
    internalStructureType: 'Standard',
    heatSinkCount: 10,
    mountedEquipment: [
      { equipmentId: srtAmmo.id, weight: 1 },
      { equipmentId: srtAmmo.id, weight: 1 },
    ],
    equipmentCatalog: [srtAmmo],
    ...overrides,
  };
}

function check(overrides: Partial<IValidatableUnit> = {}) {
  initializeUnitValidationRules();
  return validateUnit(javelin(overrides));
}

describe('BattleMech introductory ammunition legality', () => {
  it('rejects the Javelin JVN-10U through the public validator with named errors', () => {
    const result = check();
    expect(result.isValid).toBe(false);
    expect(
      result.results.find((rule) => rule.ruleId === 'VAL-BM-012'),
    ).toMatchObject({
      passed: false,
      errors: [
        expect.objectContaining({
          severity: UnitValidationSeverity.ERROR,
          message: expect.stringContaining('SRT 6 Ammo'),
          field: 'mountedEquipment',
        }),
        expect.objectContaining({
          severity: UnitValidationSeverity.ERROR,
          message: expect.stringContaining('SRT 6 Ammo'),
        }),
      ],
    });
  });

  it.each([RulesLevel.STANDARD, RulesLevel.ADVANCED, RulesLevel.EXPERIMENTAL])(
    'rejects %s ammo on an introductory unit',
    (rulesLevel) => {
      expect(
        check({ equipmentCatalog: [{ ...srtAmmo, rulesLevel }] }).isValid,
      ).toBe(false);
    },
  );

  it('accepts introductory ammo at the inclusive rules-level boundary', () => {
    expect(
      check({
        equipmentCatalog: [{ ...srtAmmo, rulesLevel: RulesLevel.INTRODUCTORY }],
      }).isValid,
    ).toBe(true);
  });

  it('also rejects illegal introductory OmniMech ammunition', () => {
    expect(check({ unitType: UnitType.OMNIMECH }).isValid).toBe(false);
  });

  it.each([RulesLevel.STANDARD, RulesLevel.ADVANCED, RulesLevel.EXPERIMENTAL])(
    'leaves %s units outside this rule',
    (rulesLevel) => expect(check({ rulesLevel }).isValid).toBe(true),
  );

  it('does not treat weapons as ammunition', () => {
    expect(
      check({
        equipmentCatalog: [
          { ...srtAmmo, category: EquipmentCategory.MISSILE_WEAPON },
        ],
      }).isValid,
    ).toBe(true);
  });

  it.each([
    { mountedEquipment: [] },
    { mountedEquipment: undefined },
    { equipmentCatalog: [] },
    { equipmentCatalog: undefined },
  ])(
    'leaves absent mounts or definitions to their owning checks: %j',
    (overrides) => {
      expect(check(overrides).isValid).toBe(true);
    },
  );
});
