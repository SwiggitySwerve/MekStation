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

  describe('formatEquipmentName()', () => {
    it('should format medium-laser', () => {
      const unit = createMinimalUnit({
        equipment: [{ id: 'medium-laser', location: 'RIGHT_ARM' }],
      });
      const result = service.export(unit);

      expect(result.content).toContain('Medium Laser, Right Arm');
    });

    it('should format small-laser', () => {
      const unit = createMinimalUnit({
        equipment: [{ id: 'small-laser', location: 'LEFT_ARM' }],
      });
      const result = service.export(unit);

      expect(result.content).toContain('Small Laser, Left Arm');
    });

    it('should format large-laser', () => {
      const unit = createMinimalUnit({
        equipment: [{ id: 'large-laser', location: 'RIGHT_TORSO' }],
      });
      const result = service.export(unit);

      expect(result.content).toContain('Large Laser, Right Torso');
    });

    it('should format ER lasers', () => {
      const unit = createMinimalUnit({
        equipment: [
          { id: 'er-medium-laser', location: 'RIGHT_ARM' },
          { id: 'er-small-laser', location: 'LEFT_ARM' },
          { id: 'er-large-laser', location: 'CENTER_TORSO' },
        ],
      });
      const result = service.export(unit);

      expect(result.content).toContain('ER Medium Laser, Right Arm');
      expect(result.content).toContain('ER Small Laser, Left Arm');
      expect(result.content).toContain('ER Large Laser, Center Torso');
    });

    it('should format PPCs', () => {
      const unit = createMinimalUnit({
        equipment: [
          { id: 'ppc', location: 'RIGHT_ARM' },
          { id: 'er-ppc', location: 'LEFT_ARM' },
        ],
      });
      const result = service.export(unit);

      expect(result.content).toContain('PPC, Right Arm');
      expect(result.content).toContain('ER PPC, Left Arm');
    });

    it('should format LRMs', () => {
      const unit = createMinimalUnit({
        equipment: [
          { id: 'lrm-5', location: 'LEFT_TORSO' },
          { id: 'lrm-10', location: 'LEFT_TORSO' },
          { id: 'lrm-15', location: 'RIGHT_TORSO' },
          { id: 'lrm-20', location: 'RIGHT_TORSO' },
        ],
      });
      const result = service.export(unit);

      expect(result.content).toContain('LRM 5, Left Torso');
      expect(result.content).toContain('LRM 10, Left Torso');
      expect(result.content).toContain('LRM 15, Right Torso');
      expect(result.content).toContain('LRM 20, Right Torso');
    });

    it('should format SRMs', () => {
      const unit = createMinimalUnit({
        equipment: [
          { id: 'srm-2', location: 'LEFT_TORSO' },
          { id: 'srm-4', location: 'CENTER_TORSO' },
          { id: 'srm-6', location: 'RIGHT_TORSO' },
        ],
      });
      const result = service.export(unit);

      expect(result.content).toContain('SRM 2, Left Torso');
      expect(result.content).toContain('SRM 4, Center Torso');
      expect(result.content).toContain('SRM 6, Right Torso');
    });

    it('should format Autocannons', () => {
      const unit = createMinimalUnit({
        equipment: [
          { id: 'ac-2', location: 'LEFT_ARM' },
          { id: 'ac-5', location: 'RIGHT_ARM' },
          { id: 'ac-10', location: 'LEFT_TORSO' },
          { id: 'ac-20', location: 'RIGHT_TORSO' },
        ],
      });
      const result = service.export(unit);

      expect(result.content).toContain('AC/2, Left Arm');
      expect(result.content).toContain('AC/5, Right Arm');
      expect(result.content).toContain('AC/10, Left Torso');
      expect(result.content).toContain('AC/20, Right Torso');
    });

    it('should format machine guns and flamers', () => {
      const unit = createMinimalUnit({
        equipment: [
          { id: 'machine-gun', location: 'LEFT_ARM' },
          { id: 'flamer', location: 'RIGHT_ARM' },
        ],
      });
      const result = service.export(unit);

      expect(result.content).toContain('Machine Gun, Left Arm');
      expect(result.content).toContain('Flamer, Right Arm');
    });

    it('should format Gauss Rifle', () => {
      const unit = createMinimalUnit({
        equipment: [{ id: 'gauss-rifle', location: 'RIGHT_TORSO' }],
      });
      const result = service.export(unit);

      expect(result.content).toContain('Gauss Rifle, Right Torso');
    });

    it('should format unknown equipment by capitalizing words', () => {
      const unit = createMinimalUnit({
        equipment: [{ id: 'unknown-weapon-system', location: 'CENTER_TORSO' }],
      });
      const result = service.export(unit);

      expect(result.content).toContain('Unknown Weapon System, Center Torso');
    });

    it('should handle equipment with single word names', () => {
      const unit = createMinimalUnit({
        equipment: [{ id: 'hatchet', location: 'RIGHT_ARM' }],
      });
      const result = service.export(unit);

      expect(result.content).toContain('Hatchet, Right Arm');
    });

    it('should include weapon count in output', () => {
      const unit = createMinimalUnit({
        equipment: [
          { id: 'medium-laser', location: 'RIGHT_ARM' },
          { id: 'medium-laser', location: 'LEFT_ARM' },
          { id: 'ac-10', location: 'RIGHT_TORSO' },
        ],
      });
      const result = service.export(unit);

      expect(result.content).toContain('Weapons:3');
    });

    it('should handle zero weapons', () => {
      const unit = createMinimalUnit({ equipment: [] });
      const result = service.export(unit);

      expect(result.content).toContain('Weapons:0');
    });

    it('should handle equipment with unknown location names', () => {
      const customLocation: string = 'CUSTOM_LOCATION';
      const unit = createMinimalUnit({
        equipment: [{ id: 'medium-laser', location: customLocation }],
      });
      const result = service.export(unit);

      expect(result.content).toContain('Medium Laser, CUSTOM_LOCATION');
    });
  });
});
