/** MTF adapter vocabulary, not a replacement for the canonical wire schema.
 * @spec openspec/changes/repair-mtf-adapter-vocabulary/specs/serialization-formats/spec.md
 * Sources: MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587,
 * Engine.java:317-346; MtfFile.java:387-466,867-905.
 */
const ENGINE_NAMES = [
  ['standard', 'FUSION', 'Fusion Engine'],
  ['xl', 'XL', 'XL Fusion Engine'],
  ['xl clan', 'CLAN_XL', 'XL Fusion Engine (Clan)'],
  ['xxl', 'XXL', 'XXL Fusion Engine'],
  ['light', 'LIGHT', 'Light Fusion Engine'],
  ['compact', 'COMPACT', 'Compact Fusion Engine'],
  ['ice', 'ICE', 'ICE Engine'],
  ['fuel cell', 'FUEL_CELL', 'Fuel Cell Engine'],
  ['fission', 'FISSION', 'Fission Engine'],
  ['battery', 'BATTERY', 'Battery Engine'],
] as const;

const ARMOR_NAMES = [
  ['standard', 'STANDARD', 'Standard(Inner Sphere)'],
  ['ferro-fibrous', 'FERRO_FIBROUS', 'Ferro-Fibrous'],
  ['light ferro-fibrous', 'LIGHT_FERRO_FIBROUS', 'Light Ferro-Fibrous'],
  ['heavy ferro-fibrous', 'HEAVY_FERRO_FIBROUS', 'Heavy Ferro-Fibrous'],
  ['stealth', 'STEALTH', 'Stealth'],
  ['reactive', 'REACTIVE', 'Reactive'],
  ['reflective', 'REFLECTIVE', 'Reflective'],
  ['hardened', 'HARDENED', 'Hardened'],
  ['primitive', 'PRIMITIVE', 'Primitive'],
  ['industrial', 'INDUSTRIAL', 'Industrial'],
  ['heavy industrial', 'HEAVY_INDUSTRIAL', 'Heavy Industrial'],
  ['commercial', 'COMMERCIAL', 'Commercial'],
  ['impact-resistant', 'IMPACT_RESISTANT', 'Impact-Resistant'],
  ['ferro-lamellor', 'FERRO_LAMELLOR', 'Ferro-Lamellor'],
] as const;

const ENGINE_PARSE_NAMES: Record<string, string> = Object.fromEntries(
  ENGINE_NAMES.map(([name, type]) => [name, type]),
);
ENGINE_PARSE_NAMES['fuel-cell'] = ENGINE_PARSE_NAMES['fuel cell'];
const ARMOR_PARSE_NAMES: Record<string, string> = Object.fromEntries(
  ARMOR_NAMES.map(([name, type]) => [name, type]),
);
ARMOR_PARSE_NAMES[''] = ARMOR_PARSE_NAMES.standard;

const ENGINE_EXPORT_NAMES: Record<string, string> = Object.fromEntries(
  ENGINE_NAMES.filter(([, type]) => !['CLAN_XL', 'BATTERY'].includes(type)).map(
    ([, type, name]) => [type, name],
  ),
);
const ENGINE_EXPORT_ALIASES: Record<string, string> = {
  STANDARD: 'FUSION',
  XL_IS: 'XL',
  XL_CLAN: 'CLAN_XL',
};
// The old exporter accepted XL_CLAN but not the parser's CLAN_XL.
ENGINE_EXPORT_NAMES.XL_CLAN =
  ENGINE_NAMES.find(([, type]) => type === 'CLAN_XL')?.[2] || '';
const ARMOR_EXPORT_NAMES: Record<string, string> = Object.fromEntries(
  ARMOR_NAMES.filter(([, type]) =>
    [
      'STANDARD',
      'FERRO_FIBROUS',
      'STEALTH',
      'REACTIVE',
      'REFLECTIVE',
      'HARDENED',
    ].includes(type),
  ).map(([, type, name]) => [type, name]),
);
ARMOR_EXPORT_NAMES.FERRO_FIBROUS_CLAN = `${ARMOR_EXPORT_NAMES.FERRO_FIBROUS}(Clan)`;
const ARMOR_EXPORT_ALIASES: Record<string, string> = {
  FERRO_FIBROUS_IS: 'FERRO_FIBROUS',
  LIGHT_FERRO: 'LIGHT_FERRO_FIBROUS',
  HEAVY_FERRO: 'HEAVY_FERRO_FIBROUS',
};
for (const [alias, type] of Object.entries(ARMOR_EXPORT_ALIASES)) {
  const entry = ARMOR_NAMES.find(([, identity]) => identity === type);
  if (entry) ARMOR_EXPORT_NAMES[alias] = entry[2];
}

export function formatEngineType(type: string): string {
  const alias = Object.prototype.hasOwnProperty.call(
    ENGINE_EXPORT_ALIASES,
    type,
  )
    ? ENGINE_EXPORT_ALIASES[type]
    : type;
  return (
    ENGINE_EXPORT_NAMES[alias] || ENGINE_EXPORT_NAMES[type] || 'Fusion Engine'
  );
}

export function formatArmorType(type: string): string {
  return ARMOR_EXPORT_NAMES[type] || 'Standard(Inner Sphere)';
}

export function mapEngineType(engineType: string): string {
  const lower = engineType.toLowerCase();
  const normalized = lower
    .replace(/\./g, '')
    .replace(/^\d+\s+/, '')
    .replace(/\((?:clan|is|inner sphere)\)/g, '')
    .replace(/\b(?:clan|is|inner sphere|large|fusion|engine)\b/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  if (normalized === 'xl')
    return ENGINE_PARSE_NAMES[lower.includes('clan') ? 'xl clan' : 'xl'];
  const types = ENGINE_PARSE_NAMES;
  if (Object.prototype.hasOwnProperty.call(types, normalized))
    return types[normalized];
  if (!normalized && /\bfusion\b/.test(lower))
    return ENGINE_PARSE_NAMES.standard;
  return `UNSUPPORTED_ENGINE:${engineType}`;
}

export function mapArmorType(armorType: string): string {
  const lower = armorType.toLowerCase();
  const name = lower
    .replace(/\((?:clan|inner sphere)\)\s*$/, '')
    .replace(/^(?:clan|is)\s+/, '')
    .trim();
  // MtfFile resolves the complete armor name, not a substring. Prototype,
  // patchwork and unrepresented armor must not masquerade as ordinary ferro.
  const types = ARMOR_PARSE_NAMES;
  const type = Object.prototype.hasOwnProperty.call(types, name)
    ? types[name]
    : undefined;
  if (!type) return `UNSUPPORTED_ARMOR:${armorType}`;
  if (
    lower.includes('clan') &&
    ['FERRO_FIBROUS', 'REACTIVE', 'REFLECTIVE'].includes(type)
  ) {
    return `${type}_CLAN`;
  }
  return type;
}
