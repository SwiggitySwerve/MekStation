import { BlkParserService } from '@/services/conversion/BlkParserService';
import { VehicleUnitHandler } from '@/services/units/handlers/VehicleUnitHandler';
import { VTOLUnitHandler } from '@/services/units/handlers/VTOLUnitHandler';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { hasBVTargetingComputer } from '@/utils/construction/battleValueWeapons';

/** @spec openspec/changes/establish-all-unit-data-parity/specs/battle-value-system/spec.md */
const cases = [
  {
    name: 'Chalchiuhtotolin Support Tank (Bombast Laser)',
    java: 911,
    cause: 'targeting',
    armorCode: 1,
    vtol: false,
    // mm-data 50f7efe: vehicles/3085u/Cutting Edge/Chalchiuhtotolin Support Tank (Bombast Laser).blk
    // Original source SHA-256: 15e95ecc1896e779a65c7a012f0b36f260daadd5f27cf0129b7de9b406e4396e; prose omitted, native facts retained.
    text: `
      <UUID>
      019f583e-e6b6-7ca7-b44e-e6491880e623
      </UUID>

      <UnitType>
      Tank
      </UnitType>

      <Name>
      Chalchiuhtotolin Support Tank
      </Name>

      <Model>
      (Bombast Laser)
      </Model>

      <mul id:>
      536
      </mul id:>

      <year>
      3085
      </year>

      <type>
      Mixed (Clan Chassis) Experimental
      </type>

      <role>
      Brawler
      </role>

      <motion_type>
      Wheeled
      </motion_type>

      <cruiseMP>
      5
      </cruiseMP>

      <engine_type>
      0
      </engine_type>

      <clan_engine>
      false
      </clan_engine>

      <armor_type>
      1
      </armor_type>

      <armor_tech_rating>
      0
      </armor_tech_rating>

      <armor_tech_level>
      -1
      </armor_tech_level>

      <armor>
      39
      27
      27
      16
      25
      </armor>

      <Body Equipment>
      Clan Streak SRM 4 Ammo
      CLCASE
      CLTargeting Computer
      Clan Light Machine Gun Ammo - Half
      </Body Equipment>

      <Front Equipment>
      CLLightMG
      </Front Equipment>

      <Right Equipment>
      CLLightMG
      </Right Equipment>

      <Left Equipment>
      CLLightMG
      </Left Equipment>

      <Rear Equipment>
      CLLightMG
      </Rear Equipment>

      <Turret Equipment>
      Bombast Laser
      CLStreakSRM4
      CLStreakSRM4
      </Turret Equipment>

      <tonnage>
      50.0
      </tonnage>
    `,
  },
  {
    name: 'Winston Combat Vehicle (Support)',
    java: 1830,
    cause: 'targeting',
    armorCode: 6,
    vtol: false,
    // mm-data 50f7efe: vehicles/3145/NTNU/Winston Combat Vehicle (Support).blk
    // Original source SHA-256: fe30579f55b3512192adcc6daa6b5b46c25e212cb9f95ac69eb05c9288a6435d; prose omitted, native facts retained.
    text: `
      <UUID>
      019f583e-e856-73e5-a492-341601806465
      </UUID>

      <UnitType>
      Tank
      </UnitType>

      <Name>
      Winston Combat Vehicle
      </Name>

      <Model>
      (Support)
      </Model>

      <mul id:>
      6798
      </mul id:>

      <year>
      3107
      </year>

      <type>
      Mixed (IS Chassis) Advanced
      </type>

      <role>
      Sniper
      </role>

      <motion_type>
      Tracked
      </motion_type>

      <cruiseMP>
      3
      </cruiseMP>

      <engine_type>
      4
      </engine_type>

      <armor_type>
      6
      </armor_type>

      <armor_tech_rating>
      0
      </armor_tech_rating>

      <armor_tech_level>
      -1
      </armor_tech_level>

      <armor>
      65
      58
      58
      50
      54
      </armor>

      <Body Equipment>
      ISAngelECMSuite
      ISTargeting Computer
      ISCASE
      IS Ammo SRM-4
      IS Ammo SRM-4
      IS Ammo SRM-4
      Clan Ammo LRM-20
      Clan Ammo LRM-20
      Clan Ammo LRM-20
      Clan Ammo LRM-20
      </Body Equipment>

      <Front Equipment>
      SRM 4
      SRM 4
      </Front Equipment>

      <Right Equipment>
      </Right Equipment>

      <Left Equipment>
      </Left Equipment>

      <Rear Equipment>
      </Rear Equipment>

      <Turret Equipment>
      Light PPC
      Light PPC
      CLLRM20
      CLLRM20
      ISTAG
      </Turret Equipment>

      <tonnage>
      70.0
      </tonnage>
    `,
  },
  {
    name: 'Winston Combat Vehicle (TSEMP)',
    java: 2565,
    cause: 'targeting',
    armorCode: 6,
    vtol: false,
    // mm-data 50f7efe: vehicles/3145/NTNU/Winston Combat Vehicle (TSEMP).blk
    // Original source SHA-256: 5fec0270b2fa45cf717de46c6f2c6294f7d1a65ca87f555c4b645311cdc82bfb; prose omitted, native facts retained.
    text: `
      <UUID>
      019f583e-e857-75cf-b78c-4d33fe9951fe
      </UUID>

      <UnitType>
      Tank
      </UnitType>

      <Name>
      Winston Combat Vehicle
      </Name>

      <Model>
      (TSEMP)
      </Model>

      <mul id:>
      6799
      </mul id:>

      <year>
      3114
      </year>

      <type>
      Mixed (IS Chassis) Experimental
      </type>

      <role>
      Sniper
      </role>

      <motion_type>
      Tracked
      </motion_type>

      <cruiseMP>
      3
      </cruiseMP>

      <engine_type>
      3
      </engine_type>

      <armor_type>
      6
      </armor_type>

      <armor_tech_rating>
      0
      </armor_tech_rating>

      <armor_tech_level>
      7
      </armor_tech_level>

      <armor>
      65
      58
      58
      50
      54
      </armor>

      <Body Equipment>
      ISTargeting Computer
      ISCASE
      Clan Ammo LRM-15
      Clan Ammo LRM-15
      Clan Ammo LRM-15
      ISAMS Ammo
      ISAMS Ammo
      </Body Equipment>

      <Front Equipment>
      ISAntiMissileSystem
      ISAntiMissileSystem
      </Front Equipment>

      <Right Equipment>
      </Right Equipment>

      <Left Equipment>
      </Left Equipment>

      <Rear Equipment>
      </Rear Equipment>

      <Turret Equipment>
      CLLRM15
      CLLRM15
      TSEMP Cannon
      TSEMP Cannon
      </Turret Equipment>

      <tonnage>
      70.0
      </tonnage>
    `,
  },
  {
    name: 'Gulltoppr OmniMonitor (A)',
    java: 3668,
    cause: 'targeting',
    armorCode: 0,
    vtol: false,
    // mm-data 50f7efe: vehicles/3145/Steiner/Gulltoppr OmniMonitor (A).blk
    // Original source SHA-256: a2b9d49d48f46d85a8078cdbf00566215ee403a2827417473539e35f7e7d1346; prose omitted, native facts retained.
    text: `
      <UUID>
      019f583e-e896-7166-977d-2d26817bffe6
      </UUID>

      <UnitType>
      Tank
      </UnitType>

      <Name>
      Gulltoppr OmniMonitor
      </Name>

      <Model>
      (A)
      </Model>

      <mul id:>
      6607
      </mul id:>

      <year>
      3102
      </year>

      <type>
      Mixed (IS Chassis) Experimental
      </type>

      <role>
      Missile Boat
      </role>

      <quirks>
      oversized
      difficult_maintain
      non_standard
      battle_computer
      poor_performance
      </quirks>

      <motion_type>
      Tracked
      </motion_type>

      <transporters>
      BattleArmorHandles - troopers:-1
      </transporters>

      <cruiseMP>
      2
      </cruiseMP>

      <engine_type>
      2
      </engine_type>

      <armor_type>
      0
      </armor_type>

      <armor_tech_rating>
      0
      </armor_tech_rating>

      <armor_tech_level>
      1
      </armor_tech_level>

      <omni>
      1
      </omni>

      <armor>
      136
      104
      104
      90
      90
      64
      50
      66
      </armor>

      <Body Equipment>
      CLTargeting Computer:OMNI
      CLECMSuite:OMNI
      Clan Gauss Ammo:OMNI
      Clan Gauss Ammo:OMNI
      Clan Gauss Ammo:OMNI
      Clan Gauss Ammo:OMNI
      Clan Ammo LRM-20 (Clan) Artemis V-capable:OMNI
      Clan Ammo LRM-20 (Clan) Artemis V-capable:OMNI
      Clan Ammo LRM-20 (Clan) Artemis V-capable:OMNI
      Clan Ammo LRM-20 (Clan) Artemis V-capable:OMNI
      Clan Ammo LRM-20 (Clan) Artemis V-capable:OMNI
      Clan Ammo LRM-20 (Clan) Artemis V-capable:OMNI
      Clan Ammo LRM-20 (Clan) Artemis V-capable:OMNI
      Clan Ammo LRM-20 (Clan) Artemis V-capable:OMNI
      ISCASE
      </Body Equipment>

      <Front Equipment>
      </Front Equipment>

      <Front Right Equipment>
      </Front Right Equipment>

      <Front Left Equipment>
      </Front Left Equipment>

      <Rear Right Equipment>
      </Rear Right Equipment>

      <Rear Left Equipment>
      </Rear Left Equipment>

      <Rear Equipment>
      </Rear Equipment>

      <Rear Turret Equipment>
      CLGaussRifle:OMNI
      CLGaussRifle:OMNI
      </Rear Turret Equipment>

      <Front Turret Equipment>
      CLLRM20:OMNI
      CLLRM20:OMNI
      CLLRM20:OMNI
      CLArtemisV:OMNI
      CLArtemisV:OMNI
      CLArtemisV:OMNI
      </Front Turret Equipment>

      <tonnage>
      190.0
      </tonnage>

      <baseChassisTurretWeight>
      2.5
      </baseChassisTurretWeight>

      <baseChassisTurret2Weight>
      3.0
      </baseChassisTurret2Weight>
    `,
  },
  {
    name: 'Behemoth Heavy Tank (Kurita Upgrade)',
    java: 1789,
    cause: 'targeting',
    armorCode: 26,
    vtol: false,
    // mm-data 50f7efe: vehicles/Rec Guides ilClan/Vol 31/Behemoth Heavy Tank (Kurita Upgrade).blk
    // Original source SHA-256: 6dd3400a72486dde5bba40fa9487088d451905234d263d42e0dee24fff2b0d55; prose omitted, native facts retained.
    text: `
      <UUID>
      019f583e-e9fd-7a32-babb-df82c9932a7e
      </UUID>

      <UnitType>
      Tank
      </UnitType>

      <Name>
      Behemoth Heavy Tank
      </Name>

      <Model>
      (Kurita Upgrade)
      </Model>

      <mul id:>
      9458
      </mul id:>

      <year>
      3140
      </year>

      <type>
      Mixed (IS Chassis) Advanced
      </type>

      <role>
      Juggernaut
      </role>

      <motion_type>
      Tracked
      </motion_type>

      <cruiseMP>
      2
      </cruiseMP>

      <engine_type>
      0
      </engine_type>

      <armor_type>
      26
      </armor_type>

      <armor_tech_rating>
      0
      </armor_tech_rating>

      <armor_tech_level>
      5
      </armor_tech_level>

      <armor>
      45
      38
      38
      38
      45
      </armor>

      <Body Equipment>
      ISCASE
      ISTargeting Computer
      IS Ultra AC/10 Ammo
      IS Ultra AC/10 Ammo
      IS Ultra AC/10 Ammo
      IS Ultra AC/10 Ammo
      IS Ultra AC/10 Ammo
      Clan Streak SRM 6 Ammo
      Clan Streak SRM 6 Ammo
      </Body Equipment>

      <Front Equipment>
      ISERMediumLaser
      ISERMediumLaser
      </Front Equipment>

      <Right Equipment>
      </Right Equipment>

      <Left Equipment>
      </Left Equipment>

      <Rear Equipment>
      </Rear Equipment>

      <Turret Equipment>
      ISUltraAC10
      ISUltraAC10
      CLStreakSRM6
      CLStreakSRM6
      CLStreakSRM6
      </Turret Equipment>

      <tonnage>
      100.0
      </tonnage>
    `,
  },
  {
    name: 'Minion Advanced Tactical Vehicle Silver Bullet',
    java: 560,
    cause: 'targeting',
    armorCode: 3,
    vtol: false,
    // mm-data 50f7efe: vehicles/XTRs/Gladiators/Minion Advanced Tactical Vehicle Silver Bullet.blk
    // Original source SHA-256: 4d7585fa25ea294a4801b48e80a26c9e249b56dd813705efda16460bcac7160b; prose omitted, native facts retained.
    text: `
      <UUID>
      019f583e-ebdf-7685-b0e0-a6f6e639e8ca
      </UUID>

      <UnitType>
      Tank
      </UnitType>

      <Name>
      Minion Advanced Tactical Vehicle
      </Name>

      <Model>
      'Silver Bullet'
      </Model>

      <mul id:>
      2185
      </mul id:>

      <year>
      3072
      </year>

      <type>
      Mixed (IS Chassis) Experimental
      </type>

      <role>
      Scout
      </role>

      <motion_type>
      Hover
      </motion_type>

      <cruiseMP>
      11
      </cruiseMP>

      <engine_type>
      2
      </engine_type>

      <armor_type>
      3
      </armor_type>

      <armor_tech_rating>
      0
      </armor_tech_rating>

      <armor_tech_level>
      7
      </armor_tech_level>

      <armor>
      28
      21
      21
      18
      </armor>

      <Body Equipment>
      CLTargeting Computer
      </Body Equipment>

      <Front Equipment>
      ISMediumPulseLaser
      ISLaserAntiMissileSystem
      </Front Equipment>

      <Right Equipment>
      </Right Equipment>

      <Left Equipment>
      </Left Equipment>

      <Rear Equipment>
      </Rear Equipment>

      <tonnage>
      20.0
      </tonnage>
    `,
  },
  {
    name: 'Strix Stealth VTOL',
    java: 688,
    cause: 'targeting',
    armorCode: 22,
    vtol: true,
    // mm-data 50f7efe: vehicles/XTRs/Republic I/Strix Stealth VTOL.blk
    // Original source SHA-256: e9991ccc6c3742805d109ec39f107f7236a741ead06651adb63f3286c3325289; prose omitted, native facts retained.
    text: `
      <UUID>
      019f583e-ec64-7b33-bb65-b705dec25ca0
      </UUID>

      <UnitType>
      VTOL
      </UnitType>

      <Name>
      Strix Stealth VTOL
      </Name>

      <Model>

      </Model>

      <mul id:>
      7298
      </mul id:>

      <year>
      3117
      </year>

      <type>
      Mixed (Clan Chassis) Experimental
      </type>

      <role>
      Scout
      </role>

      <quirks>
      anti_air
      </quirks>

      <motion_type>
      VTOL
      </motion_type>

      <cruiseMP>
      7
      </cruiseMP>

      <engine_type>
      0
      </engine_type>

      <clan_engine>
      false
      </clan_engine>

      <armor_type>
      22
      </armor_type>

      <armor_tech_rating>
      0
      </armor_tech_rating>

      <armor_tech_level>
      8
      </armor_tech_level>

      <armor>
      18
      13
      13
      10
      2
      8
      </armor>

      <Body Equipment>
      IS Vehicular Stealth
      WatchdogECMSuite
      CLTargeting Computer
      Clan Ultra AC/2 Ammo
      ISVTOLJetBooster
      </Body Equipment>

      <Front Equipment>
      CLUltraAC2
      </Front Equipment>

      <Right Equipment>
      </Right Equipment>

      <Left Equipment>
      </Left Equipment>

      <Rear Equipment>
      </Rear Equipment>

      <Rotor Equipment>
      </Rotor Equipment>

      <Turret Equipment>
      CLERSmallLaser
      CLERSmallLaser
      </Turret Equipment>

      <tonnage>
      30.0
      </tonnage>
    `,
  },
] as const;

it.each(cases)(
  '$name: raw BLK dispatch reaches pinned Java BV $java',
  (row) => {
    const parsed = new BlkParserService().parse(row.text);
    if (!parsed.success) throw new Error('Expected native BLK: ' + row.name);
    const handler = row.vtol ? new VTOLUnitHandler() : new VehicleUnitHandler();
    const loaded = handler.parse(parsed.data.document);
    if (!loaded.success) throw new Error('Expected native unit: ' + row.name);
    const unit = loaded.data.unit;
    const nativeIds = unit.equipment.map((mount) => mount.equipmentId);
    expect(unit.armorType).toBe(row.armorCode);
    const result = calculateBattleValueForUnit(unit);
    if (result?.kind !== 'vehicle') throw new Error('Expected family BV');
    expect(result.breakdown.final).toBe(row.java);
    expect(unit.equipment.map((mount) => mount.equipmentId)).toEqual(nativeIds);
    if (row.cause === 'targeting')
      expect(hasBVTargetingComputer(nativeIds)).toBe(true);
  },
);
