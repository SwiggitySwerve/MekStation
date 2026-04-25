/**
 * /api/matches API route smoke tests.
 *
 * Per `add-victory-and-post-battle-summary` tasks 4.5 + 6.x: the API
 * surface enforces the version handshake described in the design D4 /
 * D10 + spec scenarios "Unversioned report rejected on read",
 * "Unknown-version report rejected on read", and "Reload reads
 * persisted report".
 *
 * The tests exercise the route handlers directly via mocked
 * `NextApiRequest`/`NextApiResponse` so we don't spin up the full
 * Next.js dev server. We DO use a real in-memory SQLite database
 * (the same `better-sqlite3` instance the production code uses) so
 * the migration actually runs.
 *
 * @spec openspec/changes/add-victory-and-post-battle-summary/specs/after-combat-report/spec.md
 * @spec openspec/changes/add-victory-and-post-battle-summary/specs/game-session-management/spec.md
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import getMatchesById from "@/pages/api/matches/[id]";
import postMatches from "@/pages/api/matches";
import { getSQLiteService } from "@/services/persistence/SQLiteService";
import { GameSide } from "@/types/gameplay";
import {
  POST_BATTLE_REPORT_VERSION,
  type IPostBattleReport,
} from "@/utils/gameplay/postBattleReport";

// =============================================================================
// Test harness — minimal req/res mocks
// =============================================================================

interface MockResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
}

function mockReqRes(overrides: {
  method?: string;
  query?: Record<string, string>;
  body?: unknown;
}): { req: any; res: any; result: MockResponse } {
  const result: MockResponse = { statusCode: 0, body: undefined, headers: {} };
  const req = {
    method: overrides.method ?? "GET",
    query: overrides.query ?? {},
    body: overrides.body,
  };
  const res = {
    status(code: number) {
      result.statusCode = code;
      return this;
    },
    json(body: unknown) {
      result.body = body;
      return this;
    },
    setHeader(name: string, value: string) {
      result.headers[name] = value;
      return this;
    },
  };
  return { req, res, result };
}

function makeReport(
  overrides: Partial<IPostBattleReport> = {},
): IPostBattleReport {
  return {
    version: POST_BATTLE_REPORT_VERSION,
    matchId: "test-match-" + Math.random().toString(36).slice(2, 10),
    winner: GameSide.Player,
    reason: "destruction",
    turnCount: 10,
    units: [],
    mvpUnitId: null,
    log: [],
    ...overrides,
  };
}

// =============================================================================
// Setup — point SQLite at a temp dir
// =============================================================================

let tempDir: string;
let originalPath: string | undefined;

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), "matches-test-"));
  originalPath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = join(tempDir, "test.db");
  // Force re-init by closing any existing instance.
  try {
    getSQLiteService().close();
  } catch {
    // never initialized — fine.
  }
  getSQLiteService().initialize();
});

afterAll(() => {
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

// =============================================================================
// Tests
// =============================================================================

describe("POST /api/matches", () => {
  it("persists a versioned report and returns 201 with matchId", async () => {
    const report = makeReport({ matchId: "m-create-ok" });
    const { req, res, result } = mockReqRes({ method: "POST", body: report });
    await postMatches(req, res);
    expect(result.statusCode).toBe(201);
    expect(result.body).toEqual({ matchId: "m-create-ok" });
  });

  it('rejects an unversioned report with 400 + "unversioned report" body', async () => {
    // Spec scenario: "Unversioned report rejected on read" — same
    // gate is enforced on the write side too so we don't store a
    // blob the read endpoint would reject.
    const report = makeReport({ matchId: "m-bad-no-version" });
    delete (report as any).version;
    const { req, res, result } = mockReqRes({ method: "POST", body: report });
    await postMatches(req, res);
    expect(result.statusCode).toBe(400);
    expect(result.body).toEqual({ error: "unversioned report" });
  });

  it("rejects an unknown-version report with 400 + descriptive error", async () => {
    const report = makeReport({ matchId: "m-bad-version" });
    (report as any).version = 99;
    const { req, res, result } = mockReqRes({ method: "POST", body: report });
    await postMatches(req, res);
    expect(result.statusCode).toBe(400);
    expect(result.body).toEqual({
      error: `unsupported report version 99, this build supports ${POST_BATTLE_REPORT_VERSION}`,
    });
  });

  it("rejects non-POST methods with 405", async () => {
    const { req, res, result } = mockReqRes({ method: "GET" });
    await postMatches(req, res);
    expect(result.statusCode).toBe(405);
    expect(result.headers.Allow).toBe("POST");
  });
});

describe("GET /api/matches/[id]", () => {
  it("round-trips a persisted report", async () => {
    // Spec scenario: "Reload reads persisted report".
    const report = makeReport({ matchId: "m-roundtrip", turnCount: 7 });
    const post = mockReqRes({ method: "POST", body: report });
    await postMatches(post.req, post.res);
    expect(post.result.statusCode).toBe(201);

    const get = mockReqRes({
      method: "GET",
      query: { id: "m-roundtrip" },
    });
    await getMatchesById(get.req, get.res);
    expect(get.result.statusCode).toBe(200);
    const fetched = get.result.body as IPostBattleReport;
    expect(fetched.matchId).toBe("m-roundtrip");
    expect(fetched.turnCount).toBe(7);
    expect(fetched.version).toBe(POST_BATTLE_REPORT_VERSION);
  });

  it("returns 404 for missing match", async () => {
    const { req, res, result } = mockReqRes({
      method: "GET",
      query: { id: "no-such-match" },
    });
    await getMatchesById(req, res);
    expect(result.statusCode).toBe(404);
    expect(result.body).toEqual({ error: "not found" });
  });

  it('returns 400 with "unversioned report" body for stored payload missing version', async () => {
    // Spec scenario verbatim: a stored payload without `version` MUST
    // 400 with body `{error: "unversioned report"}`. We bypass the
    // POST-side gate by injecting directly into SQLite.
    const db = getSQLiteService().getDatabase();
    db.prepare(
      `INSERT OR REPLACE INTO match_logs
         (id, version, winner, reason, turn_count, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "m-unversioned",
      0,
      "player",
      "destruction",
      5,
      JSON.stringify({
        // no `version` field at all
        matchId: "m-unversioned",
        winner: "player",
        reason: "destruction",
        turnCount: 5,
        units: [],
        mvpUnitId: null,
        log: [],
      }),
      Date.now(),
    );

    const { req, res, result } = mockReqRes({
      method: "GET",
      query: { id: "m-unversioned" },
    });
    await getMatchesById(req, res);
    expect(result.statusCode).toBe(400);
    expect(result.body).toEqual({ error: "unversioned report" });
  });

  it("returns 400 with version-mismatch error for stored payload at version 99", async () => {
    // Spec scenario verbatim.
    const db = getSQLiteService().getDatabase();
    db.prepare(
      `INSERT OR REPLACE INTO match_logs
         (id, version, winner, reason, turn_count, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "m-v99",
      99,
      "player",
      "destruction",
      5,
      JSON.stringify({
        version: 99,
        matchId: "m-v99",
        winner: "player",
        reason: "destruction",
        turnCount: 5,
        units: [],
        mvpUnitId: null,
        log: [],
      }),
      Date.now(),
    );

    const { req, res, result } = mockReqRes({
      method: "GET",
      query: { id: "m-v99" },
    });
    await getMatchesById(req, res);
    expect(result.statusCode).toBe(400);
    expect(result.body).toEqual({
      error: `unsupported report version 99, this build supports ${POST_BATTLE_REPORT_VERSION}`,
    });
  });

  it("rejects non-GET methods with 405", async () => {
    const { req, res, result } = mockReqRes({
      method: "POST",
      query: { id: "whatever" },
    });
    await getMatchesById(req, res);
    expect(result.statusCode).toBe(405);
    expect(result.headers.Allow).toBe("GET");
  });
});
