import * as fs from 'fs';
import * as path from 'path';

import { ISimulationConfig } from '../core/types';
import { ISimulationMetrics, IAggregateMetrics } from '../metrics/types';
import { ISimulationReport, IReportViolation } from './types';

export class ReportGenerator {
  generate(
    metrics: readonly ISimulationMetrics[],
    aggregate: IAggregateMetrics,
    config: ISimulationConfig,
  ): ISimulationReport {
    const timestamp = new Date().toISOString();

    const violations: IReportViolation[] = [];
    const failedSeedsSet = new Set<number>();
    let totalTurns = 0;
    let totalDurationMs = 0;

    for (const game of metrics) {
      totalTurns += game.turns;
      totalDurationMs += game.durationMs;

      if (game.violations.length > 0) {
        failedSeedsSet.add(game.seed);

        for (const violation of game.violations) {
          violations.push({
            seed: game.seed,
            turn: game.turns,
            type: violation.invariant,
            severity: violation.severity,
            message: violation.message,
            context: violation.context,
          });
        }
      }
    }

    const failedSeeds = Array.from(failedSeedsSet).sort((a, b) => a - b);
    const passed = metrics.length - failedSeeds.length;
    const failed = failedSeeds.length;
    const passRate =
      metrics.length > 0
        ? Math.round((passed / metrics.length) * 100 * 100) / 100
        : 0;

    const avgTurnMs =
      totalTurns > 0
        ? Math.round((totalDurationMs / totalTurns) * 100) / 100
        : 0;

    const avgGameMs =
      metrics.length > 0
        ? Math.round((totalDurationMs / metrics.length) * 100) / 100
        : 0;

    return {
      timestamp,
      generatedBy: 'MekStation Simulation System v0.1.0',
      config,
      summary: {
        total: metrics.length,
        passed,
        failed,
        passRate,
      },
      metrics: aggregate,
      violations,
      violationCount: violations.length,
      performance: {
        totalDurationMs,
        avgGameMs,
        avgTurnMs,
      },
      failedSeeds,
    };
  }

  save(report: ISimulationReport, outputPath: string): void {
    const dir = path.dirname(outputPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const json = JSON.stringify(report, null, 2);
    fs.writeFileSync(outputPath, json, 'utf-8');
  }

  saveTo(
    metrics: readonly ISimulationMetrics[],
    aggregate: IAggregateMetrics,
    config: ISimulationConfig,
    outputPath: string,
  ): string {
    const report = this.generate(metrics, aggregate, config);
    this.save(report, outputPath);
    return outputPath;
  }
}
