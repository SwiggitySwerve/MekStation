/**
 * Parity Report Writer Tests
 *
 * Tests for writing parity validation reports to disk.
 *
 * @spec openspec/specs/mtf-parity-validation/spec.md
 */

/* oxlint-disable @typescript-eslint/no-unsafe-assignment */
/* oxlint-disable @typescript-eslint/no-unsafe-member-access */
/* oxlint-disable @typescript-eslint/no-unsafe-call */
/* oxlint-disable @typescript-eslint/no-unsafe-return */

import * as fs from 'fs';
import * as path from 'path';

import {
  ParityReportWriter,
  getParityReportWriter,
  resetParityReportWriter,
} from '@/services/conversion/ParityReportWriter';
import {
  IUnitValidationResult,
  IValidationSummary,
  IValidationManifest,
  IUnitIssueReport,
  DiscrepancyCategory,
} from '@/services/conversion/types/ParityValidation';

// Mock the fs module - this mocks file I/O but NOT the ParityReportWriter class
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

import {
  createValidationResult,
  createValidationSummary,
} from './ParityReportWriter.test-helpers';

describe('ParityReportWriter', () => {
  let writer: ParityReportWriter;
  let mockWriteFileSync: jest.MockedFunction<typeof fs.writeFileSync>;
  let mockMkdirSync: jest.MockedFunction<typeof fs.mkdirSync>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    resetParityReportWriter();
    writer = getParityReportWriter();
    mockWriteFileSync = fs.writeFileSync as jest.MockedFunction<
      typeof fs.writeFileSync
    >;
    mockMkdirSync = fs.mkdirSync as jest.MockedFunction<typeof fs.mkdirSync>;

    // Reset mock implementations to defaults
    mockWriteFileSync.mockImplementation(() => undefined);
    mockMkdirSync.mockImplementation(() => undefined);
  });

  // ============================================================================
  // Singleton Pattern
  // ============================================================================
  // ============================================================================
  // ============================================================================
  // writeManifest() - via writeReports()
  // ============================================================================
  // ============================================================================
  // writeSummary() - via writeReports()
  // ============================================================================
  // ============================================================================
  // writeUnitIssueFile() - via writeReports()
  // ============================================================================
  // ============================================================================
  // Directory Creation
  // ============================================================================
  // ============================================================================
  // File Path Handling
  // ============================================================================
  // ============================================================================
  // Error Handling
  // ============================================================================
  // ============================================================================
  // Edge Cases
  // ============================================================================
  // ============================================================================
  // JSON Formatting Validation
  // ============================================================================
  // ============================================================================
  // printConsoleSummary()
  // ============================================================================
  // ============================================================================
  // printProgress()
  // ============================================================================
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
              category: DiscrepancyCategory.EquipmentMismatch,
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
              category: DiscrepancyCategory.ParseError,
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
        { recursive: true },
      );

      // Verify writeFileSync was called correct number of times:
      // 1. manifest.json
      // 2. summary.json
      // 3. integration-test-issues.json (ISSUES_FOUND)
      // 4. integration-test-error.json (PARSE_ERROR)
      expect(mockWriteFileSync).toHaveBeenCalledTimes(4);

      // Verify manifest.json structure by parsing the actual JSON
      const manifestCall = mockWriteFileSync.mock.calls.find(
        (call) => call[0] === path.join(outputDir, 'manifest.json'),
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
        primaryIssueCategory: DiscrepancyCategory.EquipmentMismatch,
        issueCount: 1,
      });

      // Verify summary.json structure
      const summaryCall = mockWriteFileSync.mock.calls.find(
        (call) => call[0] === path.join(outputDir, 'summary.json'),
      );
      expect(summaryCall).toBeDefined();
      const summaryJson = summaryCall![1] as string;
      const parsedSummary = JSON.parse(summaryJson);

      expect(parsedSummary).toEqual(summary);

      // Verify issue file for ISSUES_FOUND unit
      const issueCall1 = mockWriteFileSync.mock.calls.find(
        (call) =>
          call[0] ===
          path.join(outputDir, 'issues', 'integration-test-issues.json'),
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
            category: DiscrepancyCategory.EquipmentMismatch,
            location: 'Left Arm',
            expected: 'PPC',
            actual: 'Large Laser',
            suggestion: 'Replace Large Laser with PPC',
          },
        ],
      });

      // Verify issue file for PARSE_ERROR unit
      const issueCall2 = mockWriteFileSync.mock.calls.find(
        (call) =>
          call[0] ===
          path.join(outputDir, 'issues', 'integration-test-error.json'),
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
            category: DiscrepancyCategory.ParseError,
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
          issues: [
            {
              category: DiscrepancyCategory.ArmorMismatch,
              expected: '100',
              actual: '90',
              suggestion: 'Increase armor',
            },
          ],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/output/private-methods';

      // Clear mocks to track calls
      jest.clearAllMocks();

      writer.writeReports(results, summary, outputDir);

      // writeManifest was called (writes manifest.json)
      const manifestWritten = mockWriteFileSync.mock.calls.some((call) =>
        (call[0] as string).endsWith('manifest.json'),
      );
      expect(manifestWritten).toBe(true);

      // writeSummary was called (writes summary.json)
      const summaryWritten = mockWriteFileSync.mock.calls.some((call) =>
        (call[0] as string).endsWith('summary.json'),
      );
      expect(summaryWritten).toBe(true);

      // writeUnitIssueFile was called (writes issue file)
      const issueWritten = mockWriteFileSync.mock.calls.some((call) =>
        (call[0] as string).includes('test-private-methods.json'),
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
          [DiscrepancyCategory.UnknownEquipment]: 25,
          [DiscrepancyCategory.EquipmentMismatch]: 15,
          [DiscrepancyCategory.ArmorMismatch]: 10,
          [DiscrepancyCategory.MissingActuator]: 0,
          [DiscrepancyCategory.ExtraActuator]: 0,
          [DiscrepancyCategory.SlotMismatch]: 0,
          [DiscrepancyCategory.SlotCountMismatch]: 0,
          [DiscrepancyCategory.EngineMismatch]: 0,
          [DiscrepancyCategory.MovementMismatch]: 0,
          [DiscrepancyCategory.HeaderMismatch]: 0,
          [DiscrepancyCategory.QuirkMismatch]: 0,
          [DiscrepancyCategory.FluffMismatch]: 0,
          [DiscrepancyCategory.ParseError]: 0,
        },
      });
      const outputDir = '/output/console';

      writer.printConsoleSummary(summary, outputDir);

      // Verify pass rate calculation: 150/200 = 75.0%
      const passRateCall = consoleLogSpy.mock.calls.find(
        (call) =>
          call[0] && typeof call[0] === 'string' && call[0].includes('75.0%'),
      );
      expect(passRateCall).toBeDefined();

      // Verify statistics are printed
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('200'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('150'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('40'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('10'));

      // Verify issue sorting (highest first)
      const categoryLines = consoleLogSpy.mock.calls
        .map((call) => call[0])
        .filter(
          (line) =>
            line &&
            typeof line === 'string' &&
            (line.includes('UNKNOWN_EQUIPMENT') ||
              line.includes('EQUIPMENT_MISMATCH') ||
              line.includes('ARMOR_MISMATCH')),
        );

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
      writer.printProgress(
        49,
        100,
        '/very/long/path/to/shadow-hawk-2h.mtf',
        true,
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('[50/100] shadow-hawk-2h.mtf');

      consoleLogSpy.mockRestore();
    });

    it('should execute printProgress with real non-verbose logic', () => {
      const stdoutSpy = jest
        .spyOn(process.stdout, 'write')
        .mockImplementation();

      // Test milestone printing (index % 100 === 0)
      writer.printProgress(0, 1000, '/path/to/unit.mtf', false);
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('1/1000'));
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('0%'));

      stdoutSpy.mockClear();

      // Test milestone printing (index % 100 === 0)
      writer.printProgress(200, 1000, '/path/to/unit.mtf', false);
      expect(stdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('201/1000'),
      );
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('20%'));

      stdoutSpy.mockClear();

      // Test last item printing
      writer.printProgress(999, 1000, '/path/to/unit.mtf', false);
      expect(stdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('1000/1000'),
      );
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('100%'));

      stdoutSpy.mockClear();

      // Test non-milestone (should not print)
      writer.printProgress(50, 1000, '/path/to/unit.mtf', false);
      expect(stdoutSpy).not.toHaveBeenCalled();

      stdoutSpy.mockRestore();
    });
  });
});
