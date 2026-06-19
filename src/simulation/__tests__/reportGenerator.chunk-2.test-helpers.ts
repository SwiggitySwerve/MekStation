/**
 * Tests for JSON report generator
 */

import * as fs from 'fs';
import * as path from 'path';

import { ISimulationConfig } from '../core/types';
import { ISimulationMetrics, IAggregateMetrics } from '../metrics/types';
import { ReportGenerator } from '../reporting/ReportGenerator';
import { ISimulationReport } from '../reporting/types';

describe('ReportGenerator', () => {
  let generator: ReportGenerator;

  beforeEach(() => {
    generator = new ReportGenerator();
  });

  describe('save()', () => {
    const testOutputDir = 'simulation-reports/test';

    afterEach(() => {
      if (fs.existsSync(testOutputDir)) {
        fs.rmSync(testOutputDir, { recursive: true, force: true });
      }
    });

    it('should save report to file', () => {
      const report: ISimulationReport = {
        timestamp: '2026-02-01T10:00:00.000Z',
        generatedBy: 'MekStation Simulation System v0.1.0',
        config: {
          seed: 12345,
          turnLimit: 100,
          unitCount: { player: 4, opponent: 4 },
          mapRadius: 10,
        },
        summary: {
          total: 1,
          passed: 1,
          failed: 0,
          passRate: 100,
        },
        metrics: {
          totalGames: 1,
          playerWins: 1,
          opponentWins: 0,
          draws: 0,
          incompleteGames: 0,
          avgTurns: 10,
          avgDurationMs: 1000,
          avgPlayerUnitsDestroyed: 1,
          avgOpponentUnitsDestroyed: 4,
          totalViolations: 0,
          violationsByType: {},
          violationsBySeverity: { critical: 0, warning: 0 },
          playerWinRate: 100,
          opponentWinRate: 0,
          drawRate: 0,
        },
        violations: [],
        violationCount: 0,
        performance: {
          totalDurationMs: 1000,
          avgGameMs: 1000,
          avgTurnMs: 100,
        },
        failedSeeds: [],
      };

      const filePath = path.join(testOutputDir, 'test-report.json');
      generator.save(report, filePath);

      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should create directory if it does not exist', () => {
      const report: ISimulationReport = {
        timestamp: '2026-02-01T10:00:00.000Z',
        generatedBy: 'MekStation Simulation System v0.1.0',
        config: {
          seed: 12345,
          turnLimit: 100,
          unitCount: { player: 4, opponent: 4 },
          mapRadius: 10,
        },
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          passRate: 0,
        },
        metrics: {
          totalGames: 0,
          playerWins: 0,
          opponentWins: 0,
          draws: 0,
          incompleteGames: 0,
          avgTurns: 0,
          avgDurationMs: 0,
          avgPlayerUnitsDestroyed: 0,
          avgOpponentUnitsDestroyed: 0,
          totalViolations: 0,
          violationsByType: {},
          violationsBySeverity: { critical: 0, warning: 0 },
          playerWinRate: 0,
          opponentWinRate: 0,
          drawRate: 0,
        },
        violations: [],
        violationCount: 0,
        performance: {
          totalDurationMs: 0,
          avgGameMs: 0,
          avgTurnMs: 0,
        },
        failedSeeds: [],
      };

      const filePath = path.join(testOutputDir, 'nested', 'test-report.json');
      generator.save(report, filePath);

      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should save pretty-printed JSON', () => {
      const report: ISimulationReport = {
        timestamp: '2026-02-01T10:00:00.000Z',
        generatedBy: 'MekStation Simulation System v0.1.0',
        config: {
          seed: 12345,
          turnLimit: 100,
          unitCount: { player: 4, opponent: 4 },
          mapRadius: 10,
        },
        summary: {
          total: 1,
          passed: 1,
          failed: 0,
          passRate: 100,
        },
        metrics: {
          totalGames: 1,
          playerWins: 1,
          opponentWins: 0,
          draws: 0,
          incompleteGames: 0,
          avgTurns: 10,
          avgDurationMs: 1000,
          avgPlayerUnitsDestroyed: 1,
          avgOpponentUnitsDestroyed: 4,
          totalViolations: 0,
          violationsByType: {},
          violationsBySeverity: { critical: 0, warning: 0 },
          playerWinRate: 100,
          opponentWinRate: 0,
          drawRate: 0,
        },
        violations: [],
        violationCount: 0,
        performance: {
          totalDurationMs: 1000,
          avgGameMs: 1000,
          avgTurnMs: 100,
        },
        failedSeeds: [],
      };

      const filePath = path.join(testOutputDir, 'pretty-report.json');
      generator.save(report, filePath);

      const content = fs.readFileSync(filePath, 'utf-8');

      // Check for indentation (pretty-printed)
      expect(content).toContain('  "timestamp"');
      expect(content).toContain('  "summary"');

      // Verify it's valid JSON
      const parsed = JSON.parse(content) as ISimulationReport;
      expect(parsed.timestamp).toBe(report.timestamp);
    });

    it('should save valid JSON that can be parsed', () => {
      const report: ISimulationReport = {
        timestamp: '2026-02-01T10:00:00.000Z',
        generatedBy: 'MekStation Simulation System v0.1.0',
        config: {
          seed: 12345,
          turnLimit: 100,
          unitCount: { player: 4, opponent: 4 },
          mapRadius: 10,
        },
        summary: {
          total: 3,
          passed: 2,
          failed: 1,
          passRate: 66.67,
        },
        metrics: {
          totalGames: 3,
          playerWins: 2,
          opponentWins: 1,
          draws: 0,
          incompleteGames: 0,
          avgTurns: 12.33,
          avgDurationMs: 1233.33,
          avgPlayerUnitsDestroyed: 0.33,
          avgOpponentUnitsDestroyed: 2.67,
          totalViolations: 1,
          violationsByType: { checkUnitPositionUniqueness: 1 },
          violationsBySeverity: { critical: 1, warning: 0 },
          playerWinRate: 66.67,
          opponentWinRate: 33.33,
          drawRate: 0,
        },
        violations: [
          {
            seed: 2,
            turn: 5,
            type: 'checkUnitPositionUniqueness',
            severity: 'critical',
            message: 'Multiple units at position (5,5)',
            context: { position: { q: 5, r: 5 }, unitIds: ['unit1', 'unit2'] },
          },
        ],
        violationCount: 1,
        performance: {
          totalDurationMs: 3700,
          avgGameMs: 1233.33,
          avgTurnMs: 100,
        },
        failedSeeds: [2],
      };

      const filePath = path.join(testOutputDir, 'valid-report.json');
      generator.save(report, filePath);

      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content) as ISimulationReport;

      expect(parsed.summary.total).toBe(3);
      expect(parsed.violations).toHaveLength(1);
      expect(parsed.failedSeeds).toEqual([2]);
    });
  });
});
