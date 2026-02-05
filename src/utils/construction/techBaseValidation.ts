/**
 * Tech Base Integration
 *
 * Validates tech base compatibility for construction.
 *
 * @spec openspec/specs/tech-base-integration/spec.md
 */

import {
  ArmorTypeEnum,
  getArmorDefinition,
} from '../../types/construction/ArmorType';
import {
  EngineType,
  getEngineDefinition,
} from '../../types/construction/EngineType';
import { GyroType, getGyroDefinition } from '../../types/construction/GyroType';
import {
  HeatSinkType,
  getHeatSinkDefinition,
} from '../../types/construction/HeatSinkType';
import {
  InternalStructureType,
  getInternalStructureDefinition,
} from '../../types/construction/InternalStructureType';
import { RulesLevel } from '../../types/enums/RulesLevel';
import { TechBase } from '../../types/enums/TechBase';

/**
 * Component tech base info
 */
export interface ComponentTechInfo {
  readonly name: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
}

/**
 * Get tech base for engine type
 */
export function getEngineTechBase(
  engineType: EngineType,
): TechBase | undefined {
  return getEngineDefinition(engineType)?.techBase;
}

/**
 * Get tech base for gyro type
 */
export function getGyroTechBase(gyroType: GyroType): TechBase | undefined {
  return getGyroDefinition(gyroType)?.techBase;
}

/**
 * Get tech base for structure type
 */
export function getStructureTechBase(
  structureType: InternalStructureType,
): TechBase | undefined {
  return getInternalStructureDefinition(structureType)?.techBase;
}

/**
 * Get tech base for heat sink type
 */
export function getHeatSinkTechBase(
  heatSinkType: HeatSinkType,
): TechBase | undefined {
  return getHeatSinkDefinition(heatSinkType)?.techBase;
}

/**
 * Get tech base for armor type
 */
export function getArmorTechBase(
  armorType: ArmorTypeEnum,
): TechBase | undefined {
  return getArmorDefinition(armorType)?.techBase;
}

/**
 * Check if component is compatible with unit tech base
 */
export function isComponentCompatible(
  componentTechBase: TechBase,
  unitTechBase: TechBase,
  allowMixedTech: boolean,
): boolean {
  // Same tech base is always compatible
  if (componentTechBase === unitTechBase) {
    return true;
  }

  // Mixed tech allows cross-tech base
  if (allowMixedTech) {
    return true;
  }

  // Inner Sphere components can be used on Clan units (as inferior tech)
  // but not vice versa without mixed tech
  if (
    unitTechBase === TechBase.CLAN &&
    componentTechBase === TechBase.INNER_SPHERE
  ) {
    return true;
  }

  return false;
}

/**
 * Validate all structural components for tech base compatibility
 */
export function validateTechBaseCompatibility(
  unitTechBase: TechBase,
  components: {
    engineType?: EngineType;
    gyroType?: GyroType;
    structureType?: InternalStructureType;
    heatSinkType?: HeatSinkType;
    armorType?: ArmorTypeEnum;
  },
  allowMixedTech: boolean = false,
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const checks: Array<{ name: string; techBase?: TechBase }> = [];

  if (components.engineType) {
    checks.push({
      name: 'Engine',
      techBase: getEngineTechBase(components.engineType),
    });
  }
  if (components.gyroType) {
    checks.push({
      name: 'Gyro',
      techBase: getGyroTechBase(components.gyroType),
    });
  }
  if (components.structureType) {
    checks.push({
      name: 'Internal Structure',
      techBase: getStructureTechBase(components.structureType),
    });
  }
  if (components.heatSinkType) {
    checks.push({
      name: 'Heat Sinks',
      techBase: getHeatSinkTechBase(components.heatSinkType),
    });
  }
  if (components.armorType) {
    checks.push({
      name: 'Armor',
      techBase: getArmorTechBase(components.armorType),
    });
  }

  for (const check of checks) {
    if (
      check.techBase &&
      !isComponentCompatible(check.techBase, unitTechBase, allowMixedTech)
    ) {
      errors.push(
        `${check.name} (${check.techBase}) is not compatible with ${unitTechBase} unit without mixed tech`,
      );
    }
  }

  // Check for mixed tech usage
  const usedTechBases = new Set(checks.map((c) => c.techBase).filter(Boolean));
  if (usedTechBases.size > 1) {
    if (allowMixedTech) {
      warnings.push('Unit uses mixed tech components');
    } else {
      // This would be an error, but we already caught it above
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Determine highest rules level used by components
 */
export function getHighestRulesLevel(components: {
  engineType?: EngineType;
  gyroType?: GyroType;
  structureType?: InternalStructureType;
  heatSinkType?: HeatSinkType;
  armorType?: ArmorTypeEnum;
}): RulesLevel {
  const levels: RulesLevel[] = [];

  if (components.engineType) {
    const def = getEngineDefinition(components.engineType);
    if (def) levels.push(def.rulesLevel);
  }
  if (components.gyroType) {
    const def = getGyroDefinition(components.gyroType);
    if (def) levels.push(def.rulesLevel);
  }
  if (components.structureType) {
    const def = getInternalStructureDefinition(components.structureType);
    if (def) levels.push(def.rulesLevel);
  }
  if (components.heatSinkType) {
    const def = getHeatSinkDefinition(components.heatSinkType);
    if (def) levels.push(def.rulesLevel);
  }
  if (components.armorType) {
    const def = getArmorDefinition(components.armorType);
    if (def) levels.push(def.rulesLevel);
  }

  // Find highest level
  const levelOrder: RulesLevel[] = [
    RulesLevel.INTRODUCTORY,
    RulesLevel.STANDARD,
    RulesLevel.ADVANCED,
    RulesLevel.EXPERIMENTAL,
  ];

  let highest = RulesLevel.INTRODUCTORY;
  for (const level of levels) {
    if (levelOrder.indexOf(level) > levelOrder.indexOf(highest)) {
      highest = level;
    }
  }

  return highest;
}

/**
 * Get available engine types for a tech base
 */
export function getAvailableEngineTypes(
  techBase: TechBase,
  allowMixedTech: boolean = false,
): EngineType[] {
  const allTypes = Object.values(EngineType);
  return allTypes.filter((type) => {
    const def = getEngineDefinition(type);
    if (!def) return false;
    return isComponentCompatible(def.techBase, techBase, allowMixedTech);
  });
}

/**
 * Get available gyro types for a tech base
 */
export function getAvailableGyroTypes(
  techBase: TechBase,
  allowMixedTech: boolean = false,
): GyroType[] {
  const allTypes = Object.values(GyroType);
  return allTypes.filter((type) => {
    const def = getGyroDefinition(type);
    if (!def) return false;
    return isComponentCompatible(def.techBase, techBase, allowMixedTech);
  });
}

/**
 * Get available structure types for a tech base
 */
export function getAvailableStructureTypes(
  techBase: TechBase,
  allowMixedTech: boolean = false,
): InternalStructureType[] {
  const allTypes = Object.values(InternalStructureType);
  return allTypes.filter((type) => {
    const def = getInternalStructureDefinition(type);
    if (!def) return false;
    return isComponentCompatible(def.techBase, techBase, allowMixedTech);
  });
}

/**
 * Get available heat sink types for a tech base
 */
export function getAvailableHeatSinkTypes(
  techBase: TechBase,
  allowMixedTech: boolean = false,
): HeatSinkType[] {
  const allTypes = Object.values(HeatSinkType);
  return allTypes.filter((type) => {
    const def = getHeatSinkDefinition(type);
    if (!def) return false;
    return isComponentCompatible(def.techBase, techBase, allowMixedTech);
  });
}

/**
 * Get available armor types for a tech base
 */
export function getAvailableArmorTypes(
  techBase: TechBase,
  allowMixedTech: boolean = false,
): ArmorTypeEnum[] {
  const allTypes = Object.values(ArmorTypeEnum);
  return allTypes.filter((type) => {
    const def = getArmorDefinition(type);
    if (!def) return false;
    return isComponentCompatible(def.techBase, techBase, allowMixedTech);
  });
}
