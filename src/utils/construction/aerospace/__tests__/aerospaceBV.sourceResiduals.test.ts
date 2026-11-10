import { BlkParserService } from '@/services/conversion/BlkParserService';
import { AerospaceUnitHandler } from '@/services/units/handlers/AerospaceUnitHandler';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { hasBVTargetingComputer } from '@/utils/construction/battleValueWeapons';

import { resolveAerospaceArmorTypeKey } from '../aerospaceBVUnitAdapter';

/** @spec openspec/changes/establish-all-unit-data-parity/specs/battle-value-system/spec.md */
const cases = [
  {
    name: 'Kublai E',
    java: 2181,
    cause: 'armor',
    armorCode: 3,
    // mm-data 50f7efe: fighters/Golden Century/Kublai E.blk
    // Original source SHA-256: 5a3ab4b4b2e9c26c18e827cb8bf9bce8ae8ec6aae5948e55d1cd051ef6d2570c; prose omitted, native facts retained.
    text: `
      <UUID>
      019f583e-ac9b-77b6-89cc-4a5763d53677
      </UUID>

      <UnitType>
      AeroSpaceFighter
      </UnitType>

      <Name>
      Kublai
      </Name>

      <Model>
      E
      </Model>

      <mul id:>
      7667
      </mul id:>

      <year>
      3143
      </year>

      <type>
      Mixed (Clan Chassis) Advanced
      </type>

      <role>
      Fast Dogfighter
      </role>

      <quirks>
      atmo_flyer
      easy_maintain
      weak_undercarriage
      </quirks>

      <motion_type>
      Aerodyne
      </motion_type>

      <SafeThrust>
      7
      </SafeThrust>

      <cockpit_type>
      0
      </cockpit_type>

      <heatsinks>
      20
      </heatsinks>

      <sink_type>
      1
      </sink_type>

      <fuel>
      400
      </fuel>

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
      2
      </armor_tech_level>

      <omni>
      1
      </omni>

      <armor>
      51
      46
      46
      41
      </armor>

      <Nose Equipment>
      ISUltraAC10:OMNI
      </Nose Equipment>

      <Left Wing Equipment>
      ISERMediumLaser:OMNI
      ISERMediumLaser:OMNI
      ISERMediumLaser:OMNI
      ISERMediumLaser:OMNI
      </Left Wing Equipment>

      <Right Wing Equipment>
      ISERMediumLaser:OMNI
      ISERMediumLaser:OMNI
      ISERMediumLaser:OMNI
      ISERMediumLaser:OMNI
      </Right Wing Equipment>

      <Aft Equipment>
      </Aft Equipment>

      <Wings Equipment>
      </Wings Equipment>

      <Fuselage Equipment>
      IS Ultra AC/10 Ammo:OMNI
      IS Ultra AC/10 Ammo:OMNI
      CLCASE
      </Fuselage Equipment>

      <tonnage>
      80.0
      </tonnage>
    `,
  },
  {
    name: 'Kublai F',
    java: 2270,
    cause: 'armor',
    armorCode: 3,
    // mm-data 50f7efe: fighters/Golden Century/Kublai F.blk
    // Original source SHA-256: 4251da1339a4961d44b671e978c4824a6515f55a65f196aba27d3cc14906da2d; prose omitted, native facts retained.
    text: `
      <UUID>
      019f583e-ac9d-7830-95de-5575893f8f12
      </UUID>

      <UnitType>
      AeroSpaceFighter
      </UnitType>

      <Name>
      Kublai
      </Name>

      <Model>
      F
      </Model>

      <mul id:>
      7668
      </mul id:>

      <year>
      3143
      </year>

      <type>
      Mixed (Clan Chassis) Advanced
      </type>

      <role>
      Fast Dogfighter
      </role>

      <quirks>
      atmo_flyer
      easy_maintain
      weak_undercarriage
      </quirks>

      <motion_type>
      Aerodyne
      </motion_type>

      <SafeThrust>
      7
      </SafeThrust>

      <cockpit_type>
      0
      </cockpit_type>

      <heatsinks>
      20
      </heatsinks>

      <sink_type>
      1
      </sink_type>

      <fuel>
      400
      </fuel>

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
      2
      </armor_tech_level>

      <omni>
      1
      </omni>

      <armor>
      51
      46
      46
      41
      </armor>

      <Nose Equipment>
      Heavy PPC:OMNI
      PPC Capacitor:OMNI
      Heavy PPC:OMNI
      PPC Capacitor:OMNI
      CLCASE
      </Nose Equipment>

      <Left Wing Equipment>
      </Left Wing Equipment>

      <Right Wing Equipment>
      </Right Wing Equipment>

      <Aft Equipment>
      ISAngelECMSuite:OMNI
      </Aft Equipment>

      <Wings Equipment>
      </Wings Equipment>

      <Fuselage Equipment>
      </Fuselage Equipment>

      <tonnage>
      80.0
      </tonnage>
    `,
  },
  {
    name: 'Kublai G',
    java: 2376,
    cause: 'armor',
    armorCode: 3,
    // mm-data 50f7efe: fighters/Golden Century/Kublai G.blk
    // Original source SHA-256: 54982f091f05e933946ad2c168ca4d0ba9d35614b93f2f3d63e4885287b36553; prose omitted, native facts retained.
    text: `
      <UUID>
      019f583e-ac9f-7fb9-ad01-d4a985848fe3
      </UUID>

      <UnitType>
      AeroSpaceFighter
      </UnitType>

      <Name>
      Kublai
      </Name>

      <Model>
      G
      </Model>

      <mul id:>
      7669
      </mul id:>

      <year>
      3143
      </year>

      <type>
      Mixed (Clan Chassis) Advanced
      </type>

      <role>
      Fast Dogfighter
      </role>

      <quirks>
      atmo_flyer
      easy_maintain
      weak_undercarriage
      </quirks>

      <motion_type>
      Aerodyne
      </motion_type>

      <SafeThrust>
      7
      </SafeThrust>

      <cockpit_type>
      0
      </cockpit_type>

      <heatsinks>
      22
      </heatsinks>

      <sink_type>
      1
      </sink_type>

      <fuel>
      400
      </fuel>

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
      2
      </armor_tech_level>

      <omni>
      1
      </omni>

      <armor>
      51
      46
      46
      41
      </armor>

      <Nose Equipment>
      CLImprovedHeavyLargeLaser:OMNI
      CLImprovedHeavyLargeLaser:OMNI
      MRM 30:OMNI
      ISApollo:OMNI
      CLCASE
      </Nose Equipment>

      <Left Wing Equipment>
      </Left Wing Equipment>

      <Right Wing Equipment>
      </Right Wing Equipment>

      <Aft Equipment>
      CLECMSuite:OMNI
      </Aft Equipment>

      <Wings Equipment>
      </Wings Equipment>

      <Fuselage Equipment>
      IS MRM 30 Ammo:OMNI
      IS MRM 30 Ammo:OMNI
      CLCASE
      </Fuselage Equipment>

      <tonnage>
      80.0
      </tonnage>
    `,
  },
  {
    name: 'Corax CRX-OR',
    java: 1649,
    cause: 'targeting',
    armorCode: 0,
    // mm-data 50f7efe: fighters/TRO3067 Unabridged/IS Aerospace/Corax CRX-OR.blk
    // Original source SHA-256: 4a7ec860d8306c439d708c9c25cfd3cb84cc963b746ee50096c19642ddac3bab; prose omitted, native facts retained.
    text: `
      <UUID>
      019f583e-aed9-7769-a94e-711108c45981
      </UUID>

      <UnitType>
      AeroSpaceFighter
      </UnitType>

      <Name>
      Corax
      </Name>

      <Model>
      CRX-OR
      </Model>

      <mul id:>
      5746
      </mul id:>

      <year>
      3076
      </year>

      <type>
      Mixed (IS Chassis) Experimental
      </type>

      <role>
      Fast Dogfighter
      </role>

      <motion_type>
      Aerodyne
      </motion_type>

      <SafeThrust>
      9
      </SafeThrust>

      <cockpit_type>
      0
      </cockpit_type>

      <heatsinks>
      10
      </heatsinks>

      <sink_type>
      1
      </sink_type>

      <fuel>
      400
      </fuel>

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
      44
      33
      33
      26
      </armor>

      <Nose Equipment>
      CLERMediumLaser:OMNI
      CLERMediumLaser:OMNI
      CLERMediumLaser:OMNI
      </Nose Equipment>

      <Left Wing Equipment>
      CLStreakSRM4:OMNI
      </Left Wing Equipment>

      <Right Wing Equipment>
      CLStreakSRM4:OMNI
      </Right Wing Equipment>

      <Aft Equipment>
      CLTargeting Computer:OMNI
      </Aft Equipment>

      <Wings Equipment>
      </Wings Equipment>

      <Fuselage Equipment>
      Clan Streak SRM 4 Ammo:OMNI
      </Fuselage Equipment>

      <tonnage>
      30.0
      </tonnage>
    `,
  },
  {
    name: 'Lucifer III C',
    java: 2708,
    cause: 'armor',
    armorCode: 16,
    // mm-data 50f7efe: fighters/TRO3145/NTNU/Lucifer III C.blk
    // Original source SHA-256: b4963bb876f1f943dcc421d883db20fce7edda96e5f58fed412cb724ec162935; prose omitted, native facts retained.
    text: `
      <UUID>
      019f583e-afa2-75e9-9bcd-b2ec7e1a0ea5
      </UUID>

      <UnitType>
      AeroSpaceFighter
      </UnitType>

      <Name>
      Lucifer III
      </Name>

      <Model>
      C
      </Model>

      <mul id:>
      8012
      </mul id:>

      <year>
      3139
      </year>

      <type>
      Mixed (IS Chassis) Advanced
      </type>

      <role>
      Fire Support
      </role>

      <motion_type>
      Aerodyne
      </motion_type>

      <SafeThrust>
      5
      </SafeThrust>

      <cockpit_type>
      0
      </cockpit_type>

      <heatsinks>
      13
      </heatsinks>

      <sink_type>
      1
      </sink_type>

      <fuel>
      400
      </fuel>

      <engine_type>
      2
      </engine_type>

      <armor_type>
      16
      </armor_type>

      <armor_tech_rating>
      0
      </armor_tech_rating>

      <armor_tech_level>
      6
      </armor_tech_level>

      <armor>
      121
      86
      86
      85
      </armor>

      <Nose Equipment>
      CLERPPC
      PPC Capacitor
      </Nose Equipment>

      <Left Wing Equipment>
      CLATM9
      </Left Wing Equipment>

      <Right Wing Equipment>
      CLATM9
      </Right Wing Equipment>

      <Aft Equipment>
      Clan Ferro-Lamellor
      CLMediumPulseLaser
      </Aft Equipment>

      <Wings Equipment>
      </Wings Equipment>

      <Fuselage Equipment>
      Clan Ammo ATM-9
      Clan Ammo ATM-9
      Clan Ammo ATM-9 ER
      Clan Ammo ATM-9 HE
      </Fuselage Equipment>

      <tonnage>
      65.0
      </tonnage>
    `,
  },
  {
    name: 'Seydlitz C',
    java: 1690,
    cause: 'armor',
    armorCode: 3,
    // mm-data 50f7efe: fighters/TRO3145/NTNU/Seydlitz C.blk
    // Original source SHA-256: 5e599d246972c8287848a7dbbd193351369e9cf4f09c71184a9758e7c131f5e2; prose omitted, native facts retained.
    text: `
      <UUID>
      019f583e-afab-7fd6-8e45-8097ff48ec86
      </UUID>

      <UnitType>
      AeroSpaceFighter
      </UnitType>

      <Name>
      Seydlitz
      </Name>

      <Model>
      C
      </Model>

      <mul id:>
      8014
      </mul id:>

      <year>
      3140
      </year>

      <type>
      Mixed (IS Chassis) Advanced
      </type>

      <role>
      Interceptor
      </role>

      <motion_type>
      Aerodyne
      </motion_type>

      <SafeThrust>
      11
      </SafeThrust>

      <cockpit_type>
      0
      </cockpit_type>

      <heatsinks>
      10
      </heatsinks>

      <sink_type>
      1
      </sink_type>

      <fuel>
      240
      </fuel>

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
      6
      </armor_tech_level>

      <armor>
      18
      11
      11
      16
      </armor>

      <Nose Equipment>
      CLERPPC
      PPC Capacitor
      </Nose Equipment>

      <Left Wing Equipment>
      </Left Wing Equipment>

      <Right Wing Equipment>
      </Right Wing Equipment>

      <Aft Equipment>
      Clan Reflective
      </Aft Equipment>

      <Wings Equipment>
      </Wings Equipment>

      <Fuselage Equipment>
      </Fuselage Equipment>

      <tonnage>
      20.0
      </tonnage>
    `,
  },
  {
    name: 'Slayer SL-CX1',
    java: 2404,
    cause: 'armor',
    armorCode: 16,
    // mm-data 50f7efe: fighters/XTRs/Mercenaries/Slayer SL-CX1.blk
    // Original source SHA-256: faaea10ac377b99206f8378e34003803c107e7d235f3dcf20ffab05f6963182b; prose omitted, native facts retained.
    text: `
      <UUID>
      019f583e-b018-7195-8b88-3d30ef581df0
      </UUID>

      <UnitType>
      AeroSpaceFighter
      </UnitType>

      <Name>
      Slayer
      </Name>

      <Model>
      SL-CX1
      </Model>

      <mul id:>
      2966
      </mul id:>

      <year>
      3075
      </year>

      <type>
      Mixed (IS Chassis) Experimental
      </type>

      <role>
      Dogfighter
      </role>

      <motion_type>
      Aerodyne
      </motion_type>

      <SafeThrust>
      7
      </SafeThrust>

      <cockpit_type>
      0
      </cockpit_type>

      <heatsinks>
      16
      </heatsinks>

      <sink_type>
      1
      </sink_type>

      <fuel>
      640
      </fuel>

      <engine_type>
      2
      </engine_type>

      <armor_type>
      16
      </armor_type>

      <armor_tech_rating>
      0
      </armor_tech_rating>

      <armor_tech_level>
      6
      </armor_tech_level>

      <armor>
      80
      71
      71
      51
      </armor>

      <Nose Equipment>
      CLRotaryAC5
      </Nose Equipment>

      <Left Wing Equipment>
      CLImprovedMediumHeavyLaser
      CLImprovedMediumHeavyLaser
      </Left Wing Equipment>

      <Right Wing Equipment>
      CLImprovedMediumHeavyLaser
      CLImprovedMediumHeavyLaser
      </Right Wing Equipment>

      <Aft Equipment>
      CLLaserAntiMissileSystem
      </Aft Equipment>

      <Wings Equipment>
      </Wings Equipment>

      <Fuselage Equipment>
      ISRotaryAC5 Ammo
      ISRotaryAC5 Ammo
      </Fuselage Equipment>

      <tonnage>
      80.0
      </tonnage>
    `,
  },
  {
    name: 'Lightning LTN-G16-P Branson',
    java: 1126,
    cause: 'armor',
    armorCode: 16,
    // mm-data 50f7efe: fighters/XTRs/Pirates/Lightning LTN-G16-P Branson.blk
    // Original source SHA-256: 81f0ea100a18fbb8b98966c671125c88c9da1df6dd9a28851d5e573edc3a2b0d; prose omitted, native facts retained.
    text: `
      <UUID>
      019f583e-b03c-728b-809f-dc6a6d72b1ee
      </UUID>

      <UnitType>
      AeroSpaceFighter
      </UnitType>

      <Name>
      Lightning
      </Name>

      <Model>
      LTN-G16-P (Branson)
      </Model>

      <mul id:>
      1879
      </mul id:>

      <year>
      3071
      </year>

      <type>
      Mixed (IS Chassis) Experimental
      </type>

      <role>
      Dogfighter
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
      13
      </heatsinks>

      <sink_type>
      1
      </sink_type>

      <fuel>
      400
      </fuel>

      <engine_type>
      0
      </engine_type>

      <armor_type>
      16
      </armor_type>

      <armor_tech_rating>
      0
      </armor_tech_rating>

      <armor_tech_level>
      6
      </armor_tech_level>

      <armor>
      44
      35
      35
      33
      </armor>

      <Nose Equipment>
      Hyper Velocity Auto Cannon/10
      ISERMediumLaser
      </Nose Equipment>

      <Left Wing Equipment>
      ISERMediumLaser
      </Left Wing Equipment>

      <Right Wing Equipment>
      ISERMediumLaser
      </Right Wing Equipment>

      <Aft Equipment>
      ISERSmallLaser
      ISERSmallLaser
      </Aft Equipment>

      <Wings Equipment>
      </Wings Equipment>

      <Fuselage Equipment>
      IS Ammo HVAC/10
      IS Ammo HVAC/10
      </Fuselage Equipment>

      <tonnage>
      50.0
      </tonnage>
    `,
  },
] as const;

it.each(cases)(
  '$name: raw BLK dispatch reaches pinned Java BV $java',
  (row) => {
    const parsed = new BlkParserService().parse(row.text);
    if (!parsed.success) throw new Error('Expected native BLK: ' + row.name);
    const handler = new AerospaceUnitHandler();
    const loaded = handler.parse(parsed.data.document);
    if (!loaded.success) throw new Error('Expected native unit: ' + row.name);
    const unit = loaded.data.unit;
    const nativeIds = unit.equipment.map((mount) => mount.equipmentId);
    expect(unit.armorType).toBe(row.armorCode);
    const result = calculateBattleValueForUnit(unit);
    if (result?.kind !== 'aerospace') throw new Error('Expected family BV');
    expect(result.breakdown.final).toBe(row.java);
    expect(unit.equipment.map((mount) => mount.equipmentId)).toEqual(nativeIds);
    if (row.cause === 'targeting')
      expect(hasBVTargetingComputer(nativeIds)).toBe(true);
  },
);

it('preserves string armor spelling and unknown/absent numeric fallback', () => {
  expect(resolveAerospaceArmorTypeKey('ANTI_PENETRATIVE_ABLATION')).toBe(
    'ANTI_PENETRATIVE_ABLATION',
  );
  expect(resolveAerospaceArmorTypeKey('reflective')).toBe('reflective');
  expect(resolveAerospaceArmorTypeKey(999)).toBe('standard');
  expect(resolveAerospaceArmorTypeKey(undefined)).toBe('standard');
  expect(resolveAerospaceArmorTypeKey('')).toBe('standard');
});
