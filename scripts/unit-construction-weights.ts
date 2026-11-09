/**
 * Opt-in construction weight comparator (row 3.4 W1): MekStation weight terms
 * against the pinned-Java additive maps. Measurement only; a gap is a finding.
 * See unit-bv-parity.md "Opt-in construction weight terms".
 */
import { z } from 'zod';

import type { IBlkDocument } from '../src/types/formats/BlkFormat';
import type { VehicleWeightBreakdown } from '../src/utils/construction/vehicle/weightComposition';

import { BlkParserService } from '../src/services/conversion/BlkParserService';
import {
  areHandlersInitialized,
  initializeUnitTypeHandlers,
} from '../src/services/units/handlers/initializeHandlers';
import { createSupportRegistryMass } from '../src/services/units/handlers/supportRegistryMass';
import { SupportVehicleUnitHandler } from '../src/services/units/handlers/SupportVehicleUnitHandler';
import {
  computeNativeTankWeight,
  computeNativeVTOLWeight,
  rejectIncompleteCombatVehicleWeight,
} from '../src/services/units/handlers/vehicleHandlerWeight';
import { VehicleUnitHandler } from '../src/services/units/handlers/VehicleUnitHandler';
import { VTOLUnitHandler } from '../src/services/units/handlers/VTOLUnitHandler';
import {
  UnitLoaderService,
  type IRawSerializedUnit,
} from '../src/services/units/unitLoaderService';
import { getUnitTypeRegistry } from '../src/services/units/UnitTypeRegistry';
import {
  isSupportVehicle,
  isVTOL,
  type ISupportVehicle,
  type IVTOL,
} from '../src/types/unit/VehicleInterfaces';
import { computeSupportVehicleWeight } from '../src/utils/construction/vehicle/supportWeight';
import { getEquipmentPayloadWeight } from '../src/utils/equipment/equipmentWeightAccounting';
import {
  buildDeltaReport,
  FAMILIES,
  JavaReference,
  sourceKey,
  type IComputedRow,
} from './unit-bv-parity';
import { renderMechCalculations } from './unit-construction-validity';

/** Tons. A term the local code cannot produce is simply absent. */
export interface ILocalWeights {
  terms: Record<string, number>;
  /** A lump the local code cannot split; compared against the sum of its members. */
  groups?: Record<string, { members: readonly string[]; ours: number }>;
  total?: number;
  /** Unsupported Java terms, with their local-owner reason; never zero-filled. */
  gaps?: Record<string, string>;
  /** The owner's unresolved inputs, retained verbatim without interpreting names. */
  unresolved?: readonly string[];
  /** Why this row has no local terms at all (no construction seam on main). */
  unavailable?: string;
}
export type LocalWeightFact = ILocalWeights | { failure: string };

const WeightReference = JavaReference.extend({
  construction: z
    .object({
      weightTerms: z.record(z.string(), z.number().finite()).optional(),
      weightTotal: z.number().finite().optional(),
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
const ExtraRow = z
  .object({
    ...sourceKey,
    construction: z
      .object({
        weightTerms: z.record(z.string(), z.number().finite()),
        weightTotal: z.number().finite(),
        reconstruction: z.object({ ok: z.boolean() }).passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

export const WEIGHT_ABS_TOLERANCE = 1e-9;
export const WEIGHT_REL_TOLERANCE = 1e-12;
/** The spec limit: a differing term must be strictly less than 1% of Java's. */
export const WEIGHT_REL_LIMIT = 0.01;
const ALLOCATED_ARMOR = 'getWeightAllocatedArmor';
const ARMOR = 'getWeightArmor';

type CompareStatus =
  | 'exact'
  | 'within1Pct'
  | 'different'
  | 'missing-local'
  | 'failed-local'
  | 'nonfinite-local'
  | 'missing-reference';
interface IWeightEntry {
  key: string;
  java: number | null;
  ours: number | null;
  delta: number | null;
  relPct: number | null;
  status: CompareStatus | `grouped:${string}`;
}
interface IGroupEntry extends Omit<IWeightEntry, 'key' | 'status'> {
  name: string;
  members: string[];
  status: CompareStatus;
}
interface ICounts {
  compared: number;
  exact: number;
  within1Pct: number;
  different: number;
  missingLocal: number;
  missingReference: number;
  nonfiniteLocal: number;
  failedLocal: number;
  grouped: number;
}
interface IComponent extends ICounts {
  maxAbsDelta: number;
  maxRelPct: number;
}
interface IWeightReport {
  scope: 'construction-weight-terms';
  ok: boolean;
  tolerance: {
    absolute: number;
    relative: number;
    relativeLimit: number;
    rule: string;
  };
  omittedComparisons: string[];
  extraInput: { rows: number; accepted: number };
  pendingInputs: {
    input: string;
    family: string;
    rows: number;
    reason: string;
  }[];
  errors: string[];
  byFamily: Record<
    string,
    Record<
      | 'rows'
      | 'joined'
      | 'nativeMaps'
      | 'extraMaps'
      | 'referenceUnsupported'
      | 'missingReference'
      | 'unjoined'
      | 'matched'
      | 'different'
      | 'incomplete'
      | 'missingLocal'
      | 'failedLocal',
      number
    > & { terms: ICounts }
  >;
  byComponent: Record<string, Record<string, IComponent>>;
  rows: (Pick<
    ReturnType<typeof buildDeltaReport>['rows'][number],
    'path' | 'sha256' | 'sourceSha256' | 'family' | 'joined' | 'status'
  > & {
    referenceSource: string | null;
    unavailable: string | null;
    terms: IWeightEntry[];
    groups: IGroupEntry[];
    total: IWeightEntry | null;
    localOnly: string[];
    local: LocalWeightFact | null;
    reason: string | null;
  })[];
}
const noCounts = (): ICounts => ({
  compared: 0,
  exact: 0,
  within1Pct: 0,
  different: 0,
  missingLocal: 0,
  missingReference: 0,
  nonfiniteLocal: 0,
  failedLocal: 0,
  grouped: 0,
});
const COUNT_FIELD: Record<string, keyof ICounts> = {
  exact: 'exact',
  within1Pct: 'within1Pct',
  different: 'different',
  'missing-local': 'missingLocal',
  'missing-reference': 'missingReference',
  'nonfinite-local': 'nonfiniteLocal',
  'failed-local': 'failedLocal',
};

export function compareWeight(
  java: number | undefined,
  ours: number | undefined,
  localGap: CompareStatus = 'missing-local',
): Omit<IWeightEntry, 'key' | 'status'> & { status: CompareStatus } {
  const none = (status: CompareStatus) => ({
    java: java ?? null,
    ours: null,
    delta: null,
    relPct: null,
    status,
  });
  if (java === undefined) return none('missing-reference');
  if (ours === undefined) return { ...none(localGap), java };
  if (!Number.isFinite(ours)) return { ...none('nonfinite-local'), java };
  const delta = ours - java;
  const relPct = java === 0 ? null : (delta * 100) / Math.abs(java);
  const status =
    Math.abs(delta) <=
    Math.max(WEIGHT_ABS_TOLERANCE, WEIGHT_REL_TOLERANCE * Math.abs(java))
      ? 'exact'
      : java !== 0 && Math.abs(delta) * 100 < Math.abs(java)
        ? 'within1Pct'
        : 'different';
  return { java, ours, delta, relPct, status };
}

// BattleArmor keys carry the trooper index; coverage is by component.
const component = (key: string) => key.replace(/^trooper\.\d+\./, 'trooper.*.');
const has = (object: object, key: string) =>
  Object.prototype.hasOwnProperty.call(object, key);

export function buildWeightReport(
  computed: readonly IComputedRow[],
  rawReferences: readonly unknown[],
  families: readonly string[] = FAMILIES,
  rawExtra: readonly unknown[] = [],
): IWeightReport {
  const references = rawReferences.map((value) => WeightReference.parse(value));
  const coverage = buildDeltaReport(computed, references, families);
  const ours = new Map(computed.map((row) => [row.path, row]));
  const refs = new Map(references.map((row) => [row.path, row]));
  const errors = coverage.errors.filter((error) =>
    /^(duplicate|unexpected-family|missing-family|coverage):/.test(error),
  );

  // The optional second reference input (W2 infantry additive maps).
  const extra = new Map<string, z.infer<typeof ExtraRow>>();
  const duplicated = new Set<string>();
  rawExtra.forEach((raw, index) => {
    const parsed = ExtraRow.safeParse(raw);
    const label = parsed.success
      ? parsed.data.path
      : typeof (raw as { path?: unknown } | null)?.path === 'string'
        ? (raw as { path: string }).path
        : `#${index}`;
    if (!parsed.success || !parsed.data.construction.reconstruction.ok) {
      errors.push(`extra-rejected: ${label}`);
      return;
    }
    const row = parsed.data;
    const ref = refs.get(row.path);
    if (extra.has(row.path)) {
      duplicated.add(row.path);
      errors.push(`extra-duplicate: ${row.path}`);
    } else if (!ref) errors.push(`extra-unknown: ${row.path}`);
    else if (ref.sha256 !== row.sha256)
      errors.push(`extra-hash-mismatch: ${row.path}`);
    else if (ref.construction?.weightTerms)
      errors.push(`extra-overlap: ${row.path}`);
    else if (!Object.keys(row.construction.weightTerms).length)
      errors.push(`extra-rejected: ${row.path}`);
    else extra.set(row.path, row);
  });
  for (const path of duplicated) extra.delete(path);

  const rows = coverage.rows.map((row) => {
    const construction = refs.get(row.path)?.construction;
    const added = extra.get(row.path);
    const primary = construction?.weightTerms !== undefined;
    const javaTerms =
      construction?.weightTerms ?? added?.construction.weightTerms;
    const javaTotal = primary
      ? construction?.weightTotal
      : added?.construction.weightTotal;
    const fact = ours.get(row.path)?.constructionWeights;
    const base = {
      path: row.path,
      sha256: row.sha256,
      sourceSha256: row.sourceSha256,
      family: row.family,
      joined: row.joined,
      referenceSource: javaTerms ? (primary ? 'primary' : 'extra') : null,
      unavailable:
        fact && !('failure' in fact) ? (fact.unavailable ?? null) : null,
      terms: [] as IWeightEntry[],
      groups: [] as IGroupEntry[],
      total: null as IWeightEntry | null,
      localOnly: [] as string[],
      local: fact ?? null,
      reason: ours.get(row.path)?.reason ?? null,
    };
    if (!row.joined) return { ...base, status: 'unjoined' };
    if (!javaTerms)
      return {
        ...base,
        status:
          construction?.weightTermsStatus?.status === 'unsupported'
            ? 'reference-unsupported'
            : 'missing-reference',
      };
    const failed = fact && 'failure' in fact;
    const terms = !fact || failed ? undefined : fact.terms;
    const gap: CompareStatus = failed ? 'failed-local' : 'missing-local';
    const groups: IGroupEntry[] = [];
    const grouped = new Map<string, string>();
    if (fact && !failed)
      for (const [name, group] of Object.entries(fact.groups ?? {})) {
        const members = group.members.filter((member) =>
          has(javaTerms, member),
        );
        if (!members.length) continue;
        members.forEach((member) => grouped.set(member, name));
        groups.push({
          name,
          members,
          ...compareWeight(
            members.reduce((sum, member) => sum + javaTerms[member], 0),
            group.ours,
          ),
        });
      }
    const entries: IWeightEntry[] = Object.entries(javaTerms).map(
      ([key, java]) => {
        const name = grouped.get(key);
        if (name)
          return {
            key,
            java,
            ours: null,
            delta: null,
            relPct: null,
            status: `grouped:${name}` as const,
          };
        const alias = key === ALLOCATED_ARMOR && !!terms && !has(terms, key);
        const value = terms?.[alias ? ARMOR : key];
        return { key, ...compareWeight(java, value, gap) };
      },
    );
    const total: IWeightEntry = {
      key: 'weightTotal',
      ...compareWeight(
        javaTotal,
        fact && !failed ? fact.total : undefined,
        gap,
      ),
    };
    const aliasUsed = has(javaTerms, ALLOCATED_ARMOR) && !has(javaTerms, ARMOR);
    const localOnly = Object.keys(terms ?? {})
      .filter(
        (key) =>
          !has(javaTerms, key) &&
          !grouped.has(key) &&
          !(aliasUsed && key === ARMOR),
      )
      .sort();
    const verdicts = [...entries, ...groups, total].map(
      (entry) => entry.status,
    );
    const status = failed
      ? 'failed-local'
      : !fact || fact.unavailable !== undefined
        ? 'missing-local'
        : verdicts.includes('different')
          ? 'different'
          : verdicts.every(
                (verdict) =>
                  ['exact', 'within1Pct'].includes(verdict) ||
                  verdict.startsWith('grouped:'),
              )
            ? 'matched'
            : 'incomplete';
    return { ...base, terms: entries, groups, total, localOnly, status };
  });

  const byComponent: Record<string, Record<string, IComponent>> = {};
  const byFamily = Object.fromEntries(
    [...families].sort().map((family) => {
      const group = rows.filter((row) => row.family === family);
      const count = (status: string) =>
        group.filter((row) => row.status === status).length;
      const termCounts = noCounts();
      const components = (byComponent[family] = {});
      const tally = (name: string, status: string, entry?: IWeightEntry) => {
        const bucket = ((components as Record<string, IComponent>)[name] ??= {
          ...noCounts(),
          maxAbsDelta: 0,
          maxRelPct: 0,
        });
        for (const target of [termCounts, bucket]) {
          if (status.startsWith('grouped:')) target.grouped++;
          else if (COUNT_FIELD[status]) {
            target[COUNT_FIELD[status]]++;
            if (['exact', 'within1Pct', 'different'].includes(status))
              target.compared++;
          }
        }
        if (entry?.delta != null)
          bucket.maxAbsDelta = Math.max(
            bucket.maxAbsDelta,
            Math.abs(entry.delta),
          );
        if (entry?.relPct != null)
          bucket.maxRelPct = Math.max(bucket.maxRelPct, Math.abs(entry.relPct));
      };
      for (const row of group) {
        for (const entry of row.terms)
          tally(component(entry.key), entry.status, entry);
        for (const entry of row.groups)
          tally(entry.name, entry.status, entry as never);
        if (row.total) tally('weightTotal', row.total.status, row.total);
      }
      return [
        family,
        {
          rows: coverage.byFamily[family].rows,
          joined: group.filter((row) => row.joined).length,
          nativeMaps: group.filter((row) => row.referenceSource === 'primary')
            .length,
          extraMaps: group.filter((row) => row.referenceSource === 'extra')
            .length,
          referenceUnsupported: count('reference-unsupported'),
          missingReference: count('missing-reference'),
          unjoined: count('unjoined'),
          matched: count('matched'),
          different: count('different'),
          incomplete: count('incomplete'),
          missingLocal: count('missing-local'),
          failedLocal: count('failed-local'),
          terms: termCounts,
        },
      ] as const;
    }),
  );
  for (const row of rows)
    if (row.status !== 'matched') errors.push(`${row.status}: ${row.path}`);
  const pendingInputs = Object.entries(byFamily)
    .filter(([, family]) => family.referenceUnsupported > 0)
    .map(([family, counts]) => ({
      input: '--weight-terms-extra',
      family,
      rows: counts.referenceUnsupported,
      reason:
        'The Java additive weight map is unsupported for these rows; they fail until the additive export (W2) is supplied.',
    }));
  return {
    scope: 'construction-weight-terms' as const,
    ok: errors.length === 0,
    tolerance: {
      absolute: WEIGHT_ABS_TOLERANCE,
      relative: WEIGHT_REL_TOLERANCE,
      relativeLimit: WEIGHT_REL_LIMIT,
      rule: 'exact within absolute/relative tolerance; otherwise strictly less than 1% of the Java term',
    },
    omittedComparisons: ['verifierQuantities', 'settings'],
    extraInput: { rows: rawExtra.length, accepted: extra.size },
    pendingInputs,
    errors: errors.sort(),
    byFamily,
    byComponent,
    rows,
  };
}

// ---------------------------------------------------------------------------
// Local capture. Uses only construction owners that already exist on main and
// never invents a term: whatever a family cannot produce stays absent, so the
// comparator reports it as missing-local.
// ---------------------------------------------------------------------------

/** Java owners of the equipment lump, per family (TestEntity.calculateWeightExact). */
const MECH_LUMP = [
  'getWeightMiscEquip',
  'getWeightWeapon',
  'getWeightAmmo',
  'getWeightPowerAmp',
  'getWeightCarryingSpace',
  'getArmoredComponentWeight',
] as const;
// The Tank breakdown has its own power amplifier and carrying-space figures.
const TANK_LUMP = [
  'getWeightMiscEquip',
  'getWeightWeapon',
  'getWeightAmmo',
  'getArmoredComponentWeight',
] as const;

/**
 * Editor projection of a converted BattleMech, in tons. Jump jets are
 * MiscType in Java, so they belong to the equipment lump, not getWeightMisc
 * (which is nonzero only for LAM and QuadVee conversion).
 */
function captureMechWeights(unit: unknown): ILocalWeights {
  let stage = 'mtf-converted-unit';
  try {
    if (unit == null || typeof unit !== 'object')
      throw new Error('Converter produced no unit');
    stage = 'mtf-load';
    const state = new UnitLoaderService().mapToUnitState(
      unit as IRawSerializedUnit,
      true,
    );
    stage = 'mtf-projection';
    const calc = renderMechCalculations(state);
    const payload = getEquipmentPayloadWeight(state.equipment);
    return {
      terms: {
        getWeightEngine: calc.engineWeight,
        getWeightStructure: calc.structureWeight,
        getWeightControls: calc.cockpitWeight + calc.gyroWeight,
        getWeightHeatSinks: calc.heatSinkWeight,
        getWeightArmor: calc.armorWeight,
        getWeightMisc: calc.conversionWeight,
      },
      groups: {
        mountedEquipment: {
          members: MECH_LUMP,
          ours: calc.jumpJetWeight + payload,
        },
      },
      total: calc.totalStructuralWeight + payload,
    };
  } catch (error) {
    throw new Error(`${stage}: ${String(error)}`);
  }
}

const unavailableReason = (unitType: string): string => {
  const type = unitType.toLowerCase().replace(/\s/g, '');
  if (type.includes('battlearmor'))
    return 'BattleArmor: computeTrooperMass needs editor-model mounts with massKg; no BLK-source adapter exists on main';
  if (type.includes('infantry'))
    return 'Infantry: no local additive weight seam, and Java marks its additive map unsupported until the W2 export';
  if (type.includes('proto'))
    return 'ProtoMech: only a private minimum-weight total (getProtoMinimumWeight); no additive local terms';
  if (/vtol|support/.test(type))
    return `${unitType}: only the Tank handler produces a native weight breakdown (computeNativeTankWeight)`;
  if (/fighter|aero|craft|dropship|jumpship|warship|station/.test(type))
    return 'Aerospace/capital: aerospaceSourceWeight is a mass bound (undefined for ConvFighter/FixedWingSupport), not additive terms';
  return `${unitType}: no local additive weight seam on main`;
};

function mapCombatVehicleWeightTerms(
  weights: VehicleWeightBreakdown,
): Pick<ILocalWeights, 'terms' | 'groups'> {
  const terms: Record<string, number> = {};
  const put = (key: string, value: number | null | undefined) => {
    if (typeof value === 'number') terms[key] = value;
  };
  put('getWeightEngine', weights.engine);
  put('getWeightStructure', weights.structure);
  put('getWeightControls', weights.controls);
  put('getWeightHeatSinks', weights.heatSinks);
  put('getWeightArmor', weights.armor);
  put('getWeightPowerAmp', weights.powerAmplifiers);
  put('getWeightCarryingSpace', weights.carryingSpace);
  // TestTank.getWeightMisc is turret + dual turret + lifting equipment.
  put(
    'getWeightMisc',
    (weights.turret ?? NaN) + (weights.secondaryTurret ?? NaN) + weights.lift,
  );
  return {
    terms,
    groups: {
      mountedEquipment: {
        members: TANK_LUMP,
        ours: weights.equipment ?? NaN,
      },
    },
  };
}

function mapTankWeights(
  weights: NonNullable<ReturnType<typeof computeNativeTankWeight>>,
  tonnage: number,
): ILocalWeights {
  return {
    ...mapCombatVehicleWeightTerms(weights),
    total: tonnage - (weights.remaining ?? NaN),
  };
}

function captureSupportWeights(unit: ISupportVehicle): ILocalWeights {
  const weights = computeSupportVehicleWeight(
    unit,
    createSupportRegistryMass(unit.techBase),
  );
  // ConstructionReference.java:99-106; TestSupportVehicle.java:773-774.
  // Read public typed fields only, so changes inside the owner flow through.
  return {
    terms: {
      getWeightEngine: weights.engine,
      getWeightStructure: weights.structure,
      getWeightControls: weights.controls,
      getWeightHeatSinks: weights.heatSinks,
      getWeightArmor: weights.armor,
      getWeightMisc: weights.misc,
      getWeightMiscEquip: weights.miscEquipment,
      getWeightWeapon: weights.weapons,
      getWeightAmmo: weights.ammo,
      getWeightPowerAmp: weights.powerAmplifiers,
      getWeightCarryingSpace: weights.carryingSpace,
      getFuelTonnage: weights.fuel,
    },
    total: weights.total,
    gaps: {
      getArmoredComponentWeight:
        'computeSupportVehicleWeight has no typed armored-component output',
    },
    unresolved: weights.unresolved,
  };
}

function captureVTOLWeights(
  document: IBlkDocument,
  unit: IVTOL,
): ILocalWeights {
  const weights = computeNativeVTOLWeight(document, unit);
  if (!weights) {
    try {
      rejectIncompleteCombatVehicleWeight();
    } catch (error) {
      return {
        terms: {},
        unavailable: error instanceof Error ? error.message : String(error),
      };
    }
  }
  return {
    ...mapCombatVehicleWeightTerms(weights),
    // Only a complete typed breakdown establishes that this published field
    // is computed mass; incomplete parses retain a nominal default here.
    total: unit.totalWeight,
  };
}

function captureBlkWeights(bytes: Buffer): ILocalWeights {
  let stage = 'blk-source-parser';
  try {
    const parsed = new BlkParserService().parse(bytes.toString('utf8'));
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    const document = parsed.data.document;
    stage = 'blk-handler-unavailable';
    if (!areHandlersInitialized()) initializeUnitTypeHandlers();
    const handler = getUnitTypeRegistry().getHandlerForDocument(document);
    if (!handler) throw new Error(document.unitType);
    if (
      !(handler instanceof VehicleUnitHandler) &&
      !(handler instanceof SupportVehicleUnitHandler) &&
      !(handler instanceof VTOLUnitHandler)
    )
      return { terms: {}, unavailable: unavailableReason(document.unitType) };
    stage = 'blk-handler-parser';
    const unit = handler.parse(document);
    if (!unit.success) {
      if (handler instanceof VTOLUnitHandler)
        return { terms: {}, unavailable: unit.error.errors.join('; ') };
      throw new Error(JSON.stringify(unit.error));
    }
    stage = 'blk-weights';
    if (isVTOL(unit.data.unit))
      return captureVTOLWeights(document, unit.data.unit);
    if (isSupportVehicle(unit.data.unit))
      return captureSupportWeights(unit.data.unit);
    const weights = computeNativeTankWeight(document, unit.data.unit);
    if (!weights)
      return {
        terms: {},
        unavailable:
          'computeNativeTankWeight returned undefined (incomplete mass, non-standard structure or unsupported armor)',
      };
    return mapTankWeights(weights, document.tonnage);
  } catch (error) {
    throw new Error(`${stage}: ${String(error)}`);
  }
}

/** Local weight terms for one pinned source, or a staged failure fact. */
export function captureConstructionWeights(
  input: { path: string; unit?: unknown },
  bytes: Buffer,
): LocalWeightFact {
  try {
    if (input.path.endsWith('.mtf')) return captureMechWeights(input.unit);
    if (input.path.endsWith('.blk')) return captureBlkWeights(bytes);
    throw new Error(`Unsupported source: ${input.path}`);
  } catch (error) {
    return { failure: String(error) };
  }
}
