/**
 * MTF Parser Service Tests
 *
 * Comprehensive tests for parsing MTF (MegaMek Text Format) files into ISerializedUnit format.
 *
 * @spec openspec/specs/mtf-parity-validation/spec.md
 */

import { MTFParserService, getMTFParserService, IMTFParseResult } from '@/services/conversion/MTFParserService';

describe('MTFParserService', () => {
  let service: MTFParserService;

  beforeEach(() => {
    service = getMTFParserService();
  });

  // ============================================================================
  // Singleton Pattern
  // ============================================================================
  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getMTFParserService();
      const instance2 = getMTFParserService();
      expect(instance1).toBe(instance2);
    });

    it('should return same instance from static method', () => {
      const instance1 = MTFParserService.getInstance();
      const instance2 = MTFParserService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  // ============================================================================
  // parse() - Main Entry Point
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
      expect(result.unit?.quirks).toEqual(['battle_fists_la', 'improved_targeting_short']);
      expect(result.unit?.fluff?.overview).toBe('The Atlas is one of the most feared BattleMechs.');
      expect(result.unit?.fluff?.capabilities).toBe('Heavy armor and devastating firepower.');
      expect(result.unit?.fluff?.history).toBe('Developed during the Star League era.');
    });

    it('should handle Windows line endings', () => {
      const mtf = 'chassis:Atlas\r\nmodel:AS7-D\r\nConfig:Biped\r\ntechbase:Inner Sphere\r\nera:2755\r\nrules level:2\r\nmass:100\r\n';

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.chassis).toBe('Atlas');
    });

    it('should handle Unix line endings', () => {
      const mtf = 'chassis:Atlas\nmodel:AS7-D\nConfig:Biped\ntechbase:Inner Sphere\nera:2755\nrules level:2\nmass:100\n';

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.chassis).toBe('Atlas');
    });
  });

  // ============================================================================
  // parseHeader()
  // ============================================================================
  describe('parseHeader()', () => {
    it('should parse all header fields', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mul id:123
Config:Biped
techbase:Inner Sphere
era:2755
rules level:2
role:Juggernaut
source:TRO 3025
`;

      const result = service.parse(mtf);

      expect(result.unit?.chassis).toBe('Atlas');
      expect(result.unit?.model).toBe('AS7-D');
      expect(result.unit?.configuration).toBe('Biped');
      expect(result.unit?.techBase).toBe('INNER_SPHERE');
      expect(result.unit?.year).toBe(2755);
      expect(result.unit?.rulesLevel).toBe('STANDARD');
    });

    it('should use defaults for missing optional header fields', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
`;

      const result = service.parse(mtf);

      expect(result.unit?.configuration).toBe('Biped');
      expect(result.unit?.techBase).toBe('INNER_SPHERE');
      expect(result.unit?.year).toBe(3025);
      expect(result.unit?.rulesLevel).toBe('STANDARD');
    });

    it('should handle case-insensitive field names', () => {
      const mtf = `
CHASSIS:Atlas
MODEL:AS7-D
CONFIG:Biped
TECHBASE:Inner Sphere
ERA:2755
RULES LEVEL:2
MASS:100
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.chassis).toBe('Atlas');
      expect(result.unit?.model).toBe('AS7-D');
    });

    it('should trim whitespace from field values', () => {
      const mtf = `
chassis:   Atlas
model:  AS7-D
Config:  Biped
mass:100
`;

      const result = service.parse(mtf);

      expect(result.unit?.chassis).toBe('Atlas');
      expect(result.unit?.model).toBe('AS7-D');
      expect(result.unit?.configuration).toBe('Biped');
    });
  });

  // ============================================================================
  // parseEngine()
  // ============================================================================
  describe('parseEngine()', () => {
    it('should parse standard fusion engine', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
engine:300 Fusion Engine
`;

      const result = service.parse(mtf);

      expect(result.unit?.engine.rating).toBe(300);
      expect(result.unit?.engine.type).toBe('FUSION');
    });

    it('should parse XL engine', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
engine:300 XL Engine
`;

      const result = service.parse(mtf);

      expect(result.unit?.engine.rating).toBe(300);
      expect(result.unit?.engine.type).toBe('XL');
    });

    it('should parse Clan XL engine', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
engine:300 XL Engine(Clan)
`;

      const result = service.parse(mtf);

      expect(result.unit?.engine.rating).toBe(300);
      expect(result.unit?.engine.type).toBe('XL_CLAN');
    });

    it('should parse XXL engine', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
engine:300 XXL Engine
`;

      const result = service.parse(mtf);

      expect(result.unit?.engine.rating).toBe(300);
      expect(result.unit?.engine.type).toBe('XXL');
    });

    it('should parse Light engine', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
engine:300 Light Engine
`;

      const result = service.parse(mtf);

      expect(result.unit?.engine.rating).toBe(300);
      expect(result.unit?.engine.type).toBe('LIGHT');
    });

    it('should parse Compact engine', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
engine:300 Compact Engine
`;

      const result = service.parse(mtf);

      expect(result.unit?.engine.rating).toBe(300);
      expect(result.unit?.engine.type).toBe('COMPACT');
    });

    it('should parse ICE engine', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
engine:300 I.C.E. Engine
`;

      const result = service.parse(mtf);

      expect(result.unit?.engine.rating).toBe(300);
      expect(result.unit?.engine.type).toBe('ICE');
    });

    it('should parse ICE engine without periods', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
engine:300 ICE Engine
`;

      const result = service.parse(mtf);

      expect(result.unit?.engine.rating).toBe(300);
      expect(result.unit?.engine.type).toBe('ICE');
    });

    it('should parse Fuel Cell engine', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
engine:300 Fuel Cell Engine
`;

      const result = service.parse(mtf);

      expect(result.unit?.engine.rating).toBe(300);
      expect(result.unit?.engine.type).toBe('FUEL_CELL');
    });

    it('should parse Fuel-Cell engine with hyphen', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
engine:300 Fuel-Cell Engine
`;

      const result = service.parse(mtf);

      expect(result.unit?.engine.rating).toBe(300);
      expect(result.unit?.engine.type).toBe('FUEL_CELL');
    });

    it('should parse Fission engine', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
engine:300 Fission Engine
`;

      const result = service.parse(mtf);

      expect(result.unit?.engine.rating).toBe(300);
      expect(result.unit?.engine.type).toBe('FISSION');
    });

    it('should default to Fusion for missing engine', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
`;

      const result = service.parse(mtf);

      expect(result.unit?.engine.type).toBe('FUSION');
      expect(result.unit?.engine.rating).toBe(0);
    });

    it('should handle malformed engine line', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
engine:InvalidEngineFormat
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.engine.rating).toBe(0);
    });
  });

  // ============================================================================
  // parseArmor()
  // ============================================================================
  describe('parseArmor()', () => {
    it('should parse standard armor type', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
armor:Standard(Inner Sphere)
LA armor:34
RA armor:34
`;

      const result = service.parse(mtf);

      expect(result.unit?.armor.type).toBe('STANDARD');
      expect(result.unit?.armor.allocation.LEFT_ARM).toBe(34);
      expect(result.unit?.armor.allocation.RIGHT_ARM).toBe(34);
    });

    it('should parse Ferro-Fibrous armor', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
armor:Ferro-Fibrous(Inner Sphere)
`;

      const result = service.parse(mtf);

      expect(result.unit?.armor.type).toBe('FERRO_FIBROUS');
    });

    it('should parse Clan Ferro-Fibrous armor', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
armor:Ferro-Fibrous(Clan)
`;

      const result = service.parse(mtf);

      expect(result.unit?.armor.type).toBe('FERRO_FIBROUS_CLAN');
    });

    it('should parse Stealth armor', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
armor:Stealth(Inner Sphere)
`;

      const result = service.parse(mtf);

      expect(result.unit?.armor.type).toBe('STEALTH');
    });

    it('should parse Reactive armor', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
armor:Reactive(Inner Sphere)
`;

      const result = service.parse(mtf);

      expect(result.unit?.armor.type).toBe('REACTIVE');
    });

    it('should parse Reflective armor', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
armor:Reflective(Inner Sphere)
`;

      const result = service.parse(mtf);

      expect(result.unit?.armor.type).toBe('REFLECTIVE');
    });

    it('should parse Hardened armor', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
armor:Hardened(Inner Sphere)
`;

      const result = service.parse(mtf);

      expect(result.unit?.armor.type).toBe('HARDENED');
    });

    it('should parse Heavy Ferro-Fibrous armor', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
armor:Heavy Ferro-Fibrous(Inner Sphere)
`;

      const result = service.parse(mtf);

      expect(result.unit?.armor.type).toBe('HEAVY_FERRO');
    });

    it('should parse Light Ferro-Fibrous armor', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
armor:Light Ferro-Fibrous(Inner Sphere)
`;

      const result = service.parse(mtf);

      expect(result.unit?.armor.type).toBe('LIGHT_FERRO');
    });

    it('should parse all armor locations', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
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

      expect(result.unit?.armor.allocation.LEFT_ARM).toBe(34);
      expect(result.unit?.armor.allocation.RIGHT_ARM).toBe(34);
      expect(result.unit?.armor.allocation.HEAD).toBe(9);
      expect(result.unit?.armor.allocation.LEFT_LEG).toBe(41);
      expect(result.unit?.armor.allocation.RIGHT_LEG).toBe(41);
    });

    it('should parse torso armor with front and rear', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
armor:Standard(Inner Sphere)
LT armor:32
RT armor:32
CT armor:47
RTL armor:10
RTR armor:10
RTC armor:14
`;

      const result = service.parse(mtf);

      expect(result.unit?.armor.allocation.LEFT_TORSO).toEqual({ front: 32, rear: 10 });
      expect(result.unit?.armor.allocation.RIGHT_TORSO).toEqual({ front: 32, rear: 10 });
      expect(result.unit?.armor.allocation.CENTER_TORSO).toEqual({ front: 47, rear: 14 });
    });

    it('should default to Standard armor when missing', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
`;

      const result = service.parse(mtf);

      expect(result.unit?.armor.type).toBe('STANDARD');
    });

    it('should handle missing armor values', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
armor:Standard(Inner Sphere)
LA armor:34
`;

      const result = service.parse(mtf);

      expect(result.unit?.armor.allocation.LEFT_ARM).toBe(34);
      expect(result.unit?.armor.allocation.RIGHT_ARM).toBeUndefined();
    });
  });

  // ============================================================================
  // parseCriticalSlots()
  // ============================================================================
  describe('parseCriticalSlots()', () => {
    it('should parse critical slots for all locations', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100

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

Right Arm:
Shoulder
Upper Arm Actuator
Lower Arm Actuator
Hand Actuator
-Empty-
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
`;

      const result = service.parse(mtf);

      expect(result.unit?.criticalSlots.LEFT_ARM).toHaveLength(12);
      expect(result.unit?.criticalSlots.LEFT_ARM[0]).toBe('Shoulder');
      expect(result.unit?.criticalSlots.LEFT_ARM[4]).toBe('Medium Laser');
      expect(result.unit?.criticalSlots.LEFT_ARM[5]).toBeNull();
      expect(result.unit?.criticalSlots.RIGHT_ARM).toHaveLength(12);
      expect(result.unit?.criticalSlots.HEAD).toHaveLength(6);
      expect(result.unit?.criticalSlots.HEAD[2]).toBe('Cockpit');
    });

    it('should pad slots to expected count', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100

Head:
Life Support
Sensors
Cockpit
`;

      const result = service.parse(mtf);

      expect(result.unit?.criticalSlots.HEAD).toHaveLength(6);
      expect(result.unit?.criticalSlots.HEAD[0]).toBe('Life Support');
      expect(result.unit?.criticalSlots.HEAD[1]).toBe('Sensors');
      expect(result.unit?.criticalSlots.HEAD[2]).toBe('Cockpit');
      expect(result.unit?.criticalSlots.HEAD[3]).toBeNull();
      expect(result.unit?.criticalSlots.HEAD[4]).toBeNull();
      expect(result.unit?.criticalSlots.HEAD[5]).toBeNull();
    });

    it('should trim slots if exceeding expected count', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100

Head:
Life Support
Sensors
Cockpit
Extra1
Sensors
Life Support
Extra2
Extra3
Extra4
Extra5
Extra6
Extra7
`;

      const result = service.parse(mtf);

      expect(result.unit?.criticalSlots.HEAD).toHaveLength(6);
      expect(result.unit?.criticalSlots.HEAD[5]).toBe('Life Support');
    });

    it('should handle empty slots', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100

Head:
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
`;

      const result = service.parse(mtf);

      expect(result.unit?.criticalSlots.HEAD).toHaveLength(6);
      expect(result.unit?.criticalSlots.HEAD.every(slot => slot === null)).toBe(true);
    });

    it('should stop parsing location at section break', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100

Head:
Life Support
Sensors
Cockpit
overview:This is the overview section
`;

      const result = service.parse(mtf);

      expect(result.unit?.criticalSlots.HEAD).toHaveLength(6);
      expect(result.unit?.criticalSlots.HEAD[0]).toBe('Life Support');
      expect(result.unit?.criticalSlots.HEAD[1]).toBe('Sensors');
      expect(result.unit?.criticalSlots.HEAD[2]).toBe('Cockpit');
      expect(result.unit?.criticalSlots.HEAD[3]).toBeNull();
    });

    it('should skip comment lines', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100

Head:
Life Support
# This is a comment
Sensors
Cockpit
`;

      const result = service.parse(mtf);

      expect(result.unit?.criticalSlots.HEAD[0]).toBe('Life Support');
      expect(result.unit?.criticalSlots.HEAD[1]).toBe('Sensors');
      expect(result.unit?.criticalSlots.HEAD[2]).toBe('Cockpit');
    });

    it('should parse all location headers correctly', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100

Left Arm:
Shoulder

Right Arm:
Shoulder

Left Torso:
-Empty-

Right Torso:
-Empty-

Center Torso:
-Empty-

Head:
Cockpit

Left Leg:
Hip

Right Leg:
Hip
`;

      const result = service.parse(mtf);

      expect(result.unit?.criticalSlots.LEFT_ARM).toBeDefined();
      expect(result.unit?.criticalSlots.RIGHT_ARM).toBeDefined();
      expect(result.unit?.criticalSlots.LEFT_TORSO).toBeDefined();
      expect(result.unit?.criticalSlots.RIGHT_TORSO).toBeDefined();
      expect(result.unit?.criticalSlots.CENTER_TORSO).toBeDefined();
      expect(result.unit?.criticalSlots.HEAD).toBeDefined();
      expect(result.unit?.criticalSlots.LEFT_LEG).toBeDefined();
      expect(result.unit?.criticalSlots.RIGHT_LEG).toBeDefined();
    });

    // ========================================================================
    // Exotic Mech Configurations - Quad
    // ========================================================================
    it('should parse Quad mech configuration with quad leg locations', () => {
      const mtf = `
chassis:Goliath
model:GOL-1H
Config:Quad
techbase:Inner Sphere
era:2652
mass:80

Front Left Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator
-Empty-
-Empty-

Front Right Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator
-Empty-
-Empty-

Rear Left Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator
-Empty-
-Empty-

Rear Right Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator
-Empty-
-Empty-
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.chassis).toBe('Goliath');
      expect(result.unit?.configuration).toBe('Quad');
      expect(result.unit?.criticalSlots.FRONT_LEFT_LEG).toBeDefined();
      expect(result.unit?.criticalSlots.FRONT_RIGHT_LEG).toBeDefined();
      expect(result.unit?.criticalSlots.REAR_LEFT_LEG).toBeDefined();
      expect(result.unit?.criticalSlots.REAR_RIGHT_LEG).toBeDefined();
      expect(result.unit?.criticalSlots.FRONT_LEFT_LEG?.[0]).toBe('Hip');
      expect(result.unit?.criticalSlots.FRONT_LEFT_LEG?.[1]).toBe('Upper Leg Actuator');
    });

    it('should parse Quad mech armor with quad leg armor labels', () => {
      const mtf = `
chassis:Goliath
model:GOL-1H
Config:Quad
techbase:Inner Sphere
era:2652
mass:80
armor:Standard(Inner Sphere)
HD armor:9
CT armor:38
LT armor:26
RT armor:26
FLL armor:28
FRL armor:28
RLL armor:26
RRL armor:26
RTC armor:12
RTL armor:8
RTR armor:8
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.armor.allocation.FRONT_LEFT_LEG).toBe(28);
      expect(result.unit?.armor.allocation.FRONT_RIGHT_LEG).toBe(28);
      expect(result.unit?.armor.allocation.REAR_LEFT_LEG).toBe(26);
      expect(result.unit?.armor.allocation.REAR_RIGHT_LEG).toBe(26);
    });

    // ========================================================================
    // Exotic Mech Configurations - LAM
    // ========================================================================
    it('should parse LAM mech configuration', () => {
      const mtf = `
chassis:Phoenix Hawk LAM
model:PHX-HK1
Config:LAM
techbase:Inner Sphere
era:2680
mass:50
engine:250 Fusion Engine
heat sinks:10 Single

Head:
Life Support
Sensors
Cockpit
Avionics
Sensors
Life Support

Center Torso:
Fusion Engine
Fusion Engine
Fusion Engine
Gyro
Gyro
Gyro
Gyro
Fusion Engine
Fusion Engine
Fusion Engine
Landing Gear
-Empty-

Left Torso:
Landing Gear
Avionics
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-

Right Torso:
Landing Gear
Avionics
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.chassis).toBe('Phoenix Hawk LAM');
      expect(result.unit?.configuration).toBe('LAM');
      expect(result.unit?.tonnage).toBe(50);
      // LAM has biped locations
      expect(result.unit?.criticalSlots.HEAD).toBeDefined();
      expect(result.unit?.criticalSlots.CENTER_TORSO).toBeDefined();
      // Check for LAM-specific equipment
      expect(result.unit?.criticalSlots.HEAD?.[3]).toBe('Avionics');
      expect(result.unit?.criticalSlots.CENTER_TORSO?.[10]).toBe('Landing Gear');
      expect(result.unit?.criticalSlots.LEFT_TORSO?.[0]).toBe('Landing Gear');
      expect(result.unit?.criticalSlots.LEFT_TORSO?.[1]).toBe('Avionics');
    });

    // ========================================================================
    // Exotic Mech Configurations - Tripod
    // ========================================================================
    it('should parse Tripod mech configuration with center leg', () => {
      const mtf = `
chassis:Ares
model:ARS-V1
Config:Tripod
techbase:Inner Sphere
era:3135
mass:135

Left Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator
-Empty-
-Empty-

Right Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator
-Empty-
-Empty-

Center Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator
-Empty-
-Empty-
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.chassis).toBe('Ares');
      expect(result.unit?.configuration).toBe('Tripod');
      expect(result.unit?.criticalSlots.LEFT_LEG).toBeDefined();
      expect(result.unit?.criticalSlots.RIGHT_LEG).toBeDefined();
      expect(result.unit?.criticalSlots.CENTER_LEG).toBeDefined();
      expect(result.unit?.criticalSlots.CENTER_LEG?.[0]).toBe('Hip');
      expect(result.unit?.criticalSlots.CENTER_LEG?.[1]).toBe('Upper Leg Actuator');
    });

    it('should parse Tripod armor with center leg armor', () => {
      const mtf = `
chassis:Ares
model:ARS-V1
Config:Tripod
techbase:Inner Sphere
era:3135
mass:135
armor:Standard(Inner Sphere)
HD armor:9
CT armor:60
LT armor:44
RT armor:44
LA armor:32
RA armor:32
LL armor:40
RL armor:40
CL armor:40
RTC armor:20
RTL armor:14
RTR armor:14
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.armor.allocation.CENTER_LEG).toBe(40);
      expect(result.unit?.armor.allocation.LEFT_LEG).toBe(40);
      expect(result.unit?.armor.allocation.RIGHT_LEG).toBe(40);
    });

    // ========================================================================
    // Exotic Mech Configurations - QuadVee
    // ========================================================================
    it('should parse QuadVee mech configuration', () => {
      const mtf = `
chassis:Arion
model:Standard
Config:QuadVee
techbase:Clan
era:3136
mass:35

Front Left Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator
Conversion Equipment
Tracks
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-

Front Right Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator
Conversion Equipment
Tracks
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-

Rear Left Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator
Conversion Equipment
Tracks
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-

Rear Right Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator
Conversion Equipment
Tracks
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.chassis).toBe('Arion');
      expect(result.unit?.configuration).toBe('QuadVee');
      expect(result.unit?.criticalSlots.FRONT_LEFT_LEG).toBeDefined();
      expect(result.unit?.criticalSlots.FRONT_RIGHT_LEG).toBeDefined();
      expect(result.unit?.criticalSlots.REAR_LEFT_LEG).toBeDefined();
      expect(result.unit?.criticalSlots.REAR_RIGHT_LEG).toBeDefined();
      // Check for QuadVee-specific equipment
      expect(result.unit?.criticalSlots.FRONT_LEFT_LEG?.[4]).toBe('Conversion Equipment');
      expect(result.unit?.criticalSlots.FRONT_LEFT_LEG?.[5]).toBe('Tracks');
    });

    it('should parse QuadVee armor with quad leg armor labels', () => {
      const mtf = `
chassis:Arion
model:Standard
Config:QuadVee
techbase:Clan
era:3136
mass:35
armor:Ferro-Fibrous(Clan)
HD armor:9
CT armor:12
LT armor:10
RT armor:10
FLL armor:12
FRL armor:12
RLL armor:12
RRL armor:12
RTC armor:4
RTL armor:4
RTR armor:4
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.armor.allocation.FRONT_LEFT_LEG).toBe(12);
      expect(result.unit?.armor.allocation.FRONT_RIGHT_LEG).toBe(12);
      expect(result.unit?.armor.allocation.REAR_LEFT_LEG).toBe(12);
      expect(result.unit?.armor.allocation.REAR_RIGHT_LEG).toBe(12);
    });
  });

  // ============================================================================
  // parseWeapons()
  // ============================================================================
  describe('parseWeapons()', () => {
    it('should parse weapons list', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100

Weapons:3
Medium Laser, Left Arm
AC/20, Right Torso
LRM 20, Left Torso
`;

      const result = service.parse(mtf);

      expect(result.unit?.equipment).toHaveLength(3);
      expect(result.unit?.equipment[0].id).toBe('medium-laser');
      expect(result.unit?.equipment[0].location).toBe('LEFT_ARM');
      expect(result.unit?.equipment[1].id).toBe('ac-20');
      expect(result.unit?.equipment[1].location).toBe('RIGHT_TORSO');
      expect(result.unit?.equipment[2].id).toBe('lrm-20');
      expect(result.unit?.equipment[2].location).toBe('LEFT_TORSO');
    });

    it('should normalize equipment IDs', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100

Weapons:2
Medium Laser (IS), Left Arm
ER PPC, Right Arm
`;

      const result = service.parse(mtf);

      expect(result.unit?.equipment[0].id).toBe('medium-laser-is');
      expect(result.unit?.equipment[1].id).toBe('er-ppc');
    });

    it('should handle empty weapons section', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100

Weapons:0
`;

      const result = service.parse(mtf);

      expect(result.unit?.equipment).toHaveLength(0);
    });

    it('should handle missing weapons section', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
`;

      const result = service.parse(mtf);

      expect(result.unit?.equipment).toHaveLength(0);
    });

    it('should stop at blank line', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100

Weapons:2
Medium Laser, Left Arm

Some other section
`;

      const result = service.parse(mtf);

      expect(result.unit?.equipment).toHaveLength(1);
    });

    it('should normalize location names', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100

Weapons:3
Medium Laser, Left Arm
AC/20, Right Torso
LRM 20, Center Torso
`;

      const result = service.parse(mtf);

      expect(result.unit?.equipment[0].location).toBe('LEFT_ARM');
      expect(result.unit?.equipment[1].location).toBe('RIGHT_TORSO');
      expect(result.unit?.equipment[2].location).toBe('CENTER_TORSO');
    });
  });

  // ============================================================================
  // parseFluff()
  // ============================================================================
  describe('parseFluff()', () => {
    it('should parse all fluff fields', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
overview:The Atlas is one of the most feared BattleMechs.
capabilities:Heavy armor and devastating firepower.
history:Developed during the Star League era.
deployment:Used by all major houses.
manufacturer:Defiance Industries
primaryfactory:Hesperus II
`;

      const result = service.parse(mtf);

      expect(result.unit?.fluff?.overview).toBe('The Atlas is one of the most feared BattleMechs.');
      expect(result.unit?.fluff?.capabilities).toBe('Heavy armor and devastating firepower.');
      expect(result.unit?.fluff?.history).toBe('Developed during the Star League era.');
      expect(result.unit?.fluff?.deployment).toBe('Used by all major houses.');
      expect(result.unit?.fluff?.manufacturer).toBe('Defiance Industries');
      expect(result.unit?.fluff?.primaryFactory).toBe('Hesperus II');
    });

    it('should parse system manufacturers', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
systemmanufacturer:CHASSIS:Foundation Type 10X
systemmanufacturer:ENGINE:Vlar 300
systemmanufacturer:ARMOR:Durallex Special Heavy
`;

      const result = service.parse(mtf);

      expect(result.unit?.fluff?.systemManufacturer?.CHASSIS).toBe('Foundation Type 10X');
      expect(result.unit?.fluff?.systemManufacturer?.ENGINE).toBe('Vlar 300');
      expect(result.unit?.fluff?.systemManufacturer?.ARMOR).toBe('Durallex Special Heavy');
    });

    it('should return undefined fluff when no fields present', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
`;

      const result = service.parse(mtf);

      expect(result.unit?.fluff).toBeUndefined();
    });

    it('should handle partial fluff data', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
overview:The Atlas is one of the most feared BattleMechs.
manufacturer:Defiance Industries
`;

      const result = service.parse(mtf);

      expect(result.unit?.fluff?.overview).toBe('The Atlas is one of the most feared BattleMechs.');
      expect(result.unit?.fluff?.manufacturer).toBe('Defiance Industries');
      expect(result.unit?.fluff?.capabilities).toBeUndefined();
      expect(result.unit?.fluff?.history).toBeUndefined();
    });
  });

  // ============================================================================
  // parseQuirks()
  // ============================================================================
  describe('parseQuirks()', () => {
    it('should parse single quirk', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
quirk:battle_fists_la
`;

      const result = service.parse(mtf);

      expect(result.unit?.quirks).toEqual(['battle_fists_la']);
    });

    it('should parse multiple quirks', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
quirk:battle_fists_la
quirk:improved_targeting_short
quirk:command_mech
`;

      const result = service.parse(mtf);

      expect(result.unit?.quirks).toEqual(['battle_fists_la', 'improved_targeting_short', 'command_mech']);
    });

    it('should return undefined for no quirks', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
`;

      const result = service.parse(mtf);

      expect(result.unit?.quirks).toBeUndefined();
    });

    it('should skip empty quirk lines', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
quirk:
quirk:battle_fists_la
quirk:
`;

      const result = service.parse(mtf);

      expect(result.unit?.quirks).toEqual(['battle_fists_la']);
    });
  });

  // ============================================================================
  // mapEngineType()
  // ============================================================================
  describe('mapEngineType()', () => {
    const testCases = [
      { input: 'Fusion Engine', expected: 'FUSION' },
      { input: 'XL Engine', expected: 'XL' },
      { input: 'XL Engine(Clan)', expected: 'XL_CLAN' },
      { input: 'XXL Engine', expected: 'XXL' },
      { input: 'Light Engine', expected: 'LIGHT' },
      { input: 'Compact Engine', expected: 'COMPACT' },
      { input: 'I.C.E. Engine', expected: 'ICE' },
      { input: 'ICE Engine', expected: 'ICE' },
      { input: 'Fuel Cell Engine', expected: 'FUEL_CELL' },
      { input: 'Fuel-Cell Engine', expected: 'FUEL_CELL' },
      { input: 'Fission Engine', expected: 'FISSION' },
      { input: 'Unknown Engine', expected: 'FUSION' },
    ];

    testCases.forEach(({ input, expected }) => {
      it(`should map "${input}" to ${expected}`, () => {
        const mtf = `
chassis:Atlas
model:AS7-D
mass:100
engine:300 ${input}
`;

        const result = service.parse(mtf);

        expect(result.unit?.engine.type).toBe(expected);
      });
    });

    it('should handle XXL before XL (order matters)', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
engine:300 XXL Engine
`;

      const result = service.parse(mtf);

      expect(result.unit?.engine.type).toBe('XXL');
      expect(result.unit?.engine.type).not.toBe('XL');
    });
  });

  // ============================================================================
  // mapTechBase()
  // ============================================================================
  describe('mapTechBase()', () => {
    it('should map Inner Sphere', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
techbase:Inner Sphere
`;

      const result = service.parse(mtf);

      expect(result.unit?.techBase).toBe('INNER_SPHERE');
    });

    it('should map Clan', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
techbase:Clan
`;

      const result = service.parse(mtf);

      expect(result.unit?.techBase).toBe('CLAN');
    });

    it('should map Mixed', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
techbase:Mixed
`;

      const result = service.parse(mtf);

      expect(result.unit?.techBase).toBe('MIXED');
    });

    it('should map Mixed with Clan Chassis', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
techbase:Mixed (Clan Chassis)
`;

      const result = service.parse(mtf);

      expect(result.unit?.techBase).toBe('MIXED');
    });

    it('should map Mixed before Clan (order matters)', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
techbase:Mixed (Clan Chassis)
`;

      const result = service.parse(mtf);

      expect(result.unit?.techBase).toBe('MIXED');
      expect(result.unit?.techBase).not.toBe('CLAN');
    });

    it('should default to Inner Sphere for unknown', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
techbase:Unknown Tech Base
`;

      const result = service.parse(mtf);

      expect(result.unit?.techBase).toBe('INNER_SPHERE');
    });

    it('should be case-insensitive', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
techbase:INNER SPHERE
`;

      const result = service.parse(mtf);

      expect(result.unit?.techBase).toBe('INNER_SPHERE');
    });
  });

  // ============================================================================
  // mapRulesLevel()
  // ============================================================================
  describe('mapRulesLevel()', () => {
    it('should map level 1 to INTRODUCTORY', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
rules level:1
`;

      const result = service.parse(mtf);

      expect(result.unit?.rulesLevel).toBe('INTRODUCTORY');
    });

    it('should map level 2 to STANDARD', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
rules level:2
`;

      const result = service.parse(mtf);

      expect(result.unit?.rulesLevel).toBe('STANDARD');
    });

    it('should map level 3 to ADVANCED', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
rules level:3
`;

      const result = service.parse(mtf);

      expect(result.unit?.rulesLevel).toBe('ADVANCED');
    });

    it('should map level 4 to EXPERIMENTAL', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
rules level:4
`;

      const result = service.parse(mtf);

      expect(result.unit?.rulesLevel).toBe('EXPERIMENTAL');
    });

    it('should default to STANDARD for unknown level', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
rules level:5
`;

      const result = service.parse(mtf);

      expect(result.unit?.rulesLevel).toBe('STANDARD');
    });
  });

  // ============================================================================
  // mapEraFromYear()
  // ============================================================================
  describe('mapEraFromYear()', () => {
    const testCases = [
      { year: 2000, expected: 'EARLY_SPACEFLIGHT' },
      { year: 2100, expected: 'AGE_OF_WAR' },
      { year: 2600, expected: 'STAR_LEAGUE' },
      { year: 2800, expected: 'EARLY_SUCCESSION_WARS' },
      { year: 2950, expected: 'LATE_SUCCESSION_WARS' },
      { year: 3025, expected: 'RENAISSANCE' },
      { year: 3055, expected: 'CLAN_INVASION' },
      { year: 3065, expected: 'CIVIL_WAR' },
      { year: 3075, expected: 'JIHAD' },
      { year: 3100, expected: 'DARK_AGE' },
      { year: 3200, expected: 'IL_CLAN' },
    ];

    testCases.forEach(({ year, expected }) => {
      it(`should map year ${year} to ${expected}`, () => {
        const mtf = `
chassis:Atlas
model:AS7-D
mass:100
era:${year}
`;

        const result = service.parse(mtf);

        expect(result.unit?.era).toBe(expected);
      });
    });
  });

  // ============================================================================
  // Structure Type Mapping
  // ============================================================================
  describe('mapStructureType()', () => {
    const testCases = [
      { input: 'IS Standard', expected: 'STANDARD' },
      { input: 'Endo Steel', expected: 'ENDO_STEEL' },
      { input: 'Endo Steel (Clan)', expected: 'ENDO_STEEL_CLAN' },
      { input: 'Endo-Composite', expected: 'ENDO_COMPOSITE' },
      { input: 'Reinforced', expected: 'REINFORCED' },
      { input: 'Composite', expected: 'COMPOSITE' },
      { input: 'Industrial', expected: 'INDUSTRIAL' },
    ];

    testCases.forEach(({ input, expected }) => {
      it(`should map "${input}" to ${expected}`, () => {
        const mtf = `
chassis:Atlas
model:AS7-D
mass:100
structure:${input}
`;

        const result = service.parse(mtf);

        expect(result.unit?.structure.type).toBe(expected);
      });
    });
  });

  // ============================================================================
  // Heat Sinks
  // ============================================================================
  describe('parseHeatSinks()', () => {
    it('should parse Single heat sinks', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
heat sinks:10 Single
`;

      const result = service.parse(mtf);

      expect(result.unit?.heatSinks.type).toBe('SINGLE');
      expect(result.unit?.heatSinks.count).toBe(10);
    });

    it('should parse Double heat sinks', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
heat sinks:20 Double
`;

      const result = service.parse(mtf);

      expect(result.unit?.heatSinks.type).toBe('DOUBLE');
      expect(result.unit?.heatSinks.count).toBe(20);
    });

    it('should default to 10 Single when missing', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
`;

      const result = service.parse(mtf);

      expect(result.unit?.heatSinks.type).toBe('SINGLE');
      expect(result.unit?.heatSinks.count).toBe(10);
    });

    it('should handle malformed heat sink line', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
heat sinks:Invalid
`;

      const result = service.parse(mtf);

      expect(result.unit?.heatSinks.type).toBe('SINGLE');
      expect(result.unit?.heatSinks.count).toBe(10);
    });
  });

  // ============================================================================
  // Movement
  // ============================================================================
  describe('parseMovement()', () => {
    it('should parse walk MP', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
walk mp:3
`;

      const result = service.parse(mtf);

      expect(result.unit?.movement.walk).toBe(3);
    });

    it('should parse jump MP', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
walk mp:3
jump mp:3
`;

      const result = service.parse(mtf);

      expect(result.unit?.movement.walk).toBe(3);
      expect(result.unit?.movement.jump).toBe(3);
    });

    it('should default to 0 when missing', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
`;

      const result = service.parse(mtf);

      expect(result.unit?.movement.walk).toBe(0);
      expect(result.unit?.movement.jump).toBe(0);
    });
  });

  // ============================================================================
  // Unit ID Generation
  // ============================================================================
  describe('generateUnitId()', () => {
    it('should generate ID from chassis and model', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
`;

      const result = service.parse(mtf);

      expect(result.unit?.id).toBe('atlas-as7-d');
    });

    it('should normalize spaces', () => {
      const mtf = `
chassis:Night Gyr
model:Prime
mass:100
`;

      const result = service.parse(mtf);

      expect(result.unit?.id).toBe('night-gyr-prime');
    });

    it('should remove parentheses', () => {
      const mtf = `
chassis:Atlas
model:AS7-D (Steiner)
mass:100
`;

      const result = service.parse(mtf);

      expect(result.unit?.id).toBe('atlas-as7-d-steiner');
    });

    it('should normalize slashes', () => {
      const mtf = `
chassis:Atlas
model:AS7/D
mass:100
`;

      const result = service.parse(mtf);

      expect(result.unit?.id).toBe('atlas-as7-d');
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = service.parse('');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Missing required field: chassis');
    });

    it('should handle whitespace-only content', () => {
      const result = service.parse('   \n   \n   ');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Missing required field: chassis');
    });

    it('should handle malformed field lines', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
invalid line without colon
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.chassis).toBe('Atlas');
    });

    it('should handle duplicate field entries (first wins)', () => {
      const mtf = `
chassis:Atlas
chassis:Awesome
model:AS7-D
mass:100
`;

      const result = service.parse(mtf);

      expect(result.unit?.chassis).toBe('Atlas');
    });

    it('should handle fields with colons in values', () => {
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
overview:Note: This is a test with a colon
`;

      const result = service.parse(mtf);

      expect(result.unit?.fluff?.overview).toBe('Note: This is a test with a colon');
    });

    it('should handle very long field values', () => {
      const longText = 'A'.repeat(10000);
      const mtf = `
chassis:Atlas
model:AS7-D
mass:100
overview:${longText}
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.fluff?.overview).toBe(longText);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================
  describe('Integration Tests', () => {
    it('should parse Atlas AS7-D completely', () => {
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
heat sinks:20 Single
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

Weapons:6
Medium Laser, Left Torso
Medium Laser, Left Torso
SRM 6, Left Torso
AC/20, Right Torso
Medium Laser, Center Torso
LRM 20, Center Torso

Left Arm:
Shoulder
Upper Arm Actuator
Lower Arm Actuator
Hand Actuator
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-

Right Arm:
Shoulder
Upper Arm Actuator
Lower Arm Actuator
Hand Actuator
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-

Left Torso:
Medium Laser
Medium Laser
SRM 6
SRM 6
ISAmmo LRM-20
ISAmmo SRM-6
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-

Right Torso:
Autocannon/20
Autocannon/20
Autocannon/20
Autocannon/20
Autocannon/20
Autocannon/20
Autocannon/20
Autocannon/20
Autocannon/20
Autocannon/20
ISAmmo AC/20
ISAmmo AC/20

Center Torso:
Fusion Engine
Fusion Engine
Fusion Engine
Gyro
Gyro
Gyro
Gyro
Fusion Engine
Fusion Engine
Fusion Engine
Medium Laser
LRM 20

Head:
Life Support
Sensors
Cockpit
-Empty-
Sensors
Life Support

Left Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator
-Empty-
-Empty-

Right Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator
-Empty-
-Empty-

overview:The Atlas is the largest and most feared BattleMech in the Inner Sphere.
capabilities:The Atlas features heavy armor protection and overwhelming firepower.
history:Developed during the twilight of the Star League era.
deployment:The AS7-D is the most common variant, used by all major houses.
manufacturer:Defiance Industries
primaryfactory:Hesperus II
systemmanufacturer:CHASSIS:Foundation Type 10X
systemmanufacturer:ENGINE:Vlar 300
systemmanufacturer:ARMOR:Durallex Special Heavy
systemmanufacturer:COMMUNICATIONS:Angst Discom
systemmanufacturer:TARGETING:Angst Accuracy

quirk:battle_fists_la
quirk:battle_fists_ra
quirk:command_mech
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.unit).toBeDefined();

      const unit = result.unit!;
      expect(unit.id).toBe('atlas-as7-d');
      expect(unit.chassis).toBe('Atlas');
      expect(unit.model).toBe('AS7-D');
      expect(unit.unitType).toBe('BattleMech');
      expect(unit.configuration).toBe('Biped');
      expect(unit.techBase).toBe('INNER_SPHERE');
      expect(unit.rulesLevel).toBe('STANDARD');
      expect(unit.era).toBe('STAR_LEAGUE');
      expect(unit.year).toBe(2755);
      expect(unit.tonnage).toBe(100);
      expect(unit.engine.type).toBe('FUSION');
      expect(unit.engine.rating).toBe(300);
      expect(unit.structure.type).toBe('STANDARD');
      expect(unit.armor.type).toBe('STANDARD');
      expect(unit.heatSinks.type).toBe('SINGLE');
      expect(unit.heatSinks.count).toBe(20);
      expect(unit.movement.walk).toBe(3);
      expect(unit.movement.jump).toBe(0);
      expect(unit.equipment).toHaveLength(6);
      expect(unit.criticalSlots.HEAD).toHaveLength(6);
      expect(unit.criticalSlots.LEFT_ARM).toHaveLength(12);
      expect(unit.criticalSlots.RIGHT_ARM).toHaveLength(12);
      expect(unit.criticalSlots.LEFT_TORSO).toHaveLength(12);
      expect(unit.criticalSlots.RIGHT_TORSO).toHaveLength(12);
      expect(unit.criticalSlots.CENTER_TORSO).toHaveLength(12);
      expect(unit.criticalSlots.LEFT_LEG).toHaveLength(6);
      expect(unit.criticalSlots.RIGHT_LEG).toHaveLength(6);
      expect(unit.quirks).toHaveLength(3);
      expect(unit.quirks).toContain('battle_fists_la');
      expect(unit.quirks).toContain('battle_fists_ra');
      expect(unit.quirks).toContain('command_mech');
      expect(unit.fluff?.overview).toContain('The Atlas is the largest');
      expect(unit.fluff?.capabilities).toContain('heavy armor');
      expect(unit.fluff?.history).toContain('Star League era');
      expect(unit.fluff?.deployment).toContain('AS7-D is the most common');
      expect(unit.fluff?.manufacturer).toBe('Defiance Industries');
      expect(unit.fluff?.primaryFactory).toBe('Hesperus II');
      expect(unit.fluff?.systemManufacturer?.CHASSIS).toBe('Foundation Type 10X');
      expect(unit.fluff?.systemManufacturer?.ENGINE).toBe('Vlar 300');
      expect(unit.fluff?.systemManufacturer?.ARMOR).toBe('Durallex Special Heavy');
    });

    it('should parse Clan mech with XL engine', () => {
      const mtf = `
chassis:Timber Wolf
model:Prime
Config:Biped Omnimech
techbase:Clan
era:2945
rules level:2
mass:75
engine:375 XL Engine(Clan)
structure:Endo Steel (Clan)
myomer:Standard
heat sinks:20 Double
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
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.chassis).toBe('Timber Wolf');
      expect(result.unit?.model).toBe('Prime');
      expect(result.unit?.techBase).toBe('CLAN');
      expect(result.unit?.engine.type).toBe('XL_CLAN');
      expect(result.unit?.engine.rating).toBe(375);
      expect(result.unit?.structure.type).toBe('ENDO_STEEL_CLAN');
      expect(result.unit?.armor.type).toBe('FERRO_FIBROUS_CLAN');
      expect(result.unit?.heatSinks.type).toBe('DOUBLE');
    });

    it('should parse Mixed tech base unit', () => {
      const mtf = `
chassis:Atlas
model:AS7-D2
Config:Biped
techbase:Mixed (IS Chassis)
era:3070
rules level:3
mass:100
engine:300 XL Engine
`;

      const result = service.parse(mtf);

      expect(result.success).toBe(true);
      expect(result.unit?.techBase).toBe('MIXED');
      expect(result.unit?.engine.type).toBe('XL');
    });
  });

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
      expect(result.unit?.equipment.every(eq => eq.isOmniPodMounted)).toBe(true);
    });
  });
});
