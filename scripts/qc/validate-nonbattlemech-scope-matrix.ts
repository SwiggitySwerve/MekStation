#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';

import {
  filterCombatValidationGapRowsByScope,
  getCombatValidationOutOfScopeRows,
  isCombatValidationAggregateGapRow,
  type ICombatValidationOutOfScopeRow,
} from '../../src/simulation/runner/CombatValidationGapInventory';

type IssueSeverity = 'error' | 'warning';

interface IMatrixIssue {
  readonly severity: IssueSeverity;
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

interface ICapabilityEntry {
  readonly area: string;
  readonly status: string;
  readonly releaseClaim: string;
}

interface IFamilyMatrix {
  readonly familyId: string;
  readonly label: string;
  readonly unitFamilies: readonly string[];
  readonly runtimeCombatClaim: string;
  readonly currentBoundary: string;
  readonly requiredOutOfScopeRefs: readonly string[];
  readonly capabilityMatrix: readonly ICapabilityEntry[];
}

interface IRowCoverageBucket {
  readonly bucketId: string;
  readonly label: string;
  readonly rowPatterns: readonly string[];
}

interface INonBattleMechScopeMatrix {
  readonly version: number;
  readonly surfaceId: string;
  readonly title: string;
  readonly releaseClaim: string;
  readonly scopeStatement: string;
  readonly sourceCommand: string;
  readonly expectedOutOfScopeSummary: {
    readonly total: number;
    readonly byScope: Readonly<Record<string, number>>;
    readonly bySection: Readonly<Record<string, number>>;
  };
  readonly requiredFamilyIds: readonly string[];
  readonly requiredCapabilityAreas: readonly string[];
  readonly families: readonly IFamilyMatrix[];
  readonly rowCoverageBuckets: readonly IRowCoverageBucket[];
}

const repoRoot = process.cwd();
const matrixPath =
  process.env.MEKSTATION_NONBATTLEMECH_SCOPE_MATRIX_PATH ??
  path.join(repoRoot, 'docs', 'qc', 'non-battlemech-combat-scope-matrix.json');

const requiredFamilyIds = [
  'ground-vehicles',
  'vtol',
  'aerospace-capital-lam',
  'battle-armor',
  'infantry',
  'protomech',
] as const;

const requiredCapabilityAreas = [
  'catalog-and-construction-data',
  'movement-preview',
  'combat-actions',
  'damage-and-lifecycle',
  'equipment-and-ammo',
  'pilot-spa-and-quirks',
] as const;

const allowedCapabilityStatuses = new Set([
  'ready-with-scope',
  'partial-helper-only',
  'helper-only',
  'out-of-scope',
  'not-claimed',
]);

function parseArgs(argv: readonly string[]): { readonly json: boolean } {
  return { json: argv.includes('--json') };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function issue(
  severity: IssueSeverity,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): IMatrixIssue {
  return { severity, code, message, details };
}

function countBy(values: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort());
}

function wildcardPatternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
    .replaceAll('*', '.*');
  return new RegExp(`^${escaped}$`);
}

function rowMatchesPattern(rowRef: string, pattern: string): boolean {
  return wildcardPatternToRegex(pattern).test(rowRef);
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function collectDuplicates(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function summarizeRows(rows: readonly ICombatValidationOutOfScopeRow[]) {
  return {
    total: rows.length,
    bySection: countBy(rows.map((row) => row.sectionId)),
    byScope: countBy(
      rows.map((row) =>
        isCombatValidationAggregateGapRow(row) ? 'aggregate' : 'leaf',
      ),
    ),
  };
}

function validateExpectedSummary(
  matrix: INonBattleMechScopeMatrix,
  rows: readonly ICombatValidationOutOfScopeRow[],
  issues: IMatrixIssue[],
): void {
  const actual = summarizeRows(rows);
  const expected = matrix.expectedOutOfScopeSummary;

  if (expected.total !== actual.total) {
    issues.push(
      issue(
        'error',
        'out-of-scope-total-mismatch',
        `Matrix expected ${expected.total} out-of-scope rows but inventory has ${actual.total}.`,
        { expected: expected.total, actual: actual.total },
      ),
    );
  }

  validateBucketCounts('scope', expected.byScope, actual.byScope, issues);
  validateBucketCounts('section', expected.bySection, actual.bySection, issues);
}

function validateBucketCounts(
  kind: string,
  expected: Readonly<Record<string, number>>,
  actual: Readonly<Record<string, number>>,
  issues: IMatrixIssue[],
): void {
  for (const [bucket, expectedCount] of Object.entries(expected)) {
    const actualCount = actual[bucket] ?? 0;
    if (actualCount !== expectedCount) {
      issues.push(
        issue(
          'error',
          `${kind}-count-mismatch`,
          `Matrix expected ${kind}:${bucket}=${expectedCount} but inventory has ${actualCount}.`,
          { bucket, expected: expectedCount, actual: actualCount },
        ),
      );
    }
  }
}

function validateTopLevelMatrix(
  matrix: INonBattleMechScopeMatrix,
  issues: IMatrixIssue[],
): void {
  if (matrix.version !== 1) {
    issues.push(
      issue('error', 'matrix-version-mismatch', 'Matrix version must be 1.'),
    );
  }

  if (matrix.surfaceId !== 'non-battlemech-combat-scope-matrix') {
    issues.push(
      issue(
        'error',
        'matrix-surface-mismatch',
        'Matrix must bind to non-battlemech-combat-scope-matrix.',
      ),
    );
  }

  if (matrix.releaseClaim !== 'ready-with-scope') {
    issues.push(
      issue(
        'error',
        'matrix-release-claim-mismatch',
        'Matrix releaseClaim must remain ready-with-scope.',
      ),
    );
  }

  if (
    !matrix.scopeStatement.includes('BattleMech') ||
    !matrix.scopeStatement.includes('Non-BattleMech') ||
    !matrix.scopeStatement.includes('out-of-scope')
  ) {
    issues.push(
      issue(
        'error',
        'matrix-scope-statement-weak',
        'Matrix scopeStatement must explicitly distinguish BattleMech, Non-BattleMech, and out-of-scope claims.',
      ),
    );
  }

  for (const token of ['validate:combat:gaps', '--level=out-of-scope']) {
    if (!matrix.sourceCommand.includes(token)) {
      issues.push(
        issue(
          'error',
          'matrix-source-command-missing-token',
          `Matrix sourceCommand must include ${token}.`,
          { token },
        ),
      );
    }
  }
}

function validateFamilyMatrices(
  matrix: INonBattleMechScopeMatrix,
  rowRefs: ReadonlySet<string>,
  issues: IMatrixIssue[],
) {
  const familyIds = matrix.families.map((family) => family.familyId);
  const familyIdDuplicates = collectDuplicates(familyIds);
  for (const familyId of familyIdDuplicates) {
    issues.push(
      issue(
        'error',
        'family-duplicate',
        `Family matrix ${familyId} is duplicated.`,
        { familyId },
      ),
    );
  }

  for (const familyId of requiredFamilyIds) {
    if (!matrix.requiredFamilyIds.includes(familyId)) {
      issues.push(
        issue(
          'error',
          'required-family-not-declared',
          `Matrix requiredFamilyIds must include ${familyId}.`,
          { familyId },
        ),
      );
    }

    if (!familyIds.includes(familyId)) {
      issues.push(
        issue(
          'error',
          'required-family-missing',
          `Matrix must include family ${familyId}.`,
          { familyId },
        ),
      );
    }
  }

  for (const area of requiredCapabilityAreas) {
    if (!matrix.requiredCapabilityAreas.includes(area)) {
      issues.push(
        issue(
          'error',
          'required-capability-area-not-declared',
          `Matrix requiredCapabilityAreas must include ${area}.`,
          { area },
        ),
      );
    }
  }

  for (const family of matrix.families) {
    validateFamily(family, rowRefs, issues);
  }

  return matrix.families.map((family) => ({
    familyId: family.familyId,
    runtimeCombatClaim: family.runtimeCombatClaim,
    unitFamilies: family.unitFamilies.length,
    requiredOutOfScopeRefs: family.requiredOutOfScopeRefs.length,
    capabilityAreas: family.capabilityMatrix.map((entry) => entry.area),
  }));
}

function validateFamily(
  family: IFamilyMatrix,
  rowRefs: ReadonlySet<string>,
  issues: IMatrixIssue[],
): void {
  if (!family.label || family.unitFamilies.length === 0) {
    issues.push(
      issue(
        'error',
        'family-label-or-units-missing',
        `${family.familyId} must have a label and at least one unit family.`,
        { familyId: family.familyId },
      ),
    );
  }

  if (family.runtimeCombatClaim !== 'out-of-scope') {
    issues.push(
      issue(
        'error',
        'family-runtime-claim-too-broad',
        `${family.familyId} runtimeCombatClaim must remain out-of-scope until its family matrix is runtime-backed.`,
        { familyId: family.familyId },
      ),
    );
  }

  if (!family.currentBoundary.includes('separate')) {
    issues.push(
      issue(
        'error',
        'family-boundary-too-weak',
        `${family.familyId} currentBoundary must state that this lane is separate from BattleMech runtime coverage.`,
        { familyId: family.familyId },
      ),
    );
  }

  if (family.requiredOutOfScopeRefs.length === 0) {
    issues.push(
      issue(
        'error',
        'family-required-refs-empty',
        `${family.familyId} must cite at least one source out-of-scope ref.`,
        { familyId: family.familyId },
      ),
    );
  }

  for (const ref of family.requiredOutOfScopeRefs) {
    if (!rowRefs.has(ref)) {
      issues.push(
        issue(
          'error',
          'family-required-ref-missing',
          `${family.familyId} requires ${ref}, but the combat out-of-scope inventory does not contain it.`,
          { familyId: family.familyId, ref },
        ),
      );
    }
  }

  const areas = family.capabilityMatrix.map((entry) => entry.area);
  for (const area of requiredCapabilityAreas) {
    if (!areas.includes(area)) {
      issues.push(
        issue(
          'error',
          'family-capability-area-missing',
          `${family.familyId} must include capability area ${area}.`,
          { familyId: family.familyId, area },
        ),
      );
    }
  }

  for (const entry of family.capabilityMatrix) {
    if (!allowedCapabilityStatuses.has(entry.status)) {
      issues.push(
        issue(
          'error',
          'family-capability-status-invalid',
          `${family.familyId}:${entry.area} has unsupported status ${entry.status}.`,
          { familyId: family.familyId, area: entry.area, status: entry.status },
        ),
      );
    }

    if (!entry.releaseClaim || entry.releaseClaim.length < 20) {
      issues.push(
        issue(
          'error',
          'family-capability-release-claim-weak',
          `${family.familyId}:${entry.area} must include a useful release claim boundary.`,
          { familyId: family.familyId, area: entry.area },
        ),
      );
    }
  }
}

function validateRowCoverageBuckets(
  matrix: INonBattleMechScopeMatrix,
  rows: readonly ICombatValidationOutOfScopeRow[],
  issues: IMatrixIssue[],
) {
  const bucketIds = matrix.rowCoverageBuckets.map((bucket) => bucket.bucketId);
  for (const bucketId of collectDuplicates(bucketIds)) {
    issues.push(
      issue(
        'error',
        'coverage-bucket-duplicate',
        `Coverage bucket ${bucketId} is duplicated.`,
        { bucketId },
      ),
    );
  }

  for (const bucket of matrix.rowCoverageBuckets) {
    if (!bucket.label || bucket.rowPatterns.length === 0) {
      issues.push(
        issue(
          'error',
          'coverage-bucket-incomplete',
          `Coverage bucket ${bucket.bucketId} must have a label and row patterns.`,
          { bucketId: bucket.bucketId },
        ),
      );
    }
  }

  const uncoveredRows = rows.filter(
    (row) =>
      !matrix.rowCoverageBuckets.some((bucket) =>
        bucket.rowPatterns.some((pattern) =>
          rowMatchesPattern(row.ref, pattern),
        ),
      ),
  );

  for (const row of uncoveredRows) {
    issues.push(
      issue(
        'error',
        'out-of-scope-row-uncovered',
        `Out-of-scope row ${row.ref} is not covered by any matrix bucket.`,
        { ref: row.ref },
      ),
    );
  }

  return {
    bucketCount: matrix.rowCoverageBuckets.length,
    uncoveredRows: uncoveredRows.map((row) => row.ref),
    coveredRowCount: rows.length - uncoveredRows.length,
    rowPatterns: matrix.rowCoverageBuckets.flatMap((bucket) =>
      bucket.rowPatterns.map((pattern) => `${bucket.bucketId}:${pattern}`),
    ),
  };
}

function buildManifest() {
  const issues: IMatrixIssue[] = [];
  const matrix = readJson<INonBattleMechScopeMatrix>(matrixPath);
  const rows = getCombatValidationOutOfScopeRows();
  const rowRefs = new Set(rows.map((row) => row.ref));
  const leafRows = filterCombatValidationGapRowsByScope(rows, 'leaf');
  const aggregateRows = filterCombatValidationGapRowsByScope(rows, 'aggregate');

  validateTopLevelMatrix(matrix, issues);
  validateExpectedSummary(matrix, rows, issues);
  const familySummaries = validateFamilyMatrices(matrix, rowRefs, issues);
  const rowCoverage = validateRowCoverageBuckets(matrix, rows, issues);

  const errors = issues.filter((item) => item.severity === 'error');
  const warnings = issues.filter((item) => item.severity === 'warning');

  return {
    version: 1,
    status: errors.length > 0 ? 'fail' : 'pass',
    matrixPath: path.relative(repoRoot, matrixPath).replaceAll('\\', '/'),
    sourceCommand: matrix.sourceCommand,
    releaseClaim: matrix.releaseClaim,
    expectedOutOfScopeSummary: matrix.expectedOutOfScopeSummary,
    actualOutOfScopeSummary: summarizeRows(rows),
    rows: {
      total: rows.length,
      leaf: leafRows.length,
      aggregate: aggregateRows.length,
    },
    familyCount: matrix.families.length,
    requiredFamilyIds: uniqueStrings([...requiredFamilyIds]),
    familySummaries,
    rowCoverage,
    errors,
    warnings,
    issues,
  };
}

function printIssues(issues: readonly IMatrixIssue[]): void {
  for (const item of issues) {
    const prefix = item.severity === 'error' ? 'ERROR' : 'WARN';
    console.log(`${prefix}: ${item.message}`);
  }
}

const options = parseArgs(process.argv.slice(2));
const manifest = buildManifest();

if (options.json) {
  console.log(JSON.stringify(manifest, null, 2));
} else {
  printIssues(manifest.issues);
  console.log(
    `[qc:nonbattlemech:scope] families=${manifest.familyCount}/${manifest.requiredFamilyIds.length} buckets=${manifest.rowCoverage.bucketCount} rows=${manifest.rows.total} covered=${manifest.rowCoverage.coveredRowCount} errors=${manifest.errors.length} warnings=${manifest.warnings.length}`,
  );
}

process.exit(manifest.errors.length > 0 ? 1 : 0);
