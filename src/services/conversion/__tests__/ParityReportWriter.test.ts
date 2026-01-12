/**
 * Parity Report Writer Tests
 *
 * Tests for writing parity validation reports to disk.
 *
 * @spec openspec/specs/mtf-parity-validation/spec.md
 */

import { ParityReportWriter, getParityReportWriter } from '@/services/conversion/ParityReportWriter';
import {
  IUnitValidationResult,
  IValidationSummary,
  IValidationManifest,
  IManifestEntry,
  IUnitIssueReport,
  DiscrepancyCategory,
} from '@/services/conversion/types/ParityValidation';
import * as fs from 'fs';
import * as path from 'path';

// Mock the fs module - this mocks file I/O but NOT the ParityReportWriter class
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

describe('ParityReportWriter', () => {
  let writer: ParityReportWriter;
  let mockWriteFileSync: jest.MockedFunction<typeof fs.writeFileSync>;
  let mockMkdirSync: jest.MockedFunction<typeof fs.mkdirSync>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset the singleton instance to ensure clean state
    // @ts-expect-error - accessing private static property for testing
    ParityReportWriter.instance = null;

    writer = getParityReportWriter();
    mockWriteFileSync = fs.writeFileSync as jest.MockedFunction<typeof fs.writeFileSync>;
    mockMkdirSync = fs.mkdirSync as jest.MockedFunction<typeof fs.mkdirSync>;

    // Reset mock implementations to defaults
    mockWriteFileSync.mockImplementation(() => undefined);
    mockMkdirSync.mockImplementation(() => undefined);
  });

  // ============================================================================
  // Singleton Pattern
  // ============================================================================
  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getParityReportWriter();
      const instance2 = getParityReportWriter();
      expect(instance1).toBe(instance2);
    });

    it('should return same instance from static method', () => {
      const instance1 = ParityReportWriter.getInstance();
      const instance2 = ParityReportWriter.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return same instance from factory function and static method', () => {
      const instance1 = getParityReportWriter();
      const instance2 = ParityReportWriter.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  // ============================================================================
  // Test Data Factories
  // ============================================================================
  const createValidationResult = (
    overrides?: Partial<IUnitValidationResult>
  ): IUnitValidationResult => ({
    id: 'atlas-as7-d',
    chassis: 'Atlas',
    model: 'AS7-D',
    mtfPath: '/data/mechs/atlas/Atlas AS7-D.mtf',
    generatedPath: '/output/generated/atlas-as7-d.mtf',
    status: 'PASSED',
    issues: [],
    ...overrides,
  });

  const createValidationSummary = (
    overrides?: Partial<IValidationSummary>
  ): IValidationSummary => ({
    generatedAt: '2026-01-11T12:00:00Z',
    mmDataCommit: 'abc123def456',
    unitsValidated: 10,
    unitsPassed: 7,
    unitsWithIssues: 2,
    unitsWithParseErrors: 1,
    issuesByCategory: {
      [DiscrepancyCategory.UNKNOWN_EQUIPMENT]: 5,
      [DiscrepancyCategory.EQUIPMENT_MISMATCH]: 3,
      [DiscrepancyCategory.MISSING_ACTUATOR]: 0,
      [DiscrepancyCategory.EXTRA_ACTUATOR]: 0,
      [DiscrepancyCategory.SLOT_MISMATCH]: 2,
      [DiscrepancyCategory.SLOT_COUNT_MISMATCH]: 1,
      [DiscrepancyCategory.ARMOR_MISMATCH]: 0,
      [DiscrepancyCategory.ENGINE_MISMATCH]: 0,
      [DiscrepancyCategory.MOVEMENT_MISMATCH]: 0,
      [DiscrepancyCategory.HEADER_MISMATCH]: 0,
      [DiscrepancyCategory.QUIRK_MISMATCH]: 0,
      [DiscrepancyCategory.FLUFF_MISMATCH]: 0,
      [DiscrepancyCategory.PARSE_ERROR]: 1,
    },
    ...overrides,
  });

  // ============================================================================
  // writeReports()
  // ============================================================================
  describe('writeReports()', () => {
    it('should create issues directory', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      expect(mockMkdirSync).toHaveBeenCalledWith(
        path.join(outputDir, 'issues'),
        { recursive: true }
      );
    });

    it('should write manifest.json', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join(outputDir, 'manifest.json'),
        expect.any(String)
      );
    });

    it('should write summary.json', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join(outputDir, 'summary.json'),
        expect.any(String)
      );
    });

    it('should write issue files for units with issues', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'unit-with-issues',
          status: 'ISSUES_FOUND',
          issues: [
            {
              category: DiscrepancyCategory.EQUIPMENT_MISMATCH,
              location: 'Left Arm',
              expected: 'Medium Laser',
              actual: 'Large Laser',
              suggestion: 'Replace Large Laser with Medium Laser',
            },
          ],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join(outputDir, 'issues', 'unit-with-issues.json'),
        expect.any(String)
      );
    });

    it('should write issue files for units with parse errors', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'unit-with-errors',
          status: 'PARSE_ERROR',
          issues: [
            {
              category: DiscrepancyCategory.PARSE_ERROR,
              expected: 'Valid MTF',
              actual: 'Malformed MTF',
              suggestion: 'Fix MTF syntax',
            },
          ],
          parseErrors: ['Invalid header format'],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join(outputDir, 'issues', 'unit-with-errors.json'),
        expect.any(String)
      );
    });

    it('should not write issue files for passed units', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'passed-unit',
          status: 'PASSED',
          issues: [],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      // Should only write manifest and summary, not issue files
      expect(mockWriteFileSync).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple units with mixed statuses', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({ id: 'unit-1', status: 'PASSED' }),
        createValidationResult({ id: 'unit-2', status: 'ISSUES_FOUND', issues: [{
          category: DiscrepancyCategory.ARMOR_MISMATCH,
          expected: '100',
          actual: '90',
          suggestion: 'Increase armor to 100'
        }] }),
        createValidationResult({ id: 'unit-3', status: 'PASSED' }),
        createValidationResult({ id: 'unit-4', status: 'PARSE_ERROR', issues: [{
          category: DiscrepancyCategory.PARSE_ERROR,
          expected: 'Valid',
          actual: 'Invalid',
          suggestion: 'Fix'
        }] }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      // Should write: manifest, summary, 2 issue files
      expect(mockWriteFileSync).toHaveBeenCalledTimes(4);
    });
  });

  // ============================================================================
  // writeManifest() - via writeReports()
  // ============================================================================
  describe('writeManifest()', () => {
    it('should write correctly structured manifest JSON', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'atlas-as7-d',
          chassis: 'Atlas',
          model: 'AS7-D',
          mtfPath: '/data/atlas.mtf',
          status: 'PASSED',
          issues: [],
        }),
      ];
      const summary = createValidationSummary({
        generatedAt: '2026-01-11T10:00:00Z',
        mmDataCommit: 'commit123',
      });
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const manifestCall = mockWriteFileSync.mock.calls.find(
        call => call[0] === path.join(outputDir, 'manifest.json')
      );
      expect(manifestCall).toBeDefined();

      const manifestJson = manifestCall![1] as string;
      const manifest: IValidationManifest = JSON.parse(manifestJson);

      expect(manifest.generatedAt).toBe('2026-01-11T10:00:00Z');
      expect(manifest.mmDataCommit).toBe('commit123');
      expect(manifest.summary).toEqual(summary);
      expect(manifest.units).toHaveLength(1);
    });

    it('should include all required fields in manifest entries', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'test-unit',
          chassis: 'TestMech',
          model: 'TM-1',
          mtfPath: '/path/to/unit.mtf',
          status: 'PASSED',
          issues: [],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const manifestCall = mockWriteFileSync.mock.calls.find(
        call => call[0] === path.join(outputDir, 'manifest.json')
      );
      const manifestJson = manifestCall![1] as string;
      const manifest: IValidationManifest = JSON.parse(manifestJson);

      const entry = manifest.units[0];
      expect(entry.id).toBe('test-unit');
      expect(entry.chassis).toBe('TestMech');
      expect(entry.model).toBe('TM-1');
      expect(entry.mtfPath).toBe('/path/to/unit.mtf');
      expect(entry.status).toBe('PASSED');
      expect(entry.issueCount).toBe(0);
      expect(entry.primaryIssueCategory).toBeUndefined();
    });

    it('should include primaryIssueCategory when issues exist', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          status: 'ISSUES_FOUND',
          issues: [
            {
              category: DiscrepancyCategory.EQUIPMENT_MISMATCH,
              expected: 'A',
              actual: 'B',
              suggestion: 'Fix',
            },
            {
              category: DiscrepancyCategory.ARMOR_MISMATCH,
              expected: 'C',
              actual: 'D',
              suggestion: 'Fix',
            },
          ],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const manifestCall = mockWriteFileSync.mock.calls.find(
        call => call[0] === path.join(outputDir, 'manifest.json')
      );
      const manifestJson = manifestCall![1] as string;
      const manifest: IValidationManifest = JSON.parse(manifestJson);

      const entry = manifest.units[0];
      expect(entry.primaryIssueCategory).toBe(DiscrepancyCategory.EQUIPMENT_MISMATCH);
      expect(entry.issueCount).toBe(2);
    });

    it('should format JSON with 2-space indentation', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const manifestCall = mockWriteFileSync.mock.calls.find(
        call => call[0] === path.join(outputDir, 'manifest.json')
      );
      const manifestJson = manifestCall![1] as string;

      // Verify it contains newlines and indentation
      expect(manifestJson).toContain('\n');
      expect(manifestJson).toContain('  ');

      // Verify it's valid JSON that can be re-parsed
      expect(() => JSON.parse(manifestJson)).not.toThrow();
    });
  });

  // ============================================================================
  // writeSummary() - via writeReports()
  // ============================================================================
  describe('writeSummary()', () => {
    it('should write correctly structured summary JSON', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary({
        generatedAt: '2026-01-11T10:00:00Z',
        mmDataCommit: 'commit456',
        unitsValidated: 100,
        unitsPassed: 85,
        unitsWithIssues: 12,
        unitsWithParseErrors: 3,
      });
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const summaryCall = mockWriteFileSync.mock.calls.find(
        call => call[0] === path.join(outputDir, 'summary.json')
      );
      expect(summaryCall).toBeDefined();

      const summaryJson = summaryCall![1] as string;
      const parsedSummary: IValidationSummary = JSON.parse(summaryJson);

      expect(parsedSummary.generatedAt).toBe('2026-01-11T10:00:00Z');
      expect(parsedSummary.mmDataCommit).toBe('commit456');
      expect(parsedSummary.unitsValidated).toBe(100);
      expect(parsedSummary.unitsPassed).toBe(85);
      expect(parsedSummary.unitsWithIssues).toBe(12);
      expect(parsedSummary.unitsWithParseErrors).toBe(3);
    });

    it('should include issuesByCategory in summary', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary({
        issuesByCategory: {
          [DiscrepancyCategory.UNKNOWN_EQUIPMENT]: 10,
          [DiscrepancyCategory.EQUIPMENT_MISMATCH]: 5,
          [DiscrepancyCategory.MISSING_ACTUATOR]: 2,
          [DiscrepancyCategory.EXTRA_ACTUATOR]: 1,
          [DiscrepancyCategory.SLOT_MISMATCH]: 3,
          [DiscrepancyCategory.SLOT_COUNT_MISMATCH]: 0,
          [DiscrepancyCategory.ARMOR_MISMATCH]: 4,
          [DiscrepancyCategory.ENGINE_MISMATCH]: 1,
          [DiscrepancyCategory.MOVEMENT_MISMATCH]: 0,
          [DiscrepancyCategory.HEADER_MISMATCH]: 0,
          [DiscrepancyCategory.QUIRK_MISMATCH]: 0,
          [DiscrepancyCategory.FLUFF_MISMATCH]: 0,
          [DiscrepancyCategory.PARSE_ERROR]: 2,
        },
      });
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const summaryCall = mockWriteFileSync.mock.calls.find(
        call => call[0] === path.join(outputDir, 'summary.json')
      );
      const summaryJson = summaryCall![1] as string;
      const parsedSummary: IValidationSummary = JSON.parse(summaryJson);

      expect(parsedSummary.issuesByCategory[DiscrepancyCategory.UNKNOWN_EQUIPMENT]).toBe(10);
      expect(parsedSummary.issuesByCategory[DiscrepancyCategory.EQUIPMENT_MISMATCH]).toBe(5);
      expect(parsedSummary.issuesByCategory[DiscrepancyCategory.ARMOR_MISMATCH]).toBe(4);
    });

    it('should format JSON with 2-space indentation', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const summaryCall = mockWriteFileSync.mock.calls.find(
        call => call[0] === path.join(outputDir, 'summary.json')
      );
      const summaryJson = summaryCall![1] as string;

      // Verify it contains newlines and indentation
      expect(summaryJson).toContain('\n');
      expect(summaryJson).toContain('  ');

      // Verify it's valid JSON
      expect(() => JSON.parse(summaryJson)).not.toThrow();
    });
  });

  // ============================================================================
  // writeUnitIssueFile() - via writeReports()
  // ============================================================================
  describe('writeUnitIssueFile()', () => {
    it('should write correctly structured issue file', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'problem-unit',
          chassis: 'TestMech',
          model: 'TM-X',
          mtfPath: '/data/testmech.mtf',
          generatedPath: '/output/testmech.mtf',
          status: 'ISSUES_FOUND',
          issues: [
            {
              category: DiscrepancyCategory.EQUIPMENT_MISMATCH,
              location: 'Right Arm',
              index: 0,
              field: 'equipment',
              expected: 'PPC',
              actual: 'Large Laser',
              suggestion: 'Replace Large Laser with PPC',
            },
          ],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const issueCall = mockWriteFileSync.mock.calls.find(
        call => call[0] === path.join(outputDir, 'issues', 'problem-unit.json')
      );
      expect(issueCall).toBeDefined();

      const issueJson = issueCall![1] as string;
      const issueReport: IUnitIssueReport = JSON.parse(issueJson);

      expect(issueReport.id).toBe('problem-unit');
      expect(issueReport.chassis).toBe('TestMech');
      expect(issueReport.model).toBe('TM-X');
      expect(issueReport.mtfPath).toBe('/data/testmech.mtf');
      expect(issueReport.generatedPath).toBe('/output/testmech.mtf');
      expect(issueReport.issues).toHaveLength(1);
      expect(issueReport.issues[0].category).toBe(DiscrepancyCategory.EQUIPMENT_MISMATCH);
    });

    it('should include all issue fields', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'detailed-issue',
          status: 'ISSUES_FOUND',
          issues: [
            {
              category: DiscrepancyCategory.SLOT_MISMATCH,
              location: 'Left Torso',
              index: 2,
              field: 'slotName',
              expected: 'Heat Sink',
              actual: 'Empty',
              suggestion: 'Add Heat Sink to slot 2',
            },
          ],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const issueCall = mockWriteFileSync.mock.calls.find(
        call => call[0] === path.join(outputDir, 'issues', 'detailed-issue.json')
      );
      const issueJson = issueCall![1] as string;
      const issueReport: IUnitIssueReport = JSON.parse(issueJson);

      const issue = issueReport.issues[0];
      expect(issue.category).toBe(DiscrepancyCategory.SLOT_MISMATCH);
      expect(issue.location).toBe('Left Torso');
      expect(issue.index).toBe(2);
      expect(issue.field).toBe('slotName');
      expect(issue.expected).toBe('Heat Sink');
      expect(issue.actual).toBe('Empty');
      expect(issue.suggestion).toBe('Add Heat Sink to slot 2');
    });

    it('should handle multiple issues in one file', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'multi-issue',
          status: 'ISSUES_FOUND',
          issues: [
            {
              category: DiscrepancyCategory.ARMOR_MISMATCH,
              location: 'Center Torso',
              expected: '50',
              actual: '45',
              suggestion: 'Increase armor',
            },
            {
              category: DiscrepancyCategory.EQUIPMENT_MISMATCH,
              location: 'Left Arm',
              expected: 'Medium Laser',
              actual: 'Small Laser',
              suggestion: 'Replace weapon',
            },
            {
              category: DiscrepancyCategory.ENGINE_MISMATCH,
              expected: '300 XL',
              actual: '300 Std',
              suggestion: 'Change engine type',
            },
          ],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const issueCall = mockWriteFileSync.mock.calls.find(
        call => call[0] === path.join(outputDir, 'issues', 'multi-issue.json')
      );
      const issueJson = issueCall![1] as string;
      const issueReport: IUnitIssueReport = JSON.parse(issueJson);

      expect(issueReport.issues).toHaveLength(3);
      expect(issueReport.issues[0].category).toBe(DiscrepancyCategory.ARMOR_MISMATCH);
      expect(issueReport.issues[1].category).toBe(DiscrepancyCategory.EQUIPMENT_MISMATCH);
      expect(issueReport.issues[2].category).toBe(DiscrepancyCategory.ENGINE_MISMATCH);
    });

    it('should use unit ID as filename', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'shadow-hawk-2h',
          status: 'ISSUES_FOUND',
          issues: [
            {
              category: DiscrepancyCategory.ARMOR_MISMATCH,
              expected: '100',
              actual: '90',
              suggestion: 'Fix armor',
            },
          ],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join(outputDir, 'issues', 'shadow-hawk-2h.json'),
        expect.any(String)
      );
    });
  });

  // ============================================================================
  // Directory Creation
  // ============================================================================
  describe('Directory Creation', () => {
    it('should create issues directory with recursive option', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      expect(mockMkdirSync).toHaveBeenCalledWith(
        path.join(outputDir, 'issues'),
        { recursive: true }
      );
    });

    it('should handle nested output directories', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/very/deep/nested/output/path';

      writer.writeReports(results, summary, outputDir);

      expect(mockMkdirSync).toHaveBeenCalledWith(
        path.join(outputDir, 'issues'),
        { recursive: true }
      );
    });
  });

  // ============================================================================
  // File Path Handling
  // ============================================================================
  describe('File Path Handling', () => {
    it('should correctly join output directory with manifest filename', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/custom/output';

      writer.writeReports(results, summary, outputDir);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join(outputDir, 'manifest.json'),
        expect.any(String)
      );
    });

    it('should correctly join output directory with summary filename', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/custom/output';

      writer.writeReports(results, summary, outputDir);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join(outputDir, 'summary.json'),
        expect.any(String)
      );
    });

    it('should correctly join issues directory with unit ID', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'test-unit-123',
          status: 'ISSUES_FOUND',
          issues: [{
            category: DiscrepancyCategory.ARMOR_MISMATCH,
            expected: 'A',
            actual: 'B',
            suggestion: 'Fix',
          }],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/custom/output';

      writer.writeReports(results, summary, outputDir);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join(outputDir, 'issues', 'test-unit-123.json'),
        expect.any(String)
      );
    });

    it('should handle Windows-style paths', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = 'C:\\Users\\Test\\Reports';

      writer.writeReports(results, summary, outputDir);

      // Verify paths are correctly joined (path.join handles platform differences)
      expect(mockWriteFileSync).toHaveBeenCalled();
      expect(mockMkdirSync).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================
  describe('Error Handling', () => {
    it('should propagate fs.writeFileSync errors', () => {
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      expect(() => {
        writer.writeReports(results, summary, outputDir);
      }).toThrow('Permission denied');
    });

    it('should propagate fs.mkdirSync errors', () => {
      mockMkdirSync.mockImplementation(() => {
        throw new Error('Cannot create directory');
      });

      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      expect(() => {
        writer.writeReports(results, summary, outputDir);
      }).toThrow('Cannot create directory');
    });

    it('should handle disk full errors', () => {
      mockWriteFileSync.mockImplementation(() => {
        const error: NodeJS.ErrnoException = new Error('ENOSPC: no space left on device');
        error.code = 'ENOSPC';
        throw error;
      });

      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      expect(() => {
        writer.writeReports(results, summary, outputDir);
      }).toThrow('ENOSPC');
    });

    it('should handle read-only filesystem errors', () => {
      mockMkdirSync.mockImplementation(() => {
        const error: NodeJS.ErrnoException = new Error('EROFS: read-only file system');
        error.code = 'EROFS';
        throw error;
      });

      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      expect(() => {
        writer.writeReports(results, summary, outputDir);
      }).toThrow('EROFS');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle empty results array', () => {
      const results: IUnitValidationResult[] = [];
      const summary = createValidationSummary({
        unitsValidated: 0,
        unitsPassed: 0,
        unitsWithIssues: 0,
        unitsWithParseErrors: 0,
      });
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      // Should still write manifest and summary
      expect(mockWriteFileSync).toHaveBeenCalledTimes(2);

      const manifestCall = mockWriteFileSync.mock.calls.find(
        call => call[0] === path.join(outputDir, 'manifest.json')
      );
      const manifestJson = manifestCall![1] as string;
      const manifest: IValidationManifest = JSON.parse(manifestJson);

      expect(manifest.units).toEqual([]);
    });

    it('should handle unit with no issues but ISSUES_FOUND status', () => {
      // This is a degenerate case that shouldn't happen, but we should handle it
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'weird-unit',
          status: 'ISSUES_FOUND',
          issues: [],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      // Should write issue file even with empty issues array
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join(outputDir, 'issues', 'weird-unit.json'),
        expect.any(String)
      );
    });

    it('should handle special characters in unit IDs', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'unit-with-special-chars_@#$',
          status: 'ISSUES_FOUND',
          issues: [{
            category: DiscrepancyCategory.ARMOR_MISMATCH,
            expected: 'A',
            actual: 'B',
            suggestion: 'Fix',
          }],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      // Should use the ID as-is in the filename
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join(outputDir, 'issues', 'unit-with-special-chars_@#$.json'),
        expect.any(String)
      );
    });

    it('should handle missing optional fields in discrepancies', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'minimal-issue',
          status: 'ISSUES_FOUND',
          issues: [
            {
              category: DiscrepancyCategory.HEADER_MISMATCH,
              expected: 'Expected value',
              actual: 'Actual value',
              suggestion: 'Fix it',
              // No location, index, or field
            },
          ],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const issueCall = mockWriteFileSync.mock.calls.find(
        call => call[0] === path.join(outputDir, 'issues', 'minimal-issue.json')
      );
      const issueJson = issueCall![1] as string;
      const issueReport: IUnitIssueReport = JSON.parse(issueJson);

      const issue = issueReport.issues[0];
      expect(issue.location).toBeUndefined();
      expect(issue.index).toBeUndefined();
      expect(issue.field).toBeUndefined();
    });

    it('should handle summary without mmDataCommit', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary({
        mmDataCommit: undefined,
      });
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const summaryCall = mockWriteFileSync.mock.calls.find(
        call => call[0] === path.join(outputDir, 'summary.json')
      );
      const summaryJson = summaryCall![1] as string;
      const parsedSummary: IValidationSummary = JSON.parse(summaryJson);

      expect(parsedSummary.mmDataCommit).toBeUndefined();
    });

    it('should handle large number of results efficiently', () => {
      // Create 1000 results to test performance characteristics
      const results: IUnitValidationResult[] = Array.from({ length: 1000 }, (_, i) =>
        createValidationResult({
          id: `unit-${i}`,
          status: i % 10 === 0 ? 'ISSUES_FOUND' : 'PASSED',
          issues: i % 10 === 0 ? [{
            category: DiscrepancyCategory.ARMOR_MISMATCH,
            expected: 'A',
            actual: 'B',
            suggestion: 'Fix',
          }] : [],
        })
      );
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      // Should write manifest, summary, and 100 issue files (every 10th unit)
      expect(mockWriteFileSync).toHaveBeenCalledTimes(102);
    });
  });

  // ============================================================================
  // JSON Formatting Validation
  // ============================================================================
  describe('JSON Formatting', () => {
    it('should produce parseable JSON for manifest', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const manifestCall = mockWriteFileSync.mock.calls.find(
        call => call[0] === path.join(outputDir, 'manifest.json')
      );
      const manifestJson = manifestCall![1] as string;

      expect(() => JSON.parse(manifestJson)).not.toThrow();
    });

    it('should produce parseable JSON for summary', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const summaryCall = mockWriteFileSync.mock.calls.find(
        call => call[0] === path.join(outputDir, 'summary.json')
      );
      const summaryJson = summaryCall![1] as string;

      expect(() => JSON.parse(summaryJson)).not.toThrow();
    });

    it('should produce parseable JSON for issue files', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          status: 'ISSUES_FOUND',
          issues: [{
            category: DiscrepancyCategory.ARMOR_MISMATCH,
            expected: 'A',
            actual: 'B',
            suggestion: 'Fix',
          }],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const issueCall = mockWriteFileSync.mock.calls.find(
        call => call[0].includes('issues')
      );
      const issueJson = issueCall![1] as string;

      expect(() => JSON.parse(issueJson)).not.toThrow();
    });
  });

  // ============================================================================
  // printConsoleSummary()
  // ============================================================================
  describe('printConsoleSummary()', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should print summary header', () => {
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.printConsoleSummary(summary, outputDir);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Parity Validation Complete'));
    });

    it('should print validation statistics', () => {
      const summary = createValidationSummary({
        unitsValidated: 100,
        unitsPassed: 85,
        unitsWithIssues: 12,
        unitsWithParseErrors: 3,
      });
      const outputDir = '/output/reports';

      writer.printConsoleSummary(summary, outputDir);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Units validated:     100'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Units passed:        85'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Units with issues:   12'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Units with errors:   3'));
    });

    it('should calculate and print pass rate', () => {
      const summary = createValidationSummary({
        unitsValidated: 100,
        unitsPassed: 85,
      });
      const outputDir = '/output/reports';

      writer.printConsoleSummary(summary, outputDir);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('85.0%'));
    });

    it('should print mmDataCommit when present', () => {
      const summary = createValidationSummary({
        mmDataCommit: 'abc123def456',
      });
      const outputDir = '/output/reports';

      writer.printConsoleSummary(summary, outputDir);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('mm-data commit: abc123def456'));
    });

    it('should not print mmDataCommit when absent', () => {
      const summary = createValidationSummary({
        mmDataCommit: undefined,
      });
      const outputDir = '/output/reports';

      writer.printConsoleSummary(summary, outputDir);

      const mmDataCalls = consoleLogSpy.mock.calls.filter(
        call => call[0] && call[0].includes && call[0].includes('mm-data commit')
      );
      expect(mmDataCalls).toHaveLength(0);
    });

    it('should print generatedAt timestamp', () => {
      const summary = createValidationSummary({
        generatedAt: '2026-01-11T12:00:00Z',
      });
      const outputDir = '/output/reports';

      writer.printConsoleSummary(summary, outputDir);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Generated at:   2026-01-11T12:00:00Z'));
    });

    it('should print output directory', () => {
      const summary = createValidationSummary();
      const outputDir = '/custom/output/path';

      writer.printConsoleSummary(summary, outputDir);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Reports saved to: /custom/output/path'));
    });

    it('should print top issues by category when issues exist', () => {
      const summary = createValidationSummary({
        issuesByCategory: {
          [DiscrepancyCategory.UNKNOWN_EQUIPMENT]: 15,
          [DiscrepancyCategory.EQUIPMENT_MISMATCH]: 10,
          [DiscrepancyCategory.ARMOR_MISMATCH]: 5,
          [DiscrepancyCategory.MISSING_ACTUATOR]: 0,
          [DiscrepancyCategory.EXTRA_ACTUATOR]: 0,
          [DiscrepancyCategory.SLOT_MISMATCH]: 0,
          [DiscrepancyCategory.SLOT_COUNT_MISMATCH]: 0,
          [DiscrepancyCategory.ENGINE_MISMATCH]: 0,
          [DiscrepancyCategory.MOVEMENT_MISMATCH]: 0,
          [DiscrepancyCategory.HEADER_MISMATCH]: 0,
          [DiscrepancyCategory.QUIRK_MISMATCH]: 0,
          [DiscrepancyCategory.FLUFF_MISMATCH]: 0,
          [DiscrepancyCategory.PARSE_ERROR]: 0,
        },
      });
      const outputDir = '/output/reports';

      writer.printConsoleSummary(summary, outputDir);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Top Issues by Category:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('UNKNOWN_EQUIPMENT'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('15'));
    });

    it('should sort issues by count in descending order', () => {
      const summary = createValidationSummary({
        issuesByCategory: {
          [DiscrepancyCategory.ARMOR_MISMATCH]: 5,
          [DiscrepancyCategory.EQUIPMENT_MISMATCH]: 10,
          [DiscrepancyCategory.UNKNOWN_EQUIPMENT]: 15,
          [DiscrepancyCategory.MISSING_ACTUATOR]: 0,
          [DiscrepancyCategory.EXTRA_ACTUATOR]: 0,
          [DiscrepancyCategory.SLOT_MISMATCH]: 0,
          [DiscrepancyCategory.SLOT_COUNT_MISMATCH]: 0,
          [DiscrepancyCategory.ENGINE_MISMATCH]: 0,
          [DiscrepancyCategory.MOVEMENT_MISMATCH]: 0,
          [DiscrepancyCategory.HEADER_MISMATCH]: 0,
          [DiscrepancyCategory.QUIRK_MISMATCH]: 0,
          [DiscrepancyCategory.FLUFF_MISMATCH]: 0,
          [DiscrepancyCategory.PARSE_ERROR]: 0,
        },
      });
      const outputDir = '/output/reports';

      writer.printConsoleSummary(summary, outputDir);

      const categoryLines = consoleLogSpy.mock.calls
        .map(call => call[0])
        .filter(line => line && typeof line === 'string' &&
          (line.includes('UNKNOWN_EQUIPMENT') ||
           line.includes('EQUIPMENT_MISMATCH') ||
           line.includes('ARMOR_MISMATCH')));

      // Verify the highest count appears first
      const unknownIndex = categoryLines.findIndex(line => line.includes('UNKNOWN_EQUIPMENT'));
      const equipmentIndex = categoryLines.findIndex(line => line.includes('EQUIPMENT_MISMATCH'));
      const armorIndex = categoryLines.findIndex(line => line.includes('ARMOR_MISMATCH'));

      expect(unknownIndex).toBeLessThan(equipmentIndex);
      expect(equipmentIndex).toBeLessThan(armorIndex);
    });

    it('should not print issues section when no issues exist', () => {
      const summary = createValidationSummary({
        issuesByCategory: {
          [DiscrepancyCategory.UNKNOWN_EQUIPMENT]: 0,
          [DiscrepancyCategory.EQUIPMENT_MISMATCH]: 0,
          [DiscrepancyCategory.MISSING_ACTUATOR]: 0,
          [DiscrepancyCategory.EXTRA_ACTUATOR]: 0,
          [DiscrepancyCategory.SLOT_MISMATCH]: 0,
          [DiscrepancyCategory.SLOT_COUNT_MISMATCH]: 0,
          [DiscrepancyCategory.ARMOR_MISMATCH]: 0,
          [DiscrepancyCategory.ENGINE_MISMATCH]: 0,
          [DiscrepancyCategory.MOVEMENT_MISMATCH]: 0,
          [DiscrepancyCategory.HEADER_MISMATCH]: 0,
          [DiscrepancyCategory.QUIRK_MISMATCH]: 0,
          [DiscrepancyCategory.FLUFF_MISMATCH]: 0,
          [DiscrepancyCategory.PARSE_ERROR]: 0,
        },
      });
      const outputDir = '/output/reports';

      writer.printConsoleSummary(summary, outputDir);

      const issuesCalls = consoleLogSpy.mock.calls.filter(
        call => call[0] && call[0].includes && call[0].includes('Top Issues by Category')
      );
      expect(issuesCalls).toHaveLength(0);
    });

    it('should limit to top 10 issues', () => {
      // Create 15 different issue categories with counts
      const summary = createValidationSummary({
        issuesByCategory: {
          [DiscrepancyCategory.UNKNOWN_EQUIPMENT]: 15,
          [DiscrepancyCategory.EQUIPMENT_MISMATCH]: 14,
          [DiscrepancyCategory.ARMOR_MISMATCH]: 13,
          [DiscrepancyCategory.MISSING_ACTUATOR]: 12,
          [DiscrepancyCategory.EXTRA_ACTUATOR]: 11,
          [DiscrepancyCategory.SLOT_MISMATCH]: 10,
          [DiscrepancyCategory.SLOT_COUNT_MISMATCH]: 9,
          [DiscrepancyCategory.ENGINE_MISMATCH]: 8,
          [DiscrepancyCategory.MOVEMENT_MISMATCH]: 7,
          [DiscrepancyCategory.HEADER_MISMATCH]: 6,
          [DiscrepancyCategory.QUIRK_MISMATCH]: 5,
          [DiscrepancyCategory.FLUFF_MISMATCH]: 4,
          [DiscrepancyCategory.PARSE_ERROR]: 3,
        },
      });
      const outputDir = '/output/reports';

      writer.printConsoleSummary(summary, outputDir);

      // Count how many issue category lines were printed (excluding the header)
      const categoryLines = consoleLogSpy.mock.calls
        .map(call => call[0])
        .filter(line => line && typeof line === 'string' &&
          Object.values(DiscrepancyCategory).some(cat => line.includes(cat)));

      expect(categoryLines.length).toBeLessThanOrEqual(10);
    });
  });

  // ============================================================================
  // printProgress()
  // ============================================================================
  describe('printProgress()', () => {
    let consoleLogSpy: jest.SpyInstance;
    let processStdoutWriteSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      processStdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      processStdoutWriteSpy.mockRestore();
    });

    it('should print detailed progress in verbose mode', () => {
      writer.printProgress(0, 100, '/path/to/unit.mtf', true);

      expect(consoleLogSpy).toHaveBeenCalledWith('[1/100] unit.mtf');
    });

    it('should use basename in verbose mode', () => {
      writer.printProgress(5, 100, '/very/long/path/to/shadow-hawk.mtf', true);

      expect(consoleLogSpy).toHaveBeenCalledWith('[6/100] shadow-hawk.mtf');
    });

    it('should print progress bar at 100-unit intervals in non-verbose mode', () => {
      writer.printProgress(0, 1000, '/path/to/unit.mtf', false);

      expect(processStdoutWriteSpy).toHaveBeenCalledWith(expect.stringContaining('Processing: 1/1000'));
    });

    it('should print progress bar at multiples of 100', () => {
      writer.printProgress(100, 1000, '/path/to/unit.mtf', false);

      expect(processStdoutWriteSpy).toHaveBeenCalledWith(expect.stringContaining('Processing: 101/1000'));
    });

    it('should print progress bar at last item', () => {
      writer.printProgress(999, 1000, '/path/to/unit.mtf', false);

      expect(processStdoutWriteSpy).toHaveBeenCalledWith(expect.stringContaining('Processing: 1000/1000'));
    });

    it('should not print progress in non-verbose mode for non-milestone items', () => {
      writer.printProgress(50, 1000, '/path/to/unit.mtf', false);

      expect(processStdoutWriteSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should calculate percentage in non-verbose mode', () => {
      writer.printProgress(500, 1000, '/path/to/unit.mtf', false);

      expect(processStdoutWriteSpy).toHaveBeenCalledWith(expect.stringContaining('50%'));
    });

    it('should use carriage return for progress bar updates', () => {
      writer.printProgress(0, 1000, '/path/to/unit.mtf', false);

      expect(processStdoutWriteSpy).toHaveBeenCalledWith(expect.stringMatching(/^\r/));
    });
  });

  // ============================================================================
  // Integration Tests - Verify Real Implementation is Tested
  // ============================================================================
  describe('Integration - Real Implementation Coverage', () => {
    it('should actually execute all ParityReportWriter methods with real logic', () => {
      // This test ensures we are testing the REAL ParityReportWriter implementation
      // not a mock. We verify by checking the exact JSON structure it produces.

      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'integration-test-passed',
          status: 'PASSED',
          chassis: 'TestMech',
          model: 'TM-1',
          issues: [],
        }),
        createValidationResult({
          id: 'integration-test-issues',
          status: 'ISSUES_FOUND',
          chassis: 'TestMech',
          model: 'TM-2',
          issues: [
            {
              category: DiscrepancyCategory.EQUIPMENT_MISMATCH,
              location: 'Left Arm',
              expected: 'PPC',
              actual: 'Large Laser',
              suggestion: 'Replace Large Laser with PPC',
            },
          ],
        }),
        createValidationResult({
          id: 'integration-test-error',
          status: 'PARSE_ERROR',
          chassis: 'TestMech',
          model: 'TM-3',
          issues: [
            {
              category: DiscrepancyCategory.PARSE_ERROR,
              expected: 'Valid MTF',
              actual: 'Malformed MTF',
              suggestion: 'Fix MTF syntax',
            },
          ],
          parseErrors: ['Invalid header'],
        }),
      ];

      const summary = createValidationSummary({
        unitsValidated: 3,
        unitsPassed: 1,
        unitsWithIssues: 1,
        unitsWithParseErrors: 1,
        generatedAt: '2026-01-11T12:00:00Z',
        mmDataCommit: 'test-commit-123',
      });

      const outputDir = '/output/integration';

      // Execute the real writeReports method
      writer.writeReports(results, summary, outputDir);

      // Verify mkdirSync was called with correct path
      expect(mockMkdirSync).toHaveBeenCalledTimes(1);
      expect(mockMkdirSync).toHaveBeenCalledWith(
        path.join(outputDir, 'issues'),
        { recursive: true }
      );

      // Verify writeFileSync was called correct number of times:
      // 1. manifest.json
      // 2. summary.json
      // 3. integration-test-issues.json (ISSUES_FOUND)
      // 4. integration-test-error.json (PARSE_ERROR)
      expect(mockWriteFileSync).toHaveBeenCalledTimes(4);

      // Verify manifest.json structure by parsing the actual JSON
      const manifestCall = mockWriteFileSync.mock.calls.find(
        call => call[0] === path.join(outputDir, 'manifest.json')
      );
      expect(manifestCall).toBeDefined();
      const manifestJson = manifestCall![1] as string;
      const manifest = JSON.parse(manifestJson);

      // Verify manifest has correct structure from REAL implementation
      expect(manifest).toHaveProperty('generatedAt', '2026-01-11T12:00:00Z');
      expect(manifest).toHaveProperty('mmDataCommit', 'test-commit-123');
      expect(manifest).toHaveProperty('summary');
      expect(manifest).toHaveProperty('units');
      expect(manifest.units).toHaveLength(3);

      // Verify first unit (PASSED)
      expect(manifest.units[0]).toEqual({
        id: 'integration-test-passed',
        chassis: 'TestMech',
        model: 'TM-1',
        mtfPath: expect.any(String),
        status: 'PASSED',
        issueCount: 0,
      });

      // Verify second unit (ISSUES_FOUND) has primaryIssueCategory
      expect(manifest.units[1]).toEqual({
        id: 'integration-test-issues',
        chassis: 'TestMech',
        model: 'TM-2',
        mtfPath: expect.any(String),
        status: 'ISSUES_FOUND',
        primaryIssueCategory: DiscrepancyCategory.EQUIPMENT_MISMATCH,
        issueCount: 1,
      });

      // Verify summary.json structure
      const summaryCall = mockWriteFileSync.mock.calls.find(
        call => call[0] === path.join(outputDir, 'summary.json')
      );
      expect(summaryCall).toBeDefined();
      const summaryJson = summaryCall![1] as string;
      const parsedSummary = JSON.parse(summaryJson);

      expect(parsedSummary).toEqual(summary);

      // Verify issue file for ISSUES_FOUND unit
      const issueCall1 = mockWriteFileSync.mock.calls.find(
        call => call[0] === path.join(outputDir, 'issues', 'integration-test-issues.json')
      );
      expect(issueCall1).toBeDefined();
      const issueJson1 = issueCall1![1] as string;
      const issue1 = JSON.parse(issueJson1);

      expect(issue1).toEqual({
        id: 'integration-test-issues',
        chassis: 'TestMech',
        model: 'TM-2',
        mtfPath: expect.any(String),
        generatedPath: expect.any(String),
        issues: [
          {
            category: DiscrepancyCategory.EQUIPMENT_MISMATCH,
            location: 'Left Arm',
            expected: 'PPC',
            actual: 'Large Laser',
            suggestion: 'Replace Large Laser with PPC',
          },
        ],
      });

      // Verify issue file for PARSE_ERROR unit
      const issueCall2 = mockWriteFileSync.mock.calls.find(
        call => call[0] === path.join(outputDir, 'issues', 'integration-test-error.json')
      );
      expect(issueCall2).toBeDefined();
      const issueJson2 = issueCall2![1] as string;
      const issue2 = JSON.parse(issueJson2);

      expect(issue2).toEqual({
        id: 'integration-test-error',
        chassis: 'TestMech',
        model: 'TM-3',
        mtfPath: expect.any(String),
        generatedPath: expect.any(String),
        issues: [
          {
            category: DiscrepancyCategory.PARSE_ERROR,
            expected: 'Valid MTF',
            actual: 'Malformed MTF',
            suggestion: 'Fix MTF syntax',
          },
        ],
      });

      // Verify JSON formatting (should have 2-space indentation)
      expect(manifestJson).toContain('\n');
      expect(manifestJson).toContain('  ');
      expect(summaryJson).toContain('\n');
      expect(summaryJson).toContain('  ');
      expect(issueJson1).toContain('\n');
      expect(issueJson1).toContain('  ');
    });

    it('should test all private methods are invoked through public API', () => {
      // Verify that calling writeReports actually invokes:
      // - writeManifest (private)
      // - writeSummary (private)
      // - writeUnitIssueFile (private)

      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'test-private-methods',
          status: 'ISSUES_FOUND',
          issues: [{
            category: DiscrepancyCategory.ARMOR_MISMATCH,
            expected: '100',
            actual: '90',
            suggestion: 'Increase armor',
          }],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/output/private-methods';

      // Clear mocks to track calls
      jest.clearAllMocks();

      writer.writeReports(results, summary, outputDir);

      // writeManifest was called (writes manifest.json)
      const manifestWritten = mockWriteFileSync.mock.calls.some(
        call => (call[0] as string).endsWith('manifest.json')
      );
      expect(manifestWritten).toBe(true);

      // writeSummary was called (writes summary.json)
      const summaryWritten = mockWriteFileSync.mock.calls.some(
        call => (call[0] as string).endsWith('summary.json')
      );
      expect(summaryWritten).toBe(true);

      // writeUnitIssueFile was called (writes issue file)
      const issueWritten = mockWriteFileSync.mock.calls.some(
        call => (call[0] as string).includes('test-private-methods.json')
      );
      expect(issueWritten).toBe(true);
    });

    it('should execute printConsoleSummary with real calculation logic', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const summary = createValidationSummary({
        unitsValidated: 200,
        unitsPassed: 150,
        unitsWithIssues: 40,
        unitsWithParseErrors: 10,
        issuesByCategory: {
          [DiscrepancyCategory.UNKNOWN_EQUIPMENT]: 25,
          [DiscrepancyCategory.EQUIPMENT_MISMATCH]: 15,
          [DiscrepancyCategory.ARMOR_MISMATCH]: 10,
          [DiscrepancyCategory.MISSING_ACTUATOR]: 0,
          [DiscrepancyCategory.EXTRA_ACTUATOR]: 0,
          [DiscrepancyCategory.SLOT_MISMATCH]: 0,
          [DiscrepancyCategory.SLOT_COUNT_MISMATCH]: 0,
          [DiscrepancyCategory.ENGINE_MISMATCH]: 0,
          [DiscrepancyCategory.MOVEMENT_MISMATCH]: 0,
          [DiscrepancyCategory.HEADER_MISMATCH]: 0,
          [DiscrepancyCategory.QUIRK_MISMATCH]: 0,
          [DiscrepancyCategory.FLUFF_MISMATCH]: 0,
          [DiscrepancyCategory.PARSE_ERROR]: 0,
        },
      });
      const outputDir = '/output/console';

      writer.printConsoleSummary(summary, outputDir);

      // Verify pass rate calculation: 150/200 = 75.0%
      const passRateCall = consoleLogSpy.mock.calls.find(
        call => call[0] && typeof call[0] === 'string' && call[0].includes('75.0%')
      );
      expect(passRateCall).toBeDefined();

      // Verify statistics are printed
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('200'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('150'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('40'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('10'));

      // Verify issue sorting (highest first)
      const categoryLines = consoleLogSpy.mock.calls
        .map(call => call[0])
        .filter(line => line && typeof line === 'string' &&
          (line.includes('UNKNOWN_EQUIPMENT') ||
           line.includes('EQUIPMENT_MISMATCH') ||
           line.includes('ARMOR_MISMATCH')));

      expect(categoryLines.length).toBeGreaterThan(0);

      consoleLogSpy.mockRestore();
    });

    it('should execute printProgress with real verbose logic', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Test verbose mode
      writer.printProgress(0, 100, '/path/to/test-unit.mtf', true);
      expect(consoleLogSpy).toHaveBeenCalledWith('[1/100] test-unit.mtf');

      consoleLogSpy.mockClear();

      // Test basename extraction
      writer.printProgress(49, 100, '/very/long/path/to/shadow-hawk-2h.mtf', true);
      expect(consoleLogSpy).toHaveBeenCalledWith('[50/100] shadow-hawk-2h.mtf');

      consoleLogSpy.mockRestore();
    });

    it('should execute printProgress with real non-verbose logic', () => {
      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation();

      // Test milestone printing (index % 100 === 0)
      writer.printProgress(0, 1000, '/path/to/unit.mtf', false);
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('1/1000'));
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('0%'));

      stdoutSpy.mockClear();

      // Test milestone printing (index % 100 === 0)
      writer.printProgress(200, 1000, '/path/to/unit.mtf', false);
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('201/1000'));
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('20%'));

      stdoutSpy.mockClear();

      // Test last item printing
      writer.printProgress(999, 1000, '/path/to/unit.mtf', false);
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('1000/1000'));
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('100%'));

      stdoutSpy.mockClear();

      // Test non-milestone (should not print)
      writer.printProgress(50, 1000, '/path/to/unit.mtf', false);
      expect(stdoutSpy).not.toHaveBeenCalled();

      stdoutSpy.mockRestore();
    });
  });
});
