/**
 * Strict per-term comparison for loaded-entity construction and BV references.
 *
 * The caller must enumerate every applicable quantity/component, retain missing
 * results, and match reference provenance and calculation settings beforehand.
 * Discrete facts (including counts) must use exact comparisons. This boundary
 * evaluates supplied terms; it cannot prove complete reference/family coverage.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/battle-value-system/spec.md
 */

export interface IParityTerm {
  readonly field: string;
  readonly comparison: 'numeric' | 'exact';
  readonly reference?: unknown;
  readonly actual?: unknown;
}

export interface IParityTermResult extends IParityTerm {
  readonly passed: boolean;
  readonly reason:
    | 'match'
    | 'difference'
    | 'invalid_reference'
    | 'invalid_actual'
    | 'missing_term';
  /** Approximate binary ratio for reporting; acceptance uses exact JSON decimals. */
  readonly relativeError: number | null;
}

export interface IParityComparisonResult {
  readonly passed: boolean;
  readonly terms: readonly IParityTermResult[];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isExactValue(value: unknown): value is string | boolean | number {
  return (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    isFiniteNumber(value)
  );
}

function decimalParts(value: number): {
  coefficient: bigint;
  exponent: number;
} {
  // Number.toString is also JSON's decimal representation. Comparing its exact
  // digits avoids accepting 10 vs 10.1 because binary subtraction lands below 1%.
  const [mantissa, exponent = '0'] = value.toString().split('e');
  const [integer, fraction = ''] = mantissa.split('.');
  return {
    coefficient: BigInt(integer + fraction),
    exponent: Number(exponent) - fraction.length,
  };
}

function strictlyWithinOnePercent(reference: number, actual: number): boolean {
  const ref = decimalParts(reference);
  const act = decimalParts(actual);
  const exponent = Math.min(ref.exponent, act.exponent);
  const refInteger =
    ref.coefficient * BigInt(10) ** BigInt(ref.exponent - exponent);
  const actInteger =
    act.coefficient * BigInt(10) ** BigInt(act.exponent - exponent);
  const difference = actInteger - refInteger;
  const absoluteDifference = difference < BigInt(0) ? -difference : difference;
  const absoluteReference = refInteger < BigInt(0) ? -refInteger : refInteger;
  return absoluteDifference * BigInt(100) < absoluteReference;
}

function compareTerm(term: IParityTerm): IParityTermResult {
  const valid = term.comparison === 'numeric' ? isFiniteNumber : isExactValue;
  if (!valid(term.reference)) {
    return {
      ...term,
      passed: false,
      reason: 'invalid_reference',
      relativeError: null,
    };
  }
  if (!valid(term.actual)) {
    return {
      ...term,
      passed: false,
      reason: 'invalid_actual',
      relativeError: null,
    };
  }

  let relativeError: number | null = null;
  let passed = term.actual === term.reference;
  if (
    term.comparison === 'numeric' &&
    isFiniteNumber(term.reference) &&
    isFiniteNumber(term.actual) &&
    term.reference !== 0
  ) {
    relativeError =
      Math.abs(term.actual - term.reference) / Math.abs(term.reference);
    passed = strictlyWithinOnePercent(term.reference, term.actual);
  }
  return {
    ...term,
    passed,
    reason: passed ? 'match' : 'difference',
    relativeError,
  };
}

/** Every supplied term must pass; a matching total cannot cancel bad components. */
export function compareParityTerms(
  terms: readonly IParityTerm[],
): IParityComparisonResult {
  const results = Array.from(
    terms,
    (term, index): IParityTermResult =>
      term === undefined
        ? {
            field: `[${index}]`,
            comparison: 'exact',
            passed: false,
            reason: 'missing_term',
            relativeError: null,
          }
        : compareTerm(term),
  );
  return {
    passed: results.length > 0 && results.every((term) => term.passed),
    terms: results,
  };
}
