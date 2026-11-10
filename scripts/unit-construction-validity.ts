/** Source-handler validity only; numerical construction omissions remain explicit. */
import { createElement } from 'react';
// The node build explicitly: jest's jsdom resolves plain `react-dom/server` to the
// browser build, which needs MessageChannel and breaks every importer of this file.
import { renderToStaticMarkup } from 'react-dom/server.node';
import { z } from 'zod';

import type { IUnitValidationError } from '../src/types/validation/UnitValidationInterfaces';

import { useUnitCalculations } from '../src/hooks/useUnitCalculations';
import { getEquipmentLookupService } from '../src/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '../src/services/equipment/EquipmentRegistry';
import {
  UnitLoaderService,
  type IRawSerializedUnit,
} from '../src/services/units/unitLoaderService';
import { initializeUnitValidationRules } from '../src/services/validation/initializeUnitValidation';
import { validateUnit } from '../src/services/validation/UnitValidationOrchestrator';
import {
  getMechConstructionSelections,
  projectMechValidation,
} from '../src/utils/validation/mechValidationProjection';
import {
  buildDeltaReport,
  FAMILIES,
  JavaReference,
  type IComputedRow,
} from './unit-bv-parity';

type ValidityFact = NonNullable<IComputedRow['constructionValidity']>;

const messages = (items: readonly IUnitValidationError[]) =>
  items.map((item) => `${item.ruleId}: ${item.message}`);

/** Render only the complete calculation hook, whose sum has no pure owner. */
function renderMechHook<T>(useValue: () => T): T {
  let rendered: { value: T } | undefined;
  const Probe = () => {
    rendered = { value: useValue() };
    return null;
  };
  renderToStaticMarkup(createElement(Probe));
  if (!rendered) throw new Error('Editor hook did not render');
  return rendered.value;
}

export function renderMechCalculations(
  state: ReturnType<UnitLoaderService['mapToUnitState']>,
): ReturnType<typeof useUnitCalculations> {
  const selections = getMechConstructionSelections(state);
  return renderMechHook(function useCalculations() {
    return useUnitCalculations(
      state.tonnage,
      selections,
      selections.armorTonnage,
      selections.configuration,
    );
  });
}

/**
 * A BattleMech has no source handler: the app validates the loaded editor
 * state through the orchestrator, using the editor's shared validation projection.
 * That projection runs here on the converted unit, whose bytes `calculateSources`
 * has already hash-checked. Stages are named so a failure never reads as invalid.
 */
export function captureMechValidity(
  unit: unknown,
  label: string,
): Exclude<ValidityFact, { failure: string }> {
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
    // Only the complete calculation sum needs React; projection itself is pure.
    const calculations = renderMechCalculations({
      ...state,
      tonnage: state.tonnage || 20,
      lamType: undefined,
    });
    const ready = getEquipmentRegistry().isReady();
    const input = projectMechValidation(state, {
      totalStructuralWeight: calculations.totalStructuralWeight,
      equipmentRegistryReady: ready,
      equipmentCatalog: ready
        ? getEquipmentLookupService().getAllEquipment()
        : [],
    });
    stage = 'mtf-validator';
    initializeUnitValidationRules();
    const result = validateUnit(input);
    return {
      isValid: result.isValid,
      errors: result.results.flatMap((rule) => messages(rule.errors)),
      warnings: result.results.flatMap((rule) => messages(rule.warnings)),
      infos: result.results.flatMap((rule) => messages(rule.infos)),
    };
  } catch (error) {
    throw new Error(`${stage}: ${String(error)} (${label})`);
  }
}

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
