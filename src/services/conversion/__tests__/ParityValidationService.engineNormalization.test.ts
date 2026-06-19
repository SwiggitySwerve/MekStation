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

  describe('engine normalization', () => {
    it('should normalize engine strings with tech base markers', () => {
      const originalMtf = `chassis:Atlas
model:AS7-D
engine:300 Fusion Engine(IS)`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
engine:300 Fusion Engine`;

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
        result.issues.filter(
          (i) => i.category === DiscrepancyCategory.EngineMismatch,
        ).length,
      ).toBe(0);
    });

    it('should normalize ICE engine variants', () => {
      const originalMtf = `chassis:Scorpion
model:SCR-1
engine:100 I.C.E.`;

      const generatedMtf = `chassis:Scorpion
model:SCR-1
engine:100 ICE`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Scorpion', model: 'SCR-1' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(
        result.issues.filter(
          (i) => i.category === DiscrepancyCategory.EngineMismatch,
        ).length,
      ).toBe(0);
    });

    it('should normalize Fuel Cell engine variants', () => {
      const originalMtf = `chassis:Test
model:FC-1
engine:100 Fuel-Cell`;

      const generatedMtf = `chassis:Test
model:FC-1
engine:100 Fuel Cell`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Test', model: 'FC-1' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(
        result.issues.filter(
          (i) => i.category === DiscrepancyCategory.EngineMismatch,
        ).length,
      ).toBe(0);
    });
  });
});
