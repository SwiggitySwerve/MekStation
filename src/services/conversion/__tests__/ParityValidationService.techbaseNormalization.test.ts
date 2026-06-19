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

  describe('techbase normalization', () => {
    it('should normalize Clan techbase', () => {
      const originalMtf = `chassis:Timber Wolf
model:Prime
techbase:Clan`;

      const generatedMtf = `chassis:Timber Wolf
model:Prime
techbase:Clan`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Timber Wolf', model: 'Prime' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(result.issues.filter((i) => i.field === 'techbase').length).toBe(
        0,
      );
    });

    it('should normalize Inner Sphere techbase', () => {
      const originalMtf = `chassis:Atlas
model:AS7-D
techbase:Inner Sphere`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
techbase:IS`;

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
      expect(result.issues.filter((i) => i.field === 'techbase').length).toBe(
        0,
      );
    });

    it('should normalize Mixed (Clan Chassis) techbase', () => {
      const originalMtf = `chassis:Timber Wolf
model:C
techbase:Mixed (Clan Chassis)`;

      const generatedMtf = `chassis:Timber Wolf
model:C
techbase:Mixed`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Timber Wolf', model: 'C' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(result.issues.filter((i) => i.field === 'techbase').length).toBe(
        0,
      );
    });
  });
});
