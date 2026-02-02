/**
 * SnapshotManager
 * Manages persistence and loading of failed simulation scenarios.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ISimulationRunResult } from '../runner/types';
import { ISimulationConfig } from '../core/types';
import { IGameSession } from '@/types/gameplay/GameSessionInterfaces';

export interface ISnapshot {
  readonly seed: number;
  readonly config: ISimulationConfig;
  readonly events: readonly any[];
  readonly violations: readonly any[];
  readonly timestamp: string;
}

export class SnapshotManager {
  private snapshotDir: string;

  constructor(snapshotDir: string = 'src/simulation/__snapshots__/failed') {
    this.snapshotDir = snapshotDir;
  }

  saveFailedScenario(
    result: ISimulationRunResult,
    config: ISimulationConfig
  ): string {
    if (!fs.existsSync(this.snapshotDir)) {
      fs.mkdirSync(this.snapshotDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${result.seed}_${timestamp}.json`;
    const filepath = path.resolve(this.snapshotDir, filename);

    const snapshot: ISnapshot = {
      seed: result.seed,
      config,
      events: result.events,
      violations: result.violations,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2), 'utf-8');

    return filepath;
  }

  loadSnapshot(filepath: string): IGameSession {
    const content = fs.readFileSync(filepath, 'utf-8');
    const snapshot: ISnapshot = JSON.parse(content);

    const gameConfig = {
      mapRadius: snapshot.config.mapRadius,
      turnLimit: snapshot.config.turnLimit,
      victoryConditions: ['destruction'],
      optionalRules: [],
    };

    return {
      id: `snapshot-${snapshot.seed}`,
      createdAt: snapshot.timestamp,
      updatedAt: snapshot.timestamp,
      config: gameConfig,
      units: [],
      events: snapshot.events as any[],
      currentState: {
        gameId: `snapshot-${snapshot.seed}`,
        status: 'active' as any,
        turn: 1,
        phase: 'initiative' as any,
        activationIndex: 0,
        units: {},
        turnEvents: [],
      },
    };
  }

  listSnapshots(): string[] {
    if (!fs.existsSync(this.snapshotDir)) {
      return [];
    }

    return fs
      .readdirSync(this.snapshotDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => path.resolve(this.snapshotDir, f));
  }

  deleteOldSnapshots(olderThanDays: number): number {
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const filepath of this.listSnapshots()) {
      const stats = fs.statSync(filepath);
      if (stats.mtimeMs < cutoffTime) {
        fs.unlinkSync(filepath);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}
