#!/usr/bin/env npx tsx
/**
 * Scenario Pack Nightly Recapture — core logic (task 6.1, design D7 layer
 * 4 / R6 / R9).
 *
 * Typed sidecar `scripts/qc/recapture-scenario-packs.mjs` spawns via `tsx`
 * (the `list-flow-audit.ts` / `validate-flow-audit.mjs` precedent) so this
 * file can import the pack library's real zod schemas, the manifest module,
 * and W3's `comparableRunState` invariant comparator directly — no
 * hand-duplicated field lists, no re-typed schema shapes.
 *
 * For every registered pack, three things happen (design D7 layer 4 /
 * spec: "Version Pinning and CI Drift Recapture"):
 *
 *  (a) **Re-validate the committed payload** against the current pack
 *      schemas and all three pins (envelope `schemaVersion`, encounter
 *      `matchLogDbVersion`, registry `manifestVersion`) — catches schema/pin
 *      evolution that staled a committed pack.
 *  (b) **Re-mint from the recorded genesis source** — delegates to
 *      `scripts/qc/mint-scenario-pack.mjs <packId>` (task 3.2/4.2/5.1's
 *      minter, the ONLY way pack payloads are written) so this job never
 *      hand-rolls a second minting path — then validates the fresh mint
 *      identically.
 *  (c) **Compare fresh mint vs committed at the invariant level, per
 *      genesis class** (design D7 — never byte-structural, which the tree
 *      makes unachievable by construction):
 *        - `flow:` (flow-checkpoint) packs: the checkpoint's declared
 *          invariant predicate is asserted independently on BOTH payloads
 *          (run-generic predicates — a re-mint legitimately rolls a
 *          different contract/market, so amount-level equality would be
 *          dishonest).
 *        - `anchor:` (anchor-captured / matchlog) packs: the anchor's
 *          seed-agnostic invariant set (mirrored canonical unitRef pair,
 *          distinct deployed ids, no manufactured terminal outcome) is
 *          asserted independently on BOTH payloads — the engine seed is
 *          wall-clock-fresh per capture, so roll-level equality is never
 *          asserted.
 *        - `fast-forward:` packs: the fresh re-mint's recorded
 *          `invariantSummary` (W3's `ComparableRunState`, task 5.1/5.2) is
 *          compared FIELD-BY-FIELD against the committed provenance
 *          sidecar's `invariantSummary` via `assertRunStatesEqual` — the
 *          SAME comparator and SAME `SEAM_INVARIANT_FIELDS` W3's own
 *          determinism/live-parity suites use (deterministic per fixture,
 *          design D4/D7's shared field enumeration).
 *
 * The re-mint step OVERWRITES the committed payload (+ provenance sidecar,
 * where one exists) on disk — `captureCanonicalizeAndWrite` /
 * `dumpAndCanonicalizeFastForwardCampaign`'s write path has no "dry run"
 * mode, and duplicating it here would be exactly the second minting path
 * the spec forbids ("Packs Are Generator-Minted, Never Hand-Authored").
 * Every pack's original file bytes are read into memory BEFORE re-minting
 * and restored in a `finally` block AFTER comparison — a local recapture
 * run must never leave the working tree dirty (task 6.1 acceptance: "run
 * locally against the committed packs" is meant to be re-runnable).
 *
 * Payload sizes are reported for every pack (design R6 — "the recapture job
 * reports payload sizes so growth is visible").
 *
 * No structural-diff normalization list exists anywhere in this file
 * (design D7: "the script contains no structural-diff normalization list
 * at all — there is nothing to widen") — every comparison is either a zod
 * schema/pin check or one of the small number of named, per-genesis-class
 * invariant predicates above.
 *
 * Usage:
 *   npx tsx scripts/qc/recapture-scenario-packs-core.ts [--pack <id>[,<id>...]] [--json]
 *   (normally invoked via `node scripts/qc/recapture-scenario-packs.mjs`)
 *
 * @spec openspec/changes/add-scenario-packs/specs/scenario-packs/spec.md
 * @spec openspec/changes/add-scenario-packs/design.md (D7, R6, R9)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  manifestVersion,
  SCENARIO_PACK_MANIFEST,
} from '../../e2e/scenario-packs/manifest';
import {
  assertRunStatesEqual,
  type ComparableRunState,
} from '../../src/lib/campaign/fastForward/invariants/comparableRunState';
import { CURRENT_CAMPAIGN_SCHEMA_VERSION } from '../../src/lib/campaign/persistence/campaignMigration';
import { MATCH_LOG_DB_VERSION } from '../../src/lib/p2p/matchLogStorageSchema';
import {
  campaignPackSchema,
  encounterPackSchema,
  MANIFEST_VERSION,
  type ManifestEntry,
} from '../../src/lib/scenarioPacks/packSchemas';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCENARIO_PACKS_DIR = path.join(REPO_ROOT, 'e2e', 'scenario-packs');
const MINT_SCRIPT_PATH = path.join(
  REPO_ROOT,
  'scripts',
  'qc',
  'mint-scenario-pack.mjs',
);

// Referenced only for the doc comment above / readers cross-checking the
// production ceiling this file's schema re-validation rides on.
void CURRENT_CAMPAIGN_SCHEMA_VERSION;

// =============================================================================
// File backup/restore — a local recapture run must not dirty the tree
// =============================================================================

interface FileBackup {
  readonly absolutePath: string;
  readonly existed: boolean;
  readonly content: string | null;
}

function backupFile(absolutePath: string): FileBackup {
  if (!fs.existsSync(absolutePath)) {
    return { absolutePath, existed: false, content: null };
  }
  return {
    absolutePath,
    existed: true,
    content: fs.readFileSync(absolutePath, 'utf8'),
  };
}

/** Restores the exact pre-remint state: rewrite original bytes, or delete a file the remint newly created. */
function restoreFile(backup: FileBackup): void {
  if (backup.existed) {
    fs.writeFileSync(backup.absolutePath, backup.content!, 'utf8');
  } else if (fs.existsSync(backup.absolutePath)) {
    fs.unlinkSync(backup.absolutePath);
  }
}

/** `campaign/<id>.campaign.json` -> `campaign/<id>.provenance.json` (mirrors every minter's own sidecar-naming convention). */
function provenancePathFor(payloadAbsolutePath: string): string {
  return payloadAbsolutePath.replace(
    /\.(campaign|matchlog)\.json$/,
    '.provenance.json',
  );
}

// =============================================================================
// Genesis-class dispatch (design D9's parityAnchorJourney prefixes == D7's
// three genesis classes, 1:1)
// =============================================================================

type GenesisClass = 'flow-checkpoint' | 'anchor-captured' | 'fast-forward';

function classifyGenesisSource(parityAnchorJourney: string): GenesisClass {
  if (parityAnchorJourney.startsWith('flow:')) return 'flow-checkpoint';
  if (parityAnchorJourney.startsWith('anchor:')) return 'anchor-captured';
  if (parityAnchorJourney.startsWith('fast-forward:')) return 'fast-forward';
  // Unreachable given parityAnchorJourneySchema's regex (already enforced at
  // manifest module load) — fail loud rather than silently falling through
  // to no comparison at all if a fourth prefix is ever added to the schema
  // without a matching genesis class here.
  throw new Error(
    `recapture-scenario-packs: unrecognized parityAnchorJourney prefix on "${parityAnchorJourney}" — add a genesis class + invariant predicate before registering this pack`,
  );
}

// =============================================================================
// (a)/(b) Schema + pin re-validation (design D7 layer 3, spec: "Version
// Pinning and CI Drift Recapture")
// =============================================================================

interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

interface ValidationResult {
  readonly ok: boolean;
  readonly issues: readonly ValidationIssue[];
}

function validatePayloadAgainstSchemaAndPins(
  entry: ManifestEntry,
  raw: unknown,
): ValidationResult {
  if (entry.kind === 'campaign') {
    const parsed = campaignPackSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.') || '(root)',
          message: issue.message,
        })),
      };
    }
    const issues: ValidationIssue[] = [];
    // The zod schema itself already rejects schemaVersion > CURRENT (design
    // D3's "future version fails loud"); the pin CONSULTATION SITE this job
    // exists to prove is the manifest's OWN declared pin staying equal to
    // what the committed/fresh payload actually carries.
    if (parsed.data.schemaVersion !== entry.pins.schemaVersion) {
      issues.push({
        path: 'schemaVersion',
        message: `payload schemaVersion ${parsed.data.schemaVersion} does not equal the manifest's pinned schemaVersion ${entry.pins.schemaVersion}`,
      });
    }
    return { ok: issues.length === 0, issues };
  }

  const parsed = encounterPackSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.') || '(root)',
        message: issue.message,
      })),
    };
  }
  const issues: ValidationIssue[] = [];
  // Strict equality in EITHER direction (design D3: "no ladder exists for
  // the match-log store") — never a <=/>= tolerance like the campaign pin.
  if (entry.pins.matchLogDbVersion !== MATCH_LOG_DB_VERSION) {
    issues.push({
      path: 'pins.matchLogDbVersion',
      message: `manifest pin ${entry.pins.matchLogDbVersion} does not strictly equal the live MATCH_LOG_DB_VERSION (${MATCH_LOG_DB_VERSION})`,
    });
  }
  return { ok: issues.length === 0, issues };
}

// =============================================================================
// (c) Flow-checkpoint invariant predicates — one per registered flow pack,
// asserted independently on both the committed and the fresh payload
// (design D7: "run-generic predicates... asserted on both payloads").
// Deliberately per-pack (not generic): each checkpoint's invariant is its
// OWN declared fact, not a shared shape — see the flow-checkpoint packs'
// own parity specs for the same assertion expressed against the live DOM.
// =============================================================================

type FlowCheckpointPredicate = (raw: unknown, label: string) => void;

const FLOW_CHECKPOINT_INVARIANTS: Readonly<
  Record<string, FlowCheckpointPredicate>
> = {
  'navigation-briefing': (raw, label) => {
    const body = (raw as { body?: { missions?: readonly unknown[] } }).body;
    const missionCount = body?.missions?.length ?? 0;
    if (missionCount < 1) {
      throw new Error(
        `${label}: navigation-briefing invariant violated — expected >=1 mission on body.missions (a contract was accepted), found ${missionCount}`,
      );
    }
  },
  'personnel-roster': (raw, label) => {
    const body = (
      raw as {
        body?: { rosterProjection?: { pilots?: readonly unknown[] } };
      }
    ).body;
    const pilotCount = body?.rosterProjection?.pilots?.length ?? 0;
    if (pilotCount < 1) {
      throw new Error(
        `${label}: personnel-roster invariant violated — expected >=1 pilot on body.rosterProjection.pilots (the roster was updated), found ${pilotCount}`,
      );
    }
  },
  'experience-pilot': (raw, label) => {
    const name = (
      raw as {
        standalonePilot?: { createRequest?: { identity?: { name?: string } } };
      }
    ).standalonePilot?.createRequest?.identity?.name;
    if (!name) {
      throw new Error(
        `${label}: experience-pilot invariant violated — expected standalonePilot.createRequest.identity.name to be present on the payload`,
      );
    }
  },
};

function assertFlowCheckpointInvariant(
  packId: string,
  raw: unknown,
  label: string,
): void {
  const predicate = FLOW_CHECKPOINT_INVARIANTS[packId];
  if (!predicate) {
    // Fail loud rather than silently skipping comparison for a pack nobody
    // wired a predicate for (design's fail-loud posture, never soft-skip).
    throw new Error(
      `recapture-scenario-packs: no flow-checkpoint invariant predicate registered for pack "${packId}" — add one to FLOW_CHECKPOINT_INVARIANTS in recapture-scenario-packs-core.ts before this pack can be trusted by the nightly job`,
    );
  }
  predicate(raw, label);
}

// =============================================================================
// (c) Anchor-captured (matchlog) seed-agnostic invariant set — generic
// across every anchor-captured pack (unlike the flow-checkpoint predicates
// above, every matchlog pack's genesis is the SAME recovery-rehydration
// contract: mirrored canonical unitRef pair, distinct deployed ids, no
// manufactured terminal outcome — mirrors combat-midbattle.parity.spec.ts's
// own DOM-level assertions, expressed here at the payload level since the
// recapture job never launches a browser to read them).
// =============================================================================

interface CapturedGameUnit {
  readonly id: string;
  readonly side: string;
  readonly unitRef: string;
}
interface CapturedEvent {
  readonly type: string;
  readonly payload?: { readonly units?: readonly CapturedGameUnit[] };
}

function assertMatchlogSeedAgnosticInvariants(
  raw: unknown,
  label: string,
): void {
  const events = (raw as { events?: readonly CapturedEvent[] }).events ?? [];
  const created = events[0];
  if (!created || created.type !== 'game_created') {
    throw new Error(
      `${label}: matchlog invariant violated — sequence-0 event is not game_created`,
    );
  }
  const units = created.payload?.units ?? [];
  if (units.length === 0) {
    throw new Error(
      `${label}: matchlog invariant violated — the game_created payload carries no units`,
    );
  }
  const deployedIds = units.map((unit) => unit.id);
  if (new Set(deployedIds).size !== deployedIds.length) {
    throw new Error(
      `${label}: matchlog invariant violated — deployed unit ids are not distinct (id-collision signature)`,
    );
  }
  const playerRefCounts = new Map<string, number>();
  for (const unit of units) {
    if (unit.side !== 'player') continue;
    playerRefCounts.set(
      unit.unitRef,
      (playerRefCounts.get(unit.unitRef) ?? 0) + 1,
    );
  }
  const hasMirroredPair = Array.from(playerRefCounts.values()).some(
    (count) => count >= 2,
  );
  if (!hasMirroredPair) {
    throw new Error(
      `${label}: matchlog invariant violated — no mirrored canonical unitRef pair found on the player side`,
    );
  }
  if (events.some((event) => event.type === 'game_ended')) {
    throw new Error(
      `${label}: matchlog invariant violated — capture carries a manufactured terminal outcome (a game_ended event is present)`,
    );
  }
}

// =============================================================================
// Per-pack recapture (a -> b -> c, backup/restore around the re-mint)
// =============================================================================

interface PackRecaptureResult {
  readonly packId: string;
  readonly ok: boolean;
  readonly issues: readonly string[];
  readonly committedSizeBytes: number;
  readonly freshSizeBytes: number | null;
}

function formatKB(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function recapturePack(
  entry: ManifestEntry,
): Promise<PackRecaptureResult> {
  const payloadAbsolutePath = path.join(SCENARIO_PACKS_DIR, entry.payloadPath);
  const provenanceAbsolutePath = provenancePathFor(payloadAbsolutePath);

  if (!fs.existsSync(payloadAbsolutePath)) {
    return {
      packId: entry.id,
      ok: false,
      issues: [
        `${entry.id}: committed payload file missing at ${payloadAbsolutePath}`,
      ],
      committedSizeBytes: 0,
      freshSizeBytes: null,
    };
  }

  const payloadBackup = backupFile(payloadAbsolutePath);
  const provenanceBackup = backupFile(provenanceAbsolutePath);
  const committedSizeBytes = Buffer.byteLength(payloadBackup.content!, 'utf8');
  const genesisClass = classifyGenesisSource(entry.parityAnchorJourney);
  const issues: string[] = [];

  try {
    // (a) re-validate the committed payload against schema + pins.
    const committedRaw: unknown = JSON.parse(payloadBackup.content!);
    const committedValidation = validatePayloadAgainstSchemaAndPins(
      entry,
      committedRaw,
    );
    if (!committedValidation.ok) {
      for (const issue of committedValidation.issues) {
        issues.push(
          `${entry.id}: committed payload invalid at "${issue.path}": ${issue.message}`,
        );
      }
      return {
        packId: entry.id,
        ok: false,
        issues,
        committedSizeBytes,
        freshSizeBytes: null,
      };
    }

    // (c, committed side) — flow-checkpoint/anchor predicates run on the
    // committed payload too (design: "asserted on both payloads"); a
    // committed pack that no longer satisfies its own genesis invariant is
    // exactly the drift this job exists to catch, independent of any
    // re-mint.
    if (genesisClass === 'flow-checkpoint') {
      try {
        assertFlowCheckpointInvariant(
          entry.id,
          committedRaw,
          `${entry.id} (committed)`,
        );
      } catch (error) {
        issues.push((error as Error).message);
      }
    } else if (genesisClass === 'anchor-captured') {
      try {
        assertMatchlogSeedAgnosticInvariants(
          committedRaw,
          `${entry.id} (committed)`,
        );
      } catch (error) {
        issues.push((error as Error).message);
      }
    }
    if (issues.length > 0) {
      return {
        packId: entry.id,
        ok: false,
        issues,
        committedSizeBytes,
        freshSizeBytes: null,
      };
    }

    // (b) re-mint from the recorded genesis source — the ONLY minting path
    // (scripts/qc/mint-scenario-pack.mjs), never a second hand-rolled one.
    const mintResult = spawnSync(
      process.execPath,
      [MINT_SCRIPT_PATH, entry.id],
      { cwd: REPO_ROOT, stdio: 'inherit' },
    );
    if (mintResult.error) {
      issues.push(
        `${entry.id}: re-mint failed to spawn: ${mintResult.error.message}`,
      );
      return {
        packId: entry.id,
        ok: false,
        issues,
        committedSizeBytes,
        freshSizeBytes: null,
      };
    }
    if (mintResult.status !== 0) {
      issues.push(
        `${entry.id}: re-mint exited nonzero (${mintResult.status ?? `signal ${mintResult.signal}`})`,
      );
      return {
        packId: entry.id,
        ok: false,
        issues,
        committedSizeBytes,
        freshSizeBytes: null,
      };
    }
    if (!fs.existsSync(payloadAbsolutePath)) {
      issues.push(
        `${entry.id}: re-mint reported success but wrote no payload file at ${payloadAbsolutePath}`,
      );
      return {
        packId: entry.id,
        ok: false,
        issues,
        committedSizeBytes,
        freshSizeBytes: null,
      };
    }

    const freshContent = fs.readFileSync(payloadAbsolutePath, 'utf8');
    const freshSizeBytes = Buffer.byteLength(freshContent, 'utf8');
    const freshRaw: unknown = JSON.parse(freshContent);

    const freshValidation = validatePayloadAgainstSchemaAndPins(
      entry,
      freshRaw,
    );
    if (!freshValidation.ok) {
      for (const issue of freshValidation.issues) {
        issues.push(
          `${entry.id}: fresh re-mint payload invalid at "${issue.path}": ${issue.message}`,
        );
      }
      return {
        packId: entry.id,
        ok: false,
        issues,
        committedSizeBytes,
        freshSizeBytes,
      };
    }

    // (c) invariant-level comparison, dispatched by genesis class.
    if (genesisClass === 'flow-checkpoint') {
      try {
        assertFlowCheckpointInvariant(
          entry.id,
          freshRaw,
          `${entry.id} (fresh re-mint)`,
        );
      } catch (error) {
        issues.push((error as Error).message);
      }
    } else if (genesisClass === 'anchor-captured') {
      try {
        assertMatchlogSeedAgnosticInvariants(
          freshRaw,
          `${entry.id} (fresh re-mint)`,
        );
      } catch (error) {
        issues.push((error as Error).message);
      }
    } else {
      // fast-forward: compare the fresh re-mint's recorded invariantSummary
      // against the committed provenance sidecar's — field-by-field, via
      // the SAME comparator + field set W3's own determinism/live-parity
      // suites use (never a bespoke re-implementation).
      if (!provenanceBackup.existed) {
        issues.push(
          `${entry.id}: no committed provenance.json to compare against — fast-forward packs require a committed invariantSummary (task 5.1/5.2)`,
        );
      } else if (!fs.existsSync(provenanceAbsolutePath)) {
        issues.push(
          `${entry.id}: fresh re-mint wrote no provenance.json at ${provenanceAbsolutePath}`,
        );
      } else {
        const committedProvenance = JSON.parse(provenanceBackup.content!) as {
          readonly invariantSummary?: ComparableRunState;
        };
        const freshProvenance = JSON.parse(
          fs.readFileSync(provenanceAbsolutePath, 'utf8'),
        ) as { readonly invariantSummary?: ComparableRunState };
        if (!committedProvenance.invariantSummary) {
          issues.push(
            `${entry.id}: committed provenance.json carries no invariantSummary field`,
          );
        } else if (!freshProvenance.invariantSummary) {
          issues.push(
            `${entry.id}: fresh re-mint's provenance.json carries no invariantSummary field`,
          );
        } else {
          try {
            assertRunStatesEqual(
              freshProvenance.invariantSummary,
              committedProvenance.invariantSummary,
              {
                labelA: `${entry.id} fresh re-mint`,
                labelB: `${entry.id} committed`,
                consequenceMessage:
                  'A divergence here is genuine drift (W3 determinism-contract regression or an intended fixture change) — triage per design D7, never absorbed by widening this comparator.',
              },
            );
          } catch (error) {
            issues.push((error as Error).message);
          }
        }
      }
    }

    return {
      packId: entry.id,
      ok: issues.length === 0,
      issues,
      committedSizeBytes,
      freshSizeBytes,
    };
  } finally {
    // Always restore, pass or fail — a local recapture run must be
    // re-runnable and must never leave a dirty working tree (task 6.1/6.3
    // acceptance).
    restoreFile(payloadBackup);
    restoreFile(provenanceBackup);
  }
}

// =============================================================================
// Entry point
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const packFlagIndex = args.indexOf('--pack');
  const packFilter =
    packFlagIndex >= 0 && args[packFlagIndex + 1]
      ? args[packFlagIndex + 1]
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : null;

  // Registry-level pin (design D7 layer 3's third named pin) — checked once,
  // before any per-pack work, since a mismatch here means nothing else in
  // the registry can be trusted.
  if (manifestVersion !== MANIFEST_VERSION) {
    console.error(
      `[recapture-scenario-packs] FATAL: registry manifestVersion (${manifestVersion}) does not equal the pack library's exported MANIFEST_VERSION (${MANIFEST_VERSION})`,
    );
    process.exitCode = 1;
    return;
  }

  if (packFilter) {
    const unknown = packFilter.filter(
      (id) => !SCENARIO_PACK_MANIFEST.some((entry) => entry.id === id),
    );
    if (unknown.length > 0) {
      console.error(
        `[recapture-scenario-packs] FATAL: unknown --pack id(s): ${unknown.join(', ')}`,
      );
      process.exitCode = 1;
      return;
    }
  }

  const entries = packFilter
    ? SCENARIO_PACK_MANIFEST.filter((entry) => packFilter.includes(entry.id))
    : SCENARIO_PACK_MANIFEST;

  console.log(
    `[recapture-scenario-packs] re-capturing ${entries.length} pack(s): ${entries.map((e) => e.id).join(', ')}`,
  );

  const results: PackRecaptureResult[] = [];
  for (const entry of entries) {
    console.log(
      `\n[recapture-scenario-packs] === ${entry.id} (${entry.kind}, genesis: ${entry.parityAnchorJourney}) ===`,
    );
    // eslint-disable-next-line no-await-in-loop -- packs re-mint sequentially by design (chromium-only, workers=1, design R9); parallel re-mints would contend the same shared dev server / SQLite file.
    const result = await recapturePack(entry);
    results.push(result);
    const sizeReport =
      result.freshSizeBytes !== null
        ? `committed=${formatKB(result.committedSizeBytes)} fresh=${formatKB(result.freshSizeBytes)}`
        : `committed=${formatKB(result.committedSizeBytes)}`;
    console.log(
      `[recapture-scenario-packs] ${entry.id}: ${sizeReport} -> ${result.ok ? 'PASS' : 'FAIL'}`,
    );
    if (!result.ok) {
      for (const issue of result.issues) console.error(`  - ${issue}`);
    }
  }

  const failed = results.filter((result) => !result.ok);
  console.log(
    `\n[recapture-scenario-packs] ${results.length - failed.length}/${results.length} pack(s) passed.`,
  );
  if (jsonMode) {
    console.log(JSON.stringify({ results }, null, 2));
  }
  if (failed.length > 0) {
    console.error(
      `[recapture-scenario-packs] FAILED pack(s): ${failed.map((r) => r.packId).join(', ')}`,
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[recapture-scenario-packs] fatal error:', error);
  process.exitCode = 1;
});
