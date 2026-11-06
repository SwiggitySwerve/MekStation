/** Source-text weapon quirk parsing shared by imports and gameplay facades. */

function appendQuirk(
  result: Record<string, string[]>,
  quirk: string,
  weapon: string,
): void {
  if (!quirk || !weapon) return;
  if (!result[weapon]) result[weapon] = [];
  result[weapon].push(quirk);
}

export function parseMtfWeaponQuirkLines(
  lines: readonly string[],
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const line of lines) {
    if (!line.startsWith('weapon_quirk:')) continue;
    const parts = line.substring('weapon_quirk:'.length).split(':');
    if (parts.length < 2) continue;
    appendQuirk(result, parts[0].trim(), parts[1].trim());
  }
  return result;
}

export function parseBlkWeaponQuirkEntries(
  entries: readonly string[],
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const entry of entries) {
    const colon = entry.indexOf(':');
    if (colon < 0) continue;
    appendQuirk(
      result,
      entry.substring(0, colon).trim(),
      entry.substring(colon + 1).trim(),
    );
  }
  return result;
}
