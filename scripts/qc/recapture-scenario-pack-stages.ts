/**
 * Stage helpers for scenario-pack recapture — keeps `recapturePack` under
 * complexity/nesting maintain thresholds while preserving behavior.
 */
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import fs from 'node:fs';

import type { ManifestEntry } from '../../src/lib/scenarioPacks/packSchemas';

import {
  assertRunStatesEqual,
  type ComparableRunState,
} from '../../src/lib/campaign/fastForward/invariants/comparableRunState';

export type GenesisClass =
  | 'flow-checkpoint'
  | 'anchor-captured'
  | 'fast-forward';

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
  readonly ok: boolean;
  readonly issues: readonly string[];
  readonly committedSizeBytes: number;
  readonly freshSizeBytes: number | null;
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
): PackRecaptureResult | null {
  const mintResult: SpawnSyncReturns<Buffer> = spawnSync(
    process.execPath,
    [deps.mintScriptPath, entry.id],
    { cwd: deps.repoRoot, stdio: 'inherit' },
  );
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
  } else {
    compareFastForwardFinances(entry, committedRaw, freshRaw, issues, deps);
    compareFastForwardProvenance(
      entry,
      provenanceBackup,
      provenanceAbsolutePath,
      issues,
    );
  }

  return {
    packId: entry.id,
    ok: issues.length === 0,
    issues,
    committedSizeBytes,
    freshSizeBytes,
  };
}
