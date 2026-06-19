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

  describe('parse()', () => {
    it('should parse a valid minimal MTF file', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
Config:Biped
techbase:Inner Sphere
era:2755
rules level:2
mass:100
engine:300 Fusion Engine
structure:IS Standard
myomer:Standard
heat sinks:10 Single
walk mp:3
jump mp:0
armor:Standard(Inner Sphere)
LA armor:34
RA armor:34
LT armor:32
RT armor:32
CT armor:47
HD armor:9
LL armor:41
RL armor:41
RTL armor:10
RTR armor:10
RTC armor:14
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.unit).toBeDefined();
      expect(result.unit?.chassis).toBe('Atlas');
      expect(result.unit?.model).toBe('AS7-D');
      expect(result.unit?.tonnage).toBe(100);
    });

    it('should fail when chassis is missing', () => {
      const mtf = `
model:AS7-D
Config:Biped
techbase:Inner Sphere
era:2755
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Missing required field: chassis');
    });

    it('should succeed when model is missing (model is optional)', () => {
      const mtf = `
chassis:Atlas
Config:Biped
techbase:Inner Sphere
era:2755
mass:100
`;

      const result = service.parse(mtf);

      // Model is optional - many MTF files have empty model field
      expect(result.success).toBe(true);
      expect(result.unit?.chassis).toBe('Atlas');
      expect(result.unit?.model).toBe('');
    });

    it('should handle parse exceptions', () => {
      // @ts-expect-error - testing with null to validate error handling
      const mtf: string = null;

      const result = service.parse(mtf);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Parse error:');
    });

    it('should parse complete unit with all sections', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mul id:123
Config:Biped
techbase:Inner Sphere
era:2755
source:TRO 3025
rules level:2
role:Juggernaut
mass:100
engine:300 Fusion Engine
structure:IS Standard
myomer:Standard
heat sinks:20 Double
walk mp:3
jump mp:3
armor:Ferro-Fibrous(Inner Sphere)
LA armor:34
RA armor:34
LT armor:32
RT armor:32
CT armor:47
HD armor:9
LL armor:41
RL armor:41
RTL armor:10
RTR armor:10
RTC armor:14

Weapons:3
Medium Laser, Left Arm
AC/20, Right Torso
LRM 20, Left Torso

Left Arm:
Shoulder
Upper Arm Actuator
Lower Arm Actuator
Hand Actuator
Medium Laser
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-

Head:
Life Support
Sensors
Cockpit
-Empty-
Sensors
Life Support

quirk:battle_fists_la
quirk:improved_targeting_short

overview:The Atlas is one of the most feared BattleMechs.
capabilities:Heavy armor and devastating firepower.
history:Developed during the Star League era.
deployment:Used by all major houses.
manufacturer:Defiance Industries
primaryfactory:Hesperus II
systemmanufacturer:CHASSIS:Foundation Type 10X
systemmanufacturer:ENGINE:Vlar 300
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.chassis).toBe('Atlas');
      expect(result.unit?.model).toBe('AS7-D');
      expect(result.unit?.configuration).toBe('Biped');
      expect(result.unit?.techBase).toBe('INNER_SPHERE');
      expect(result.unit?.rulesLevel).toBe('STANDARD');
      expect(result.unit?.year).toBe(2755);
      expect(result.unit?.tonnage).toBe(100);
      expect(result.unit?.engine.rating).toBe(300);
      expect(result.unit?.engine.type).toBe('FUSION');
      expect(result.unit?.heatSinks.type).toBe('DOUBLE');
      expect(result.unit?.heatSinks.count).toBe(20);
      expect(result.unit?.movement.walk).toBe(3);
      expect(result.unit?.movement.jump).toBe(3);
      expect(result.unit?.armor.type).toBe('FERRO_FIBROUS');
      expect(result.unit?.equipment.length).toBe(3);
      expect(result.unit?.quirks).toEqual([
        'battle_fists_la',
        'improved_targeting_short',
      ]);
      expect(result.unit?.fluff?.overview).toBe(
        'The Atlas is one of the most feared BattleMechs.',
      );
      expect(result.unit?.fluff?.capabilities).toBe(
        'Heavy armor and devastating firepower.',
      );
      expect(result.unit?.fluff?.history).toBe(
        'Developed during the Star League era.',
      );
    });

    it('should handle Windows line endings', () => {
      const mtf =
        'chassis:Atlas\r\nmodel:AS7-D\r\nConfig:Biped\r\ntechbase:Inner Sphere\r\nera:2755\r\nrules level:2\r\nmass:100\r\n';

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.chassis).toBe('Atlas');
    });

    it('should handle Unix line endings', () => {
      const mtf =
        'chassis:Atlas\nmodel:AS7-D\nConfig:Biped\ntechbase:Inner Sphere\nera:2755\nrules level:2\nmass:100\n';

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.chassis).toBe('Atlas');
    });
  });
});
