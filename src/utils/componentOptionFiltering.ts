// Centralized utility for filtering available component options based on unit configuration
import { ArmorType, ARMOR_TYPES } from './armorTypes';
import { EngineType, StructureType, HeatSinkType } from '../types/systemComponents';
import { UnitConfiguration } from './criticalSlots/UnitCriticalManagerTypes';
import { ComponentConfiguration, TechBase } from '../types/componentConfiguration';
import { COMPONENT_DATABASE } from './componentDatabase';

// Helper function to create ComponentConfiguration objects
function createComponentConfig(type: string, techBase: TechBase): ComponentConfiguration {
  return { type, techBase };
}

// Example: filter armor types
export function getAvailableArmorTypes(config: UnitConfiguration, overrideTechBase?: string): ComponentConfiguration[] {
  const techBase = overrideTechBase || config.techBase || 'Inner Sphere';
  const introductionYear = (config as any).introductionYear || 3025;

  // Debugging: Log config, techBase, introductionYear, and database
  console.log('[getAvailableArmorTypes] config:', config);
  console.log('[getAvailableArmorTypes] techBase:', techBase);
  console.log('[getAvailableArmorTypes] introductionYear:', introductionYear);

  let armorComponents: any[] = [];
  if (techBase === 'Mixed') {
    const is = COMPONENT_DATABASE.armor['Inner Sphere'] || [];
    const clan = COMPONENT_DATABASE.armor['Clan'] || [];
    armorComponents = [...is, ...clan];
    console.log('[getAvailableArmorTypes] Mixed mode: combining IS and Clan:', armorComponents);
  } else {
    armorComponents = COMPONENT_DATABASE.armor[techBase] || [];
    console.log('[getAvailableArmorTypes] database:', COMPONENT_DATABASE.armor[techBase]);
  }

  // Filter by introduction year and rules level
  const availableComponents = armorComponents.filter((component: any) => {
    return component.introductionYear <= introductionYear;
  });

  return availableComponents.map((component: any) =>
    createComponentConfig(component.name, component.techBase || techBase)
  );
}

// PROPER IMPLEMENTATION: Use component database for structure types
export function getAvailableStructureTypes(config: UnitConfiguration, overrideTechBase?: TechBase): ComponentConfiguration[] {
  const techBase = overrideTechBase || config.techBase || 'Inner Sphere';
  const introductionYear = (config as any).introductionYear || 3025;
  
  // Get structure components from database for the specified tech base
  const structureComponents = COMPONENT_DATABASE.chassis[techBase] || [];
  
  // Filter by introduction year and rules level
  const availableComponents = structureComponents.filter((component: any) => {
    return component.introductionYear <= introductionYear;
  });
  
  return availableComponents.map((component: any) => 
    createComponentConfig(component.name, techBase)
  );
}

// PROPER IMPLEMENTATION: Use component database for engine types
export function getAvailableEngineTypes(config: UnitConfiguration, overrideTechBase?: TechBase): ComponentConfiguration[] {
  const techBase = overrideTechBase || config.techBase || 'Inner Sphere';
  const introductionYear = (config as any).introductionYear || 3025;
  
  // Get engine components from database for the specified tech base
  const engineComponents = COMPONENT_DATABASE.engine[techBase] || [];
  
  // Filter by introduction year and rules level
  const availableComponents = engineComponents.filter((component: any) => {
    return component.introductionYear <= introductionYear;
  });
  
  return availableComponents.map((component: any) => 
    createComponentConfig(component.name, techBase)
  );
}

// NEW: Use component database for gyro types
export function getAvailableGyroTypes(config: UnitConfiguration, overrideTechBase?: TechBase): ComponentConfiguration[] {
  const techBase = overrideTechBase || config.techBase || 'Inner Sphere';
  const introductionYear = (config as any).introductionYear || 3025;
  
  // Get gyro components from database for the specified tech base
  const gyroComponents = COMPONENT_DATABASE.gyro[techBase] || [];
  
  // Filter by introduction year
  const availableComponents = gyroComponents.filter((component: any) => {
    return component.introductionYear <= introductionYear;
  });
  
  return availableComponents.map((component: any) => 
    createComponentConfig(component.name, techBase)
  );
}

// PROPER IMPLEMENTATION: Use component database for heat sink types
export function getAvailableHeatSinkTypes(config: UnitConfiguration, overrideTechBase?: TechBase): ComponentConfiguration[] {
  const techBase = overrideTechBase || config.techBase || 'Inner Sphere';
  const introductionYear = (config as any).introductionYear || 3025;
  
  // Get heat sink components from database for the specified tech base
  const heatSinkComponents = COMPONENT_DATABASE.heatsink?.[techBase] || [];
  
  // Filter by introduction year and rules level
  const availableComponents = heatSinkComponents.filter((component: any) => {
    return component.introductionYear <= introductionYear;
  });
  
  return availableComponents.map((component: any) => 
    createComponentConfig(component.name, techBase)
  );
}

// Legacy functions for backward compatibility (return strings)
export function getAvailableArmorTypeStrings(config: UnitConfiguration): string[] {
  return getAvailableArmorTypes(config).map(component => component.type);
}

export function getAvailableStructureTypeStrings(config: UnitConfiguration): string[] {
  return getAvailableStructureTypes(config).map(component => component.type);
}

export function getAvailableEngineTypeStrings(config: UnitConfiguration): string[] {
  return getAvailableEngineTypes(config).map(component => component.type);
}

export function getAvailableGyroTypeStrings(config: UnitConfiguration): string[] {
  return getAvailableGyroTypes(config).map(component => component.type);
}

export function getAvailableHeatSinkTypeStrings(config: UnitConfiguration): string[] {
  return getAvailableHeatSinkTypes(config).map(component => component.type);
} 