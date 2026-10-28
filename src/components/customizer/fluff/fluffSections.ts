/** Shared presentation order and labels for narrative fields and section navigation. */
export const NARRATIVE_FIELDS = [
  ['overview', 'Overview'],
  ['capabilities', 'Capabilities'],
  ['history', 'History'],
  ['deployment', 'Deployment'],
  ['variants', 'Variants'],
  ['notableUnits', 'Notable Units'],
] as const;

export type NarrativeField = (typeof NARRATIVE_FIELDS)[number][0];

/**
 * What a Sections row says about its section. Every row uses one pattern: a
 * status, "Filled" or "Empty", plus a secondary detail (prose: its word
 * count; the single-field role: its value; multi-field Manufacturing: how
 * many fields are filled, e.g. "7 of 7 filled"). Empty sections keep the
 * detail ("0 words", "Not set"), so every row has two lines and the rows of
 * both index columns line up.
 */
export interface SectionStatus {
  readonly status: 'Filled' | 'Empty';
  readonly detail: string;
  readonly empty: boolean;
}

const empty = (detail: string): SectionStatus => ({
  status: 'Empty',
  detail,
  empty: true,
});

const filled = (detail: string): SectionStatus => ({
  status: 'Filled',
  detail,
  empty: false,
});

/** Whitespace-delimited word counts are a display hint, never persisted. */
export function sectionWordCount(text: string): SectionStatus {
  const words = text.trim() ? text.trim().split(/\s+/u).length : 0;
  if (words === 0) return empty('0 words');
  return filled(`${words} ${words === 1 ? 'word' : 'words'}`);
}

/** A single-field section's detail is its value, e.g. the role "Juggernaut". */
export function sectionRoleValue(role: string): SectionStatus {
  const value = role.trim();
  return value ? filled(value) : empty('Not set');
}

/**
 * A multi-field section's detail is how many of its fields hold a value, in
 * sentence case, e.g. "5 of 7 filled".
 */
export function sectionFilledCount(
  values: readonly (string | undefined)[],
): SectionStatus {
  const count = values.filter((value) => value?.trim()).length;
  if (count === 0) return empty(`0 of ${values.length} filled`);
  return filled(`${count} of ${values.length} filled`);
}

/**
 * One line for the phone jump select, e.g. "Overview · Filled, 26 words";
 * an empty section reads just "History · Empty".
 */
export function sectionOptionText(
  label: string,
  status: SectionStatus,
): string {
  return `${label} · ${status.status}${status.empty ? '' : `, ${status.detail}`}`;
}
