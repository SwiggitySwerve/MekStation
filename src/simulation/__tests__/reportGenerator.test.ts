/**
 * Tests for JSON report generator
 */

import { ReportGenerator } from '../reporting/ReportGenerator';
import { ISimulationReport } from '../reporting/types';
import { ISimulationMetrics, IAggregateMetrics } from '../metrics/types';
import { ISimulationConfig } from '../core/types';
import * as fs from 'fs';
import * as path from 'path';

describe('ReportGenerator', () => {
  let generator: ReportGenerator;
  
  beforeEach(() => {
    generator = new ReportGenerator();
  });

  describe('generate()', () => {
    it('should generate report with empty metrics', () => {
      const metrics: ISimulationMetrics[] = [];
      const aggregate: IAggregateMetrics = {
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
      };
      const config: ISimulationConfig = {
        seed: 12345,
        turnLimit: 100,
        unitCount: { player: 4, opponent: 4 },
        mapRadius: 10,
      };

      const report = generator.generate(metrics, aggregate, config);

      expect(report).toBeDefined();
      expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(report.config).toEqual(config);
      expect(report.summary.total).toBe(0);
      expect(report.summary.passed).toBe(0);
      expect(report.summary.failed).toBe(0);
      expect(report.summary.passRate).toBe(0);
      expect(report.metrics).toEqual(aggregate);
      expect(report.violations).toEqual([]);
      expect(report.failedSeeds).toEqual([]);
    });

    it('should generate report with valid metrics', () => {
      const metrics: ISimulationMetrics[] = [
        {
          seed: 1,
          timestamp: '2026-02-01T10:00:00.000Z',
          winner: 'player',
          turns: 10,
          durationMs: 1000,
          violations: [],
          playerUnitsStart: 4,
          playerUnitsEnd: 3,
          opponentUnitsStart: 4,
          opponentUnitsEnd: 0,
          totalDamageDealt: { player: 100, opponent: 50 },
        },
        {
          seed: 2,
          timestamp: '2026-02-01T10:01:00.000Z',
          winner: 'opponent',
          turns: 15,
          durationMs: 1500,
          violations: [
            {
              invariant: 'checkUnitPositionUniqueness',
              severity: 'critical',
              message: 'Multiple units at position (5,5)',
              context: { position: { q: 5, r: 5 }, unitIds: ['unit1', 'unit2'] },
            },
          ],
          playerUnitsStart: 4,
          playerUnitsEnd: 0,
          opponentUnitsStart: 4,
          opponentUnitsEnd: 2,
          totalDamageDealt: { player: 80, opponent: 120 },
        },
        {
          seed: 3,
          timestamp: '2026-02-01T10:02:00.000Z',
          winner: 'player',
          turns: 12,
          durationMs: 1200,
          violations: [],
          playerUnitsStart: 4,
          playerUnitsEnd: 4,
          opponentUnitsStart: 4,
          opponentUnitsEnd: 0,
          totalDamageDealt: { player: 150, opponent: 30 },
        },
      ];

      const aggregate: IAggregateMetrics = {
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
      };

      const config: ISimulationConfig = {
        seed: 12345,
        turnLimit: 100,
        unitCount: { player: 4, opponent: 4 },
        mapRadius: 10,
      };

      const report = generator.generate(metrics, aggregate, config);

      expect(report.summary.total).toBe(3);
      expect(report.summary.passed).toBe(2);
      expect(report.summary.failed).toBe(1);
      expect(report.summary.passRate).toBe(66.67);
      expect(report.violations).toHaveLength(1);
      expect(report.violations[0].seed).toBe(2);
      expect(report.violations[0].type).toBe('checkUnitPositionUniqueness');
      expect(report.failedSeeds).toEqual([2]);
    });

    it('should calculate pass rate correctly', () => {
      const metrics: ISimulationMetrics[] = [
        {
          seed: 1,
          timestamp: '2026-02-01T10:00:00.000Z',
          winner: 'player',
          turns: 10,
          durationMs: 1000,
          violations: [],
          playerUnitsStart: 4,
          playerUnitsEnd: 3,
          opponentUnitsStart: 4,
          opponentUnitsEnd: 0,
          totalDamageDealt: { player: 100, opponent: 50 },
        },
        {
          seed: 2,
          timestamp: '2026-02-01T10:01:00.000Z',
          winner: 'opponent',
          turns: 15,
          durationMs: 1500,
          violations: [{ invariant: 'test', severity: 'critical', message: 'test', context: {} }],
          playerUnitsStart: 4,
          playerUnitsEnd: 0,
          opponentUnitsStart: 4,
          opponentUnitsEnd: 2,
          totalDamageDealt: { player: 80, opponent: 120 },
        },
        {
          seed: 3,
          timestamp: '2026-02-01T10:02:00.000Z',
          winner: 'player',
          turns: 12,
          durationMs: 1200,
          violations: [{ invariant: 'test', severity: 'warning', message: 'test', context: {} }],
          playerUnitsStart: 4,
          playerUnitsEnd: 4,
          opponentUnitsStart: 4,
          opponentUnitsEnd: 0,
          totalDamageDealt: { player: 150, opponent: 30 },
        },
        {
          seed: 4,
          timestamp: '2026-02-01T10:03:00.000Z',
          winner: 'draw',
          turns: 20,
          durationMs: 2000,
          violations: [],
          playerUnitsStart: 4,
          playerUnitsEnd: 0,
          opponentUnitsStart: 4,
          opponentUnitsEnd: 0,
          totalDamageDealt: { player: 200, opponent: 200 },
        },
      ];

      const aggregate: IAggregateMetrics = {
        totalGames: 4,
        playerWins: 2,
        opponentWins: 1,
        draws: 1,
        incompleteGames: 0,
        avgTurns: 14.25,
        avgDurationMs: 1425,
        avgPlayerUnitsDestroyed: 1.75,
        avgOpponentUnitsDestroyed: 2,
        totalViolations: 2,
        violationsByType: { test: 2 },
        violationsBySeverity: { critical: 1, warning: 1 },
        playerWinRate: 50,
        opponentWinRate: 25,
        drawRate: 25,
      };

      const config: ISimulationConfig = {
        seed: 12345,
        turnLimit: 100,
        unitCount: { player: 4, opponent: 4 },
        mapRadius: 10,
      };

      const report = generator.generate(metrics, aggregate, config);

      // 2 games with violations, 2 without
      expect(report.summary.passed).toBe(2);
      expect(report.summary.failed).toBe(2);
      expect(report.summary.passRate).toBe(50);
    });

    it('should extract failed seeds correctly', () => {
      const metrics: ISimulationMetrics[] = [
        {
          seed: 100,
          timestamp: '2026-02-01T10:00:00.000Z',
          winner: 'player',
          turns: 10,
          durationMs: 1000,
          violations: [{ invariant: 'test', severity: 'critical', message: 'test', context: {} }],
          playerUnitsStart: 4,
          playerUnitsEnd: 3,
          opponentUnitsStart: 4,
          opponentUnitsEnd: 0,
          totalDamageDealt: { player: 100, opponent: 50 },
        },
        {
          seed: 200,
          timestamp: '2026-02-01T10:01:00.000Z',
          winner: 'opponent',
          turns: 15,
          durationMs: 1500,
          violations: [],
          playerUnitsStart: 4,
          playerUnitsEnd: 0,
          opponentUnitsStart: 4,
          opponentUnitsEnd: 2,
          totalDamageDealt: { player: 80, opponent: 120 },
        },
        {
          seed: 300,
          timestamp: '2026-02-01T10:02:00.000Z',
          winner: 'player',
          turns: 12,
          durationMs: 1200,
          violations: [{ invariant: 'test', severity: 'warning', message: 'test', context: {} }],
          playerUnitsStart: 4,
          playerUnitsEnd: 4,
          opponentUnitsStart: 4,
          opponentUnitsEnd: 0,
          totalDamageDealt: { player: 150, opponent: 30 },
        },
      ];

      const aggregate: IAggregateMetrics = {
        totalGames: 3,
        playerWins: 2,
        opponentWins: 1,
        draws: 0,
        incompleteGames: 0,
        avgTurns: 12.33,
        avgDurationMs: 1233.33,
        avgPlayerUnitsDestroyed: 0.33,
        avgOpponentUnitsDestroyed: 2.67,
        totalViolations: 2,
        violationsByType: { test: 2 },
        violationsBySeverity: { critical: 1, warning: 1 },
        playerWinRate: 66.67,
        opponentWinRate: 33.33,
        drawRate: 0,
      };

      const config: ISimulationConfig = {
        seed: 12345,
        turnLimit: 100,
        unitCount: { player: 4, opponent: 4 },
        mapRadius: 10,
      };

      const report = generator.generate(metrics, aggregate, config);

      expect(report.failedSeeds).toEqual([100, 300]);
      expect(report.failedSeeds).toHaveLength(2);
    });

    it('should include performance metrics', () => {
      const metrics: ISimulationMetrics[] = [
        {
          seed: 1,
          timestamp: '2026-02-01T10:00:00.000Z',
          winner: 'player',
          turns: 10,
          durationMs: 1000,
          violations: [],
          playerUnitsStart: 4,
          playerUnitsEnd: 3,
          opponentUnitsStart: 4,
          opponentUnitsEnd: 0,
          totalDamageDealt: { player: 100, opponent: 50 },
        },
        {
          seed: 2,
          timestamp: '2026-02-01T10:01:00.000Z',
          winner: 'opponent',
          turns: 20,
          durationMs: 2000,
          violations: [],
          playerUnitsStart: 4,
          playerUnitsEnd: 0,
          opponentUnitsStart: 4,
          opponentUnitsEnd: 2,
          totalDamageDealt: { player: 80, opponent: 120 },
        },
      ];

      const aggregate: IAggregateMetrics = {
        totalGames: 2,
        playerWins: 1,
        opponentWins: 1,
        draws: 0,
        incompleteGames: 0,
        avgTurns: 15,
        avgDurationMs: 1500,
        avgPlayerUnitsDestroyed: 1.5,
        avgOpponentUnitsDestroyed: 2,
        totalViolations: 0,
        violationsByType: {},
        violationsBySeverity: { critical: 0, warning: 0 },
        playerWinRate: 50,
        opponentWinRate: 50,
        drawRate: 0,
      };

      const config: ISimulationConfig = {
        seed: 12345,
        turnLimit: 100,
        unitCount: { player: 4, opponent: 4 },
        mapRadius: 10,
      };

      const report = generator.generate(metrics, aggregate, config);

      expect(report.performance.totalDurationMs).toBe(3000);
      expect(report.performance.avgGameMs).toBe(1500);
      expect(report.performance.avgTurnMs).toBe(100); // 3000ms / 30 turns
    });

    it('should handle zero turns gracefully', () => {
      const metrics: ISimulationMetrics[] = [
        {
          seed: 1,
          timestamp: '2026-02-01T10:00:00.000Z',
          winner: null,
          turns: 0,
          durationMs: 100,
          violations: [],
          playerUnitsStart: 4,
          playerUnitsEnd: 4,
          opponentUnitsStart: 4,
          opponentUnitsEnd: 4,
          totalDamageDealt: { player: 0, opponent: 0 },
        },
      ];

      const aggregate: IAggregateMetrics = {
        totalGames: 1,
        playerWins: 0,
        opponentWins: 0,
        draws: 0,
        incompleteGames: 1,
        avgTurns: 0,
        avgDurationMs: 100,
        avgPlayerUnitsDestroyed: 0,
        avgOpponentUnitsDestroyed: 0,
        totalViolations: 0,
        violationsByType: {},
        violationsBySeverity: { critical: 0, warning: 0 },
        playerWinRate: 0,
        opponentWinRate: 0,
        drawRate: 0,
      };

      const config: ISimulationConfig = {
        seed: 12345,
        turnLimit: 100,
        unitCount: { player: 4, opponent: 4 },
        mapRadius: 10,
      };

      const report = generator.generate(metrics, aggregate, config);

      expect(report.performance.avgTurnMs).toBe(0);
    });
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

  describe('saveTo()', () => {
    const testOutputDir = 'simulation-reports/test';

    afterEach(() => {
      if (fs.existsSync(testOutputDir)) {
        fs.rmSync(testOutputDir, { recursive: true, force: true });
      }
    });

    it('should generate and save report in one call', () => {
      const metrics: ISimulationMetrics[] = [
        {
          seed: 1,
          timestamp: '2026-02-01T10:00:00.000Z',
          winner: 'player',
          turns: 10,
          durationMs: 1000,
          violations: [],
          playerUnitsStart: 4,
          playerUnitsEnd: 3,
          opponentUnitsStart: 4,
          opponentUnitsEnd: 0,
          totalDamageDealt: { player: 100, opponent: 50 },
        },
      ];

      const aggregate: IAggregateMetrics = {
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
      };

      const config: ISimulationConfig = {
        seed: 12345,
        turnLimit: 100,
        unitCount: { player: 4, opponent: 4 },
        mapRadius: 10,
      };

      const filePath = path.join(testOutputDir, 'combined-report.json');
      const returnedPath = generator.saveTo(metrics, aggregate, config, filePath);

      expect(returnedPath).toBe(filePath);
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content) as ISimulationReport;
      expect(parsed.summary.total).toBe(1);
    });
  });

  describe('timestamp format', () => {
    it('should use ISO 8601 format', () => {
      const metrics: ISimulationMetrics[] = [];
      const aggregate: IAggregateMetrics = {
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
      };
      const config: ISimulationConfig = {
        seed: 12345,
        turnLimit: 100,
        unitCount: { player: 4, opponent: 4 },
        mapRadius: 10,
      };

      const report = generator.generate(metrics, aggregate, config);

      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
