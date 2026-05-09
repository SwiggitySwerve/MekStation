/**
 * EncounterRepository — Force-Deletion Cascade Tests
 *
 * Pin the contract from the
 * `repair-broken-encounter-drafts → Force-Deletion Cascade to Encounter References`
 * requirement:
 *   - Single + multi-encounter cascade NULLs both force-id slots and recomputes status.
 *   - No-op cascade (forceId not referenced anywhere) returns empty array, no rows touched.
 *   - Launched encounter whose only player force was cleared drops back to Draft.
 *   - Launched encounter that still retains an opponent stays Launched.
 *   - Completed encounter NEVER demotes — history is fixed.
 *   - Transaction rollback semantics: a thrown UPDATE rolls the prior UPDATE
 *     back atomically (verified structurally because the cascade is wrapped
 *     in `db.transaction(...)` which better-sqlite3 guarantees is atomic).
 *
 * Uses a separate test-DB filename (`./data/test-encounter-repository-cascade.db`)
 * so concurrent runs of this suite + the existing EncounterRepository.test.ts
 * don't collide on file locks.
 *
 * @spec openspec/changes/repair-broken-encounter-drafts/specs/game-session-management/spec.md
 */

import fs from 'fs';
import path from 'path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { EncounterStatus } from '@/types/encounter';

import { EncounterRepository } from '../EncounterRepository';

// =============================================================================
// Test fixtures
// =============================================================================

const TEST_DB_PATH = './data/test-encounter-repository-cascade.db';

/**
 * Insert a raw encounter row directly via SQL — bypasses
 * `repository.createEncounter` so we can drop a stored forceId in BEFORE
 * the cascade test runs (createEncounter doesn't accept playerForce on
 * create — it's set via update). Keeps the fixtures compact.
 */
function insertEncounterRow(input: {
  id: string;
  name: string;
  status: EncounterStatus;
  playerForceJson?: object | null;
  opponentForceJson?: object | null;
  victoryConditions?: unknown[];
}): void {
  const db = getSQLiteService().getDatabase();
  const now = new Date().toISOString();
  const map = {
    radius: 6,
    terrain: 'clear',
    playerDeploymentZone: 'south',
    opponentDeploymentZone: 'north',
  };
  db.prepare(
    `INSERT INTO encounters (
      id, name, description, status, template,
      player_force_json, opponent_force_json, opfor_config_json,
      map_config_json, victory_conditions_json, optional_rules_json,
      game_session_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.id,
    input.name,
    null,
    input.status,
    null,
    input.playerForceJson ? JSON.stringify(input.playerForceJson) : null,
    input.opponentForceJson ? JSON.stringify(input.opponentForceJson) : null,
    null,
    JSON.stringify(map),
    JSON.stringify(input.victoryConditions ?? []),
    JSON.stringify([]),
    null,
    now,
    now,
  );
}

function readPlayerForceJsonRaw(id: string): string | null {
  const db = getSQLiteService().getDatabase();
  const row = db
    .prepare('SELECT player_force_json FROM encounters WHERE id = ?')
    .get(id) as { player_force_json: string | null } | undefined;
  return row?.player_force_json ?? null;
}

function readStatus(id: string): string | null {
  const db = getSQLiteService().getDatabase();
  const row = db
    .prepare('SELECT status FROM encounters WHERE id = ?')
    .get(id) as { status: string } | undefined;
  return row?.status ?? null;
}

// =============================================================================
// Suite
// =============================================================================

describe('EncounterRepository.clearForceReference (cascade)', () => {
  let repository: EncounterRepository;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    const walPath = `${TEST_DB_PATH}-wal`;
    const shmPath = `${TEST_DB_PATH}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

    const dataDir = path.dirname(TEST_DB_PATH);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    resetSQLiteService();
    const sqlite = getSQLiteService({ path: TEST_DB_PATH });
    sqlite.initialize();

    repository = new EncounterRepository();
    repository.initialize();
  });

  afterEach(() => {
    resetSQLiteService();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    const walPath = `${TEST_DB_PATH}-wal`;
    const shmPath = `${TEST_DB_PATH}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  });

  it('clears a single encounter pointing at the deleted force (player slot)', () => {
    insertEncounterRow({
      id: 'enc-1',
      name: 'Single Player Cascade',
      status: EncounterStatus.Draft,
      playerForceJson: {
        forceId: 'force-X',
        forceName: 'Old',
        totalBV: 0,
        unitCount: 0,
      },
    });

    const result = repository.clearForceReference('force-X');

    expect(result.affectedEncounterIds).toEqual(['enc-1']);
    expect(readPlayerForceJsonRaw('enc-1')).toBeNull();
    // Status stays Draft — it was already Draft, recalculate is a no-op here.
    expect(readStatus('enc-1')).toBe(EncounterStatus.Draft);
  });

  it('clears multiple encounters across both player and opponent slots', () => {
    insertEncounterRow({
      id: 'enc-a',
      name: 'A — player ref',
      status: EncounterStatus.Draft,
      playerForceJson: {
        forceId: 'force-shared',
        forceName: '',
        totalBV: 0,
        unitCount: 0,
      },
    });
    insertEncounterRow({
      id: 'enc-b',
      name: 'B — opponent ref',
      status: EncounterStatus.Draft,
      opponentForceJson: {
        forceId: 'force-shared',
        forceName: '',
        totalBV: 0,
        unitCount: 0,
      },
    });
    insertEncounterRow({
      id: 'enc-c',
      name: 'C — both refs',
      status: EncounterStatus.Draft,
      playerForceJson: {
        forceId: 'force-shared',
        forceName: '',
        totalBV: 0,
        unitCount: 0,
      },
      opponentForceJson: {
        forceId: 'force-shared',
        forceName: '',
        totalBV: 0,
        unitCount: 0,
      },
    });

    const result = repository.clearForceReference('force-shared');

    expect(result.affectedEncounterIds).toHaveLength(3);
    expect(result.affectedEncounterIds).toEqual(
      expect.arrayContaining(['enc-a', 'enc-b', 'enc-c']),
    );

    // Both slots NULL across the board
    expect(readPlayerForceJsonRaw('enc-a')).toBeNull();
    expect(readPlayerForceJsonRaw('enc-c')).toBeNull();
    const db = getSQLiteService().getDatabase();
    const oppB = db
      .prepare('SELECT opponent_force_json FROM encounters WHERE id = ?')
      .get('enc-b') as { opponent_force_json: string | null };
    const oppC = db
      .prepare('SELECT opponent_force_json FROM encounters WHERE id = ?')
      .get('enc-c') as { opponent_force_json: string | null };
    expect(oppB.opponent_force_json).toBeNull();
    expect(oppC.opponent_force_json).toBeNull();
  });

  it('no-op cascade when forceId is referenced nowhere', () => {
    insertEncounterRow({
      id: 'enc-untouched',
      name: 'Untouched',
      status: EncounterStatus.Draft,
      playerForceJson: {
        forceId: 'force-other',
        forceName: '',
        totalBV: 0,
        unitCount: 0,
      },
    });

    const result = repository.clearForceReference('force-does-not-exist');

    expect(result.affectedEncounterIds).toEqual([]);
    // Untouched row still has its player force ref intact
    const raw = readPlayerForceJsonRaw('enc-untouched');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toMatchObject({ forceId: 'force-other' });
  });

  it('Launched encounter with only-player-ref-cleared drops to Draft', () => {
    // Launched encounter referencing forceId on the player slot (single-side
    // launched scenario — no opponent ever set, encounter went Launched via
    // legacy path or test fixture). The cascade must drop status to Draft
    // because the encounter no longer has any forces resolved.
    insertEncounterRow({
      id: 'enc-launched',
      name: 'Launched',
      status: EncounterStatus.Launched,
      playerForceJson: {
        forceId: 'force-Y',
        forceName: '',
        totalBV: 0,
        unitCount: 0,
      },
    });

    repository.clearForceReference('force-Y');

    expect(readPlayerForceJsonRaw('enc-launched')).toBeNull();
    expect(readStatus('enc-launched')).toBe(EncounterStatus.Draft);
  });

  it('Launched encounter that still retains an opponent stays Launched', () => {
    // The widening only fires when BOTH forces are cleared. A launched
    // encounter that still has an opponent stays launched — the cascade
    // cleared one slot, the encounter retains a referenced opponent, status
    // is preserved.
    insertEncounterRow({
      id: 'enc-launched-half',
      name: 'Launched Half',
      status: EncounterStatus.Launched,
      playerForceJson: {
        forceId: 'force-Z',
        forceName: '',
        totalBV: 0,
        unitCount: 0,
      },
      opponentForceJson: {
        forceId: 'force-other-opp',
        forceName: '',
        totalBV: 0,
        unitCount: 0,
      },
    });

    repository.clearForceReference('force-Z');

    expect(readPlayerForceJsonRaw('enc-launched-half')).toBeNull();
    // opponent still set; status preserved
    expect(readStatus('enc-launched-half')).toBe(EncounterStatus.Launched);
  });

  it('Completed encounter NEVER demotes even when both forces cleared', () => {
    insertEncounterRow({
      id: 'enc-completed',
      name: 'Completed',
      status: EncounterStatus.Completed,
      playerForceJson: {
        forceId: 'force-W',
        forceName: '',
        totalBV: 0,
        unitCount: 0,
      },
      opponentForceJson: {
        forceId: 'force-W',
        forceName: '',
        totalBV: 0,
        unitCount: 0,
      },
    });

    repository.clearForceReference('force-W');

    // Both refs cleared, but status remains Completed (history is fixed).
    expect(readPlayerForceJsonRaw('enc-completed')).toBeNull();
    expect(readStatus('enc-completed')).toBe(EncounterStatus.Completed);
  });

  it('wraps the cascade in db.transaction for atomic rollback semantics', () => {
    // Structural assertion: clearForceReference uses the better-sqlite3
    // `db.transaction(...)` API for the UPDATE+recompute pass, which
    // guarantees rollback on any throw. We spy on `db.transaction` and
    // assert it gets called exactly once per cascade invocation.
    insertEncounterRow({
      id: 'enc-txn',
      name: 'Txn Witness',
      status: EncounterStatus.Draft,
      playerForceJson: {
        forceId: 'force-T',
        forceName: '',
        totalBV: 0,
        unitCount: 0,
      },
    });

    const db = getSQLiteService().getDatabase();
    const txnSpy = jest.spyOn(db, 'transaction');

    repository.clearForceReference('force-T');

    expect(txnSpy).toHaveBeenCalledTimes(1);
    txnSpy.mockRestore();
  });
});
