/**
 * Tests for scripts/cleanup-broken-encounters.ts
 *
 * Covers:
 *   - classifyEncounter pure-function branches (~6 cases)
 *   - runCleanup end-to-end with fixture DB (5 encounters: 2 abandoned + 2 orphaned + 1 still-valid)
 *   - Idempotent re-run on cleaned database
 *   - --manifest-only flag skips deletes
 *   - Manifest schema completeness (all required fields per spec)
 *   - Status-gated deletion (non-Draft empty rows classify as still-valid)
 *
 * Spec: openspec/changes/repair-broken-encounter-drafts/specs/game-session-management/spec.md
 *       (Requirement: One-Time Cleanup Script for Existing Broken Drafts)
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { EncounterRepository } from '@/services/encounter/EncounterRepository';
import { ForceRepository } from '@/services/forces/ForceRepository';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  EncounterStatus,
  PilotSkillTemplate,
  ScenarioTemplateType,
  TerrainPreset,
  VictoryConditionType,
  type IEncounter,
  type IForceReference,
  type IMapConfiguration,
  type IOpForConfig,
} from '@/types/encounter';
import {
  ForcePosition,
  ForceType,
  type ICreateForceRequest,
} from '@/types/force';

import {
  classifyEncounter,
  runCleanup,
  type ClassificationResult,
  type ManifestEntry,
} from '../cleanup-broken-encounters';

// =============================================================================
// classifyEncounter — pure-function branch tests
// =============================================================================

describe('classifyEncounter', () => {
  const baseEncounter: IEncounter = {
    id: 'encounter-test',
    name: 'Test',
    status: EncounterStatus.Draft,
    template: undefined,
    playerForce: undefined,
    opponentForce: undefined,
    opForConfig: undefined,
    mapConfig: {
      radius: 6,
      terrain: TerrainPreset.Clear,
      playerDeploymentZone: 'south',
      opponentDeploymentZone: 'north',
    },
    victoryConditions: [],
    optionalRules: [],
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  };

  const playerForceRef: IForceReference = {
    forceId: 'force-1',
    forceName: 'Alpha Lance',
    totalBV: 4500,
    unitCount: 4,
  };

  const opForConfig: IOpForConfig = {
    targetBV: 4500,
    pilotSkillTemplate: PilotSkillTemplate.Veteran,
  };

  const resolverThatAlwaysReturnsNull = () => null;
  const resolverThatAlwaysReturnsForce = () => ({
    id: 'mock',
    name: 'Mock Force',
  });

  it('classifies as abandoned-empty when Draft + empty configuration + no stored ids', () => {
    const result = classifyEncounter(
      baseEncounter,
      { playerForceId: null, opponentForceId: null },
      resolverThatAlwaysReturnsNull,
    );
    expect(result.classification).toBe('abandoned-empty');
    expect(result.reason).toContain('never finished setup');
  });

  it('classifies abandoned-config Launched encounter as still-valid (status-gated deletion)', () => {
    const launched: IEncounter = {
      ...baseEncounter,
      status: EncounterStatus.Launched,
    };
    const result = classifyEncounter(
      launched,
      { playerForceId: null, opponentForceId: null },
      resolverThatAlwaysReturnsNull,
    );
    expect(result.classification).toBe('still-valid');
    expect(result.reason).toBe(
      'non-draft encounter retained even though configuration is empty',
    );
  });

  it('classifies as orphaned-force-reference when player ref stored but unresolved', () => {
    const result = classifyEncounter(
      baseEncounter,
      { playerForceId: 'F-deleted', opponentForceId: null },
      resolverThatAlwaysReturnsNull,
    );
    expect(result.classification).toBe('orphaned-force-reference');
    expect(result.reason).toContain('player force F-deleted deleted');
  });

  it('classifies as orphaned when opponent ref stored but unresolved', () => {
    const result = classifyEncounter(
      baseEncounter,
      { playerForceId: null, opponentForceId: 'F-opp-deleted' },
      resolverThatAlwaysReturnsNull,
    );
    expect(result.classification).toBe('orphaned-force-reference');
    expect(result.reason).toContain('opponent force F-opp-deleted deleted');
  });

  it('classifies as orphaned when BOTH refs stored and BOTH unresolved', () => {
    const result = classifyEncounter(
      baseEncounter,
      { playerForceId: 'F1', opponentForceId: 'F2' },
      resolverThatAlwaysReturnsNull,
    );
    expect(result.classification).toBe('orphaned-force-reference');
    expect(result.reason).toContain('player force F1 deleted');
    expect(result.reason).toContain('opponent force F2 deleted');
  });

  it('classifies as still-valid when Ready encounter has resolved forces', () => {
    const valid: IEncounter = {
      ...baseEncounter,
      status: EncounterStatus.Ready,
      playerForce: playerForceRef,
      opForConfig,
      victoryConditions: [{ type: VictoryConditionType.Annihilation } as never],
    };
    const result = classifyEncounter(
      valid,
      { playerForceId: 'force-1', opponentForceId: null },
      resolverThatAlwaysReturnsForce,
    );
    expect(result.classification).toBe('still-valid');
  });

  it('classifies as still-valid when Launched encounter has resolved forces', () => {
    const launched: IEncounter = {
      ...baseEncounter,
      status: EncounterStatus.Launched,
      playerForce: playerForceRef,
      opForConfig,
    };
    const result = classifyEncounter(
      launched,
      { playerForceId: 'force-1', opponentForceId: null },
      resolverThatAlwaysReturnsForce,
    );
    expect(result.classification).toBe('still-valid');
  });
});

// =============================================================================
// runCleanup — end-to-end fixture tests
// =============================================================================

describe('runCleanup', () => {
  let testDbPath: string;
  let testCwd: string;
  let encounterRepo: EncounterRepository;
  let forceRepo: ForceRepository;

  function createForce(name: string): string {
    const req: ICreateForceRequest = {
      name,
      forceType: ForceType.Lance,
      affiliation: 'Test',
    };
    const result = forceRepo.createForce(req);
    if (!result.success || !result.id) {
      throw new Error(`createForce failed: ${result.error}`);
    }
    return result.id;
  }

  function insertEncounterRow(input: {
    id: string;
    name: string;
    status: EncounterStatus;
    playerForceJson?: object | null;
    opponentForceJson?: object | null;
    opForConfigJson?: object | null;
    victoryConditions?: unknown[];
  }): void {
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();
    const map: IMapConfiguration = {
      radius: 6,
      terrain: TerrainPreset.Clear,
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
      input.playerForceJson === undefined
        ? null
        : input.playerForceJson === null
          ? null
          : JSON.stringify(input.playerForceJson),
      input.opponentForceJson === undefined
        ? null
        : input.opponentForceJson === null
          ? null
          : JSON.stringify(input.opponentForceJson),
      input.opForConfigJson === undefined
        ? null
        : input.opForConfigJson === null
          ? null
          : JSON.stringify(input.opForConfigJson),
      JSON.stringify(map),
      JSON.stringify(input.victoryConditions ?? []),
      JSON.stringify([]),
      null,
      now,
      now,
    );
  }

  beforeEach(() => {
    // Per-test temp DB and per-test temp cwd for manifest output
    const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), `cleanup-${stamp}-`));
    testDbPath = path.join(tmpRoot, 'test.db');
    testCwd = tmpRoot;

    resetSQLiteService();
    const sqlite = getSQLiteService({ path: testDbPath });
    sqlite.initialize();

    encounterRepo = new EncounterRepository();
    encounterRepo.initialize();
    forceRepo = new ForceRepository();
    forceRepo.initialize();

    // Stub the repository singleton getters to point at our test instances.
    // The script uses getEncounterRepository / getForceRepository — but since
    // the singletons are reset, the next get() call will create fresh ones
    // backed by the test SQLite path. So we don't need to mock — we just
    // invoke the singletons after setup so the test database is the live one.
  });

  afterEach(() => {
    resetSQLiteService();
    // Best-effort cleanup; OS will mop up tmp dir eventually.
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    } catch {
      /* ignore */
    }
  });

  it('writes manifest before any DELETE and deletes only abandoned-empty rows (5-encounter fixture)', async () => {
    // 1+2: two abandoned-empty Drafts
    insertEncounterRow({
      id: 'enc-abandoned-1',
      name: 'Abandoned 1',
      status: EncounterStatus.Draft,
    });
    insertEncounterRow({
      id: 'enc-abandoned-2',
      name: 'Abandoned 2',
      status: EncounterStatus.Draft,
    });

    // 3: orphaned player ref (force was never created — the id points nowhere)
    insertEncounterRow({
      id: 'enc-orphaned-player',
      name: 'Orphaned Player',
      status: EncounterStatus.Draft,
      playerForceJson: {
        forceId: 'force-deleted-player',
        forceName: '',
        totalBV: 0,
        unitCount: 0,
      },
    });

    // 4: orphaned opponent ref (different deleted forceId)
    insertEncounterRow({
      id: 'enc-orphaned-opp',
      name: 'Orphaned Opp',
      status: EncounterStatus.Ready,
      opponentForceJson: {
        forceId: 'force-deleted-opp',
        forceName: '',
        totalBV: 0,
        unitCount: 0,
      },
    });

    // 5: still-valid (Ready, has resolved forces, has opForConfig)
    const validForceId = createForce('Valid Force');
    insertEncounterRow({
      id: 'enc-valid',
      name: 'Valid Encounter',
      status: EncounterStatus.Ready,
      playerForceJson: {
        forceId: validForceId,
        forceName: 'Valid Force',
        totalBV: 4500,
        unitCount: 4,
      },
      opForConfigJson: {
        targetBV: 4500,
        pilotSkillTemplate: PilotSkillTemplate.Veteran,
      },
      victoryConditions: [{ type: VictoryConditionType.Annihilation }],
    });

    const result = await runCleanup({ cwd: testCwd });

    // Manifest exists
    expect(fs.existsSync(result.manifestPath)).toBe(true);
    const manifestRaw = fs.readFileSync(result.manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestRaw) as {
      version: string;
      generatedAt: string;
      totalEncounters: number;
      entries: ManifestEntry[];
    };

    expect(manifest.entries).toHaveLength(5);
    expect(manifest.totalEncounters).toBe(5);

    // Verify per-row classifications
    const byId = new Map(manifest.entries.map((e) => [e.id, e]));
    expect(byId.get('enc-abandoned-1')?.classification).toBe('abandoned-empty');
    expect(byId.get('enc-abandoned-2')?.classification).toBe('abandoned-empty');
    expect(byId.get('enc-orphaned-player')?.classification).toBe(
      'orphaned-force-reference',
    );
    expect(byId.get('enc-orphaned-opp')?.classification).toBe(
      'orphaned-force-reference',
    );
    expect(byId.get('enc-valid')?.classification).toBe('still-valid');

    // Counts
    expect(result.deletedIds).toHaveLength(2);
    expect(result.deletedIds).toEqual(
      expect.arrayContaining(['enc-abandoned-1', 'enc-abandoned-2']),
    );
    // PR 2: orphans ARE repaired now via clearForceReference cascade.
    expect(result.repairedIds).toHaveLength(2);
    expect(result.repairedIds).toEqual(
      expect.arrayContaining(['enc-orphaned-player', 'enc-orphaned-opp']),
    );
    expect(result.retainedIds).toHaveLength(3);

    // DB state confirms the deletions actually happened
    const remaining = encounterRepo.getAllEncounters();
    expect(remaining).toHaveLength(3);
    const remainingIds = remaining.map((e) => e.id);
    expect(remainingIds).not.toContain('enc-abandoned-1');
    expect(remainingIds).not.toContain('enc-abandoned-2');

    // Repaired rows had their dangling force refs NULL'd in place.
    const repairedPlayer = encounterRepo.getEncounterById(
      'enc-orphaned-player',
    );
    const repairedOpp = encounterRepo.getEncounterById('enc-orphaned-opp');
    expect(repairedPlayer?.playerForce).toBeUndefined();
    expect(repairedOpp?.opponentForce).toBeUndefined();
  });

  it('is idempotent — re-running on cleaned DB writes manifest with empty deletedIds', async () => {
    insertEncounterRow({
      id: 'enc-abandoned-only',
      name: 'Abandoned',
      status: EncounterStatus.Draft,
    });
    const validForceId = createForce('Solo Valid');
    insertEncounterRow({
      id: 'enc-valid-only',
      name: 'Valid',
      status: EncounterStatus.Ready,
      playerForceJson: {
        forceId: validForceId,
        forceName: 'Solo Valid',
        totalBV: 4500,
        unitCount: 4,
      },
      opForConfigJson: {
        targetBV: 4500,
        pilotSkillTemplate: PilotSkillTemplate.Veteran,
      },
      victoryConditions: [{ type: VictoryConditionType.Annihilation }],
    });

    // First run deletes the abandoned row
    const firstRun = await runCleanup({ cwd: testCwd });
    expect(firstRun.deletedIds).toEqual(['enc-abandoned-only']);

    // Second run must return empty deletedIds AND not throw
    const secondRun = await runCleanup({ cwd: testCwd });
    expect(secondRun.deletedIds).toEqual([]);
    expect(fs.existsSync(secondRun.manifestPath)).toBe(true);

    // Second manifest still classifies remaining row
    const secondManifest = JSON.parse(
      fs.readFileSync(secondRun.manifestPath, 'utf-8'),
    ) as { entries: ManifestEntry[] };
    expect(secondManifest.entries).toHaveLength(1);
    expect(secondManifest.entries[0]?.classification).toBe('still-valid');
  });

  it('--manifest-only skips deletes — DB unchanged', async () => {
    insertEncounterRow({
      id: 'enc-abandoned-mo',
      name: 'Abandoned MO',
      status: EncounterStatus.Draft,
    });
    insertEncounterRow({
      id: 'enc-abandoned-mo-2',
      name: 'Abandoned MO 2',
      status: EncounterStatus.Draft,
    });

    const result = await runCleanup({ cwd: testCwd, manifestOnly: true });

    expect(result.deletedIds).toEqual([]);
    expect(fs.existsSync(result.manifestPath)).toBe(true);

    // DB still has both rows
    expect(encounterRepo.getAllEncounters()).toHaveLength(2);
  });

  it('manifest entries include every required field', async () => {
    insertEncounterRow({
      id: 'enc-schema-check',
      name: 'Schema Check',
      status: EncounterStatus.Draft,
    });

    const result = await runCleanup({ cwd: testCwd });
    const manifest = JSON.parse(
      fs.readFileSync(result.manifestPath, 'utf-8'),
    ) as { entries: ManifestEntry[] };

    const entry = manifest.entries[0];
    expect(entry).toBeDefined();
    expect(entry).toMatchObject({
      id: 'enc-schema-check',
      name: 'Schema Check',
      status: EncounterStatus.Draft,
      classification: 'abandoned-empty',
    });
    // Every spec-required field is present (presence-check; null is allowed)
    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('name');
    expect(entry).toHaveProperty('description');
    expect(entry).toHaveProperty('status');
    expect(entry).toHaveProperty('playerForce');
    expect(entry).toHaveProperty('opponentForce');
    expect(entry).toHaveProperty('opForConfig');
    expect(entry).toHaveProperty('victoryConditions');
    expect(entry).toHaveProperty('mapConfig');
    expect(entry).toHaveProperty('createdAt');
    expect(entry).toHaveProperty('updatedAt');
    expect(entry).toHaveProperty('classification');
    expect(entry).toHaveProperty('classificationReason');
  });

  it('Launched encounter with empty config is retained (status-gated deletion)', async () => {
    insertEncounterRow({
      id: 'enc-launched-empty',
      name: 'Launched Empty',
      status: EncounterStatus.Launched,
    });

    const result = await runCleanup({ cwd: testCwd });

    expect(result.deletedIds).toEqual([]);
    expect(result.retainedIds).toEqual(['enc-launched-empty']);

    const manifest = JSON.parse(
      fs.readFileSync(result.manifestPath, 'utf-8'),
    ) as { entries: ManifestEntry[] };
    expect(manifest.entries[0]?.classification).toBe('still-valid');
    expect(manifest.entries[0]?.classificationReason).toBe(
      'non-draft encounter retained even though configuration is empty',
    );
  });
});
