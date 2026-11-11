// Shared comparison rules for the runtime-parity tools. They are C1's, not a second mapping:
// parity-0c/compare/compare-family.cjs and term-compare.ts compare raw term keys one by one with
// |a - b| <= 1e-9 * max(1, |b|) and no comparator folding, so a Java term the runtime does not
// name is `absent`, never silently matched. Totals (BV) compare exactly; the tolerance is for
// aggregates and terms only (large-aero aggregates move about 1 ulp with list order).

export const REL_TOL = 1e-9;

/** C1's `eq`: relative tolerance 1e-9, never true for a missing value. */
export const closeEnough = (a, b) =>
  typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= REL_TOL * Math.max(1, Math.abs(b));

/** Exact equality for totals; null never equals a number. */
export const sameTotal = (a, b) => a !== null && a !== undefined && a === b;

const category = (key) => key.split('.')[0];

/**
 * Term-wise: every numeric Java term, by raw key, against the runtime terms. Returns counts plus the
 * unequal terms (so a drop names its term); absent terms are counted by key category.
 */
export function compareTermsToJava(terms, javaTerms) {
  const result = { javaKeys: 0, equal: 0, unequal: 0, absent: 0, absentByCategory: {}, unequalTerms: [] };
  for (const [key, java] of Object.entries(javaTerms ?? {})) {
    if (typeof java !== 'number') continue;
    result.javaKeys++;
    const observed = terms?.[key];
    if (typeof observed !== 'number') {
      result.absent++;
      result.absentByCategory[category(key)] = (result.absentByCategory[category(key)] ?? 0) + 1;
    } else if (closeEnough(observed, java)) result.equal++;
    else {
      result.unequal++;
      result.unequalTerms.push({ key, observed, java });
    }
  }
  return result;
}

/** Two term maps against each other, key by key (runtime vs scratch). Returns the differing keys. */
export function diffTerms(a, b) {
  const diffs = [];
  for (const key of [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])].sort()) {
    const x = a?.[key];
    const y = b?.[key];
    if (typeof x === 'number' && typeof y === 'number') {
      if (!closeEnough(x, y)) diffs.push({ key, a: x, b: y });
    } else if (x !== y) diffs.push({ key, a: x ?? null, b: y ?? null });
  }
  return diffs;
}

/** The sequence a validation issue list is compared on: severity, raw field and message, in order. */
export const issueSignature = (issues) => (issues ?? []).map((i) => [String(i.severity), i.field ?? null, String(i.message)]);

export const sameSequence = (a, b) => JSON.stringify(a) === JSON.stringify(b);
