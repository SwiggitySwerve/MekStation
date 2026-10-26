/**
 * Build readiness rows
 *
 * Restates, as a checklist, what the banner readouts and the validation
 * result already say about the unit. Each row's state comes from the shared
 * readout thresholds in `unitStatStatus` and from rule results in the
 * matching validation category; nothing here decides what is legal.
 *
 * Each row also carries the severity the status panel would give it, so the
 * checklist uses the same words, colors and icons: a readout over its cap is
 * an error, a legal-but-high readout (running hot) is a warning,
 * and rule results keep their own error or warning severity.
 *
 * @spec openspec/specs/unit-info-banner/spec.md
 */

import type { CustomizerTabId } from '@/hooks/useCustomizerRouter';
import type { UnitValidationState } from '@/hooks/useUnitValidation';

import {
  getBuildStatusSummary,
  type BuildStatusCounts,
  type BuildStatusKind,
  type BuildStatusSummary,
} from '@/components/customizer/shared/buildStatusSummary';
import {
  describeSlotFill,
  getCapacityStatus,
  getHeatStatus,
  getSlotFillStatus,
  getStatusNotes,
  getWeightStatus,
  type StatStatus,
} from '@/components/customizer/shared/unitStatStatus';
import {
  flattenErrors,
  plural,
} from '@/components/customizer/shared/ValidationSummaryRows';
import { calculateArmorPercentage } from '@/services/pilot-mech-card/PilotMechCardDataService';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';

import { formatTons } from './tonnageBreakdown';

export type ReadinessRowId = 'weight' | 'slots' | 'armor' | 'heat' | 'unplaced';

/** A row's build-status severity, or ok when it has nothing to report. */
export type ReadinessSeverity = 'ok' | BuildStatusKind;

export interface ReadinessRow {
  readonly id: ReadinessRowId;
  readonly label: string;
  readonly status: StatStatus;
  /** Severity shown by the row's icon, matching the status panel groups. */
  readonly severity: ReadinessSeverity;
  /** Neutral incomplete icon; does not add another warning for unplaced items. */
  readonly pending?: boolean;
  /** One plain sentence describing the current state. */
  readonly sentence: string;
  /** Rule result the readout does not already explain, if any. */
  readonly detail?: string;
  /** Severity of the rule result in `detail`. */
  readonly detailSeverity?: BuildStatusKind;
  /** Tab where the user addresses this row. */
  readonly tabId: CustomizerTabId;
}

export interface ReadinessInput {
  readonly tonnage: number;
  readonly weightUsed: number;
  readonly weightRemaining: number;
  /** Slots the build needs, including slots of items not placed yet. */
  readonly criticalSlotsUsed: number;
  readonly criticalSlotsTotal: number;
  /** Slots actually filled; defaults to `criticalSlotsUsed`. */
  readonly criticalSlotsPlaced?: number;
  /** Slots needed by mounted items that are not placed yet. */
  readonly criticalSlotsPending?: number;
  readonly armorPoints: number;
  readonly maxArmorPoints: number;
  readonly heatGenerated: number;
  readonly heatDissipation: number;
  readonly equipmentCount: number;
  /** Instance ids of mounted equipment without assigned critical slots. */
  readonly unplacedInstanceIds: readonly string[];
  /** Names of the unplaced items, for the Unplaced equipment sentence. */
  readonly unplacedItemNames?: readonly string[];
}

const STATUS_RANK: Record<StatStatus, number> = {
  normal: 0,
  warning: 1,
  error: 2,
};

function worst(a: StatStatus, b: StatStatus): StatStatus {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

const SEVERITY_RANK: Record<ReadinessSeverity, number> = {
  ok: 0,
  note: 1,
  warning: 2,
  error: 3,
};

function worstSeverity(
  a: ReadinessSeverity,
  b: ReadinessSeverity,
): ReadinessSeverity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

/** Over its cap is an error; legal but high (e.g. running hot) is a warning. */
function readoutSeverity(status: StatStatus): ReadinessSeverity {
  return status === 'normal' ? 'ok' : status;
}

interface CategoryIssues {
  readonly status: StatStatus;
  readonly severity: ReadinessSeverity;
  readonly messages: readonly string[];
}

function issuesFor(
  result: UnitValidationState['result'],
  category: ValidationCategory,
  include: (field: string | undefined) => boolean = () => true,
): CategoryIssues {
  const issues = flattenErrors(result).filter(
    (issue) =>
      issue.error.category === category &&
      issue.severity !== 'info' &&
      include(issue.error.field),
  );
  const status = issues.reduce<StatStatus>(
    (current, issue) =>
      worst(current, issue.severity === 'error' ? 'error' : 'warning'),
    'normal',
  );
  const severity = issues.reduce<ReadinessSeverity>(
    (current, issue) =>
      worstSeverity(current, issue.severity === 'error' ? 'error' : 'warning'),
    'ok',
  );
  return {
    status,
    severity,
    messages: issues.map((issue) => issue.error.message),
  };
}

/**
 * Combine a readout state with the rule results in its category. A rule
 * message is shown only when the readout itself looks fine, so the row never
 * repeats the same fact twice.
 */
function withRules(
  base: Omit<ReadinessRow, 'detail' | 'detailSeverity' | 'severity'>,
  issues: CategoryIssues,
  baseSeverity: ReadinessSeverity = readoutSeverity(base.status),
): ReadinessRow {
  const status = worst(base.status, issues.status);
  const severity = worstSeverity(baseSeverity, issues.severity);
  const [first, ...rest] = issues.messages;
  const detail =
    base.status === 'normal' && first
      ? rest.length > 0
        ? `${first} (and ${rest.length} more)`
        : first
      : undefined;
  return {
    ...base,
    status,
    severity,
    detail,
    detailSeverity:
      detail && issues.severity !== 'ok' ? issues.severity : undefined,
  };
}

function weightSentence(input: ReadinessInput, status: StatStatus): string {
  const max = formatTons(input.tonnage);
  if (status === 'error') {
    return `${formatTons(-input.weightRemaining)} over the ${max} limit. Remove equipment or armor.`;
  }
  if (input.weightRemaining === 0) return `All ${max} used.`;
  return `${formatTons(input.weightRemaining)} free of ${max}.`;
}

function slotFillOf(input: ReadinessInput) {
  return {
    used: input.criticalSlotsUsed,
    total: input.criticalSlotsTotal,
    placed: input.criticalSlotsPlaced,
    pendingSlots: input.criticalSlotsPending,
    unplacedItems: input.unplacedInstanceIds.length,
  };
}

function slotsSentence(input: ReadinessInput, status: StatStatus): string {
  const { criticalSlotsUsed: used, criticalSlotsTotal: total } = input;
  if (status === 'error') {
    return `${plural(used - total, 'slot')} over capacity (${used} of ${total}).`;
  }
  // Pending slots are plain text here: the Unplaced equipment row, next to
  // this one, carries the warning for the same items.
  return describeSlotFill(slotFillOf(input), false);
}

function armorSentence(input: ReadinessInput, status: StatStatus): string {
  const { armorPoints: points, maxArmorPoints: max } = input;
  const percent = calculateArmorPercentage(points, max);
  if (status === 'error') {
    return `${points} points allocated, ${points - max} over the ${max} maximum.`;
  }
  return `${points} of ${max} armor points allocated (${percent}%).`;
}

/**
 * The Heat readout shows the numbers; this row says what to do about them,
 * so the two never repeat the same sentence.
 */
function heatSentence(status: StatStatus): string {
  return status === 'normal'
    ? 'Dissipation covers a full-fire turn.'
    : 'Runs hot at full fire. Legal, but add heat sinks to run cool.';
}

/**
 * Names the unplaced items with the slots they will take ("PPC needs 3
 * slots; 1 item unplaced"), so this one row carries the whole warning.
 */
function unplacedSentence(input: ReadinessInput): string {
  const count = input.equipmentCount;
  const unplaced = input.unplacedInstanceIds.length;
  if (count === 0) return 'No equipment mounted yet.';
  if (unplaced === 0) {
    return `All ${plural(count, 'item')} placed in critical slots.`;
  }
  const pending = input.criticalSlotsPending ?? 0;
  const names = input.unplacedItemNames ?? [];
  const slots = pending > 0 ? plural(pending, 'slot') : 'critical slots';
  const subject =
    names.length > 0 && names.length <= 2 ? names.join(' and ') : undefined;
  const need = subject
    ? `${subject} ${names.length === 1 ? 'needs' : 'need'} ${slots}`
    : `Needs ${slots}`;
  return `${need}; ${plural(unplaced, 'item')} unplaced.`;
}

export function getReadinessRows(
  input: ReadinessInput,
  result: UnitValidationState['result'],
): ReadinessRow[] {
  const weightStatus = getWeightStatus(input.weightUsed, input.tonnage);
  // Neutral while items are unplaced: the Unplaced equipment row owns that
  // warning, so one condition is counted once. Only over capacity is red.
  const slotStatus = getSlotFillStatus(slotFillOf(input));
  const armorStatus = getCapacityStatus(
    input.armorPoints,
    input.maxArmorPoints,
  );
  const heatStatus = getHeatStatus(input.heatGenerated, input.heatDissipation);
  // Slot rule results about an unplaced item belong to the Unplaced row.
  const unplacedFields = new Set(
    input.unplacedInstanceIds.map((id) => `criticalSlots.${id}`),
  );
  const isUnplacedField = (field: string | undefined) =>
    field !== undefined && unplacedFields.has(field);

  return [
    withRules(
      {
        id: 'weight',
        label: 'Weight',
        status: weightStatus,
        sentence: weightSentence(input, weightStatus),
        tabId: 'equipment',
      },
      issuesFor(result, ValidationCategory.WEIGHT),
    ),
    withRules(
      {
        id: 'slots',
        label: 'Slots',
        pending:
          (input.criticalSlotsPending ?? 0) > 0 ||
          input.unplacedInstanceIds.length > 0,
        status: slotStatus,
        sentence: slotsSentence(input, slotStatus),
        tabId: 'criticals',
      },
      issuesFor(
        result,
        ValidationCategory.SLOTS,
        (field) => !isUnplacedField(field),
      ),
    ),
    withRules(
      {
        id: 'armor',
        label: 'Armor',
        status: armorStatus,
        sentence: armorSentence(input, armorStatus),
        tabId: 'armor',
      },
      issuesFor(result, ValidationCategory.ARMOR),
    ),
    withRules(
      {
        id: 'heat',
        label: 'Heat',
        status: heatStatus,
        sentence: heatSentence(heatStatus),
        tabId: 'structure',
      },
      issuesFor(result, ValidationCategory.HEAT),
    ),
    withRules(
      {
        id: 'unplaced',
        label: 'Unplaced equipment',
        status: input.unplacedInstanceIds.length > 0 ? 'warning' : 'normal',
        sentence: unplacedSentence(input),
        tabId: 'criticals',
      },
      issuesFor(result, ValidationCategory.SLOTS, isUnplacedField),
      // Unplaced equipment is the warning the status panel lists.
      input.unplacedInstanceIds.length > 0 ? 'warning' : 'ok',
    ),
  ];
}

/**
 * Readiness header: the build-status summary every status surface shows,
 * from the same validation counts and readout warnings.
 */
export function getReadinessStatus(
  validation: BuildStatusCounts,
  heatGenerated: number,
  heatDissipation: number,
): BuildStatusSummary {
  return getBuildStatusSummary(
    validation,
    getStatusNotes(heatGenerated, heatDissipation),
  );
}
