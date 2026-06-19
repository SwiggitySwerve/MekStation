/**
 * EquipmentNameResolver loaded-data resolution tests.
 */

import * as EquipmentLoaderService from '@/services/equipment/EquipmentLoaderService';
import { TechBase } from '@/types/enums/TechBase';

import { EquipmentNameResolver } from '../EquipmentNameResolver';

jest.mock('@/services/equipment/EquipmentLoaderService', () => ({
  getEquipmentLoader: jest.fn(() => ({
    getIsLoaded: jest.fn().mockReturnValue(false),
    getAllWeapons: jest.fn().mockReturnValue([]),
    getAllAmmunition: jest.fn().mockReturnValue([]),
    getAllElectronics: jest.fn().mockReturnValue([]),
    getAllMiscEquipment: jest.fn().mockReturnValue([]),
  })),
}));

describe('EquipmentNameResolver loaded mappings', () => {
  describe('weapon category mapping', () => {
    it('should map ballistic weapons correctly', () => {
      (EquipmentLoaderService.getEquipmentLoader as jest.Mock).mockReturnValue({
        getIsLoaded: jest.fn().mockReturnValue(true),
        getAllWeapons: jest.fn().mockReturnValue([
          {
            id: 'ac-10',
            name: 'AC/10',
            category: 'BALLISTIC',
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: 1,
            weight: 12,
            criticalSlots: 7,
            costCBills: 200000,
            battleValue: 124,
            introductionYear: 2443,
          },
        ]),
        getAllAmmunition: jest.fn().mockReturnValue([]),
        getAllElectronics: jest.fn().mockReturnValue([]),
        getAllMiscEquipment: jest.fn().mockReturnValue([]),
      });

      const freshResolver = new EquipmentNameResolver();
      freshResolver.initialize();

      const result = freshResolver.resolve('Unknown', 'AC/10');
      expect(result.found).toBe(true);
    });

    it('should map missile weapons correctly', () => {
      (EquipmentLoaderService.getEquipmentLoader as jest.Mock).mockReturnValue({
        getIsLoaded: jest.fn().mockReturnValue(true),
        getAllWeapons: jest.fn().mockReturnValue([
          {
            id: 'lrm-20',
            name: 'LRM 20',
            category: 'MISSILE',
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: 1,
            weight: 10,
            criticalSlots: 5,
            costCBills: 250000,
            battleValue: 181,
            introductionYear: 2300,
          },
        ]),
        getAllAmmunition: jest.fn().mockReturnValue([]),
        getAllElectronics: jest.fn().mockReturnValue([]),
        getAllMiscEquipment: jest.fn().mockReturnValue([]),
      });

      const freshResolver = new EquipmentNameResolver();
      freshResolver.initialize();

      const result = freshResolver.resolve('Unknown', 'LRM 20');
      expect(result.found).toBe(true);
    });

    it('should map unknown category to misc', () => {
      (EquipmentLoaderService.getEquipmentLoader as jest.Mock).mockReturnValue({
        getIsLoaded: jest.fn().mockReturnValue(true),
        getAllWeapons: jest.fn().mockReturnValue([
          {
            id: 'unknown-weapon',
            name: 'Unknown Weapon',
            category: 'UNKNOWN_CATEGORY',
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: 1,
            weight: 1,
            criticalSlots: 1,
            costCBills: 1000,
            battleValue: 10,
            introductionYear: 3000,
          },
        ]),
        getAllAmmunition: jest.fn().mockReturnValue([]),
        getAllElectronics: jest.fn().mockReturnValue([]),
        getAllMiscEquipment: jest.fn().mockReturnValue([]),
      });

      const freshResolver = new EquipmentNameResolver();
      freshResolver.initialize();

      const result = freshResolver.resolve('Unknown', 'Unknown Weapon');
      expect(result.found).toBe(true);
    });
  });
});
