import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { EngineType } from '@/types/construction/EngineType';

/** Authoritative enum-to-contract tags shared by the family serializers. */
export const ENGINE_TYPE = {
  [EngineType.STANDARD]: 'FUSION',
  [EngineType.XL_IS]: 'XL',
  [EngineType.XL_CLAN]: 'CLAN_XL',
  [EngineType.LIGHT]: 'LIGHT',
  [EngineType.XXL]: 'XXL',
  [EngineType.COMPACT]: 'COMPACT',
  [EngineType.ICE]: 'ICE',
  [EngineType.FUEL_CELL]: 'FUEL_CELL',
  [EngineType.FISSION]: 'FISSION',
} as const satisfies Readonly<Record<EngineType, string>>;

// Kept as a literal, exhaustive table: the contract serializers need its literal
// types. armorIdentity.test.ts proves every entry equals the owner's tag
// (src/types/formats/ArmorIdentity.ts), both ways.
export const ARMOR_TYPE = {
  [ArmorTypeEnum.STANDARD]: 'STANDARD',
  [ArmorTypeEnum.FERRO_FIBROUS_IS]: 'FERRO_FIBROUS',
  [ArmorTypeEnum.FERRO_FIBROUS_CLAN]: 'FERRO_FIBROUS_CLAN',
  [ArmorTypeEnum.FERRO_FIBROUS_PROTO]: 'FERRO_FIBROUS_PROTO',
  [ArmorTypeEnum.LIGHT_FERRO]: 'LIGHT_FERRO_FIBROUS',
  [ArmorTypeEnum.HEAVY_FERRO]: 'HEAVY_FERRO_FIBROUS',
  [ArmorTypeEnum.STEALTH]: 'STEALTH',
  [ArmorTypeEnum.REACTIVE]: 'REACTIVE',
  [ArmorTypeEnum.REFLECTIVE]: 'REFLECTIVE',
  [ArmorTypeEnum.HARDENED]: 'HARDENED',
  [ArmorTypeEnum.FERRO_LAMELLOR]: 'FERRO_LAMELLOR',
  [ArmorTypeEnum.BALLISTIC_REINFORCED]: 'BALLISTIC_REINFORCED',
  [ArmorTypeEnum.COMMERCIAL]: 'COMMERCIAL',
  // Native-only identities; nothing loads into them yet (ArmorType.ts).
  [ArmorTypeEnum.INDUSTRIAL]: 'INDUSTRIAL',
  [ArmorTypeEnum.HEAVY_INDUSTRIAL]: 'HEAVY_INDUSTRIAL',
  [ArmorTypeEnum.PRIMITIVE]: 'PRIMITIVE',
  [ArmorTypeEnum.IMPACT_RESISTANT]: 'IMPACT_RESISTANT',
  [ArmorTypeEnum.HEAT_DISSIPATING]: 'HEAT_DISSIPATING',
  [ArmorTypeEnum.ANTI_PENETRATIVE_ABLATION]: 'ANTI_PENETRATIVE_ABLATION',
  [ArmorTypeEnum.PATCHWORK]: 'PATCHWORK',
  [ArmorTypeEnum.REACTIVE_CLAN]: 'REACTIVE_CLAN',
  [ArmorTypeEnum.REFLECTIVE_CLAN]: 'REFLECTIVE_CLAN',
} as const satisfies Readonly<Record<ArmorTypeEnum, string>>;
