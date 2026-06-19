/**
 * MTF Parser Service Tests
 *
 * Comprehensive tests for parsing MTF (MegaMek Text Format) files into ISerializedUnit format.
 *
 * @spec openspec/specs/mtf-parity-validation/spec.md
 */

import {
  MTFParserService,
  getMTFParserService,
} from '@/services/conversion/MTFParserService';

describe('MTFParserService', () => {
  let service: MTFParserService;

  beforeEach(() => {
    service = getMTFParserService();
  });

  // ============================================================================
  // Singleton Pattern
  // ============================================================================
  // ============================================================================
  // parse() - Main Entry Point
  // ============================================================================
  // ============================================================================
  // parseHeader()
  // ============================================================================
  // ============================================================================
  // parseEngine()
  // ============================================================================
  // ============================================================================
  // parseArmor()
  // ============================================================================
  // ============================================================================
  // parseCriticalSlots()
  // ============================================================================
  // ============================================================================
  // parseWeapons()
  // ============================================================================
  // ============================================================================
  // parseFluff()
  // ============================================================================
  // ============================================================================
  // parseQuirks()
  // ============================================================================
  // ============================================================================
  // mapEngineType()
  // ============================================================================
  // ============================================================================
  // mapTechBase()
  // ============================================================================
  // ============================================================================
  // mapRulesLevel()
  // ============================================================================
  // ============================================================================
  // mapEraFromYear()
  // ============================================================================
  // ============================================================================
  // Structure Type Mapping
  // ============================================================================
  // ============================================================================
  // Heat Sinks
  // ============================================================================
  // ============================================================================
  // Movement
  // ============================================================================
  // ============================================================================
  // Unit ID Generation
  // ============================================================================
  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================
  // ============================================================================
  // Integration Tests
  // ============================================================================
  // ============================================================================
  // OmniMech Parsing
  // ============================================================================

  describe('OmniMech Parsing', () => {
    it('should detect Biped OmniMech from Config field', () => {
      const mtf = `
chassis:Timber Wolf
model:Prime
Config:Biped Omnimech
techbase:Clan
era:2945
mass:75
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.isOmni).toBe(true);
      expect(result.unit?.configuration).toBe('Biped');
    });

    it('should detect Quad OmniMech from Config field', () => {
      const mtf = `
chassis:Supernova
model:Prime
Config:Quad Omnimech
techbase:Clan
era:3055
mass:90
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.isOmni).toBe(true);
      expect(result.unit?.configuration).toBe('Quad');
    });

    it('should not set isOmni for standard mechs', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
Config:Biped
techbase:Inner Sphere
era:2755
mass:100
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.isOmni).toBeUndefined();
    });

    it('should parse Base Chassis Heat Sinks field', () => {
      const mtf = `
chassis:Timber Wolf
model:Prime
Config:Biped Omnimech
techbase:Clan
era:2945
mass:75
engine:375 XL Engine(Clan)
heat sinks:20 Double
Base Chassis Heat Sinks:15
walk mp:5
jump mp:0
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.baseChassisHeatSinks).toBe(15);
    });

    it('should leave baseChassisHeatSinks undefined when not specified', () => {
      const mtf = `
chassis:Timber Wolf
model:Prime
Config:Biped Omnimech
techbase:Clan
era:2945
mass:75
heat sinks:20 Double
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.baseChassisHeatSinks).toBeUndefined();
    });

    it('should parse clanname field', () => {
      const mtf = `
chassis:Mad Cat
clanname:Timber Wolf
model:Prime
Config:Biped Omnimech
techbase:Clan
era:2945
mass:75
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.clanName).toBe('Timber Wolf');
    });

    it('should preserve empty model when clanname is present (for parity)', () => {
      const mtf = `
chassis:Baboon
clanname:Howler
model:
Config:Biped
techbase:Clan
era:3055
mass:20
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      // Model should remain empty for MTF parity (clanname is stored separately)
      expect(result.unit?.model).toBe('');
      expect(result.unit?.clanName).toBe('Howler');
    });

    it('should parse equipment with (omnipod) suffix', () => {
      const mtf = `
chassis:Timber Wolf
model:Prime
Config:Biped Omnimech
techbase:Clan
era:2945
mass:75

Weapons:3
ER Large Laser (omnipod), Left Arm
ER Large Laser (omnipod), Right Arm
Medium Pulse Laser, Center Torso
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.equipment).toHaveLength(3);
      expect(result.unit?.equipment[0].id).toBe('er-large-laser');
      expect(result.unit?.equipment[0].isOmniPodMounted).toBe(true);
      expect(result.unit?.equipment[1].id).toBe('er-large-laser');
      expect(result.unit?.equipment[1].isOmniPodMounted).toBe(true);
      expect(result.unit?.equipment[2].id).toBe('medium-pulse-laser');
      expect(result.unit?.equipment[2].isOmniPodMounted).toBeUndefined();
    });

    it('should handle mixed fixed and pod-mounted equipment', () => {
      const mtf = `
chassis:Timber Wolf
model:A
Config:Biped Omnimech
techbase:Clan
era:3050
mass:75

Weapons:4
LRM 20 (omnipod), Left Torso
LRM 20 (omnipod), Right Torso
ER Medium Laser, Center Torso
ER Small Laser (omnipod), Head
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.equipment).toHaveLength(4);

      // LRM 20s are pod-mounted
      expect(result.unit?.equipment[0].isOmniPodMounted).toBe(true);
      expect(result.unit?.equipment[1].isOmniPodMounted).toBe(true);

      // ER Medium Laser is fixed (no omnipod suffix)
      expect(result.unit?.equipment[2].isOmniPodMounted).toBeUndefined();

      // ER Small Laser is pod-mounted
      expect(result.unit?.equipment[3].isOmniPodMounted).toBe(true);
    });

    it('should parse complete OmniMech configuration', () => {
      const mtf = `
chassis:Mad Cat
clanname:Timber Wolf
model:Prime
mul id:4899
Config:Biped Omnimech
techbase:Clan
era:2945
source:TRO 3050
rules level:2
role:Skirmisher
mass:75
engine:375 XL Engine(Clan)
structure:Endo Steel (Clan)
myomer:Standard
heat sinks:18 Double
Base Chassis Heat Sinks:15
walk mp:5
jump mp:0
armor:Ferro-Fibrous(Clan)
LA armor:24
RA armor:24
LT armor:24
RT armor:24
CT armor:36
HD armor:9
LL armor:32
RL armor:32
RTL armor:8
RTR armor:8
RTC armor:11

Weapons:6
ER Large Laser (omnipod), Left Arm
ER Large Laser (omnipod), Right Arm
Medium Pulse Laser (omnipod), Left Torso
Medium Pulse Laser (omnipod), Right Torso
LRM 20 (omnipod), Left Torso
LRM 20 (omnipod), Right Torso
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.chassis).toBe('Mad Cat');
      expect(result.unit?.model).toBe('Prime');
      expect(result.unit?.clanName).toBe('Timber Wolf');
      expect(result.unit?.isOmni).toBe(true);
      expect(result.unit?.configuration).toBe('Biped');
      expect(result.unit?.baseChassisHeatSinks).toBe(15);
      expect(result.unit?.techBase).toBe('CLAN');
      expect(result.unit?.engine.type).toBe('XL_CLAN');
      expect(result.unit?.structure.type).toBe('ENDO_STEEL_CLAN');
      expect(result.unit?.armor.type).toBe('FERRO_FIBROUS_CLAN');

      // All weapons should be pod-mounted
      expect(result.unit?.equipment).toHaveLength(6);
      expect(result.unit?.equipment.every((eq) => eq.isOmniPodMounted)).toBe(
        true,
      );
    });
  });
});
