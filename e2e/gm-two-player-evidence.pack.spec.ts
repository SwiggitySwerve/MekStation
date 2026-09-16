/**
 * E2E-78: one strict scenario emits the COMPLETE evidence bundle.
 *
 * The gate has been provable since Wave G2 - a missing (kind x role)
 * cell throws `EVIDENCE_INCOMPLETE` naming every gap and writes no
 * manifest. What was never proven is the letter's SUBJECT, "any strict
 * scenario": the three packs that finalize a bundle all pass
 * `allowIncompleteEvidence`, and the only 27-cell bundle in the
 * repository was written by a control row from synthetic bodies in a
 * temp directory - no browser, no harness-owned server, no per-run
 * database. That row proves the gate; it cannot prove a scenario. This
 * row is the strict half: the sandbox the spec defines, all nine
 * declared kinds for all three declared roles from one real run,
 * finalized WITH NO ESCAPE HATCH.
 *
 * TWO NON-CLAIMS, also carried inside the artifacts themselves:
 *  - The transcript is REDACTED, not raw. The join frame carries the
 *    role's wire token; the bundle's secret scan is never weakened to
 *    let one through.
 *  - The projection is POST-WIRE. A pre-serialization capture needs a
 *    seam in `src/lib/multiplayer/server/projection/`, not owned here.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/e2e-testing/spec.md (E2E-78)
 */

import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  EVIDENCE_KINDS,
  EVIDENCE_ROLES,
  type EvidenceKind,
} from './fixtures/gmTwoPlayerEvidence';
import {
  joinUntilSnapshot,
  openRecoverableCampaign,
} from './helpers/gmTwoPlayerAuthorityRecovery';

const PARTICIPANT_SQL = `SELECT campaign_id, session_id, participant_id, seat, revoked_at
     FROM campaign_session_participant
    WHERE campaign_id = ? AND session_id = ? AND participant_id = ?`;

/** Keys whose VALUE is replaced before an artifact is written. */
const REDACTED_KEYS = ['token', 'wireToken', 'password', 'privateKey'] as const;

interface IFrame {
  readonly direction: 'sent' | 'received';
  readonly atMs: number;
  readonly payload: string;
}

interface ITranscript {
  url: string | null;
  readonly frames: IFrame[];
}

/**
 * Replaces credential values in a JSON frame, leaving the shape intact.
 *
 * WHY NOT DELETE THE KEY: a reader needs to see THAT a join carried a
 * credential and where it sat; removing it hides the shape, keeping it
 * leaks the value.
 */
function redactCredentials(payload: string): string {
  let redacted = payload;
  for (const key of REDACTED_KEYS) {
    redacted = redacted.replace(
      new RegExp(`("${key}"\\s*:\\s*)"[^"]*"`, 'g'),
      `$1"[redacted]"`,
    );
  }
  return redacted;
}

/**
 * Records every frame on every socket this page opens from now on.
 *
 * Playwright's `websocket` event only fires for sockets created AFTER
 * the listener attaches, which is why each role re-joins rather than
 * reusing the one `openRecoverableCampaign` already opened and closed.
 */
function tapRoleSocket(page: Page): ITranscript {
  const transcript: ITranscript = { url: null, frames: [] };
  page.on('websocket', (socket) => {
    transcript.url ??= socket.url();
    const push = (direction: 'sent' | 'received') => (event: unknown) => {
      const payload = (event as { payload?: unknown }).payload;
      if (typeof payload === 'string')
        transcript.frames.push({ direction, atMs: Date.now(), payload });
    };
    socket.on('framesent', push('sent'));
    socket.on('framereceived', push('received'));
  });
  return transcript;
}

const json = (value: unknown): string => JSON.stringify(value, null, 2);
const digestOf = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

/**
 * Builds the six TEXT artifacts for one role from what the run observed.
 *
 * Returned as a table so the caller keeps ONE `bundle.write` call site:
 * a second writer is a second place a cell can be mislabeled, which is
 * exactly how the membership and performance packs score zero matrix
 * cells while carrying real evidence. `redactedFrames` rides along so
 * the caller can refuse a run whose redactor stopped working.
 */
function buildRoleArtifacts(input: {
  readonly role: string;
  readonly participantId: string;
  readonly transcript: ITranscript;
  readonly durableRows: readonly unknown[];
  readonly joinRoundTripMs: number;
  readonly environment: Record<string, string>;
}): {
  readonly artifacts: readonly {
    kind: EvidenceKind;
    name: string;
    body: string;
  }[];
  readonly redactedFrames: number;
} {
  let redactedFrames = 0;
  const frames = input.transcript.frames.map((frame) => {
    const payload = redactCredentials(frame.payload);
    if (payload !== frame.payload) redactedFrames += 1;
    return { ...frame, payload };
  });
  const received = frames.filter((frame) => frame.direction === 'received');

  const transcript = json({
    note: 'Wire frames, both directions. Credential VALUES are replaced with a placeholder.',
    url: input.transcript.url,
    redactedKeys: REDACTED_KEYS,
    redactedFrames,
    frames,
  });
  const projection = json({
    nonClaim:
      'POST-WIRE. The viewer-scoped projection as DELIVERED to this role, not the projector object before serialization; a pre-serialization capture needs a server seam this test does not own.',
    deliveredFrameCount: received.length,
    delivered: received.map((frame) => frame.payload),
  });
  const latency = json({
    note: 'Recorded, never gated: E2E-71..74 own the latency budgets and score them on the controlled runner class.',
    joinRoundTripMs: input.joinRoundTripMs,
    receivedFrameCount: received.length,
    interArrivalMs: received
      .slice(1)
      .map((frame, index) => frame.atMs - received[index].atMs),
  });
  const durableRows = json(input.durableRows);

  return {
    redactedFrames,
    artifacts: [
      { kind: 'socket-transcript', name: 'frames.json', body: transcript },
      { kind: 'projection', name: 'delivered.json', body: projection },
      { kind: 'latency', name: 'join.json', body: latency },
      { kind: 'durable-rows', name: 'participant.json', body: durableRows },
      {
        kind: 'hashes',
        name: 'state.json',
        body: json({
          role: input.role,
          participantId: input.participantId,
          transcriptSha256: digestOf(transcript),
          projectionSha256: digestOf(projection),
          durableRowsSha256: digestOf(durableRows),
        }),
      },
      {
        kind: 'environment',
        name: 'context.json',
        body: json({
          ...input.environment,
          role: input.role,
          socketUrl: input.transcript.url,
        }),
      },
    ],
  };
}

test('E2E-78 a strict three-context run emits every artifact kind for every role @evidence-smoke @E2E-78', async ({
  baseURL,
  browser,
  request,
}) => {
  const drive = await openRecoverableCampaign({
    browser,
    request,
    baseURL: baseURL ?? '',
  });
  const traceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gm2p-e2e78-trace-'));
  try {
    const bundle = drive.fixture.openEvidenceBundle();
    const environment = {
      node: process.version,
      chromium: browser.version(),
      os: `${os.platform()} ${os.release()}`,
      runId: drive.fixture.runId,
    };

    // Arm the recorder and the trace BEFORE the socket exists, then
    // re-join through the product's own path.
    const captured = [];
    for (const [role, client, joinAs] of [
      ['future-gm', drive.gm, 'host'],
      ['future-player-1', drive.playerOne, 'guest'],
      ['future-player-2', drive.playerTwo, 'guest'],
    ] as const) {
      const transcript = tapRoleSocket(client.page);
      await client.page.context().tracing.start({
        screenshots: false,
        snapshots: false,
        sources: false,
      });
      const startedAtMs = Date.now();
      await joinUntilSnapshot(client, drive.session, joinAs);
      captured.push({
        role,
        client,
        transcript,
        joinRoundTripMs: Date.now() - startedAtMs,
      });
    }

    // Six text kinds plus the screenshot, per role. The durable export
    // goes through the run's own read-only probe and is proven not to
    // have changed the file it read.
    const durable = drive.fixture.openEvidence('app');
    try {
      const beforeHash = durable.fileHash();
      for (const entry of captured) {
        const durableRows = durable.select<Record<string, unknown>>(
          PARTICIPANT_SQL,
          [
            drive.session.campaignId,
            drive.session.matchId,
            entry.client.identity.playerId,
          ],
        );
        expect(
          durableRows.length,
          `${entry.role} has no durable participant row to export`,
        ).toBeGreaterThan(0);

        const built = buildRoleArtifacts({
          role: entry.role,
          participantId: entry.client.identity.playerId,
          transcript: entry.transcript,
          durableRows,
          joinRoundTripMs: entry.joinRoundTripMs,
          environment,
        });
        // The join frame carries this role's wire token, so a redactor
        // that stopped working is caught here.
        expect(
          built.redactedFrames,
          `${entry.role} transcript carried no credential to redact`,
        ).toBeGreaterThan(0);
        // And the artifact is checked for the literal token. The
        // bundle's secret scan CANNOT do this: the frame is nested as a
        // JSON string, so its quotes arrive escaped and SECRET_PATTERNS
        // never matches (measured - the raw frame matches, the nested
        // one does not). Delegating a safety property to a guard that
        // cannot see it is how a leak ships.
        expect(
          built.artifacts[0].body.includes(entry.client.identity.wireToken),
          `${entry.role} transcript still contains its wire token`,
        ).toBe(false);

        for (const artifact of built.artifacts) {
          bundle.write(artifact.kind, entry.role, artifact.name, artifact.body);
        }
        bundle.attach(
          'screenshot',
          entry.role,
          'viewport.png',
          await entry.client.page.screenshot(),
        );
      }
      // Reading produced the export without producing a different file.
      expect(durable.fileHash()).toBe(beforeHash);
    } finally {
      durable.close();
    }

    // The trace closes the role's own recording, and the cleanup log is
    // written AFTER that role's context is gone, so it describes a
    // release that happened rather than one that was intended.
    for (const entry of captured) {
      const context = entry.client.page.context();
      const tracePath = path.join(traceDir, `${entry.role}.zip`);
      await context.tracing.stop({ path: tracePath });
      bundle.attach(
        'trace',
        entry.role,
        'trace.zip',
        fs.readFileSync(tracePath),
      );
      const pagesClosed = context.pages().length;
      await context.close();
      bundle.write(
        'cleanup-log',
        entry.role,
        'release.json',
        json({
          role: entry.role,
          tracingStopped: true,
          pagesClosed,
          contextClosed: context.pages().length === 0,
          note: 'Harness-owned context only; the ambient browser and the Playwright web server are preserved (E2E-79).',
        }),
      );
    }

    // No escape hatch. A single absent cell fails here, naming it.
    const manifestPath = bundle.finalize(environment);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      captured: { kind: string; role: string; file: string; bytes: number }[];
      missing: unknown[];
    };
    expect(manifest.missing).toEqual([]);
    // Exact set equality, not a count: 27 entries carrying a duplicate
    // and a gap would satisfy a length check.
    expect(
      manifest.captured.map((entry) => `${entry.kind}/${entry.role}`).sort(),
    ).toEqual(
      EVIDENCE_KINDS.flatMap((kind) =>
        EVIDENCE_ROLES.map((role) => `${kind}/${role}`),
      ).sort(),
    );
    // Every file is on disk at the size the manifest claims - a manifest
    // that merely listed 27 names would not be evidence.
    for (const entry of manifest.captured) {
      // statSync throws if the listed file is absent, so one call
      // settles existence and size together.
      const onDisk = fs.statSync(path.join(bundle.root, entry.file)).size;
      expect(onDisk, `${entry.file} size drifted`).toBe(entry.bytes);
      expect(onDisk, `${entry.file} is empty`).toBeGreaterThan(0);
    }
  } finally {
    fs.rmSync(traceDir, { recursive: true, force: true });
    await drive.fixture.cleanup();
  }
});
