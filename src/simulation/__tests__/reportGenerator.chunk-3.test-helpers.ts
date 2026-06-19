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
          criticalHitsLanded: 0,
          componentDestroyedCount: 0,
          ammoExplosions: 0,
          shutdowns: 0,
          falls: 0,
          pilotHits: 0,
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
      const returnedPath = generator.saveTo(
        metrics,
        aggregate,
        config,
        filePath,
      );

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
      expect(report.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });
  });
});
