import vocabulary from '@/types/formats/mtf-component-vocabulary.json';

/** MTF adapter vocabulary, not a replacement for the canonical wire schema.
 * @spec openspec/changes/repair-mtf-adapter-vocabulary/specs/serialization-formats/spec.md
 * Sources: MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587,
 * Engine.java:317-346; MtfFile.java:387-466,867-905.
 * Gyro, cockpit, heat sink and rules level names live in
 * src/types/formats/mtf-component-vocabulary.json, which the Python converter
 * also loads (see MTF_COMPONENT_VOCABULARY.md).
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

/** Exact native critical-system identities, separate from equipment aliases.
 * Bare tokens only: critical-cell decorations belong to parseCriticalSlotToken.
 */
const GYRO_SYSTEM_NAMES = Object.keys(vocabulary.gyro).filter((name) =>
  name.endsWith('Gyro'),
);
export const MTF_CRITICAL_SLOT_SYSTEM_NAMES: readonly string[] = [
  ...vocabulary.criticalSlotSystems,
  ...ENGINE_NAMES.map(([, , name]) => name),
  ...GYRO_SYSTEM_NAMES,
  ...vocabulary.cockpitOrder.map(([name]) => name),
];
const criticalSystemIdentities = new Map(
  MTF_CRITICAL_SLOT_SYSTEM_NAMES.map((name) => [
    name.toLowerCase(),
    name.toLowerCase().replace(/ actuator$/, ''),
  ]),
);
for (const [, , name] of ENGINE_NAMES)
  criticalSystemIdentities.set(name.toLowerCase(), 'engine');
for (const name of GYRO_SYSTEM_NAMES)
  criticalSystemIdentities.set(name.toLowerCase(), 'gyro');
for (const [name] of vocabulary.cockpitOrder)
  criticalSystemIdentities.set(name.toLowerCase(), 'cockpit');

/** Exact native system identity, including actuator and component-name aliases. */
export function getMTFCriticalSlotSystemIdentity(
  name: string,
): string | undefined {
  return criticalSystemIdentities.get(name.trim().toLowerCase());
}

export function isMTFCriticalSlotSystemName(name: string): boolean {
  return getMTFCriticalSlotSystemIdentity(name) !== undefined;
}

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
  // MegaMek 48fcb2f64 ArmorType.java:521,1051,1108,1139,2069;
  // Mek.java:5385-5403 writes these exact names, including Patchwork's
  // distinct global header (its location records require additional context).
  ['ferro-fibrous prototype', 'FERRO_FIBROUS_PROTO', 'Ferro-Fibrous Prototype'],
  ['ballistic-reinforced', 'BALLISTIC_REINFORCED', 'Ballistic-Reinforced'],
  ['heat-dissipating', 'HEAT_DISSIPATING', 'Heat-Dissipating'],
  [
    'anti-penetrative ablation',
    'ANTI_PENETRATIVE_ABLATION',
    'Anti-Penetrative Ablation',
  ],
  ['patchwork', 'PATCHWORK', 'Patchwork'],
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
  ENGINE_NAMES.map(([, type, name]) => [type, name]),
);
const ENGINE_EXPORT_ALIASES: Record<string, string> = {
  STANDARD: 'FUSION',
  XL_IS: 'XL',
  XL_CLAN: 'CLAN_XL',
};
const CLAN_ARMOR_TYPES = ['FERRO_FIBROUS', 'REACTIVE', 'REFLECTIVE'];
const ARMOR_EXPORT_NAMES: Record<string, string> = Object.fromEntries(
  ARMOR_NAMES.map(([, type, name]) => [type, name]),
);
for (const type of CLAN_ARMOR_TYPES) {
  ARMOR_EXPORT_NAMES[`${type}_CLAN`] = `${ARMOR_EXPORT_NAMES[type]}(Clan)`;
}

/** Canonical MTF armor identities; deliberate legacy aliases are separate. */
export function getMTFArmorIdentities(): readonly string[] {
  return Object.keys(ARMOR_EXPORT_NAMES);
}
const ARMOR_EXPORT_ALIASES: Record<string, string> = {
  FERRO_FIBROUS_IS: 'FERRO_FIBROUS',
  LIGHT_FERRO: 'LIGHT_FERRO_FIBROUS',
  HEAVY_FERRO: 'HEAVY_FERRO_FIBROUS',
};
// Export accepts wire identities and deliberate legacy aliases, never parser
// normalization or unknown fallbacks. Own-property checks also reject inherited
// Object names supplied as external component identities.
export function formatEngineType(type: string): string {
  const canonical = Object.prototype.hasOwnProperty.call(
    ENGINE_EXPORT_ALIASES,
    type,
  )
    ? ENGINE_EXPORT_ALIASES[type]
    : type;
  if (!Object.prototype.hasOwnProperty.call(ENGINE_EXPORT_NAMES, canonical)) {
    throw new Error(`Unsupported MTF engine identity: ${type}`);
  }
  return ENGINE_EXPORT_NAMES[canonical];
}

export function formatArmorType(type: string): string {
  const canonical = Object.prototype.hasOwnProperty.call(
    ARMOR_EXPORT_ALIASES,
    type,
  )
    ? ARMOR_EXPORT_ALIASES[type]
    : type;
  if (!Object.prototype.hasOwnProperty.call(ARMOR_EXPORT_NAMES, canonical)) {
    throw new Error(`Unsupported MTF armor identity: ${type}`);
  }
  return ARMOR_EXPORT_NAMES[canonical];
}

function lookup(table: Readonly<Record<string, string>>, name: string) {
  return Object.prototype.hasOwnProperty.call(table, name)
    ? table[name]
    : undefined;
}

/** A resolved component identity. `defaulted` is set when the pinned loader
 * substituted its default for a string it did not recognise, which the parser
 * reports as a warning and keeps on the unit. */
export interface IMappedComponent {
  readonly type: string;
  readonly defaulted?: boolean;
}

/** MtfFile.java:252-259: an absent, blank or unrecognised gyro loads as
 * Standard (exact full or short name, Mek.getGyroTypeForString). */
export function mapGyroType(gyro: string): IMappedComponent {
  const name = gyro.trim();
  const standard = vocabulary.gyro['Standard Gyro'];
  if (!name) return { type: standard };
  const identity = lookup(vocabulary.gyro, name);
  return identity ? { type: identity } : { type: standard, defaulted: true };
}

/** MtfFile.java:262-269 with Mek.getCockpitTypeForString (Mek.java:4935-4949):
 * (1) an exact full or short name, in Java index order; (2) otherwise the first
 * index whose full or short name is a prefix (how the writer's " (Adv. FCS)"
 * suffix reads back, so a suffixed "Superheavy Tripod Cockpit" matches the short
 * "Superheavy" at index 8 before index 9); (3) otherwise Standard, reported as
 * defaulted. The index order is `cockpitOrder` in the shared vocabulary. */
export function mapCockpitType(cockpit: string): IMappedComponent {
  const name = cockpit.trim();
  const standard = vocabulary.cockpit['Standard Cockpit'];
  if (!name) return { type: standard };
  const order = vocabulary.cockpitOrder;
  let index = order.findIndex(
    ([full, short]) => name === full || name === short,
  );
  if (index < 0) {
    index = order.findIndex(
      ([full, short]) => name.startsWith(full) || name.startsWith(short),
    );
  }
  if (index < 0) return { type: standard, defaulted: true };
  const identity = lookup(vocabulary.cockpit, order[index][0]);
  if (!identity) {
    throw new Error(`MTF vocabulary has no identity for ${order[index][0]}`);
  }
  return { type: identity };
}

/** The pinned writer emits Single, Laser, Compact, IS Double and Clan Double
 * (Mek.java:5351-5362). The loader itself reads the line by keyword, in this
 * order: Laser, Double (Clan or IS from the text, else the unit's own tech
 * base), Compact, otherwise Single (MtfFile.java:366-368, 566-598). */
export function mapHeatSinkType(
  heatSink: string,
  clanUnit: boolean,
): IMappedComponent {
  const name = heatSink.trim();
  if (!name) return { type: vocabulary.heatSink.Single };
  const identity = lookup(vocabulary.heatSink, name);
  if (identity) return { type: identity };
  if (name.includes('Laser')) return { type: vocabulary.heatSink.Laser };
  if (name.includes('Double')) {
    const clan = name.includes('Clan')
      ? true
      : name.includes('IS')
        ? false
        : clanUnit;
    return {
      type: clan
        ? vocabulary.heatSink['Clan Double']
        : vocabulary.heatSink['IS Double'],
    };
  }
  if (name.includes('Compact')) return { type: vocabulary.heatSink.Compact };
  return { type: vocabulary.heatSink.Single, defaulted: true };
}

export function mapRulesLevel(level: string): string {
  return lookup(vocabulary.rulesLevel, level) ?? 'STANDARD';
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
  if (lower.includes('clan') && CLAN_ARMOR_TYPES.includes(type)) {
    return `${type}_CLAN`;
  }
  return type;
}
