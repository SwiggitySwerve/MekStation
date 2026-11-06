/** Source-text weapon quirk parsing shared by imports and gameplay facades. */

const NATIVE_MTF_PREFIX = 'weaponquirk:';

/** MtfFile.java:645-649 and BLKFile.java:225-230, MegaMek 48fcb2f64. */
function appendNativeQuirk(
  result: Record<string, string[]>,
  entry: string,
): void {
  const parts = entry.split(':').map((part) => part.trim());
  if (parts.length !== 4) return;
  const [quirk, location, rawSlot, weapon] = parts;
  const slot = Number(rawSlot);
  if (
    !location ||
    !/^\d+$/.test(rawSlot) ||
    !Number.isSafeInteger(slot) ||
    !weapon
  )
    return;
  appendQuirk(result, quirk, `${location}:${slot}:${weapon}`);
}

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
    if (line.startsWith(NATIVE_MTF_PREFIX)) {
      appendNativeQuirk(result, line.substring(NATIVE_MTF_PREFIX.length));
      continue;
    }
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
    if (entry.split(':').length >= 4) {
      appendNativeQuirk(result, entry);
      continue;
    }
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
