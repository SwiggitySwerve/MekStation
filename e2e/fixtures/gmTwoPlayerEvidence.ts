/**
 * Run-owned evidence bundle (harden-gm-two-player-campaign-sessions 20.4).
 *
 * Every durability, privacy, and latency claim in this program is
 * settled by an artifact under `test-results/gm-two-player/<run-id>/`.
 * Two things make such a bundle trustworthy, and both are easy to lose:
 *
 * - **It cannot write outside its own run.** A writer that escapes the
 *   run directory can clobber another run's evidence or a developer's
 *   files, and the resulting artifact describes a run that never
 *   happened. Every path goes through the same run-owned check the
 *   sandbox fixture already uses.
 * - **It cannot carry secrets.** The bundle captures raw socket
 *   transcripts and pre-serialization projections — exactly the places a
 *   bearer token or password lives. An evidence file is written to disk,
 *   uploaded as a CI artifact, and read by people who were not in the
 *   run, so a leaked token there is a leaked token everywhere.
 *
 * The manifest is the third leg: it DECLARES what the run intended to
 * capture, so an artifact that never arrived is a detectable gap rather
 * than a silent absence. A bundle that only lists what happens to exist
 * cannot tell "not captured" from "captured and lost". Finalize is the
 * completeness gate (E2E-78): a missing (kind × role) cell throws a
 * typed error and writes no completeness-claiming manifest.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (20.4)
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const guards = require('../../scripts/qc/gm-two-player-campaign-core.cjs') as {
  assertRunOwnedPath: (
    target: string,
    runId: string,
    runtimeRoot: string,
  ) => string;
};

/** Artifact kinds the program's evidence gate expects. */
export const EVIDENCE_KINDS = [
  'trace',
  'screenshot',
  'socket-transcript',
  'projection',
  'latency',
  'durable-rows',
  'hashes',
  'environment',
  'cleanup-log',
] as const;

export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

/**
 * Roles the completeness matrix requires. Names match the campaign
 * fixture's three isolated contexts so a directory listing lines up
 * with GM / Player 1 / Player 2 without opening every file.
 */
export const EVIDENCE_ROLES = [
  'future-gm',
  'future-player-1',
  'future-player-2',
] as const;

export type EvidenceRole = (typeof EVIDENCE_ROLES)[number];

export type EvidenceBundleErrorCode =
  | 'EVIDENCE_SECRET_LEAK'
  | 'EVIDENCE_FOREIGN_PATH'
  | 'EVIDENCE_INCOMPLETE';

export interface IMissingEvidenceCell {
  readonly kind: EvidenceKind;
  readonly role: EvidenceRole;
}

export class EvidenceBundleError extends Error {
  public constructor(
    public readonly code: EvidenceBundleErrorCode,
    detail: string,
    public readonly missingCells: readonly IMissingEvidenceCell[] = [],
  ) {
    super(`${code} ${detail}`);
    this.name = 'EvidenceBundleError';
  }
}

export interface IEvidenceEntry {
  readonly kind: EvidenceKind;
  /** Role this artifact belongs to, so a reader can tell them apart. */
  readonly role: string;
  readonly file: string;
  readonly sha256: string;
  readonly bytes: number;
}

/**
 * Caller-owned escape for packs that record a subset by design.
 * Never the default: omit the second argument for a complete-bundle finalize.
 */
export interface IFinalizeOptions {
  readonly allowIncompleteEvidence: true;
}

/**
 * Patterns that must never reach an evidence file.
 *
 * Deliberately matches the SHAPE of a credential rather than a known
 * value: the point is to catch a token nobody thought to redact, and a
 * list of known secrets by definition contains only the ones already
 * known about.
 */
const SECRET_PATTERNS: readonly RegExp[] = [
  /"?password"?\s*[:=]\s*"[^"]+"/i,
  /"?token"?\s*[:=]\s*"[^"]{16,}"/i,
  /\bBearer\s+[A-Za-z0-9._-]{16,}/i,
  /"privateKey"\s*:\s*"[^"]+"/i,
];

function assertNoSecrets(kind: EvidenceKind, body: string): void {
  for (const pattern of SECRET_PATTERNS) {
    const hit = pattern.exec(body);
    if (hit) {
      // The MATCH is not echoed into the error: an error message is
      // itself written to a log, which would defeat the point.
      throw new EvidenceBundleError(
        'EVIDENCE_SECRET_LEAK',
        `${kind} matched ${pattern.source}`,
      );
    }
  }
}

/**
 * Lists every declared (kind × role) cell with no captured artifact.
 *
 * WHAT: walks the 9×3 matrix and returns cells that have no write.
 * WHY: finalize must name every gap from one definition of complete,
 * so the throw and the tests cannot drift apart.
 */
export function listMissingEvidenceCells(
  captured: readonly Pick<IEvidenceEntry, 'kind' | 'role'>[],
): IMissingEvidenceCell[] {
  const present = new Set(
    captured.map((entry) => `${entry.kind}\0${entry.role}`),
  );
  const absent: IMissingEvidenceCell[] = [];
  for (const kind of EVIDENCE_KINDS) {
    for (const role of EVIDENCE_ROLES) {
      if (!present.has(`${kind}\0${role}`)) {
        absent.push({ kind, role });
      }
    }
  }
  return absent;
}

/**
 * Names every missing cell for the typed incomplete-bundle error.
 *
 * WHAT: joins kind/role pairs into one stable detail string.
 * WHY: the throw must name every gap, and a single formatter keeps
 * the error text and the test assertions on the same wording.
 */
function formatMissingCells(cells: readonly IMissingEvidenceCell[]): string {
  return cells.map((cell) => `${cell.kind}/${cell.role}`).join(', ');
}

export interface IEvidenceBundle {
  readonly root: string;
  /** Writes one artifact, refusing secrets and foreign paths. */
  readonly write: (
    kind: EvidenceKind,
    role: string,
    name: string,
    body: string,
  ) => IEvidenceEntry;
  /** Records an artifact the run intended but could not capture. */
  readonly recordMissing: (
    kind: EvidenceKind,
    role: string,
    why: string,
  ) => void;
  /** Writes `manifest.json` only when the kind×role matrix is complete. */
  readonly finalize: (
    environment: Record<string, string>,
    options?: IFinalizeOptions,
  ) => string;
}

/**
 * Fills every declared (kind × role) cell with a tiny JSON body.
 *
 * WHAT: writes the 9×3 matrix the completeness gate requires.
 * WHY: jest and the E2E-78 control must share one filling convention
 * so a cell cannot be omitted in one suite and still count as present.
 */
export function writeCompleteEvidenceMatrix(bundle: IEvidenceBundle): void {
  for (const kind of EVIDENCE_KINDS) {
    for (const role of EVIDENCE_ROLES) {
      bundle.write(
        kind,
        role,
        'cell.json',
        `{"kind":"${kind}","role":"${role}"}`,
      );
    }
  }
}

/**
 * Opens the bundle for one run.
 *
 * `runtimeRoot` defaults to the program's declared evidence location so
 * callers cannot quietly relocate a bundle somewhere unowned.
 */
export function openEvidenceBundle(
  runId: string,
  runtimeRoot = path.resolve('test-results/gm-two-player'),
): IEvidenceBundle {
  const root = path.join(path.resolve(runtimeRoot), runId);
  fs.mkdirSync(root, { recursive: true });

  const entries: IEvidenceEntry[] = [];
  const missing: { kind: EvidenceKind; role: string; why: string }[] = [];

  return {
    root,
    write: (kind, role, name, body) => {
      assertNoSecrets(kind, body);
      const target = path.join(root, `${role}.${kind}.${name}`);
      try {
        guards.assertRunOwnedPath(target, runId, runtimeRoot);
      } catch (error) {
        throw new EvidenceBundleError(
          'EVIDENCE_FOREIGN_PATH',
          error instanceof Error ? error.message : String(error),
        );
      }
      fs.writeFileSync(target, body, 'utf8');
      const entry: IEvidenceEntry = {
        kind,
        role,
        file: path.relative(root, target),
        sha256: createHash('sha256').update(body).digest('hex'),
        bytes: Buffer.byteLength(body, 'utf8'),
      };
      entries.push(entry);
      return entry;
    },
    recordMissing: (kind, role, why) => {
      missing.push({ kind, role, why });
    },
    finalize: (environment, options) => {
      const absent = listMissingEvidenceCells(entries);
      if (absent.length > 0 && options?.allowIncompleteEvidence !== true) {
        throw new EvidenceBundleError(
          'EVIDENCE_INCOMPLETE',
          `missing cells: ${formatMissingCells(absent)}`,
          absent,
        );
      }
      const manifest = {
        runId,
        environment,
        // Declared, not discovered: a manifest that lists only what
        // exists cannot distinguish "never captured" from "captured and
        // lost", which is the difference between a gap and a bug.
        captured: entries,
        missing,
      };
      const target = path.join(root, 'manifest.json');
      guards.assertRunOwnedPath(target, runId, runtimeRoot);
      fs.writeFileSync(target, JSON.stringify(manifest, null, 2), 'utf8');
      return target;
    },
  };
}
