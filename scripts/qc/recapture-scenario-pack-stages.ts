/**
 * Stage helpers for scenario-pack recapture — keeps `recapturePack` under
 * complexity/nesting maintain thresholds while preserving behavior.
 */
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import type { IScenarioPackQuarantine } from '../../e2e/scenario-packs/quarantine';
import type { ManifestEntry } from '../../src/lib/scenarioPacks/packSchemas';

import {
  assertRunStatesEqual,
  type ComparableRunState,
} from '../../src/lib/campaign/fastForward/invariants/comparableRunState';

export type GenesisClass =
  | 'flow-checkpoint'
  | 'anchor-captured'
  | 'campaign-anchor'
  | 'fast-forward';

export function classifyGenesisSource(entry: ManifestEntry): GenesisClass {
  if (entry.parityAnchorJourney.startsWith('flow:')) return 'flow-checkpoint';
  if (entry.parityAnchorJourney.startsWith('anchor:')) {
    return entry.kind === 'encounter' ? 'anchor-captured' : 'campaign-anchor';
  }
  if (entry.parityAnchorJourney.startsWith('fast-forward:'))
    return 'fast-forward';
  throw new Error(
    `Unrecognized genesis source for ${entry.id}: ${entry.parityAnchorJourney}`,
  );
}

export interface FileBackup {
  readonly absolutePath: string;
  readonly existed: boolean;
  readonly content: string | null;
}

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly ok: boolean;
  readonly issues: readonly ValidationIssue[];
}

export interface PackRecaptureResult {
  readonly packId: string;
  readonly status: 'PASS' | 'FAIL' | 'QUARANTINED';
  readonly ok: boolean;
  readonly quarantine?: IScenarioPackQuarantine;
  readonly issues: readonly string[];
  readonly committedSizeBytes: number;
  readonly freshSizeBytes: number | null;
}

export interface IPackRecaptureSummary {
  readonly passed: number;
  readonly failed: number;
  readonly quarantined: number;
  readonly total: number;
  readonly ok: boolean;
}

export interface RecaptureStageDeps {
  readonly validatePayloadAgainstSchemaAndPins: (
    entry: ManifestEntry,
    raw: unknown,
  ) => ValidationResult;
  readonly assertFlowCheckpointInvariant: (
    packId: string,
    raw: unknown,
    label: string,
  ) => void;
  readonly assertMatchlogSeedAgnosticInvariants: (
    raw: unknown,
    label: string,
  ) => void;
  readonly deriveComparableTransactions: (raw: unknown) => unknown[];
  readonly deriveImpliedStartingBalanceCents: (raw: unknown) => number;
  readonly mintScriptPath: string;
  readonly repoRoot: string;
}

function failResult(
  packId: string,
  issues: readonly string[],
  committedSizeBytes: number,
  freshSizeBytes: number | null = null,
): PackRecaptureResult {
  return {
    packId,
    status: 'FAIL',
    ok: false,
    issues,
    committedSizeBytes,
    freshSizeBytes,
  };
}

function pushValidationIssues(
  packId: string,
  label: string,
  validation: ValidationResult,
  issues: string[],
): void {
  for (const issue of validation.issues) {
    issues.push(`${packId}: ${label} at "${issue.path}": ${issue.message}`);
  }
}

function catchToIssues(run: () => void, issues: string[]): void {
  try {
    run();
  } catch (error) {
    issues.push((error as Error).message);
  }
}

export function assertCommittedGenesisInvariants(
  entry: ManifestEntry,
  genesisClass: GenesisClass,
  committedRaw: unknown,
  issues: string[],
  deps: RecaptureStageDeps,
): void {
  if (genesisClass === 'flow-checkpoint') {
    catchToIssues(
      () =>
        deps.assertFlowCheckpointInvariant(
          entry.id,
          committedRaw,
          `${entry.id} (committed)`,
        ),
      issues,
    );
    return;
  }
  if (genesisClass === 'anchor-captured') {
    catchToIssues(
      () =>
        deps.assertMatchlogSeedAgnosticInvariants(
          committedRaw,
          `${entry.id} (committed)`,
        ),
      issues,
    );
  }
  if (genesisClass === 'campaign-anchor') {
    issues.push(
      `${entry.id}: unsupported campaign-anchor genesis (${entry.provenance.genesisSource}); no sanctioned co-op minter or campaign checkpoint invariant is registered. Requires the co-op owner's front-door capture contract; this campaign is not a combat match log.`,
    );
  }
}

export function assertFreshGenesisInvariants(
  entry: ManifestEntry,
  genesisClass: GenesisClass,
  freshRaw: unknown,
  issues: string[],
  deps: RecaptureStageDeps,
): void {
  if (genesisClass === 'flow-checkpoint') {
    catchToIssues(
      () =>
        deps.assertFlowCheckpointInvariant(
          entry.id,
          freshRaw,
          `${entry.id} (fresh re-mint)`,
        ),
      issues,
    );
    return;
  }
  if (genesisClass === 'anchor-captured') {
    catchToIssues(
      () =>
        deps.assertMatchlogSeedAgnosticInvariants(
          freshRaw,
          `${entry.id} (fresh re-mint)`,
        ),
      issues,
    );
  }
}

export function compareFastForwardFinances(
  entry: ManifestEntry,
  committedRaw: unknown,
  freshRaw: unknown,
  issues: string[],
  deps: RecaptureStageDeps,
): void {
  const committedTransactions = deps.deriveComparableTransactions(committedRaw);
  const freshTransactions = deps.deriveComparableTransactions(freshRaw);
  if (
    JSON.stringify(committedTransactions) !== JSON.stringify(freshTransactions)
  ) {
    issues.push(
      `${entry.id}: committed payload's body.finances.transactions diverged from the fresh re-mint's — committed=${JSON.stringify(committedTransactions)} fresh=${JSON.stringify(freshTransactions)}`,
    );
  }
  try {
    const committedImpliedStartCents =
      deps.deriveImpliedStartingBalanceCents(committedRaw);
    const freshImpliedStartCents =
      deps.deriveImpliedStartingBalanceCents(freshRaw);
    if (committedImpliedStartCents !== freshImpliedStartCents) {
      issues.push(
        `${entry.id}: committed payload's body.finances.balance does not reconcile with the fresh re-mint's (implied starting balance committed=${committedImpliedStartCents}c fresh=${freshImpliedStartCents}c) — a hand-edited balance, or a transaction whose signed amount was altered`,
      );
    }
  } catch (error) {
    issues.push(`${entry.id}: ${(error as Error).message}`);
  }
}

export function compareFastForwardProvenance(
  entry: ManifestEntry,
  provenanceBackup: FileBackup,
  provenanceAbsolutePath: string,
  issues: string[],
): void {
  if (!provenanceBackup.existed) {
    issues.push(
      `${entry.id}: no committed provenance.json to compare against — fast-forward packs require a committed invariantSummary (task 5.1/5.2)`,
    );
    return;
  }
  if (!fs.existsSync(provenanceAbsolutePath)) {
    issues.push(
      `${entry.id}: fresh re-mint wrote no provenance.json at ${provenanceAbsolutePath}`,
    );
    return;
  }
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
    return;
  }
  if (!freshProvenance.invariantSummary) {
    issues.push(
      `${entry.id}: fresh re-mint's provenance.json carries no invariantSummary field`,
    );
    return;
  }
  catchToIssues(
    () =>
      assertRunStatesEqual(
        freshProvenance.invariantSummary!,
        committedProvenance.invariantSummary!,
        {
          labelA: `${entry.id} fresh re-mint`,
          labelB: `${entry.id} committed`,
          consequenceMessage:
            'A divergence here is genuine drift (W3 determinism-contract regression or an intended fixture change) — triage per design D7, never absorbed by widening this comparator.',
        },
      ),
    issues,
  );
}

export function remintPack(
  entry: ManifestEntry,
  payloadAbsolutePath: string,
  committedSizeBytes: number,
  issues: string[],
  deps: RecaptureStageDeps,
  artifactDirectory?: string,
): PackRecaptureResult | null {
  const runId = `recapture-${entry.id}-${Date.now()}-${process.pid}`;
  const mintArgs = [deps.mintScriptPath, entry.id];
  if (
    artifactDirectory &&
    !entry.parityAnchorJourney.startsWith('fast-forward:')
  ) {
    mintArgs.push(
      '--output',
      path.join(artifactDirectory, 'test-results'),
      '--reporter=list',
      '--trace=retain-on-failure',
    );
  }
  const mintResult: SpawnSyncReturns<Buffer> = spawnSync(
    process.execPath,
    mintArgs,
    {
      cwd: deps.repoRoot,
      env: {
        ...process.env,
        PLAYWRIGHT_E2E_RUN_ID: runId,
        DEBUG: [process.env.DEBUG, 'pw:webserver'].filter(Boolean).join(','),
      },
      stdio: 'pipe',
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (mintResult.stdout) process.stdout.write(mintResult.stdout);
  if (mintResult.stderr) process.stderr.write(mintResult.stderr);
  if (artifactDirectory) {
    fs.writeFileSync(
      path.join(artifactDirectory, 'mint.stdout.log'),
      mintResult.stdout ?? '',
    );
    fs.writeFileSync(
      path.join(artifactDirectory, 'mint.stderr.log'),
      mintResult.stderr ?? '',
    );
    fs.writeFileSync(
      path.join(artifactDirectory, 'invocation.json'),
      JSON.stringify(
        {
          runId,
          command: [process.execPath, ...mintArgs],
          serverCommand:
            process.env.MEKSTATION_E2E_SERVER_COMMAND ?? 'npm run dev',
          status: mintResult.status,
          signal: mintResult.signal,
          error: mintResult.error?.message,
        },
        null,
        2,
      ),
    );
    for (const relative of [`.sisyphus/e2e-runtime/${runId}`]) {
      const source = path.join(deps.repoRoot, relative);
      if (fs.existsSync(source))
        fs.cpSync(
          source,
          path.join(artifactDirectory, path.basename(relative)),
          { recursive: true },
        );
    }
  }
  if (mintResult.error) {
    issues.push(
      `${entry.id}: re-mint failed to spawn: ${mintResult.error.message}`,
    );
    return failResult(entry.id, issues, committedSizeBytes);
  }
  if (mintResult.status !== 0) {
    issues.push(
      `${entry.id}: re-mint exited nonzero (${mintResult.status ?? `signal ${mintResult.signal}`})`,
    );
    return failResult(entry.id, issues, committedSizeBytes);
  }
  if (!fs.existsSync(payloadAbsolutePath)) {
    issues.push(
      `${entry.id}: re-mint reported success but wrote no payload file at ${payloadAbsolutePath}`,
    );
    return failResult(entry.id, issues, committedSizeBytes);
  }
  return null;
}

export function validateCommittedPayloadStage(
  entry: ManifestEntry,
  committedRaw: unknown,
  genesisClass: GenesisClass,
  committedSizeBytes: number,
  issues: string[],
  deps: RecaptureStageDeps,
  quarantine?: IScenarioPackQuarantine,
): PackRecaptureResult | null {
  const committedValidation = deps.validatePayloadAgainstSchemaAndPins(
    entry,
    committedRaw,
  );
  if (!committedValidation.ok) {
    pushValidationIssues(
      entry.id,
      'committed payload invalid',
      committedValidation,
      issues,
    );
    return failResult(entry.id, issues, committedSizeBytes);
  }
  if (quarantine) {
    return {
      packId: entry.id,
      status: 'QUARANTINED',
      ok: false,
      quarantine,
      issues: [quarantine.reason],
      committedSizeBytes,
      freshSizeBytes: null,
    };
  }
  assertCommittedGenesisInvariants(
    entry,
    genesisClass,
    committedRaw,
    issues,
    deps,
  );
  if (issues.length > 0) {
    return failResult(entry.id, issues, committedSizeBytes);
  }
  return null;
}

export function validateAndCompareFreshStage(input: {
  readonly entry: ManifestEntry;
  readonly genesisClass: GenesisClass;
  readonly committedRaw: unknown;
  readonly freshRaw: unknown;
  readonly freshSizeBytes: number;
  readonly provenanceBackup: FileBackup;
  readonly provenanceAbsolutePath: string;
  readonly committedSizeBytes: number;
  readonly issues: string[];
  readonly deps: RecaptureStageDeps;
}): PackRecaptureResult {
  const {
    entry,
    genesisClass,
    committedRaw,
    freshRaw,
    freshSizeBytes,
    provenanceBackup,
    provenanceAbsolutePath,
    committedSizeBytes,
    issues,
    deps,
  } = input;
  const freshValidation = deps.validatePayloadAgainstSchemaAndPins(
    entry,
    freshRaw,
  );
  if (!freshValidation.ok) {
    pushValidationIssues(
      entry.id,
      'fresh re-mint payload invalid',
      freshValidation,
      issues,
    );
    return failResult(entry.id, issues, committedSizeBytes, freshSizeBytes);
  }

  if (
    genesisClass === 'flow-checkpoint' ||
    genesisClass === 'anchor-captured'
  ) {
    assertFreshGenesisInvariants(entry, genesisClass, freshRaw, issues, deps);
  } else if (genesisClass === 'fast-forward') {
    compareFastForwardFinances(entry, committedRaw, freshRaw, issues, deps);
    compareFastForwardProvenance(
      entry,
      provenanceBackup,
      provenanceAbsolutePath,
      issues,
    );
  } else {
    issues.push(
      `${entry.id}: unsupported campaign-anchor genesis; fresh campaign cannot be compared as a match log or fast-forward run`,
    );
  }

  return {
    packId: entry.id,
    status: issues.length === 0 ? 'PASS' : 'FAIL',
    ok: issues.length === 0,
    issues,
    committedSizeBytes,
    freshSizeBytes,
  };
}

export function summarizeRecaptureResults(
  results: readonly PackRecaptureResult[],
): IPackRecaptureSummary {
  const passed = results.filter((result) => result.status === 'PASS').length;
  const failed = results.filter((result) => result.status === 'FAIL').length;
  const quarantined = results.filter(
    (result) => result.status === 'QUARANTINED',
  ).length;
  return {
    passed,
    failed,
    quarantined,
    total: results.length,
    ok: failed === 0,
  };
}
