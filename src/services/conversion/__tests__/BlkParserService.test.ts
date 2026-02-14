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

    it('should parse an Aerospace fighter BLK file', () => {
      const blkContent = `
#building block data file
<BlockVersion>
1
</BlockVersion>
<Version>
MAM0
</Version>
<UnitType>
Aero
</UnitType>
<Name>
Firebird
</Name>
<Model>
FR-1
</Model>
<mul id:>
4170
</mul id:>
<year>
2390
</year>
<type>
IS Level 4
</type>
<role>
Attack Fighter
</role>
<motion_type>
Aerodyne
</motion_type>
<SafeThrust>
5
</SafeThrust>
<heatsinks>
10
</heatsinks>
<sink_type>
0
</sink_type>
<fuel>
240
</fuel>
<armor>
12
9
9
7
</armor>
<Nose Equipment>
Autocannon/2
</Nose Equipment>
<Left Wing Equipment>
LRM 10
</Left Wing Equipment>
<Right Wing Equipment>
LRM 10
</Right Wing Equipment>
<Aft Equipment>
</Aft Equipment>
<Fuselage Equipment>
IS Ammo AC/2
IS Ammo LRM-10
IS Ammo LRM-10
</Fuselage Equipment>
<tonnage>
45.0
</tonnage>
<quirks>
atmo_instability
obsolete
</quirks>
`;

      const result = parser.parse(blkContent);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.document.name).toBe('Firebird');
      expect(result.data.document.unitType).toBe('Aero');
      expect(result.data.document.mappedUnitType).toBe(UnitType.AEROSPACE);
      expect(result.data.document.model).toBe('FR-1');
      expect(result.data.document.safeThrust).toBe(5);
      expect(result.data.document.heatsinks).toBe(10);
      expect(result.data.document.fuel).toBe(240);
      expect(result.data.document.armor).toEqual([12, 9, 9, 7]);

      expect(result.data.document.equipmentByLocation['Nose']).toEqual([
        'Autocannon/2',
      ]);
      expect(result.data.document.equipmentByLocation['Left Wing']).toEqual([
        'LRM 10',
      ]);
      expect(result.data.document.equipmentByLocation['Fuselage']).toContain(
        'IS Ammo AC/2',
      );

      expect(result.data.document.quirks).toContain('atmo_instability');
      expect(result.data.document.quirks).toContain('obsolete');
    });

    it('should parse a DropShip BLK file with transporters', () => {
      const blkContent = `
#building block data file
<BlockVersion>
1
</BlockVersion>
<Version>
MAM0
</Version>
<UnitType>
Dropship
</UnitType>
<Name>
Gaajian System Patrol Boat
</Name>
<Model>
(2485)
</Model>
<mul id:>
7769
</mul id:>
<year>
2485
</year>
<type>
IS Level 2
</type>
<motion_type>
Spheroid
</motion_type>
<transporters>
smallcraftbay:2.0:2:1
2ndclassquarters:0.0:0
cargobay:75.0:1:6
</transporters>
<SafeThrust>
4
</SafeThrust>
<heatsinks>
68
</heatsinks>
<fuel>
5000
</fuel>
<armor>
206
180
180
170
</armor>
<Nose Equipment>
(B) PPC
PPC
PPC
</Nose Equipment>
<structural_integrity>
12
</structural_integrity>
<tonnage>
1500.0
</tonnage>
<designtype>
1
</designtype>
<crew>
21
</crew>
<officers>
3
</officers>
<gunners>
6
</gunners>
<marines>
42
</marines>
<escape_pod>
4
</escape_pod>
`;

      const result = parser.parse(blkContent);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.document.name).toBe('Gaajian System Patrol Boat');
      expect(result.data.document.unitType).toBe('Dropship');
      expect(result.data.document.mappedUnitType).toBe(UnitType.DROPSHIP);
      expect(result.data.document.tonnage).toBe(1500);
      expect(result.data.document.safeThrust).toBe(4);
      expect(result.data.document.structuralIntegrity).toBe(12);
      expect(result.data.document.crew).toBe(21);
      expect(result.data.document.officers).toBe(3);
      expect(result.data.document.marines).toBe(42);
      expect(result.data.document.escapePod).toBe(4);

      expect(result.data.document.transporters).toContain(
        'smallcraftbay:2.0:2:1',
      );
      expect(result.data.document.transporters).toContain('cargobay:75.0:1:6');

      expect(result.data.document.equipmentByLocation['Nose']).toContain(
        '(B) PPC',
      );
    });

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
