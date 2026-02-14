import {
  getCalculationService,
  getMechBuilderService,
  getValidationService,
} from './construction';
import { getMTFImportService } from './conversion';
import {
  getEquipmentLoader,
  getEquipmentNameMapper,
  getEquipmentRegistry,
} from './equipment';
import { getFileService, getIndexedDBService } from './persistence';
import { getPilotRepository, getPilotService } from './pilots';
import { getUnitFactory } from './units';

export const services = {
  persistence: {
    get db() {
      return getIndexedDBService();
    },
    get file() {
      return getFileService();
    },
  },
  equipment: {
    get loader() {
      return getEquipmentLoader();
    },
    get registry() {
      return getEquipmentRegistry();
    },
    get nameMapper() {
      return getEquipmentNameMapper();
    },
  },
  units: {
    get factory() {
      return getUnitFactory();
    },
  },
  construction: {
    get builder() {
      return getMechBuilderService();
    },
    get validation() {
      return getValidationService();
    },
    get calculation() {
      return getCalculationService();
    },
  },
  conversion: {
    get importer() {
      return getMTFImportService();
    },
  },
  pilots: {
    get service() {
      return getPilotService();
    },
    get repository() {
      return getPilotRepository();
    },
  },
} as const;

export async function initializeServices(): Promise<void> {
  await services.persistence.db.initialize();
  await services.equipment.registry.initialize();
}

export function shutdownServices(): void {
  services.persistence.db.close();
}
