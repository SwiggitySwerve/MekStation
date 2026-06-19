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
    it('should parse an Infantry BLK file', () => {
      const blkContent = `
#building block data file
<BlockVersion>
1
</BlockVersion>
<Version>
MAM0
</Version>
<UnitType>
Infantry
</UnitType>
<Name>
Clan Anti-Infantry
</Name>
<Model>
Clan Jade Falcon Police
</Model>
<mul id:>
599
</mul id:>
<squad_size>
5
</squad_size>
<squadn>
4
</squadn>
<Primary>
InfantryAvengerCCW
</Primary>
<Secondary>
InfantryTranquilizerGun
</Secondary>
<secondn>
2
</secondn>
<armorKit>
ClanKit
</armorKit>
<type>
Clan Level 3
</type>
<role>
Ambusher
</role>
<year>
2825
</year>
<motion_type>
Wheeled
</motion_type>
<Tonnage>
0
</Tonnage>
`;

      const result = parser.parse(blkContent);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.document.name).toBe('Clan Anti-Infantry');
      expect(result.data.document.unitType).toBe('Infantry');
      expect(result.data.document.mappedUnitType).toBe(UnitType.INFANTRY);
      expect(result.data.document.squadSize).toBe(5);
      expect(result.data.document.squadn).toBe(4);
      expect(result.data.document.primary).toBe('InfantryAvengerCCW');
      expect(result.data.document.secondary).toBe('InfantryTranquilizerGun');
      expect(result.data.document.secondn).toBe(2);
      expect(result.data.document.armorKit).toBe('ClanKit');
      expect(result.data.document.motionType).toBe('Wheeled');
    });

    it('should fail on missing UnitType', () => {
      const blkContent = `
<BlockVersion>
1
</BlockVersion>
<Name>
Test Unit
</Name>
<Tonnage>
50
</Tonnage>
<year>
3025
</year>
`;

      const result = parser.parse(blkContent);

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.errors).toContain('Missing required field: UnitType');
    });

    it('should fail on unknown UnitType', () => {
      const blkContent = `
<BlockVersion>
1
</BlockVersion>
<UnitType>
UnknownType
</UnitType>
<Name>
Test Unit
</Name>
<Tonnage>
50
</Tonnage>
<year>
3025
</year>
`;

      const result = parser.parse(blkContent);

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(
        result.error.errors.some((e: string) =>
          e.includes('Unknown unit type'),
        ),
      ).toBe(true);
    });
  });
});
