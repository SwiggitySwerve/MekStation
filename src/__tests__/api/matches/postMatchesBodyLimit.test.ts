/**
 * POST /api/matches through Next's real pages-router resolver.
 *
 * The match report carries the full event log. An auto-resolved battle
 * that runs to the turn limit posts more than 1 MB, and the route's
 * missing bodyParser config left it on Next's 1 MB default: the POST was
 * refused 413 before the handler ran and the match log was lost (the
 * "Failed to save match log" toast). A mocked req/res cannot see that,
 * because Next parses the body before the handler, so this file serves
 * the route module through `apiResolver` on a real HTTP server.
 */

import type { AddressInfo } from 'node:net';

// Next internal (checked against next 16.2.11); its argument list has changed
// between majors, so a Next upgrade may break this import or call loudly.
import { apiResolver } from 'next/dist/server/api-utils/node/api-resolver';
import { mkdtempSync, rmSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import * as matchesRoute from '@/pages/api/matches';
import { ENCOUNTER_SESSION_BODY_LIMIT } from '@/services/encounter/encounterLifecycleClient';
import { readMatchLog } from '@/services/matchLog/MatchLogService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameEvent,
} from '@/types/gameplay';
import {
  POST_BATTLE_REPORT_VERSION,
  type IPostBattleReport,
} from '@/utils/gameplay/postBattleReport';

const ONE_MIB = 1024 * 1024;
const TURN_LIMIT = 30;

/** A turn-limit battle's report: every phase change of every turn. */
function turnLimitReport(matchId: string): IPostBattleReport {
  const phases = [
    GamePhase.Initiative,
    GamePhase.Movement,
    GamePhase.WeaponAttack,
    GamePhase.PhysicalAttack,
    GamePhase.Heat,
    GamePhase.End,
  ];
  const log: IGameEvent[] = [];
  for (let turn = 1; turn <= TURN_LIMIT; turn += 1) {
    // Enough entries per turn to land between 1 MiB and the 16 MiB ceiling.
    for (let step = 0; step < 300; step += 1) {
      const fromPhase = phases[step % phases.length]!;
      const toPhase = phases[(step + 1) % phases.length]!;
      const sequence = log.length;
      log.push({
        id: `${matchId}-evt-${sequence}`,
        gameId: matchId,
        sequence,
        timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, sequence)).toISOString(),
        type: GameEventType.PhaseChanged,
        turn,
        phase: fromPhase,
        payload: { fromPhase, toPhase },
      });
    }
  }
  return {
    version: POST_BATTLE_REPORT_VERSION,
    matchId,
    winner: GameSide.Opponent,
    reason: 'turn_limit',
    turnCount: TURN_LIMIT,
    units: [],
    mvpUnitId: null,
    log,
  };
}

function post(
  port: number,
  body: string,
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: '/api/matches',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => (text += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, text }));
      },
    );
    req.on('error', reject);
    req.end(body);
  });
}

let tempDir: string;
let originalPath: string | undefined;
let server: http.Server;
let port: number;

beforeAll(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'matches-body-limit-'));
  originalPath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = join(tempDir, 'test.db');
  try {
    getSQLiteService().close();
  } catch {
    // never initialized — fine.
  }
  getSQLiteService().initialize();

  server = http.createServer((req, res) => {
    void apiResolver(
      req,
      res,
      {},
      matchesRoute,
      {
        previewModeId: '',
        previewModeEncryptionKey: '',
        previewModeSigningKey: '',
        dev: false,
      },
      false,
      false,
      '/api/matches',
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  try {
    getSQLiteService().close();
  } catch {
    // ignore
  }
  rmSync(tempDir, { recursive: true, force: true });
  if (originalPath !== undefined) {
    process.env.DATABASE_PATH = originalPath;
  } else {
    delete process.env.DATABASE_PATH;
  }
});

describe('POST /api/matches body limit', () => {
  it('persists a turn-limit report larger than 1 MB', async () => {
    const report = turnLimitReport('m-turn-limit-over-1mb');
    const body = JSON.stringify(report);
    expect(Buffer.byteLength(body)).toBeGreaterThan(ONE_MIB);

    const response = await post(port, body);

    expect(response).toEqual({
      status: 201,
      text: JSON.stringify({ matchId: report.matchId }),
    });
    const stored = readMatchLog(report.matchId);
    expect(stored.kind).toBe('ok');
    expect(stored.kind === 'ok' && stored.report.log).toHaveLength(
      report.log.length,
    );
  });

  it('uses the shared 16 MiB transport ceiling', () => {
    expect(matchesRoute.config.api.bodyParser.sizeLimit).toBe(
      ENCOUNTER_SESSION_BODY_LIMIT,
    );
  });
});
