/**
 * BlkParserService — parseByUnitType dispatcher tests
 *
 * Verifies that the dispatcher returns the correct discriminated-union `kind`
 * and that key fields are extracted from each unit type's BLK fixture.
 */

import {
  getBlkParserService,
  resetBlkParserService,
} from "../BlkParserService";

// ---------------------------------------------------------------------------
// Fixtures — minimal but valid BLK content for each supported type
// ---------------------------------------------------------------------------

const VEHICLE_BLK = `
<BlockVersion>
1
</BlockVersion>
<Version>
MAM0
</Version>
<UnitType>
Tank
</UnitType>
<Name>
Manticore Heavy Tank
</Name>
<model>

</model>
<mul id:>
2021
</mul id:>
<year>
2575
</year>
<type>
IS Level 1
</type>
<role>
Brawler
</role>
<motion_type>
Tracked
</motion_type>
<cruiseMP>
4
</cruiseMP>
<engine_type>
0
</engine_type>
<armor>
42
33
33
26
42
</armor>
<Body Equipment>
IS Ammo LRM-10
</Body Equipment>
<Turret Equipment>
LRM 10
PPC
</Turret Equipment>
<tonnage>
60.0
</tonnage>
`;

const VTOL_BLK = `
<BlockVersion>
1
</BlockVersion>
<Version>
MAM0
</Version>
<UnitType>
VTOL
</UnitType>
<Name>
Warrior Attack Helicopter
</Name>
<Model>
H-7A
</Model>
<mul id:>
3467
</mul id:>
<year>
2489
</year>
<type>
IS Level 1
</type>
<role>
Scout
</role>
<motion_type>
VTOL
</motion_type>
<cruiseMP>
8
</cruiseMP>
<armor>
8
6
6
5
2
</armor>
<Front Equipment>
SRM 2
</Front Equipment>
<tonnage>
20.0
</tonnage>
`;

const AERO_BLK = `
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
Shilone
</Name>
<Model>
SL-17
</Model>
<mul id:>
2923
</mul id:>
<year>
2796
</year>
<type>
IS Level 2
</type>
<role>
Fire Support
</role>
<motion_type>
Aerodyne
</motion_type>
<SafeThrust>
6
</SafeThrust>
<cockpit_type>
0
</cockpit_type>
<heatsinks>
20
</heatsinks>
<sink_type>
0
</sink_type>
<fuel>
400
</fuel>
<armor>
60
44
44
36
</armor>
<Nose Equipment>
LRM 20
Large Laser
</Nose Equipment>
<Aft Equipment>
SRM 4
</Aft Equipment>
<tonnage>
65.0
</tonnage>
`;

const CONV_FIGHTER_BLK = `
<BlockVersion>
1
</BlockVersion>
<Version>
MAM0
</Version>
<UnitType>
ConvFighter
</UnitType>
<Name>
Thunderbird
</Name>
<Model>
TRB-001
</Model>
<mul id:>
3250
</mul id:>
<year>
2400
</year>
<type>
IS Level 1
</type>
<role>
Interceptor
</role>
<motion_type>
Aerodyne
</motion_type>
<SafeThrust>
7
</SafeThrust>
<fuel>
320
</fuel>
<armor>
14
10
10
8
</armor>
<Nose Equipment>
Medium Laser
</Nose Equipment>
<tonnage>
25.0
</tonnage>
`;

const BATTLEARMOR_BLK = `
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
Elemental Battle Armor
</Name>
<Model>
(Sqd5)
</Model>
<mul id:>
8489
</mul id:>
<year>
3050
</year>
<type>
Clan Level 2
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
<jumpingMP>
3
</jumpingMP>
<armor_type>
28
</armor_type>
<armor>
10
</armor>
<Trooper Count>
5
</Trooper Count>
<weightclass>
2
</weightclass>
<chassis>
biped
</chassis>
<Point Equipment>
CLBAMG:RA
BABattleClaw:LA
SwarmMek
LegAttack
</Point Equipment>
`;

const INFANTRY_BLK = `
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
Clan Heavy Foot Infantry
</Name>
<Model>
Ebon Keshik Point
</Model>
<mul id:>
608
</mul id:>
<squad_size>
5
</squad_size>
<squadn>
1
</squadn>
<Primary>
InfantryClanMauserIICIAS
</Primary>
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
2875
</year>
<motion_type>
Leg
</motion_type>
`;

const PROTOMECH_BLK = `
<BlockVersion>
1
</BlockVersion>
<Version>
MAM0
</Version>
<UnitType>
ProtoMech
</UnitType>
<Name>
Roc
</Name>
<Model>
2
</Model>
<mul id:>
2727
</mul id:>
<year>
3062
</year>
<type>
Clan Level 2
</type>
<role>
Brawler
</role>
<motion_type>
Biped
</motion_type>
<cruiseMP>
5
</cruiseMP>
<jumpingMP>
5
</jumpingMP>
<armor>
2
6
3
3
4
</armor>
<Main Gun Equipment>
CLHeavyMediumLaser
</Main Gun Equipment>
<tonnage>
7.0
</tonnage>
`;

const WARSHIP_BLK = `
<BlockVersion>
1
</BlockVersion>
<Version>
MAM0
</Version>
<UnitType>
Warship
</UnitType>
<Name>
Fredasa
</Name>
<Model>
(Corvette)
</Model>
<mul id:>
4531
</mul id:>
<year>
2401
</year>
<type>
IS Level 3
</type>
<tonnage>
250000.0
</tonnage>
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BlkParserService.parseByUnitType", () => {
  let parser: ReturnType<typeof getBlkParserService>;

  beforeEach(() => {
    resetBlkParserService();
    parser = getBlkParserService();
  });

  // ------ Vehicle --------------------------------------------------------

  it("dispatches Tank BLK to kind=vehicle with correct fields", () => {
    const result = parser.parseByUnitType(VEHICLE_BLK);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.result.kind).toBe("vehicle");
    if (result.result.kind !== "vehicle") return;

    const v = result.result.data;
    expect(v.name).toBe("Manticore Heavy Tank");
    expect(v.tonnage).toBe(60);
    expect(v.cruiseMP).toBe(4);
    expect(v.motionType).toBe("Tracked");
    expect(v.techBase).toBe("INNER_SPHERE");
    expect(v.blkUnitType).toBe("Tank");
    // Armor array: Front, Right, Left, Rear, Turret
    expect(v.armor).toHaveLength(5);
    expect(v.armor[0]).toBe(42);
    // Equipment extracted
    expect(v.equipmentByLocation["Turret"]).toContain("LRM 10");
  });

  it("dispatches VTOL BLK to kind=vehicle", () => {
    const result = parser.parseByUnitType(VTOL_BLK);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.result.kind).toBe("vehicle");
    if (result.result.kind !== "vehicle") return;
    expect(result.result.data.blkUnitType).toBe("VTOL");
    expect(result.result.data.name).toBe("Warrior Attack Helicopter");
  });

  // ------ Aerospace ------------------------------------------------------

  it("dispatches Aero BLK to kind=aerospace with correct fields", () => {
    const result = parser.parseByUnitType(AERO_BLK);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.result.kind).toBe("aerospace");
    if (result.result.kind !== "aerospace") return;

    const a = result.result.data;
    expect(a.name).toBe("Shilone");
    expect(a.tonnage).toBe(65);
    expect(a.safeThrust).toBe(6);
    expect(a.maxThrust).toBe(12);
    expect(a.fuelPoints).toBe(400);
    expect(a.heatsinks).toBe(20);
    // Armor [Nose, LW, RW, Aft]
    expect(a.armor).toHaveLength(4);
    expect(a.armor[0]).toBe(60);
    expect(a.equipmentByLocation["Nose"]).toContain("LRM 20");
  });

  it("dispatches ConvFighter BLK to kind=aerospace", () => {
    const result = parser.parseByUnitType(CONV_FIGHTER_BLK);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.result.kind).toBe("aerospace");
    if (result.result.kind !== "aerospace") return;
    expect(result.result.data.blkUnitType).toBe("ConvFighter");
  });

  // ------ Battle Armor ---------------------------------------------------

  it("dispatches BattleArmor BLK to kind=battlearmor with correct fields", () => {
    const result = parser.parseByUnitType(BATTLEARMOR_BLK);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.result.kind).toBe("battlearmor");
    if (result.result.kind !== "battlearmor") return;

    const ba = result.result.data;
    expect(ba.name).toBe("Elemental Battle Armor");
    expect(ba.trooperCount).toBe(5);
    expect(ba.chassis).toBe("biped");
    expect(ba.motionType).toBe("Jump");
    expect(ba.jumpMP).toBe(3);
    expect(ba.armorPerTrooper).toBe(10);
    expect(ba.techBase).toBe("CLAN");
    expect(ba.equipmentByLocation["Point"]).toContain("CLBAMG:RA");
  });

  // ------ Infantry -------------------------------------------------------

  it("dispatches Infantry BLK to kind=infantry with correct fields", () => {
    const result = parser.parseByUnitType(INFANTRY_BLK);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.result.kind).toBe("infantry");
    if (result.result.kind !== "infantry") return;

    const inf = result.result.data;
    expect(inf.name).toBe("Clan Heavy Foot Infantry");
    expect(inf.squadSize).toBe(5);
    expect(inf.squadCount).toBe(1);
    expect(inf.primaryWeapon).toBe("InfantryClanMauserIICIAS");
    expect(inf.motionType).toBe("Leg");
    expect(inf.techBase).toBe("CLAN");
    expect(inf.armorKit).toBe("ClanKit");
  });

  // ------ ProtoMech ------------------------------------------------------

  it("dispatches ProtoMech BLK to kind=protomech with correct fields", () => {
    const result = parser.parseByUnitType(PROTOMECH_BLK);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.result.kind).toBe("protomech");
    if (result.result.kind !== "protomech") return;

    const proto = result.result.data;
    expect(proto.name).toBe("Roc");
    expect(proto.tonnage).toBe(7);
    expect(proto.cruiseMP).toBe(5);
    expect(proto.jumpMP).toBe(5);
    expect(proto.isGlider).toBe(false);
    expect(proto.techBase).toBe("CLAN");
    // armor array: Head, Torso, L Arm, R Arm, Legs
    expect(proto.armor).toHaveLength(5);
    expect(proto.equipmentByLocation["Main Gun"]).toContain(
      "CLHeavyMediumLaser",
    );
  });

  // ------ Unsupported ----------------------------------------------------

  it("returns kind=unsupported with reason=warship for Warship BLK", () => {
    const result = parser.parseByUnitType(WARSHIP_BLK);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.result.kind).toBe("unsupported");
    if (result.result.kind !== "unsupported") return;
    expect(result.result.data.reason).toBe("warship");
    expect(result.result.data.blkUnitType).toBe("Warship");
    expect(result.result.data.name).toBe("Fredasa");
  });

  // ------ Parse failure --------------------------------------------------

  it("returns success=false when BLK content is malformed", () => {
    const result = parser.parseByUnitType("<UnitType>Tank</UnitType>");
    // Missing required Name / year / tonnage — should fail
    expect(result.success).toBe(false);
  });
});
