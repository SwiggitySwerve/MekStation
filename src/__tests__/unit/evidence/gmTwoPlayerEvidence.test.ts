/**
 * Run-owned evidence bundle (umbrella task 20.4).
 *
 * An evidence file is written to disk, uploaded as a CI artifact, and
 * read by people who were not in the run. So the two ways this goes
 * wrong are not cosmetic: writing outside the run destroys someone
 * else's evidence, and capturing a credential leaks it everywhere the
 * artifact travels.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  EVIDENCE_KINDS,
  EVIDENCE_ROLES,
  EvidenceBundleError,
  openEvidenceBundle,
  writeCompleteEvidenceMatrix,
} from '../../../../e2e/fixtures/gmTwoPlayerEvidence';

let runtimeRoot: string;
const RUN_ID = 'task-20-evidence';

beforeEach(() => {
  runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gm2p-evidence-'));
});

afterEach(() => {
  fs.rmSync(runtimeRoot, { recursive: true, force: true });
});

function bundle() {
  return openEvidenceBundle(RUN_ID, runtimeRoot);
}

describe('evidence bundle', () => {
  it('writes role-labeled artifacts under the run directory', () => {
    const b = bundle();

    const entry = b.write('trace', 'future-gm', 'join.jsonl', '{"step":1}');

    // Role in the name, so a reader can tell three contexts apart in a
    // directory listing rather than by opening every file.
    expect(entry.file).toContain('future-gm');
    expect(entry.kind).toBe('trace');
    expect(fs.existsSync(path.join(b.root, entry.file))).toBe(true);
    expect(b.root.startsWith(path.resolve(runtimeRoot))).toBe(true);
  });

  it('hashes the bytes it actually wrote', () => {
    const b = bundle();

    const entry = b.write('projection', 'future-player-1', 'frame.json', '{}');

    const onDisk = fs.readFileSync(path.join(b.root, entry.file), 'utf8');
    expect(onDisk).toBe('{}');
    expect(entry.bytes).toBe(2);
    expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it.each([
    ['a password field', '{"password":"HostPassword123!"}'],
    ['a long token field', '{"token":"abcdefghijklmnopqrstuvwxyz012345"}'],
    ['a bearer header', 'authorization: Bearer abcdefghijklmnopqrst'],
    ['a private key', '{"privateKey":"MIIEvAIBADANBgkq"}'],
  ])('refuses to write %s into the bundle', (_label, body) => {
    const b = bundle();

    // The socket transcript and the pre-serialization projection are
    // exactly where a credential lives, and this file is uploaded as a
    // CI artifact.
    expect(() =>
      b.write('socket-transcript', 'future-gm', 'raw.log', body),
    ).toThrow(EvidenceBundleError);
    expect(fs.readdirSync(b.root)).toHaveLength(0);
  });

  it('does not echo the matched secret into its own error', () => {
    const b = bundle();

    try {
      b.write(
        'socket-transcript',
        'future-gm',
        'raw.log',
        '{"password":"hunter2"}',
      );
      throw new Error('expected a refusal');
    } catch (error) {
      // An error message is itself logged, so repeating the match there
      // would defeat the refusal it just performed.
      expect(String(error)).not.toContain('hunter2');
      expect(String(error)).toContain('EVIDENCE_SECRET_LEAK');
    }
  });

  it('still writes ordinary content that merely mentions the words', () => {
    const b = bundle();

    // The control: a guard that refused anything containing "token"
    // would block most transcripts and get switched off.
    const entry = b.write(
      'socket-transcript',
      'future-player-2',
      'raw.log',
      'client sent a token request and the server refused it',
    );

    expect(fs.existsSync(path.join(b.root, entry.file))).toBe(true);
  });

  it('refuses a name that would escape the run directory', () => {
    const b = bundle();

    expect(() =>
      b.write('trace', 'future-gm', '../../../escaped.jsonl', 'x'),
    ).toThrow(EvidenceBundleError);
  });

  it('declares what it meant to capture, not only what it has', () => {
    const b = bundle();
    b.write('latency', 'future-gm', 'p95.json', '{"p95":120}');
    b.recordMissing('screenshot', 'future-player-2', 'context closed early');

    const manifestPath = b.finalize(
      { node: 'v22.22.0' },
      { allowIncompleteEvidence: true },
    );

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      runId: string;
      environment: Record<string, string>;
      captured: { kind: string }[];
      missing: { kind: string; why: string }[];
    };
    expect(manifest.runId).toBe(RUN_ID);
    expect(manifest.environment.node).toBe('v22.22.0');
    expect(manifest.captured.map((c) => c.kind)).toEqual(['latency']);
    // The load-bearing half: an artifact that never arrived is a
    // DECLARED gap. A manifest listing only what exists cannot tell
    // "never captured" from "captured and lost".
    expect(manifest.missing).toEqual([
      {
        kind: 'screenshot',
        role: 'future-player-2',
        why: 'context closed early',
      },
    ]);
  });

  it('refuses to finalize when a kind-role cell is absent', () => {
    const b = bundle();
    b.write('trace', 'future-gm', 'cell.json', '{"ok":true}');

    try {
      b.finalize({ node: 'v22.22.0' });
      throw new Error('expected a refusal');
    } catch (error) {
      expect(error).toBeInstanceOf(EvidenceBundleError);
      if (!(error instanceof EvidenceBundleError)) {
        throw error;
      }
      expect(error.code).toBe('EVIDENCE_INCOMPLETE');
      expect(error.missingCells).toHaveLength(
        EVIDENCE_KINDS.length * EVIDENCE_ROLES.length - 1,
      );
      expect(error.missingCells).not.toContainEqual({
        kind: 'trace',
        role: 'future-gm',
      });
      expect(String(error)).toContain('screenshot/future-player-2');
      expect(String(error)).toContain('cleanup-log/future-gm');
      expect(String(error)).not.toContain('trace/future-gm');
    }
    expect(fs.existsSync(path.join(b.root, 'manifest.json'))).toBe(false);
  });

  it('finalizes a complete kind-role matrix', () => {
    const b = bundle();
    writeCompleteEvidenceMatrix(b);

    const manifestPath = b.finalize({ node: 'v22.22.0' });

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      captured: { kind: string; role: string }[];
      missing: unknown[];
    };
    expect(manifest.captured).toHaveLength(
      EVIDENCE_KINDS.length * EVIDENCE_ROLES.length,
    );
    expect(manifest.missing).toEqual([]);
  });
});
