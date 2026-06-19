/**
 * BLK Parser Service Tests
 *
 * Tests parsing of BLK files for various unit types.
 */

import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { getBlkParserService } from '../BlkParserService';

describe('BlkParserService', () => {
  const parser = getBlkParserService();

  describe('parse', () => {
    it('should parse a simple vehicle BLK file', () => {
      const blkContent = `
#building block data file
<BlockVersion>
1
</BlockVersion>
<Version>
MAM0
</Version>
<UnitType>
SupportTank
</UnitType>
<Name>
Air Car
</Name>
<model>

</model>
<mul id:>
3684
</mul id:>
<Tonnage>
40
</Tonnage>
<cruiseMP>
11
</cruiseMP>
<Armor>
8
8
8
8
</Armor>
<barrating>
5
</barrating>
<type>
IS Level 1
</type>
<role>
None
</role>
<year>
2100
</year>
<motion_type>
Hover
</motion_type>
<source>
TR:3025
</source>
`;

      const result = parser.parse(blkContent);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.document.name).toBe('Air Car');
      expect(result.data.document.unitType).toBe('SupportTank');
      expect(result.data.document.mappedUnitType).toBe(
        UnitType.SUPPORT_VEHICLE,
      );
      expect(result.data.document.tonnage).toBe(40);
      expect(result.data.document.cruiseMP).toBe(11);
      expect(result.data.document.armor).toEqual([8, 8, 8, 8]);
      expect(result.data.document.barRating).toBe(5);
      expect(result.data.document.year).toBe(2100);
      expect(result.data.document.motionType).toBe('Hover');
    });

    it('should parse a Battle Armor BLK file with equipment', () => {
      const blkContent = `
#building block data file
<BlockVersion>
1
</BlockVersion>
<Version>
MAM0
</Version>
<UnitType>
BattleArmor
</UnitType>
<Name>
Achileus Light Battle Armor
</Name>
<Model>
[David](Sqd4)
</Model>
<mul id:>
7
</mul id:>
<year>
3064
</year>
<type>
IS Level 2
</type>
<role>
Ambusher
</role>
<motion_type>
Jump
</motion_type>
<cruiseMP>
1
</cruiseMP>
<armor_type>
33
</armor_type>
<Squad Equipment>
BADavidLightGaussRifle:RA
BAAPMount:LA
InfantryAssaultRifle:APM
BABasicManipulator:LA
BABasicManipulator:RA
</Squad Equipment>
<Trooper 1 Equipment>
</Trooper 1 Equipment>
<chassis>
biped
</chassis>
<jumpingMP>
3
</jumpingMP>
<armor>
6
</armor>
<Trooper Count>
4
</Trooper Count>
<weightclass>
1
</weightclass>
<Tonnage>
0.4
</Tonnage>
`;

      const result = parser.parse(blkContent);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.document.name).toBe('Achileus Light Battle Armor');
      expect(result.data.document.unitType).toBe('BattleArmor');
      expect(result.data.document.mappedUnitType).toBe(UnitType.BATTLE_ARMOR);
      expect(result.data.document.model).toBe('[David](Sqd4)');
      expect(result.data.document.chassis).toBe('biped');
      expect(result.data.document.trooperCount).toBe(4);
      expect(result.data.document.jumpingMP).toBe(3);
      expect(result.data.document.weightClass).toBe(1);

      expect(result.data.document.equipmentByLocation['Squad']).toBeDefined();
      expect(result.data.document.equipmentByLocation['Squad']).toContain(
        'BADavidLightGaussRifle:RA',
      );
      expect(result.data.document.equipmentByLocation['Squad']).toContain(
        'BABasicManipulator:LA',
      );
    });
  });
});
