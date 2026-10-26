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
 * - warnings: legal, but likely a mistake (should review);
 * - notes: legal, for your information, i.e. info-level rule results plus
 *   readout notes such as running hot (`getHeatNote` in `unitStatStatus`).
 *
 * Counts come from the validation state and the notes passed in; nothing here
 * decides what is legal.
 *
 * @spec openspec/specs/unit-info-banner/spec.md
 */

import type { CustomizerTabId } from '@/hooks/useCustomizerRouter';

/**
 * A note derived from readouts already on screen (e.g. running hot).
 * Notes are presentational: they never change what counts as an error or
 * warning, and they never make a unit invalid.
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
  /** Tab where the user can address the note. */
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
   * the note itself when it is the only item ("Runs hot +11"), or "Ready".
   */
  readonly headline: string;
  /** The single note the headline names, when it names one. */
  readonly headlineNote?: ValidationNote;
  /** Panel heading: "Not legal \u00b7 <headline>" or "Legal \u00b7 <headline>". */
  readonly panelHeading: string;
  /**
   * Short wording for narrow bands: the worst group in words ("1 error")
   * and the count of everything else ("+2 more"), or the lone note itself.
   */
  readonly short: { readonly text: string; readonly more?: string };
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

/** A note's short visible text, e.g. "Runs hot +11". */
export function noteText(note: ValidationNote): string {
  return note.amount ? `${note.label} ${note.amount}` : note.label;
}

export function getBuildStatusSummary(
  counts: BuildStatusCounts,
  notes: readonly ValidationNote[],
): BuildStatusSummary {
  const totals: Record<BuildStatusKind, number> = {
    error: counts.errorCount,
    warning: counts.warningCount,
    note: counts.infoCount + notes.length,
  };
  const parts = BUILD_STATUS_GROUPS.filter(({ kind }) => totals[kind] > 0).map(
    ({ kind }) => ({
      kind,
      count: totals[kind],
      text: buildStatusCountText(kind, totals[kind]),
    }),
  );
  const state: BuildState = parts[0]?.kind ?? 'ready';
  const headlineNote =
    state === 'note' && counts.infoCount === 0 && notes.length === 1
      ? notes[0]
      : undefined;
  const headline = headlineNote
    ? noteText(headlineNote)
    : parts.length > 0
      ? parts.map((part) => part.text).join(BUILD_STATUS_SEPARATOR)
      : 'Ready';
  const rest = parts.slice(1).reduce((sum, part) => sum + part.count, 0);
  const short =
    headlineNote || parts.length === 0
      ? { text: headline }
      : {
          text: parts[0].text,
          more: rest > 0 ? `+${countText(rest)} more` : undefined,
        };
  const legal = totals.error === 0;
  return {
    state,
    legal,
    parts,
    headline,
    headlineNote,
    panelHeading: `${legal ? 'Legal' : 'Not legal'}${BUILD_STATUS_SEPARATOR}${headline}`,
    short,
  };
}
