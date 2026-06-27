import { describe, expect, it, afterEach, beforeEach } from '@jest/globals';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { IAdaptedUnit } from '@/engine/types';
import type { IWeapon } from '@/simulation/ai/types';

import { GameEngine } from '@/engine/GameEngine';
import { appendManifestEntry, readReplayIndex } from '@/replay-library';
import { writeSwarmEventLog } from '@/simulation/runner/eventLogPersistence';
import { buildSwarmManifestEntry } from '@/simulation/runner/swarmManifestEntry';
import {
  Facing,
  GameEventType,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  ReplaySource,
  type IGameEvent,
  type IGameUnit,
} from '@/types/gameplay';
import { derivePostBattleReport } from '@/utils/gameplay/postBattleReport';

jest.setTimeout(30_000);

function mediumLaser(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function makeAdaptedUnit(
  id: string,
  side: GameSide,
  position: { q: number; r: number },
): IAdaptedUnit {
  return {
    id,
    side,
    position,
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [mediumLaser(`${id}-ml-1`), mediumLaser(`${id}-ml-2`)],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

function makeGameUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: `${id}-pilot`,
    gunnery: 4,
    piloting: 5,
  };
}

function buildLance(prefix: string, side: GameSide, r: number): IAdaptedUnit[] {
  return [-3, -1, 1, 3].map((q, index) =>
    makeAdaptedUnit(`${prefix}-${index + 1}`, side, { q, r }),
  );
}

function runLanceMatch(seed: number) {
  const engine = new GameEngine({ mapRadius: 7, turnLimit: 6, seed });
  const players = buildLance('player', GameSide.Player, -2);
  const opponents = buildLance('opponent', GameSide.Opponent, 2);
  const gameUnits = [...players, ...opponents].map((unit) =>
    makeGameUnit(unit.id, unit.side),
  );

  return {
    players,
    opponents,
    gameUnits,
    session: engine.runToCompletion(players, opponents, gameUnits),
  };
}

function countEvents(events: readonly IGameEvent[], type: GameEventType) {
  return events.filter((event) => event.type === type).length;
}

describe('combat-4v4 journey proof', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mekstation-4v4-proof-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('runs four BattleMechs per side to terminal state and persists replay evidence', async () => {
    const { players, opponents, gameUnits, session } = runLanceMatch(42);

    expect(players).toHaveLength(4);
    expect(opponents).toHaveLength(4);
    expect(gameUnits).toHaveLength(8);
    expect(session.currentState.status).toBe(GameStatus.Completed);

    const ended = session.events.find(
      (event) => event.type === GameEventType.GameEnded,
    );
    expect(ended).toBeDefined();
    expect(session.events.length).toBeGreaterThan(0);
    expect(
      countEvents(session.events, GameEventType.AttackDeclared) +
        countEvents(session.events, GameEventType.DamageApplied) +
        countEvents(session.events, GameEventType.HeatGenerated),
    ).toBeGreaterThan(0);

    const report = derivePostBattleReport(session);
    expect(report.version).toBeGreaterThanOrEqual(1);
    expect(report.units).toHaveLength(8);
    expect(report.units.map((unit) => unit.unitId).sort()).toEqual(
      gameUnits.map((unit) => unit.id).sort(),
    );

    const logPath = await writeSwarmEventLog(
      session.id,
      session.events,
      tmpDir,
    );
    const rawLog = await fs.readFile(logPath, 'utf8');
    const logLines = rawLog.split('\n');
    expect(logLines).toHaveLength(session.events.length);
    const parsedEvents = logLines.map((line) => JSON.parse(line) as IGameEvent);
    expect(parsedEvents[0]?.gameId).toBe(session.id);
    expect(parsedEvents.at(-1)?.type).toBe(GameEventType.GameEnded);

    const manifestEntry = buildSwarmManifestEntry({
      gameId: session.id,
      runSeed: 42,
      configName: 'combat-4v4-domain-proof',
      batchTimestamp: '2026-06-27T00-00-00-000Z',
      createdAt: '2026-06-27T00:00:00.000Z',
      events: session.events,
      bvTotal: 12000,
    });
    await appendManifestEntry(manifestEntry, { cwd: tmpDir });

    const replayIndex = await readReplayIndex({ cwd: tmpDir });
    expect(replayIndex).toHaveLength(1);
    expect(replayIndex[0]).toMatchObject({
      id: session.id,
      replaySource: ReplaySource.Swarm,
      path: `swarm/${session.id}.jsonl`,
      configName: 'combat-4v4-domain-proof',
      seed: 42,
      bvTotal: 12000,
    });
  });
});
