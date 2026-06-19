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
        (call) => call[0] === path.join(outputDir, 'manifest.json'),
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
        expect.any(String),
      );
    });

    it('should handle special characters in unit IDs', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'unit-with-special-chars_@#$',
          status: 'ISSUES_FOUND',
          issues: [
            {
              category: DiscrepancyCategory.ArmorMismatch,
              expected: 'A',
              actual: 'B',
              suggestion: 'Fix',
            },
          ],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      // Should use the ID as-is in the filename
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join(outputDir, 'issues', 'unit-with-special-chars_@#$.json'),
        expect.any(String),
      );
    });

    it('should handle missing optional fields in discrepancies', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'minimal-issue',
          status: 'ISSUES_FOUND',
          issues: [
            {
              category: DiscrepancyCategory.HeaderMismatch,
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
        (call) =>
          call[0] === path.join(outputDir, 'issues', 'minimal-issue.json'),
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
        (call) => call[0] === path.join(outputDir, 'summary.json'),
      );
      const summaryJson = summaryCall![1] as string;
      const parsedSummary: IValidationSummary = JSON.parse(summaryJson);

      expect(parsedSummary.mmDataCommit).toBeUndefined();
    });

    it('should handle large number of results efficiently', () => {
      // Create 1000 results to test performance characteristics
      const results: IUnitValidationResult[] = Array.from(
        { length: 1000 },
        (_, i) =>
          createValidationResult({
            id: `unit-${i}`,
            status: i % 10 === 0 ? 'ISSUES_FOUND' : 'PASSED',
            issues:
              i % 10 === 0
                ? [
                    {
                      category: DiscrepancyCategory.ArmorMismatch,
                      expected: 'A',
                      actual: 'B',
                      suggestion: 'Fix',
                    },
                  ]
                : [],
          }),
      );
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      // Should write manifest, summary, and 100 issue files (every 10th unit)
      expect(mockWriteFileSync).toHaveBeenCalledTimes(102);
    });
  });
});
