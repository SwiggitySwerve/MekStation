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

  describe('writeReports()', () => {
    it('should create issues directory', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      expect(mockMkdirSync).toHaveBeenCalledWith(
        path.join(outputDir, 'issues'),
        { recursive: true },
      );
    });

    it('should write manifest.json', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join(outputDir, 'manifest.json'),
        expect.any(String),
      );
    });

    it('should write summary.json', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join(outputDir, 'summary.json'),
        expect.any(String),
      );
    });

    it('should write issue files for units with issues', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'unit-with-issues',
          status: 'ISSUES_FOUND',
          issues: [
            {
              category: DiscrepancyCategory.EquipmentMismatch,
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
        expect.any(String),
      );
    });

    it('should write issue files for units with parse errors', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'unit-with-errors',
          status: 'PARSE_ERROR',
          issues: [
            {
              category: DiscrepancyCategory.ParseError,
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
        expect.any(String),
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
        createValidationResult({
          id: 'unit-2',
          status: 'ISSUES_FOUND',
          issues: [
            {
              category: DiscrepancyCategory.ArmorMismatch,
              expected: '100',
              actual: '90',
              suggestion: 'Increase armor to 100',
            },
          ],
        }),
        createValidationResult({ id: 'unit-3', status: 'PASSED' }),
        createValidationResult({
          id: 'unit-4',
          status: 'PARSE_ERROR',
          issues: [
            {
              category: DiscrepancyCategory.ParseError,
              expected: 'Valid',
              actual: 'Invalid',
              suggestion: 'Fix',
            },
          ],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      // Should write: manifest, summary, 2 issue files
      expect(mockWriteFileSync).toHaveBeenCalledTimes(4);
    });
  });
});
