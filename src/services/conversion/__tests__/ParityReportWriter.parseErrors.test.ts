/** @spec openspec/changes/establish-all-unit-data-parity/specs/mtf-parity-validation/spec.md */
import * as fs from 'fs';
import * as path from 'path';

import type { ISerializedUnit } from '@/types/unit/UnitSerialization';

import mixedCatalogUnit from '../../../../public/data/units/battlemechs/3-succession-wars/advanced/Shadow Hawk C.json';
import { BlkExportService } from '../BlkExportService';
import { MTFExportService } from '../MTFExportService';
import { ParityReportWriter } from '../ParityReportWriter';
import {
  DiscrepancyCategory,
  type IUnitValidationResult,
  type IValidationSummary,
} from '../types/ParityValidation';
import { createMockProtoMechState } from './BlkExportService.test-helpers';

jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

const outputDir = 'parity-output';
const writes = new Map<string, string>();

function refusedCatalogResult(): IUnitValidationResult {
  const catalogUnit: ISerializedUnit = mixedCatalogUnit;
  const componentTechBases = { ...catalogUnit.componentTechBases };
  // Exercise missing context even after the separate catalog chassis apply.
  delete componentTechBases.chassis;
  const unit = { ...catalogUnit, componentTechBases };
  expect(unit.techBase).toBe('MIXED');

  const exported = new MTFExportService().export(unit);
  expect(exported.success).toBe(false);
  expect(exported.content).toBeUndefined();
  expect(exported.errors.join('\n')).toContain(
    'missing or invalid chassis-tech-context',
  );

  return {
    id: unit.id,
    chassis: unit.chassis,
    model: unit.model,
    mtfPath: 'meks/Rec Guides ilClan/Vol 12/Shadow Hawk C.mtf',
    generatedPath: '',
    status: 'PARSE_ERROR',
    issues: [],
    parseErrors: exported.errors,
  };
}

function refusedProtoMechResult(): IUnitValidationResult {
  const unit = createMockProtoMechState({ hasMainGun: false });
  const exported = new BlkExportService().export(unit);
  expect(exported.success).toBe(false);
  expect(exported.content).toBeUndefined();
  expect(exported.errors.join('\n')).toMatch(/Main Gun.*mount/i);

  return {
    id: unit.id,
    chassis: unit.chassis,
    model: unit.model,
    mtfPath: 'protomeks/refused-main-gun.blk',
    generatedPath: '',
    status: 'PARSE_ERROR',
    issues: [],
    parseErrors: exported.errors,
  };
}

const refusedCases = [
  ['Mixed chassis', refusedCatalogResult],
  ['ProtoMech Main Gun', refusedProtoMechResult],
] as const;

function writeReports(result: IUnitValidationResult): void {
  const summary: IValidationSummary = {
    generatedAt: '2026-11-10T00:00:00Z',
    unitsValidated: 1,
    unitsPassed: result.status === 'PASSED' ? 1 : 0,
    unitsWithIssues: result.status === 'ISSUES_FOUND' ? 1 : 0,
    unitsWithParseErrors: result.status === 'PARSE_ERROR' ? 1 : 0,
    issuesByCategory: Object.fromEntries(
      Object.values(DiscrepancyCategory).map((category) => [category, 0]),
    ) as Record<DiscrepancyCategory, number>,
  };
  new ParityReportWriter().writeReports([result], summary, outputDir);
}

function writtenJson(file: string): unknown {
  const content = writes.get(file);
  if (content === undefined) throw new Error(`Report was not written: ${file}`);
  return JSON.parse(content) as unknown;
}

describe('ParityReportWriter refusal diagnostics', () => {
  beforeEach(() => {
    writes.clear();
    jest.clearAllMocks();
    jest.mocked(fs.writeFileSync).mockImplementation((file, data) => {
      if (typeof file !== 'string' || typeof data !== 'string') {
        throw new Error('Expected a JSON report path and string content');
      }
      writes.set(file, data);
    });
  });

  it.each(refusedCases)(
    'writes the real %s export refusal cause into the per-unit report',
    (_name, refusedResult) => {
      const result = refusedResult();
      writeReports(result);

      expect(
        writtenJson(path.join(outputDir, 'issues', `${result.id}.json`)),
      ).toMatchObject({
        id: result.id,
        chassis: result.chassis,
        model: result.model,
        parseErrors: result.parseErrors,
      });
    },
  );

  it.each(refusedCases)(
    'writes the real %s export refusal cause into the manifest entry',
    (_name, refusedResult) => {
      const result = refusedResult();
      writeReports(result);

      expect(writtenJson(path.join(outputDir, 'manifest.json'))).toMatchObject({
        units: [
          {
            id: result.id,
            chassis: result.chassis,
            model: result.model,
            status: 'PARSE_ERROR',
            parseErrors: result.parseErrors,
          },
        ],
      });
    },
  );

  it.each(['PASSED', 'ISSUES_FOUND'] as const)(
    'keeps the existing %s manifest shape without refusal diagnostics',
    (status) => {
      const result = { ...refusedCatalogResult(), status };
      writeReports(result);

      expect(writtenJson(path.join(outputDir, 'manifest.json'))).toMatchObject({
        units: [
          {
            id: result.id,
            chassis: result.chassis,
            model: result.model,
            mtfPath: result.mtfPath,
            status,
            issueCount: 0,
          },
        ],
      });
      expect(writes.get(path.join(outputDir, 'manifest.json'))).not.toContain(
        'parseErrors',
      );
      if (status === 'ISSUES_FOUND') {
        expect(
          writes.get(path.join(outputDir, 'issues', `${result.id}.json`)),
        ).not.toContain('parseErrors');
      }
    },
  );
});
