import type { IParityTerm } from '../ParityValidationNumerical';

import { compareParityTerms } from '../ParityValidationNumerical';

describe('strict loaded-entity parity terms', () => {
  function compare(reference: unknown, actual: unknown) {
    return compareParityTerms([
      { field: 'bv.total', comparison: 'numeric', reference, actual },
    ]);
  }

  it.each([1010, 990])('rejects BV %s at exactly one percent', (actual) => {
    const result = compare(1000, actual);
    expect(result.passed).toBe(false);
    expect(result.terms[0]).toMatchObject({
      field: 'bv.total',
      passed: false,
      reason: 'difference',
      relativeError: 0.01,
    });
  });

  it.each([1009, 991, 1009.999999999, 990.000000001])(
    'accepts BV %s strictly below one percent without rounding',
    (actual) => expect(compare(1000, actual).passed).toBe(true),
  );

  it.each([
    [10, 10.1],
    [10, 9.9],
    [5, 5.05],
    [5, 4.95],
    [-10, -10.1],
    [-10, -9.9],
    [0.07, 0.0707],
    [1e100, 1.01e100],
    [1e-100, 0.99e-100],
  ])('rejects the exact JSON decimal boundary %s / %s', (reference, actual) => {
    expect(compare(reference, actual).passed).toBe(false);
  });

  it.each([
    [10, 10.099999999999998],
    [10, 9.900000000000002],
    [-10, -10.099999999999998],
    [-10, -9.900000000000002],
    [0.07, 0.07069999999999999],
    [Number.MIN_VALUE, Number.MIN_VALUE],
    [Number.MAX_VALUE, Number.MAX_VALUE],
  ])(
    'accepts representable values inside the boundary %s / %s',
    (reference, actual) => {
      expect(compare(reference, actual).passed).toBe(true);
    },
  );

  it('fails missing entries in entirely sparse and mixed arrays', () => {
    const sparse = new Array<IParityTerm>(1);
    expect(compareParityTerms(sparse)).toMatchObject({
      passed: false,
      terms: [{ field: '[0]', passed: false, reason: 'missing_term' }],
    });
    const mixed = new Array<IParityTerm>(2);
    mixed[0] = {
      field: 'bv.total',
      comparison: 'numeric',
      reference: 1,
      actual: 1,
    };
    expect(compareParityTerms(mixed)).toMatchObject({
      passed: false,
      terms: [
        { passed: true },
        { field: '[1]', passed: false, reason: 'missing_term' },
      ],
    });
  });

  it.each([
    [-1000, -1010, false],
    [-1000, -990, false],
    [-1000, -1009, true],
    [-1000, -991, true],
  ])('compares signed reference %s to %s', (reference, actual, passed) => {
    expect(compare(reference, actual).passed).toBe(passed);
  });

  it.each([0, -0])(
    'accepts zero reference only with actual zero %s',
    (actual) => {
      expect(compare(0, actual).passed).toBe(true);
    },
  );

  it.each([Number.MIN_VALUE, -Number.MIN_VALUE, 0.001, 1])(
    'rejects nonzero actual %s against zero reference',
    (actual) => expect(compare(0, actual).passed).toBe(false),
  );

  it.each([undefined, null, NaN, Infinity, -Infinity, '1000'])(
    'rejects invalid reference %s and actual %s, including when equal',
    (value) => {
      expect(compare(value, 1000)).toMatchObject({
        passed: false,
        terms: [{ reason: 'invalid_reference', passed: false }],
      });
      expect(compare(1000, value)).toMatchObject({
        passed: false,
        terms: [{ reason: 'invalid_actual', passed: false }],
      });
      expect(compare(value, value).passed).toBe(false);
    },
  );

  it('fails incorrect components even when their errors cancel in the total', () => {
    const result = compareParityTerms([
      {
        field: 'weight.total',
        comparison: 'numeric',
        reference: 50,
        actual: 50,
      },
      {
        field: 'weight.engine',
        comparison: 'numeric',
        reference: 10,
        actual: 11,
      },
      {
        field: 'weight.controls',
        comparison: 'numeric',
        reference: 5,
        actual: 4,
      },
      {
        field: 'bv.total',
        comparison: 'numeric',
        reference: 1000,
        actual: 1000,
      },
      {
        field: 'bv.defensive',
        comparison: 'numeric',
        reference: 400,
        actual: 410,
      },
      {
        field: 'bv.offensive',
        comparison: 'numeric',
        reference: 600,
        actual: 590,
      },
    ]);
    expect(result.passed).toBe(false);
    expect(
      result.terms.filter((term) => !term.passed).map((term) => term.field),
    ).toEqual([
      'weight.engine',
      'weight.controls',
      'bv.defensive',
      'bv.offensive',
    ]);
  });

  it.each([
    ['equipment.count', 1000, 1001],
    ['location', 'LEFT', 'RIGHT'],
    ['equipment.id', 'laser', 'Laser'],
    ['mount.rear', true, false],
    ['equipment.count', 1, '1'],
  ])('compares discrete %s exactly', (field, reference, actual) => {
    expect(
      compareParityTerms([{ field, comparison: 'exact', reference, actual }])
        .passed,
    ).toBe(false);
  });

  it.each([0, 1, 'LEFT', false, true])(
    'accepts an exactly matching discrete value %s',
    (value) => {
      expect(
        compareParityTerms([
          {
            field: 'fact',
            comparison: 'exact',
            reference: value,
            actual: value,
          },
        ]).passed,
      ).toBe(true);
    },
  );

  it.each([undefined, null, NaN, Infinity, -Infinity, {}, []])(
    'rejects missing/nonfinite or unprojected discrete value %s',
    (value) => {
      expect(
        compareParityTerms([
          {
            field: 'fact',
            comparison: 'exact',
            reference: value,
            actual: value,
          },
        ]).passed,
      ).toBe(false);
    },
  );

  it('fails a missing component rather than comparing only available totals', () => {
    const result = compareParityTerms([
      {
        field: 'weight.total',
        comparison: 'numeric',
        reference: 50,
        actual: 50,
      },
      { field: 'weight.engine', comparison: 'numeric', reference: 10 },
    ]);
    expect(result.passed).toBe(false);
    expect(result.terms[1]).toMatchObject({
      field: 'weight.engine',
      reason: 'invalid_actual',
    });
  });

  it('does not mutate or drop supplied terms', () => {
    const term = Object.freeze({
      field: 'bv.total',
      comparison: 'numeric' as const,
      reference: 1000,
      actual: 1009,
    });
    const terms = Object.freeze([term]);
    expect(compareParityTerms(terms)).toMatchObject({
      passed: true,
      terms: [{ ...term, passed: true }],
    });
    expect(term).not.toHaveProperty('passed');
  });

  it('fails empty comparisons instead of reporting vacuous success', () => {
    expect(compareParityTerms([])).toEqual({ passed: false, terms: [] });
  });
});
