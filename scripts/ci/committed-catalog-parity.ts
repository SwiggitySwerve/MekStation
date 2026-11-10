/** Object parity is independent of source identity and numerical BV parity. */
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';

import { sourceKey } from '../unit-bv-parity';
import { CatalogUnit, type ICatalogEntry } from './committed-catalog-inputs';
import { compareText as compare } from './parity-scoreboard-io.cjs';

interface IJoin {
  family: string;
  catalogFile: string;
  path: string;
  sha256: string;
}
interface IValue {
  present: boolean;
  value?: unknown;
}
interface IField {
  path: string;
  committed: IValue;
  regenerated: IValue;
}
interface ICounts {
  rows: number;
  equal: number;
  drifted: number;
  unavailable: number;
}
interface ILedgerRow extends IJoin {
  fields: IField[];
}
const Row = z.object({
  ...sourceKey,
  unit: z.unknown(),
  reason: z.string().optional(),
});

// These are Root's known classes at this measured commit, not predicates that
// automatically classify every future change to the same fields.
const knownClasses = [
  ['mech rules level', 'rulesLevel'],
  ['mech Omni fields', 'isOmni / baseChassisHeatSinks'],
  ['mech Clan name', 'clanName'],
  ['mech slot-only equipment', 'equipment'],
  ['Ares configuration', 'configuration'],
  ['Tripod center-leg keys', 'armor.allocation.CL / CENTER_LEG; criticalSlots'],
  ['Patchwork armor', 'armor.allocation'],
  ['FrankenMek donor tonnage', 'structure.locationTonnage / typeByLocation'],
  ['aerospace source tech type', 'sourceTechType'],
].map(([name, fields]) => ({
  name,
  fields,
  owner: 'C2',
  direction: 'catalog-behind',
  measuredCommit: '3e96c2283549ec025290382283b15b22c52c37bc',
}));

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function differences(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  prefix = '',
): IField[] {
  const result: IField[] = [];
  for (const field of [
    ...new Set([...Object.keys(left), ...Object.keys(right)]),
  ].sort()) {
    const a = left[field],
      b = right[field],
      name = prefix ? `${prefix}.${field}` : field;
    if (
      isDeepStrictEqual(a, b) &&
      Object.hasOwn(left, field) === Object.hasOwn(right, field)
    )
      continue;
    if (record(a) && record(b)) result.push(...differences(a, b, name));
    else
      result.push({
        path: name,
        committed: Object.hasOwn(left, field)
          ? { present: true, value: a }
          : { present: false },
        regenerated: Object.hasOwn(right, field)
          ? { present: true, value: b }
          : { present: false },
      });
  }
  return result;
}

export interface IObjectParity {
  status: 'not-measured' | 'partial' | 'measured';
  byFamily: Record<string, ICounts>;
  ledger: ILedgerRow[];
  knownClasses: typeof knownClasses;
  errors: string[];
}

export function buildObjectParity(
  catalog: readonly ICatalogEntry[],
  joins: readonly IJoin[],
  regenerated?: readonly unknown[],
): IObjectParity {
  const result: IObjectParity = {
    status: 'not-measured',
    byFamily: {},
    ledger: [],
    knownClasses,
    errors: [],
  };
  const byFile = new Map(joins.map((join) => [join.catalogFile, join]));
  const byPath = new Map<string, z.infer<typeof Row>[]>();
  for (const raw of regenerated ?? []) {
    const row = Row.parse(raw);
    byPath.set(row.path, [...(byPath.get(row.path) ?? []), row]);
  }
  for (const entry of [...catalog].sort((a, b) => compare(a.file, b.file))) {
    const counts = (result.byFamily[entry.family] ??= {
      rows: 0,
      equal: 0,
      drifted: 0,
      unavailable: 0,
    });
    counts.rows++;
    const join = byFile.get(entry.file);
    if (!join) {
      counts.unavailable++;
      result.errors.push(`catalog-without-verified-join: ${entry.file}`);
      continue;
    }
    if (regenerated === undefined) {
      counts.unavailable++;
      continue;
    }
    const matches = byPath.get(join.path) ?? [];
    if (matches.length !== 1 || matches[0].sha256 !== join.sha256) {
      counts.unavailable++;
      result.errors.push(
        `regenerated-identity-mismatch: ${entry.file}: ${join.path}: count=${matches.length}`,
      );
      continue;
    }
    if (matches[0].unit == null) {
      counts.unavailable++;
      if (matches[0].reason)
        result.errors.push(
          `regenerated-conversion-failed: ${join.path}: ${matches[0].reason}`,
        );
      continue;
    }
    const unit = CatalogUnit.parse(matches[0].unit);
    const fields = differences(entry.unit, unit);
    if (!fields.length) counts.equal++;
    else {
      counts.drifted++;
      result.ledger.push({ ...join, fields });
    }
  }
  const expected = new Set(joins.map((join) => join.path));
  for (const source of [...byPath.keys()].sort())
    if (!expected.has(source))
      result.errors.push(`unexpected-regenerated-source: ${source}`);
  const counts = Object.values(result.byFamily);
  if (counts.some((c) => c.equal + c.drifted > 0))
    result.status = counts.some((c) => c.unavailable > 0)
      ? 'partial'
      : 'measured';
  return result;
}
