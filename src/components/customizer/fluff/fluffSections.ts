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

/** Whitespace-delimited word counts are a display hint, never persisted. */
export function sectionWordCount(text: string): string {
  const words = text.trim() ? text.trim().split(/\s+/u).length : 0;
  return words === 0 ? 'Empty' : `${words} ${words === 1 ? 'word' : 'words'}`;
}
