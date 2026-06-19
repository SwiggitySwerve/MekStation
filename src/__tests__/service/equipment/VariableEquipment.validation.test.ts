import {
  validateFormula,
  type IFormula,
} from '@/types/equipment/VariableEquipment';

describe('validateFormula', () => {
  it('validates required fields for each formula family', () => {
    const cases: readonly {
      readonly formula: IFormula;
      readonly errors: readonly string[];
    }[] = [
      {
        formula: { type: 'FIXED' },
        errors: ['FIXED formula requires value'],
      },
      {
        formula: { type: 'CEIL_DIVIDE', divisor: 0 },
        errors: [
          'CEIL_DIVIDE formula requires field',
          'CEIL_DIVIDE formula requires positive divisor',
        ],
      },
      {
        formula: { type: 'FLOOR_DIVIDE', field: 'tonnage', divisor: 0 },
        errors: ['FLOOR_DIVIDE formula requires positive divisor'],
      },
      {
        formula: { type: 'ROUND_DIVIDE', divisor: 1 },
        errors: ['ROUND_DIVIDE formula requires field'],
      },
      {
        formula: { type: 'MULTIPLY' },
        errors: [
          'MULTIPLY formula requires field',
          'MULTIPLY formula requires multiplier',
        ],
      },
      {
        formula: { type: 'MULTIPLY_ROUND', roundTo: 0 },
        errors: [
          'MULTIPLY_ROUND formula requires field',
          'MULTIPLY_ROUND formula requires multiplier',
          'MULTIPLY_ROUND formula requires positive roundTo',
        ],
      },
      {
        formula: { type: 'EQUALS_WEIGHT' },
        errors: [],
      },
      {
        formula: { type: 'EQUALS_FIELD' },
        errors: ['EQUALS_FIELD formula requires field'],
      },
      {
        formula: { type: 'MIN', formulas: [] },
        errors: ['MIN formula requires at least one sub-formula'],
      },
      {
        formula: { type: 'MAX', formulas: [] },
        errors: ['MAX formula requires at least one sub-formula'],
      },
      {
        formula: { type: 'PLUS' },
        errors: [
          'PLUS formula requires base formula',
          'PLUS formula requires bonus value',
        ],
      },
    ];

    cases.forEach(({ formula, errors }) => {
      expect(validateFormula(formula)).toEqual(errors);
    });
  });

  it('recursively validates nested formulas', () => {
    expect(
      validateFormula({
        type: 'MIN',
        formulas: [{ type: 'FIXED' }],
      }),
    ).toEqual(['FIXED formula requires value']);

    expect(
      validateFormula({
        type: 'PLUS',
        base: { type: 'EQUALS_FIELD' },
        bonus: 1,
      }),
    ).toEqual(['EQUALS_FIELD formula requires field']);
  });

  it('reports unknown formula types from untrusted data', () => {
    const unknownFormula = { type: 'UNKNOWN' } as unknown as IFormula;

    expect(validateFormula(unknownFormula)).toEqual([
      'Unknown formula type: UNKNOWN',
    ]);
  });
});
