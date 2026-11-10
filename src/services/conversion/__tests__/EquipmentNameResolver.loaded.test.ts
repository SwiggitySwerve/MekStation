/**
 * EquipmentNameResolver loaded-data resolution tests.
 */

import * as EquipmentLoaderService from '@/services/equipment/EquipmentLoaderService';
import { TechBase } from '@/types/enums/TechBase';

import { EquipmentNameResolver } from '../EquipmentNameResolver';
import {
  NAME_NORMALIZATION_PATTERNS,
  normalizeName,
  normalizeNameWithTechBase,
  stripQuantityPrefix,
} from '../EquipmentNameResolverMappings';

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

describe('equipment name normalization retains the existing tech prefix', () => {
  it.each([
    ['IS CASE II', 'caseii', TechBase.INNER_SPHERE],
    ['CLCASEII', 'caseii', TechBase.CLAN],
    ['Clan CASE II', 'caseii', TechBase.CLAN],
    ['CASEII', 'caseii', undefined],
    ['Claws', 'aws', TechBase.CLAN],
    ['ISMediumlaser', 'mediumlaser', TechBase.INNER_SPHERE],
    ['Medium-Laser', 'mediumlaser', undefined],
  ] as const)(
    'preserves the old normalized spelling for %s',
    (name, normalizedName, techBase) => {
      expect(normalizeName(name)).toBe(normalizedName);
      expect(normalizeNameWithTechBase(name)).toEqual({
        normalizedName,
        techBase,
      });
    },
  );

  it('reads tech facts independently of normalization-pattern order', () => {
    NAME_NORMALIZATION_PATTERNS.reverse();
    try {
      expect(normalizeNameWithTechBase('ISCASEII')).toEqual({
        normalizedName: 'caseii',
        techBase: TechBase.INNER_SPHERE,
      });
    } finally {
      NAME_NORMALIZATION_PATTERNS.reverse();
    }
  });

  it('uses the existing quantity-prefix owner before reading tech', () => {
    const { cleanType } = stripQuantityPrefix('2CLCASEII');
    expect(normalizeNameWithTechBase(cleanType)).toEqual({
      normalizedName: 'caseii',
      techBase: TechBase.CLAN,
    });
  });
});

describe('normalized equipment names retain both pinned tech sides', () => {
  const innerSphere = {
    id: 'caseii',
    name: 'CASE II',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: 1,
    weight: 1,
    criticalSlots: 1,
    costCBills: 175000,
    battleValue: 0,
    introductionYear: 3064,
  };
  const clan = {
    ...innerSphere,
    id: 'clan-caseii',
    name: 'Clan CASE II',
    techBase: TechBase.CLAN,
    weight: 0.5,
    introductionYear: 3062,
  };

  function load(items: (typeof innerSphere)[]) {
    (EquipmentLoaderService.getEquipmentLoader as jest.Mock).mockReturnValue({
      getIsLoaded: jest.fn().mockReturnValue(true),
      getAllWeapons: jest.fn().mockReturnValue([]),
      getAllAmmunition: jest.fn().mockReturnValue([]),
      getAllElectronics: jest.fn().mockReturnValue([]),
      getAllMiscEquipment: jest.fn().mockReturnValue(items),
    });
    return new EquipmentNameResolver();
  }

  const contexts = [undefined, TechBase.INNER_SPHERE, TechBase.CLAN] as const;
  // Each row covers conversion / conversionIS / conversionClan in the captured
  // CASE II matrix. MiscType.java:4809-4815,4839-4845 at MegaMek 48fcb2f64.
  const expected = [
    ['IS CASE II', ['caseii', 'caseii', 'caseii']],
    ['ISCASEII', ['caseii', 'caseii', 'caseii']],
    ['ISCASEii', ['caseii', 'caseii', 'caseii']],
    ['iscaseii', ['caseii', 'caseii', 'caseii']],
    ['CLCASEII', ['clan-caseii', 'clan-caseii', 'clan-caseii']],
    ['Clan CASE II', ['clan-caseii', 'clan-caseii', 'clan-caseii']],
    ['CASEII', ['caseii', 'caseii', 'clan-caseii']],
    ['caseii', ['caseii', 'caseii', 'clan-caseii']],
  ] as const;

  for (const order of ['IS first', 'Clan first'] as const) {
    it.each(
      expected.flatMap(([name, targets]) =>
        contexts.map((tech, index) => [name, tech, targets[index]] as const),
      ),
    )(`${order}: %s with context %s resolves to %s`, (name, tech, id) => {
      const resolver = load(
        order === 'IS first' ? [innerSphere, clan] : [clan, innerSphere],
      );
      const result = resolver.resolve(name, name, tech);
      expect(result.equipmentId).toBe(id);
      expect(result.equipment?.weight).toBe(id === 'caseii' ? 1 : 0.5);
    });
  }

  it('retains exact unqualified-name precedence and direct canonical lookup', () => {
    const resolver = load([innerSphere, clan]);
    expect(
      resolver.resolve('CASE II', 'CASE II', TechBase.CLAN).equipmentId,
    ).toBe('caseii');
    expect(resolver.getById('clan-caseii')?.weight).toBe(0.5);
  });

  it('retains last-write precedence within one tech side', () => {
    const resolver = load([
      innerSphere,
      { ...innerSphere, id: 'caseii-duplicate', name: 'IS CASE II' },
    ]);
    expect(resolver.resolve('ISCASEII', 'Unknown').equipmentId).toBe(
      'caseii-duplicate',
    );
  });

  it.each([innerSphere, clan])(
    'retains the sole legacy candidate when a twin is absent: $id',
    (item) => {
      const resolver = load([item]);
      expect(resolver.resolve('CASEII', 'Unknown').equipmentId).toBe(item.id);
    },
  );
});
