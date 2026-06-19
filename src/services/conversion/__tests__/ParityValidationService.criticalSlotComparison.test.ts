/**
 * ParityValidationService Tests
 *
 * Tests for round-trip MTF validation service.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  ParityValidationService,
  getParityValidationService,
  resetParityValidationService,
} from '../ParityValidationService';
import { DiscrepancyCategory } from '../types/ParityValidation';

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

// Mock the parser and exporter services
jest.mock('../MTFParserService', () => ({
  getMTFParserService: jest.fn(() => ({
    parse: jest.fn(),
  })),
  MTFParserService: jest.fn(),
}));

jest.mock('../MTFExportService', () => ({
  getMTFExportService: jest.fn(() => ({
    export: jest.fn(),
  })),
  MTFExportService: jest.fn(),
}));

import { getMTFExportService } from '../MTFExportService';
import { getMTFParserService } from '../MTFParserService';

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;

describe('ParityValidationService', () => {
  let service: ParityValidationService;
  let mockParser: { parse: jest.Mock };
  let mockExporter: { export: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup path mocks
    mockedPath.join.mockImplementation((...args) => args.join('/'));
    mockedPath.dirname.mockImplementation((p) =>
      p.split('/').slice(0, -1).join('/'),
    );
    mockedPath.basename.mockImplementation((p) => p.split('/').pop() || '');

    // Setup parser mock
    mockParser = { parse: jest.fn() };
    (getMTFParserService as jest.Mock).mockReturnValue(mockParser);

    // Setup exporter mock
    mockExporter = { export: jest.fn() };
    (getMTFExportService as jest.Mock).mockReturnValue(mockExporter);

    resetParityValidationService();
    service = getParityValidationService();
  });

  describe('critical slot comparison', () => {
    it('should detect slot count mismatch', () => {
      const originalMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
Lower Arm Actuator
Hand Actuator
Medium Laser
-Empty-`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
Medium Laser`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(
        result.issues.some(
          (i) => i.category === DiscrepancyCategory.SlotCountMismatch,
        ),
      ).toBe(true);
    });

    it('should detect missing actuator', () => {
      // Use non-trailing empty slot so normalizeSlots doesn't strip it
      const originalMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
Lower Arm Actuator
Hand Actuator
Medium Laser`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
Lower Arm Actuator
-Empty-
Medium Laser`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(
        result.issues.some(
          (i) => i.category === DiscrepancyCategory.MissingActuator,
        ),
      ).toBe(true);
    });

    it('should detect extra actuator', () => {
      // Use non-trailing actuator so normalizeSlots comparison works
      const originalMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
-Empty-
Medium Laser`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
Hand Actuator
Medium Laser`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(
        result.issues.some(
          (i) => i.category === DiscrepancyCategory.ExtraActuator,
        ),
      ).toBe(true);
    });

    it('should detect actuator slot mismatch', () => {
      const originalMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
Hand Actuator`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
Lower Arm Actuator`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(
        result.issues.some(
          (i) => i.category === DiscrepancyCategory.SlotMismatch,
        ),
      ).toBe(true);
    });

    it('should detect non-actuator slot mismatch', () => {
      const originalMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
Medium Laser`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
Large Laser`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(
        result.issues.some(
          (i) =>
            i.category === DiscrepancyCategory.SlotMismatch &&
            i.expected === 'Medium Laser',
        ),
      ).toBe(true);
    });

    it('should handle section break in critical slots', () => {
      const originalMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
weapons:1 Medium Laser`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
weapons:1 Medium Laser`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      // weapons: line should be treated as section break, not slot content
      expect(result.status).toBe('PASSED');
    });

    it('should handle quad mech locations', () => {
      const originalMtf = `chassis:Barghest
model:BGS-1T
Front Left Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator
Rear Right Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator`;

      const generatedMtf = `chassis:Barghest
model:BGS-1T
Front Left Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator
Rear Right Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Barghest', model: 'BGS-1T' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(result.status).toBe('PASSED');
    });

    it('should handle tripod mech center leg', () => {
      const originalMtf = `chassis:Ares
model:ARS-V1
Center Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator`;

      const generatedMtf = `chassis:Ares
model:ARS-V1
Center Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Ares', model: 'ARS-V1' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(result.status).toBe('PASSED');
    });
  });
});
