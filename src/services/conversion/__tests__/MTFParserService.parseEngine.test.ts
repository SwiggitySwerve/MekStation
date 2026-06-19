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
});
