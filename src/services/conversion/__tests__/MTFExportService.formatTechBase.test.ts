/**
 * MTF Export Service Tests
 *
 * Tests for exporting ISerializedUnit objects to MTF (MegaMek Text Format) strings.
 *
 * @spec openspec/specs/mtf-parity-validation/spec.md
 * @spec openspec/specs/serialization-formats/spec.md
 */

// CRITICAL: Unmock these modules to ensure we test the real implementation
// ParityValidationService.test.ts mocks MTFExportService, so we must explicitly unmock it here
jest.unmock('@/services/conversion/MTFExportService');
jest.unmock('@/services/conversion/MTFParserService');

import {
  MTFExportService,
  getMTFExportService,
} from '@/services/conversion/MTFExportService';
import { getMTFParserService } from '@/services/conversion/MTFParserService';
import {
  ISerializedUnit,
  ISerializedFluff,
} from '@/types/unit/UnitSerialization';

import { createMinimalUnit } from './MTFExportService.test-helpers';

describe('MTFExportService', () => {
  let service: MTFExportService;

  beforeEach(() => {
    service = getMTFExportService();
  });

  // ============================================================================
  // Singleton Pattern
  // ============================================================================
  // ============================================================================
  // ============================================================================
  // formatConfig() - Configuration Formatting
  // ============================================================================
  // ============================================================================
  // formatTechBase() - Tech Base Formatting
  // ============================================================================
  // ============================================================================
  // formatRulesLevel() - Rules Level Formatting
  // ============================================================================
  // ============================================================================
  // formatEngineType() - Engine Type Formatting
  // ============================================================================
  // ============================================================================
  // Structure Type Formatting
  // ============================================================================
  // ============================================================================
  // Heat Sink Type Formatting
  // ============================================================================
  // ============================================================================
  // Armor Type Formatting
  // ============================================================================
  // ============================================================================
  // Armor Values Formatting
  // ============================================================================
  // ============================================================================
  // formatEquipmentName() - Equipment Name Formatting
  // ============================================================================
  // ============================================================================
  // Critical Slots Formatting
  // ============================================================================
  // ============================================================================
  // Quirks Formatting
  // ============================================================================
  // ============================================================================
  // writeFluff() - Fluff Sections
  // ============================================================================
  // ============================================================================
  // Round-Trip Testing
  // ============================================================================
  // ============================================================================
  // Edge Cases
  // ============================================================================
  // ============================================================================
  // OmniMech Export Tests
  // ============================================================================
  // ============================================================================
  // OmniMech Round-Trip Tests
  // ============================================================================
  // ============================================================================
  // OmniMech Variant Workflow Tests
  // ============================================================================

  describe('formatTechBase()', () => {
    it('should format INNER_SPHERE tech base', () => {
      const unit = createMinimalUnit({ techBase: 'INNER_SPHERE' });
      const result = service.export(unit);

      expect(result.content).toContain('techbase:Inner Sphere');
    });

    it('should format CLAN tech base', () => {
      const unit = createMinimalUnit({ techBase: 'CLAN' });
      const result = service.export(unit);

      expect(result.content).toContain('techbase:Clan');
    });

    it('should reject MIXED without chassis tech context', () => {
      const unit = createMinimalUnit({ techBase: 'MIXED' });
      const result = service.export(unit);

      expect(result.success).toBe(false);
      expect(result.content).toBeUndefined();
      expect(result.errors.join('; ')).toContain('chassis-tech-context');
    });

    it.each([
      ['INNER_SPHERE', 'Mixed (IS Chassis)'],
      ['CLAN', 'Mixed (Clan Chassis)'],
    ] as const)(
      'uses the supplied %s chassis despite conflicting hints',
      (chassis, header) => {
        const opposite = chassis === 'CLAN' ? 'INNER_SPHERE' : 'CLAN';
        const unit = {
          ...createMinimalUnit({
            id: chassis === 'CLAN' ? 'atlas-as7-d' : 'timber-wolf-prime',
            techBase: 'MIXED',
            componentTechBases: { chassis, engine: opposite, armor: opposite },
          }),
          mtfSource: {
            text: `techbase:Mixed (${chassis === 'CLAN' ? 'IS' : 'Clan'} Chassis)`,
          },
        };
        const result = service.export(unit);

        expect(result.success).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.content?.split('\n')).toContain(`techbase:${header}`);
      },
    );

    it.each([
      {},
      { engine: 'CLAN' },
      { chassis: 'MIXED' },
      { chassis: 'Clan' },
      { chassis: null },
    ])(
      'refuses missing or invalid context %p even with retained source',
      (componentTechBases) => {
        const result = Reflect.apply(service.export, service, [
          {
            ...createMinimalUnit({ techBase: 'MIXED' }),
            componentTechBases,
            mtfSource: { text: 'techbase:Mixed (Clan Chassis)' },
          },
        ]);

        expect(result.success).toBe(false);
        expect(result.content).toBeUndefined();
        expect(result.errors.join('; ')).toContain('chassis-tech-context');
      },
    );

    it.each(['INNER_SPHERE', 'CLAN'])(
      'keeps the complete pure %s export independent of context',
      (techBase) => {
        const unit = createMinimalUnit({ techBase });
        for (const chassis of ['INNER_SPHERE', 'CLAN'] as const) {
          expect(
            service.export({ ...unit, componentTechBases: { chassis } }),
          ).toEqual(service.export(unit));
        }
      },
    );

    it('should default unknown tech bases to Inner Sphere', () => {
      const unit = createMinimalUnit({ techBase: 'UNKNOWN' });
      const result = service.export(unit);

      expect(result.content).toContain('techbase:Inner Sphere');
    });
  });
});
