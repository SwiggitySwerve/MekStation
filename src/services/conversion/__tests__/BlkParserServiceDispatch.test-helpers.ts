/**
 * BLK parser dispatcher fixtures.
 */

// ---------------------------------------------------------------------------
// Fixtures — minimal but valid BLK content for each supported type
// ---------------------------------------------------------------------------

export const VEHICLE_BLK = `
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

export const VTOL_BLK = `
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

export const AERO_BLK = `
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

export const CONV_FIGHTER_BLK = `
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

export const BATTLEARMOR_BLK = `
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

export const INFANTRY_BLK = `
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

export const PROTOMECH_BLK = `
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

export const WARSHIP_BLK = `
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
