import { equipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import {
  getEquipmentRegistry,
  EquipmentRegistry,
} from '@/services/equipment/EquipmentRegistry';
import {
  normalizeEquipmentId,
  resolveEquipmentId,
  inferPreferredTechBaseFromCriticalSlots,
} from '@/services/units/unitLoaderService/equipmentResolution';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { EquipmentType } from '@/types/enums/EquipmentType';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { IEquipmentItem, EquipmentCategory } from '@/types/equipment';

jest.mock('@/services/equipment/EquipmentLookupService');
jest.mock('@/services/equipment/EquipmentRegistry');

const mockEquipmentLookupService = equipmentLookupService as jest.Mocked<
  typeof equipmentLookupService
>;
const mockGetEquipmentRegistry = getEquipmentRegistry as jest.MockedFunction<
  typeof getEquipmentRegistry
>;

// Helper to create mock equipment items
function createMockEquipment(
  id: string,
  name: string,
  techBase: TechBase,
): IEquipmentItem {
  return {
    id,
    name,
    category: EquipmentCategory.ENERGY_WEAPON,
    techBase,
    rulesLevel: RulesLevel.STANDARD,
    weight: 1,
    criticalSlots: 1,
    costCBills: 1000,
    battleValue: 10,
    introductionYear: 3025,
  };
}

describe('UnitLoaderService Equipment Resolution', () => {
  describe('normalizeEquipmentId', () => {
    it('should normalize Ultra AC IDs', () => {
      expect(normalizeEquipmentId('Ultra-AC-5', TechBase.INNER_SPHERE)).toBe(
        'uac-5',
      );
      expect(normalizeEquipmentId('Ultra AC 5', TechBase.INNER_SPHERE)).toBe(
        'uac-5',
      );
      expect(normalizeEquipmentId('UltraAC5', TechBase.INNER_SPHERE)).toBe(
        'uac-5',
      );
    });

    it('should normalize Clan Ultra AC IDs', () => {
      expect(normalizeEquipmentId('Clan-Ultra-AC-5', TechBase.CLAN)).toBe(
        'clan-uac-5',
      );
    });

    it('should normalize LB X AC IDs', () => {
      expect(normalizeEquipmentId('LB-10-X-AC', TechBase.INNER_SPHERE)).toBe(
        'lb-10x-ac',
      );
    });

    it('should normalize Rotary AC IDs', () => {
      expect(normalizeEquipmentId('Rotary-AC-5', TechBase.INNER_SPHERE)).toBe(
        'rac-5',
      );
    });

    it('should normalize Light AC IDs', () => {
      expect(normalizeEquipmentId('Light-AC-5', TechBase.INNER_SPHERE)).toBe(
        'lac-5',
      );
    });

    it('should normalize ER laser IDs', () => {
      expect(
        normalizeEquipmentId(
          'Extended-Range-Large-Laser',
          TechBase.INNER_SPHERE,
        ),
      ).toBe('er-large-laser');
    });

    it('should normalize ammo IDs', () => {
      expect(
        normalizeEquipmentId('Ultra-AC-5-Ammo', TechBase.INNER_SPHERE),
      ).toBe('uac-5-ammo');
      expect(
        normalizeEquipmentId('LB-10-X-AC-Ammo', TechBase.INNER_SPHERE),
      ).toBe('lb-10x-ac-ammo');
    });
  });

  describe('inferPreferredTechBaseFromCriticalSlots', () => {
    it('should return null for empty slots', () => {
      expect(
        inferPreferredTechBaseFromCriticalSlots([], 'mediumlaser'),
      ).toBeNull();
      expect(
        inferPreferredTechBaseFromCriticalSlots(undefined, 'mediumlaser'),
      ).toBeNull();
    });

    it('should detect Clan tech from tokens', () => {
      const slots = ['CLMediumLaser', 'CLMediumLaser'];
      expect(
        inferPreferredTechBaseFromCriticalSlots(slots, 'mediumlaser'),
      ).toBe(TechBase.CLAN);
    });

    it('should detect IS tech from tokens', () => {
      const slots = ['ISMediumLaser', 'ISMediumLaser'];
      expect(
        inferPreferredTechBaseFromCriticalSlots(slots, 'mediumlaser'),
      ).toBe(TechBase.INNER_SPHERE);
    });

    it('should return null if no tech marker matches the name key', () => {
      const slots = ['CLMediumLaser'];
      expect(
        inferPreferredTechBaseFromCriticalSlots(slots, 'largelaser'),
      ).toBeNull();
    });
  });

  describe('resolveEquipmentId', () => {
    let mockRegistry: jest.Mocked<EquipmentRegistry>;

    beforeEach(() => {
      jest.clearAllMocks();

      mockRegistry = {
        isReady: jest.fn().mockReturnValue(false),
        lookup: jest
          .fn()
          .mockReturnValue({ found: false, equipment: null, category: null }),
      } as unknown as jest.Mocked<EquipmentRegistry>;
      mockGetEquipmentRegistry.mockReturnValue(mockRegistry);
    });

    it('should resolve standard IDs', () => {
      mockEquipmentLookupService.getById.mockImplementation((id: string) => {
        if (id === 'medium-laser') {
          return createMockEquipment(
            'medium-laser',
            'Medium Laser',
            TechBase.INNER_SPHERE,
          );
        }
        return undefined;
      });

      const result = resolveEquipmentId(
        'medium-laser',
        TechBase.INNER_SPHERE,
        TechBaseMode.INNER_SPHERE,
        [],
      );
      expect(result.equipmentDef?.id).toBe('medium-laser');
      expect(result.resolvedId).toBe('medium-laser');
    });

    it('should prefer Clan variant for Clan units', () => {
      mockEquipmentLookupService.getById.mockImplementation((id: string) => {
        if (id === 'uac-5') {
          return createMockEquipment(
            'uac-5',
            'Ultra AC/5',
            TechBase.INNER_SPHERE,
          );
        }
        if (id === 'clan-uac-5') {
          return createMockEquipment(
            'clan-uac-5',
            'Ultra AC/5 (Clan)',
            TechBase.CLAN,
          );
        }
        return undefined;
      });

      const result = resolveEquipmentId(
        'uac-5',
        TechBase.CLAN,
        TechBaseMode.CLAN,
        [],
      );
      expect(result.equipmentDef?.id).toBe('clan-uac-5');
      expect(result.resolvedId).toBe('clan-uac-5');
    });

    it('should resolve via normalized registry lookup if direct normalization fails to find in lookup service', () => {
      mockEquipmentLookupService.getById.mockReturnValue(undefined);
      mockRegistry.isReady.mockReturnValue(true);

      // First lookup for the original ID fails
      mockRegistry.lookup.mockReturnValueOnce({
        found: false,
        equipment: null,
        category: null,
      });

      // Second lookup for the normalized ID succeeds - use null for equipment since it just triggers the fallback
      mockRegistry.lookup.mockReturnValueOnce({
        found: true,
        equipment: null,
        category: EquipmentType.WEAPON,
      });

      mockEquipmentLookupService.getById.mockImplementation((id: string) => {
        if (id === 'uac-5') {
          return createMockEquipment(
            'uac-5',
            'Ultra AC/5',
            TechBase.INNER_SPHERE,
          );
        }
        return undefined;
      });

      // 'Ultra-AC-5' normalizes to 'uac-5', so normalizedId !== id ('uac-5' !== 'Ultra-AC-5')
      const result = resolveEquipmentId(
        'Ultra-AC-5',
        TechBase.INNER_SPHERE,
        TechBaseMode.INNER_SPHERE,
        [],
      );
      expect(result.equipmentDef?.id).toBe('uac-5');
      expect(result.resolvedId).toBe('uac-5');
    });

    it('should return normalized ID even if not found in any service', () => {
      mockEquipmentLookupService.getById.mockReturnValue(undefined);
      mockRegistry.isReady.mockReturnValue(false);

      const result = resolveEquipmentId(
        'Unknown-Weapon-X',
        TechBase.INNER_SPHERE,
        TechBaseMode.INNER_SPHERE,
        [],
      );
      expect(result.equipmentDef).toBeUndefined();
      expect(result.resolvedId).toBe('unknown-weapon-x');
    });

    it('should handle tech base fallbacks if preferred not found', () => {
      mockEquipmentLookupService.getById.mockImplementation((id: string) => {
        if (id === 'clan-only-weapon') {
          return createMockEquipment(
            'clan-only-weapon',
            'Clan Only Weapon',
            TechBase.CLAN,
          );
        }
        return undefined;
      });

      // Unit is IS, prefers IS, but only Clan version exists
      const result = resolveEquipmentId(
        'clan-only-weapon',
        TechBase.INNER_SPHERE,
        TechBaseMode.INNER_SPHERE,
        [],
      );
      expect(result.equipmentDef?.id).toBe('clan-only-weapon');
      expect(result.resolvedId).toBe('clan-only-weapon');
    });
  });

  describe('stripTechPrefixFromNormalizedKey', () => {
    // This is an internal function but it's used by inferPreferredTechBaseFromCriticalSlots
    it('should handle various tech prefixes in tokens', () => {
      // These should all be handled by getTechHintFromToken and stripTechPrefixFromNormalizedKey

      // CL-Medium-Laser -> hint 'clan', normalized 'clmediumlaser', stripped 'mediumlaser'
      expect(
        inferPreferredTechBaseFromCriticalSlots(
          ['CLMediumLaser'],
          'mediumlaser',
        ),
      ).toBe(TechBase.CLAN);
      expect(
        inferPreferredTechBaseFromCriticalSlots(
          ['ISMediumLaser'],
          'mediumlaser',
        ),
      ).toBe(TechBase.INNER_SPHERE);
    });
  });
});
