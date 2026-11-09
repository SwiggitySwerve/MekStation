/** Source-handler validity only; numerical construction omissions remain explicit. */
import { createElement } from 'react';
// The node build explicitly: jest's jsdom resolves plain `react-dom/server` to the
// browser build, which needs MessageChannel and breaks every importer of this file.
import { renderToStaticMarkup } from 'react-dom/server.node';
import { z } from 'zod';

import type { IUnitValidationError } from '../src/types/validation/UnitValidationInterfaces';

import { useUnitCalculations } from '../src/hooks/useUnitCalculations';
import { getEquipmentLookupService } from '../src/services/equipment/EquipmentLookupService';
import {
  UnitLoaderService,
  type IRawSerializedUnit,
} from '../src/services/units/unitLoaderService';
import { initializeUnitValidationRules } from '../src/services/validation/initializeUnitValidation';
import { validateUnit } from '../src/services/validation/UnitValidationOrchestrator';
import { getTotalAllocatedArmor } from '../src/stores/unitState';
import { getEraForYear } from '../src/types/enums';
import { getMaxTotalArmor } from '../src/utils/construction/armorCalculations';
import { getEquipmentSlotIssues } from '../src/utils/construction/slotOperations/placement';
import { getEquipmentPayloadWeight } from '../src/utils/equipment/equipmentWeightAccounting';
import { buildArmorByLocation } from '../src/utils/validation/armorValidationUtils';
import { buildSlotsByLocation } from '../src/utils/validation/slotValidationUtils';
import {
  buildDeltaReport,
  FAMILIES,
  JavaReference,
  type IComputedRow,
} from './unit-bv-parity';

type ValidityFact = NonNullable<IComputedRow['constructionValidity']>;

const messages = (items: readonly IUnitValidationError[]) =>
  items.map((item) => `${item.ruleId}: ${item.message}`);

/** The editor's own calculation hook, rendered once on the server build of `react-dom`. */
export function renderMechCalculations(
  state: ReturnType<UnitLoaderService['mapToUnitState']>,
): ReturnType<typeof useUnitCalculations> {
  let calc: ReturnType<typeof useUnitCalculations> | undefined;
  const Probe = () => {
    calc = useUnitCalculations(
      state.tonnage,
      state,
      state.armorTonnage,
      state.configuration,
    );
    return null;
  };
  renderToStaticMarkup(createElement(Probe));
  if (!calc) throw new Error('Editor calculations did not render');
  return calc;
}

/**
 * A BattleMech has no source handler: the app validates the loaded editor
 * state through the orchestrator, from the editor's own calculation hook.
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
    const raw = unit as IRawSerializedUnit;
    const loaded = new UnitLoaderService().mapToUnitState(raw, true);
    const ids = new Map(
      loaded.equipment.map((item, index) => [
        item.instanceId,
        `mount-${index}`,
      ]),
    );
    const state = {
      ...loaded,
      equipment: loaded.equipment.map((item) => ({
        ...item,
        instanceId: ids.get(item.instanceId) ?? item.instanceId,
        linkedAmmoId:
          item.linkedAmmoId === undefined
            ? undefined
            : (ids.get(item.linkedAmmoId) ?? item.linkedAmmoId),
      })),
    };
    stage = 'mtf-projection';
    const calc = renderMechCalculations(state);
    stage = 'mtf-validator';
    initializeUnitValidationRules();
    const result = validateUnit({
      id: label,
      name: label,
      unitType: raw.unitType as never,
      techBase: state.techBase,
      rulesLevel: state.rulesLevel,
      introductionYear: state.year,
      era: getEraForYear(state.year),
      weight: state.tonnage,
      cost: 0,
      battleValue: 0,
      engineType: state.engineType,
      gyroType: state.gyroType,
      cockpitType: state.cockpitType,
      internalStructureType: state.internalStructureType,
      heatSinkCount: state.heatSinkCount,
      heatSinkType: state.heatSinkType,
      totalArmorPoints: getTotalAllocatedArmor(
        state.armorAllocation,
        state.configuration,
      ),
      maxArmorPoints: getMaxTotalArmor(state.tonnage, state.configuration),
      armorByLocation: buildArmorByLocation(
        state.armorAllocation,
        state.tonnage,
        state.configuration,
      ),
      allocatedWeight:
        calc.totalStructuralWeight + getEquipmentPayloadWeight(state.equipment),
      maxWeight: state.tonnage,
      slotsByLocation: buildSlotsByLocation(
        state.equipment,
        state.configuration,
      ),
      equipmentSlotIssues: getEquipmentSlotIssues(
        state.equipment,
        state.configuration,
        state.engineType,
        state.gyroType,
        state.armActuators,
        state.cockpitType,
      ),
      mountedEquipment: state.equipment,
      equipmentCatalog: getEquipmentLookupService().getAllEquipment(),
    });
    return {
      isValid: result.isValid,
      errors: result.results.flatMap((rule) => messages(rule.errors)),
      warnings: result.results.flatMap((rule) => messages(rule.warnings)),
      infos: result.results.flatMap((rule) => messages(rule.infos)),
    };
  } catch (error) {
    throw new Error(`${stage}: ${String(error)}`);
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
