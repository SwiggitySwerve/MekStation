import type {
  IUnitValidationRule,
  IUnitValidationRuleDefinition,
  IValidatableUnit,
} from '@/types/validation/UnitValidationInterfaces';

import {
  initializeUnitValidationRules,
  resetUnitValidationRules,
} from '@/services/validation/initializeUnitValidation';
import { UnitValidationOrchestrator } from '@/services/validation/UnitValidationOrchestrator';
import {
  getUnitValidationRegistry,
  resetUnitValidationRegistry,
  UnitValidationRegistry,
} from '@/services/validation/UnitValidationRegistry';
import { Era } from '@/types/enums/Era';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  UnitCategory,
  createUnitValidationRuleResult,
} from '@/types/validation/UnitValidationInterfaces';

const createUnit = (): IValidatableUnit => ({
  id: 'test-unit',
  name: 'Test Unit',
  unitType: UnitType.BATTLEMECH,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  introductionYear: 3025,
  era: Era.LATE_SUCCESSION_WARS,
  weight: 50,
  cost: 5000000,
  battleValue: 1000,
});

describe('validation hierarchy order', () => {
  beforeEach(() => {
    resetUnitValidationRegistry();
    resetUnitValidationRules();
    initializeUnitValidationRules();
  });

  afterEach(() => {
    resetUnitValidationRules();
  });

  it('executes universal, category, then unit-type rules at the orchestrator boundary', () => {
    const registry = getUnitValidationRegistry();
    const rules = registry.getRulesForUnitType(UnitType.BATTLEMECH);
    const representativeIds = ['VAL-UNIV-001', 'VAL-MECH-001', 'VAL-BM-001'];

    for (const id of representativeIds) {
      expect(rules.some((rule) => rule.id === id)).toBe(true);
    }

    const ids = rules.map((rule) => rule.id);
    expect(ids.indexOf('VAL-UNIV-001')).toBeLessThan(
      ids.indexOf('VAL-MECH-001'),
    );
    expect(ids.indexOf('VAL-MECH-001')).toBeLessThan(ids.indexOf('VAL-BM-001'));

    const execution: string[] = [];
    const instrumentedRules: IUnitValidationRule[] = rules.map((rule) => ({
      ...rule,
      canValidate: (context) => rule.canValidate(context),
      validate: (context) => {
        execution.push(rule.id);
        return rule.validate(context);
      },
    }));
    const getRulesSpy = jest
      .spyOn(registry, 'getRulesForUnitType')
      .mockReturnValue(instrumentedRules);

    new UnitValidationOrchestrator(registry).validate(createUnit(), {
      maxErrors: 1000,
    });

    expect(execution).toEqual(expect.arrayContaining(representativeIds));
    expect(execution.indexOf('VAL-UNIV-001')).toBeLessThan(
      execution.indexOf('VAL-MECH-001'),
    );
    expect(execution.indexOf('VAL-MECH-001')).toBeLessThan(
      execution.indexOf('VAL-BM-001'),
    );
    getRulesSpy.mockRestore();
  });

  const createRule = (
    id: string,
    priority: number,
    overridesOrExtends: Partial<
      Pick<IUnitValidationRuleDefinition, 'overrides' | 'extends'>
    > = {},
    execute?: () => void,
  ): IUnitValidationRuleDefinition => ({
    id,
    name: id,
    description: id,
    category: ValidationCategory.CONSTRUCTION,
    priority,
    ...overridesOrExtends,
    validate: () => {
      execute?.();
      return createUnitValidationRuleResult(id, id, [], [], [], 0);
    },
  });

  it('sorts effective overrides by child level and preserves equal-priority order', () => {
    const registry = new UnitValidationRegistry();
    const execution: string[] = [];

    registry.registerUniversalRule(
      createRule('VAL-BASE', 1, {}, () => execution.push('base')),
    );
    registry.registerUniversalRule(
      createRule('VAL-UNIV-A', 5, {}, () => execution.push('univ-a')),
    );
    registry.registerUniversalRule(
      createRule('VAL-UNIV-B', 5, {}, () => execution.push('univ-b')),
    );
    registry.registerCategoryRule(
      UnitCategory.MECH,
      createRule('VAL-OVERRIDE', 100, { overrides: 'VAL-BASE' }, () =>
        execution.push('override'),
      ),
    );
    registry.registerUnitTypeRule(
      UnitType.BATTLEMECH,
      createRule('VAL-UNIT', 1, {}, () => execution.push('unit')),
    );

    const rules = registry.getRulesForUnitType(UnitType.BATTLEMECH);
    expect(rules.some((rule) => rule.id === 'VAL-BASE')).toBe(false);
    expect(rules.some((rule) => rule.id === 'VAL-OVERRIDE')).toBe(true);

    new UnitValidationOrchestrator(registry).validate(createUnit(), {
      maxErrors: 1000,
    });

    expect(execution).toEqual(['univ-a', 'univ-b', 'override', 'unit']);
  });

  it('retains a more-specific rule with an ID targeted by a category override', () => {
    const registry = new UnitValidationRegistry();

    registry.registerUniversalRule(createRule('VAL-SAME-ID', 1));
    registry.registerCategoryRule(
      UnitCategory.MECH,
      createRule('VAL-CATEGORY-OVERRIDE', 1, { overrides: 'VAL-SAME-ID' }),
    );
    registry.registerUnitTypeRule(
      UnitType.BATTLEMECH,
      createRule('VAL-SAME-ID', 1),
    );

    expect(
      registry.getRulesForUnitType(UnitType.BATTLEMECH).map((rule) => rule.id),
    ).toEqual(['VAL-CATEGORY-OVERRIDE', 'VAL-SAME-ID']);
  });

  it('keeps parent-before-child extension execution across levels', () => {
    const registry = new UnitValidationRegistry();
    const execution: string[] = [];

    registry.registerUniversalRule(
      createRule('VAL-EXT-BASE', 100, {}, () => execution.push('parent')),
    );
    registry.registerCategoryRule(
      UnitCategory.MECH,
      createRule('VAL-EXT-CHILD', 1, { extends: 'VAL-EXT-BASE' }, () =>
        execution.push('child'),
      ),
    );
    registry.registerUnitTypeRule(
      UnitType.BATTLEMECH,
      createRule('VAL-EXT-UNIT', 1, {}, () => execution.push('unit')),
    );

    const rules = registry.getRulesForUnitType(UnitType.BATTLEMECH);
    expect(rules.some((rule) => rule.id === 'VAL-EXT-BASE')).toBe(true);

    new UnitValidationOrchestrator(registry).validate(createUnit(), {
      maxErrors: 1000,
    });

    expect(execution).toEqual(['parent', 'child', 'unit']);
  });

  it('anchors an extension composite at the extended parent level and priority', () => {
    const registry = new UnitValidationRegistry();
    const execution: string[] = [];

    registry.registerCategoryRule(
      UnitCategory.MECH,
      createRule('VAL-CHAIN-PARENT', 100, {}, () => execution.push('parent')),
    );
    registry.registerCategoryRule(
      UnitCategory.MECH,
      createRule('VAL-CHAIN-SIBLING', 50, {}, () => execution.push('sibling')),
    );
    registry.registerUnitTypeRule(
      UnitType.BATTLEMECH,
      createRule('VAL-CHAIN-CHILD', 1, { extends: 'VAL-CHAIN-PARENT' }, () =>
        execution.push('child'),
      ),
    );
    registry.registerUnitTypeRule(
      UnitType.BATTLEMECH,
      createRule('VAL-CHAIN-UNIT', 0, {}, () => execution.push('unit')),
    );

    const composite = registry
      .getRulesForUnitType(UnitType.BATTLEMECH)
      .find((rule) => rule.id === 'VAL-CHAIN-PARENT');
    expect(composite).toMatchObject({ id: 'VAL-CHAIN-PARENT', priority: 100 });

    new UnitValidationOrchestrator(registry).validate(createUnit(), {
      maxErrors: 1000,
    });

    expect(execution).toEqual(['sibling', 'parent', 'child', 'unit']);
  });
});
