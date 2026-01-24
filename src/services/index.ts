/**
 * Service Layer Registry
 * 
 * Central access point for all application services.
 * Services are instantiated as singletons.
 * 
 * @spec openspec/specs/unit-services/spec.md
 * @spec openspec/specs/equipment-services/spec.md
 * @spec openspec/specs/construction-services/spec.md
 * @spec openspec/specs/persistence-services/spec.md
 */

// Re-export common types and errors
export * from './common';

// Re-export persistence services
export * from './persistence';

// Re-export equipment services
export * from './equipment';

// Re-export unit services
export * from './units';

// Re-export construction services
export * from './construction';

// Re-export conversion services
export * from './conversion';

// Re-export asset services
export * from './assets';

// Re-export pilot services
export * from './pilots';

// Re-export game resolution services
export * from './game-resolution';

// ============================================================================
// SERVICE REGISTRY
// ============================================================================

import { getIndexedDBService, getFileService } from './persistence';
import { getEquipmentLoader, getEquipmentRegistry, getEquipmentNameMapper } from './equipment';
import { getUnitFactory } from './units';
import { getMechBuilderService, getValidationService, getCalculationService } from './construction';
import { getMTFImportService } from './conversion';
import { getPilotService, getPilotRepository } from './pilots';

/**
 * Centralized service registry for singleton access
 * Uses factory functions for lazy initialization and better testability
 */
export const services = {
  // Persistence
  persistence: {
    get db() { return getIndexedDBService(); },
    get file() { return getFileService(); },
  },

  // Equipment
  equipment: {
    get loader() { return getEquipmentLoader(); },
    get registry() { return getEquipmentRegistry(); },
    get nameMapper() { return getEquipmentNameMapper(); },
  },

  // Units
  units: {
    get factory() { return getUnitFactory(); },
  },

  // Construction
  construction: {
    get builder() { return getMechBuilderService(); },
    get validation() { return getValidationService(); },
    get calculation() { return getCalculationService(); },
  },

  // Conversion
  conversion: {
    get importer() { return getMTFImportService(); },
  },

  // Pilots
  pilots: {
    get service() { return getPilotService(); },
    get repository() { return getPilotRepository(); },
  },
} as const;

/**
 * Initialize all services that require async setup
 */
export async function initializeServices(): Promise<void> {
  // Initialize IndexedDB
  await services.persistence.db.initialize();
  
  // Initialize equipment registry
  await services.equipment.registry.initialize();
}

/**
 * Shutdown all services
 */
export function shutdownServices(): void {
  services.persistence.db.close();
}

