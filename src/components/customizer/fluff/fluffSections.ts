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

/** What a Sections row says about its section, and whether it has content. */
export interface SectionStatus {
  readonly text: string;
  readonly empty: boolean;
}

const EMPTY_STATUS: SectionStatus = { text: 'Empty', empty: true };

/** Whitespace-delimited word counts are a display hint, never persisted. */
export function sectionWordCount(text: string): SectionStatus {
  const words = text.trim() ? text.trim().split(/\s+/u).length : 0;
  if (words === 0) return EMPTY_STATUS;
  return {
    text: `${words} ${words === 1 ? 'word' : 'words'}`,
    empty: false,
  };
}

/** The role row shows the chosen role itself ("Juggernaut"), not a word count. */
export function sectionRoleValue(role: string): SectionStatus {
  const value = role.trim();
  return value ? { text: value, empty: false } : EMPTY_STATUS;
}
