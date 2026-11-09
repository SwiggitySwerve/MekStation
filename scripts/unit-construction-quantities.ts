/**
 * Opt-in verifier quantities and settings comparator (row 3.4 W3): the five
 * finite verifier quantities and the 24 settings the pinned Java exporter writes
 * per row, against MekStation's own owners. Measurement only; a gap is a finding.
 * See unit-bv-parity.md "Opt-in verifier quantities and settings".
 */
import { z } from 'zod';

import type { IReferenceIdentity } from './unit-bv-provenance';

import { BlkParserService } from '../src/services/conversion/BlkParserService';
import {
  areHandlersInitialized,
  initializeUnitTypeHandlers,
} from '../src/services/units/handlers/initializeHandlers';
import {
  UnitLoaderService,
  type IRawSerializedUnit,
} from '../src/services/units/unitLoaderService';
import { getUnitTypeRegistry } from '../src/services/units/UnitTypeRegistry';
import { getTotalAllocatedArmor } from '../src/stores/unitState';
import {
  getLocationSlotCount,
  getLocationsForConfig,
} from '../src/types/construction/mechConfigHelpers';
import {
  buildDeltaReport,
  FAMILIES,
  JavaReference,
  sourceKey,
  type IComputedRow,
} from './unit-bv-parity';
import {
  compareSettings,
  defaultLocalSetting,
  type ISettingsReport,
  probeMechOverweightTolerance,
  SETTING_KEYS,
  toleranceFromProbe,
  type IProbes,
  type LocalSettingFn,
} from './unit-construction-settings';
import {
  captureConstructionWeights,
  compareWeight,
  type LocalWeightFact,
  WEIGHT_ABS_TOLERANCE,
  WEIGHT_REL_LIMIT,
  WEIGHT_REL_TOLERANCE,
} from './unit-construction-weights';

export const QUANTITY_KEYS = [
  'weightExact',
  'weightRounded',
  'weightDesign',
  'armorPoints',
  'criticalSlots',
] as const;
export type QuantityKey = (typeof QUANTITY_KEYS)[number];
const EXPECTED_UNIT: Record<QuantityKey, string> = {
  weightExact: 't',
  weightRounded: 't',
  weightDesign: 't',
  armorPoints: 'points',
  criticalSlots: 'slots',
};

/** A quantity the local code cannot produce is absent, with the reason in `gaps`. */
export interface ILocalQuantities {
  values: Partial<Record<QuantityKey, number>>;
  gaps: Partial<Record<QuantityKey, string>>;
  probes?: IProbes;
}
export type LocalQuantityFact = ILocalQuantities | { failure: string };

const QuantityReference = JavaReference.extend({
  construction: z
    .object({
      verifierClass: z.string().optional(),
      verifierQuantities: z
        .record(
          z.string(),
          z
            .object({
              unit: z.string().optional(),
              value: z.unknown().optional(),
              status: z.string().optional(),
              reason: z.string().optional(),
            })
            .passthrough(),
        )
        .optional(),
      settings: z.record(z.string(), z.unknown()).optional(),
    })
    .passthrough()
    .optional(),
});

/**
 * The optional second reference input (the W2 additive infantry export). Its
 * rows carry the same pinned-Java quantities, so they are cross-checked against
 * the primary reference; they supply nothing the primary lacks.
 */
const ExtraRow = z
  .object({
    ...sourceKey,
    construction: z
      .object({
        verifierQuantities: z.record(
          z.string(),
          z.object({ value: z.unknown().optional() }).passthrough(),
        ),
      })
      .passthrough(),
  })
  .passthrough();

type QuantityStatus =
  | 'exact'
  | 'within1Pct'
  | 'different'
  | 'missing-local'
  | 'failed-local'
  | 'nonfinite-local'
  | 'missing-reference'
  | 'reference-invalid';
interface IQuantityEntry {
  key: QuantityKey;
  unit: string;
  java: number | null;
  ours: number | null;
  delta: number | null;
  relPct: number | null;
  status: QuantityStatus;
  reason: string | null;
}
interface ICounts {
  compared: number;
  exact: number;
  within1Pct: number;
  different: number;
  missingLocal: number;
  missingReference: number;
  referenceInvalid: number;
  nonfiniteLocal: number;
  failedLocal: number;
}
interface IComponent extends ICounts {
  maxAbsDelta: number;
  maxRelPct: number;
}
const noCounts = (): ICounts => ({
  compared: 0,
  exact: 0,
  within1Pct: 0,
  different: 0,
  missingLocal: 0,
  missingReference: 0,
  referenceInvalid: 0,
  nonfiniteLocal: 0,
  failedLocal: 0,
});
const COUNT_FIELD: Record<string, keyof ICounts> = {
  exact: 'exact',
  within1Pct: 'within1Pct',
  different: 'different',
  'missing-local': 'missingLocal',
  'missing-reference': 'missingReference',
  'reference-invalid': 'referenceInvalid',
  'nonfinite-local': 'nonfiniteLocal',
  'failed-local': 'failedLocal',
};

const simpleClass = (name: string | undefined) =>
  (name ?? '').split('.').pop() ?? '';

function quantityEntry(
  key: QuantityKey,
  reference: z.infer<typeof QuantityReference>['construction'],
  fact: LocalQuantityFact | undefined,
): IQuantityEntry {
  const unit = EXPECTED_UNIT[key];
  const empty = {
    key,
    unit,
    java: null,
    ours: null,
    delta: null,
    relPct: null,
  };
  const java = reference?.verifierQuantities?.[key];
  if (!java)
    return {
      ...empty,
      status: 'missing-reference',
      reason: 'the Java reference row has no such quantity',
    };
  if (java.status !== undefined)
    return {
      ...empty,
      status: 'reference-invalid',
      reason: `the Java exporter reported ${java.status}: ${java.reason ?? 'no reason'}`,
    };
  if (java.unit !== unit)
    return {
      ...empty,
      status: 'reference-invalid',
      reason: `unit ${String(java.unit)}, expected ${unit}`,
    };
  if (typeof java.value !== 'number' || !Number.isFinite(java.value))
    return {
      ...empty,
      status: 'reference-invalid',
      reason: 'the Java value is missing or nonfinite',
    };
  if (!fact)
    return {
      ...empty,
      java: java.value,
      status: 'missing-local',
      reason: 'no local quantities fact was captured',
    };
  if ('failure' in fact)
    return {
      ...empty,
      java: java.value,
      status: 'failed-local',
      reason: fact.failure,
    };
  const compared = compareWeight(java.value, fact.values[key]);
  return {
    key,
    unit,
    ...compared,
    reason:
      compared.status === 'missing-local' ? (fact.gaps[key] ?? null) : null,
  };
}

interface IQuantityRow extends Pick<
  ReturnType<typeof buildDeltaReport>['rows'][number],
  'path' | 'sha256' | 'sourceSha256' | 'family' | 'joined'
> {
  verifierClass: string;
  quantities: IQuantityEntry[];
  local: LocalQuantityFact | null;
  reason: string | null;
  status: string;
}
interface IQuantityReport {
  scope: 'construction-verifier-quantities-and-settings';
  ok: boolean;
  tolerance: {
    absolute: number;
    relative: number;
    relativeLimit: number;
    rule: string;
  };
  settingKeys: readonly string[];
  extraInput: { rows: number; accepted: number };
  drift: string[];
  errors: string[];
  byFamily: Record<
    string,
    Record<
      | 'rows'
      | 'joined'
      | 'unjoined'
      | 'missingReference'
      | 'referenceInvalid'
      | 'matched'
      | 'different'
      | 'incomplete'
      | 'missingLocal'
      | 'failedLocal',
      number
    >
  >;
  byQuantity: Record<string, Record<string, IComponent>>;
  settings: Omit<ISettingsReport, 'drift' | 'errors'>;
  rows: IQuantityRow[];
}

export function buildQuantityReport(
  computed: readonly IComputedRow[],
  rawReferences: readonly unknown[],
  families: readonly string[] = FAMILIES,
  localSettings: LocalSettingFn = defaultLocalSetting,
  rawExtra: readonly unknown[] = [],
  referenceIdentity?: Partial<IReferenceIdentity>,
): IQuantityReport {
  const references = rawReferences.map((value) =>
    QuantityReference.parse(value),
  );
  const coverage = buildDeltaReport(computed, references, families);
  const ours = new Map(computed.map((row) => [row.path, row]));
  const refs = new Map(references.map((row) => [row.path, row]));
  const errors = coverage.errors.filter((error) =>
    /^(duplicate|unexpected-family|missing-family|coverage):/.test(error),
  );
  const drift: string[] = [];

  const seenExtra = new Set<string>();
  let acceptedExtra = 0;
  rawExtra.forEach((raw, index) => {
    const parsed = ExtraRow.safeParse(raw);
    if (!parsed.success) {
      const label = (raw as { path?: unknown } | null)?.path;
      drift.push(
        `extra-rejected: ${typeof label === 'string' ? label : `#${index}`}`,
      );
      return;
    }
    const { path, sha256, construction } = parsed.data;
    const primary = refs.get(path);
    if (seenExtra.has(path)) drift.push(`extra-duplicate: ${path}`);
    else if (!primary) drift.push(`extra-unknown: ${path}`);
    else if (primary.sha256 !== sha256)
      drift.push(`extra-hash-mismatch: ${path}`);
    else {
      acceptedExtra++;
      for (const name of QUANTITY_KEYS) {
        const left = primary.construction?.verifierQuantities?.[name]?.value;
        const right = construction.verifierQuantities[name]?.value;
        const same =
          typeof left === 'number' &&
          typeof right === 'number' &&
          compareWeight(left, right).status === 'exact';
        if (!same) drift.push(`extra-quantity-mismatch: ${path} ${name}`);
      }
    }
    seenExtra.add(path);
  });

  const rows = coverage.rows.map((row) => {
    const construction = refs.get(row.path)?.construction;
    const fact = ours.get(row.path)?.constructionQuantities;
    const base = {
      path: row.path,
      sha256: row.sha256,
      sourceSha256: row.sourceSha256,
      family: row.family,
      joined: row.joined,
      verifierClass: simpleClass(construction?.verifierClass),
      quantities: [] as IQuantityEntry[],
      local: fact ?? null,
      reason: ours.get(row.path)?.reason ?? null,
    };
    if (!row.joined) return { ...base, status: 'unjoined' };
    if (!construction?.verifierQuantities)
      return { ...base, status: 'missing-reference' };
    for (const name of Object.keys(construction.verifierQuantities).sort())
      if (!(QUANTITY_KEYS as readonly string[]).includes(name))
        drift.push(`quantity-key-drift: ${row.path} unexpected ${name}`);
    const quantities = QUANTITY_KEYS.map((name) =>
      quantityEntry(name, construction, fact),
    );
    const verdicts = quantities.map((entry) => entry.status);
    const status = verdicts.some((v) => v === 'failed-local')
      ? 'failed-local'
      : verdicts.some(
            (v) => v === 'reference-invalid' || v === 'missing-reference',
          )
        ? 'reference-invalid'
        : verdicts.includes('different')
          ? 'different'
          : verdicts.every((v) => v === 'exact' || v === 'within1Pct')
            ? 'matched'
            : verdicts.every((v) => v === 'missing-local')
              ? 'missing-local'
              : 'incomplete';
    return { ...base, quantities, status };
  });

  const byQuantity: Record<string, Record<string, IComponent>> = {};
  const byFamily = Object.fromEntries(
    [...families].sort().map((family) => {
      const group = rows.filter((row) => row.family === family);
      const count = (status: string) =>
        group.filter((row) => row.status === status).length;
      const components = (byQuantity[family] = {} as Record<
        string,
        IComponent
      >);
      for (const row of group)
        for (const entry of row.quantities) {
          const bucket = (components[entry.key] ??= {
            ...noCounts(),
            maxAbsDelta: 0,
            maxRelPct: 0,
          });
          const field = COUNT_FIELD[entry.status];
          if (field) {
            bucket[field]++;
            if (['exact', 'within1Pct', 'different'].includes(entry.status))
              bucket.compared++;
          }
          if (entry.delta !== null)
            bucket.maxAbsDelta = Math.max(
              bucket.maxAbsDelta,
              Math.abs(entry.delta),
            );
          if (entry.relPct !== null)
            bucket.maxRelPct = Math.max(
              bucket.maxRelPct,
              Math.abs(entry.relPct),
            );
        }
      return [
        family,
        {
          rows: coverage.byFamily[family].rows,
          joined: group.filter((row) => row.joined).length,
          unjoined: count('unjoined'),
          missingReference: count('missing-reference'),
          referenceInvalid: count('reference-invalid'),
          matched: count('matched'),
          different: count('different'),
          incomplete: count('incomplete'),
          missingLocal: count('missing-local'),
          failedLocal: count('failed-local'),
        },
      ] as const;
    }),
  );
  for (const row of rows)
    if (row.status !== 'matched') errors.push(`${row.status}: ${row.path}`);

  const settings = compareSettings(
    rows
      .filter((row) => row.joined && refs.get(row.path)?.construction?.settings)
      .map((row) => {
        const construction = refs.get(row.path)!.construction!;
        const javaValue = (name: QuantityKey) => {
          const value = construction.verifierQuantities?.[name]?.value;
          return typeof value === 'number' && Number.isFinite(value)
            ? value
            : undefined;
        };
        const local = ours.get(row.path)?.constructionQuantities;
        return {
          path: row.path,
          family: row.family,
          verifierClass: row.verifierClass,
          settings: construction.settings!,
          javaWeights: {
            exact: javaValue('weightExact'),
            rounded: javaValue('weightRounded'),
            design: javaValue('weightDesign'),
          },
          probe: local && !('failure' in local) ? local.probes : undefined,
        };
      }),
    localSettings,
    referenceIdentity,
  );
  drift.push(...settings.drift);
  errors.push(...drift, ...settings.errors);
  const { drift: _drift, errors: _errors, ...settingsReport } = settings;
  return {
    scope: 'construction-verifier-quantities-and-settings' as const,
    ok: errors.length === 0,
    tolerance: {
      absolute: WEIGHT_ABS_TOLERANCE,
      relative: WEIGHT_REL_TOLERANCE,
      relativeLimit: WEIGHT_REL_LIMIT,
      rule: 'exact within absolute/relative tolerance; otherwise strictly less than 1% of the Java quantity',
    },
    settingKeys: SETTING_KEYS,
    extraInput: { rows: rawExtra.length, accepted: acceptedExtra },
    drift: drift.sort(),
    errors: errors.sort(),
    byFamily,
    byQuantity,
    settings: settingsReport,
    rows,
  };
}

// ---------------------------------------------------------------------------
// Local capture. Existing owners only; whatever a family cannot produce stays
// absent with its reason, so the comparator reports it as missing-local.
// ---------------------------------------------------------------------------

const ROUNDED_GAP =
  'no local owner of the rounded total: the validators compare the unrounded sum (WeightOverflowValidation.ts:54, AbstractUnitTypeHandler.ts:353) and ceilToHalfTon exists per component only';
const SLOT_GAP =
  'no local owner of the Java per-location slot table (vehicle slot use is private inside combatVehicleSlotErrors, itemSlots.ts:196-224)';
const PERSONNEL_GAP: Record<string, string> = {
  battlearmor:
    'BattleArmorUnitHandler exposes no tonnage, armor points, slot count or weight total (requiresUnitTonnage is false, BattleArmorUnitHandler.ts:82)',
  infantry:
    'InfantryUnitHandler exposes none of the five (requiresUnitTonnage is false, InfantryUnitHandler.ts:98); Java reports armorPoints 0 and a computed weight',
  proto: 'ProtoMechUnitHandler exposes none of the five',
};
const allGaps = (reason: string): ILocalQuantities => ({
  values: {},
  gaps: Object.fromEntries(QUANTITY_KEYS.map((key) => [key, reason])),
});

function captureMechQuantities(
  unit: unknown,
  weights: LocalWeightFact,
): LocalQuantityFact {
  let stage = 'mtf-converted-unit';
  try {
    if (unit == null || typeof unit !== 'object')
      throw new Error('Converter produced no unit');
    stage = 'mtf-load';
    const state = new UnitLoaderService().mapToUnitState(
      unit as IRawSerializedUnit,
      true,
    );
    stage = 'mtf-quantities';
    const values: ILocalQuantities['values'] = {
      weightDesign: state.tonnage,
      armorPoints: getTotalAllocatedArmor(
        state.armorAllocation,
        state.configuration,
      ),
      criticalSlots: getLocationsForConfig(state.configuration).reduce(
        (sum, location) =>
          sum + getLocationSlotCount(location, state.configuration),
        0,
      ),
    };
    const gaps: ILocalQuantities['gaps'] = { weightRounded: ROUNDED_GAP };
    if ('failure' in weights) throw new Error(weights.failure);
    if (weights.total !== undefined) values.weightExact = weights.total;
    else gaps.weightExact = weights.unavailable ?? 'no local weight total';
    stage = 'mtf-overweight-probe';
    return {
      values,
      gaps,
      probes: { overweightTolerance: probeMechOverweightTolerance() },
    };
  } catch (error) {
    throw new Error(`${stage}: ${String(error)}`);
  }
}

function captureBlkQuantities(
  bytes: Buffer,
  weights: LocalWeightFact,
): LocalQuantityFact {
  let stage = 'blk-source-parser';
  try {
    const parsed = new BlkParserService().parse(bytes.toString('utf8'));
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    const document = parsed.data.document;
    const type = document.unitType.toLowerCase().replace(/\s/g, '');
    const personnel = Object.keys(PERSONNEL_GAP).find((name) =>
      type.includes(name),
    );
    if (personnel) return allGaps(PERSONNEL_GAP[personnel]);
    stage = 'blk-handler-unavailable';
    if (!areHandlersInitialized()) initializeUnitTypeHandlers();
    const handler = getUnitTypeRegistry().getHandlerForDocument(document);
    if (!handler) throw new Error(document.unitType);
    stage = 'blk-handler-parser';
    const unit = handler.parse(document);
    if (!unit.success) throw new Error(JSON.stringify(unit.error));
    const local = unit.data.unit as unknown as {
      tonnage?: unknown;
      totalArmorPoints?: unknown;
    };
    stage = 'blk-quantities';
    const values: ILocalQuantities['values'] = {};
    const gaps: ILocalQuantities['gaps'] = {
      weightRounded: ROUNDED_GAP,
      criticalSlots: SLOT_GAP,
    };
    if (typeof local.tonnage === 'number') values.weightDesign = local.tonnage;
    else gaps.weightDesign = 'the handler unit exposes no tonnage';
    if (typeof local.totalArmorPoints === 'number')
      values.armorPoints = local.totalArmorPoints;
    else gaps.armorPoints = 'the handler unit exposes no totalArmorPoints';
    if ('failure' in weights) throw new Error(weights.failure);
    if (weights.total !== undefined) values.weightExact = weights.total;
    else gaps.weightExact = weights.unavailable ?? 'no local weight total';
    stage = 'blk-overweight-probe';
    let probes: IProbes | undefined;
    try {
      const sample = unit.data.unit;
      const validate = (overweight: number) =>
        !handler
          .validate({
            ...sample,
            totalWeight: sample.tonnage + overweight,
          } as typeof sample)
          .errors.some((message) =>
            /^Total weight \(.*\) exceeds tonnage/.test(message),
          );
      probes = { overweightTolerance: toleranceFromProbe(validate) };
    } catch {
      probes = undefined;
    }
    return { values, gaps, ...(probes ? { probes } : {}) };
  } catch (error) {
    throw new Error(`${stage}: ${String(error)}`);
  }
}

/**
 * Local verifier quantities for one pinned source, or a staged failure fact.
 * `weights` is the row's W1 weight fact when that mode ran, so one owner feeds
 * both comparators; otherwise it is captured here.
 */
export function captureConstructionQuantities(
  input: { path: string; unit?: unknown },
  bytes: Buffer,
  weights?: LocalWeightFact,
): LocalQuantityFact {
  try {
    const fact = weights ?? captureConstructionWeights(input, bytes);
    if (input.path.endsWith('.mtf'))
      return captureMechQuantities(input.unit, fact);
    if (input.path.endsWith('.blk')) return captureBlkQuantities(bytes, fact);
    throw new Error(`Unsupported source: ${input.path}`);
  } catch (error) {
    return { failure: String(error) };
  }
}
