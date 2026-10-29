import { EngineType } from '@/types/construction/EngineType';
import codes from '@/types/formats/blk-engine-codes.json';
import { ConventionalFighterEngineType } from '@/types/unit/AerospaceInterfaces';

/** Serialized facts: MegaMek 48fcb2f6 BLKFile.java:80-93,538-568.
 * These are neither Engine ordinals nor generic MTF numeric aliases.
 * @spec openspec/changes/establish-all-unit-data-parity/specs/unit-entity-model/spec.md
 */
export function blkEngineName(code: number): string {
  const name = Object.entries(codes).find(([key]) => Number(key) === code)?.[1];
  if (!name) throw new Error(`Unsupported BLK engine_type: ${code}`);
  return name;
}

export function blkEngineCode(name: string): number {
  const key = Object.entries(codes).find(([, value]) => value === name)?.[0];
  if (key === undefined)
    throw new Error(`Unsupported BLK engine identity: ${name}`);
  return Number(key);
}

const constructionNames: Readonly<Record<EngineType, string>> = {
  [EngineType.STANDARD]: 'FUSION',
  [EngineType.ICE]: 'ICE',
  [EngineType.XL_IS]: 'XL',
  [EngineType.XL_CLAN]: 'XL',
  [EngineType.XXL]: 'XXL',
  [EngineType.LIGHT]: 'LIGHT',
  [EngineType.COMPACT]: 'COMPACT',
  [EngineType.FUEL_CELL]: 'FUEL_CELL',
  [EngineType.FISSION]: 'FISSION',
};

export function encodeBlkEngine(engineType: EngineType): string {
  const name = constructionNames[engineType];
  if (!name) throw new Error(`Unsupported BLK engine identity: ${engineType}`);
  return String(blkEngineCode(name));
}

/** BLKTankFile.java:144-151: explicit flag overrides chassis technology. */
export function isClanBlkEngine(
  type: string,
  flag?: string | string[],
): boolean {
  if (flag !== undefined) {
    const value = Array.isArray(flag) ? flag[0] : flag;
    return value?.trim().toLowerCase() === 'true';
  }
  return /^clan\b/i.test(type) || /mixed\s*\(clan chassis\)/i.test(type);
}

export function decodeBlkConstructionEngine(
  code: number,
  clan: boolean,
): EngineType | null {
  const name = blkEngineName(code);
  // null means only the known serialized NONE identity, never an unknown code.
  if (name === 'NONE') return null;
  if (name === 'XL') return clan ? EngineType.XL_CLAN : EngineType.XL_IS;
  const entry = Object.entries(constructionNames).find(
    ([, value]) => value === name,
  );
  // Object.entries loses the enum key type; return the actual enum member.
  const engine = Object.values(EngineType).find(
    (value) => value === entry?.[0],
  );
  if (!engine)
    throw new Error(
      `BLK engine_type ${code} (${name}) has no construction EngineType`,
    );
  return engine;
}

const conventionalNames: Readonly<
  Partial<Record<string, ConventionalFighterEngineType>>
> = {
  FUSION: ConventionalFighterEngineType.FUSION,
  ICE: ConventionalFighterEngineType.ICE,
  FUEL_CELL: ConventionalFighterEngineType.FUEL_CELL,
  FISSION: ConventionalFighterEngineType.FISSION,
  MAGLEV: ConventionalFighterEngineType.MAGLEV,
  BATTERY: ConventionalFighterEngineType.ELECTRIC,
  SOLAR: ConventionalFighterEngineType.SOLAR,
};

export function decodeBlkConventionalEngine(
  code: number,
): ConventionalFighterEngineType {
  const name = blkEngineName(code);
  const engine = conventionalNames[name];
  if (!engine)
    throw new Error(
      `BLK engine_type ${code} (${name}) has no ConventionalFighterEngineType`,
    );
  return engine;
}

/** Only engine-tag readers validate their tags. Other loaders ignore them.
 * BLKProtoMekFile.java:93-95; BLKSmallCraftFile.java:147-152.
 */
export function parseBlkEngineTag(
  family: string,
  raw?: string | string[],
): number | undefined {
  const readers = [
    'mek',
    'battlemech',
    'industrialmech',
    'tank',
    'naval',
    'vtol',
    'supporttank',
    'supportvtol',
    'largesupporttank',
    'aero',
    'aerospacefighter',
    'convfighter',
    'fixedwingsupport',
  ];
  if (raw === undefined) return undefined;
  if (!readers.includes(family.toLowerCase())) {
    // Retain the document's legacy numeric projection without interpreting an
    // ignored tag as engine identity. Family handlers decide runtime meaning.
    const value = Number.parseFloat(Array.isArray(raw) ? raw[0] : raw);
    return Number.isNaN(value) ? undefined : value;
  }
  const text = Array.isArray(raw) ? raw.join('\n').trim() : raw.trim();
  if (!/^[+-]?\d+$/.test(text))
    throw new Error(`Invalid BLK engine_type: ${JSON.stringify(raw)}`);
  const code = Number(text);
  blkEngineName(code);
  return code;
}
