import {
  RepairType,
  UnitLocation,
  createDamageAssessment,
  generateRepairItems,
  type CreateDamageAssessmentInput,
} from '../RepairInterfaces';
import {
  createTestAssessment,
  createTestLocationDamage,
} from './repairTestFactories';

function createAssessmentInput(
  overrides: Partial<CreateDamageAssessmentInput> = {},
): CreateDamageAssessmentInput {
  return {
    unitId: 'unit-1',
    unitName: 'Atlas',
    armorDamage: { center_torso: 10 },
    structureDamage: { center_torso: 0 },
    destroyedComponents: [],
    armorMax: { center_torso: 40 },
    structureMax: { center_torso: 20 },
    ...overrides,
  };
}

describe('createDamageAssessment', () => {
  it('creates an assessment from named damage data', () => {
    const assessment = createDamageAssessment(createAssessmentInput());

    expect(assessment.unitId).toBe('unit-1');
    expect(assessment.unitName).toBe('Atlas');
    expect(assessment.totalArmorDamage).toBe(10);
    expect(assessment.totalArmorMax).toBe(40);
    expect(assessment.isDestroyed).toBe(false);
  });

  it('keeps destroyed component references with matching locations', () => {
    const assessment = createDamageAssessment(
      createAssessmentInput({
        destroyedComponents: [
          'center torso medium laser',
          'right arm actuator',
        ],
        armorMax: {
          center_torso: 40,
          right_arm: 30,
        },
        structureMax: {
          center_torso: 20,
          right_arm: 15,
        },
      }),
    );

    const centerTorso = assessment.locationDamage.find(
      (damage) => damage.location === UnitLocation.CenterTorso,
    );
    const rightArm = assessment.locationDamage.find(
      (damage) => damage.location === UnitLocation.RightArm,
    );

    expect(centerTorso?.destroyedComponents).toEqual([
      'center torso medium laser',
    ]);
    expect(rightArm?.destroyedComponents).toEqual(['right arm actuator']);
    expect(assessment.allDestroyedComponents).toEqual([
      'center torso medium laser',
      'right arm actuator',
    ]);
  });

  it('marks the unit destroyed when center torso structure is gone', () => {
    const assessment = createDamageAssessment(
      createAssessmentInput({
        armorDamage: { center_torso: 40 },
        structureDamage: { center_torso: 20 },
      }),
    );

    expect(assessment.isDestroyed).toBe(true);
    expect(assessment.operationalPercent).toBe(0);
  });

  it('calculates operational percentage for damaged but surviving units', () => {
    const assessment = createDamageAssessment(
      createAssessmentInput({
        armorDamage: { center_torso: 20 },
        structureDamage: { center_torso: 0 },
      }),
    );

    expect(assessment.operationalPercent).toBeGreaterThan(0);
    expect(assessment.operationalPercent).toBeLessThan(100);
  });
});

describe('generateRepairItems', () => {
  it('generates armor repair items for armor damage', () => {
    const assessment = createTestAssessment({
      locationDamage: [
        createTestLocationDamage({
          armorDamage: 10,
          structureDamage: 0,
        }),
      ],
    });

    const items = generateRepairItems(assessment);

    expect(items.length).toBeGreaterThan(0);
    expect(items.some((item) => item.type === RepairType.Armor)).toBe(true);
  });

  it('generates structure repair items for structure damage', () => {
    const assessment = createTestAssessment({
      locationDamage: [
        createTestLocationDamage({
          armorDamage: 0,
          structureDamage: 5,
        }),
      ],
    });

    expect(
      generateRepairItems(assessment).some(
        (item) => item.type === RepairType.Structure,
      ),
    ).toBe(true);
  });

  it('generates selected component replacement items', () => {
    const assessment = createTestAssessment({
      locationDamage: [
        createTestLocationDamage({
          armorDamage: 0,
          structureDamage: 0,
          destroyedComponents: ['Medium Laser'],
        }),
      ],
    });

    const items = generateRepairItems(assessment);

    expect(
      items.some((item) => item.type === RepairType.ComponentReplace),
    ).toBe(true);
    expect(items.every((item) => item.selected)).toBe(true);
  });
});
