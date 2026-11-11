// Capture records -> schema rows, and the counts the nightly publishes. No BV arithmetic here: the
// capture reads BV, validity, weight, MP and terms from the app; this maps them and counts
// agreement with the committed Java reference.
import { assertPopulation } from '../lib/runtime-parity/rows.mjs';

/** One captured record -> one load row (validated by serializeRows before it is written). */
export function capturedToRow(record) {
  const key = {
    schemaVersion: 1,
    family: record.family,
    unitId: record.unitId,
    path: record.path,
    sha256: record.sha256,
    catalog: record.catalog,
    measure: 'load',
  };
  if (record.error) {
    const { stage, name, message } = record.error;
    return { ...key, status: 'error', error: { stage, name, message } };
  }
  return {
    ...key,
    status: 'ok',
    load: {
      observed: { ...record.observed, occupancy: null },
      // No calculator result (the status bar's 0 fallback): no breakdown, so no terms.
      terms: record.terms ?? {},
      issues: record.issues,
    },
  };
}

// The summary counts a nightly may gate on, and which way is better, by path into this summary
// (`group.key`). A worse count fails the nightly, a better one passes; the direction is data here so
// nothing downstream hard-codes it. Every one is higher-is-better.
export const GATES = {
  'bv.exact': { gated: true, direction: 'higher-is-better' },
  'validity.agree': { gated: true, direction: 'higher-is-better' },
  'weightOwners.agree': { gated: true, direction: 'higher-is-better' },
};

const fmt = (n) => n.toLocaleString('en-US');

/**
 * Counts against the Java reference (battleValue.total, construction.valid). Error rows and null
 * BV count as misses everywhere; nothing is skipped or treated as zero. Returns the summary and
 * the per-unit differences (also misses) so a drop names its units.
 */
export function summarize({ rows, referenceByPath, scope, deterministic }) {
  // The counts below are only meaningful over exactly the population the scope claims.
  assertPopulation(scope, rows.length);
  if (
    new Set(rows.map((row) => `${row.family}\0${row.unitId}`)).size !==
    rows.length
  )
    throw new Error('Population mismatch: more than one row for a unit');
  const errorsByStage = {};
  const bv = { exact: 0, different: 0, missing: 0 };
  const validity = { agree: 0, disagree: 0, missing: 0 };
  // Status-bar weightUsed vs projectMechWeight().allocatedWeight, compared exactly: a difference is
  // a second weight owner, reported as a finding (never a tolerance).
  const weightOwners = { agree: 0, mismatch: 0, missing: 0 };
  const differences = [];
  for (const row of rows) {
    const ref = referenceByPath.get(row.path);
    const identity = { family: row.family, unitId: row.unitId, path: row.path };
    if (row.status === 'error') {
      errorsByStage[row.error.stage] =
        (errorsByStage[row.error.stage] ?? 0) + 1;
      bv.missing++;
      validity.missing++;
      weightOwners.missing++;
      differences.push({
        ...identity,
        measure: 'bv',
        observed: null,
        java: ref?.battleValue?.total ?? null,
        why: `error:${row.error.stage}`,
      });
      differences.push({
        ...identity,
        measure: 'validity',
        observed: null,
        java: ref?.construction?.valid ?? null,
        why: `error:${row.error.stage}`,
      });
      continue;
    }
    const { observed } = row.load;
    if (observed.weight === observed.allocatedWeight) weightOwners.agree++;
    else {
      weightOwners.mismatch++;
      differences.push({
        ...identity,
        measure: 'weight-owner',
        observed: observed.weight,
        allocated: observed.allocatedWeight,
        why: 'weightUsed differs from allocatedWeight',
      });
    }
    const javaBv = ref?.battleValue?.total;
    if (observed.bv === null) {
      bv.missing++;
      differences.push({
        ...identity,
        measure: 'bv',
        observed: null,
        java: javaBv ?? null,
        why: 'no-calculator-result',
      });
    } else if (observed.bv === javaBv) bv.exact++;
    else {
      bv.different++;
      differences.push({
        ...identity,
        measure: 'bv',
        observed: observed.bv,
        java: javaBv ?? null,
        why: 'different',
      });
    }
    const javaValid = ref?.construction?.valid;
    if (typeof javaValid !== 'boolean') {
      validity.missing++;
      differences.push({
        ...identity,
        measure: 'validity',
        observed: observed.validity,
        java: null,
        why: 'no-java-validity',
      });
    } else if ((observed.validity === 'valid') === javaValid) validity.agree++;
    else {
      validity.disagree++;
      differences.push({
        ...identity,
        measure: 'validity',
        observed: observed.validity,
        java: javaValid ? 'valid' : 'invalid',
        why: 'different',
      });
    }
  }
  const units = rows.length;
  const ok = rows.filter((row) => row.status === 'ok').length;
  return {
    summary: {
      schemaVersion: 1,
      measure: 'load',
      scope,
      units,
      ok,
      errors: units - ok,
      errorsByStage,
      bv,
      validity,
      weightOwners,
      deterministic,
      gates: GATES,
      headline: `load=Java ${fmt(bv.exact)}/${fmt(units)} · validity ${fmt(validity.agree)}/${fmt(units)} · weight owners ${fmt(weightOwners.agree)}/${fmt(units)}${weightOwners.mismatch ? ` (DIFFER ${fmt(weightOwners.mismatch)})` : ''}${scope.unitIds ? ' · NARROWED SCOPE' : ''}`,
    },
    differences,
  };
}
