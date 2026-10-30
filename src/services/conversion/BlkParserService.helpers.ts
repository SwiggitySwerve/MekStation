import {
  BLK_EQUIPMENT_BLOCK_TAGS,
  BLK_UNIT_TYPE_MAP,
} from '../../types/formats/BlkFormat';
import { UnitType } from '../../types/unit/BattleMechInterfaces';

export type BlkRawTags = Record<string, string | string[]>;

/** Java String.trim / Double.parseDouble remove only characters through U+0020. */
export function trimBlkWhitespace(value: string): string {
  return value.replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, '');
}

function removeBlkComments(content: string, native = false): string {
  return content
    .split(native ? /\r\n|\r|\n/ : /\r?\n/)
    .filter(
      (line) =>
        !(native ? trimBlkWhitespace(line) : line.trim()).startsWith('#'),
    )
    .join('\n');
}

export function isBlkEquipmentBlock(tagName: string): boolean {
  return BLK_EQUIPMENT_BLOCK_TAGS.some(
    (block) => tagName.toLowerCase() === block.toLowerCase(),
  );
}

export function extractBlkTags(content: string): BlkRawTags {
  // Classify before legacy preprocessing can discard native CR/Unicode lines.
  const nativeTags = readBlkTags(removeBlkComments(content, true));
  return mapBlkUnitType(getBlkString(nativeTags.UnitType) ?? '') ===
    UnitType.PROTOMECH
    ? nativeTags
    : readBlkTags(removeBlkComments(content));
}

function readBlkTags(content: string): BlkRawTags {
  const tags: BlkRawTags = {};
  const equipmentText: Record<string, string> = {};
  const tagPattern = /<([^>]+)>([\s\S]*?)<\/\1>/g;
  let match;
  while ((match = tagPattern.exec(content)) !== null) {
    const tagName = match[1].trim();
    const tagContent = match[2].trim();
    if (isBlkEquipmentBlock(tagName)) {
      tags[tagName] = splitBlkLines(tagContent);
      equipmentText[tagName] = match[2];
    } else if (tagContent.includes('\n')) {
      const lines = splitBlkLines(tagContent);
      tags[tagName] = lines.every((line) => !isNaN(parseFloat(line)))
        ? tagContent
        : lines;
    } else {
      tags[tagName] = tagContent;
    }
  }
  // UnitType may follow equipment blocks. Keep other families' existing parsing.
  if (
    mapBlkUnitType(getBlkString(tags.UnitType) ?? '') === UnitType.PROTOMECH
  ) {
    for (const [tag, text] of Object.entries(equipmentText)) {
      tags[tag] = text
        .split('\n')
        .map(trimBlkWhitespace)
        .filter((line) => line.length > 0);
    }
  }
  return tags;
}

export function mapBlkUnitType(unitTypeStr: string): UnitType | undefined {
  if (BLK_UNIT_TYPE_MAP[unitTypeStr]) return BLK_UNIT_TYPE_MAP[unitTypeStr];
  const lowerStr = unitTypeStr.toLowerCase();
  for (const [key, value] of Object.entries(BLK_UNIT_TYPE_MAP)) {
    if (key.toLowerCase() === lowerStr) return value;
  }
  return undefined;
}

export function getBlkString(
  value: string | string[] | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.join('\n');
  return value.trim() || undefined;
}

export function parseBlkNumber(
  value: string | string[] | undefined,
): number | undefined {
  if (value === undefined) return undefined;
  const str = Array.isArray(value) ? value[0] : value;
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
}

export function parseBlkArmorArray(
  value: string | string[] | undefined,
): readonly number[] {
  if (value === undefined) return [];
  const str = Array.isArray(value) ? value.join('\n') : value;
  return splitBlkLines(str)
    .map((line) => parseFloat(line))
    .filter((num) => !isNaN(num));
}

export function parseBlkEquipmentBlocks(
  rawTags: BlkRawTags,
): Record<string, readonly string[]> {
  const equipment: Record<string, string[]> = {};
  for (const [tagName, value] of Object.entries(rawTags)) {
    if (isBlkEquipmentBlock(tagName)) {
      const locationName = tagName.replace(/ Equipment$/, '');
      equipment[locationName] = Array.isArray(value)
        ? value
        : splitBlkLines(value);
    }
  }
  return equipment;
}

export function parseBlkLineList(
  value: string | string[] | undefined,
): readonly string[] | undefined {
  if (value === undefined) return undefined;
  const items = Array.isArray(value)
    ? value.filter((v) => v.length > 0)
    : splitBlkLines(value);
  return items.length > 0 ? items : undefined;
}

export function parseBlkWeaponQuirks(
  value: string | string[] | undefined,
): Readonly<Record<string, readonly string[]>> | undefined {
  if (value === undefined) return undefined;
  const lines = Array.isArray(value) ? value : splitBlkLines(value);
  const result: Record<string, string[]> = {};
  for (const entry of lines) {
    const colonIdx = entry.indexOf(':');
    if (colonIdx < 0) continue;
    const quirkName = entry.substring(0, colonIdx).trim();
    const weaponName = entry.substring(colonIdx + 1).trim();
    if (!quirkName || !weaponName) continue;
    result[weaponName] ??= [];
    result[weaponName].push(quirkName);
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function splitBlkLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
