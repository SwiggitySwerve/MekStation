import {
  filterCombatValidationGapRowsByScope,
  getCombatValidationOutOfScopeRows,
  getCombatValidationUnresolvedRows,
  isCombatValidationAggregateGapRow,
  type CombatValidationGapInventoryRow,
  type CombatValidationGapScope,
} from '../src/simulation/runner/CombatValidationGapInventory';

type GapOutputFormat = 'json' | 'markdown' | 'refs' | 'summary';

const KNOWN_FLAGS = new Set([
  '--format',
  '--level',
  '--section',
  '--scope',
  '--expect-total',
  '--expect-level',
  '--expect-scope',
  '--expect-section',
  '--expect-ref',
  '--expect-no-ref',
]);

interface IGapInventoryOptions {
  readonly format: GapOutputFormat;
  readonly level?: string;
  readonly section?: string;
  readonly scope: CombatValidationGapScope;
  readonly expectedTotal?: number;
  readonly expectedLevels: Readonly<Record<string, number>>;
  readonly expectedScopes: Readonly<Record<string, number>>;
  readonly expectedSections: Readonly<Record<string, number>>;
  readonly expectedRefs: readonly string[];
  readonly expectedAbsentRefs: readonly string[];
}

function parseOptions(argv: readonly string[]): IGapInventoryOptions {
  const options: {
    format: GapOutputFormat;
    level?: string;
    section?: string;
    scope: CombatValidationGapScope;
    expectedTotal?: number;
    expectedLevels: Record<string, number>;
    expectedScopes: Record<string, number>;
    expectedSections: Record<string, number>;
    expectedRefs: string[];
    expectedAbsentRefs: string[];
  } = {
    format: 'json',
    scope: 'all',
    expectedLevels: {},
    expectedScopes: {},
    expectedSections: {},
    expectedRefs: [],
    expectedAbsentRefs: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const { flag, value, consumedNextArg } = parseFlagValue(argv, index);
    if (!KNOWN_FLAGS.has(flag)) {
      throw new Error(`Unknown flag "${flag}"`);
    }

    if (flag === '--format') {
      if (!isGapOutputFormat(value)) {
        throw new Error(
          `${flag} requires one of json, markdown, refs, or summary`,
        );
      }
      options.format = value;
    } else if (flag === '--level') {
      if (!value) throw new Error(`${flag} requires a value`);
      options.level = value;
    } else if (flag === '--section') {
      if (!value) throw new Error(`${flag} requires a value`);
      options.section = value;
    } else if (flag === '--scope') {
      if (!isGapScope(value)) {
        throw new Error(`${flag} requires one of all, leaf, or aggregate`);
      }
      options.scope = value;
    } else if (flag === '--expect-total') {
      if (!value) throw new Error(`${flag} requires a value`);
      options.expectedTotal = parseExpectedCount(value, flag);
    } else if (flag === '--expect-level') {
      if (!value) throw new Error(`${flag} requires a value`);
      parseExpectedBucket(value, options.expectedLevels, flag);
    } else if (flag === '--expect-scope') {
      if (!value) throw new Error(`${flag} requires a value`);
      parseExpectedBucket(value, options.expectedScopes, flag);
    } else if (flag === '--expect-section') {
      if (!value) throw new Error(`${flag} requires a value`);
      parseExpectedBucket(value, options.expectedSections, flag);
    } else if (flag === '--expect-ref') {
      if (!value) throw new Error(`${flag} requires a value`);
      options.expectedRefs.push(value);
    } else if (flag === '--expect-no-ref') {
      if (!value) throw new Error(`${flag} requires a value`);
      options.expectedAbsentRefs.push(value);
    }

    if (consumedNextArg) index += 1;
  }

  return options;
}

function parseFlagValue(
  argv: readonly string[],
  index: number,
): {
  readonly flag: string;
  readonly value?: string;
  readonly consumedNextArg: boolean;
} {
  const arg = argv[index];
  const separatorIndex = arg.indexOf('=');

  if (separatorIndex >= 0) {
    return {
      flag: arg.slice(0, separatorIndex),
      value: arg.slice(separatorIndex + 1),
      consumedNextArg: false,
    };
  }

  const nextArg = argv[index + 1];
  if (nextArg && !nextArg.startsWith('--')) {
    return { flag: arg, value: nextArg, consumedNextArg: true };
  }

  return { flag: arg, consumedNextArg: false };
}

function isGapOutputFormat(
  value: string | undefined,
): value is GapOutputFormat {
  return (
    value === 'json' ||
    value === 'markdown' ||
    value === 'refs' ||
    value === 'summary'
  );
}

function isGapScope(
  value: string | undefined,
): value is CombatValidationGapScope {
  return value === 'all' || value === 'leaf' || value === 'aggregate';
}

function countBy(rows: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row] = (counts[row] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort());
}

function parseExpectedCount(value: string, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed.toString() !== value) {
    throw new Error(`${flag} requires a non-negative integer, got "${value}"`);
  }

  return parsed;
}

function parseExpectedBucket(
  value: string,
  target: Record<string, number>,
  flag: string,
): void {
  const separatorIndex = value.lastIndexOf(':');
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    throw new Error(`${flag} requires name:count, got "${value}"`);
  }

  const name = value.slice(0, separatorIndex);
  const count = parseExpectedCount(value.slice(separatorIndex + 1), flag);
  target[name] = count;
}

function gapScopeForSummary(row: {
  readonly sectionId: string;
  readonly mapId: string;
}): 'aggregate' | 'leaf' {
  return isCombatValidationAggregateGapRow(row) ? 'aggregate' : 'leaf';
}

function summarizeRows(rows: readonly CombatValidationGapInventoryRow[]) {
  return {
    total: rows.length,
    byLevel: countBy(rows.map((row) => row.level)),
    bySection: countBy(rows.map((row) => row.sectionId)),
    byScope: countBy(rows.map(gapScopeForSummary)),
  };
}

function formatMarkdownRows(
  rows: readonly CombatValidationGapInventoryRow[],
): string {
  const lines = ['# BattleMech Combat Validation Gap Inventory', ''];
  const summary = summarizeRows(rows);

  lines.push(`Total unresolved rows: ${summary.total}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Bucket | Count |');
  lines.push('| --- | ---: |');
  for (const [level, count] of Object.entries(summary.byLevel)) {
    lines.push(`| level:${level} | ${count} |`);
  }
  for (const [scope, count] of Object.entries(summary.byScope)) {
    lines.push(`| scope:${scope} | ${count} |`);
  }
  for (const [section, count] of Object.entries(summary.bySection)) {
    lines.push(`| section:${section} | ${count} |`);
  }

  const rowsBySection = new Map<string, CombatValidationGapInventoryRow[]>();
  for (const row of rows) {
    const sectionRows = rowsBySection.get(row.sectionId) ?? [];
    sectionRows.push(row);
    rowsBySection.set(row.sectionId, sectionRows);
  }

  for (const [sectionId, sectionRows] of rowsBySection) {
    lines.push('');
    lines.push(`## ${sectionId}`);
    lines.push('');

    for (const row of sectionRows) {
      const scope = gapScopeForSummary(row);
      lines.push(`- \`${row.ref}\` (${row.level}, ${scope})`);
      lines.push(`  - Evidence: ${row.evidence}`);
      lines.push(`  - Gap: ${row.gap}`);
    }
  }

  return lines.join('\n');
}

function assertExpectedSummary(
  summary: ReturnType<typeof summarizeRows>,
  options: IGapInventoryOptions,
): void {
  const failures: string[] = [];

  if (
    options.expectedTotal !== undefined &&
    summary.total !== options.expectedTotal
  ) {
    failures.push(
      `total expected ${options.expectedTotal}, received ${summary.total}`,
    );
  }

  collectExpectedBucketFailures(
    'level',
    summary.byLevel,
    options.expectedLevels,
    failures,
  );
  collectExpectedBucketFailures(
    'scope',
    summary.byScope,
    options.expectedScopes,
    failures,
  );
  collectExpectedBucketFailures(
    'section',
    summary.bySection,
    options.expectedSections,
    failures,
  );

  if (failures.length > 0) {
    console.error(
      [
        '[combat-validation] Unresolved gap inventory baseline mismatch:',
        ...failures.map((failure) => `- ${failure}`),
      ].join('\n'),
    );
    process.exitCode = 1;
  }
}

function assertExpectedRefs(
  rows: readonly CombatValidationGapInventoryRow[],
  options: IGapInventoryOptions,
): void {
  const refs = new Set(rows.map((row) => row.ref));
  const failures: string[] = [];

  for (const expectedRef of options.expectedRefs) {
    if (!refs.has(expectedRef)) {
      failures.push(`missing expected ref "${expectedRef}"`);
    }
  }

  for (const absentRef of options.expectedAbsentRefs) {
    if (refs.has(absentRef)) {
      failures.push(`unexpected ref "${absentRef}"`);
    }
  }

  if (failures.length > 0) {
    console.error(
      [
        '[combat-validation] Gap inventory ref expectation mismatch:',
        ...failures.map((failure) => `- ${failure}`),
      ].join('\n'),
    );
    process.exitCode = 1;
  }
}

function collectExpectedBucketFailures(
  label: string,
  actual: Readonly<Record<string, number>>,
  expected: Readonly<Record<string, number>>,
  failures: string[],
): void {
  for (const [name, expectedCount] of Object.entries(expected)) {
    const actualCount = actual[name] ?? 0;
    if (actualCount !== expectedCount) {
      failures.push(
        `${label} "${name}" expected ${expectedCount}, received ${actualCount}`,
      );
    }
  }
}

const options = parseOptions(process.argv.slice(2));
const inventoryRows: readonly CombatValidationGapInventoryRow[] =
  options.level === 'out-of-scope'
    ? getCombatValidationOutOfScopeRows()
    : getCombatValidationUnresolvedRows();
const rows = filterCombatValidationGapRowsByScope(
  inventoryRows,
  options.scope,
).filter(
  (row) =>
    (options.level === undefined || row.level === options.level) &&
    (options.section === undefined || row.sectionId === options.section),
);
const summary = summarizeRows(rows);

assertExpectedSummary(summary, options);
assertExpectedRefs(rows, options);

if (options.format === 'refs') {
  console.log(rows.map((row) => row.ref).join('\n'));
} else if (options.format === 'markdown') {
  console.log(formatMarkdownRows(rows));
} else if (options.format === 'summary') {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(
    JSON.stringify(
      {
        total: rows.length,
        rows,
      },
      null,
      2,
    ),
  );
}
