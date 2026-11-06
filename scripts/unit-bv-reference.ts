/** Reference evidence is independent of converted-input receipts and BV parity. */
import { z } from 'zod';

import { sourceKey } from './unit-bv-parity';

export const ReferenceTrustMode = z
  .enum(['report-only', 'blocking'])
  .default('report-only');
export type IReferenceTrustMode = z.infer<typeof ReferenceTrustMode>;

const Setting = z.union([z.string(), z.number().finite(), z.boolean()]);
const Settings = z
  .record(z.string().min(1), Setting)
  .refine(
    (values) => Object.keys(values).length > 0,
    'Settings evidence is empty',
  );
const commit = z.string().regex(/^[a-f0-9]{40}$/);
const Runtime = z
  .object({
    megamekCommit: commit,
    megameklabCommit: commit,
    mmDataCommit: commit,
    javaVersion: z.string().min(1),
    dependencyManifestSha256: sourceKey.sha256,
    compiledRuntimeManifestSha256: sourceKey.sha256,
    exporterSha256: sourceKey.sha256,
    verifierConfigSha256: sourceKey.sha256,
  })
  .catchall(z.string().min(1));
const Configuration = z.object({
  version: z.literal(1),
  runtime: Runtime,
  crew: Settings,
  network: Settings,
  bvOverrides: Settings,
});
const Policy = Configuration.extend({
  battleValueMode: z.string().min(1),
  verifierSettings: z.record(sourceKey.path, Settings),
});
const Receipt = Configuration.extend({ referenceSha256: sourceKey.sha256 });
const ReferenceSettings = z.object({
  ...sourceKey,
  battleValue: z.object({ mode: z.string().min(1) }),
  construction: z.object({ settings: Settings }),
});

export interface IReferenceMismatch {
  field: string;
  expected: unknown;
  actual: unknown;
  reason: string;
}
export interface IReferenceTrustReport {
  ok: boolean;
  referenceSha256: string;
  mismatches: IReferenceMismatch[];
}

function atPath(value: unknown, keys: readonly PropertyKey[]): unknown {
  for (const key of keys) {
    if (typeof value !== 'object' || value === null || !(key in value))
      return null;
    const next: unknown = Reflect.get(value, key);
    value = next;
  }
  return value;
}

export function buildReferenceTrustReport(
  references: readonly unknown[],
  expected: unknown,
  actual: unknown,
  referenceSha256: string,
): IReferenceTrustReport {
  const mismatches: IReferenceMismatch[] = [];
  const policy = Policy.safeParse(expected);
  const receipt = Receipt.safeParse(actual);
  for (const [name, result, input] of [
    ['expectedReference', policy, expected],
    ['referenceProvenance', receipt, actual],
  ] as const) {
    if (!result.success)
      for (const issue of result.error.issues)
        mismatches.push({
          field: [name, ...issue.path].join('.'),
          expected: 'valid evidence',
          actual: atPath(input, issue.path),
          reason: issue.message,
        });
  }
  if (!policy.success || !receipt.success)
    return { ok: false, referenceSha256, mismatches };

  const compare = (field: string, want: unknown, got: unknown): void => {
    if (want !== got)
      mismatches.push({
        field,
        expected: want ?? null,
        actual: got ?? null,
        reason:
          want === undefined
            ? 'missingExpected'
            : got === undefined
              ? 'missingActual'
              : 'different',
      });
  };
  const compareFields = (
    field: string,
    want: Record<string, unknown>,
    got: Record<string, unknown>,
  ): void => {
    for (const key of [
      ...new Set([...Object.keys(want), ...Object.keys(got)]),
    ].sort())
      compare(`${field}.${key}`, want[key], got[key]);
  };
  compare('referenceSha256', receipt.data.referenceSha256, referenceSha256);
  for (const field of ['runtime', 'crew', 'network', 'bvOverrides'] as const)
    compareFields(field, policy.data[field], receipt.data[field]);

  const paths = new Set<string>();
  for (const [index, raw] of references.entries()) {
    const parsed = ReferenceSettings.safeParse(raw);
    const identity = z.object({ path: z.string() }).safeParse(raw);
    const label = `reference[${identity.success ? identity.data.path : index}]`;
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        mismatches.push({
          field: [label, ...issue.path].join('.'),
          expected: 'recorded reference settings',
          actual: atPath(raw, issue.path),
          reason: issue.message,
        });
      continue;
    }
    const row = parsed.data;
    paths.add(row.path);
    compare(
      `${label}.battleValue.mode`,
      policy.data.battleValueMode,
      row.battleValue.mode,
    );
    const settings = policy.data.verifierSettings[row.path];
    if (settings === undefined)
      mismatches.push({
        field: `${label}.construction.settings`,
        expected: null,
        actual: row.construction.settings,
        reason: 'missingExpected',
      });
    else
      compareFields(
        `${label}.construction.settings`,
        settings,
        row.construction.settings,
      );
  }
  for (const path of Object.keys(policy.data.verifierSettings).sort())
    if (!paths.has(path))
      mismatches.push({
        field: `reference[${path}]`,
        expected: 'source with recorded settings',
        actual: null,
        reason: 'missingActual',
      });
  if (references.length === 0)
    mismatches.push({
      field: 'reference',
      expected: 'nonempty reference',
      actual: [],
      reason: 'missingActual',
    });
  return { ok: mismatches.length === 0, referenceSha256, mismatches };
}
