/** One strict pinned-source BV comparator. See unit-bv-parity.md for the contract. */
import { z } from 'zod';

import stages from './megameklab-conversion/java-reference/bv-stages.json';

export const FAMILIES = [
  'battlemechs',
  'vehicles',
  'aerospace',
  'capital',
  'battlearmor',
  'infantry',
  'protomeks',
] as const;
export const sourceKey = {
  path: z.string().regex(/^[^\\]+\.(blk|mtf)$/),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
};
export const JavaReference = z.object({
  ...sourceKey,
  concreteFamily: z.string(),
  battleValue: z.object({
    terms: z.record(z.string(), z.number().finite()).optional(),
    total: z.number(),
    aggregates: z.object({
      defensiveValue: z.number(),
      offensiveValue: z.number(),
    }),
  }),
});
export type IJavaReferenceRow = z.infer<typeof JavaReference>;
export interface IFigure {
  terms?: Record<string, number | undefined>;
  total?: number;
  defensive: number;
  offensive?: number;
  calculationScope?: 'defensive-only';
}
export interface IComputedRow {
  path: string;
  sha256: string;
  figure?: IFigure;
  reason?: string;
  runtimeTotal?: number;
  handlerTotal?: number;
}
interface IAggregateDelta {
  java: number;
  ours: number;
  delta: number;
  withinTolerance: boolean;
}
interface IFigureComparison {
  status: string;
  delta: number | null;
  deltaPct: number | null;
  defensive: IAggregateDelta | null;
  offensive: IAggregateDelta | null;
}
interface IDeltaRow {
  firstTermDifference: ReturnType<typeof firstTermDifference>;
  path: string;
  sha256: string | undefined;
  sourceSha256: string | null;
  family: string;
  joined: boolean;
  status: string;
  reason: string | null;
  java: IJavaReferenceRow['battleValue'] | null;
  ours: IFigure | null;
  runtimeTotal: number | null;
  handlerTotal: number | null;
  comparison: IFigureComparison | null;
}
interface IGroupSummary {
  readonly termMatched?: number;
  readonly firstTermDifferences?: Record<string, number>;
  readonly rows: number;
  readonly joined: number;
  readonly exact: number;
  readonly within1Pct: number;
  readonly farther: number;
  readonly notComputable: number;
  readonly notComplete: number;
  readonly invalid: number;
  readonly runtimeExact: number;
  readonly handlerExact: number;
}
interface IDeltaReport {
  perTerm: boolean;
  ok: boolean;
  aggregateRelativeTolerance: number;
  exclusions: never[];
  errors: string[];
  byFamily: Record<string, IGroupSummary>;
  rows: IDeltaRow[];
}
export const AGGREGATE_REL_TOLERANCE = 1e-9;
function firstTermDifference(java?: IFigure['terms'], ours?: IFigure['terms']) {
  const keys = [
    ...new Set([...Object.keys(stages), ...Object.keys(java ?? {}).sort()]),
  ];
  for (const term of keys) {
    const a = java?.[term],
      b = ours?.[term];
    if (
      a === undefined ||
      b === undefined ||
      !Number.isFinite(a) ||
      !Number.isFinite(b) ||
      !aggregateDelta(a, b).withinTolerance
    )
      return { term, java: a ?? null, ours: b ?? null };
  }
  return null;
}
export function aggregateDelta(java: number, ours: number): IAggregateDelta {
  const delta = ours - java;
  return {
    java,
    ours,
    delta,
    withinTolerance:
      Math.abs(delta) <=
      AGGREGATE_REL_TOLERANCE * Math.max(1, Math.abs(java), Math.abs(ours)),
  };
}
const positive = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value) && value > 0;
// A zero aggregate is real (unarmed designs); a mismatch with Java is caught by the tolerance.
const aggregate = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value) && value >= 0;
export function compareFigures(
  java: IFigure,
  ours: IFigure,
): IFigureComparison {
  const partial = ours.calculationScope === 'defensive-only';
  const javaTotal = java.total ?? NaN,
    ourTotal = ours.total ?? NaN;
  const valid =
    aggregate(java.defensive) &&
    aggregate(ours.defensive) &&
    (partial ||
      (positive(javaTotal) &&
        Number.isInteger(javaTotal) &&
        aggregate(java.offensive) &&
        positive(ourTotal) &&
        Number.isInteger(ourTotal) &&
        aggregate(ours.offensive)));
  const delta = valid && !partial ? ourTotal - javaTotal : null;
  const deltaPct = delta === null ? null : (delta / javaTotal) * 100;
  return {
    status: !valid
      ? 'invalid'
      : partial
        ? 'not-complete'
        : delta === 0
          ? 'exact'
          : Math.abs(delta ?? NaN) * 100 <= javaTotal
            ? 'within1Pct'
            : 'farther',
    delta,
    deltaPct,
    defensive: valid ? aggregateDelta(java.defensive, ours.defensive) : null,
    offensive:
      valid && !partial
        ? aggregateDelta(java.offensive ?? NaN, ours.offensive ?? NaN)
        : null,
  };
}
export function familyOf(
  row: Pick<IJavaReferenceRow, 'path' | 'concreteFamily'>,
): string {
  const folder = row.path.split('/')[0];
  if (folder === 'meks') return 'battlemechs';
  if (['dropships', 'jumpships', 'warship', 'spacestation'].includes(folder))
    return 'capital';
  if (
    ['fighters', 'convfighter', 'smallcraft'].includes(folder) ||
    row.concreteFamily === 'FixedWingSupport'
  )
    return 'aerospace';
  return folder;
}
export function buildDeltaReport(
  converted: readonly IComputedRow[],
  javaRows: readonly IJavaReferenceRow[],
  expectedFamilies: readonly string[] = FAMILIES,
  perTerm = false,
): IDeltaReport {
  const errors: string[] = [];
  const index = <T extends { path: string }>(list: readonly T[]) => {
    const map = new Map<string, T>();
    for (const row of list) {
      if (map.has(row.path)) errors.push(`duplicate: ${row.path}`);
      map.set(row.path, row);
    }
    return map;
  };
  const ours = index(converted),
    refs = index(javaRows);
  const rows = [...new Set([...ours.keys(), ...refs.keys()])]
    .sort()
    .map((path) => {
      const input = ours.get(path),
        java = refs.get(path);
      const family = java
        ? familyOf(java)
        : familyOf({ path, concreteFamily: '' });
      const joined = !!input && !!java && input.sha256 === java.sha256;
      const termDifference =
        perTerm && joined
          ? firstTermDifference(java?.battleValue.terms, input?.figure?.terms)
          : null;
      if (termDifference)
        errors.push(`term-mismatch: ${path}: ${termDifference.term}`);
      const comparison =
        java && input?.figure && joined
          ? compareFigures(
              {
                total: java.battleValue.total,
                defensive: java.battleValue.aggregates.defensiveValue,
                offensive: java.battleValue.aggregates.offensiveValue,
              },
              input.figure,
            )
          : null;
      const status = !java
        ? 'noJavaRow'
        : !input
          ? 'unjoined-oracle'
          : !joined
            ? 'hash-mismatch'
            : (comparison?.status ?? 'not-computable');
      if (!expectedFamilies.includes(family))
        errors.push(`unexpected-family: ${path}`);
      if (
        status !== 'exact' ||
        !comparison?.defensive?.withinTolerance ||
        !comparison?.offensive?.withinTolerance
      )
        errors.push(
          `${status === 'exact' ? 'aggregate-mismatch' : status}: ${path}`,
        );
      return {
        firstTermDifference: termDifference,
        path,
        sha256: java?.sha256 ?? input?.sha256,
        sourceSha256: input?.sha256 ?? null,
        family,
        joined,
        status,
        reason: input?.reason ?? null,
        java: java?.battleValue ?? null,
        ours: input?.figure ?? null,
        runtimeTotal: input?.runtimeTotal ?? null,
        handlerTotal: input?.handlerTotal ?? null,
        comparison,
      };
    });
  const byFamily = Object.fromEntries(
    [...expectedFamilies].sort().map((family) => {
      const group = rows.filter((row) => row.family === family);
      const oracleRows = javaRows.filter(
        (row) => familyOf(row) === family,
      ).length;
      const joined = group.filter((row) => row.joined).length;
      const count = (status: string) =>
        group.filter((row) => row.status === status).length;
      const auxiliaryExact = (key: 'runtimeTotal' | 'handlerTotal') =>
        group.filter(
          (row) =>
            positive(row[key] ?? undefined) && row[key] === row.java?.total,
        ).length;
      if (!oracleRows) errors.push(`missing-family: ${family}`);
      if (joined < oracleRows)
        errors.push(`coverage: ${family} ${joined}/${oracleRows}`);
      return [
        family,
        {
          rows: oracleRows,
          joined,
          exact: count('exact'),
          within1Pct: count('exact') + count('within1Pct'),
          farther: count('farther'),
          notComputable: count('not-computable'),
          notComplete: count('not-complete'),
          invalid: count('invalid'),
          runtimeExact: auxiliaryExact('runtimeTotal'),
          handlerExact: auxiliaryExact('handlerTotal'),
          ...(perTerm
            ? {
                termMatched: group.filter(
                  (row) => row.joined && row.ours && !row.firstTermDifference,
                ).length,
                firstTermDifferences: group.reduce<Record<string, number>>(
                  (counts, row) => {
                    const term = row.firstTermDifference?.term;
                    if (term) counts[term] = (counts[term] ?? 0) + 1;
                    return counts;
                  },
                  {},
                ),
              }
            : {}),
        },
      ] as const;
    }),
  );
  return {
    ok: errors.length === 0,
    perTerm,
    aggregateRelativeTolerance: AGGREGATE_REL_TOLERANCE,
    exclusions: [],
    errors: errors.sort(),
    byFamily,
    rows,
  };
}
