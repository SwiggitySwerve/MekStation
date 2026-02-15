import {
  createSingleton,
  type SingletonFactory,
} from '@/services/core/createSingleton';

import {
  BlkExportService as BlkExportServiceCore,
  type ExportableUnitState,
  type IBlkExportResult,
} from './BlkExportServiceCore';

export { ExportableUnitState, IBlkExportResult };

export class BlkExportService extends BlkExportServiceCore {}

const blkExportServiceFactory: SingletonFactory<BlkExportService> =
  createSingleton((): BlkExportService => new BlkExportService());

export function getBlkExportService(): BlkExportService {
  return blkExportServiceFactory.get();
}

export function resetBlkExportService(): void {
  blkExportServiceFactory.reset();
}
