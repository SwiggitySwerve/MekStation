/** Source-handler validity only; numerical construction omissions remain explicit. */
import { z } from 'zod';

import {
  buildDeltaReport,
  FAMILIES,
  JavaReference,
  type IComputedRow,
} from './unit-bv-parity';

const Reference = JavaReference.extend({
  construction: z
    .object({
      valid: z.boolean().optional(),
      weightTerms: z.record(z.string(), z.number().finite()).optional(),
      weightTermsStatus: z
        .object({
          status: z.enum(['unsupported', 'failed']),
          reason: z.string(),
        })
        .optional(),
    })
    .passthrough()
    .optional(),
});

interface IValidityFamily {
  rows: number;
  joined: number;
  matched: number;
  different: number;
  missingReference: number;
  missingLocal: number;
  failedLocal: number;
  unjoined: number;
  nativeWeightMaps: number;
  nativeUnsupportedWeights: number;
  weightCompared: number;
  quantitiesCompared: number;
  settingsCompared: number;
}
type IValidityRow = Pick<
  ReturnType<typeof buildDeltaReport>['rows'][number],
  'path' | 'sha256' | 'sourceSha256' | 'family' | 'joined' | 'reason'
> & {
  status: string;
  reference: z.infer<typeof Reference>['construction'] | null;
  local: IComputedRow['constructionValidity'] | null;
};
interface IValidityReport {
  scope: 'source-handler-validity-only';
  ok: boolean;
  omittedComparisons: string[];
  errors: string[];
  byFamily: Record<string, IValidityFamily>;
  rows: IValidityRow[];
}

export function buildValidityReport(
  computed: readonly IComputedRow[],
  rawReferences: readonly unknown[],
  families: readonly string[] = FAMILIES,
): IValidityReport {
  const references = rawReferences.map((value) => Reference.parse(value));
  const coverage = buildDeltaReport(computed, references, families);
  const ours = new Map(computed.map((row) => [row.path, row]));
  const refs = new Map(references.map((row) => [row.path, row]));
  const errors = coverage.errors.filter((error) =>
    /^(duplicate|unexpected-family|missing-family|coverage):/.test(error),
  );
  const rows: IValidityRow[] = coverage.rows.map((row) => {
    const reference = refs.get(row.path)?.construction;
    const local = ours.get(row.path)?.constructionValidity;
    const status = !row.joined
      ? 'unjoined'
      : reference?.valid === undefined
        ? 'missing-reference'
        : !local
          ? 'missing-local'
          : 'failure' in local
            ? 'failed-local'
            : local.isValid === reference.valid
              ? 'matched'
              : 'different';
    if (status !== 'matched') errors.push(`${status}: ${row.path}`);
    return {
      path: row.path,
      sha256: row.sha256,
      sourceSha256: row.sourceSha256,
      family: row.family,
      joined: row.joined,
      status,
      reference: reference ?? null,
      local: local ?? null,
      reason: ours.get(row.path)?.reason ?? null,
    };
  });
  const byFamily = Object.fromEntries(
    [...families].sort().map((family) => {
      const group = rows.filter((row) => row.family === family);
      const count = (status: string) =>
        group.filter((row) => row.status === status).length;
      return [
        family,
        {
          rows: coverage.byFamily[family].rows,
          joined: group.filter((row) => row.joined).length,
          matched: count('matched'),
          different: count('different'),
          missingReference: count('missing-reference'),
          missingLocal: count('missing-local'),
          failedLocal: count('failed-local'),
          unjoined: count('unjoined'),
          nativeWeightMaps: group.filter(
            (row) => row.reference?.weightTerms !== undefined,
          ).length,
          nativeUnsupportedWeights: group.filter(
            (row) => row.reference?.weightTermsStatus?.status === 'unsupported',
          ).length,
          weightCompared: 0,
          quantitiesCompared: 0,
          settingsCompared: 0,
        },
      ] as const;
    }),
  );
  return {
    scope: 'source-handler-validity-only',
    ok: errors.length === 0,
    omittedComparisons: [
      'weightTerms',
      'weightTotal',
      'verifierQuantities',
      'settings',
    ],
    errors: errors.sort(),
    byFamily,
    rows,
  };
}
