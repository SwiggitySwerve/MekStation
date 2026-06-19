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
  });
});
