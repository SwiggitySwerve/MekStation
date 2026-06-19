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

      expect(result.unit?.armor.allocation.LEFT_TORSO).toEqual({
        front: 32,
        rear: 10,
      });
      expect(result.unit?.armor.allocation.RIGHT_TORSO).toEqual({
        front: 32,
        rear: 10,
      });
      expect(result.unit?.armor.allocation.CENTER_TORSO).toEqual({
        front: 47,
        rear: 14,
      });
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
});
