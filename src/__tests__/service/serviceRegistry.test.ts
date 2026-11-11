import {
  getCalculationService,
  getMechBuilderService,
  getValidationService,
} from '@/services/construction';
import {
  getEquipmentLoader,
  getEquipmentNameMapper,
  getEquipmentRegistry,
} from '@/services/equipment';
import { getFileService, getIndexedDBService } from '@/services/persistence';
import { getPilotRepository, getPilotService } from '@/services/pilots';
import {
  initializeServices,
  services,
  shutdownServices,
} from '@/services/serviceRegistry';

jest.mock('@/services/construction', () => ({
  getCalculationService: jest.fn(() => ({ kind: 'calculation' })),
  getMechBuilderService: jest.fn(() => ({ kind: 'builder' })),
  getValidationService: jest.fn(() => ({ kind: 'validation' })),
}));
jest.mock('@/services/equipment', () => ({
  getEquipmentLoader: jest.fn(() => ({ kind: 'loader' })),
  getEquipmentNameMapper: jest.fn(() => ({ kind: 'nameMapper' })),
  getEquipmentRegistry: jest.fn(() => ({ initialize: jest.fn() })),
}));
jest.mock('@/services/persistence', () => ({
  getFileService: jest.fn(() => ({ kind: 'file' })),
  getIndexedDBService: jest.fn(() => ({
    initialize: jest.fn(),
    close: jest.fn(),
  })),
}));
jest.mock('@/services/pilots', () => ({
  getPilotRepository: jest.fn(() => ({ kind: 'repository' })),
  getPilotService: jest.fn(() => ({ kind: 'pilot' })),
}));

describe('service registry', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not expose the retired conversion importer', () => {
    expect(Reflect.has(services, 'conversion')).toBe(false);
  });

  it('does not expose the unused runtime unit factory', () => {
    expect(Reflect.has(services, 'units')).toBe(false);
  });

  it.each([
    ['persistence.db', () => services.persistence.db, getIndexedDBService],
    ['persistence.file', () => services.persistence.file, getFileService],
    ['equipment.loader', () => services.equipment.loader, getEquipmentLoader],
    [
      'equipment.registry',
      () => services.equipment.registry,
      getEquipmentRegistry,
    ],
    [
      'equipment.nameMapper',
      () => services.equipment.nameMapper,
      getEquipmentNameMapper,
    ],
    [
      'construction.builder',
      () => services.construction.builder,
      getMechBuilderService,
    ],
    [
      'construction.validation',
      () => services.construction.validation,
      getValidationService,
    ],
    [
      'construction.calculation',
      () => services.construction.calculation,
      getCalculationService,
    ],
    ['pilots.service', () => services.pilots.service, getPilotService],
    ['pilots.repository', () => services.pilots.repository, getPilotRepository],
  ] as const)(
    'still resolves %s through its owning factory',
    (_name, read, factory) => {
      expect(read()).toBe(jest.mocked(factory).mock.results[0].value);
      expect(factory).toHaveBeenCalledTimes(1);
    },
  );

  it('still initializes persistence and equipment', async () => {
    await initializeServices();

    expect(
      jest.mocked(getIndexedDBService).mock.results[0].value.initialize,
    ).toHaveBeenCalledTimes(1);
    expect(
      jest.mocked(getEquipmentRegistry).mock.results[0].value.initialize,
    ).toHaveBeenCalledTimes(1);
  });

  it('still closes persistence on shutdown', () => {
    shutdownServices();

    expect(
      jest.mocked(getIndexedDBService).mock.results[0].value.close,
    ).toHaveBeenCalledTimes(1);
  });
});
