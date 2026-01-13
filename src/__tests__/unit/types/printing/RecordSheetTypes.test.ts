/**
 * Tests for RecordSheetTypes - Location Mappings and Constants
 * 
 * @spec openspec/changes/integrate-mm-data-assets/specs/record-sheet-export/spec.md
 * 
 * Verifies that all mech locations have correct abbreviations and names
 * for use in record sheet rendering.
 */

import { 
  LOCATION_ABBREVIATIONS, 
  LOCATION_NAMES,
  PaperSize,
  PAPER_DIMENSIONS,
} from '@/types/printing/RecordSheetTypes';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

describe('RecordSheetTypes', () => {
  describe('LOCATION_ABBREVIATIONS', () => {
    describe('Biped Locations', () => {
      it('should have abbreviation for HEAD', () => {
        expect(LOCATION_ABBREVIATIONS[MechLocation.HEAD]).toBe('HD');
      });

      it('should have abbreviation for CENTER_TORSO', () => {
        expect(LOCATION_ABBREVIATIONS[MechLocation.CENTER_TORSO]).toBe('CT');
      });

      it('should have abbreviation for LEFT_TORSO', () => {
        expect(LOCATION_ABBREVIATIONS[MechLocation.LEFT_TORSO]).toBe('LT');
      });

      it('should have abbreviation for RIGHT_TORSO', () => {
        expect(LOCATION_ABBREVIATIONS[MechLocation.RIGHT_TORSO]).toBe('RT');
      });

      it('should have abbreviation for LEFT_ARM', () => {
        expect(LOCATION_ABBREVIATIONS[MechLocation.LEFT_ARM]).toBe('LA');
      });

      it('should have abbreviation for RIGHT_ARM', () => {
        expect(LOCATION_ABBREVIATIONS[MechLocation.RIGHT_ARM]).toBe('RA');
      });

      it('should have abbreviation for LEFT_LEG', () => {
        expect(LOCATION_ABBREVIATIONS[MechLocation.LEFT_LEG]).toBe('LL');
      });

      it('should have abbreviation for RIGHT_LEG', () => {
        expect(LOCATION_ABBREVIATIONS[MechLocation.RIGHT_LEG]).toBe('RL');
      });
    });

    describe('Quad Locations', () => {
      it('should have abbreviation for FRONT_LEFT_LEG', () => {
        expect(LOCATION_ABBREVIATIONS[MechLocation.FRONT_LEFT_LEG]).toBe('FLL');
      });

      it('should have abbreviation for FRONT_RIGHT_LEG', () => {
        expect(LOCATION_ABBREVIATIONS[MechLocation.FRONT_RIGHT_LEG]).toBe('FRL');
      });

      it('should have abbreviation for REAR_LEFT_LEG', () => {
        expect(LOCATION_ABBREVIATIONS[MechLocation.REAR_LEFT_LEG]).toBe('RLL');
      });

      it('should have abbreviation for REAR_RIGHT_LEG', () => {
        expect(LOCATION_ABBREVIATIONS[MechLocation.REAR_RIGHT_LEG]).toBe('RRL');
      });
    });

    describe('Tripod Location', () => {
      it('should have abbreviation for CENTER_LEG', () => {
        expect(LOCATION_ABBREVIATIONS[MechLocation.CENTER_LEG]).toBe('CL');
      });
    });

    describe('Completeness', () => {
      it('should have abbreviations for all MechLocation values', () => {
        const allLocations = Object.values(MechLocation);
        
        allLocations.forEach(location => {
          expect(LOCATION_ABBREVIATIONS[location]).toBeDefined();
          expect(typeof LOCATION_ABBREVIATIONS[location]).toBe('string');
          expect(LOCATION_ABBREVIATIONS[location].length).toBeGreaterThan(0);
        });
      });

      it('should have unique abbreviations', () => {
        const abbreviations = Object.values(LOCATION_ABBREVIATIONS);
        const uniqueAbbreviations = new Set(abbreviations);
        
        expect(uniqueAbbreviations.size).toBe(abbreviations.length);
      });
    });
  });

  describe('LOCATION_NAMES', () => {
    it('should have display name for all MechLocation values', () => {
      const allLocations = Object.values(MechLocation);
      
      allLocations.forEach(location => {
        expect(LOCATION_NAMES[location]).toBeDefined();
        expect(typeof LOCATION_NAMES[location]).toBe('string');
      });
    });

    it('should use MechLocation value as display name', () => {
      // MechLocation enum values are already display-friendly names
      expect(LOCATION_NAMES[MechLocation.HEAD]).toBe('Head');
      expect(LOCATION_NAMES[MechLocation.LEFT_ARM]).toBe('Left Arm');
      expect(LOCATION_NAMES[MechLocation.CENTER_LEG]).toBe('Center Leg');
      expect(LOCATION_NAMES[MechLocation.FRONT_LEFT_LEG]).toBe('Front Left Leg');
    });
  });

  describe('PaperSize Enum', () => {
    it('should have LETTER size', () => {
      expect(PaperSize.LETTER).toBe('letter');
    });

    it('should have A4 size', () => {
      expect(PaperSize.A4).toBe('a4');
    });
  });

  describe('PAPER_DIMENSIONS', () => {
    describe('Letter Dimensions', () => {
      it('should have correct width for Letter', () => {
        expect(PAPER_DIMENSIONS[PaperSize.LETTER].width).toBe(612); // 8.5" at 72dpi (points)
      });

      it('should have correct height for Letter', () => {
        expect(PAPER_DIMENSIONS[PaperSize.LETTER].height).toBe(792); // 11" at 72dpi (points)
      });
    });

    describe('A4 Dimensions', () => {
      it('should have correct width for A4', () => {
        expect(PAPER_DIMENSIONS[PaperSize.A4].width).toBe(595); // 210mm at 72dpi (points)
      });

      it('should have correct height for A4', () => {
        expect(PAPER_DIMENSIONS[PaperSize.A4].height).toBe(842); // 297mm at 72dpi (points)
      });
    });
  });
});
