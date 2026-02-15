import {
  ArmorTypeEnum,
  ARMOR_DEFINITIONS,
} from '@/types/construction/ArmorType';
import {
  CockpitType,
  COCKPIT_DEFINITIONS,
} from '@/types/construction/CockpitType';
import {
  EngineType,
  ENGINE_DEFINITIONS,
} from '@/types/construction/EngineType';
import { GyroType, GYRO_DEFINITIONS } from '@/types/construction/GyroType';
import {
  HeatSinkType,
  HEAT_SINK_DEFINITIONS,
} from '@/types/construction/HeatSinkType';
import {
  InternalStructureType,
  INTERNAL_STRUCTURE_DEFINITIONS,
} from '@/types/construction/InternalStructureType';
import { TechBase } from '@/types/enums/TechBase';

export function filterEngineTypes(techBase: TechBase): EngineType[] {
  return ENGINE_DEFINITIONS.filter((engine) => {
    if (engine.type === EngineType.STANDARD) return true;
    if (engine.type === EngineType.COMPACT) return true;
    if (engine.type === EngineType.XXL) return true;

    if (engine.type === EngineType.XL_IS)
      return techBase === TechBase.INNER_SPHERE;
    if (engine.type === EngineType.XL_CLAN) return techBase === TechBase.CLAN;
    if (engine.type === EngineType.LIGHT)
      return techBase === TechBase.INNER_SPHERE;

    return techBase === TechBase.INNER_SPHERE;
  }).map((e) => e.type);
}

export function filterGyroTypes(_techBase: TechBase): GyroType[] {
  return GYRO_DEFINITIONS.map((g) => g.type);
}

export function filterStructureTypes(
  techBase: TechBase,
): InternalStructureType[] {
  return INTERNAL_STRUCTURE_DEFINITIONS.filter((structure) => {
    if (structure.type === InternalStructureType.STANDARD) return true;
    if (structure.type === InternalStructureType.ENDO_STEEL_IS)
      return techBase === TechBase.INNER_SPHERE;
    if (structure.type === InternalStructureType.ENDO_STEEL_CLAN)
      return techBase === TechBase.CLAN;
    return techBase === TechBase.INNER_SPHERE;
  }).map((s) => s.type);
}

export function filterCockpitTypes(_techBase: TechBase): CockpitType[] {
  return COCKPIT_DEFINITIONS.map((c) => c.type);
}

export function filterHeatSinkTypes(techBase: TechBase): HeatSinkType[] {
  return HEAT_SINK_DEFINITIONS.filter((hs) => {
    if (hs.type === HeatSinkType.SINGLE) return true;
    if (hs.type === HeatSinkType.DOUBLE_IS)
      return techBase === TechBase.INNER_SPHERE;
    if (hs.type === HeatSinkType.DOUBLE_CLAN) return techBase === TechBase.CLAN;
    if (hs.type === HeatSinkType.COMPACT)
      return techBase === TechBase.INNER_SPHERE;
    if (hs.type === HeatSinkType.LASER) return techBase === TechBase.CLAN;
    return false;
  }).map((h) => h.type);
}

export function filterArmorTypes(techBase: TechBase): ArmorTypeEnum[] {
  return ARMOR_DEFINITIONS.filter((armor) => {
    if (armor.type === ArmorTypeEnum.STANDARD) return true;
    if (armor.type === ArmorTypeEnum.FERRO_FIBROUS_IS)
      return techBase === TechBase.INNER_SPHERE;
    if (armor.type === ArmorTypeEnum.FERRO_FIBROUS_CLAN)
      return techBase === TechBase.CLAN;
    return techBase === TechBase.INNER_SPHERE;
  }).map((a) => a.type);
}
