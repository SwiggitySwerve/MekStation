import {
  ArmorTypeEnum,
  COMMERCIAL_ARMOR_SOURCE_TAG,
  FERRO_FIBROUS_PROTO_SOURCE_TAG,
} from '@/types/construction/ArmorType';
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

export const ARMOR_TYPE = {
  [ArmorTypeEnum.STANDARD]: 'STANDARD',
  [ArmorTypeEnum.FERRO_FIBROUS_IS]: 'FERRO_FIBROUS',
  [ArmorTypeEnum.FERRO_FIBROUS_CLAN]: 'FERRO_FIBROUS_CLAN',
  [ArmorTypeEnum.FERRO_FIBROUS_PROTO]: FERRO_FIBROUS_PROTO_SOURCE_TAG,
  [ArmorTypeEnum.LIGHT_FERRO]: 'LIGHT_FERRO_FIBROUS',
  [ArmorTypeEnum.HEAVY_FERRO]: 'HEAVY_FERRO_FIBROUS',
  [ArmorTypeEnum.STEALTH]: 'STEALTH',
  [ArmorTypeEnum.REACTIVE]: 'REACTIVE',
  [ArmorTypeEnum.REFLECTIVE]: 'REFLECTIVE',
  [ArmorTypeEnum.HARDENED]: 'HARDENED',
  [ArmorTypeEnum.FERRO_LAMELLOR]: 'FERRO_LAMELLOR',
  [ArmorTypeEnum.BALLISTIC_REINFORCED]: 'BALLISTIC_REINFORCED',
  [ArmorTypeEnum.COMMERCIAL]: COMMERCIAL_ARMOR_SOURCE_TAG,
} as const satisfies Readonly<Record<ArmorTypeEnum, string>>;
