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
 * and rule results keep their own error or warning severity. A row with one
 * issue takes that issue's panel title (`describeIssue`, `noteHeading`), so
 * "Overweight by 7.0 t" has the same name in both places.
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
  getHeatNote,
  getHeatStatus,
  getSlotFillStatus,
  getStatusNotes,
  getWeightStatus,
  type StatStatus,
} from '@/components/customizer/shared/unitStatStatus';
import {
  describeIssue,
  flattenErrors,
  noteHeading,
  OVERWEIGHT_FIX,
  plural,
} from '@/components/customizer/shared/ValidationSummaryRows';
import { calculateArmorPercentage } from '@/services/pilot-mech-card/PilotMechCardDataService';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import { formatTons } from '@/utils/formatting';

import { formatValidationMessage } from '../../shared/validationMessageFormatting';

export type ReadinessRowId = 'weight' | 'slots' | 'armor' | 'heat' | 'unplaced';

/** A row's build-status severity, or ok when it has nothing to report. */
export type ReadinessSeverity = 'ok' | BuildStatusKind;

export interface ReadinessRow {
  readonly id: ReadinessRowId;
  readonly label: string;
  readonly status: StatStatus;
  /** Severity shown by the row's icon, matching the status panel groups. */
  readonly severity: ReadinessSeverity;
  /**
   * Neutral incomplete icon. No row sets it: the Slots row counts slots only
   * and the Unplaced Equipment row carries the placement error.
   */
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
  /** Each issue's panel heading and explanation, in the same order. */
  readonly described: readonly ReturnType<typeof describeIssue>[];
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
    messages: issues.map((issue) =>
      formatValidationMessage(issue.error.message),
    ),
    described: issues.map((issue) => describeIssue(issue.error)),
  };
}

/**
 * The panel's title for a row's only issue: a readout warning's heading
 * (`readoutTitle`) or the one rule result's. Null while the row passes or
 * holds several issues, which keep the row's own label.
 */
function issueTitle(
  issues: CategoryIssues,
  rowSeverity: ReadinessSeverity,
  readoutTitle?: string,
): string | null {
  if (rowSeverity === 'ok') return null;
  const titles = [
    ...(readoutTitle ? [readoutTitle] : []),
    ...issues.described.map((issue) => issue.heading),
  ];
  return titles.length === 1 ? titles[0] : null;
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
  // A row titled by its one rule result shows only what the title leaves out.
  const titledByRule =
    issues.described.length === 1 && base.label === issues.described[0].heading;
  const detail = titledByRule
    ? base.status === 'normal'
      ? issues.described[0].explanation
      : undefined
    : base.status === 'normal' && first
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

function weightSentence(
  input: ReadinessInput,
  status: StatStatus,
  titled: boolean,
): string {
  const max = formatTons(input.tonnage);
  if (status === 'error') {
    // "Overweight by 7.0 t" already states the amount.
    const over = titled
      ? 'Over the'
      : `${formatTons(-input.weightRemaining)} over the`;
    return `${over} ${max} limit. ${OVERWEIGHT_FIX}`;
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

/**
 * Slots only: placed slots and the free ones. Unplaced items are the
 * Unplaced Equipment row's to name, so the two rows never repeat each other.
 */
function slotsSentence(input: ReadinessInput, status: StatStatus): string {
  const { criticalSlotsUsed: used, criticalSlotsTotal: total } = input;
  if (status === 'error') {
    return `${plural(used - total, 'slot')} over capacity (${used} of ${total}).`;
  }
  return describeSlotFill({ ...slotFillOf(input), pendingSlots: 0 }, false);
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
function heatSentence(status: StatStatus, titled: boolean): string {
  if (status === 'normal') return 'Dissipation covers a full-fire turn.';
  // "Runs 11 heat over dissipation" already says it runs hot.
  return titled
    ? 'Legal, but add heat sinks to run cool.'
    : 'Runs hot at full fire. Legal, but add heat sinks to run cool.';
}

/**
 * Names unplaced items and their slot demand using the existing placement data.
 */
function unplacedDescription(input: ReadinessInput): string {
  const names = input.unplacedItemNames ?? [];
  const subject =
    names.length > 0 && names.length <= 2
      ? names.join(' and ')
      : plural(input.unplacedInstanceIds.length, 'item');
  const pending = input.criticalSlotsPending ?? 0;
  const slots = pending > 0 ? ` (${plural(pending, 'slot')})` : '';
  return `${subject}${slots} not placed`;
}

function unplacedSentence(input: ReadinessInput, titled: boolean): string {
  const count = input.equipmentCount;
  const unplaced = input.unplacedInstanceIds.length;
  if (count === 0) return 'No equipment mounted yet.';
  if (unplaced === 0) {
    return `All ${plural(count, 'item')} placed in critical slots.`;
  }
  // "PPC needs a location" already names the item.
  if (titled) {
    const pending = input.criticalSlotsPending ?? 0;
    return pending > 0
      ? `Takes ${plural(pending, 'slot')}. Not legal until placed.`
      : 'Not legal until placed.';
  }
  return `${unplacedDescription(input)} — not legal until placed.`;
}

export function getReadinessRows(
  input: ReadinessInput,
  result: UnitValidationState['result'],
): ReadinessRow[] {
  const weightStatus = getWeightStatus(input.weightUsed, input.tonnage);
  // Neutral while items are unplaced: the Unplaced equipment row owns that
  // error, so one condition is counted once. Only over capacity is red.
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
  const unplacedIssues = issuesFor(
    result,
    ValidationCategory.SLOTS,
    isUnplacedField,
  );
  const weightIssues = issuesFor(result, ValidationCategory.WEIGHT);
  const slotIssues = issuesFor(
    result,
    ValidationCategory.SLOTS,
    (field) => !isUnplacedField(field),
  );
  const armorIssues = issuesFor(result, ValidationCategory.ARMOR);
  const heatIssues = issuesFor(result, ValidationCategory.HEAT);
  const heatNote = getHeatNote(input.heatGenerated, input.heatDissipation);

  const severityOf = (status: StatStatus, issues: CategoryIssues) =>
    worstSeverity(readoutSeverity(status), issues.severity);
  const weightTitle = issueTitle(
    weightIssues,
    severityOf(weightStatus, weightIssues),
  );
  const slotsTitle = issueTitle(slotIssues, severityOf(slotStatus, slotIssues));
  const armorTitle = issueTitle(
    armorIssues,
    severityOf(armorStatus, armorIssues),
  );
  const heatTitle = issueTitle(
    heatIssues,
    severityOf(heatStatus, heatIssues),
    heatNote ? noteHeading(heatNote) : undefined,
  );
  const unplacedTitle = issueTitle(
    unplacedIssues,
    severityOf(unplacedIssues.status, unplacedIssues),
  );

  const rows: ReadinessRow[] = [
    withRules(
      {
        id: 'weight',
        label: weightTitle ?? 'Weight',
        status: weightStatus,
        sentence: weightSentence(input, weightStatus, weightTitle !== null),
        tabId: 'equipment',
      },
      weightIssues,
    ),
    withRules(
      {
        id: 'slots',
        label: slotsTitle ?? 'Slots',
        status: slotStatus,
        sentence: slotsSentence(input, slotStatus),
        tabId: 'criticals',
      },
      slotIssues,
    ),
    withRules(
      {
        id: 'armor',
        label: armorTitle ?? 'Armor',
        status: armorStatus,
        sentence: armorSentence(input, armorStatus),
        tabId: 'armor',
      },
      armorIssues,
    ),
    withRules(
      {
        id: 'heat',
        label: heatTitle ?? 'Heat',
        status: heatStatus,
        sentence: heatSentence(heatStatus, heatTitle !== null),
        tabId: 'structure',
      },
      heatIssues,
    ),
    withRules(
      {
        id: 'unplaced',
        label: unplacedTitle ?? 'Unplaced Equipment',
        status: unplacedIssues.status,
        sentence: unplacedSentence(input, unplacedTitle !== null),
        tabId: 'criticals',
      },
      unplacedIssues,
    ),
  ];
  return rows.sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  );
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
