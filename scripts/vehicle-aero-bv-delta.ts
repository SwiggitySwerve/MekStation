#!/usr/bin/env npx tsx
/**
 * Vehicle / aerospace BV delta harness (UL-17). Runs converter NDJSON rows
 * (`export_vehicle_aero_json.py`) through the contract adapter and
 * `calculateBattleValueForUnit`, and compares each unit with its pinned-Java row
 * (`java_reference_exporter.py`, joined on the mekfiles-relative path). Measures
 * only. Integer totals compare exactly; raw double aggregates use a relative tolerance.
 *
 * Usage: npx tsx scripts/vehicle-aero-bv-delta.ts --converted <dir> --reference <full.jsonl> --out <dir>
 */
import * as fs from 'fs';
import * as path from 'path';

import { calculateBattleValueForUnit } from '../src/utils/construction/battleValueCalculations';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '../src/utils/construction/contractBVUnitAdapter';

export interface IJavaReferenceRow {
  readonly path: string;
  readonly concreteFamily: string;
  readonly battleValue: {
    readonly total: number;
    readonly aggregates: {
      readonly defensiveValue: number;
      readonly offensiveValue: number;
    };
  };
  readonly construction: { readonly valid: boolean };
}

export interface IConvertedRow {
  readonly path: string;
  readonly unit: IContractBVSource;
}

export type DeltaStatus = 'number' | 'undefined' | 'throw' | 'no-java-row';

export interface IAggregateDelta {
  readonly java: number;
  readonly ours: number;
  readonly delta: number;
  readonly withinTolerance: boolean;
}

export interface IDeltaRow {
  readonly path: string;
  readonly id: string;
  readonly unitType: string;
  readonly javaClass: string | null;
  readonly status: DeltaStatus;
  readonly error?: string;
  readonly javaConstructionValid: boolean | null;
  readonly javaTotal: number | null;
  readonly ourTotal: number | null;
  readonly delta: number | null;
  readonly deltaPct: number | null;
  readonly defensive: IAggregateDelta | null;
  readonly offensive: IAggregateDelta | null;
}

/** Relative tolerance for raw double aggregates (2 ulp is about 4e-16). */
export const AGGREGATE_REL_TOLERANCE = 1e-9;

export function aggregateDelta(java: number, ours: number): IAggregateDelta {
  const delta = ours - java;
  const scale = Math.max(1, Math.abs(java), Math.abs(ours));
  return {
    java,
    ours,
    delta,
    withinTolerance: Math.abs(delta) <= AGGREGATE_REL_TOLERANCE * scale,
  };
}

export function compareUnit(
  converted: IConvertedRow,
  java: IJavaReferenceRow | undefined,
): IDeltaRow {
  const { unit } = converted;
  const base = {
    path: converted.path,
    id: unit.id,
    unitType: unit.unitType,
    javaClass: java?.concreteFamily ?? null,
    javaConstructionValid: java?.construction.valid ?? null,
    javaTotal: java?.battleValue.total ?? null,
  };
  const empty = {
    ourTotal: null,
    delta: null,
    deltaPct: null,
    defensive: null,
    offensive: null,
  };
  let result;
  try {
    result = calculateBattleValueForUnit(contractUnitToBVUnit(unit));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ...base, ...empty, status: 'throw', error: message };
  }
  if (result?.kind !== 'vehicle' && result?.kind !== 'aerospace') {
    return { ...base, ...empty, status: 'undefined' };
  }
  const { final: ourTotal, defensive, offensive } = result.breakdown;
  if (!Number.isFinite(ourTotal))
    return { ...base, ...empty, status: 'undefined' };
  if (!java) return { ...base, ...empty, ourTotal, status: 'no-java-row' };
  const delta = ourTotal - java.battleValue.total;
  const aggregates = java.battleValue.aggregates;
  return {
    ...base,
    status: 'number',
    ourTotal,
    delta,
    deltaPct:
      java.battleValue.total === 0
        ? null
        : (delta / java.battleValue.total) * 100,
    defensive: aggregateDelta(aggregates.defensiveValue, defensive),
    offensive: aggregateDelta(aggregates.offensiveValue, offensive),
  };
}

export interface IGroupSummary {
  units: number;
  numeric: number;
  throws: number;
  undefinedResults: number;
  exactTotal: number;
  within1Pct: number;
  over1Pct: number;
  defensiveWithinTolerance: number;
  offensiveWithinTolerance: number;
  meanDeltaPct: number | null;
}

function summarizeGroup(rows: readonly IDeltaRow[]): IGroupSummary {
  const compared = rows.filter((r) => r.status === 'number');
  const count = (test: (r: IDeltaRow) => boolean | undefined) =>
    compared.filter(test).length;
  const pct = (r: IDeltaRow) => Math.abs(r.deltaPct ?? NaN);
  const pcts = compared.flatMap((r) =>
    r.deltaPct === null ? [] : [r.deltaPct],
  );
  return {
    units: rows.length,
    numeric: rows.filter((r) => r.ourTotal !== null).length,
    throws: rows.filter((r) => r.status === 'throw').length,
    undefinedResults: rows.filter((r) => r.status === 'undefined').length,
    exactTotal: count((r) => r.delta === 0),
    within1Pct: count((r) => pct(r) <= 1),
    over1Pct: count((r) => pct(r) > 1),
    defensiveWithinTolerance: count((r) => r.defensive?.withinTolerance),
    offensiveWithinTolerance: count((r) => r.offensive?.withinTolerance),
    meanDeltaPct: pcts.length
      ? pcts.reduce((a, b) => a + b, 0) / pcts.length
      : null,
  };
}

export interface IDeltaReport {
  readonly aggregateRelativeTolerance: number;
  readonly total: IGroupSummary;
  readonly byUnitType: Record<string, IGroupSummary>;
  readonly byJavaClass: Record<string, IGroupSummary>;
  readonly javaRowsWithNoConverterOutput: Record<string, number>;
  readonly rows: readonly IDeltaRow[];
}

export function buildDeltaReport(
  converted: readonly IConvertedRow[],
  javaRows: readonly IJavaReferenceRow[],
): IDeltaReport {
  const byPath = new Map(javaRows.map((r) => [r.path, r]));
  const rows = converted.map((c) => compareUnit(c, byPath.get(c.path)));
  const convertedPaths = new Set(converted.map((c) => c.path));
  const unconverted = javaRows.filter((r) => !convertedPaths.has(r.path));
  const group = (key: (r: IDeltaRow) => string) =>
    Object.fromEntries(
      [...new Set(rows.map(key))]
        .sort()
        .map((k) => [k, summarizeGroup(rows.filter((r) => key(r) === k))]),
    );
  const countBy = (list: readonly IJavaReferenceRow[]) =>
    list.reduce<Record<string, number>>((acc, r) => {
      acc[r.concreteFamily] = (acc[r.concreteFamily] ?? 0) + 1;
      return acc;
    }, {});
  return {
    aggregateRelativeTolerance: AGGREGATE_REL_TOLERANCE,
    total: summarizeGroup(rows),
    byUnitType: group((r) => r.unitType),
    byJavaClass: group((r) => r.javaClass ?? '(none)'),
    javaRowsWithNoConverterOutput: countBy(unconverted),
    rows,
  };
}

function readNdjson<T>(file: string): T[] {
  return fs
    .readFileSync(file, 'utf-8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);
}

function arg(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function main(): void {
  const dir = arg('--converted');
  const converted = ['vehicles.ndjson', 'aerospace.ndjson'].flatMap((name) =>
    readNdjson<IConvertedRow>(path.join(dir, name)),
  );
  const report = buildDeltaReport(
    converted,
    readNdjson<IJavaReferenceRow>(arg('--reference')),
  );
  fs.mkdirSync(arg('--out'), { recursive: true });
  fs.writeFileSync(
    path.join(arg('--out'), 'delta-report.json'),
    JSON.stringify(report, null, 1),
  );
  const { rows, ...summary } = report;
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ...summary, rows: rows.length }, null, 1));
}

if (require.main === module) {
  main();
}
