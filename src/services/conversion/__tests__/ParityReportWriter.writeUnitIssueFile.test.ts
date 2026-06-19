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
              category: DiscrepancyCategory.EquipmentMismatch,
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
        (call) =>
          call[0] === path.join(outputDir, 'issues', 'problem-unit.json'),
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
      expect(issueReport.issues[0].category).toBe(
        DiscrepancyCategory.EquipmentMismatch,
      );
    });

    it('should include all issue fields', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'detailed-issue',
          status: 'ISSUES_FOUND',
          issues: [
            {
              category: DiscrepancyCategory.SlotMismatch,
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
        (call) =>
          call[0] === path.join(outputDir, 'issues', 'detailed-issue.json'),
      );
      const issueJson = issueCall![1] as string;
      const issueReport: IUnitIssueReport = JSON.parse(issueJson);

      const issue = issueReport.issues[0];
      expect(issue.category).toBe(DiscrepancyCategory.SlotMismatch);
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
              category: DiscrepancyCategory.ArmorMismatch,
              location: 'Center Torso',
              expected: '50',
              actual: '45',
              suggestion: 'Increase armor',
            },
            {
              category: DiscrepancyCategory.EquipmentMismatch,
              location: 'Left Arm',
              expected: 'Medium Laser',
              actual: 'Small Laser',
              suggestion: 'Replace weapon',
            },
            {
              category: DiscrepancyCategory.EngineMismatch,
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
        (call) =>
          call[0] === path.join(outputDir, 'issues', 'multi-issue.json'),
      );
      const issueJson = issueCall![1] as string;
      const issueReport: IUnitIssueReport = JSON.parse(issueJson);

      expect(issueReport.issues).toHaveLength(3);
      expect(issueReport.issues[0].category).toBe(
        DiscrepancyCategory.ArmorMismatch,
      );
      expect(issueReport.issues[1].category).toBe(
        DiscrepancyCategory.EquipmentMismatch,
      );
      expect(issueReport.issues[2].category).toBe(
        DiscrepancyCategory.EngineMismatch,
      );
    });

    it('should use unit ID as filename', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'shadow-hawk-2h',
          status: 'ISSUES_FOUND',
          issues: [
            {
              category: DiscrepancyCategory.ArmorMismatch,
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
        expect.any(String),
      );
    });
  });
});
