/**
 * Build status summary
 *
 * The one owner of how many issues a build has and how they are worded. The
 * header status button, the status panel heading, the phone status button and
 * the Overview readiness header all render from this result, so the same build
 * never reports different totals on different surfaces.
 *
 * Vocabulary (also the panel's group definitions, `BUILD_STATUS_GROUPS`):
 * - errors: rule results that make the unit not legal (must fix);
 * - warnings: legal, but likely a mistake (should review): rule warnings
 *   plus readout warnings such as running hot (`getHeatNote` in
 *   `unitStatStatus`);
 * - notes: legal, for your information, i.e. info-level rule results.
 *
 * Counts come from the validation state and the readout items passed in;
 * nothing here decides what is legal. Readout items are a presentation tier:
 * they are listed and counted with the warnings, but they never come from or
 * change the validator.
 *
 * @spec openspec/specs/unit-info-banner/spec.md
 */

import type { CustomizerTabId } from '@/hooks/useCustomizerRouter';
import type { ValidationCountsByTab } from '@/utils/validation/validationNavigation';

/**
 * A status item derived from readouts already on screen (e.g. running hot).
 * It is presented as a warning (counted, worded and colored with the rule
 * warnings) but it is not a validation result: it never makes a unit invalid
 * and never changes what the validator reports.
 */
export interface ValidationNote {
  id: string;
  /** Short visible phrase that can stand alone, e.g. "Runs hot". */
  label: string;
  /** Amount shown after the label and kept when it truncates, e.g. "+11". */
  amount?: string;
  /** Plain panel heading, e.g. "Runs 11 heat over dissipation". */
  heading?: string;
  message: string;
  suggestion?: string;
  /** Tab where the user can address the item. */
  tabId: CustomizerTabId;
}

/** Issue groups, worst first. */
export type BuildStatusKind = 'error' | 'warning' | 'note';

/** The build's overall state: its worst group, or ready when it has none. */
export type BuildState = BuildStatusKind | 'ready';

/** Groups worst first, each with the one-line meaning the panel shows. */
export const BUILD_STATUS_GROUPS: readonly {
  readonly kind: BuildStatusKind;
  readonly title: string;
  /** Singular word read before an item, e.g. "Warning: ...". */
  readonly itemLabel: string;
  readonly definition: string;
}[] = [
  {
    kind: 'error',
    title: 'Errors',
    itemLabel: 'Error',
    definition: 'the unit is not legal until fixed',
  },
  {
    kind: 'warning',
    title: 'Warnings',
    itemLabel: 'Warning',
    definition: 'legal, but likely a mistake',
  },
  {
    kind: 'note',
    title: 'Notes',
    itemLabel: 'Note',
    definition: 'legal; for your information',
  },
];

/** Rule-result totals, as kept by `useUnitValidation`. */
export interface BuildStatusCounts {
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
}

export interface BuildStatusPart {
  readonly kind: BuildStatusKind;
  readonly count: number;
  /** Count with its word, e.g. "1 error" / "3 notes". */
  readonly text: string;
}

export interface BuildStatusSummary {
  readonly state: BuildState;
  /** No errors: the unit is legal, whatever its warnings and notes. */
  readonly legal: boolean;
  /** Non-empty groups, worst first. */
  readonly parts: readonly BuildStatusPart[];
  /**
   * Headline every surface shows: "1 error \u00b7 1 warning \u00b7 1 note",
   * the readout item itself when it is the only item ("Runs hot +11"), or
   * "Ready".
   */
  readonly headline: string;
  /** The single readout item the headline names, when it names one. */
  readonly headlineNote?: ValidationNote;
  /** Panel heading: "Not legal \u00b7 <headline>" or "Legal \u00b7 <headline>". */
  readonly panelHeading: string;
}

export const BUILD_STATUS_SEPARATOR = ' \u00b7 ';

const KIND_WORD: Record<BuildStatusKind, string> = {
  error: 'error',
  warning: 'warning',
  note: 'note',
};

function countText(count: number): string {
  return count > 99 ? '99+' : String(count);
}

/** "1 error", "2 warnings"; counts above 99 read "99+". */
export function buildStatusCountText(
  kind: BuildStatusKind,
  count: number,
): string {
  return `${countText(count)} ${KIND_WORD[kind]}${count === 1 ? '' : 's'}`;
}

/** A readout item's short visible text, e.g. "Runs hot +11". */
export function noteText(note: ValidationNote): string {
  return note.amount ? `${note.label} ${note.amount}` : note.label;
}

export function getBuildStatusSummary(
  counts: BuildStatusCounts,
  notes: readonly ValidationNote[],
): BuildStatusSummary {
  const totals: Record<BuildStatusKind, number> = {
    error: counts.errorCount,
    warning: counts.warningCount + notes.length,
    note: counts.infoCount,
  };
  const parts = BUILD_STATUS_GROUPS.filter(({ kind }) => totals[kind] > 0).map(
    ({ kind }) => ({
      kind,
      count: totals[kind],
      text: buildStatusCountText(kind, totals[kind]),
    }),
  );
  const state: BuildState = parts[0]?.kind ?? 'ready';
  const onlyItem =
    parts.length === 1 && parts[0].count === 1 ? notes[0] : undefined;
  const headlineNote =
    onlyItem && counts.warningCount === 0 ? onlyItem : undefined;
  const headline = headlineNote
    ? noteText(headlineNote)
    : parts.length > 0
      ? parts.map((part) => part.text).join(BUILD_STATUS_SEPARATOR)
      : 'Ready';
  const legal = totals.error === 0;
  return {
    state,
    legal,
    parts,
    headline,
    headlineNote,
    panelHeading: `${legal ? 'Legal' : 'Not legal'}${BUILD_STATUS_SEPARATOR}${headline}`,
  };
}

/**
 * Section-tab badge counts: the validator's counts plus the readout warnings
 * (e.g. running hot), each on the tab where the user fixes it. The status chip
 * counts the same notes as warnings, so the badges and chip agree.
 */
export function addStatusNotesToTabCounts(
  counts: ValidationCountsByTab,
  notes: readonly ValidationNote[],
): ValidationCountsByTab {
  if (notes.length === 0) return counts;
  const next = { ...counts };
  for (const note of notes) {
    next[note.tabId] = {
      ...next[note.tabId],
      warnings: next[note.tabId].warnings + 1,
    };
  }
  return next;
}
