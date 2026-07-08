import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type { WeightClass } from '@/types/enums/WeightClass';

import { WIZARD_REPRESENTATIVE_UNITS } from '@/lib/campaign/wizard/representativeUnits';
import { getUnitIndexWeightClass } from '@/services/units/unitWeightClass';
import { UNIT_TEMPLATES } from '@/simulation/generator';
import { logger } from '@/utils/logger';

interface LegacyRosterBackfillOptions {
  readonly campaignId?: string;
  readonly source?: string;
  readonly log?: boolean;
}

interface LegacyRosterUnitWithTonnage extends IRosterUnitProjection {
  readonly tonnage?: unknown;
}

interface BackfilledRosterUnitDiagnostic {
  readonly unitId: string;
  readonly unitName: string;
  readonly chassisVariant: string;
  readonly tonnage: number;
  readonly weightClass: WeightClass;
  readonly unitRef: string;
  readonly representativeUnitName: string;
}

const TEMPLATE_TONNAGE_BY_NAME = new Map(
  UNIT_TEMPLATES.map((template) => [
    template.name.toLowerCase(),
    template.tonnage,
  ]),
);

function directTonnageFrom(unit: IRosterUnitProjection): number | null {
  const candidate = (unit as LegacyRosterUnitWithTonnage).tonnage;
  return typeof candidate === 'number' && Number.isFinite(candidate)
    ? candidate
    : null;
}

function labelTonnageFrom(unit: IRosterUnitProjection): number | null {
  const labels = [unit.unitName, unit.chassisVariant].map((label) =>
    label.toLowerCase(),
  );

  for (const label of labels) {
    const directTemplateMatch = TEMPLATE_TONNAGE_BY_NAME.get(label);
    if (directTemplateMatch) return directTemplateMatch;

    const tonnageMatch = label.match(/\b(\d{2,3})\s*t\b/);
    if (tonnageMatch) return Number(tonnageMatch[1]);
  }

  return null;
}

function legacyTonnageFrom(unit: IRosterUnitProjection): number | null {
  return directTonnageFrom(unit) ?? labelTonnageFrom(unit);
}

function representativeUnitForTonnage(tonnage: number) {
  const weightClass = getUnitIndexWeightClass(tonnage);
  return WIZARD_REPRESENTATIVE_UNITS.find(
    (unit) => unit.weightClass === weightClass,
  );
}

function logBackfilledUnits(
  mappedUnits: readonly BackfilledRosterUnitDiagnostic[],
  options: LegacyRosterBackfillOptions,
): void {
  if (mappedUnits.length === 0 || options.log === false) return;

  logger.diagnostic({
    level: 'info',
    service: 'campaign-roster-backfill',
    event: 'legacy_roster_unit_refs_backfilled',
    message:
      'Backfilled canonical unit refs onto legacy campaign roster units.',
    entityIds: options.campaignId ? { campaignId: options.campaignId } : {},
    metadata: {
      source: options.source ?? 'unknown',
      mappedUnitCount: mappedUnits.length,
      mappedUnits,
    },
  });
}

export function backfillLegacyRosterUnitRefs(
  units: readonly IRosterUnitProjection[],
  options: LegacyRosterBackfillOptions = {},
): IRosterUnitProjection[] {
  const mappedUnits: BackfilledRosterUnitDiagnostic[] = [];
  let changed = false;

  const backfilledUnits = units.map((unit) => {
    if (unit.unitRef) return unit;

    const tonnage = legacyTonnageFrom(unit);
    if (!tonnage) return unit;

    const representativeUnit = representativeUnitForTonnage(tonnage);
    if (!representativeUnit) return unit;

    changed = true;
    mappedUnits.push({
      unitId: unit.unitId,
      unitName: unit.unitName,
      chassisVariant: unit.chassisVariant,
      tonnage,
      weightClass: representativeUnit.weightClass,
      unitRef: representativeUnit.unitRef,
      representativeUnitName: representativeUnit.unitName,
    });

    return {
      ...unit,
      unitRef: representativeUnit.unitRef,
    };
  });

  logBackfilledUnits(mappedUnits, options);
  return changed ? backfilledUnits : (units as IRosterUnitProjection[]);
}
