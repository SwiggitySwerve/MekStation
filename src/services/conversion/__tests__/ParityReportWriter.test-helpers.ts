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

// Test Data Factories
// ============================================================================
export const createValidationResult = (
  overrides?: Partial<IUnitValidationResult>,
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

export const createValidationSummary = (
  overrides?: Partial<IValidationSummary>,
): IValidationSummary => ({
  generatedAt: '2026-01-11T12:00:00Z',
  mmDataCommit: 'abc123def456',
  unitsValidated: 10,
  unitsPassed: 7,
  unitsWithIssues: 2,
  unitsWithParseErrors: 1,
  issuesByCategory: {
    [DiscrepancyCategory.UnknownEquipment]: 5,
    [DiscrepancyCategory.EquipmentMismatch]: 3,
    [DiscrepancyCategory.MissingActuator]: 0,
    [DiscrepancyCategory.ExtraActuator]: 0,
    [DiscrepancyCategory.SlotMismatch]: 2,
    [DiscrepancyCategory.SlotCountMismatch]: 1,
    [DiscrepancyCategory.ArmorMismatch]: 0,
    [DiscrepancyCategory.EngineMismatch]: 0,
    [DiscrepancyCategory.MovementMismatch]: 0,
    [DiscrepancyCategory.HeaderMismatch]: 0,
    [DiscrepancyCategory.QuirkMismatch]: 0,
    [DiscrepancyCategory.FluffMismatch]: 0,
    [DiscrepancyCategory.ParseError]: 1,
  },
  ...overrides,
});

// ============================================================================
// writeReports()
// ============================================================================
