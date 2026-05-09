#!/usr/bin/env npx tsx
/**
 * Cleanup Broken Encounters
 *
 * One-time CLI tool that classifies every encounter in the database into
 * one of three buckets:
 *   - 'abandoned-empty'           — Draft + no forces + no opForConfig.
 *                                   Deleted (only when status === Draft).
 *   - 'orphaned-force-reference'  — at least one stored forceId no longer
 *                                   resolves via getForceById. Repaired
 *                                   in-place by NULLing the slot, but ONLY
 *                                   in PR 2 once `clearForceReference` lands.
 *                                   In PR 1, treated the same as 'still-valid'
 *                                   (no repair attempted).
 *   - 'still-valid'               — anything else. Untouched.
 *
 * Writes the full classification manifest to
 *   simulation-reports/cleanup-encounters-<ISO>.json
 * BEFORE any DELETE. Idempotent: re-running on a cleaned DB writes a manifest
 * with `deletedIds: []`.
 *
 * Flags:
 *   --manifest-only        Skip deletes + repairs; only write manifest.
 *   --cwd <path>           Override working dir for manifest output (test).
 *   --help                 Print usage and exit 0.
 *
 * @spec openspec/changes/repair-broken-encounter-drafts/specs/game-session-management/spec.md
 *       (Requirement: One-Time Cleanup Script for Existing Broken Drafts)
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  getEncounterRepository,
  resetEncounterRepository,
  type IEncounterWithRawForceIds,
} from '../src/services/encounter/EncounterRepository';
import {
  getForceRepository,
  resetForceRepository,
} from '../src/services/forces/ForceRepository';
import {
  getSQLiteService,
  resetSQLiteService,
} from '../src/services/persistence/SQLiteService';
import { EncounterStatus, type IEncounter } from '../src/types/encounter';

// =============================================================================
// Public types
// =============================================================================

export type CleanupClassification =
  | 'abandoned-empty'
  | 'orphaned-force-reference'
  | 'still-valid';

export interface ClassificationResult {
  readonly classification: CleanupClassification;
  readonly reason: string;
}

export interface ManifestEntry {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: string;
  readonly playerForce: IEncounter['playerForce'] | null;
  readonly opponentForce: IEncounter['opponentForce'] | null;
  readonly opForConfig: IEncounter['opForConfig'] | null;
  readonly victoryConditions: IEncounter['victoryConditions'];
  readonly mapConfig: IEncounter['mapConfig'];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly classification: CleanupClassification;
  readonly classificationReason: string;
}

export interface CleanupResult {
  readonly manifestPath: string;
  readonly deletedIds: readonly string[];
  readonly repairedIds: readonly string[];
  readonly retainedIds: readonly string[];
}

export interface CleanupOptions {
  readonly cwd?: string;
  readonly manifestOnly?: boolean;
}

// =============================================================================
// Pure classification helper (testable in isolation)
// =============================================================================

/**
 * Classify a single encounter.
 *
 * Pure function — does not mutate inputs. Caller supplies the hydrated
 * encounter, the raw stored force ids (so we can detect "ref stored, force
 * gone"), and a `getForceById` resolver.
 *
 * Status-gated deletion: an encounter that *would* classify as
 * abandoned-empty BUT has status !== Draft (i.e. Launched / Completed)
 * SHALL classify as 'still-valid' instead, with a distinguishing reason
 * string. Per the spec: "non-draft encounter retained even though
 * configuration is empty".
 */
export function classifyEncounter(
  encounter: IEncounter,
  rawForceIds: { playerForceId: string | null; opponentForceId: string | null },
  getForceById: (id: string) => unknown | null,
): ClassificationResult {
  const isDraft = encounter.status === EncounterStatus.Draft;
  const hasNoPlayerForce = !encounter.playerForce;
  const hasNoOpponentForce = !encounter.opponentForce;
  const hasNoOpForConfig = !encounter.opForConfig;
  const hasNoStoredPlayerId = rawForceIds.playerForceId === null;
  const hasNoStoredOpponentId = rawForceIds.opponentForceId === null;

  // --- abandoned-empty branch ---
  // Empty configuration AND no stored ids (a stored id with missing force
  // is the orphaned branch, not abandoned).
  const configurationIsEmpty =
    hasNoPlayerForce &&
    hasNoOpponentForce &&
    hasNoOpForConfig &&
    hasNoStoredPlayerId &&
    hasNoStoredOpponentId;

  if (configurationIsEmpty) {
    if (!isDraft) {
      return {
        classification: 'still-valid',
        reason:
          'non-draft encounter retained even though configuration is empty',
      };
    }
    return {
      classification: 'abandoned-empty',
      reason: 'no forces and no opfor config — never finished setup',
    };
  }

  // --- orphaned-force-reference branch ---
  const playerOrphan =
    rawForceIds.playerForceId !== null &&
    getForceById(rawForceIds.playerForceId) === null;
  const opponentOrphan =
    rawForceIds.opponentForceId !== null &&
    getForceById(rawForceIds.opponentForceId) === null;

  if (playerOrphan || opponentOrphan) {
    const reasons: string[] = [];
    if (playerOrphan) {
      reasons.push(`player force ${rawForceIds.playerForceId} deleted`);
    }
    if (opponentOrphan) {
      reasons.push(`opponent force ${rawForceIds.opponentForceId} deleted`);
    }
    return {
      classification: 'orphaned-force-reference',
      reason: reasons.join('; '),
    };
  }

  // --- still-valid branch ---
  return {
    classification: 'still-valid',
    reason: 'configuration intact',
  };
}

// =============================================================================
// Manifest construction
// =============================================================================

function buildManifestEntry(
  encounter: IEncounter,
  result: ClassificationResult,
): ManifestEntry {
  return {
    id: encounter.id,
    name: encounter.name,
    description: encounter.description ?? null,
    status: encounter.status,
    playerForce: encounter.playerForce ?? null,
    opponentForce: encounter.opponentForce ?? null,
    opForConfig: encounter.opForConfig ?? null,
    victoryConditions: encounter.victoryConditions,
    mapConfig: encounter.mapConfig,
    createdAt: encounter.createdAt,
    updatedAt: encounter.updatedAt,
    classification: result.classification,
    classificationReason: result.reason,
  };
}

function manifestFilename(now: Date = new Date()): string {
  // Replace ':' with '-' for Windows filename safety.
  return `cleanup-encounters-${now.toISOString().replace(/:/g, '-')}.json`;
}

// =============================================================================
// Main driver
// =============================================================================

/**
 * Run the cleanup classification + (optionally) deletion pass.
 *
 * 1. Read every encounter (with raw force ids).
 * 2. Classify each.
 * 3. Write the full manifest to simulation-reports/cleanup-encounters-<ISO>.json.
 * 4. If !manifestOnly: delete every abandoned-empty row.
 *    Orphaned rows are NOT repaired in PR 1 (clearForceReference lands in PR 2).
 *
 * Idempotent: re-running on a cleaned DB writes a fresh manifest with empty
 * deletedIds.
 */
export async function runCleanup(
  options: CleanupOptions = {},
): Promise<CleanupResult> {
  const cwd = options.cwd ?? process.cwd();
  const manifestOnly = options.manifestOnly ?? false;

  const repo = getEncounterRepository();
  const forceRepo = getForceRepository();
  const rows = repo.getAllEncountersWithRawIds();

  // Classify every row.
  const entries: ManifestEntry[] = rows.map(
    (entry: IEncounterWithRawForceIds) => {
      const result = classifyEncounter(
        entry.encounter,
        entry.rawForceIds,
        (id: string) => forceRepo.getForceById(id),
      );
      return buildManifestEntry(entry.encounter, result);
    },
  );

  // Write manifest BEFORE any DELETE.
  const reportsDir = path.join(cwd, 'simulation-reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const manifestPath = path.join(reportsDir, manifestFilename());
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        totalEncounters: entries.length,
        entries,
      },
      null,
      2,
    ),
    'utf-8',
  );

  if (manifestOnly) {
    return {
      manifestPath,
      deletedIds: [],
      repairedIds: [],
      retainedIds: entries.map((e) => e.id),
    };
  }

  // Delete abandoned-empty rows (status-gated to Draft via classification).
  const deletedIds: string[] = [];
  for (const entry of entries) {
    if (entry.classification === 'abandoned-empty') {
      const result = repo.deleteEncounter(entry.id);
      if (result.success) {
        deletedIds.push(entry.id);
      }
    }
  }

  // PR 1: orphaned rows are NOT repaired here (no clearForceReference yet).
  // TODO(PR 2): wire orphaned-branch repair via repo.clearForceReference.
  const repairedIds: string[] = [];

  const retainedIds = entries
    .filter((e) => !deletedIds.includes(e.id))
    .map((e) => e.id);

  return {
    manifestPath,
    deletedIds,
    repairedIds,
    retainedIds,
  };
}

// =============================================================================
// CLI entry point
// =============================================================================

interface CliArgs {
  manifestOnly: boolean;
  cwd: string | undefined;
  help: boolean;
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = { manifestOnly: false, cwd: undefined, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--manifest-only') {
      args.manifestOnly = true;
    } else if (arg === '--cwd') {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('--cwd requires a path argument');
      }
      args.cwd = next;
      i++;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

const USAGE = `cleanup-broken-encounters — classify and clean up broken encounter rows

USAGE
  npx tsx scripts/cleanup-broken-encounters.ts [options]

OPTIONS
  --manifest-only        Write classification manifest but skip deletes/repairs.
  --cwd <path>           Override working directory for manifest output.
  --help, -h             Show this message and exit.

OUTPUT
  Writes simulation-reports/cleanup-encounters-<ISO>.json containing the full
  classification + classificationReason for every encounter row in the DB.
  When --manifest-only is NOT set, additionally deletes every encounter row
  classified as 'abandoned-empty' (status === Draft AND no configuration).

CLASSIFICATION
  abandoned-empty            Draft + no forces + no opForConfig — DELETE.
  orphaned-force-reference   forceId stored but force was deleted — RETAIN
                             (PR 2 will repair these in-place).
  still-valid                everything else — RETAIN.
`;

async function cliMain(): Promise<void> {
  let args: CliArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'argument parse error';
    process.stderr.write(`error: ${message}\n\n${USAGE}`);
    process.exit(1);
  }

  if (args.help) {
    process.stdout.write(USAGE);
    process.exit(0);
  }

  // Initialize singletons. The script targets the user's actual SQLite DB
  // unless tests inject a fresh one before calling runCleanup directly.
  resetSQLiteService();
  resetEncounterRepository();
  resetForceRepository();
  getSQLiteService().initialize();

  const result = await runCleanup({
    cwd: args.cwd,
    manifestOnly: args.manifestOnly,
  });

  process.stdout.write(
    `Cleanup complete.\n` +
      `  manifest:  ${result.manifestPath}\n` +
      `  deleted:   ${result.deletedIds.length}\n` +
      `  repaired:  ${result.repairedIds.length}\n` +
      `  retained:  ${result.retainedIds.length}\n`,
  );
}

if (require.main === module) {
  cliMain().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`cleanup-broken-encounters failed: ${message}\n`);
    process.exit(1);
  });
}
